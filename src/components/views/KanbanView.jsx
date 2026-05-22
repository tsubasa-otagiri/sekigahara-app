import { useState, useMemo } from "react";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt, isNeglected } from "../../utils/index.js";
import { CONF, CTW } from "../../constants/index.js";
import { TeamBadge } from "../ui/Badges.jsx";
import Confirm from "../ui/Confirm.jsx";
import DealDetailModal from "../DealDetailModal.jsx";

const COLS = CONF; // ["30%","50%","70%","回収"]

/*
  列ごとの独立スクロールに使う高さ
  ヘッダー(56) + チームタブ(48) + ビューナビ(36) + ページ上余白(16) + カンバンヘッダー行(44) ≈ 200
  下部余白も少し取って 210px をオフセットに使用
*/
const COL_BODY_H = "calc(100vh - 250px)";

/* ── 案件カード ── */
function DealCard({ deal, isDragging, onDragStart, onDragEnd, onDetail }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-lg border border-slate-200 px-2 py-1.5 select-none transition-all
        cursor-grab active:cursor-grabbing
        ${isDragging
          ? "opacity-25 rotate-1 scale-95 shadow-none"
          : "shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-px"
        }`}
    >
      {/* 行1: チームバッジ ＋ 金額 */}
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <TeamBadge team={deal.team} />
        <span className="text-[10px] font-black text-slate-700 whitespace-nowrap tabular shrink-0">
          {fmtAmt(deal.amount)}
        </span>
      </div>

      {/* 行2: 企業名 */}
      <p
        className="text-[11px] font-bold text-slate-800 leading-tight truncate mb-0.5 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={() => onDetail && onDetail(deal)}
      >
        {deal.company}
      </p>
      {isNeglected(deal) && (
        <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5">
          🔥 放置注意
        </span>
      )}

      {/* 行3: IS / FS */}
      {(deal.is || deal.fs) && (
        <div className="flex gap-1 min-w-0">
          {deal.is && (
            <span className="inline-flex shrink-0 items-center text-[9px] font-semibold
              bg-cyan-50 text-cyan-700 border border-cyan-200 rounded px-1 py-px leading-none">
              IS {deal.is}
            </span>
          )}
          {deal.fs && (
            <span className="inline-flex shrink-0 items-center text-[9px] font-semibold
              bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1 py-px leading-none">
              FS {deal.fs}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── カンバン列 ── */
function KanbanCol({
  conf, deals, draggedId, dragOverCol,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onDetail,
}) {
  const tw     = CTW[conf] ?? CTW["30%"];
  const isOver = dragOverCol === conf;
  const total  = deals.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-all duration-150 min-w-0 min-h-0
        ${isOver ? `${tw.bd} shadow-xl` : "border-slate-200"}`}
      onDragOver={(e) => onDragOver(e, conf)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, conf)}
    >
      {/* ── 列ヘッダー（固定表示） ── */}
      <div
        className={`shrink-0 px-3 py-2 rounded-t-[10px] ${tw.hd}
          border-b-2 ${isOver ? tw.bd : "border-slate-100"}
          flex items-center justify-between`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full flex-none ${tw.dot}`} />
          <span className={`text-[11px] font-black ${tw.txt}`}>{conf}</span>
          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border tabular
            ${tw.bd} ${tw.bg} ${tw.txt}`}>
            {deals.length}
          </span>
        </div>
        <span className={`text-[11px] font-black ${tw.txt} tabular`}>{fmtAmt(total)}</span>
      </div>

      {/* ── カードリスト（独立スクロール） ── */}
      <div
        className={`p-1.5 space-y-1 overflow-y-auto rounded-b-[10px] transition-colors
          ${isOver ? tw.bg : "bg-slate-50/50"}`}
        style={{
          height: COL_BODY_H,
          minHeight: 200,
          /* Firefox 細スクロールバー */
          scrollbarWidth: "thin",
          scrollbarColor: "#e2e8f0 transparent",
        }}
      >
        {deals.length === 0 ? (
          <div
            className={`flex items-center justify-center py-8 text-[11px] font-medium
              rounded-lg border-2 border-dashed transition-colors
              ${isOver ? `${tw.bd} ${tw.txt}` : "border-slate-200 text-slate-300"}`}
          >
            {isOver ? "ここにドロップ" : "案件なし"}
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isDragging={draggedId === deal.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDetail={onDetail}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── メインコンポーネント ── */
export default function KanbanView() {
  const { deals, updateDeal, activeTab, searchQuery, activePeriods } = useApp();

  const [draggedId,   setDraggedId]   = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [detailDeal,  setDetailDeal]  = useState(null);

  const filtered = useMemo(() => {
    const pdDeals = deals.filter(d => activePeriods.includes(d.period));
    let ds = filterByTab(pdDeals, activeTab);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      ds = ds.filter((d) =>
        d.company.toLowerCase().includes(q) ||
        (d.is   ?? "").toLowerCase().includes(q) ||
        (d.fs   ?? "").toLowerCase().includes(q) ||
        (d.team ?? "").toLowerCase().includes(q)
      );
    }
    return ds;
  }, [deals, activeTab, searchQuery, activePeriods]);

  /* ── DnD ── */
  const handleDragStart  = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(id)); };
  const handleDragEnd    = ()      => { setDraggedId(null); setDragOverCol(null); };
  const handleDragOver   = (e, c) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(c); };
  const handleDragLeave  = (e)    => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragOverCol(null); };

  const handleDrop = (e, toConf) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedId) return;
    const deal = deals.find((d) => d.id === draggedId);
    if (!deal || deal.confidence === toConf) { setDraggedId(null); return; }
    setPendingMove({ dealId: draggedId, fromConf: deal.confidence, toConf, dealName: deal.company });
    setDraggedId(null);
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    updateDeal(pendingMove.dealId, { confidence: pendingMove.toConf });
    setPendingMove(null);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* タイトルバー */}
      <div className="flex items-center gap-2 mb-2.5">
        <h2 className="text-sm font-bold text-slate-700">{activeTab} — カンバン</h2>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
          {filtered.length} 件
        </span>
        <span className="text-[11px] text-slate-400 ml-auto hidden sm:block select-none">
          カードをドラッグして列を移動
        </span>
      </div>

      {/* 4列ボード・横幅フル */}
      <div className="grid grid-cols-4 gap-2.5 w-full" style={{ minWidth: 600 }}>
        {COLS.map((conf) => (
          <KanbanCol
            key={conf}
            conf={conf}
            deals={filtered.filter((d) => d.confidence === conf)}
            draggedId={draggedId}
            dragOverCol={dragOverCol}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDetail={setDetailDeal}
          />
        ))}
      </div>

      {pendingMove && (
        <Confirm
          message={`「${pendingMove.dealName}」を\n確度 ${pendingMove.fromConf} → ${pendingMove.toConf} へ移動しますか？`}
          okLabel="移動する"
          onOk={confirmMove}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {detailDeal && (
        <DealDetailModal deal={detailDeal} onClose={() => setDetailDeal(null)} />
      )}
    </div>
  );
}
