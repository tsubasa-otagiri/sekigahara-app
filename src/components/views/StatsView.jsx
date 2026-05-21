import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { fmtAmt } from "../../utils/index.js";
import { REAL_TEAMS } from "../../constants/index.js";

/* ── チームフィルターボタン ── */
const TEAM_OPTS = ["全体", ...REAL_TEAMS];

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
          : <ChevronsUpDown size={12} className="opacity-30" />
        }
      </span>
    </th>
  );
}

/* ── 順位バッジ ── */
function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-2xl leading-none select-none" title="1位">🏆</span>;
  if (rank === 2) return <span className="text-xl leading-none select-none" title="2位">🥈</span>;
  if (rank === 3) return <span className="text-xl leading-none select-none" title="3位">🥉</span>;
  return (
    <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-md px-1.5 py-0.5 tabular whitespace-nowrap">
      {rank}位
    </span>
  );
}

/* ── 順位による行スタイル ── */
const RANK_ROW_STYLE = {
  1: { background: "linear-gradient(90deg,rgba(251,191,36,.12),rgba(251,191,36,.04))", borderLeft: "3px solid #f59e0b" },
  2: { background: "linear-gradient(90deg,rgba(148,163,184,.10),rgba(148,163,184,.03))", borderLeft: "3px solid #94a3b8" },
  3: { background: "linear-gradient(90deg,rgba(249,115,22,.10),rgba(249,115,22,.03))", borderLeft: "3px solid #f97316" },
};

/* ── 達成率バー ── */
function RateBar({ rate }) {
  const clamped = Math.min(rate, 150);
  const pct     = (clamped / 150) * 100;
  const grad    = rate >= 100
    ? "linear-gradient(90deg,#059669,#10b981)"
    : rate >= 50
    ? "linear-gradient(90deg,#d97706,#f59e0b)"
    : "linear-gradient(90deg,#dc2626,#ef4444)";
  const textCls = rate >= 100 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: grad }}
        />
      </div>
      <span className={`text-[11px] font-black w-10 text-right tabular ${textCls}`}>
        {rate}%
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   折半クレジットルール
   ・IS = FS（同一人物）         → 金額100% / 件数1.0
   ・IS ≠ FS（別人、両方set）    → 金額50%  / 件数0.5
   ・IS か FS どちらか片方のみ   → 金額100% / 件数1.0
────────────────────────────────────────────────────────── */
const getDealCredit = (deal, memberName) => {
  const isMe = deal.is === memberName;
  const fsMe = deal.fs === memberName;
  if (!isMe && !fsMe) return 0;
  /* 両方 set かつ別人 → 折半 */
  if (deal.is && deal.fs && deal.is !== deal.fs) return 0.5;
  /* 同一人物 or 片方のみ → 全額 */
  return 1.0;
};

/* 件数の表示フォーマット（0.5刻みを小数第1位まで、整数なら整数表示） */
const fmtCount = (n) => {
  const r = Math.round(n * 10) / 10;
  return r % 1 === 0 ? String(r | 0) : r.toFixed(1);
};

