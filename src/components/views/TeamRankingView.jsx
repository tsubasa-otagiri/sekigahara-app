import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, ChevronDown, ChevronsUpDown, X } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { fmtAmt } from "../../utils/index.js";
import { REAL_TEAMS, THEX } from "../../constants/index.js";
import { TeamBadge, PlanBadge } from "../ui/Badges.jsx";

/* ── ソート可能ヘッダー ── */
function SortTh({ label, col, sortKey, sortDir, onSort, right = false }) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap
        ${right ? "text-right" : "text-left"}
        ${active ? "text-[#0070d2] bg-[#e8f4fd]" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          : <ChevronsUpDown size={12} className="opacity-30" />}
      </span>
    </th>
  );
}

/* ── 順位バッジ ── */
function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-2xl leading-none select-none">🏆</span>;
  if (rank === 2) return <span className="text-xl leading-none select-none">🥈</span>;
  if (rank === 3) return <span className="text-xl leading-none select-none">🥉</span>;
  return <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5 tabular">{rank}位</span>;
}

const RANK_ROW_STYLE = {
  1: { background: "linear-gradient(90deg,rgba(251,191,36,.12),rgba(251,191,36,.04))", borderLeft: "3px solid #f59e0b" },
  2: { background: "linear-gradient(90deg,rgba(148,163,184,.10),rgba(148,163,184,.03))", borderLeft: "3px solid #94a3b8" },
  3: { background: "linear-gradient(90deg,rgba(249,115,22,.10),rgba(249,115,22,.03))", borderLeft: "3px solid #f97316" },
};

function RateBar({ rate }) {
  const pct  = Math.min(rate, 100);
  const grad = rate >= 100 ? "linear-gradient(90deg,#059669,#10b981)"
             : rate >= 50  ? "linear-gradient(90deg,#d97706,#f59e0b)"
             :                "linear-gradient(90deg,#dc2626,#ef4444)";
  const textCls = rate >= 100 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: grad }} />
      </div>
      <span className={`text-[11px] font-black w-10 text-right tabular ${textCls}`}>{rate}%</span>
    </div>
  );
}

