/**
 * HONNOJI no HEN — Cloudflare Workers API
 * KV Storage バックエンド
 *
 * セキュリティ:
 *   【1】OPTIONS preflight  → IPチェックをスキップしてCORSレスポンスを即返却
 *   【2】IPホワイトリスト   → env.ALLOWED_IPS に含まれないIPは 403 Forbidden
 *   【3】APIキー認証        → env.API_KEY が設定されている場合のみ有効
 *
 * エンドポイント:
 *   GET  /api/:resource  → KV から取得
 *   POST /api/:resource  → KV へ全件保存（全置換）
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
  async fetch(request, env) {

    /* ════════════════════════════════════════════════════
     * 【最優先①】OPTIONS preflight → IPチェック不要・即返却
     *   ブラウザが CORS 安全確認のために送る自動リクエスト。
     *   ここで止めると正規IPからのアクセスでもブラウザがエラーになる。
     * ════════════════════════════════════════════════════ */
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: CORS });
    }

    /* ════════════════════════════════════════════════════
     * 【最優先②】IPホワイトリスト チェック
     *   Cloudflare が付与する CF-Connecting-IP で実IPを取得し、
     *   env.ALLOWED_IPS（カンマ区切り）と照合する。
     *   許可リスト外のIPは即座に 403 で遮断する。
     * ════════════════════════════════════════════════════ */
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";

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
      /* ── 拒否ログ（Cloudflare Dashboard > Workers > Logs で確認） ── */
      console.error(`[IP ACCESS DENIED] Unauthorized IP: ${clientIP} tried to access ${request.method} ${request.url}`);

      /* 403 + CORSヘッダー（フロントエンドで CORS エラーと混同させない） */
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

    /* GET */
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

    /* POST（全置換） */
    if (request.method === "POST") {
      try {
        const body = await request.text();
        JSON.parse(body); // JSONバリデーション
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