/* ── メイン ── */
export default function StatsView() {
  const { deals, members } = useApp();

  const [teamFilter, setTeamFilter] = useState("全体");
  const [sortKey,    setSortKey]    = useState("kaishu");
  const [sortDir,    setSortDir]    = useState("desc");

  const handleSort = (col) => {
    if (sortKey === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(col); setSortDir("desc"); }
  };

  /* 表示メンバー（admin除外） */
  const visibleMembers = useMemo(() => {
    const base = members.filter((m) => m.role !== "admin" && m.status === "active");
    if (teamFilter === "全体") return base;
    return base.filter((m) => m.team === teamFilter);
  }, [members, teamFilter]);

  /* 各メンバーの集計（IS/FS折半ロジック適用） */
  const rows = useMemo(() => {
    return visibleMembers.map((m) => {
      const myDeals = deals.filter((d) => d.is === m.name || d.fs === m.name);

      /* 回収額: 確度=回収の案件のみ、折半クレジットを乗算 */
      const kaishu = myDeals
        .filter((d) => d.confidence === "回収")
        .reduce((s, d) => s + (d.amount || 0) * getDealCredit(d, m.name), 0);

      /* アグレッシブ合計: 70%+回収、折半クレジットを乗算 */
      const aggressive = myDeals
        .filter((d) => d.confidence === "70%" || d.confidence === "回収")
        .reduce((s, d) => s + (d.amount || 0) * getDealCredit(d, m.name), 0);

      /* パイプライン件数: 折半クレジットを件数として加算（0.5件になりうる） */
      const pipeline = myDeals
        .reduce((s, d) => s + getDealCredit(d, m.name), 0);

      const target = m.target ?? 0;
      const rate   = target > 0 ? Math.round((kaishu / target) * 100) : 0;
      return { m, target, kaishu, aggressive, pipeline, rate };
    });
  }, [visibleMembers, deals]);

  /* ソート */
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case "name":       va = a.m.name;  vb = b.m.name;  break;
        case "team":       va = a.m.team;  vb = b.m.team;  break;
        case "target":     va = a.target;  vb = b.target;  break;
        case "kaishu":     va = a.kaishu;  vb = b.kaishu;  break;
        case "rate":       va = a.rate;    vb = b.rate;    break;
        case "aggressive": va = a.aggressive; vb = b.aggressive; break;
        case "pipeline":   va = a.pipeline; vb = b.pipeline; break;
        default:           va = a.kaishu;  vb = b.kaishu;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  /* 回収額ランキング（ソート列に関わらず常に kaishu 降順で確定） */
  const rankMap = useMemo(() => {
    const byKaishu = [...rows].sort(
      (a, b) => b.kaishu - a.kaishu || b.rate - a.rate || b.pipeline - a.pipeline
    );
    return new Map(byKaishu.map((r, i) => [r.m.id, i + 1]));
  }, [rows]);

  /* チーム合計 */
  const totals = useMemo(() => ({
    target:     sorted.reduce((s, r) => s + r.target, 0),
    kaishu:     sorted.reduce((s, r) => s + r.kaishu, 0),
    aggressive: sorted.reduce((s, r) => s + r.aggressive, 0),
    pipeline:   sorted.reduce((s, r) => s + r.pipeline, 0),
  }), [sorted]);

  const avgRate = totals.target > 0 ? Math.round((totals.kaishu / totals.target) * 100) : 0;

  const shProps = { sortKey, sortDir, onSort: handleSort };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto fade-in">
      {/* チームフィルター */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">チーム</span>
        {TEAM_OPTS.map((t) => (
          <button
            key={t}
            onClick={() => setTeamFilter(t)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all outline-none"
            style={teamFilter === t
              ? { background: "#0070d2", color: "#fff", boxShadow: "0 2px 8px -2px rgba(0,112,210,.35)" }
              : { background: "#fff", color: "#64748b", border: "1px solid #dddbda" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "目標合計",       val: fmtAmt(totals.target),     color: "#64748b" },
          { label: "回収合計",       val: fmtAmt(totals.kaishu),     color: "#059669" },
          { label: "達成率（平均）", val: avgRate + "%",              color: avgRate >= 100 ? "#059669" : avgRate >= 50 ? "#d97706" : "#dc2626" },
          { label: "パイプライン",   val: totals.pipeline + " 件",   color: "#4f46e5" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-4 card-shadow">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="text-2xl font-black tabular leading-none" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200" style={{ background: "#f8fafc" }}>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center w-12">順位</th>
                <SortTh label="名前"           col="name"       {...shProps} />
                <SortTh label="チーム"         col="team"       {...shProps} />
                <SortTh label="目標"           col="target"     {...shProps} right />
                <SortTh label="回収額"         col="kaishu"     {...shProps} right />
                <SortTh label="達成率"         col="rate"       {...shProps} />
                <SortTh label="アグレッシブ計" col="aggressive" {...shProps} right />
                <SortTh label="パイプライン"   col="pipeline"   {...shProps} right />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                    メンバーが見つかりません
                  </td>
                </tr>
              )}
              {sorted.map(({ m, target, kaishu, aggressive, pipeline, rate }) => {
                const rank     = rankMap.get(m.id) ?? 99;
                const rankStyle = RANK_ROW_STYLE[rank] ?? {};
                const isTop3   = rank <= 3;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 last:border-0 transition-colors hover:brightness-[.97]"
                    style={rankStyle}
                  >
                    {/* 順位セル */}
                    <td className="px-3 py-3 text-center w-12">
                      <RankBadge rank={rank} />
                    </td>

                    {/* 名前 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex-none flex items-center justify-center text-white text-[11px] font-black"
                          style={{
                            width: isTop3 ? 30 : 28,
                            height: isTop3 ? 30 : 28,
                            borderRadius: "50%",
                            background: m.role === "leader" ? "#f97316" : m.role === "FS" ? "#059669" : "#0891b2",
                            boxShadow: rank === 1 ? "0 0 0 2px #f59e0b, 0 0 8px rgba(245,158,11,.35)"
                                      : rank === 2 ? "0 0 0 2px #94a3b8"
                                      : rank === 3 ? "0 0 0 2px #f97316"
                                      : "none",
                          }}
                        >
                          {m.name[0]}
                        </div>
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: rank === 1 ? "#92400e" : rank <= 3 ? "#1e293b" : "#475569", fontWeight: isTop3 ? 700 : 600 }}
                        >
                          {m.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-md px-2 py-0.5">{m.team}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm text-slate-500 tabular">{fmtAmt(target)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`tabular font-black ${kaishu > 0 ? "text-emerald-600" : "text-slate-300"} ${isTop3 ? "text-base" : "text-sm"}`}>
                        {fmtAmt(kaishu)}
                      </span>
                    </td>
                    <td className="px-3 py-3 w-40">
                      <RateBar rate={rate} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-sm font-bold tabular ${aggressive > 0 ? "text-indigo-600" : "text-slate-300"}`}>
                        {fmtAmt(aggressive)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-[13px] font-semibold text-slate-600 tabular">{fmtCount(pipeline)} 件</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {sorted.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200" style={{ background: "#f8fafc" }}>
                  <td className="px-4 py-3 text-[11px] font-black text-slate-500" colSpan={3}>合計 / 平均</td>
                  <td className="px-3 py-3 text-right text-sm font-black text-slate-700 tabular">{fmtAmt(totals.target)}</td>
                  <td className="px-3 py-3 text-right text-sm font-black text-emerald-600 tabular">{fmtAmt(totals.kaishu)}</td>
                  <td className="px-3 py-3"><RateBar rate={avgRate} /></td>
                  <td className="px-3 py-3 text-right text-sm font-black text-indigo-600 tabular">{fmtAmt(totals.aggressive)}</td>
                  <td className="px-3 py-3 text-right text-sm font-black text-slate-700 tabular">{fmtCount(totals.pipeline)} 件</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-4 tracking-wide">
        ※ アグレッシブ計 = 70%＋回収の合計　｜　パイプライン = 担当案件の総数
      </p>
    </div>
  );
}
