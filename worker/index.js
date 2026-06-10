/**
 * HONNOJI no HEN — Cloudflare Workers API
 * KV Storage バックエンド（KV使用量最適化版）
 *
 * ── セキュリティ ──────────────────────────────────────────
 *   【1】OPTIONS preflight  → IPチェックをスキップしてCORSレスポンスを即返却
 *   【2】IPホワイトリスト   → env.ALLOWED_IPS に含まれないIPは 403 Forbidden
 *   【3】APIキー認証        → env.API_KEY が設定されている場合のみ有効
 *
 * ── KV使用量最適化 ───────────────────────────────────────
 *   【Reads 削減】
 *     Cache API (caches.default) で5分間キャッシュ。
 *     キャッシュヒット時は KV.get() を呼ばずキャッシュから返す。
 *     キャッシュ保存は ctx.waitUntil() でバックグラウンド実行
 *     （レスポンスをブロックしない）。
 *
 *   【Writes 削減】
 *     POST 時に現在値を1回だけ KV.get() し、新しいデータと文字列比較。
 *     同一なら KV.put() をスキップ（変更なし = 書き込みコスト0）。
 *     変更があった場合のみ KV.put() + キャッシュ無効化。
 *
 *   【重複 get 排除】
 *     1リクエスト内で同じキーの KV.get() は必ず1回だけ。
 *     取得した値を変数に保持して使い回す。
 *
 * ── エンドポイント ────────────────────────────────────────
 *   GET  /api/:resource  → Cache → KV の順で取得
 *   POST /api/:resource  → 差分チェック → 変更時のみ KV 書き込み
 *   GET  /api/health     → ヘルスチェック
 */

/* ── CORS ヘッダー（全レスポンスに付与） ── */
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  "Cache-Control":                "no-store",
};

const RESOURCES = [
  "deals", "tasks", "members", "requests",
  "notifs", "monthend", "targets", "user_settings",
];

/** Cache API の有効期限（秒） */
const CACHE_TTL = 300; // 5分

/** Cache API 用のキー URL（WorkerのURLと衝突しない疑似ドメイン） */
const toCacheKey = (resource) => `https://kv-cache.internal/${resource}`;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(msg, status = 400) {
  return new Response(msg, { status, headers: CORS });
}

/* ── APIキー認証（env.API_KEY 未設定なら認証なし） ── */
function checkAuth(request, env) {
  if (!env.API_KEY) return true;
  const k = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
  return k === env.API_KEY;
}

/* ── アクセスログ（利用履歴管理: 誰が・いつ・どこから） ── */
function accessLog(level, event, ip, method, path, extra = {}) {
  const entry = JSON.stringify({
    level, event, ip,
    method, path,
    ts: new Date().toISOString(),
    ...extra,
  });
  if (level === "WARN" || level === "ERROR") {
    console.error(entry);
  } else {
    console.log(entry);
  }
}