/* ── 受注案件モーダル ── */
function KaishuModal({ title, deals, onClose }) {
  const sorted = [...deals].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const total  = sorted.reduce((s, d) => s + (d.amount || 0), 0);
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]" onMouseDown={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-black text-slate-800">{title} — 受注案件</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {sorted.length}件　合計 <span className="font-black text-emerald-600">{fmtAmt(total)}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">受注案件はありません</p>
          ) : sorted.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{d.company}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <TeamBadge team={d.team} />
                  {d.plan && <PlanBadge plan={d.plan} />}
                  {d.is && <span className="text-[10px] text-cyan-700 font-semibold">IS {d.is}</span>}
                  {d.fs && <span className="text-[10px] text-emerald-700 font-semibold">FS {d.fs}</span>}
                </div>
              </div>
              <span className="text-sm font-black text-emerald-600 tabular shrink-0">{fmtAmt(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── メイン ── */
export default function TeamRankingView() {
  const { deals, members, activePeriods } = useApp();
  const pdDeals = useMemo(() => deals.filter(d => activePeriods.includes(d.period) && d.phase !== "失注"), [deals, activePeriods]);

  const [sortKey, setSortKey] = useState("kaishu");
  const [sortDir, setSortDir] = useState("desc");
  const [kaishuModal, setKaishuModal] = useState(null);

  const handleSort = (col) => {
    if (sortKey === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("desc"); }
  };

  const buildRow = (team, teamKeys, excludeNames = []) => {
    const teamMembers = members.filter(m =>
      teamKeys.includes(m.team) &&
      m.role !== "admin" &&
      m.status === "active" &&
      !excludeNames.includes(m.name)
    );
    /* excludeNames に含まれる人が IS/FS どちらかにいる案件は除外 */
    const teamDeals = pdDeals.filter(d =>
      teamKeys.includes(d.team) &&
      !excludeNames.some(name => d.is === name || d.fs === name)
    );
    const kaishuDeals = teamDeals.filter(d => d.confidence === "回収");
    const kaishu      = kaishuDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const kaishuCount = kaishuDeals.length;
    const aggressive  = teamDeals.filter(d => d.confidence === "70%" || d.confidence === "回収").reduce((s, d) => s + (d.amount || 0), 0);
    const pipeline    = teamDeals.length;
    const target      = teamMembers.reduce((s, m) => s + (m.target || 0), 0);
    const rate        = target > 0 ? Math.round((kaishu / target) * 100) : 0;
    const perPerson   = teamMembers.length > 0 ? Math.round((kaishu / teamMembers.length) * 100) / 100 : 0;
    return { team, target, kaishu, kaishuCount, aggressive, pipeline, rate, memberCount: teamMembers.length, perPerson };
  };

  const rows = useMemo(() =>
    REAL_TEAMS.map(team => buildRow(team, [team])),
  [pdDeals, members]);

  /* 鈴木Tプレは4チームランキングとは別枠 */
  const preRow = useMemo(() =>
    buildRow("鈴木Tプレ", ["杉山T", "鈴木T"], ["杉山", "渡邉"]),
  [pdDeals, members]);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ?  1 : -1;
    return 0;
  }), [rows, sortKey, sortDir]);

  const rankMap = useMemo(() => {
    const by = [...rows].sort((a, b) => b.kaishu - a.kaishu || b.rate - a.rate);
    const map = new Map();
    by.forEach((r, i) => {
      map.set(r.team, i > 0 && r.kaishu === by[i - 1].kaishu ? map.get(by[i - 1].team) : i + 1);
    });
    return map;
  }, [rows]);

  const totals = {
    target:     sorted.reduce((s, r) => s + r.target, 0),
    kaishu:     sorted.reduce((s, r) => s + r.kaishu, 0),
    aggressive: sorted.reduce((s, r) => s + r.aggressive, 0),
    pipeline:   sorted.reduce((s, r) => s + r.pipeline, 0),
  };
  const avgRate = totals.target > 0 ? Math.round((totals.kaishu / totals.target) * 100) : 0;
  const shProps = { sortKey, sortDir, onSort: handleSort };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto fade-in">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "目標合計",       val: fmtAmt(totals.target),     color: "#64748b" },
          { label: "回収合計",       val: fmtAmt(totals.kaishu),     color: "#059669" },
          { label: "達成率（平均）", val: avgRate + "%",              color: avgRate >= 100 ? "#059669" : avgRate >= 50 ? "#d97706" : "#dc2626" },
          { label: "ヨミ件数",        val: totals.pipeline + " 件",   color: "#4f46e5" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-4 card-shadow">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="text-2xl font-black tabular leading-none" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200" style={{ background: "#f8fafc" }}>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-12">順位</th>
                <SortTh label="チーム"         col="team"        {...shProps} />
                <SortTh label="人数"           col="memberCount" {...shProps} right />
                <SortTh label="目標"           col="target"      {...shProps} right />
                <SortTh label="回収額"         col="kaishu"      {...shProps} right />
                <SortTh label="達成率"         col="rate"        {...shProps} />
                <SortTh label="受注件数"       col="kaishuCount" {...shProps} right />
                <SortTh label="一人あたり"     col="perPerson"   {...shProps} right />
                <SortTh label="アグレッシブ計" col="aggressive"  {...shProps} right />
                <SortTh label="ヨミ件数"       col="pipeline"    {...shProps} right />
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ team, target, kaishu, kaishuCount, aggressive, pipeline, rate, memberCount, perPerson }) => {
                const rank = rankMap.get(team) ?? 99;
                const rankStyle = RANK_ROW_STYLE[rank] ?? {};
                const hex = THEX[team] || "#64748b";
                return (
                  <tr key={team}
                    className="border-b border-slate-100 last:border-0 hover:brightness-[.97] transition-colors"
                    style={rankStyle}
                  >
                    <td className="px-3 py-3 text-center"><RankBadge rank={rank} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const keys = team === "鈴木Tプレ" ? ["杉山T", "鈴木T"] : [team];
                          setKaishuModal({ title: team, deals: pdDeals.filter(d => d.confidence === "回収" && keys.includes(d.team)) });
                        }}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: hex }} />
                        <span className="text-[13px] font-bold group-hover:underline underline-offset-2" style={{ color: rank <= 3 ? "#1e293b" : "#475569" }}>
                          {team}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-500 tabular">{memberCount}名</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-500 tabular">{fmtAmt(target)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`tabular font-black text-base ${kaishu > 0 ? "text-emerald-600" : "text-slate-300"}`}>{fmtAmt(kaishu)}</span>
                    </td>
                    <td className="px-3 py-3 w-40">
                      <div className="flex items-center gap-1">
                        <RateBar rate={rate} />
                        {rate >= 100 && <span className="text-base leading-none">🎉</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-black tabular ${kaishuCount > 0 ? "text-emerald-500" : "text-slate-300"}`}>{kaishuCount} 件</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-black tabular ${perPerson > 0 ? "text-orange-500" : "text-slate-300"}`}>{fmtAmt(perPerson)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-bold tabular ${aggressive > 0 ? "text-indigo-600" : "text-slate-300"}`}>{fmtAmt(aggressive)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] font-semibold text-slate-600 tabular">{pipeline} 件</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(() => {
                const totalMembers = sorted.reduce((s, r) => s + r.memberCount, 0);
                const avgPerPerson = totalMembers > 0 ? Math.round((totals.kaishu / totalMembers) * 100) / 100 : 0;
                const totalKaishuCount = sorted.reduce((s, r) => s + r.kaishuCount, 0);
                return (
                  <tr className="border-t-2 border-slate-200" style={{ background: "#f8fafc" }}>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-500" colSpan={3}>合計 / 平均</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-slate-700 tabular">{fmtAmt(totals.target)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-emerald-600 tabular">{fmtAmt(totals.kaishu)}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-1"><RateBar rate={avgRate} />{avgRate >= 100 && <span className="text-base">🎉</span>}</div></td>
                    <td className="px-3 py-3 text-right text-sm font-black text-emerald-500 tabular">{totalKaishuCount} 件</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-orange-500 tabular">{fmtAmt(avgPerPerson)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-indigo-600 tabular">{fmtAmt(totals.aggressive)}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-slate-700 tabular">{totals.pipeline} 件</td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>

      {/* 鈴木Tプレ（別枠） */}
      <div className="mt-4 bg-white rounded-2xl overflow-hidden card-shadow border-t-4 border-blue-400">
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
          <span className="text-[11px] font-black text-blue-700 tracking-wide">鈴木Tプレ（参考）</span>
          <span className="text-[10px] text-blue-400 ml-1">杉山T（杉山除く） ＋ 鈴木T の合算</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse">
            <tbody>
              {(() => {
                const { team, target, kaishu, kaishuCount, aggressive, pipeline, rate, memberCount, perPerson } = preRow;
                const hex = THEX[team] || "#64748b";
                return (
                  <tr className="hover:bg-blue-50/40 transition-colors" style={{ borderLeft: "3px solid #2563eb" }}>
                    <td className="px-3 py-3 text-center w-12 shrink-0">
                      <span className="text-[10px] font-black text-blue-400 bg-blue-50 border border-blue-200 rounded-md px-1.5 py-0.5 whitespace-nowrap inline-block">参考</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setKaishuModal({ title: team, deals: pdDeals.filter(d => d.confidence === "回収" && ["杉山T","鈴木T"].includes(d.team)) })}
                        className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: hex }} />
                        <span className="text-[13px] font-bold text-slate-700 group-hover:underline underline-offset-2">{team}</span>
                        <span className="text-[9px] font-semibold text-blue-500 bg-blue-50 border border-blue-200 rounded px-1 py-px leading-none">合算</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-500 tabular">{memberCount}名</td>
                    <td className="px-3 py-3 text-right text-sm text-slate-500 tabular">{fmtAmt(target)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`tabular font-black text-base ${kaishu > 0 ? "text-emerald-600" : "text-slate-300"}`}>{fmtAmt(kaishu)}</span>
                    </td>
                    <td className="px-3 py-3 w-40">
                      <div className="flex items-center gap-1">
                        <RateBar rate={rate} />
                        {rate >= 100 && <span className="text-base leading-none">🎉</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-black tabular ${kaishuCount > 0 ? "text-emerald-500" : "text-slate-300"}`}>{kaishuCount} 件</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-black tabular ${perPerson > 0 ? "text-orange-500" : "text-slate-300"}`}>{fmtAmt(perPerson)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-bold tabular ${aggressive > 0 ? "text-indigo-600" : "text-slate-300"}`}>{fmtAmt(aggressive)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] font-semibold text-slate-600 tabular">{pipeline} 件</span>
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {kaishuModal && <KaishuModal title={kaishuModal.title} deals={kaishuModal.deals} onClose={() => setKaishuModal(null)} />}
    </div>
  );
}
