export const REAL_TEAMS = ["杉山T", "鈴木T", "中村T", "渡部T"];
export const ALL_TABS   = ["全体", "杉山T", "鈴木T", "鈴木Tプレ", "中村T", "渡部T"];

/* ══════════════════════════════════════════════
   メンバー表示マスター順
   ドロップダウン・ランキング・分析画面の並び順を統一
   ※ 杉山（全社FS）は表示上「杉山T」グループに含める
══════════════════════════════════════════════ */
export const DISPLAY_GROUPS = [
  { label: "中村T", names: ["中村", "中", "櫻井", "青木"] },
  { label: "渡部T", names: ["渡部", "横井", "上浦", "太田"] },
  { label: "鈴木T", names: ["鈴木", "十文字", "井上"] },
  { label: "杉山T", names: ["杉山", "小田切", "早川", "早坂"] },
];
export const MEMBER_MASTER_NAMES = DISPLAY_GROUPS.flatMap(g => g.names);
export const CONF       = ["30%", "50%", "70%", "回収"];
export const PLANS      = ["MDC", "コンサル", "Dash!", "運用代行", "MDCスモール", "MDCスタンダード"];
export const PHASES     = [
  "未設定", "2nd", "デモ", "社内資料すり合わせ",
  "上長共有", "決済者商談予定", "決済者共有",
  "稟議中", "受注", "失注"
];
export const TEAMS_OPT  = ["杉山T", "鈴木T", "中村T", "渡部T", "全社FS"];
export const ROLE_OPT   = ["IS", "FS", "IS+FS"];
export const DEF_TGT    = 30;

/* チームカラー（hex） */
export const THEX = {
  "杉山T":    "#16a34a",
  "鈴木T":    "#7c3aed",
  "鈴木Tプレ":"#2563eb",
  "中村T":    "#dc2626",
  "渡部T":    "#ca8a04",
  "全社FS":   "#6b7280",
  "全体":     "#1e40af",
};

/* チームTailwindクラス */
export const TTW = {
  "杉山T":    { bg:"bg-green-100",  txt:"text-green-700",  bd:"border-green-300"  },
  "鈴木T":    { bg:"bg-purple-100", txt:"text-purple-700", bd:"border-purple-300" },
  "鈴木Tプレ":{ bg:"bg-blue-100",   txt:"text-blue-700",   bd:"border-blue-300"   },
  "中村T":    { bg:"bg-red-100",    txt:"text-red-700",    bd:"border-red-300"    },
  "渡部T":    { bg:"bg-yellow-100", txt:"text-yellow-700", bd:"border-yellow-300" },
  "全社FS":   { bg:"bg-gray-100",   txt:"text-gray-600",   bd:"border-gray-300"   },
  "全体":     { bg:"bg-blue-50",    txt:"text-blue-800",   bd:"border-blue-200"   },
};

/* 確度Tailwindクラス */
export const CTW = {
  "30%": { bg:"bg-amber-50",   txt:"text-amber-700",   bd:"border-amber-200",   dot:"bg-amber-400",   hd:"bg-amber-50"   },
  "50%": { bg:"bg-blue-50",    txt:"text-blue-700",    bd:"border-blue-200",    dot:"bg-blue-500",    hd:"bg-blue-50"    },
  "70%": { bg:"bg-emerald-50", txt:"text-emerald-700", bd:"border-emerald-200", dot:"bg-emerald-500", hd:"bg-emerald-50" },
  "回収": { bg:"bg-gray-50",   txt:"text-gray-600",    bd:"border-gray-200",    dot:"bg-gray-400",    hd:"bg-gray-50"    },
};

/* プランTailwindクラス */
export const PCL = {
  "MDC":            "bg-teal-50 text-teal-700 border-teal-200",
  "コンサル":        "bg-violet-50 text-violet-700 border-violet-200",
  "Dash!":           "bg-pink-50 text-pink-700 border-pink-200",
  "運用代行":        "bg-orange-50 text-orange-700 border-orange-200",
  /* 旧名称（既存データの互換維持） */
  "MDCスモール":     "bg-teal-50 text-teal-700 border-teal-200",
  "MDCスタンダード": "bg-teal-50 text-teal-700 border-teal-200",
};

/* メンバーバッジ背景色 */
export const MBGCOL = {
  admin:  "bg-purple-600",
  leader: "bg-orange-500",
  IS:     "bg-cyan-600",
  FS:     "bg-emerald-600",
};

/* ロール文字色 */
export const RCLS = {
  "IS+FS": "text-orange-500 font-bold",
  IS:      "text-cyan-600 font-bold",
  FS:      "text-emerald-600 font-bold",
  leader:  "text-orange-500 font-bold",
  admin:   "text-purple-600 font-bold",
};

export const PIE_COLORS = ["#fbbf24", "#60a5fa", "#34d399", "#9ca3af"];

/* LocalStorageキー — HONNOJI 統一名称 */
export const LS_KEYS = {
  AUTH:     "honnoji_auth",
  DEALS:    "honnoji_deals",
  MEMBERS:  "honnoji_members",
  TARGETS:  "honnoji_targets",
  REQUESTS: "honnoji_requests",
};

/* 認証有効時間（ミリ秒）: 24時間 */
export const AUTH_TTL = 24 * 60 * 60 * 1000;

/* ヨミ度 */
export const YOMI        = ["受注", "70%", "50%", "30%", "失注"];
export const YOMI_WEIGHT = { "受注":1.0, "70%":0.7, "50%":0.5, "30%":0.3, "失注":0 };
export const YOMI_COLOR  = {
  "受注":"#22c55e", "70%":"#0070d2", "50%":"#f59e0b",
  "30%":"#94a3b8", "失注":"#ef4444",
};
/* 失注要因 */
export const LOSS_REASONS   = ["価格負け","競合負け","時期尚早","要件不一致","その他"];
/* 活動履歴タイプ */
export const ACTIVITY_TYPES = ["商談","電話","メール","提案書提出","社内MTG","その他"];
/* 放置アラート日数 */
export const NEGLECT_DAYS   = 14;
