/**
 * HONNOJI no HEN — Cloudflare Workers API
 * KV Storage バックエンド
 *
 * エンドポイント一覧:
 *   GET  /api/deals        → 案件データ全件
 *   POST /api/deals        → 案件データ全件保存（上書き）
 *   GET  /api/tasks        → タスクデータ全件
 *   POST /api/tasks        → タスクデータ全件保存
 *   GET  /api/members      → メンバーデータ全件
 *   POST /api/members      → メンバーデータ全件保存
 *   GET  /api/requests     → 要望データ全件
 *   POST /api/requests     → 要望データ全件保存
 *   GET  /api/notifs       → 通知ログ全件
 *   POST /api/notifs       → 通知ログ全件保存
 *   GET  /api/monthend     → 月末処理チェック状態
 *   POST /api/monthend     → 月末処理チェック状態保存
 *   GET  /api/targets      → 目標データ
 *   POST /api/targets      → 目標データ保存
 *   GET  /api/user_settings → ユーザー設定
 *   POST /api/user_settings → ユーザー設定保存
 *   GET  /api/health       → ヘルスチェック
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

function checkAuth(request, env) {
  if (!env.API_KEY) return true;                // キー未設定なら認証なし
  const k = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
  return k === env.API_KEY;
}

export default {
  async fetch(request, env) {
    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // Auth
    if (!checkAuth(request, env)) return err("Unauthorized", 401);

    const url  = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === "/api/health") {
      return json({ ok: true, ts: Date.now() });
    }

    // Route matching: /api/<resource>
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

    /* ── POST (full replace) ── */
    if (request.method === "POST") {
      try {
        const body = await request.text();
        // Validate JSON
        JSON.parse(body);
        // KV には 25 MiB 制限あり (通常のデータ量では問題なし)
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
