/**
 * AppContext.jsx
 *
 * 【API書き込みルール】
 *  - useEffect から apiSet を呼ぶことは絶対禁止（無限ループの原因）
 *  - apiSet はユーザー操作による各 mutation 関数の内部でのみ呼ぶ
 *  - ポーリング（fetchAllFromAPI）は GET 読み込み専用。書き込みしない
 *  - 起動時マイグレーション: localStorage.getItem が null でないときのみ移行
 */
import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { DEF_MEMBERS, DEF_DEALS } from "../constants/defaultData.js";
import { LS_KEYS } from "../constants/index.js";
import { lsGet, lsSet, authLoad, authSave, authClear, nextId, parseAmt, resolvePhase, normalizeName, normalizePeriod } from "../utils/index.js";
import { buildMonthlyTasks } from "../utils/monthlyTasks.js";
import { apiGet, apiSet, apiImportDeals, ForbiddenError } from "../utils/api.js";

/* 月末タスク対象メンバー（固定16名） */
const MONTHLY_MEMBERS = [
  "中村","中","櫻井","青木",
  "渡部","横井","上浦","太田",
  "鈴木","十文字","井上","渡邉",
  "杉山","小田切","早川","早坂",
];

export const AppContext = createContext(null);

/**
 * 月末処理タスクのデフォルト定義
 * daysBefore: 最終営業日の何日前が締切か（0=当日, 正数=N日前）
 */
export const DEFAULT_PANEL_TASKS = [
  { id: "pt0", emoji: "📄", title: "前月・先々月受注の請求書リマインド", when: "最終営業日5日前",      daysBefore: 5 },
  { id: "pt1", emoji: "📝", title: "リモア登録",                        when: "最終営業日3日前",      daysBefore: 3 },
  { id: "pt2", emoji: "🚚", title: "今月回収案件の役務提供",             when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt3", emoji: "💰", title: "先月・先々月の入金確認",             when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt4", emoji: "💳", title: "経費精算",                          when: "最終営業日当日",       daysBefore: 0 },
  { id: "pt5", emoji: "⏰", title: "勤怠申請",                          when: "最終営業日 18:55締切", daysBefore: 0, isKintai: true },
];

/* ══════════════════════════════════════════════
   一括インポートタスク v1（スクリーンショットから登録）
   title + assignee の組み合わせが既存になければ追加（重複防止）
══════════════════════════════════════════════ */
const TASK_IMPORT_V1 = [
  /* 鈴木 */
  { title:"ウェルビー株式会社",                         note:"ツール導入するメリット",                                                                                                                               category:"資料作成",   priority:"medium", dueDate:"2026-06-01", assignee:"鈴木"  },
  { title:"コメ兵",                                     note:"ロードマップ",                                                                                                                                         category:"資料作成",   priority:"medium", dueDate:"",          assignee:"鈴木"  },
  /* 十文字 */
  { title:"ウェルビー株式会社",                         note:"コンサル資料（ツールとコンサルどっちも欲しいです！）☆プラン未定。分析店舗3店舗駅近店舗想定でお願いします！総合分析で。次回Zooミーティング",          category:"見積書作成", priority:"high",   dueDate:"2026-06-01", assignee:"十文字"},
  { title:"株式会社ホンダモビリティ東北",               note:"9月スタート想定、6月中旬にセカンド25店舗テーブルコンサルスタート（分析データ確認）Honda Cars宮城中央 Honda Cars山形 Honda Cars岩手",               category:"資料作成",   priority:"medium", dueDate:"2026-06-05", assignee:"十文字"},
  { title:"J-netレンタリース株式会社",                  note:"コンサル資料（料金とコンサルとツールどっちも欲しいです！）☆プラン未定、分析店舗3店舗駅近店舗想定でお願いします！総合分析で、次回Zooミーティング",  category:"資料作成",   priority:"medium", dueDate:"2026-05-29", assignee:"十文字"},
  { title:"株式会社やる気",                             note:"イレギュラー",                                                                                                                                         category:"見積書作成", priority:"high",   dueDate:"",          assignee:"十文字"},
  { title:"２りんかん",                                 note:"6/11でデモ画面発行予定→次回06月16日（火）15:00 横浜戸塚2りんかん 仮見2りんかん、和見２りんかん",                                                      category:"お礼メール", priority:"medium", dueDate:"2026-06-11", assignee:"十文字"},
  { title:"株式会社日産サティオ群馬",                   note:"電脳簿への確認のうえでデモ画面発行",                                                                                                                   category:"日程調整",   priority:"medium", dueDate:"2026-05-29", assignee:"十文字"},
  { title:"株式会社アークミール",                       note:"代表向け資料（事例、分析、費用等算出を可視化 平均単価2500円 原価60%）☆日程調整リンクを5月末・6月6,7切にお願いします！",                              category:"資料作成",   priority:"high",   dueDate:"2026-06-06", assignee:"十文字"},
  { title:"万葉倶楽部株式会社",                         note:"デモ画面発行：6月1日（豊洲千客万来・東京豊洲万葉倶楽部）・資料作成",                                                                                    category:"資料作成",   priority:"high",   dueDate:"2026-05-29", assignee:"十文字"},
  { title:"株式会社マリモ・グローバル・テクノロジー",   note:"デモ対象店舗2箇取扱いただく",                                                                                                                          category:"デモ画面発行",priority:"medium", dueDate:"2026-06-01", assignee:"十文字"},
  /* 井上 */
  { title:"第一ゴルフ",                                 note:"",                                                                                                                                                     category:"お礼メール", priority:"medium", dueDate:"2026-05-29", assignee:"井上"  },
  { title:"ベルクラシック東京",                         note:"次回12日10時(DashのAiミニは貸いて下さい)",                                                                                                             category:"",          priority:"medium", dueDate:"2026-05-29", assignee:"井上"  },
  { title:"ベルクラシック東京",                         note:"次回12日10時 Dash資料（現状、検索ボリューム込）",                                                                                                      category:"資料作成",   priority:"medium", dueDate:"2026-06-05", assignee:"井上"  },
  { title:"株式会社東京クレジットサービス",             note:"日程調整は6月15日への連絡！2個もらってください",                                                                                                       category:"デモ画面発行",priority:"high",   dueDate:"2026-06-08", assignee:"井上"  },
  { title:"西武レクリエーション株式会社",               note:"6/11でデモ画面（豊島園、秩父）次回6/15ツール資料作成（見える化比較、現状分析込）",                                                                     category:"資料作成",   priority:"medium", dueDate:"2026-06-11", assignee:"井上"  },
  { title:"株式会社IEC",                                note:"Dash資料（全室分析/GMOの他社比較資料）次回：6月3日(水)14:00〜",                                                                                       category:"資料作成",   priority:"medium", dueDate:"2026-05-29", assignee:"井上"  },
  { title:"株式会社極東商会",                           note:"お礼メール+速度資料/資料作成（ツールとコンサルどっちも料金のせて）次回：6月12日11時-",                                                               category:"資料作成",   priority:"medium", dueDate:"2026-06-05", assignee:"井上"  },
  /* 早川 */
  { title:"ブックファーストデモ所感確認",               note:"",                                                                                                                                                     category:"社内確認",   priority:"medium", dueDate:"",          assignee:"早川"  },
  { title:"中国銀行",                                   note:"競合比較、料金シミュレーション",                                                                                                                        category:"",          priority:"low",    dueDate:"2026-05-31", assignee:"早川"  },
  { title:"株式会社東光ストア",                         note:"月末にてデモの所感得られれば資料",                                                                                                                     category:"社内確認",   priority:"low",    dueDate:"2026-05-31", assignee:"早川"  },
  { title:"再度トモズ",                                 note:"",                                                                                                                                                     category:"資料作成",   priority:"medium", dueDate:"2026-05-29", assignee:"早川"  },
  /* 早坂 */
  { title:"丸福",                                       note:"受注後タスク",                                                                                                                                         category:"社内確認",   priority:"low",    dueDate:"2026-06-05", assignee:"早坂"  },
  { title:"東京デリカ",                                 note:"ブランド毎の分析前材 サックスバー プランサックス ラバックス キャラトラ",                                                                               category:"資料作成",   priority:"high",   dueDate:"2026-06-02", assignee:"早坂"  },
  { title:"静岡日産自動車株式会社",                     note:"中部 静岡市内東 清水伊豆 カンナ店 10店舗ずつの分析、指定キーワードでの地位状況",                                                                       category:"資料作成",   priority:"medium", dueDate:"2026-06-01", assignee:"早坂"  },
  { title:"山新【リスケ】→27日に先方から電話くれるとのこと。▼連絡つかず", note:"",                                                                                                                                   category:"",          priority:"low",    dueDate:"2026-05-27", assignee:"早坂"  },
];

