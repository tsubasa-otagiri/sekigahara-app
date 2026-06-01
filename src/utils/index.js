import { LS_KEYS, AUTH_TTL, NEGLECT_DAYS, DISPLAY_GROUPS } from "../constants/index.js";

/* ══════════════════════════════════════════════════════
   企業名 完全正規化（類似判定・Upsertマッチング共通）

   「株式会社GMO」「GMO(株)」「ＧＭＯ」→ すべて "gmo"
   法人格・記号・スペース・全角英数を除去して小文字化
   ※ 表示用企業名は変更しない。マッチングキー生成専用
══════════════════════════════════════════════════════ */
export const normalizeCompanyKey = (name) => {
  if (!name) return "";
  let s = String(name).trim();
  /* ① 法人格（前付き） */
  s = s.replace(/^(株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|特定非営利活動法人|ＮＰＯ法人|NPO法人|（株）|\(株\)|（有）|\(有\))/, "");
  /* ② 法人格（後付き） */
  s = s.replace(/(株式会社|有限会社|合同会社)$/, "");
  /* ③ 全角英数 → 半角 */
  s = s.replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  s = s.replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  s = s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  /* ④ スペース（全角・半角）除去 */
  s = s.replace(/[\s　]/g, "");
  /* ⑤ 記号除去（・、,.-） */
  s = s.replace(/[・、，,.\-・]/g, "");
  /* ⑥ 小文字化 */
  return s.toLowerCase();
};

/**
 * 企業名が「類似」かどうかを判定
 * 完全正規化後に一致するものだけを類似とみなす（厳格判定）
 * → 「株式会社〇〇」と「〇〇」は一致、「セイコーリテール」と「セイコーリテールマーケティング」は不一致
 */
export const isSimilarCompanyName = (a, b) => {
  if (!a || !b) return false;
  const na = normalizeCompanyKey(a);
  const nb = normalizeCompanyKey(b);
  return na.length >= 2 && nb.length >= 2 && na === nb;
};

/* ── 金額パース: "¥227,200" "3.5万円" "1万" "48" など → 万単位の数値 ── */
export const parseAmt = (v) => {
  if (v === "" || v == null) return 0;
  /* 通貨記号・区切り文字・単位サフィックスを除去してから処理
   *   ¥  (U+00A5 半角)  ／  ￥  (U+FFE5 全角)
   *   \  (Shift-JIS ¥ を UTF-8 で読んだ場合 0x5C=backslash になる)
   *   円 (単位サフィックス: "100,000円" など)
   *   ,  (桁区切り)  ／  半角スペース                               */
  const s = String(v).replace(/[¥￥\\円, ]/g, "").trim();
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

/* ──────────────────────────────────────────────────────────────
   DISPLAY_GROUPS を単一ソースとして、各タブのメンバー名セットを返す
   ※ member.team フィールドではなく、DISPLAY_GROUPS の定義を優先することで
      member データ不整合によるフィルター漏れを防ぐ
────────────────────────────────────────────────────────────── */

/** DISPLAY_GROUPS から名前→チーム名のマップを生成（例: "早川" → "杉山T"） */
export const NAME_TO_TEAM = Object.fromEntries(
  DISPLAY_GROUPS.flatMap(g => g.names.map(n => [n, g.label]))
);

/* ── チーム別メンバー名リストを返す（タスクフィルター用） ── */
export const getTabMemberNames = (tab, members, myName = "") => {
  if (tab === "全体") return null; // null = フィルターなし
  if (tab === "マイ")  return myName ? [myName] : [];

  /* アクティブかつ管理者でないメンバーが実際にアプリに登録されている名前のセット */
  const activeNames = new Set(
    members.filter(m => m.status === "active" && m.role !== "admin").map(m => m.name)
  );

  if (tab === "鈴木Tプレ") {
    /* 鈴木T全員 + 小田切（杉山T）のみ — DISPLAY_GROUPS 定義を優先 */
    const suzukiNames = (DISPLAY_GROUPS.find(g => g.label === "鈴木T")?.names || []);
    return [...suzukiNames, "小田切"].filter(n => activeNames.has(n));
  }

  /* 単一チーム: DISPLAY_GROUPS の names を使って確定的に絞る */
  const group = DISPLAY_GROUPS.find(g => g.label === tab);
  if (group) return group.names.filter(n => activeNames.has(n));

  return []; // 未知のタブ → 空配列（全件表示しない）
};

/* ── タスクをチームタブで絞り込む（担当者ベース） ── */
export const filterTasksByTab = (tasks, tab, members, myName = "") => {
  const names = getTabMemberNames(tab, members, myName);
  if (names === null) return tasks; // 全体 → フィルターなし
  if (names.length === 0) return [];  // ★ バグ修正: 空配列なら0件返す（全件漏洩防止）
  /* 担当者未設定タスクは「全体」のみ表示 */
  return tasks.filter(t => t.assignee && names.includes(t.assignee));
};

/* ── チームフィルタ: 鈴木Tプレ = 杉山T + 鈴木T / マイ = 自分担当案件 ── */
export const filterByTab = (deals, tab, myName = "") => {
  if (tab === "全体") return deals;
  if (tab === "マイ") return myName
    ? deals.filter(d => d.is === myName || d.fs === myName)
    : deals;
  if (tab === "鈴木Tプレ") return deals.filter(d => d.team === "鈴木T" || (d.team === "杉山T" && d.is === "小田切"));
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
   対象年月 正規化
   CSVがExcelで開かれると "Jun-26" のような
   mmm-yy 形式に変換されてしまうことがある。
   アプリ内部形式 "YYYY-MM" に統一する。
   対応フォーマット:
     "2026-06"  → "2026-06"  (そのまま)
     "2026/06"  → "2026-06"
     "Jun-26"   → "2026-06"  (Excel mmm-yy)
     "6月"      → null       (変換不可 → 呼び出し側でデフォルト使用)
══════════════════════════════════════════════ */
const _MON = {
  jan:"01", feb:"02", mar:"03", apr:"04", may:"05", jun:"06",
  jul:"07", aug:"08", sep:"09", oct:"10", nov:"11", dec:"12",
};
export const normalizePeriod = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  /* YYYY-MM (正規形式) */
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  /* YYYY/MM */
  if (/^\d{4}\/\d{2}$/.test(s)) return s.replace("/", "-");
  /* Excel mmm-yy 例: "Jun-26", "jan-25" */
  const m = s.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (m) {
    const mon = _MON[m[1].toLowerCase()];
    if (mon) return `20${m[2]}-${mon}`;
  }
  return null; // 変換不可
};

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

/**
 * メンバーの目標金額（万円）を返す。
 * monthlyTargets が設定されている月は月別値を優先、ない月はデフォルト target を使用。
 * activePeriods: ["2026-05", "2026-06"] などの YYYY-MM 配列。
 * 複数期間の場合は合計値を返す。
 */
export const getMemberTarget = (member, activePeriods = []) => {
  if (!member) return 0;
  const mt = member.monthlyTargets;
  const def = member.target ?? 0;
  if (!mt || Object.keys(mt).length === 0) return def;
  if (activePeriods.length === 0) return def;
  return activePeriods.reduce((sum, ym) => sum + (ym in mt ? mt[ym] : def), 0);
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
