/**
 * api.js — Cloudflare Workers API クライアント
 *
 * 環境変数（.env.local に設定可能）:
 *   VITE_API_URL  = "https://kpi-dashboard.kpi-gmotech.workers.dev"
 *   VITE_API_KEY  = "your-api-key"  （Workers で API_KEY を設定した場合のみ）
 */

const BASE    = (import.meta.env.VITE_API_URL  || "https://kpi-dashboard.tsubasa-otagiri.workers.dev").replace(/\/$/, "");
const API_KEY =  import.meta.env.VITE_API_KEY  || "";

function buildHeaders() {
  const h = { "Content-Type": "application/json" };
  if (API_KEY) h["X-API-Key"] = API_KEY;
  return h;
}

/** タイムアウト付き fetch */
async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * GET /api/:resource
 * @returns {Promise<any>} パースされた JSON
 * @throws エラー時はスロー（呼び出し元でキャッチ）
 */
export async function apiGet(resource) {
  const res = await fetchWithTimeout(
    `${BASE}/api/${resource}`,
    { method: "GET", headers: buildHeaders() }
  );
  if (!res.ok) throw new Error(`apiGet(${resource}) → HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/:resource  (full replace)
 * @param {string} resource
 * @param {any}    data
 */
export async function apiSet(resource, data) {
  const res = await fetchWithTimeout(
    `${BASE}/api/${resource}`,
    {
      method:  "POST",
      headers: buildHeaders(),
      body:    JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error(`apiSet(${resource}) → HTTP ${res.status}`);
  return res.json();
}

/** Workers ヘルスチェック */
export async function apiHealth() {
  try {
    const res = await fetchWithTimeout(`${BASE}/api/health`, { headers: buildHeaders() }, 4000);
    return res.ok;
  } catch {
    return false;
  }
}
