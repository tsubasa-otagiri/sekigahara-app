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

    /* CF-Connecting-IP が取得できない場合も安全のためブロック */
    if (clientIP === "unknown") {
      console.error(`[IP ACCESS DENIED] CF-Connecting-IP header missing. Blocked: ${request.method} ${request.url}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot determine client IP" }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    /* ALLOWED_IPS 未設定 → 安全のため全拒否 */
    const rawAllowed = (env.ALLOWED_IPS || "").trim();
    if (!rawAllowed) {
      console.error(`[IP ACCESS DENIED] ALLOWED_IPS not configured. Blocked: ${clientIP} tried to access ${request.method} ${request.url}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Access Denied" }),
        { status: 403, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    /* 許可IPリストを作成してチェック */
    const allowedIPs = rawAllowed.split(",").map(ip => ip.trim()).filter(Boolean);
    if (!allowedIPs.includes(clientIP)) {
      console.error(`[IP ACCESS DENIED] Unauthorized IP: ${clientIP} tried to access ${request.method} ${request.url}`);
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
     * IPホワイトリスト通過 → 通常処理へ
     * ════════════════════════════════════════════════════ */

    /* APIキー認証 */
    if (!checkAuth(request, env)) return err("Unauthorized", 401);

    const url  = new URL(request.url);
    const path = url.pathname;

    /* ヘルスチェック */
    if (path === "/api/health") {
      return json({ ok: true, ts: Date.now(), clientIp: clientIP });
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

        /* ⑤ キャッシュ無効化（バックグラウンド） */
        ctx.waitUntil(
          caches.default
            .delete(cacheKey)
            .catch(e => console.warn("Cache delete failed:", e.message))
        );

        return json({ ok: true, resource, savedAt: new Date().toISOString() });

      } catch (e) {
        console.error("KV POST error:", e);
        return err("Bad Request or Internal Error", 500);
      }
    }

    return err("Method Not Allowed", 405);
  },
};
