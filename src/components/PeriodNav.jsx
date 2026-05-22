/**
 * PeriodNav — 年・月プルダウン ＋ 四半期トグル
 * Salesforce Lightning Design を基調とした1行コンパクトレイアウト
 */
import { useApp } from "../contexts/useApp.js";

const SF      = "#0070d2";
const SF_DARK = "#1e40af";
const MONTHS  = Array.from({ length: 12 }, (_, i) => i + 1);
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const Q_MONTHS = { Q1:[1,2,3], Q2:[4,5,6], Q3:[7,8,9], Q4:[10,11,12] };
const Q_RANGE  = { Q1:"1–3月", Q2:"4–6月", Q3:"7–9月", Q4:"10–12月" };

/* Salesforce Lightning ベーススタイル */
const baseSel = {
  appearance: "none", WebkitAppearance: "none",
  border: "1px solid #c9c7c5",
  borderRadius: "4px",
  padding: "5px 26px 5px 10px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#3e3e3c",
  background: "#fff",
  cursor: "pointer",
  outline: "none",
  lineHeight: "1.5",
};

/* カスタム矢印 */
function Chevron({ color = "#706e6b" }) {
  return (
    <svg
      width="10" height="6" viewBox="0 0 10 6" fill="none"
      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
    >
      <path d="M1 1L5 5L9 1" stroke={color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PeriodNav() {
  const {
    currentYear, setCurrentYear,
    currentMonth, setCurrentMonth,
    periodType, setPeriodType,
  } = useApp();

  const yearOpts    = [currentYear - 1, currentYear, currentYear + 1];
  const isMonthMode = periodType === "month";

  const handleMonth = (e) => {
    setCurrentMonth(Number(e.target.value));
    setPeriodType("month");
  };

  const handleQ = (q) => {
    if (periodType === q) {
      /* 再クリック → 月次モードに戻す */
      setPeriodType("month");
    } else {
      setPeriodType(q);
      setCurrentMonth(Q_MONTHS[q][0]);
    }
  };

  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #dddbda" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5 py-1.5 overflow-x-auto no-scrollbar">

          {/* ラベル */}
          <span className="shrink-0 text-[10px] font-bold tracking-widest text-slate-400 select-none">
            対象期間
          </span>

          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* 年 */}
          <div className="relative shrink-0">
            <select
              value={currentYear}
              onChange={e => setCurrentYear(Number(e.target.value))}
              style={baseSel}
              onFocus={e  => { e.target.style.borderColor = SF; e.target.style.boxShadow = "0 0 0 3px rgba(0,112,210,.15)"; }}
              onBlur={e   => { e.target.style.borderColor = "#c9c7c5"; e.target.style.boxShadow = "none"; }}
            >
              {yearOpts.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <Chevron />
          </div>

          {/* 月 セレクト — 常時表示（Q モード時も有効） */}
          <div className="relative shrink-0">
            <select
              value={currentMonth}
              onChange={handleMonth}
              style={{
                ...baseSel,
                border: isMonthMode ? `1.5px solid ${SF}` : "1px solid #c9c7c5",
                color: isMonthMode ? SF : "#3e3e3c",
                fontWeight: isMonthMode ? "700" : "600",
              }}
              onFocus={e => { e.target.style.boxShadow = "0 0 0 3px rgba(0,112,210,.2)"; }}
              onBlur={e  => { e.target.style.boxShadow = "none"; }}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}月</option>)}
            </select>
            <Chevron color={isMonthMode ? SF : "#706e6b"} />
          </div>

          {/* 当月ボタン */}
          <button
            onClick={() => {
              const now = new Date();
              setCurrentYear(now.getFullYear());
              setCurrentMonth(now.getMonth() + 1);
              setPeriodType("month");
            }}
            style={{
              borderRadius: "4px",
              border: `1.5px solid ${SF}`,
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: "700",
              background: SF,
              color: "#fff",
              cursor: "pointer",
              transition: "all 0.12s",
              letterSpacing: "0.03em",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#005a9e"; e.currentTarget.style.borderColor = "#005a9e"; }}
            onMouseLeave={e => { e.currentTarget.style.background = SF; e.currentTarget.style.borderColor = SF; }}
          >
            当月
          </button>

          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* Q1〜Q4 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {QUARTERS.map(q => {
              const on = periodType === q;
              return (
                <button
                  key={q}
                  onClick={() => handleQ(q)}
                  title={`${q}：${Q_RANGE[q]}`}
                  style={{
                    borderRadius: "4px",
                    border: on ? `1.5px solid ${SF_DARK}` : "1px solid #c9c7c5",
                    padding: "4px 9px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: on ? SF_DARK : "#fff",
                    color: on ? "#fff" : "#706e6b",
                    cursor: "pointer",
                    transition: "all 0.12s",
                    letterSpacing: "0.03em",
                  }}
                  onMouseEnter={e => { if (!on) { e.currentTarget.style.borderColor = SF; e.currentTarget.style.color = SF; }}}
                  onMouseLeave={e => { if (!on) { e.currentTarget.style.borderColor = "#c9c7c5"; e.currentTarget.style.color = "#706e6b"; }}}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* 右端サマリー */}
          <div className="ml-auto shrink-0 hidden md:block">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{
                background: isMonthMode ? "rgba(0,112,210,.08)" : "rgba(30,64,175,.08)",
                color: isMonthMode ? SF : SF_DARK,
              }}
            >
              {isMonthMode
                ? `${currentYear}年 ${currentMonth}月`
                : `${currentYear}年 ${periodType}（${Q_RANGE[periodType]}）`}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
