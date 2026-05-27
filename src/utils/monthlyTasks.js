/**
 * monthlyTasks.js
 * 月末処理チェックリスト 自動生成ユーティリティ
 */

/* ── 日付フォーマット "YYYY-MM-DD" ── */
function fmt(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * 対象月の最終営業日（土日のみ考慮）
 * @param {number} year
 * @param {number} month  1-indexed
 */
export function getLastBizDay(year, month) {
  const d = new Date(year, month, 0); // 月末
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

/** N 営業日前（土日スキップ） */
function subBizDays(date, n) {
  const d = new Date(date);
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) c++;
  }
  return d;
}

/** N 暦日前（土日に当たったら前の金曜へ） */
function subCalDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

/* ── タスク定義テンプレート ── */
const TASK_DEFS = (lastBiz) => [
  {
    idx:      1,
    title:    "前月・先々月受注案件の請求書リマインド",
    dueDate:  fmt(subBizDays(lastBiz, 5)),
    dueTime:  "",
    category: "社内確認",
    priority: "high",
  },
  {
    idx:      2,
    title:    "リモア登録",
    dueDate:  fmt(subCalDays(lastBiz, 3)),
    dueTime:  "",
    category: "SF申請",
    priority: "medium",
  },
  {
    idx:      3,
    title:    "今月回収案件の役務提供",
    dueDate:  fmt(lastBiz),
    dueTime:  "",
    category: "社内確認",
    priority: "high",
  },
  {
    idx:      4,
    title:    "先月・先々月の入金確認",
    dueDate:  fmt(lastBiz),
    dueTime:  "",
    category: "社内確認",
    priority: "high",
  },
  {
    idx:      5,
    title:    "経費精算",
    dueDate:  fmt(lastBiz),
    dueTime:  "",
    category: "社内確認",
    priority: "medium",
  },
  {
    idx:      6,
    title:    "勤怠申請",
    dueDate:  fmt(lastBiz),
    dueTime:  "18:55",
    category: "社内確認",
    priority: "high",
    /* ★ 18:55 デスクトップ通知フラグ */
    isKintaiTask: true,
  },
];

/**
 * 月末処理タスクを全メンバー分生成して返す
 *
 * @param {number}   year
 * @param {number}   month         1-indexed
 * @param {string[]} memberNames   対象メンバー名配列
 * @returns {object[]}            新規タスク配列（既存チェックは呼び出し元で行う）
 */
export function buildMonthlyTasks(year, month, memberNames) {
  const ym      = `${year}-${String(month).padStart(2, "0")}`;
  const lastBiz = getLastBizDay(year, month);
  const defs    = TASK_DEFS(lastBiz);
  const now     = new Date().toISOString();

  const tasks = [];
  memberNames.forEach((name) => {
    defs.forEach((def) => {
      tasks.push({
        id:            `monthly_${ym}_${name}_${def.idx}`,
        title:         def.title,
        dueDate:       def.dueDate,
        dueTime:       def.dueTime,
        assignee:      name,
        createdBy:     "自動生成",
        priority:      def.priority,
        category:      def.category,
        note:          `${year}年${month}月 月末処理`,
        completed:     false,
        completedAt:   null,
        createdAt:     now,
        isMonthlyTask: true,
        isKintaiTask:  def.isKintaiTask || false,
        monthlyKey:    ym,
      });
    });
  });

  return tasks;
}

/** 対象月の月末処理タスクがすでに存在するかチェック */
export function hasMonthlyTasks(existingTasks, year, month) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  return existingTasks.some((t) => t.monthlyKey === ym && t.isMonthlyTask);
}
