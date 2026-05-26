import { useState, useMemo } from "react";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt } from "../../utils/index.js";
import { TeamBadge, PlanBadge } from "../ui/Badges.jsx";
import DealDetailModal from "../DealDetailModal.jsx";

const TH_BASE = "px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap";

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
};

const lastActionDate = (deal) => {
  const acts = deal.activities;
  if (!acts || acts.length === 0) return "-";
  const latest = new Date(Math.max(...acts.map(a => new Date(a.date).getTime())));
  return `${latest.getMonth()+1}/${latest.getDate()}`;
};

export default function LostView() {
  const { deals, activeTab, searchQuery, activePeriods, currentUser } = useApp();
  const myName = currentUser?.name ?? "";

  const [detailDeal, setDetailDeal] = useState(null);

  const lostDeals = useMemo(() => {
    const pdDeals = deals.filter(d => activePeriods.includes(d.period));
    let ds = filterByTab(pdDeals, activeTab, myName);
    ds = ds.filter(d => d.phase === "失注");
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      ds = ds.filter(d =>
        d.company.toLowerCase().includes(q) ||
        (d.is  ?? "").toLowerCase().includes(q) ||
        (d.fs  ?? "").toLowerCase().includes(q) ||
        (d.team ?? "").toLowerCase().includes(q)
      );
    }
    /* 更新日降順 */
    return [...ds].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [deals, activeTab, searchQuery, activePeriods, myName]);

  const totalAmt = lostDeals.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* タイトルバー */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-bold text-slate-700">
          {activeTab} — 失注リスト
        </h2>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
          {lostDeals.length} 件
        </span>
        <span className="text-[11px] font-semibold text-red-400 bg-red-50 rounded-full px-2.5 py-0.5 ml-1">
          {fmtAmt(totalAmt)}
        </span>
      </div>

      {lostDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-4xl mb-3">✅</span>
          <p className="text-sm font-semibold">失注案件はありません</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className={TH_BASE}>企業名</th>
                  <th className={TH_BASE}>プラン</th>
                  <th className={`${TH_BASE} text-right`}>月額</th>
                  <th className={TH_BASE}>チーム</th>
                  <th className={TH_BASE}>IS / FS</th>
                  <th className={TH_BASE}>最終行動</th>
                  <th className={TH_BASE}>対象年月</th>
                </tr>
              </thead>
              <tbody>
                {lostDeals.map((deal, i) => (
                  <tr
                    key={deal.id}
                    onClick={() => setDetailDeal(deal)}
                    className={`cursor-pointer transition-colors hover:bg-red-50/60 border-b border-slate-50
                      ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                      {deal.company}
                    </td>
                    <td className="px-3 py-2">
                      {deal.plan && <PlanBadge plan={deal.plan} />}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-red-400 tabular whitespace-nowrap">
                      {fmtAmt(deal.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <TeamBadge team={deal.team} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                      {deal.is && <span className="text-cyan-700 font-semibold mr-1">IS {deal.is}</span>}
                      {deal.fs && <span className="text-emerald-700 font-semibold">FS {deal.fs}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-center whitespace-nowrap">
                      {lastActionDate(deal)}
                    </td>
                    <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                      {deal.period || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailDeal && (
        <DealDetailModal deal={detailDeal} onClose={() => setDetailDeal(null)} />
      )}
    </div>
  );
}
