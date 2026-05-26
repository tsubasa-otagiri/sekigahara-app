import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
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

function fmtMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function getDaysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function getFirstDayOfWeek(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).getDay(); // 0=Sun
}

/* ── カレンダーグリッド ── */
function MonthGrid({ ym, dealsByDay, onDayClick }) {
  const days = getDaysInMonth(ym);
  const firstDow = getFirstDayOfWeek(ym);
  const [y, m] = ym.split("-").map(Number);
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;

  const cells = [];
  // 空白セル
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKS.map((w, i) => (
          <div
            key={w}
            className={`py-2 text-center text-[11px] font-black tracking-wide
              ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日セル */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`e-${idx}`} className="min-h-[80px] border-b border-r border-slate-50" />;
          }
          const dayStr = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const ds = dealsByDay[day] || [];
          const isToday = dayStr === todayStr;
          const dow = (firstDow + day - 1) % 7;
          return (
            <div
              key={day}
              onClick={() => ds.length > 0 && onDayClick(day, ds)}
              className={`min-h-[80px] p-1.5 border-b border-r border-slate-50 transition-colors
                ${ds.length > 0 ? "cursor-pointer hover:bg-slate-50" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-[#0070d2] text-white" : dow === 0 ? "text-rose-400" : dow === 6 ? "text-blue-400" : "text-slate-500"}
                  `}
                >
                  {day}
                </span>
              </div>
              <div className="space-y-0.5">
                {ds.slice(0, 3).map(d => {
                  const s = CONF_STYLE[d.confidence] || CONF_STYLE["30%"];
                  return (
                    <div
                      key={d.id}
                      className="text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight"
                      style={{ background: s.bg, color: s.label, borderLeft: `2px solid ${s.border}` }}
                    >
                      {d.company}
                    </div>
                  );
                })}
                {ds.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-semibold text-center">+{ds.length - 3}件</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 日別案件ポップオーバー ── */
function DayModal({ day, deals, ym, onClose, onSelectDeal }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-sm font-black text-slate-800">
            {fmtMonth(ym).replace("年","年")} {day}日 — {deals.length}件
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
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
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: s.border + "22", color: s.label }}>
                      {d.confidence}
                    </span>
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

/* ── メイン ── */
export default function CalendarView() {
  const { deals, activePeriods } = useApp();
  const [currentYm, setCurrentYm] = useState(TODAY_PERIOD);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [dayModal, setDayModal] = useState(null); // { day, deals }

  /* 対象月の案件（失注除く） */
  const monthDeals = useMemo(() =>
    deals.filter(d => d.period === currentYm && d.phase !== "失注"),
  [deals, currentYm]);

  /* 案件を日付に分散配置（dealに day フィールドがない → 確度ごとに月末側に分散）
     受注予定日フィールドがないので、idベースで月内の日に分散させる */
  const dealsByDay = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYm);
    const map = {};
    monthDeals.forEach(d => {
      /* 案件IDを使って月内の日をハッシュ的に決定（固定・見やすい分散） */
      const rawId = typeof d.id === "number" ? d.id : parseInt(d.id, 36) || 1;
      /* 確度別に後半に寄せる: 回収→末5日, 70%→21-25, 50%→11-20, 30%→1-10 */
      let dayBase, range;
      if (d.confidence === "回収")     { dayBase = daysInMonth - 4; range = 5; }
      else if (d.confidence === "70%") { dayBase = 21; range = 5; }
      else if (d.confidence === "50%") { dayBase = 11; range = 10; }
      else                             { dayBase = 1;  range = 10; }
      const day = Math.min(dayBase + (rawId % range), daysInMonth);
      if (!map[day]) map[day] = [];
      map[day].push(d);
    });
    return map;
  }, [monthDeals, currentYm]);

  /* 確度別集計 */
  const summary = useMemo(() => {
    const s = {};
    CONF_ORDER.forEach(c => {
      const ds = monthDeals.filter(d => d.confidence === c);
      s[c] = { count: ds.length, amount: ds.reduce((a, d) => a + (d.amount || 0), 0) };
    });
    return s;
  }, [monthDeals]);

  const totalAmount = monthDeals.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

      {/* ── 月ナビ ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentYm(ym => addMonths(ym, -1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <CalendarDays size={16} className="text-[#0070d2]" />
            <h2 className="text-lg font-black text-slate-800">{fmtMonth(currentYm)}</h2>
            {currentYm === TODAY_PERIOD && (
              <span className="text-[10px] font-black text-white bg-[#0070d2] rounded-full px-2 py-0.5">今月</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{monthDeals.length}件　合計 <span className="font-black text-slate-600">{fmtAmt(totalAmount)}</span></p>
        </div>

        <button
          onClick={() => setCurrentYm(ym => addMonths(ym, 1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-700"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── 確度別サマリー ── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {CONF_ORDER.map(c => {
          const { count, amount } = summary[c];
          const s = CONF_STYLE[c];
          return (
            <div key={c} className="rounded-xl px-3 py-2.5 text-center"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <p className="text-[10px] font-black mb-0.5" style={{ color: s.label }}>{c}</p>
              <p className="text-base font-black tabular" style={{ color: s.dot }}>{fmtAmt(amount)}</p>
              <p className="text-[10px] text-slate-400 tabular">{count}件</p>
            </div>
          );
        })}
      </div>

      {/* ── カレンダーグリッド ── */}
      {monthDeals.length === 0 ? (
        <div className="bg-white rounded-2xl card-shadow py-20 text-center">
          <CalendarDays size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">この月の案件はありません</p>
        </div>
      ) : (
        <MonthGrid
          ym={currentYm}
          dealsByDay={dealsByDay}
          onDayClick={(day, ds) => setDayModal({ day, deals: ds })}
        />
      )}

      {/* ── 月内案件リスト ── */}
      {monthDeals.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">案件一覧</p>
          {CONF_ORDER.flatMap(c =>
            monthDeals
              .filter(d => d.confidence === c)
              .sort((a, b) => (b.amount || 0) - (a.amount || 0))
              .map(d => {
                const s = CONF_STYLE[c];
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeal(d)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white card-shadow hover:brightness-95 transition-all"
                    style={{ borderLeft: `3px solid ${s.border}` }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{d.company}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: s.border + "22", color: s.label }}>
                          {d.confidence}
                        </span>
                        <TeamBadge team={d.team} />
                        {d.plan && <PlanBadge plan={d.plan} />}
                        {d.is && <span className="text-[10px] text-cyan-600 font-semibold">IS {d.is}</span>}
                        {d.fs && <span className="text-[10px] text-emerald-600 font-semibold">FS {d.fs}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black tabular" style={{ color: s.label }}>{fmtAmt(d.amount)}</p>
                      {d.phase && <p className="text-[10px] text-slate-400 mt-0.5">{d.phase}</p>}
                    </div>
                  </button>
                );
              })
          )}
        </div>
      )}

      {/* 日別ポップアップ */}
      {dayModal && (
        <DayModal
          day={dayModal.day}
          deals={dayModal.deals}
          ym={currentYm}
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
