import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { fmtAmt } from "../../utils/index.js";
import { TODAY_PERIOD } from "../../contexts/AppContext.jsx";
import DealDetailModal from "../DealDetailModal.jsx";
import { TeamBadge, PlanBadge } from "../ui/Badges.jsx";

/* ── 確度別スタイル ── */
const CONF_STYLE = {
  "回収": { bg: "#f0fdf4", border: "#22c55e", label: "#15803d", dot: "#16a34a" },
  "70%":  { bg: "#fffbeb", border: "#f59e0b", label: "#b45309", dot: "#d97706" },
  "50%":  { bg: "#eff6ff", border: "#60a5fa", label: "#1d4ed8", dot: "#2563eb" },
  "30%":  { bg: "#f8fafc", border: "#cbd5e1", label: "#475569", dot: "#94a3b8" },
};
const CONF_ORDER = ["回収", "70%", "50%", "30%"];

/* ── ユーティリティ ── */
function addMonths(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtYM(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function getDaysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function getFirstDayOfWeek(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).getDay();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function dayStr(ym, day) {
  const [y, m] = ym.split("-");
  return `${y}-${m}-${String(day).padStart(2,"0")}`;
}

/* ── 日別ポップオーバー ── */
function DayModal({ day, ym, deals, onClose, onSelectDeal }) {
  const ds = dayStr(ym, day);
  const today = todayStr();
  const isPast = ds < today;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-black text-slate-800">
              {fmtYM(ym)} {day}日 — {deals.length}件
            </p>
            {isPast && <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠ 過去のNA日（未対応の可能性あり）</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {deals.map(d => {
            const s = CONF_STYLE[d.confidence] || CONF_STYLE["30%"];
            return (
              <button
                key={d.id}
                onClick={() => { onClose(); onSelectDeal(d); }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:brightness-95"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate">{d.company}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: s.border + "33", color: s.label }}>{d.confidence}</span>
                    <TeamBadge team={d.team} />
                    {d.plan && <PlanBadge plan={d.plan} />}
                  </div>
                </div>
                <span className="text-sm font-black shrink-0" style={{ color: s.label }}>{fmtAmt(d.amount)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── カレンダーグリッド ── */
function MonthGrid({ ym, dealsByDay, onDayClick }) {
  const days = getDaysInMonth(ym);
  const firstDow = getFirstDayOfWeek(ym);
  const today = todayStr();
  const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKS.map((w, i) => (
          <div key={w} className={`py-2 text-center text-[11px] font-black tracking-wide
            ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="min-h-[84px] border-b border-r border-slate-50 bg-slate-50/40" />;
          const ds = dealsByDay[day] || [];
          const isToday = dayStr(ym, day) === today;
          const isPast  = dayStr(ym, day) < today;
          const hasOverdue = isPast && ds.length > 0;
          const dow = (firstDow + day - 1) % 7;
          return (
            <div
              key={day}
              onClick={() => ds.length > 0 && onDayClick(day, ds)}
              className={`min-h-[84px] p-1.5 border-b border-r border-slate-50 transition-colors
                ${ds.length > 0 ? "cursor-pointer hover:bg-slate-50" : ""}
                ${hasOverdue ? "bg-red-50/40" : ""}
              `}
            >
              <div className="flex items-center gap-0.5 mb-1">
                <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-[#0070d2] text-white" : dow === 0 ? "text-rose-400" : dow === 6 ? "text-blue-400" : "text-slate-500"}`}>
                  {day}
                </span>
                {hasOverdue && <AlertCircle size={10} className="text-red-400" />}
              </div>
              <div className="space-y-0.5">
                {ds.slice(0, 3).map(d => {
                  const s = CONF_STYLE[d.confidence] || CONF_STYLE["30%"];
                  return (
                    <div key={d.id}
                      className="text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight"
                      style={{ background: s.bg, color: s.label, borderLeft: `2px solid ${s.border}` }}>
                      {d.company}
                    </div>
                  );
                })}
                {ds.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-semibold text-center">+{ds.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── メイン ── */
export default function CalendarView() {
  const { deals } = useApp();
  const [currentYm, setCurrentYm] = useState(TODAY_PERIOD);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dayModal, setDayModal] = useState(null);

  const today = todayStr();

  /* NA日がある案件（失注除く） */
  const allNADeals = useMemo(() =>
    deals.filter(d => d.nextActionDate && d.phase !== "失注"),
  [deals]);

  /* 今月のNA日を持つ案件 */
  const monthDeals = useMemo(() =>
    allNADeals.filter(d => d.nextActionDate.startsWith(currentYm)),
  [allNADeals, currentYm]);

  /* 期限切れNA（今日より前でNA日がある） */
  const overdueDeals = useMemo(() =>
    allNADeals.filter(d => d.nextActionDate < today),
  [allNADeals, today]);

  /* NA日なし案件 */
  const noNADeals = useMemo(() =>
    deals.filter(d => !d.nextActionDate && d.phase !== "失注" && d.confidence !== "回収"),
  [deals]);

  /* 日別マップ */
  const dealsByDay = useMemo(() => {
    const map = {};
    monthDeals.forEach(d => {
      const day = parseInt(d.nextActionDate.slice(8), 10);
      if (!map[day]) map[day] = [];
      map[day].push(d);
    });
    return map;
  }, [monthDeals]);

  /* 今月の確度別集計 */
  const summary = useMemo(() => {
    const s = {};
    CONF_ORDER.forEach(c => {
      const ds = monthDeals.filter(d => d.confidence === c);
      s[c] = { count: ds.length, amount: ds.reduce((a, d) => a + (d.amount || 0), 0) };
    });
    return s;
  }, [monthDeals]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

      {/* ── 期限切れ警告バナー ── */}
      {overdueDeals.length > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-[12px] font-bold text-red-600">
            NAが過ぎている案件が <span className="text-base">{overdueDeals.length}</span> 件あります
          </p>
          <div className="flex gap-1.5 ml-2 flex-wrap">
            {overdueDeals.slice(0, 5).map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDeal(d)}
                className="text-[10px] font-bold text-red-600 bg-red-100 hover:bg-red-200 border border-red-200 rounded-lg px-2 py-0.5 transition-colors"
              >
                {d.company}
              </button>
            ))}
            {overdueDeals.length > 5 && (
              <span className="text-[10px] text-red-400">+{overdueDeals.length - 5}件</span>
            )}
          </div>
        </div>
      )}

      {/* ── 月ナビ ── */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentYm(ym => addMonths(ym, -1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays size={16} className="text-[#0070d2]" />
            <h2 className="text-lg font-black text-slate-800">{fmtYM(currentYm)}</h2>
            {currentYm === TODAY_PERIOD && (
              <span className="text-[10px] font-black text-white bg-[#0070d2] rounded-full px-2 py-0.5">今月</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">NA日設定 {monthDeals.length}件</p>
        </div>
        <button onClick={() => setCurrentYm(ym => addMonths(ym, 1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── 確度別サマリー ── */}
      {monthDeals.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CONF_ORDER.map(c => {
            const { count, amount } = summary[c];
            const s = CONF_STYLE[c];
            return count > 0 ? (
              <div key={c} className="rounded-xl px-3 py-2.5 text-center"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <p className="text-[10px] font-black mb-0.5" style={{ color: s.label }}>{c}</p>
                <p className="text-base font-black tabular" style={{ color: s.dot }}>{fmtAmt(amount)}</p>
                <p className="text-[10px] text-slate-400 tabular">{count}件</p>
              </div>
            ) : (
              <div key={c} className="rounded-xl px-3 py-2.5 text-center bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-300 mb-0.5">{c}</p>
                <p className="text-sm text-slate-200 font-bold">—</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── カレンダーグリッド ── */}
      <MonthGrid ym={currentYm} dealsByDay={dealsByDay} onDayClick={(day, ds) => setDayModal({ day, deals: ds })} />

      {monthDeals.length === 0 && (
        <div className="text-center py-10">
          <CalendarDays size={32} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">この月にNA日が設定された案件はありません</p>
          <p className="text-[11px] text-slate-300 mt-1">案件の編集からNA日を設定してください</p>
        </div>
      )}

      {/* ── NA日なし案件 ── */}
      {noNADeals.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
            📋 NA日未設定の案件 ({noNADeals.length}件)
          </p>
          <div className="space-y-1.5">
            {noNADeals
              .sort((a, b) => (b.amount || 0) - (a.amount || 0))
              .map(d => {
                const s = CONF_STYLE[d.confidence] || CONF_STYLE["30%"];
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeal(d)}
                    className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white card-shadow hover:brightness-95 transition-all"
                    style={{ borderLeft: `3px solid ${s.border}` }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-700 truncate">{d.company}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: s.border + "22", color: s.label }}>{d.confidence}</span>
                        <TeamBadge team={d.team} />
                      </div>
                    </div>
                    <span className="text-sm font-black tabular shrink-0" style={{ color: s.label }}>{fmtAmt(d.amount)}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* 日別ポップアップ */}
      {dayModal && (
        <DayModal
          day={dayModal.day}
          ym={currentYm}
          deals={dayModal.deals}
          onClose={() => setDayModal(null)}
          onSelectDeal={d => setSelectedDeal(d)}
        />
      )}

      {/* 案件詳細モーダル */}
      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
}
