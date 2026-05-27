/**
 * MonthEndPanel.jsx
 * 月末処理チェックリスト — 独立した常設UI
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, CheckCircle2, AlertTriangle, ClipboardList, ChevronRight,
} from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { DEFAULT_PANEL_TASKS } from "../contexts/AppContext.jsx";
import { getLastBizDay } from "../utils/monthlyTasks.js";
import { launchConfetti, showNiceJob } from "../utils/confetti.js";

const DOW = ["日","月","火","水","木","金","土"];
function fmtDate(d) {
  return `${d.getMonth()+1}/${d.getDate()}(${DOW[d.getDay()]})`;
}

/** タスク個別の締切日を計算する（lastBizDay - daysBefore日） */
function getTaskDueDate(task, lastBizDay) {
  const date = new Date(lastBizDay);
  date.setDate(date.getDate() - (task.daysBefore ?? 0));
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 今日がタスクの締切日以降かどうか（アラート表示判定） */
function isTaskCurrentlyDue(task, lastBizDay) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return today >= getTaskDueDate(task, lastBizDay);
}

/* ── バナー（layout-flow内に置かれる） ── */
export function MonthEndBanner({ daysToEnd, incomplete, doneCount, totalCount, lastBizDay, onOpen }) {
  return (
    <div
      className="flex items-center gap-3 px-4 sm:px-6 py-2 shrink-0"
      style={{
        background: "linear-gradient(90deg,#b91c1c 0%,#c2410c 100%)",
        boxShadow: "0 2px 8px -2px rgba(185,28,28,.5)",
      }}
    >
      <AlertTriangle size={13} className="text-white shrink-0" />
      <p className="text-[11px] font-bold text-white flex-1 leading-tight">
        ⚠️ 月末処理に未完了&nbsp;
        <span className="font-black text-yellow-300">{incomplete}件</span>
        &nbsp;— 最終営業日&nbsp;{fmtDate(lastBizDay)}&nbsp;
        {daysToEnd <= 0
          ? <span className="font-black text-yellow-200">（本日！）</span>
          : <span>まであと <span className="font-black text-yellow-200">{daysToEnd}日</span></span>
        }
      </p>
      {/* 進捗ゲージ */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <div className="w-20 h-2 bg-white/25 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
              background: doneCount === totalCount ? "#4ade80" : "#fde68a",
            }}
          />
        </div>
        <span className="text-[10px] font-black text-white/90 whitespace-nowrap">
          {doneCount}/{totalCount}
        </span>
      </div>
      <button
        onClick={onOpen}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold text-white transition-colors whitespace-nowrap"
      >
        確認 <ChevronRight size={10} />
      </button>
    </div>
  );
}

