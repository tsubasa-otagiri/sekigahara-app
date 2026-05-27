/**
 * HONNOJI no HEN — Cloudflare Workers API
 * KV Storage バックエンド
 *
 * セキュリティ機能:
 *   - IPホワイトリスト (env.ALLOWED_IPS)
 *   - APIキー認証     (env.API_KEY)
 *
 * エンドポイント:
 *   GET  /api/:resource  → KV から取得
 *   POST /api/:resource  → KV へ保存（全置換）
 *   GET  /api/health     → ヘルスチェック
 */

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function err(msg, status = 400) {
  return new Response(msg, { status, headers: CORS });
}

/* ── API キー認証 ── */
function checkAuth(request, env) {
  if (!env.API_KEY) return true;
  const k = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
  return k === env.API_KEY;
}

/* ══════════════════════════════════════════════════════════════
 * IP ホワイトリスト判定
 *
 * @param {Request} request
 * @param {object}  env
 * @returns {{ allowed: boolean, clientIp: string, reason?: string }}
 * ══════════════════════════════════════════════════════════════ */
function checkIpWhitelist(request, env) {
  /* Cloudflare が付与する実接続元 IP */
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

  /* ALLOWED_IPS 未設定の場合 → すべて拒否（安全フェイルセーフ）
   * 空文字列のみの場合も同様                                    */
  const rawAllowed = (env.ALLOWED_IPS || "").trim();
  if (!rawAllowed) {
    return {
      allowed: false,
      clientIp,
      reason: "ALLOWED_IPS not configured — all access denied for safety",
    };
  }

  /* カンマ区切りをパース・トリム */
  const allowedList = rawAllowed.split(",").map(ip => ip.trim()).filter(Boolean);

  if (allowedList.includes(clientIp)) {
    return { allowed: true, clientIp };
  }

  return {
    allowed: false,
    clientIp,
    reason: `IP ${clientIp} is not in whitelist [${allowedList.join(", ")}]`,
  };
}

export default {
  async fetch(request, env) {

    /* ── Preflight は IP チェック前に返す（CORS ネゴシエーション） ── */
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    /* ══════════════════════════════════════════════════════════
     * 【最優先】IP ホワイトリスト チェック
     * ══════════════════════════════════════════════════════════ */
    const ipCheck = checkIpWhitelist(request, env);
    if (!ipCheck.allowed) {
      /* 拒否ログ（Cloudflare Dashboard > Workers > Logs で確認可能） */
      const url    = new URL(request.url);
      const logMsg = [
        "[BLOCKED]",
        new Date().toISOString(),
        `IP=${ipCheck.clientIp}`,
        `${request.method} ${url.pathname}`,
        `reason=${ipCheck.reason}`,
        `UA=${request.headers.get("User-Agent") || "unknown"}`,
      ].join(" | ");
      console.warn(logMsg);

      /* 403 + CORS ヘッダー（フロントエンドで CORS エラーと混同させない） */
      return new Response(
        JSON.stringify({
          error:    "Forbidden: Access Denied",
          clientIp: ipCheck.clientIp,
          ts:       new Date().toISOString(),
        }),
        {
          status: 403,
          headers: { ...CORS, "Content-Type": "application/json" },
        }
      );
    }

    /* ── API キー認証 ── */
    if (!checkAuth(request, env)) return err("Unauthorized", 401);

    const url  = new URL(request.url);
    const path = url.pathname;

    /* ── ヘルスチェック ── */
    if (path === "/api/health") {
      const ipCheck2 = checkIpWhitelist(request, env); // 既に通過済みだが情報付与
      return json({
        ok:       true,
        ts:       Date.now(),
        clientIp: ipCheck.clientIp,
      });
    }

    /* ── リソースルーティング /api/<resource> ── */
    const m = path.match(/^\/api\/([a-z_]+)$/);
    if (!m || !RESOURCES.includes(m[1])) {
      return err("Not Found", 404);
    }

    const resource = m[1];

    /* ── GET ── */
    if (request.method === "GET") {
      try {
        const raw = await env.KV.get(resource);
        if (raw === null) return json(resource === "monthend" ? {} : []);
        return json(JSON.parse(raw));
      } catch (e) {
        console.error("KV GET error:", e);
        return err("Internal Error", 500);
      }
    }

    /* ── POST（全置換） ── */
    if (request.method === "POST") {
      try {
        const body = await request.text();
        JSON.parse(body); // バリデーション
        await env.KV.put(resource, body);
        return json({ ok: true, resource, savedAt: new Date().toISOString() });
      } catch (e) {
        console.error("KV POST error:", e);
        return err("Bad Request or Internal Error", 500);
      }
    }

    return err("Method Not Allowed", 405);
  },
};
