import { useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt } from "../../utils/index.js";
import { CONF, CTW, THEX, REAL_TEAMS, YOMI, YOMI_WEIGHT, YOMI_COLOR, LOSS_REASONS } from "../../constants/index.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

/* 確度カラー — 上品なトーン */
const CONF_HEX = { "30%":"#f59e0b", "50%":"#3b82f6", "70%":"#10b981", "回収":"#8b5cf6" };
const CONF_ORDER = [...CONF].reverse(); // 回収→70%→50%→30%

/* ── Stat カード ── */
function StatCard({ conf, amt, count, total, onClick }) {
  const tw  = CTW[conf] ?? CTW["30%"];
  const hex = CONF_HEX[conf];
  const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
  return (
    <div
      className="bg-white rounded-2xl p-4 flex flex-col gap-2 card-shadow
        hover:bg-blue-50/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150
        cursor-pointer active:scale-[0.98] select-none"
      onClick={onClick}
    >
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

/* ── 加重パイプライン ── */
function WeightedPipeline({ filtered }) {
  const yomiData = useMemo(() => {
    return YOMI.filter(y => y !== "失注").map(y => {
      const yDeals = filtered.filter(d => d.yomi === y);
      const total    = yDeals.reduce((s, d) => s + (d.amount || 0), 0);
      const weighted = total * (YOMI_WEIGHT[y] ?? 0);
      return { y, total, weighted };
    });
  }, [filtered]);

  const maxAmt = Math.max(...yomiData.map(d => d.total), 1);

  if (filtered.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-4">加重パイプライン（着地予想）</h3>
      <div className="space-y-2">
        {yomiData.map(({ y, total, weighted }) => (
          <div key={y} className="flex items-center gap-3">
            <span className="text-xs font-bold w-12 shrink-0" style={{color: YOMI_COLOR[y]}}>{y}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2 relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full opacity-30"
                style={{width: `${maxAmt > 0 ? (total / maxAmt) * 100 : 0}%`, background: YOMI_COLOR[y]}}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{width: `${maxAmt > 0 ? (weighted / maxAmt) * 100 : 0}%`, background: YOMI_COLOR[y]}}
              />
            </div>
            <span className="text-xs text-slate-500 w-20 text-right shrink-0">{fmtAmt(weighted)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 失注要因ドーナツ ── */
function LossReasonChart({ filtered }) {
  const lostDeals = filtered.filter(d => d.yomi === "失注");
  const counts = useMemo(() => {
    const acc = {};
    lostDeals.forEach(d => {
      const r = d.lossReason || "その他";
      acc[r] = (acc[r] || 0) + 1;
    });
    return acc;
  }, [lostDeals]);

  if (lostDeals.length === 0) return null;

  const labels  = Object.keys(counts);
  const data    = Object.values(counts);
  const bgColors = ["#ef4444","#f97316","#f59e0b","#8b5cf6","#94a3b8"];

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: labels.map((_, i) => bgColors[i % bgColors.length]),
      borderWidth: 3,
      borderColor: "#fff",
      hoverOffset: 8,
    }],
  };

  return (
    <div className="bg-white rounded-2xl card-shadow p-5">
      <h3 className="text-sm font-bold text-slate-700 mb-4">失注要因分析（{lostDeals.length}件）</h3>
      <div style={{ height: 200 }}>
        <Doughnut data={chartData} options={{
          responsive: true, maintainAspectRatio: false, cutout: "60%",
          plugins: {
            legend: { position: "right", labels: { boxWidth: 10, font: { size: 11, family: "Noto Sans JP" }, padding: 12 } },
            tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}件` }, bodyFont: { family: "Noto Sans JP" } },
          },
        }} />
      </div>
    </div>
  );
}

/* ── メイン ── */
export default function SummaryView() {
  const { deals, members, activeTab, activePeriods, currentUser, setActiveView } = useApp();
  const isMyTab = activeTab === "マイ";

  /* すべての集計に使うフィルター済みデータ（マイタブでは個人データになる） */
  const filtered = useMemo(() => {
    const pd = deals.filter(d => activePeriods.includes(d.period));
    return filterByTab(pd, activeTab, currentUser?.name);
  }, [deals, activeTab, activePeriods, currentUser]);

  /* 確度別集計 */
  const byConf = useMemo(() => {
    const acc = { "30%": 0, "50%": 0, "70%": 0, "回収": 0 };
    filtered.forEach(d => { acc[d.confidence] = (acc[d.confidence] || 0) + (d.amount || 0); });
    return acc;
  }, [filtered]);

  /* 目標: マイタブ → 個人目標、チームタブ → チーム合計 */
  const teamTarget = useMemo(() => {
    if (isMyTab) return currentUser?.target || 0;
    return members
      .filter(m => m.role !== "admin" && m.status === "active" &&
        (activeTab === "全体" || m.team === activeTab ||
         (activeTab === "鈴木Tプレ" && (m.team === "杉山T" || m.team === "鈴木T"))))
      .reduce((s, m) => s + (m.target || 0), 0);
  }, [members, activeTab, currentUser, isMyTab]);

  const total    = Object.values(byConf).reduce((a, b) => a + b, 0);
  const kaishu   = byConf["回収"] || 0;
  const achRate  = teamTarget > 0 ? Math.min(Math.round((kaishu / teamTarget) * 100), 999) : 0;

  /* コンサバ: 70% + 回収 */
  const conserv      = (byConf["70%"] || 0) + (byConf["回収"] || 0);
  const conservCount = filtered.filter(d => d.confidence === "70%" || d.confidence === "回収").length;
  /* アグレッシブ: 50% + 70% + 回収 */
  const aggress      = (byConf["50%"] || 0) + (byConf["70%"] || 0) + (byConf["回収"] || 0);
  const agressCount  = filtered.filter(d => ["50%","70%","回収"].includes(d.confidence)).length;

  /* バナー色: THEX にないタブ（マイ）→ SF ブルー */
  const color    = THEX[activeTab] ?? "#0070d2";
  const isMulti  = activeTab === "全体" || activeTab === "鈴木Tプレ";
  const teamsShow = activeTab === "鈴木Tプレ" ? ["杉山T", "鈴木T"] : REAL_TEAMS;
  /* バナータイトル */
  const bannerLabel = isMyTab ? `マイ（${currentUser?.name ?? ""}）` : activeTab;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 fade-in">

      {/* ── ヒーローカード ── */}
      <div
        className="rounded-2xl text-white p-6"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 8px 32px -8px ${color}88, 0 4px 8px -4px ${color}55`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-8">
          {/* 左: ヨミ合計 */}
          <div className="flex-1">
            <p className="text-[11px] font-semibold opacity-70 mb-1 uppercase tracking-widest">
              {bannerLabel} — ヨミ合計
            </p>
            <p className="text-5xl font-black leading-none tabular">{fmtAmt(total)}</p>
            <p className="text-sm opacity-60 mt-2">{filtered.length} 案件</p>
          </div>

          {/* 右: 目標達成率 */}
          {teamTarget > 0 && (
            <div className="sm:text-right">
              <p className="text-[11px] opacity-70 mb-1.5 uppercase tracking-widest">受注 / 目標</p>
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

        {/* ── アグレッシブ / コンサバ ── */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">
              アグレッシブ（50%以上）
            </p>
            <p className="text-2xl font-black tabular leading-none">{fmtAmt(aggress)}</p>
            <p className="text-[11px] opacity-50 mt-0.5">{agressCount} 件</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">
              コンサバ（70%以上）
            </p>
            <p className="text-2xl font-black tabular leading-none">{fmtAmt(conserv)}</p>
            <p className="text-[11px] opacity-50 mt-0.5">{conservCount} 件</p>
          </div>
        </div>
      </div>

      {/* ── 確度別ミニカード（クリックでヨミ一覧へ） ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CONF_ORDER.map(conf => (
          <StatCard
            key={conf}
            conf={conf}
            amt={byConf[conf] || 0}
            count={filtered.filter(d => d.confidence === conf).length}
            total={total}
            onClick={() => setActiveView("list")}
          />
        ))}
      </div>

      {/* ── グラフ（チーム集計） ── */}
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

      {/* ── 加重パイプライン分析 ── */}
      <WeightedPipeline filtered={filtered} />

      {/* ── 失注要因分析 ── */}
      <LossReasonChart filtered={filtered} />
    </div>
  );
}