/* ── メインコンポーネント ── */
export default function MonthEndPanel() {
  const {
    currentUser, currentUserId,
    currentYear, currentMonth,
    monthEndChecks, setMonthEndCheck,
    panelTasks,
  } = useApp();

  const [open,        setOpen]        = useState(false);
  const [showStartup, setShowStartup] = useState(false);

  const myName = currentUser?.name || "";

  /* 選択中の年月を数値に変換 */
  const month = useMemo(() => {
    if (!currentMonth) return new Date().getMonth() + 1;
    if (typeof currentMonth === "number") return currentMonth;
    const s = String(currentMonth);
    return parseInt(s.includes("-") ? s.split("-")[1] : s, 10);
  }, [currentMonth]);

  const year = currentYear || new Date().getFullYear();
  const ym   = `${year}-${String(month).padStart(2, "0")}`;

  /* 最終営業日 & 残日数 */
  const lastBizDay = useMemo(() => getLastBizDay(year, month), [year, month]);

  const daysToEnd = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end   = new Date(lastBizDay); end.setHours(0, 0, 0, 0);
    return Math.round((end - today) / 86400000);
  }, [lastBizDay]);

  const isWarningZone = daysToEnd >= 0 && daysToEnd <= 3;
  const isPastDue     = daysToEnd < 0 && daysToEnd >= -5;

  const tasks = panelTasks || DEFAULT_PANEL_TASKS;

  /* チェック状態（taskId → boolean, 旧フォーマット自動移行） */
  const checksObj = useMemo(() => {
    if (!currentUserId) return {};
    const raw = monthEndChecks?.[`${currentUserId}_${ym}`];
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const obj = {};
      tasks.forEach((t, i) => { if (raw[i]) obj[t.id] = true; });
      return obj;
    }
    return raw;
  }, [monthEndChecks, currentUserId, ym, tasks]);

  const doneCount  = tasks.filter(t => !!checksObj[t.id]).length;
  const totalCount = tasks.length;
  const allDone    = doneCount === totalCount;
  const incomplete = totalCount - doneCount;
  const activeWarn = (isWarningZone || isPastDue) && !allDone && !!currentUserId;

  /* 今日時点で締切を迎えているタスク（未完了のもの）*/
  const dueTodayIncomplete = useMemo(() =>
    tasks.filter(t => !checksObj[t.id] && isTaskCurrentlyDue(t, lastBizDay)),
    [tasks, checksObj, lastBizDay]
  );

  /* 起動時モーダル — セッション内1回だけ（当日期限のものがある場合のみ） */
  useEffect(() => {
    if (!activeWarn || !currentUserId) return;
    if (dueTodayIncomplete.length === 0) return; // 今日期限のものがなければ表示しない
    const key = `mep_${currentUserId}_${ym}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const t = setTimeout(() => setShowStartup(true), 1000);
    return () => clearTimeout(t);
  }, [activeWarn, currentUserId, ym, dueTodayIncomplete.length]);

  /* チェックトグル */
  const handleCheck = useCallback((taskId, e) => {
    if (!currentUserId) return;
    const newVal = !checksObj[taskId];
    setMonthEndCheck(currentUserId, ym, taskId, newVal);
    if (newVal) {
      const rect = e.currentTarget.getBoundingClientRect();
      launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      showNiceJob();
    }
  }, [currentUserId, ym, checksObj, setMonthEndCheck]);

  if (!currentUserId) return null;

  /* ── 右端フローティングタブ ── */
  const tab = (
    <button
      id="month-end-tab-btn"
      onClick={() => setOpen(o => !o)}
      className="fixed z-[60] flex flex-col items-center justify-center gap-1 px-2 py-5 rounded-l-xl text-white transition-all shadow-xl hover:shadow-2xl"
      style={{
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        background: activeWarn
          ? "linear-gradient(180deg,#dc2626 0%,#ea580c 100%)"
          : "#0070d2",
        animation: activeWarn ? "pulseTab 2.5s ease-in-out infinite" : "none",
      }}
      title="月末処理チェックリスト"
    >
      {activeWarn && (
        <span
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-yellow-400 text-slate-900 text-[9px] font-black flex items-center justify-center shadow"
          style={{ writingMode: "horizontal-tb" }}
        >
          {incomplete}
        </span>
      )}
      <ClipboardList size={14} />
      <span style={{
        writingMode: "vertical-rl",
        fontSize: "9px",
        fontWeight: 900,
        letterSpacing: "0.08em",
        marginTop: 2,
      }}>
        月末処理
      </span>
    </button>
  );

  /* ── スライドパネル本体 ── */
  const panel = open && createPortal(
    <div
      className="fixed inset-0 z-[75] flex justify-end"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-[360px] bg-white h-full flex flex-col shadow-2xl"
        onMouseDown={e => e.stopPropagation()}
        style={{
          borderLeft: `3px solid ${activeWarn ? "#dc2626" : "#0070d2"}`,
          animation: "slideInRight .22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* ヘッダー */}
        <div
          className="px-5 py-4 flex items-center gap-3 shrink-0"
          style={{
            background: activeWarn ? "#fef2f2" : "#eff6ff",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: activeWarn ? "#fee2e2" : "#dbeafe" }}
          >
            <ClipboardList size={18} style={{ color: activeWarn ? "#dc2626" : "#0070d2" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black" style={{ color: activeWarn ? "#dc2626" : "#1e40af" }}>
              月末処理チェックリスト
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {year}年{month}月 / 最終営業日 {fmtDate(lastBizDay)}
            </p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* ステータスバー */}
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #f1f5f9" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">{myName} さんの進捗</span>
            <span className="text-[12px] font-black" style={{ color: allDone ? "#059669" : activeWarn ? "#dc2626" : "#0070d2" }}>
              {doneCount} / {totalCount} 完了
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(doneCount / totalCount) * 100}%`,
                background: allDone
                  ? "linear-gradient(90deg,#059669,#10b981)"
                  : activeWarn
                    ? "linear-gradient(90deg,#dc2626,#ea580c)"
                    : "linear-gradient(90deg,#0070d2,#2563eb)",
              }}
            />
          </div>
          {activeWarn && !allDone && (
            <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={10} />
              {daysToEnd <= 0
                ? "本日が最終営業日です！"
                : `残り ${daysToEnd}日 — 未完了 ${incomplete}件`
              }
            </p>
          )}
        </div>

        {/* チェックリスト */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {tasks.map((task) => {
            const done = !!checksObj[task.id];
            const isDue = isTaskCurrentlyDue(task, lastBizDay);
            const dueDate = getTaskDueDate(task, lastBizDay);
            return (
              <button
                key={task.id}
                onClick={e => handleCheck(task.id, e)}
                className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all active:scale-[0.98]
                  ${done
                    ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                    : isDue && activeWarn
                      ? "bg-red-50/40 border-red-200 hover:border-red-400 hover:bg-red-50/70"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
              >
                <div
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 mt-0.5 transition-all
                    ${done
                      ? "bg-emerald-400 border-emerald-400"
                      : isDue && activeWarn ? "border-red-300" : "border-slate-300"
                    }`}
                >
                  {done && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-bold leading-snug
                    ${done ? "line-through text-slate-400" : "text-slate-800"}`}>
                    {task.emoji} {task.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${done ? "text-slate-300" : isDue ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                    {task.when}
                    {!done && !isDue && (
                      <span className="ml-1 text-slate-300">
                        （{fmtDate(dueDate)}〜）
                      </span>
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* フッター */}
        <div className="px-4 pb-5 pt-2 shrink-0">
          {allDone ? (
            <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[14px] font-black text-emerald-600">🎉 全項目完了！</p>
              <p className="text-[11px] text-emerald-500 mt-0.5">お疲れ様でした！</p>
            </div>
          ) : (
            <p className="text-[9px] text-slate-300 text-center">
              項目をタップしてチェック / {year}年{month}月月末処理
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  /* ── 起動時警告モーダル（当日期限タスクのみ表示） ── */
  const startupModal = showStartup && dueTodayIncomplete.length > 0 && createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg,#dc2626 0%,#ea580c 100%)" }}
        >
          <AlertTriangle size={22} className="text-white shrink-0" />
          <p className="text-[14px] font-black text-white leading-snug">
            月末処理の期限が迫っています
          </p>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-[12px] text-slate-700 leading-relaxed">
            <span className="font-bold text-red-600">{myName} さん</span>、
            本日締切の月末処理が
            <span className="font-black text-red-600"> {dueTodayIncomplete.length} 件</span>
            未完了です。
          </p>
          <p className="text-[12px] text-slate-600 leading-relaxed">
            最終営業日 <span className="font-bold">{fmtDate(lastBizDay)}</span> までに
            必ず処理してください。
          </p>

          {/* 当日期限の未完了リストのみ */}
          <div className="bg-red-50 rounded-xl px-3 py-2.5 space-y-1.5">
            {dueTodayIncomplete.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <span className="text-[11px] font-semibold text-red-700">{t.emoji} {t.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={() => { setShowStartup(false); setOpen(true); }}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-black text-white hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg,#dc2626,#ea580c)" }}
          >
            今すぐ確認する
          </button>
          <button
            onClick={() => setShowStartup(false)}
            className="px-4 py-2.5 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            後で
          </button>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {tab}
      {panel}
      {startupModal}
    </>
  );
}

/* ── バナー表示に必要な計算値を提供するカスタムフック ── */
export function useMonthEndWarning() {
  const { currentUserId, currentYear, currentMonth, monthEndChecks, panelTasks } = useApp();

  const month = useMemo(() => {
    if (!currentMonth) return new Date().getMonth() + 1;
    if (typeof currentMonth === "number") return currentMonth;
    const s = String(currentMonth);
    return parseInt(s.includes("-") ? s.split("-")[1] : s, 10);
  }, [currentMonth]);

  const year       = currentYear || new Date().getFullYear();
  const ym         = `${year}-${String(month).padStart(2, "0")}`;
  const lastBizDay = useMemo(() => getLastBizDay(year, month), [year, month]);

  const daysToEnd = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const end   = new Date(lastBizDay); end.setHours(0,0,0,0);
    return Math.round((end - today) / 86400000);
  }, [lastBizDay]);

  const tasks = panelTasks || DEFAULT_PANEL_TASKS;

  const checksObj = useMemo(() => {
    if (!currentUserId) return {};
    const raw = monthEndChecks?.[`${currentUserId}_${ym}`];
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const obj = {};
      tasks.forEach((t, i) => { if (raw[i]) obj[t.id] = true; });
      return obj;
    }
    return raw;
  }, [monthEndChecks, currentUserId, ym, tasks]);

  const doneCount  = tasks.filter(t => !!checksObj[t.id]).length;
  const totalCount = tasks.length;
  const incomplete = totalCount - doneCount;
  const allDone    = incomplete === 0;
  const activeWarn = (daysToEnd >= 0 && daysToEnd <= 3 || daysToEnd < 0 && daysToEnd >= -5)
    && !allDone && !!currentUserId;

  return { activeWarn, daysToEnd, incomplete, doneCount, totalCount, lastBizDay };
}