export default {
  /* ctx を受け取る（ctx.waitUntil でバックグラウンド処理） */
  async fetch(request, env, ctx) {

    /* ════════════════════════════════════════════════════
     * 【最優先①】OPTIONS preflight → IPチェック不要・即返却
     * ════════════════════════════════════════════════════ */
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: CORS });
    }

    /* ════════════════════════════════════════════════════
     * 【最優先②】IPホワイトリスト チェック
     * ════════════════════════════════════════════════════ */
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
    const url  = new URL(request.url);
    const path = url.pathname;

    /* CF-Connecting-IP が取得できない場合も安全のためブロック */
    if (clientIP === "unknown") {
      accessLog("ERROR", "IP_UNKNOWN", clientIP, request.method, path);
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot determine client IP" }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    /* ALLOWED_IPS 未設定 → 安全のため全拒否 */
    const rawAllowed = (env.ALLOWED_IPS || "").trim();
    if (!rawAllowed) {
      accessLog("ERROR", "ALLOWED_IPS_UNSET", clientIP, request.method, path);
      return new Response(
        JSON.stringify({ error: "Forbidden: Access Denied" }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    /* 許可IPリストを作成してチェック */
    const allowedIPs = rawAllowed.split(",").map(ip => ip.trim()).filter(Boolean);
    if (!allowedIPs.includes(clientIP)) {
      accessLog("WARN", "IP_DENIED", clientIP, request.method, path);
      return new Response(
        JSON.stringify({
          error:    "Forbidden: Access Denied",
          clientIp: clientIP,
          ts:       new Date().toISOString(),
        }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    /* ════════════════════════════════════════════════════
     * IPホワイトリスト通過 → アクセスログ記録・通常処理へ
     * ════════════════════════════════════════════════════ */
    accessLog("INFO", "REQUEST", clientIP, request.method, path, {
      ua: (request.headers.get("User-Agent") || "").slice(0, 80),
    });

    /* APIキー認証 */
    if (!checkAuth(request, env)) return err("Unauthorized", 401);

    /* ヘルスチェック */
    if (path === "/api/health") {
      return json({ ok: true, ts: Date.now(), clientIp: clientIP });
    }

    /* ════════════════════════════════════════════════════
     * POST /api/import-deals — Excel/CSV インポート Upsert
     *
     * Body: { deals: [...], period: "YYYY-MM" }
     *
     * Upsert ルール:
     *   - normalizeCompanyName(company) + period でマッチング
     *   - 一致: confidence / plan / amount / is / fs / team / note を更新
     *   - 不一致: 新規 ID を採番して追加
     * ════════════════════════════════════════════════════ */
    if (path === "/api/import-deals" && request.method === "POST") {
      try {
        const body = await request.json();
        const { deals: incoming, period } = body;

        if (!Array.isArray(incoming) || !period) {
          return err("deals[] と period が必要です", 400);
        }

        /* 企業名正規化（マッチングキー生成）— フロントと同一ロジック */
        function normalizeCompanyName(name) {
          if (!name) return "";
          let s = String(name).trim();
          s = s.replace(/株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|特定非営利活動法人|ＮＰＯ法人|NPO法人/g, "");
          s = s.replace(/（株）|\(株\)|【株】|\[株\]|（有）|\(有\)|（合）|\(合\)/g, "");
          s = s.replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
          s = s.replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
          s = s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
          s = s.replace(/[\s　]/g, "");
          s = s.replace(/[・、，,.\-]/g, "");
          return s.toLowerCase();
        }

        /* 確度 → ヨミ度変換 */
        const confToYomi = (c) =>
          c === "回収" ? "受注" : c === "70%" ? "70%" : c === "50%" ? "50%" : "30%";

        /* 既存 deals を KV から取得 */
        const existingRaw = await env.KV.get("deals");
        let existing = existingRaw ? JSON.parse(existingRaw) : [];

        let added = 0, updated = 0;
        const now = new Date().toISOString();

        for (const deal of incoming) {
          const normKey = normalizeCompanyName(deal.company);
          if (!normKey) continue;

          const idx = existing.findIndex(
            d => d.period === period && normalizeCompanyName(d.company) === normKey
          );

          if (idx >= 0) {
            /* ── 既存案件を更新 ── */
            const ex = existing[idx];
            existing[idx] = {
              ...ex,
              confidence: deal.confidence,
              plan:       deal.plan  || ex.plan,
              amount:     deal.amount != null ? deal.amount : ex.amount,
              is:         deal.is    || ex.is,
              fs:         deal.fs    || ex.fs,
              team:       deal.team  || ex.team,
              note:       deal.note !== "" ? deal.note : ex.note,
              phase:      deal.confidence === "回収" ? "受注" : (ex.phase || "未設定"),
              yomi:       confToYomi(deal.confidence),
              updatedAt:  now,
            };
            updated++;
          } else {
            /* ── 新規案件を追加 ── */
            const conf  = deal.confidence;
            const uid   = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
            existing.push({
              id:         `import_${uid}`,
              company:    deal.company,
              plan:       deal.plan   || "MDC",
              amount:     deal.amount || 0,
              is:         deal.is     || "",
              fs:         deal.fs     || "",
              team:       deal.team   || "",
              confidence: conf,
              phase:      conf === "回収" ? "受注" : "未設定",
              yomi:       confToYomi(conf),
              note:       deal.note   || "",
              period,
              lossReason: "",
              activities: [],
              createdAt:  now,
              updatedAt:  now,
            });
            added++;
          }
        }

        /* KV に書き込み → キャッシュ無効化 */
        await env.KV.put("deals", JSON.stringify(existing));
        await caches.default
          .delete(toCacheKey("deals"))
          .catch(e => console.warn("Cache delete failed:", e.message));

        return json({ ok: true, added, updated, total: existing.length, deals: existing, savedAt: now });

      } catch (e) {
        console.error("import-deals error:", e);
        return err("Import failed: " + e.message, 500);
      }
    }

    /* リソースルーティング: /api/<resource> */
    const m = path.match(/^\/api\/([a-z_]+)$/);
    if (!m || !RESOURCES.includes(m[1])) {
      return err("Not Found", 404);
    }

    const resource = m[1];
    const cacheKey = toCacheKey(resource);

    /* ════════════════════════════════════════════════════
     * GET — Cache API → KV の優先順位で読み取り
     *
     *   ① caches.default でキャッシュをチェック
     *      → ヒット: KV.get() を呼ばずキャッシュから返す（Reads 0）
     *      → ミス:   KV.get() を1回だけ呼ぶ（Reads 1）
     *   ② KV から取得したデータを Cache API に保存（TTL 5分）
     *      → ctx.waitUntil でバックグラウンド実行（レスポンスをブロックしない）
     * ════════════════════════════════════════════════════ */
    if (request.method === "GET") {
      try {

        /* ① Cache ヒットチェック */
        let cached = null;
        try {
          cached = await caches.default.match(cacheKey);
        } catch (cacheErr) {
          /* Cache API 自体が失敗しても KV にフォールバックする */
          console.warn("Cache read failed, falling back to KV:", cacheErr.message);
        }

        if (cached) {
          /* ── キャッシュヒット: KV を読まずにそのまま返す ── */
          const data = await cached.json();
          return json(data);
        }

        /* ② Cache ミス: KV から取得（このリクエスト内で1回のみ） */
        const raw  = await env.KV.get(resource);
        const data = raw === null
          ? (resource === "monthend" ? {} : [])
          : JSON.parse(raw);

        /* ③ 取得したデータを Cache API に保存（バックグラウンド） */
        ctx.waitUntil(
          caches.default
            .put(
              cacheKey,
              new Response(JSON.stringify(data), {
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": `public, max-age=${CACHE_TTL}`,
                },
              })
            )
            .catch(e => console.warn("Cache write failed:", e.message))
        );

        return json(data);

      } catch (e) {
        console.error("KV GET error:", e);
        return err("Internal Error", 500);
      }
    }

    /* ════════════════════════════════════════════════════
     * POST（全置換）— 差分チェックで無駄な Writes を排除
     *
     *   ① リクエストボディを受け取り JSON バリデーション
     *   ② 現在値を KV.get() で1回だけ取得（差分チェック兼用）
     *   ③ 現在値 === 新しい値 なら KV.put() をスキップ（Writes 0）
     *   ④ 差分あり → KV.put() で書き込み
     *   ⑤ キャッシュを無効化（バックグラウンド）
     *      → 次の GET で必ず最新値が返るようにする
     * ════════════════════════════════════════════════════ */
    if (request.method === "POST") {
      try {
        const body = await request.text();
        JSON.parse(body); // JSON バリデーション

        /* ② 現在値を1回だけ取得（重複 get 排除） */
        const current = await env.KV.get(resource);

        /* ③ 変更なし → スキップ（Writes 0） */
        if (current !== null && current === body) {
          return json({ ok: true, resource, unchanged: true, savedAt: new Date().toISOString() });
        }

        /* ④ 変更あり → KV に書き込み */
        await env.KV.put(resource, body);

        /* ⑤ キャッシュ無効化（レスポンス返却前に完了させる）
         *  waitUntil にするとレスポンス後に非同期実行されるため、
         *  30秒ポーリングが先に走って古いキャッシュを取得してしまう
         *  競合状態が発生する。await で確実にキャッシュを削除してから返す。 */
        await caches.default
          .delete(cacheKey)
          .catch(e => console.warn("Cache delete failed:", e.message));

        return json({ ok: true, resource, savedAt: new Date().toISOString() });

      } catch (e) {
        console.error("KV POST error:", e);
        return err("Bad Request or Internal Error", 500);
      }
    }

    return err("Method Not Allowed", 405);
  },
};
