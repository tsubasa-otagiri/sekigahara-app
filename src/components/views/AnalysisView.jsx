import { useMemo } from "react";
import { REAL_TEAMS } from "../../constants/index.js";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab } from "../../utils/index.js";
import { THEX } from "../../constants/index.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ══════════════════════════════════════════════
   IS/FS 折半クレジット（StatsView と同一ルール）
   IS = FS → 100%  /  IS ≠ FS → 各50%  /  片方のみ → 100%
══════════════════════════════════════════════ */
const getDealCredit = (deal, name) => {
  const isMe = deal.is === name;
  const fsMe = deal.fs === name;
  if (!isMe && !fsMe) return 0;
  if (deal.is && deal.fs && deal.is !== deal.fs) return 0.5;
  return 1.0;
};

/* ══════════════════════════════════════════════
   指標定義
   key       : 内部識別子
   label     : 表示名
   confs     : 対象確度リスト
   dotColor  : 左ドットカラー
══════════════════════════════════════════════ */
const METRICS = [
  { key:"agre",   label:"アグレ",   confs:["回収","70%","50%"], dot:"#3b82f6", txt:"text-blue-700"    },
  { key:"konsa",  label:"コンサバ", confs:["回収","70%"],       dot:"#0d9488", txt:"text-teal-700"    },
  { key:"kaishu", label:"回収済",   confs:["回収"],             dot:"#7c3aed", txt:"text-violet-700"  },
  { key:"p70",    label:"70%",      confs:["70%"],              dot:"#10b981", txt:"text-emerald-600" },
  { key:"p50",    label:"50%",      confs:["50%"],              dot:"#38bdf8", txt:"text-sky-600"     },
  { key:"p30",    label:"30%",      confs:["30%"],              dot:"#f59e0b", txt:"text-amber-600"   },
];

/* ══════════════════════════════════════════════
   フォーマット関数
══════════════════════════════════════════════ */
/* 万円 → ¥XX,XXX 形式 */
const fmtYen = (manYen) =>
  "¥" + Math.round((manYen || 0) * 10000).toLocaleString("ja-JP");

/* 乖離表示: +¥XXX / -¥XXX / 目標0なら"—" */
const fmtGap = (gap, target) => {
  if (target === 0) return "—";
  const abs = Math.round(Math.abs(gap) * 10000).toLocaleString("ja-JP");
  return (gap >= 0 ? "+" : "-") + "¥" + abs;
};

/* 達成率テキスト色 */
const rateCls = (r, tgt) => {
  if (tgt === 0) return "text-slate-400";
  if (r >= 100) return "text-emerald-600 font-black";
  if (r >= 50)  return "text-amber-600 font-bold";
  return "text-red-500 font-bold";
};

/* 乖離テキスト色 */
const gapCls  = (gap, tgt) =>
  tgt === 0 ? "text-slate-400" : gap >= 0 ? "text-emerald-600" : "text-red-500";

/* ══════════════════════════════════════════════
   集計ヘルパー
══════════════════════════════════════════════ */
/* メンバー個人集計（折半適用） */
const calcMember = (deals, name, target) =>
  METRICS.map(m => {
    const amt  = deals
      .filter(d => m.confs.includes(d.confidence) && (d.is === name || d.fs === name))
      .reduce((s, d) => s + (d.amount || 0) * getDealCredit(d, name), 0);
    const gap  = amt - target;
    const rate = target > 0 ? Math.round((amt / target) * 100) : 0;
    return { ...m, amt, gap, rate };
  });

/* チーム集計（raw 合計 — 折半の和 = 原値なので同じ） */
const calcTeam = (deals, target) =>
  METRICS.map(m => {
    const amt  = deals
      .filter(d => m.confs.includes(d.confidence))
      .reduce((s, d) => s + (d.amount || 0), 0);
    const gap  = amt - target;
    const rate = target > 0 ? Math.round((amt / target) * 100) : 0;
    return { ...m, amt, gap, rate };
  });

