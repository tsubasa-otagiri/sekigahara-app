/**
 * api.js — Cloudflare Workers API クライアント
 *
 * 環境変数（.env.local に設定可能）:
 *   VITE_API_URL  = "https://kpi-dashboard.tsubasa-otagiri.workers.dev"
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
 * IPホワイトリスト制限 (403 Forbidden) 専用エラークラス
 *
 * AppContext.jsx の fetchAllFromAPI catch 内でこのクラスを検知して
 * アプリ全体をブロック画面に切り替える。
 */
export class ForbiddenError extends Error {
  constructor(resource) {
    super(`403 Forbidden: access denied for "${resource}"`);
    this.name   = "ForbiddenError";
    this.status = 403;
  }
}

/**
 * GET /api/:resource
 * @returns {Promise<any>} パースされた JSON
 * @throws {ForbiddenError} 403 の場合（IPホワイトリスト遮断）
 * @throws {Error}          その他 HTTP エラー
 */
export async function apiGet(resource) {
  const res = await fetchWithTimeout(
    `${BASE}/api/${resource}`,
    { method: "GET", headers: buildHeaders() }
  );
  if (res.status === 403) throw new ForbiddenError(resource);
  if (!res.ok) throw new Error(`apiGet(${resource}) → HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/:resource  (full replace)
 * @throws {ForbiddenError} 403 の場合（IPホワイトリスト遮断）
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
  if (res.status === 403) throw new ForbiddenError(resource);
  if (!res.ok) throw new Error(`apiSet(${resource}) → HTTP ${res.status}`);
  return res.json();
}

/**
 * POST /api/import-deals  (upsert)
 * @param {Object[]} deals  - パース済み案件配列
 * @param {string}   period - "YYYY-MM"
 * @throws {ForbiddenError} 403 の場合
 */
export async function apiImportDeals(deals, period) {
  const res = await fetchWithTimeout(
    `${BASE}/api/import-deals`,
    {
      method:  "POST",
      headers: buildHeaders(),
      body:    JSON.stringify({ deals, period }),
    },
    30000 // 大量データのため余裕を持って 30s
  );
  if (res.status === 403) throw new ForbiddenError("import-deals");
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`インポートに失敗しました: ${msg || res.status}`);
  }
  return res.json();
}

/**
 * Workers ヘルスチェック
 * @returns {Promise<number>} HTTP ステータスコード (0 = ネットワークエラー/タイムアウト)
 */
export async function apiHealth() {
  try {
    const res = await fetchWithTimeout(`${BASE}/api/health`, { headers: buildHeaders() }, 4000);
    return res.status; // 200, 403, etc.
  } catch {
    return 0; // ネットワーク到達不可
  }
}
