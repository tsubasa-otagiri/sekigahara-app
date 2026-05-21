import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt } from "../../utils/index.js";
import { CONF, CTW, THEX, REAL_TEAMS } from "../../constants/index.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* 確度カラー — 上品なトーン */
const CONF_HEX = { "30%":"#f59e0b", "50%":"#3b82f6", "70%":"#10b981", "回収":"#8b5cf6" };
const CONF_ORDER = [...CONF].reverse(); // 回収→70%→50%→30%

/* ── Stat カード ── */
function StatCard({ conf, amt, count, total }) {
  const tw  = CTW[conf] ?? CTW["30%"];
  const hex = CONF_HEX[conf];
  const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-2 card-shadow hover:card-shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: hex }} />
          <span className="text-[11px] font-bold text-slate-500">{conf}</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 tabular">{count} 件</span>
      </div>
      <p className="text-2xl font-black text-slate-800 tabular leading-none">{fmtAmt(amt)}</p>
      {/* 構成比バー */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: hex }}
        />
      </div>
      <p className="text-[10px] text-slate-400 tabular">全体の {pct}%</p>
    </div>
  );
}

/* ── ドーナツ ── */
function ConfDonut({ byConf }) {
  const total = Object.values(byConf).reduce((a, b) => a + b, 0);
  if (total === 0) return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400">データなし</div>
  );
  const data = {
    labels: CONF_ORDER,
    datasets: [{
      data: CONF_ORDER.map(c => Math.round((byConf[c] || 0) * 10) / 10),
      backgroundColor: CONF_ORDER.map(c => CONF_HEX[c]),
      borderWidth: 3,
      borderColor: "#fff",
      hoverOffset: 8,
    }],
  };
  return (
    <Doughnut data={data} options={{
      responsive: true, maintainAspectRatio: false, cutout: "65%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 10, font: { size: 11, family: "Noto Sans JP" }, padding: 12 } },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}万` }, bodyFont: { family: "Noto Sans JP" } },
      },
    }} />
  );
}

/* ── 棒グラフ: 単一チーム ── */
function ConfBar({ byConf }) {
  return (
    <Bar
      data={{
        labels: CONF_ORDER,
        datasets: [{
          label: "月額（万）",
          data: CONF_ORDER.map(c => Math.round((byConf[c] || 0) * 10) / 10),
          backgroundColor: CONF_ORDER.map(c => CONF_HEX[c] + "cc"),
          borderColor:     CONF_ORDER.map(c => CONF_HEX[c]),
          borderWidth: 0,
          borderRadius: 8,
          borderSkipped: false,
        }],
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.raw}万` }, bodyFont: { family: "Noto Sans JP" } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: "Noto Sans JP" } } },
          y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { callback: v => v + "万", font: { size: 10, family: "Noto Sans JP" } } },
        },
      }}
    />
  );
}

/* ── 積層棒グラフ: チーム別 ── */
function TeamStackBar({ deals, teams }) {
  return (
    <Bar
      data={{
        labels: CONF_ORDER,
        datasets: teams.map(team => ({
          label: team,
          data: CONF_ORDER.map(conf =>
            Math.round(deals.filter(d => d.team === team && d.confidence === conf)
              .reduce((s, d) => s + (d.amount || 0), 0) * 10) / 10
          ),
          backgroundColor: THEX[team] + "bb",
          borderColor: THEX[team],
          borderWidth: 0,
          borderRadius: { topLeft: 4, topRight: 4 },
          borderSkipped: false,
        })),
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { boxWidth: 10, font: { size: 11, family: "Noto Sans JP" }, padding: 10 } },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}万` }, bodyFont: { family: "Noto Sans JP" } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, family: "Noto Sans JP" } } },
          y: { stacked: true, beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { callback: v => v + "万", font: { size: 10, family: "Noto Sans JP" } } },
        },
      }}
    />
  );
}

