/**
 * SimilarDealsPanel.jsx
 *
 * 「類似企業あり」バッジを押したときに表示されるパネル。
 * ┌─────────────────────────────┐
 * │ この案件（削除ボタンなし）   │  ← バッジを押した元の案件
 * ├─────────────────────────────┤
 * │ 類似企業の案件 N件           │
 * │  会社名 / 期間 / チーム / ¥  🗑 │  ← 削除可
 * └─────────────────────────────┘
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { fmtAmt, isSimilarCompanyName } from "../utils/index.js";
import { TeamBadge, ConfBadge } from "./ui/Badges.jsx";
import Confirm from "./ui/Confirm.jsx";

/* ── 案件1行 ── */
function DealItem({ d, onDelete }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl
      bg-slate-50 border border-slate-200
      hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">
          {d.company}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] text-slate-400 font-medium">{d.period}</span>
          <TeamBadge team={d.team} />
          <ConfBadge conf={d.confidence} />
        </div>
        {(d.is || d.fs) && (
          <div className="flex gap-1.5 mt-0.5">
            {d.is && <span className="text-[10px] text-cyan-700 font-semibold">IS {d.is}</span>}
            {d.fs && <span className="text-[10px] text-emerald-700 font-semibold">FS {d.fs}</span>}
          </div>
        )}
      </div>
      <span className="text-sm font-black text-slate-700 tabular shrink-0">
        {fmtAmt(d.amount)}
      </span>
      {onDelete && (
        <button
          onClick={() => onDelete(d.id)}
          title="この案件を削除"
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl
            bg-red-50 hover:bg-red-100 text-red-500 transition border border-red-200"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * @param {Object}   deal    - バッジを押した元の案件（削除不可）
 * @param {Function} onClose
 */
export default function SimilarDealsPanel({ deal, onClose }) {
  const { deals, deleteDeal } = useApp();
  const [confirmId, setConfirmId] = useState(null);

  /* 元案件の String 化した ID（型ズレを防ぐ） */
  const originId = String(deal.id);

  /* 全期間から類似企業名を持つ案件を抽出（元案件自身を厳密に除外） */
  const similars = deals.filter(
    d => String(d.id) !== originId && isSimilarCompanyName(deal.company || "", d.company || "")
  );

  const confirmDeal = similars.find(d => String(d.id) === String(confirmId));

  const execDelete = () => {
    /* 安全ガード: 元案件は絶対に削除しない */
    if (String(confirmId) === originId) {
      setConfirmId(null);
      return;
    }
    deleteDeal(confirmId);
    setConfirmId(null);
  };

  return createPortal(
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-[50]"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      {/* パネル本体 */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51]
          w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">類似企業の案件</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              類似する案件 {similars.length} 件を削除できます
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

          {/* この案件（削除不可） */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              この案件（削除不可）
            </p>
            <div className="opacity-60 pointer-events-none">
              <DealItem d={deal} />
            </div>
          </div>

          {/* 類似企業の案件（削除可） */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
              類似企業の案件（削除可）
            </p>
            {similars.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm rounded-xl border-2 border-dashed border-slate-200">
                類似企業の案件はありません
              </div>
            ) : (
              <div className="space-y-2">
                {similars.map(d => (
                  <DealItem key={d.id} d={d} onDelete={setConfirmId} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {confirmId !== null && confirmDeal && (
        <Confirm
          message={`「${confirmDeal.company}」を削除しますか？\n削除したデータは復元できません。`}
          danger
          okLabel="削除する"
          onOk={execDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>,
    document.body
  );
}
