import { useState, useMemo, useRef } from "react";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt, isNeglected, getDealCredit } from "../../utils/index.js";
import { CONF, CTW, THEX, REAL_TEAMS } from "../../constants/index.js";

/* チーム順ソートのインデックス（REAL_TEAMS 基準） */
const teamIdx = (team) => {
  const i = REAL_TEAMS.indexOf(team);
  return i === -1 ? 99 : i;
};
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

      {/* 行2: 企業名 ＋ プラン */}
      <div className="flex items-baseline gap-1 mb-0.5 min-w-0">
        <p
          className="text-[11px] font-bold text-slate-800 leading-tight truncate cursor-pointer hover:text-blue-600 transition-colors flex-1 min-w-0"
          onClick={() => onDetail && onDetail(deal)}
        >
          {deal.company}
        </p>
        {deal.plan && (
          <span className="text-[8px] font-semibold text-slate-400 whitespace-nowrap shrink-0 leading-none">
            {deal.plan}
          </span>
        )}
      </div>
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

/* ── 達成グラフパネル ── */
const CONF_HEX = { "30%":"#f59e0b", "50%":"#3b82f6", "70%":"#10b981", "回収":"#8b5cf6" };
const CONF_ORDER_REV = ["回収","70%","50%","30%"];

function AchievePanel({ filtered, target, isMyTab, myName }) {
  const byConf = useMemo(() => {
    const acc = { "30%":0, "50%":0, "70%":0, "回収":0 };
    filtered.forEach(d => {
      const credit = isMyTab ? getDealCredit(d, myName) : 1.0;
      acc[d.confidence] = (acc[d.confidence] || 0) + (d.amount || 0) * credit;
    });
    return acc;
  }, [filtered, isMyTab, myName]);

  const kaishu  = byConf["回収"]  || 0;
  const conserv = (byConf["70%"] || 0) + kaishu;
  const aggress = (byConf["50%"] || 0) + conserv;
  const total   = Object.values(byConf).reduce((a,b)=>a+b,0);

  const pct = (n) => target > 0 ? Math.min(Math.round((n / target) * 100), 999) : 0;
  const bar = (n) => Math.min(pct(n), 100);

  const rows = [
    { label:"受注",           amt:kaishu,  hex:"#8b5cf6" },
    { label:"コンサバ 70%以上", amt:conserv, hex:"#6366f1" },
    { label:"アグレッシブ 50%以上", amt:aggress, hex:"#0ea5e9" },
  ];

  return (
    <div className="w-60 shrink-0 bg-white rounded-2xl card-shadow p-4 flex flex-col gap-3 self-start sticky top-[182px]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">達成状況</p>

      {/* 目標金額 */}
      {target > 0 && (
        <div className="text-center py-2 bg-slate-50 rounded-xl">
          <p className="text-[9px] text-slate-400 mb-0.5">目標</p>
          <p className="text-lg font-black text-slate-700 tabular">{fmtAmt(target)}</p>
        </div>
      )}

      {/* 達成率バー群 */}
      <div className="space-y-3">
        {rows.map(({ label, amt, hex }) => (
          <div key={label}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[10px] font-semibold text-slate-600 leading-tight">{label}</span>
              <span className="text-[11px] font-black tabular" style={{ color: hex }}>{fmtAmt(amt)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${bar(amt)}%`, background: hex }}
              />
            </div>
            {target > 0 && (
              <p className="text-[9px] text-slate-400 mt-0.5 tabular text-right">{pct(amt)}%</p>
            )}
          </div>
        ))}
      </div>

      {/* 確度別内訳 */}
      <div className="border-t border-slate-100 pt-3 space-y-1.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">確度別</p>
        {CONF_ORDER_REV.map(c => (
          <div key={c} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CONF_HEX[c] }} />
            <span className="text-[10px] text-slate-500 flex-1">{c}</span>
            <span className="text-[11px] font-bold tabular" style={{ color: CONF_HEX[c] }}>{fmtAmt(byConf[c] || 0)}</span>
            <span className="text-[9px] text-slate-300 tabular w-8 text-right">
              {filtered.filter(d => d.confidence === c).length}件
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-500">合計</span>
          <span className="text-[12px] font-black text-slate-700 tabular">{fmtAmt(total)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── メインコンポーネント ── */
export default function KanbanView() {
  const { deals, updateDeal, members, currentUser, activeTab, searchQuery, activePeriods } = useApp();
  const myName = currentUser?.name ?? "";
  const isMyTab = activeTab === "マイ";

  const [draggedId,   setDraggedId]   = useState(null);
  const draggedIdRef = useRef(null); /* stale closure 対策: state と並行管理 */
  const [dragOverCol, setDragOverCol] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [detailDeal,  setDetailDeal]  = useState(null);

  const filtered = useMemo(() => {
    const pdDeals = deals.filter(d => activePeriods.includes(d.period));
    let ds = filterByTab(pdDeals, activeTab, myName);
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
  const handleDragStart = (e, id) => {
    draggedIdRef.current = id;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };
  const handleDragEnd   = () => { draggedIdRef.current = null; setDraggedId(null); setDragOverCol(null); };
  const handleDragOver  = (e, c) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(c); };
  const handleDragLeave = (e)    => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragOverCol(null); };

  const handleDrop = (e, toConf) => {
    e.preventDefault();
    setDragOverCol(null);
    /* ref → dataTransfer → state の順で ID を取得（型は文字列統一で比較） */
    const rawId = String(draggedIdRef.current ?? e.dataTransfer.getData("text/plain") ?? draggedId ?? "");
    if (!rawId) return;
    const deal = deals.find((d) => String(d.id) === rawId);
    if (!deal || deal.confidence === toConf) { setDraggedId(null); draggedIdRef.current = null; return; }
    setPendingMove({ dealId: deal.id, fromConf: deal.confidence, toConf, dealName: deal.company });
    setDraggedId(null);
    draggedIdRef.current = null;
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    updateDeal(pendingMove.dealId, { confidence: pendingMove.toConf });
    setPendingMove(null);
  };

  /* 目標: マイタブ → 個人目標 / チームタブ → チーム合計 */
  const teamTarget = useMemo(() => {
    if (isMyTab) return currentUser?.target || 0;
    return members
      .filter(m => m.role !== "admin" && m.status === "active" &&
        (activeTab === "全体" || m.team === activeTab ||
         (activeTab === "鈴木Tプレ" && (m.team === "杉山T" || m.team === "鈴木T"))))
      .reduce((s, m) => s + (m.target || 0), 0);
  }, [members, activeTab, currentUser, isMyTab]);

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

      {/* カンバン ＋ 達成グラフ */}
      <div className="flex gap-4 items-start">

      {/* 4列ボード（各列内をチーム順に並べる） */}
      <div className="flex-1 grid grid-cols-4 gap-2.5" style={{ minWidth: 0 }}>
        {COLS.map((conf) => (
          <KanbanCol
            key={conf}
            conf={conf}
            deals={filtered
              .filter((d) => d.confidence === conf)
              .sort((a, b) => teamIdx(a.team) - teamIdx(b.team))}
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

      {/* 達成グラフパネル */}
      <AchievePanel
        filtered={filtered}
        target={teamTarget}
        isMyTab={isMyTab}
        myName={myName}
      />

      </div>{/* flex wrapper end */}

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