/* ── メイン ── */
export default function SummaryView() {
  const { deals, members, activeTab, activePeriods } = useApp();
  const filtered = useMemo(() => {
    const pd = deals.filter(d => activePeriods.includes(d.period));
    return filterByTab(pd, activeTab);
  }, [deals, activeTab, activePeriods]);

  const byConf = useMemo(() => {
    const acc = { "30%": 0, "50%": 0, "70%": 0, "回収": 0 };
    filtered.forEach(d => { acc[d.confidence] = (acc[d.confidence] || 0) + (d.amount || 0); });
    return acc;
  }, [filtered]);

  /* チーム目標合計 */
  const teamTarget = useMemo(() => {
    return members
      .filter(m => m.role !== "admin" && m.status === "active" &&
        (activeTab === "全体" || m.team === activeTab ||
         (activeTab === "鈴木Tプレ" && (m.team === "杉山T" || m.team === "鈴木T"))))
      .reduce((s, m) => s + (m.target || 0), 0);
  }, [members, activeTab]);

  const total    = Object.values(byConf).reduce((a, b) => a + b, 0);
  const kaishu   = byConf["回収"] || 0;
  const achRate  = teamTarget > 0 ? Math.min(Math.round((kaishu / teamTarget) * 100), 999) : 0;
  const color    = THEX[activeTab] ?? "#7c3aed";
  const isMulti  = activeTab === "全体" || activeTab === "鈴木Tプレ";
  const teamsShow = activeTab === "鈴木Tプレ" ? ["杉山T", "鈴木T"] : REAL_TEAMS;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 fade-in">

      {/* ── ヒーローカード ── */}
      <div
        className="rounded-2xl text-white p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 8px 32px -8px ${color}88, 0 4px 8px -4px ${color}55`,
        }}
      >
        {/* 背景装飾 */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, white 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: "white", transform: "translateY(40%)" }} />

        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
          {/* 左: メイン数値 */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold opacity-70 mb-1 uppercase tracking-widest">
              {activeTab} — ヨミ合計
            </p>
            <p className="text-5xl font-black leading-none tabular">{fmtAmt(total)}</p>
            <p className="text-sm opacity-60 mt-2">{filtered.length} 案件</p>
          </div>

          {/* 右: 目標達成率 */}
          {teamTarget > 0 && (
            <div className="sm:text-right">
              <p className="text-[11px] opacity-70 mb-1.5 uppercase tracking-widest">回収 / 目標</p>
              <p className="text-2xl font-black tabular leading-none">
                {fmtAmt(kaishu)}
                <span className="text-sm font-semibold opacity-60 ml-1">/ {fmtAmt(teamTarget)}</span>
              </p>
              <div className="mt-2 h-2 w-36 bg-white/20 rounded-full overflow-hidden ml-auto">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(achRate, 100)}%`, opacity: 0.9 }}
                />
              </div>
              <p className="text-xs mt-1 font-bold opacity-80 tabular">{achRate}% 達成</p>
            </div>
          )}

          {/* 右: 確度内訳 mini */}
          <div className="hidden lg:flex flex-col gap-1 text-right border-l border-white/20 pl-6">
            {CONF_ORDER.map(c => (
              <div key={c} className="flex items-center gap-2 justify-end text-[11px]">
                <span className="opacity-70">{c}</span>
                <span className="font-black tabular opacity-90 w-14">{fmtAmt(byConf[c] || 0)}</span>
                <span className="opacity-50 w-8 tabular">{filtered.filter(d => d.confidence === c).length}件</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 確度別カード ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONF_ORDER.map(conf => (
          <StatCard key={conf} conf={conf} amt={byConf[conf] || 0}
            count={filtered.filter(d => d.confidence === conf).length} total={total} />
        ))}
      </div>

      {/* ── グラフ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">確度別 金額内訳</p>
          <div style={{ height: 220 }}>
            <ConfDonut byConf={byConf} />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 card-shadow">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            {isMulti ? "チーム別 確度内訳" : "確度別 月額合計"}
          </p>
          <div style={{ height: 220 }}>
            {filtered.length > 0
              ? isMulti
                ? <TeamStackBar deals={filtered} teams={teamsShow} />
                : <ConfBar byConf={byConf} />
              : <div className="h-full flex items-center justify-center text-sm text-slate-400">データなし</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
