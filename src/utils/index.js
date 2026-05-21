import { LS_KEYS, AUTH_TTL } from "../constants/index.js";

/* ── 金額パース: "3.5万円" "1万" "48" など → 万単位の数値 ── */
export const parseAmt = (v) => {
  if (v === "" || v == null) return 0;
  const s = String(v).replace(/,/g, "").trim();
  if (s.includes("万")) {
    const n = parseFloat(s.replace(/万円?/, ""));
    return isNaN(n) ? 0 : Math.round(n * 10) / 10;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  /* 10000以上なら円とみなして万に変換 */
  const result = n >= 10000 ? n / 10000 : n;
  return Math.round(result * 10) / 10;
};

export const fmtAmt = (v) => {
  const n = Math.round((v || 0) * 10) / 10;
  return n + "万";
};

/* ── LocalStorage ヘルパー ── */
export const lsGet = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
};
export const lsSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* ── チームフィルタ: 鈴木Tプレ = 杉山T + 鈴木T ── */
export const filterByTab = (deals, tab) => {
  if (tab === "全体") return deals;
  if (tab === "鈴木Tプレ") return deals.filter(d => d.team === "杉山T" || d.team === "鈴木T");
  return deals.filter(d => d.team === tab);
};

/* ── 確度→フェーズ連動: 回収になったら⑦受注に固定 ── */
export const resolvePhase = (confidence, currentPhase) => {
  if (confidence === "回収") return "⑦受注";
  if (currentPhase === "⑦受注" && confidence !== "回収") return currentPhase;
  return currentPhase;
};

/* ── 認証: 24時間有効なトークンを LocalStorage に保存 ── */
export const authSave = (userId) => {
  lsSet(LS_KEYS.AUTH, { userId, expiry: Date.now() + AUTH_TTL });
};

export const authLoad = () => {
  const v = lsGet(LS_KEYS.AUTH, null);
  if (!v) return null;
  if (Date.now() > v.expiry) { localStorage.removeItem(LS_KEYS.AUTH); return null; }
  return v.userId;
};

export const authClear = () => {
  localStorage.removeItem(LS_KEYS.AUTH);
};

/* ── IDジェネレータ ── */
let _nid = 100;
export const nextId = () => ++_nid;