/* ══════════════════════════════════════════════
   メンバーカード
══════════════════════════════════════════════ */
const ROLE_BG = { leader:"#f97316", FS:"#059669", IS:"#0891b2" };

function MemberCard({ member, deals }) {
  const stats = useMemo(
    () => calcMember(deals, member.name, member.target ?? 0),
    [deals, member]
  );
  const target = member.target ?? 0;

  return (
    <div className="bg-white rounded-2xl card-shadow overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2.5"
        style={{ background: "linear-gradient(90deg,#f8fafc,#fff)" }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-black flex-none"
          style={{ background: ROLE_BG[member.role] ?? "#64748b" }}
        >
          {member.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-slate-800 leading-tight">{member.name}</p>
          <p className="text-[10px] text-slate-400 mt-px">
            {member.team}&ensp;/&ensp;目標&ensp;{fmtYen(target)}
          </p>
        </div>
      </div>

      {/* 分析テーブル */}
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-slate-100" style={{ background:"#f8fafc" }}>
            <th className="px-3 py-1.5 text-left text-[9px] font-bold text-slate-400 uppercase tracking-widest">指標</th>
            <th className="px-3 py-1.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">金額</th>
            <th className="px-3 py-1.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">乖離</th>
            <th className="px-3 py-1.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest">達成</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(s => (
            <tr key={s.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: s.dot }} />
                  <span className={`font-bold ${s.txt}`}>{s.label}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular">
                {fmtYen(s.amt)}
              </td>
              <td className={`px-3 py-2 text-right tabular ${gapCls(s.gap, target)}`}>
                {fmtGap(s.gap, target)}
              </td>
              <td className={`px-3 py-2 text-right tabular ${rateCls(s.rate, target)}`}>
                {target > 0 ? `${s.rate}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════
   チームサマリーテーブル
══════════════════════════════════════════════ */
function TeamSummaryTable({ stats, totalTarget }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-200" style={{ background:"#f8fafc" }}>
          {["指標","金額","目標","乖離","達成率"].map(h => (
            <th key={h}
              className={`px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest
                ${h === "指標" ? "text-left" : "text-right"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map(s => (
          <tr key={s.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: s.dot }} />
                <span className={`font-bold text-[12px] ${s.txt}`}>{s.label}</span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-right font-semibold text-slate-700 tabular">
              {fmtYen(s.amt)}
            </td>
            <td className="px-4 py-2.5 text-right text-slate-500 tabular">
              {fmtYen(totalTarget)}
            </td>
            <td className={`px-4 py-2.5 text-right tabular ${gapCls(s.gap, totalTarget)}`}>
              {fmtGap(s.gap, totalTarget)}
            </td>
            <td className={`px-4 py-2.5 text-right tabular ${rateCls(s.rate, totalTarget)}`}>
              {totalTarget > 0 ? `${s.rate}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ══════════════════════════════════════════════
   バーチャート
══════════════════════════════════════════════ */
function TeamBarChart({ stats, color }) {
  const BAR_KEYS = ["agre","konsa","kaishu"];
  const BAR_LABELS = { agre:"アグレ", konsa:"コンサバ", kaishu:"回収済" };
  const alphas = ["cc","99","66"];

  const data = {
    labels: BAR_KEYS.map(k => BAR_LABELS[k]),
    datasets: [{
      label: "万円",
      data: BAR_KEYS.map(k => {
        const s = stats.find(x => x.key === k);
        return Math.round((s?.amt ?? 0) * 10) / 10;
      }),
      backgroundColor: alphas.map(a => color + a),
      borderColor:     alphas.map(() => color),
      borderWidth: 0,
      borderRadius: 10,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}万` },
        bodyFont: { family:"Noto Sans JP" },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size:12, family:"Noto Sans JP", weight:"bold" }, color:"#64748b" },
      },
      y: {
        beginAtZero: true,
        grid: { color:"#f1f5f9" },
        ticks: { callback: v => v + "万", font: { size:10, family:"Noto Sans JP" }, color:"#94a3b8" },
      },
    },
  };

  return <Bar data={data} options={options} />;
}

/* ══════════════════════════════════════════════
   メインコンポーネント
══════════════════════════════════════════════ */
export default function AnalysisView() {
  const { deals, members, activeTab, activePeriods } = useApp();

  /* 表示メンバー（admin・退職者除外） */
  const teamMembers = useMemo(() => {
    const base = members.filter(m => m.role !== "admin" && m.status === "active");
    if (activeTab === "全体")     return base;
    if (activeTab === "鈴木Tプレ") return base.filter(m => m.team === "杉山T" || m.team === "鈴木T");
    return base.filter(m => m.team === activeTab);
  }, [members, activeTab]);

  /* チーム案件 */
  const teamDeals = useMemo(() => {
    const pdDeals = deals.filter(d => activePeriods.includes(d.period));
    return filterByTab(pdDeals, activeTab);
  }, [deals, activeTab, activePeriods]);

  /* チーム目標合計 */
  const totalTarget = useMemo(
    () => teamMembers.reduce((s, m) => s + (m.target ?? 0), 0),
    [teamMembers]
  );

  /* チームサマリー */
  const teamStats = useMemo(
    () => calcTeam(teamDeals, totalTarget),
    [teamDeals, totalTarget]
  );

  const color = THEX[activeTab] ?? "#7c3aed";

  /* チームごとにメンバーを整理（REAL_TEAMS の順序を維持） */
  const grouped = useMemo(() => {
    const teamOrder = activeTab === "鈴木Tプレ"
      ? ["杉山T", "鈴木T"]
      : activeTab === "全体"
      ? [...REAL_TEAMS, "全社FS"]
      : [activeTab];

    return teamOrder
      .map(t => ({
        team:    t,
        color:   THEX[t] ?? "#7c3aed",
        members: teamMembers.filter(m => m.team === t),
      }))
      .filter(g => g.members.length > 0);
  }, [teamMembers, activeTab]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 fade-in">

      {/* ══ 上段: チームサマリー + バーチャート ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

        {/* サマリーテーブル */}
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: color }} />
            <h3 className="text-sm font-bold text-slate-700">{activeTab} — 傾向分析</h3>
            <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
              <span>チーム目標</span>
              <span className="font-bold text-slate-600 tabular">{fmtYen(totalTarget)}</span>
              <span className="ml-2">{teamMembers.length} 名</span>
            </div>
          </div>
          <TeamSummaryTable stats={teamStats} totalTarget={totalTarget} />
        </div>

        {/* バーチャート */}
        <div className="bg-white rounded-2xl card-shadow p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            ヨミ段階別 金額比較
          </p>
          <p className="text-[11px] text-slate-400 mb-4">アグレ / コンサバ / 回収済</p>
          <div style={{ height: 200 }}>
            {teamDeals.length > 0
              ? <TeamBarChart stats={teamStats} color={color} />
              : <div className="h-full flex items-center justify-center text-sm text-slate-400">データなし</div>
            }
          </div>
        </div>
      </div>

      {/* ══ 下段: チームごとのメンバー個人カード ══ */}
      {teamMembers.length === 0 ? (
        <div className="bg-white rounded-2xl card-shadow flex items-center justify-center py-20 text-slate-400 text-sm">
          表示対象のメンバーがいません
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ team, color: tc, members: gm }) => (
            <div key={team}>
              {/* チームセクションヘッダー */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: tc }} />
                <h4 className="text-[11px] font-black uppercase tracking-widest" style={{ color: tc }}>
                  {team}
                </h4>
                <span className="text-[10px] text-slate-400">{gm.length} 名</span>
                <div className="flex-1 h-px bg-slate-200 ml-1" />
              </div>

              {/* メンバーカード グリッド */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {gm.map(m => (
                  <MemberCard key={m.id} member={m} deals={deals} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