/** タスク処理者（createdBy）マッピング: 担当者 → 登録者 */
const IMPORT_CREATOR = {
  "鈴木":   "鈴木",
  "十文字": "鈴木",
  "井上":   "鈴木",
  "小田切": "早川",
  "早川":   "早川",
  "早坂":   "早川",
};

/* ══════════════════════════════════════════════
   6月案件一括インポート v1（2026-06 CSV登録 全51件）
   company + period "2026-06" で照合：既存を更新 / 新規追加
══════════════════════════════════════════════ */
const JUNE_DEALS_V1 = [
  /* 30% ─ 杉山T */
  { company:"MS企画",                           plan:"MDC",      amount:8,     is:"早坂",   fs:"早川",   team:"杉山T", confidence:"30%" },
  { company:"富山育英",                         plan:"MDC",      amount:10,    is:"早坂",   fs:"早川",   team:"杉山T", confidence:"30%" },
  { company:"株式会社名鉄インプレス",           plan:"MDC",      amount:10,    is:"渡邉",   fs:"杉山",   team:"杉山T", confidence:"30%" },
  { company:"ネッツトヨタ鹿児島",               plan:"MDC",      amount:10,    is:"小田切", fs:"早川",   team:"杉山T", confidence:"30%" },
  { company:"栃木銀行",                         plan:"MDC",      amount:20,    is:"早川",   fs:"早川",   team:"杉山T", confidence:"30%" },
  { company:"すしざんまい",                     plan:"MDC",      amount:10,    is:"早坂",   fs:"早川",   team:"杉山T", confidence:"30%" },
  /* 30% ─ 中村T */
  { company:"株式会社伸和ホールディングス",     plan:"コンサル", amount:30,    is:"櫻井",   fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"コンフィーステイ",                 plan:"コンサル", amount:0,     is:"中",     fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"アール・ケイエンタープライズ",     plan:"コンサル", amount:21.3,  is:"櫻井",   fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"エーディックス",                   plan:"コンサル", amount:0,     is:"中",     fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"JAM TRADING",                      plan:"コンサル", amount:0,     is:"中",     fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"ピー・エス・コープ",               plan:"MDC",      amount:15,    is:"櫻井",   fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"二木",                             plan:"MDC",      amount:10,    is:"中",     fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"ナイスクラップ",                   plan:"MDC",      amount:0,     is:"中",     fs:"中村",   team:"中村T", confidence:"30%" },
  { company:"UKCorporation",                    plan:"MDC",      amount:0,     is:"櫻井",   fs:"中村",   team:"中村T", confidence:"30%" },
  /* 30% ─ 渡部T */
  { company:"神奈川トヨタ自動車",               plan:"コンサル", amount:44,    is:"渡部",   fs:"横井",   team:"渡部T", confidence:"30%" },
  { company:"島根ダイハツ",                     plan:"MDC",      amount:5,     is:"太田",   fs:"渡部",   team:"渡部T", confidence:"30%" },
  { company:"あいネットサービス",               plan:"コンサル", amount:0,     is:"太田",   fs:"渡部",   team:"渡部T", confidence:"30%" },
  { company:"一蔵",                             plan:"コンサル", amount:16,    is:"横井",   fs:"渡部",   team:"渡部T", confidence:"30%", note:"稟議提出まち" },
  { company:"旅籠屋",                           plan:"MDC",      amount:20,    is:"上浦",   fs:"渡部",   team:"渡部T", confidence:"30%" },
  { company:"喪服レスキュー",                   plan:"MDC",      amount:8,     is:"上浦",   fs:"渡部",   team:"渡部T", confidence:"30%" },
  { company:"コロナワールド",                   plan:"MDC",      amount:20,    is:"上浦",   fs:"渡部",   team:"渡部T", confidence:"30%" },
  /* 30% ─ 鈴木T */
  { company:"SMART EXCHANGE",                   plan:"コンサル", amount:35.5,  is:"鈴木",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"野嵩商会",                         plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"万葉倶楽部",                       plan:"MDC",      amount:10,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"杏林堂薬局",                       plan:"MDC",      amount:8,     is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"2りんかんイエローハット",          plan:"MDC",      amount:20,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"大倉ビル",                         plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"十徳",                             plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"岐阜日産自動車",                   plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"ネッツトヨタ香川",                 plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"極東商会",                         plan:"MDC",      amount:10,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"ギークマン",                       plan:"MDC",      amount:10,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"セイコーリテール",                 plan:"コンサル", amount:30,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"吉田",                             plan:"MDC",      amount:8,     is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"トヨタモビリティ釧路",             plan:"コンサル", amount:24,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"ミルク",                           plan:"コンサル", amount:40,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"IEC",                              plan:"Dash!",    amount:3.75,  is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"ニチイケアパレス",                 plan:"コンサル", amount:50,    is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  { company:"喜久屋",                           plan:"MDC",      amount:8,     is:"井上",   fs:"鈴木",   team:"鈴木T", confidence:"30%" },
  /* 50% */
  { company:"株式会社学研スタディエ",           plan:"コンサル", amount:24.5,  is:"櫻井",   fs:"中村",   team:"中村T", confidence:"50%", note:"17日までに決" },
  { company:"株式会社ジローレストランシステム", plan:"MDC",      amount:13,    is:"上浦",   fs:"渡部",   team:"渡部T", confidence:"50%", note:"あと承認1人" },
  { company:"株式会社成通",                     plan:"MDC",      amount:12,    is:"太田",   fs:"渡部",   team:"渡部T", confidence:"50%", note:"6月20日" },
  { company:"株式会社やる気",                   plan:"コンサル", amount:30,    is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"50%" },
  /* 70% */
  { company:"ウエインズトヨタ神奈川",           plan:"コンサル", amount:50,    is:"早坂",   fs:"杉山",   team:"杉山T", confidence:"70%" },
  { company:"株式会社タイヤワールド館ベスト",   plan:"MDC",      amount:4,     is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"70%" },
  /* 回収 */
  { company:"丸福商店",                         plan:"MDC",      amount:15,    is:"早坂",   fs:"早川",   team:"杉山T", confidence:"回収", note:"29日決/決済者に打診中" },
  { company:"株式会社タカハシ",                 plan:"MDC",      amount:8,     is:"中",     fs:"中村",   team:"中村T", confidence:"回収" },
  { company:"株式会社ライダース・パブリシティ", plan:"コンサル", amount:30,    is:"櫻井",   fs:"中",     team:"中村T", confidence:"回収" },
  { company:"ドゥワーク",                       plan:"MDC",      amount:10,    is:"上浦",   fs:"渡部",   team:"渡部T", confidence:"回収" },
  { company:"株式会社大滝",                     plan:"MDC",      amount:3.55,  is:"十文字", fs:"鈴木",   team:"鈴木T", confidence:"回収" },
];

/** 重複（title+assignee）を除いて未登録タスクのみ追加 */
function applyTaskImportV1(tasks) {
  const existing = new Set(tasks.map(t => `${t.title}::${t.assignee}`));
  const now = new Date().toISOString();
  const toAdd = TASK_IMPORT_V1
    .filter(r => !existing.has(`${r.title}::${r.assignee}`))
    .map((r, i) => ({
      id:        `task_import_v1_${i}`,
      completed: false,
      createdAt: now,
      createdBy: IMPORT_CREATOR[r.assignee] || "管理者",
      dueTime:   "",
      ...r,
    }));
  return toAdd.length > 0 ? [...tasks, ...toAdd] : tasks;
}

/** v2: 既存インポートタスクの createdBy を正しい登録者に修正 */
function applyTaskImportCreatorFix(tasks) {
  return tasks.map(t =>
    (t.id && String(t.id).startsWith("task_import_v1_") && IMPORT_CREATOR[t.assignee])
      ? { ...t, createdBy: IMPORT_CREATOR[t.assignee] }
      : t
  );
}

/** 6月案件 v1 migration: 既存 2026-06 案件は一切変更しない。
 *  company が存在しない場合のみ追加（冪等・ユーザー変更を上書きしない） */
function applyJuneDealsV1(deals) {
  const period = "2026-06";
  const now = new Date().toISOString();
  // 既存の 2026-06 会社名セット
  const existingCompanies = new Set(
    deals.filter(d => d.period === period).map(d => d.company)
  );
  let next = [...deals];
  let changed = false;
  JUNE_DEALS_V1.forEach((src, idx) => {
    if (existingCompanies.has(src.company)) return; // 既存 → スキップ（上書きしない）
    const conf  = src.confidence;
    const phase = conf === "回収" ? "受注" : "未設定";
    const yomi  = conf === "回収" ? "受注" : conf === "70%" ? "70%" : conf === "50%" ? "50%" : "30%";
    next.push({
      id: `june_v1_${idx}`,
      company: src.company, plan: src.plan, amount: src.amount,
      is: src.is, fs: src.fs, team: src.team,
      confidence: conf, phase, yomi,
      note: src.note || "", period, lossReason: "",
      activities: [], createdAt: now, updatedAt: now,
    });
    existingCompanies.add(src.company);
    changed = true;
  });
  return { deals: changed ? next : deals, changed };
}

/* 当月 period 文字列 ("YYYY-MM") */
const _NOW = new Date();
const _PAD = (n) => String(n).padStart(2, "0");
export const TODAY_PERIOD = `${_NOW.getFullYear()}-${_PAD(_NOW.getMonth() + 1)}`;
const _TODAY_ISO = new Date().toISOString();

const _confToYomi = (c) => {
  if (c === "回収") return "受注";
  if (c === "70%")  return "70%";
  if (c === "50%")  return "50%";
  if (c === "30%")  return "30%";
  return "50%";
};
const _migrateYomi = (y) => {
  if (y === "Aヨミ") return "70%";
  if (y === "Bヨミ") return "50%";
  if (y === "Cヨミ") return "30%";
  return y;
};
const _PHASE_MAP = {
  "①2nd": "2nd", "②デモ": "デモ", "③上長共有": "上長共有",
  "④決済者商談予定": "決済者商談予定", "⑤決済者共有": "決済者共有",
  "⑥稟議中": "稟議中", "⑦受注": "受注", "⑧失注": "失注",
};
const _migratePhase = (p) => _PHASE_MAP[p] ?? p;
const resolveYomi = (yomi, conf) => yomi || _confToYomi(conf);
const _normDeal = (d) => ({
  ...d,
  is:         normalizeName(d.is),
  fs:         normalizeName(d.fs),
  phase:      _migratePhase(d.phase || "未設定"),
  period:     normalizePeriod(d.period) || TODAY_PERIOD,
  yomi:       _migrateYomi(d.yomi || _confToYomi(d.confidence)),
  lossReason: d.lossReason || "",
  createdAt:  d.createdAt  || _TODAY_ISO,
  updatedAt:  d.updatedAt  || _TODAY_ISO,
  activities: Array.isArray(d.activities) ? d.activities : [],
});

const DEFAULT_FAVICON_HREF = "data:,";

/* ── ローカルストレージにキーが実在するか確認（デフォルト値と区別） ── */
const lsExists = (key) => localStorage.getItem(key) !== null;

export const AppProvider = ({ children }) => {

  /* ══════════════════════════════════════════════════════
   * API ロード完了フラグ
   * false の間は useEffect 内から apiSet を呼ばない（呼ばせない）
   * ══════════════════════════════════════════════════════ */
  const apiLoadedRef = useRef(false);

  /* ══════════════════════════════════════════════════════
   * ネットワーク遮断ステート
   *   networkBlocked : Workers が 403 を返した場合 true
   *                    → App.jsx でアプリ全体をブロック画面に切り替え
   *   apiChecking    : 初回 API チェック完了前は true
   *                    → 完了前に localStorage キャッシュを表示させない
   * ══════════════════════════════════════════════════════ */
  const [networkBlocked, setNetworkBlocked] = useState(false);
  const [apiChecking,    setApiChecking]    = useState(true);
  const [lastUpdatedAt,  setLastUpdatedAt]  = useState(null); // 最終更新日時

  /* ── ユーザー別通知設定 ── */
  const [userSettings, setUserSettings] = useState(() => {
    const raw = lsGet(LS_KEYS.USER_SETTINGS, {});
    const { __panelTasks: _, __loginCounts: __, ...rest } = raw;
    return rest;
  });
  const userSettingsRef = useRef(userSettings);

  /* ── 月末処理タスク定義（全ユーザー共有） ── */
  const [panelTasks, setPanelTasksRaw] = useState(() => {
    const raw = lsGet(LS_KEYS.USER_SETTINGS, {});
    return Array.isArray(raw.__panelTasks) && raw.__panelTasks.length > 0
      ? raw.__panelTasks
      : DEFAULT_PANEL_TASKS;
  });
  const panelTasksRef = useRef(panelTasks);

  /* ── ユーザー別ログイン回数（管理画面表示用） ── */
  const [loginCounts, setLoginCounts] = useState(() => {
    const raw = lsGet(LS_KEYS.USER_SETTINGS, {});
    return (raw.__loginCounts && typeof raw.__loginCounts === "object") ? raw.__loginCounts : {};
  });
  const loginCountsRef = useRef(loginCounts);

  /* ── 案件書き込み最終タイムスタンプ ──
   * 30秒ポーリングの GET が書き込み前に発行された場合、
   * レスポンスで setDeals を上書きしないための競合防止フラグ */
  const lastDealsWriteRef = useRef(0);

  /* userSettings / panelTasks / loginCounts → localStorage のみ（API書き込みは各 setter 内で） */
  useEffect(() => {
    userSettingsRef.current  = userSettings;
    panelTasksRef.current    = panelTasks;
    loginCountsRef.current   = loginCounts;
    lsSet(LS_KEYS.USER_SETTINGS, { ...userSettings, __panelTasks: panelTasks, __loginCounts: loginCounts });
  }, [userSettings, panelTasks, loginCounts]);

  const getMyNotifSettings = useCallback((userId) => {
    return { notifyOnTaskAdded: true, notifyOnTaskReminder: true, ...((userSettings[userId]) || {}) };
  }, [userSettings]);

  const updateMyNotifSettings = useCallback((userId, patch) => {
    setUserSettings(prev => {
      const next = {
        ...prev,
        [userId]: { notifyOnTaskAdded: true, notifyOnTaskReminder: true, ...(prev[userId] || {}), ...patch },
      };
      userSettingsRef.current = next;
      /* ユーザー操作 → API書き込み */
      if (apiLoadedRef.current) {
        apiSet("user_settings", { ...next, __panelTasks: panelTasksRef.current, __loginCounts: loginCountsRef.current }).catch(console.error);
      }
      return next;
    });
  }, []);

  const setPanelTasks = useCallback((tasks) => {
    setPanelTasksRaw(tasks);
    panelTasksRef.current = tasks;
    /* ユーザー操作 → API書き込み */
    if (apiLoadedRef.current) {
      apiSet("user_settings", { ...userSettingsRef.current, __panelTasks: tasks, __loginCounts: loginCountsRef.current }).catch(console.error);
    }
  }, []);

  /* ── 通知ログ ── */
  const [notifLogs, setNotifLogs] = useState(() => {
    const migrated = localStorage.getItem(LS_KEYS.NOTIF_MIGRATED);
    if (!migrated) {
      localStorage.removeItem(LS_KEYS.NOTIFS);
      localStorage.setItem(LS_KEYS.NOTIF_MIGRATED, "1");
      return [];
    }
    return lsGet(LS_KEYS.NOTIFS, []).filter(n => !!n.targetUser);
  });
  /* localStorage のみ同期（API書き込みは mutation 内） */
  useEffect(() => { lsSet(LS_KEYS.NOTIFS, notifLogs); }, [notifLogs]);

  const addNotifLog = useCallback((log) => {
    const entry = { id: `nlog_${Date.now()}`, isRead: false, createdAt: new Date().toISOString(), ...log };
    setNotifLogs(prev => {
      const next = [entry, ...prev].slice(0, 100);
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
    return entry;
  }, []);

  const markNotifRead = useCallback((id) => {
    setNotifLogs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
  }, []);

  const markAllNotifsRead = useCallback((targetUser) => {
    setNotifLogs(prev => {
      const next = prev.map(n => {
        if (targetUser && n.targetUser && n.targetUser !== targetUser) return n;
        return { ...n, isRead: true };
      });
      if (apiLoadedRef.current) apiSet("notifs", next).catch(console.error);
      return next;
    });
  }, []);

  const clearNotifLogs = useCallback(() => {
    setNotifLogs([]);
    if (apiLoadedRef.current) apiSet("notifs", []).catch(console.error);
  }, []);

  /* ── タスク ── */
  const [tasks, setTasks] = useState(() => {
    let t = lsGet(LS_KEYS.TASKS, []);
    const IMPORT_KEY  = "honnoji_task_import_v1";
    const CREATOR_KEY = "honnoji_task_import_v2";
    if (!localStorage.getItem(IMPORT_KEY)) {
      t = applyTaskImportV1(t);
      localStorage.setItem(IMPORT_KEY, "1");
    }
    if (!localStorage.getItem(CREATOR_KEY)) {
      t = applyTaskImportCreatorFix(t);
      localStorage.setItem(CREATOR_KEY, "1");
    }
    return t;
  });
  useEffect(() => { lsSet(LS_KEYS.TASKS, tasks); }, [tasks]);

  const addTask = useCallback((raw) => {
    const t = { ...raw, id: `task_${Date.now()}`, completed: false, createdAt: new Date().toISOString() };
    setTasks(prev => {
      const next = [t, ...prev];
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const updateTask = useCallback((id, patch) => {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id) => {
    setTasks(prev => {
      const next = prev.map(t => t.id !== id ? t : {
        ...t,
        completed: !t.completed,
        completedAt: !t.completed ? new Date().toISOString() : null,
      });
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
  }, []);

  const generateMonthlyCheckTasks = useCallback((year, month) => {
    const newTasks = buildMonthlyTasks(year, month, MONTHLY_MEMBERS);
    let added = 0, skipped = 0;
    setTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const toAdd = newTasks.filter(t => {
        if (existingIds.has(t.id)) { skipped++; return false; }
        added++;
        return true;
      });
      if (toAdd.length === 0) return prev;
      const next = [...toAdd, ...prev];
      if (apiLoadedRef.current) apiSet("tasks", next).catch(console.error);
      return next;
    });
    return { total: newTasks.length, added, skipped };
  }, []);

  /* ── 案件 ── */
  const [deals, setDeals] = useState(() => {
    let d = lsGet(LS_KEYS.DEALS, DEF_DEALS).map(_normDeal);
    const JUNE_KEY = "honnoji_june_deals_v1";
    if (!localStorage.getItem(JUNE_KEY)) {
      const { deals: migrated, changed } = applyJuneDealsV1(d);
      if (changed) d = migrated;
      localStorage.setItem(JUNE_KEY, "1");
    }
    return d;
  });
  useEffect(() => { lsSet(LS_KEYS.DEALS, deals); }, [deals]);

  /* ── 年月選択 ── */
  const [currentYear,  setCurrentYear]  = useState(_NOW.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(_NOW.getMonth() + 1);
  const [periodType,   setPeriodType]   = useState("month");

  const currentPeriod = `${currentYear}-${_PAD(currentMonth)}`;
  const _QM = { Q1:[1,2,3], Q2:[4,5,6], Q3:[7,8,9], Q4:[10,11,12] };
  const activePeriods = periodType === "month"
    ? [currentPeriod]
    : (_QM[periodType] || []).map(m => `${currentYear}-${_PAD(m)}`);

  const addDeal = useCallback((raw) => {
    const deal = {
      ...raw,
      id:         nextId(),
      amount:     parseAmt(raw.amount),
      phase:      resolvePhase(raw.confidence, raw.phase),
      is:         normalizeName(raw.is),
      fs:         normalizeName(raw.fs),
      period:     raw.period || currentPeriod,
      yomi:       resolveYomi(raw.yomi, raw.confidence),
      lossReason: raw.lossReason || "",
      createdAt:  raw.createdAt  || new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
      activities: raw.activities || [],
    };
    setDeals(prev => {
      const next = [deal, ...prev];
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
    return deal;
  }, [currentPeriod]);

  const updateDeal = useCallback((id, patch) => {
    setDeals(prev => {
      const next = prev.map(d => {
        if (d.id !== id) return d;
        const n = { ...d, ...patch, amount: patch.amount !== undefined ? parseAmt(patch.amount) : d.amount };
        n.phase = resolvePhase(n.confidence, n.phase);
        n.is = normalizeName(n.is);
        n.fs = normalizeName(n.fs);
        n.updatedAt = new Date().toISOString();
        return n;
      });
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
  }, []);

  const deleteDeal = useCallback((id) => {
    setDeals(prev => {
      const next = prev.filter(d => d.id !== id);
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
  }, []);

  const addActivity = useCallback((dealId, act) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: [...(d.activities || []), { id: nextId(), date: now, ...act }],
        updatedAt: now,
      });
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
  }, []);

  const deleteActivity = useCallback((dealId, actId) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: (d.activities || []).filter(a => a.id !== actId),
        updatedAt: now,
      });
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
  }, []);

  const updateActivity = useCallback((dealId, actId, patch) => {
    const now = new Date().toISOString();
    setDeals(prev => {
      const next = prev.map(d => d.id !== dealId ? d : {
        ...d,
        activities: (d.activities || []).map(a => a.id !== actId ? a : { ...a, ...patch }),
        updatedAt: now,
      });
      if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", next).catch(console.error); }
      return next;
    });
  }, []);

  const replaceDeals = useCallback((ds) => {
    setDeals(ds);
    if (apiLoadedRef.current) { lastDealsWriteRef.current = Date.now(); apiSet("deals", ds).catch(console.error); }
  }, []);

  /**
   * Excelインポート: パース済み案件配列をバックエンドの /api/import-deals へ送り
   * Upsert（追加・更新）を実行。完了後に deals state を即時反映。
   */
  const importDeals = useCallback(async (incomingDeals, period) => {
    const result = await apiImportDeals(incomingDeals, period);
    if (result.ok && Array.isArray(result.deals)) {
      const normalized = result.deals.map(_normDeal);
      lastDealsWriteRef.current = Date.now();
      setDeals(normalized);
      lsSet(LS_KEYS.DEALS, normalized);
    }
    return result; // { ok, added, updated, total, savedAt }
  }, []);

  /* ── メンバー ── */
  const [members, setMembers] = useState(() => {
    const stored = lsGet(LS_KEYS.MEMBERS, DEF_MEMBERS);
    let result = stored.map(m => ({ ...m, name: normalizeName(m.name) }));
    const SUGIYAMA_TEAM_FIX = "honnoji_sugiyama_team_v1";
    if (!localStorage.getItem(SUGIYAMA_TEAM_FIX)) {
      result = result.map(m =>
        m.name === "杉山" && m.team === "全社FS"
          ? { ...m, team: "杉山T", role: "leader", badge: "IS+FS" }
          : m
      );
      localStorage.setItem(SUGIYAMA_TEAM_FIX, "1");
    }
    const PW_RESET_KEY = "honnoji_pw_reset_v1";
    if (!localStorage.getItem(PW_RESET_KEY)) {
      result = result.map(m => ({ ...m, pw: "1111" }));
      localStorage.setItem(PW_RESET_KEY, "1");
    }
    /* 青木 月別目標マイグレーション */
    const AOKI_TARGETS_KEY = "honnoji_aoki_targets_v1";
    if (!localStorage.getItem(AOKI_TARGETS_KEY)) {
      result = result.map(m => m.id === "aoki"
        ? { ...m, monthlyTargets: { "2026-05":0, "2026-06":10, "2026-07":20, "2026-08":30 } }
        : m
      );
      localStorage.setItem(AOKI_TARGETS_KEY, "1");
    }
    /* 渡邉(IS/杉山T) 追加・チーム修正マイグレーション */
    const WATANABE_IS_KEY = "honnoji_watanabe_is_v2";
    if (!localStorage.getItem(WATANABE_IS_KEY)) {
      const entry = DEF_MEMBERS.find(m => m.id === "watanabe_is");
      if (entry) {
        if (!result.some(m => m.id === "watanabe_is")) {
          result = [...result, entry];
        } else {
          result = result.map(m => m.id === "watanabe_is" ? { ...m, team: "杉山T" } : m);
        }
      }
      localStorage.setItem(WATANABE_IS_KEY, "1");
    }
    return result;
  });
  useEffect(() => { lsSet(LS_KEYS.MEMBERS, members); }, [members]);

  const updateMember = useCallback((id, patch) => {
    setMembers(prev => {
      const next = prev.map(m =>
        m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
      );
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
  }, []);

  const addMember = useCallback((raw) => {
    const _now = new Date().toISOString();
    const m = { ...raw, id: `usr_${Date.now()}`, status: "active", createdAt: _now, updatedAt: _now };
    setMembers(prev => {
      const next = [...prev, m];
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
    return m;
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id);
      if (apiLoadedRef.current) apiSet("members", next).catch(console.error);
      return next;
    });
  }, []);

  const replaceMembers = useCallback((ms) => {
    setMembers(ms);
    if (apiLoadedRef.current) apiSet("members", ms).catch(console.error);
  }, []);

  /* ── 月末処理チェック ── */
  const [monthEndChecks, setMonthEndChecksState] = useState(() => lsGet(LS_KEYS.MONTH_END, {}));
  useEffect(() => { lsSet(LS_KEYS.MONTH_END, monthEndChecks); }, [monthEndChecks]);

  const setMonthEndCheck = useCallback((userId, ym, taskId, value) => {
    setMonthEndChecksState(prev => {
      const key      = `${userId}_${ym}`;
      const existing = prev[key];
      const current  = (!existing || Array.isArray(existing)) ? {} : { ...existing };
      current[taskId] = value;
      const next = { ...prev, [key]: current };
      if (apiLoadedRef.current) apiSet("monthend", next).catch(console.error);
      return next;
    });
  }, []);

  /* ── 要望 ── */
  const [requests, setRequests] = useState(() => lsGet(LS_KEYS.REQUESTS, []));
  useEffect(() => { lsSet(LS_KEYS.REQUESTS, requests); }, [requests]);
  const [requestNotifs, setRequestNotifs] = useState([]);

  const addRequest = useCallback((content, requester) => {
    const req = {
      id: `req_${Date.now()}`,
      user: requester || "",
      content,
      status: "未対応",
      notified: false,
      likes: [],
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => {
      const next = [req, ...prev];
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const resolveRequest = useCallback((id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status: "対応済" } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const toggleLike = useCallback((name) => (id) => {
    if (!name) return;
    setRequests(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const likes = r.likes ?? [];
        return { ...r, likes: likes.includes(name) ? likes.filter(n => n !== name) : [...likes, name] };
      });
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const deleteRequest = useCallback((id) => {
    setRequests(prev => {
      const next = prev.filter(r => r.id !== id);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, []);

  const markRequestNotified = useCallback((id) => {
    setRequests(prev => {
      const next = prev.map(r => r.id === id ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs(prev => prev.filter(r => r.id !== id));
  }, []);

  const dismissAllNotifs = useCallback((ids) => {
    setRequests(prev => {
      const next = prev.map(r => ids.includes(r.id) ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs([]);
  }, []);

  /* ── ロゴ（旗印） ── */
  const [logoDataUrl, setLogoDataUrl] = useState(
    () => localStorage.getItem("honnoji_favicon") || null
  );
  const saveLogo = useCallback((dataUrl) => {
    if (dataUrl) localStorage.setItem("honnoji_favicon", dataUrl);
    else localStorage.removeItem("honnoji_favicon");
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = dataUrl || DEFAULT_FAVICON_HREF;
    setLogoDataUrl(dataUrl || null);
  }, []);

  /* ══════════════════════════════════════════════════════
   * fetchAllFromAPI — GET 専用、書き込みは初回マイグレーションのみ
   *
   * 【マイグレーション条件】
   *   localStorage.getItem(key) !== null のときのみ移行
   *   → 新端末でキーが存在しない場合は DEF_XXX を API に送らない
   * ══════════════════════════════════════════════════════ */
  const fetchAllFromAPI = useCallback(async () => {
    /* GET 発行時刻を記録。レスポンスが届く前に書き込みが入った場合は
     * deals の上書きをスキップして削除・更新の消失を防ぐ */
    const fetchStartTime = Date.now();
    try {
      const [
        apiDeals, apiTasks, apiMembers,
        apiRequests, apiNotifs, apiMonthEnd, apiUserSettings,
      ] = await Promise.all([
        apiGet("deals"),    apiGet("tasks"),   apiGet("members"),
        apiGet("requests"), apiGet("notifs"),  apiGet("monthend"),
        apiGet("user_settings"),
      ]);

      /* deals —
       * Cloudflare KV は最大60秒の伝播遅延があるため、書き込みから60秒間は
       * ポーリングによる上書きをスキップして書き込み直後の巻き戻しを防ぐ。
       * fetchStartTime < lastDealsWriteRef + 60s → スキップ */
      if (Array.isArray(apiDeals) && apiDeals.length > 0) {
        if (fetchStartTime >= lastDealsWriteRef.current + 60_000) {
          let nextDeals = apiDeals.map(_normDeal);
          const { deals: migratedDeals, changed: juneChanged } = applyJuneDealsV1(nextDeals);
          if (juneChanged) {
            nextDeals = migratedDeals;
            lastDealsWriteRef.current = Date.now();
            apiSet("deals", nextDeals).catch(console.error);
          }
          setDeals(nextDeals);
        }
      } else if (lsExists(LS_KEYS.DEALS)) {
        const local = lsGet(LS_KEYS.DEALS, []);
        if (local.length > 0) apiSet("deals", local).catch(console.error);
      }

      /* tasks */
      if (Array.isArray(apiTasks) && apiTasks.length > 0) {
        let merged = applyTaskImportV1(apiTasks);
        const fixed = applyTaskImportCreatorFix(merged);
        if (fixed.length > apiTasks.length || JSON.stringify(fixed) !== JSON.stringify(merged)) {
          apiSet("tasks", fixed).catch(console.error);
        }
        merged = fixed;
        setTasks(merged);
      } else if (lsExists(LS_KEYS.TASKS)) {
        const local = lsGet(LS_KEYS.TASKS, []);
        if (local.length > 0) apiSet("tasks", local).catch(console.error);
      }

      /* members */
      if (Array.isArray(apiMembers) && apiMembers.length > 0) {
        let next = apiMembers.map(m => ({ ...m, name: normalizeName(m.name) }));
        /* 青木 月別目標マイグレーション（KV） */
        const AOKI_MT = { "2026-05":0, "2026-06":10, "2026-07":20, "2026-08":30 };
        const aokiIdx = next.findIndex(m => m.id === "aoki");
        if (aokiIdx !== -1 && !("2026-05" in (next[aokiIdx].monthlyTargets ?? {}))) {
          next = next.map((m, i) => i === aokiIdx ? { ...m, monthlyTargets: AOKI_MT } : m);
          apiSet("members", next).catch(console.error);
        }
        /* 渡邉 追加・チーム修正マイグレーション（KV） */
        const wEntry = DEF_MEMBERS.find(m => m.id === "watanabe_is");
        if (wEntry) {
          const existing = next.find(m => m.id === "watanabe_is");
          if (!existing) {
            next = [...next, wEntry];
            apiSet("members", next).catch(console.error);
          } else if (existing.team !== "杉山T") {
            next = next.map(m => m.id === "watanabe_is" ? { ...m, team: "杉山T" } : m);
            apiSet("members", next).catch(console.error);
          }
        }
        setMembers(next);
      } else if (lsExists(LS_KEYS.MEMBERS)) {
        const local = lsGet(LS_KEYS.MEMBERS, []);
        if (local.length > 0) apiSet("members", local).catch(console.error);
      }

      /* requests */
      if (Array.isArray(apiRequests) && apiRequests.length > 0) {
        setRequests(apiRequests);
      } else if (lsExists(LS_KEYS.REQUESTS)) {
        const local = lsGet(LS_KEYS.REQUESTS, []);
        if (local.length > 0) apiSet("requests", local).catch(console.error);
      }

      /* notifLogs */
      if (Array.isArray(apiNotifs) && apiNotifs.length > 0) {
        setNotifLogs(apiNotifs.filter(n => !!n.targetUser));
      } else if (lsExists(LS_KEYS.NOTIFS)) {
        const local = lsGet(LS_KEYS.NOTIFS, []).filter(n => !!n.targetUser);
        if (local.length > 0) apiSet("notifs", local).catch(console.error);
      }

      /* monthEndChecks */
      if (apiMonthEnd && typeof apiMonthEnd === "object" && Object.keys(apiMonthEnd).length > 0) {
        setMonthEndChecksState(apiMonthEnd);
      } else if (lsExists(LS_KEYS.MONTH_END)) {
        const local = lsGet(LS_KEYS.MONTH_END, {});
        if (Object.keys(local).length > 0) apiSet("monthend", local).catch(console.error);
      }

      /* user_settings + panelTasks + loginCounts */
      if (apiUserSettings && typeof apiUserSettings === "object" && Object.keys(apiUserSettings).length > 0) {
        const { __panelTasks, __loginCounts, ...uSettings } = apiUserSettings;
        if (Object.keys(uSettings).length > 0) {
          setUserSettings(uSettings);
          userSettingsRef.current = uSettings;
        }
        if (Array.isArray(__panelTasks) && __panelTasks.length > 0) {
          setPanelTasksRaw(__panelTasks);
          panelTasksRef.current = __panelTasks;
        }
        if (__loginCounts && typeof __loginCounts === "object") {
          setLoginCounts(__loginCounts);
          loginCountsRef.current = __loginCounts;
        }
      } else if (lsExists(LS_KEYS.USER_SETTINGS)) {
        const local = lsGet(LS_KEYS.USER_SETTINGS, {});
        if (Object.keys(local).length > 0) apiSet("user_settings", local).catch(console.error);
      }

      /* ── 正常応答: IP制限を解除（VPN復帰後ポーリングで自動回復） ── */
      setNetworkBlocked(false);
      setLastUpdatedAt(new Date());
      apiLoadedRef.current = true;
      setApiChecking(false);
      return true;

    } catch (e) {

      /* ── 403: IPホワイトリストで遮断 → アプリ全体をブロック画面へ ── */
      if (e instanceof ForbiddenError) {
        console.error("[IP ACCESS DENIED] Frontend blocked: 403 Forbidden from API.");
        setNetworkBlocked(true);
        setApiChecking(false);
        /* apiLoadedRef は true にしない（ブロック中は書き込みも禁止） */
        return false;
      }

      /* ── その他エラー（ネットワーク障害・タイムアウト等）→ キャッシュで継続 ── */
      console.warn("API unavailable, using local cache:", e.message);
      apiLoadedRef.current = true;
      setApiChecking(false);
      return false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 初回マウント時のみ API から取得 */
  useEffect(() => {
    fetchAllFromAPI();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 30秒ポーリング — GET のみ、state 更新のみ、書き込みなし */
  useEffect(() => {
    const id = setInterval(fetchAllFromAPI, 30_000);
    return () => clearInterval(id);
  }, [fetchAllFromAPI]);

  const refreshData = useCallback(() => fetchAllFromAPI(), [fetchAllFromAPI]);

  /* ── 認証 ── */
  const [currentUserId, setCurrentUserId] = useState(() => authLoad());

  const login = useCallback((userId, pw) => {
    const m = members.find(m => m.id === userId && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setPeriodType("month");
    setActiveTab("マイ");
    setActiveView("summary");
    if (pw === "1111") setShowPwPrompt(true);
    const unnotified = requests.filter(r => r.user === m.name && r.status === "対応済" && !r.notified);
    if (unnotified.length > 0) setRequestNotifs(unnotified);

    /* ── ログイン数カウント ── */
    setLoginCounts(prev => {
      const entry = prev[m.id] || { count: 0 };
      const next  = { ...prev, [m.id]: { count: (entry.count || 0) + 1, lastLogin: new Date().toISOString() } };
      loginCountsRef.current = next;
      if (apiLoadedRef.current) {
        apiSet("user_settings", {
          ...userSettingsRef.current,
          __panelTasks:   panelTasksRef.current,
          __loginCounts:  next,
        }).catch(console.error);
      }
      return next;
    });

    return true;
  }, [members, requests]);

  const loginByName = useCallback((name, pw) => {
    const m = members.find(m => m.name === name && m.pw === pw && m.status === "active");
    if (!m) return false;
    authSave(m.id);
    setCurrentUserId(m.id);
    return true;
  }, [members]);

  const logout = useCallback(() => { authClear(); setCurrentUserId(null); }, []);

  const currentUser = members.find(m => m.id === currentUserId) ?? null;

  /* ── UI 状態 ── */
  const [activeTab,    setActiveTab]    = useState("マイ");
  const [activeView,   setActiveView]   = useState("summary");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showNewDeal,  setShowNewDeal]  = useState(false);
  const [editingDeal,  setEditingDeal]  = useState(null);
  const [showPwPrompt, setShowPwPrompt] = useState(false);

  /* toggleLike は currentUser.name に依存 → ここで bind */
  const currentUserName = currentUser?.name || "";
  const toggleLikeBound = useCallback((id) => {
    if (!currentUserName) return;
    setRequests(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const likes = r.likes ?? [];
        return { ...r, likes: likes.includes(currentUserName) ? likes.filter(n => n !== currentUserName) : [...likes, currentUserName] };
      });
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, [currentUserName]);

  const addRequestBound = useCallback((content, requester) => {
    const req = {
      id: `req_${Date.now()}`,
      user: requester || currentUserName || "",
      content,
      status: "未対応",
      notified: false,
      likes: [],
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => {
      const next = [req, ...prev];
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
  }, [currentUserName]);

  const dismissAllNotifsBound = useCallback(() => {
    const ids = requestNotifs.map(r => r.id);
    setRequests(prev => {
      const next = prev.map(r => ids.includes(r.id) ? { ...r, notified: true } : r);
      if (apiLoadedRef.current) apiSet("requests", next).catch(console.error);
      return next;
    });
    setRequestNotifs([]);
  }, [requestNotifs]);

  return (
    <AppContext.Provider value={{
      /* auth */
      currentUserId, currentUser, login, loginByName, logout,
      /* members */
      members, updateMember, addMember, deleteMember, replaceMembers,
      /* deals */
      deals, addDeal, updateDeal, deleteDeal,
      addActivity, deleteActivity, updateActivity,
      replaceDeals, importDeals,
      /* tasks */
      tasks, addTask, updateTask, deleteTask, toggleTask,
      generateMonthlyCheckTasks,
      /* notifLogs */
      notifLogs, addNotifLog, markNotifRead, markAllNotifsRead, clearNotifLogs,
      /* userSettings */
      userSettings, getMyNotifSettings, updateMyNotifSettings,
      /* loginCounts */
      loginCounts,
      /* requests */
      requests,
      addRequest: addRequestBound,
      resolveRequest,
      toggleLike: toggleLikeBound,
      deleteRequest,
      markRequestNotified,
      requestNotifs,
      dismissAllNotifs: dismissAllNotifsBound,
      /* logo */
      logoDataUrl, saveLogo,
      /* pw prompt */
      showPwPrompt, setShowPwPrompt,
      /* period */
      currentYear, setCurrentYear,
      currentMonth, setCurrentMonth,
      periodType, setPeriodType,
      currentPeriod, activePeriods,
      /* 月末処理 */
      monthEndChecks, setMonthEndCheck,
      panelTasks, setPanelTasks,
      /* network — 403遮断ステート */
      networkBlocked, apiChecking, lastUpdatedAt,
      /* refresh */
      refreshData, fetchAllFromAPI,
      /* ui */
      activeTab, setActiveTab,
      activeView, setActiveView,
      searchQuery, setSearchQuery,
      showNewDeal, setShowNewDeal,
      editingDeal, setEditingDeal,
    }}>
      {children}
    </AppContext.Provider>
  );
};

/* useApp は contexts/useApp.js からインポートしてください */
