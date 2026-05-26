import { LS_KEYS, AUTH_TTL, NEGLECT_DAYS } from "../constants/index.js";

/* ── 金額パース: "¥227,200" "3.5万円" "1万" "48" など → 万単位の数値 ── */
export const parseAmt = (v) => {
  if (v === "" || v == null) return 0;
  /* ¥ / ￥ 記号・カンマを除去してから処理 */
  const s = String(v).replace(/[¥￥,]/g, "").trim();
  if (s.includes("万")) {
    const n = parseFloat(s.replace(/万円?/, ""));
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  /* 10000以上なら円とみなして万に変換 */
  const result = n >= 10000 ? n / 10000 : n;
  return Math.round(result * 100) / 100;
};

export const fmtAmt = (v) => {
  const n = Math.round((v || 0) * 100) / 100;
  return n + "万";
};

/* ── LocalStorage ヘルパー ── */
export const lsGet = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
};
export const lsSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

/* ── チームフィルタ: 鈴木Tプレ = 杉山T + 鈴木T / マイ = 自分担当案件 ── */
export const filterByTab = (deals, tab, myName = "") => {
  if (tab === "全体") return deals;
  if (tab === "マイ") return myName
    ? deals.filter(d => d.is === myName || d.fs === myName)
    : deals;
  if (tab === "鈴木Tプレ") return deals.filter(d => d.team === "杉山T" || d.team === "鈴木T");
  return deals.filter(d => d.team === tab);
};

/* ── 確度→フェーズ連動: 回収になったら「受注」に固定 ── */
export const resolvePhase = (confidence, currentPhase) => {
  if (confidence === "回収") return "受注";
  if (currentPhase === "受注" && confidence !== "回収") return currentPhase;
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

/* ══════════════════════════════════════════════
   担当者名 正規化マッピング
   旧ニックネーム／旧フルネーム → 正式名
   LocalStorageの既存データや取り込みCSVに
   古い表記が残っていても正しく名寄せする
══════════════════════════════════════════════ */
export const NAME_MAP = {
  /* ニックネーム → 正式名 */
  "はやけん":   "早川",
  "なおき":     "早坂",
  "鈴木みのり": "鈴木",
  "ひおん":     "井上",
  "はじめ":     "櫻井",
  /* 旧フルネーム → 短縮正式名 */
  "小田切翼":   "小田切",
  "十文字菜月": "十文字",
  "杉山天瑠":   "杉山",
};

/** 名前を正規化（未登録はそのまま返す） */
export const normalizeName = (name) => {
  if (!name) return name;
  return NAME_MAP[name] ?? name;
};

/* ──────────────────────────────────────────────
   IS/FS 折半クレジットルール
   ・IS = FS（同一人物）       → 1.0（全額）
   ・IS ≠ FS（両方set・別人）  → 0.5（折半）
   ・片方のみ                   → 1.0（全額）
────────────────────────────────────────────── */
export const getDealCredit = (deal, name) => {
  const isMe = deal.is === name;
  const fsMe = deal.fs === name;
  if (!isMe && !fsMe) return 0;
  if (deal.is && deal.fs && deal.is !== deal.fs) return 0.5;
  return 1.0;
};

/** 14日以上更新なし（受注・失注以外）の案件を検知 */
export const isNeglected = (deal) => {
  if (!deal) return false;
  const yomi = deal.yomi || "";
  if (yomi === "受注" || yomi === "失注" || yomi === "Aヨミ" || deal.confidence === "回収") return false;
  const lastTs = deal.activities?.length > 0
    ? Math.max(...deal.activities.map(a => new Date(a.date).getTime()))
    : new Date(deal.updatedAt || deal.createdAt || Date.now()).getTime();
  return (Date.now() - lastTs) / 86400000 >= NEGLECT_DAYS;
};
