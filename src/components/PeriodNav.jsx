import { useApp } from "../contexts/useApp.js";

const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];
const QUARTERS = ["Q1","Q2","Q3","Q4"];
const Q_LABEL = { Q1:"Q1 (1-3月)", Q2:"Q2 (4-6月)", Q3:"Q3 (7-9月)", Q4:"Q4 (10-12月)" };
const SF = "#0070d2";

export default function PeriodNav() {
  const { currentYear, setCurrentYear, currentMonth, setCurrentMonth, periodType, setPeriodType } = useApp();

  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const selectMonth = (m) => { setCurrentMonth(m); setPeriodType("month"); };
  const selectQuarter = (q) => setPeriodType(q);

  const isMonthActive = (m) => periodType === "month" && currentMonth === m;
  const isQActive = (q) => periodType === q;

  return (
    <div className="bg-white" style={{ borderBottom: "1px solid #e2e8f0" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1.5">
          {/* 年 */}
          <select
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
            className="shrink-0 text-[11px] font-bold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 cursor-pointer appearance-none"
            style={{ color: SF }}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>

          {/* 仕切り */}
          <div className="w-px h-4 bg-gray-200 shrink-0" />

          {/* 月ボタン */}
          {MONTHS.map(m => (
            <button
              key={m}
              onClick={() => selectMonth(m)}
              className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-100"
              style={isMonthActive(m)
                ? { background: SF, color: "white", boxShadow: "0 1px 3px rgba(0,112,210,.3)" }
                : { color: "#64748b" }
              }
            >
              {m}月
            </button>
          ))}

          {/* 仕切り */}
          <div className="w-px h-4 bg-gray-200 shrink-0" />

          {/* Qボタン */}
          {QUARTERS.map(q => (
            <button
              key={q}
              onClick={() => selectQuarter(q)}
              title={Q_LABEL[q]}
              className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all duration-100"
              style={isQActive(q)
                ? { background: "#1e40af", color: "white", boxShadow: "0 1px 3px rgba(30,64,175,.3)" }
                : { color: "#64748b" }
              }
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
