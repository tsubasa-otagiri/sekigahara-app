/**
 * SimilarDealsPanel.jsx
 *
 * 「類似企業あり」バッジを押したときに表示されるパネル。
 * 対象案件と類似企業名を持つ全案件（全期間）を一覧し、
 * 確認後に削除できる。
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { fmtAmt } from "../utils/index.js";
import { TeamBadge, ConfBadge } from "./ui/Badges.jsx";
import Confirm from "./ui/Confirm.jsx";

/* ── 企業名正規化・類似判定（他ファイルと同一ロジック） ── */
const _PRE = /^(株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|特定非営利活動法人|ＮＰＯ法人|NPO法人|（株）|\(株\)|（有）|\(有\))/;
const _SUF = /(株式会社|有限会社|合同会社)$/;
const _strip = (s) => s.replace(_PRE, "").replace(_SUF, "").trim();
const _isSimilar = (a, b) => {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const na = _strip(a), nb = _strip(b);
  return na.length >= 2 && nb.length >= 2 && (na.includes(nb) || nb.includes(na));
};

/**
 * @param {Object} deal    - バッジを押した元の案件
 * @param {Function} onClose
 */
export default function SimilarDealsPanel({ deal, onClose }) {
  const { deals, deleteDeal } = useApp();
  const [confirmId, setConfirmId] = useState(null);

  /* 全期間から類似企業名を持つ案件を抽出（元案件自身を除く） */
  const similars = deals.filter(
    d => d.id !== deal.id && _isSimilar(deal.company || "", d.company || "")
  );

  const confirmDeal = similars.find(d => d.id === confirmId);

  const execDelete = () => {
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
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              「{deal.company}」と類似している案件 {similars.length} 件
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* リスト */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {similars.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              類似企業の案件はありません
            </div>
          ) : (
            similars.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl
                  bg-slate-50 border border-slate-200
                  hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
              >
                {/* 案件情報 */}
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

                {/* 月額 */}
                <span className="text-sm font-black text-slate-700 tabular shrink-0">
                  {fmtAmt(d.amount)}
                </span>

                {/* 削除ボタン */}
                <button
                  onClick={() => setConfirmId(d.id)}
                  title="削除"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl
                    bg-red-50 hover:bg-red-100 text-red-500 transition border border-red-200"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {confirmId && (
        <Confirm
          message={`「${confirmDeal?.company}」を削除しますか？\n削除したデータは復元できません。`}
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
