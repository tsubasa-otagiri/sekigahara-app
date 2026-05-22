import { useState } from "react";
import { X, Plus, MessageSquare, Phone, Mail, FileText, Users, Clock } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { ACTIVITY_TYPES, YOMI_COLOR, YOMI_WEIGHT } from "../constants/index.js";
import { fmtAmt, isNeglected } from "../utils/index.js";

const TYPE_ICON = {
  "商談": <Users size={12} />,
  "電話": <Phone size={12} />,
  "メール": <Mail size={12} />,
  "提案書提出": <FileText size={12} />,
  "社内MTG": <MessageSquare size={12} />,
  "その他": <Clock size={12} />,
};

export default function DealDetailModal({ deal, onClose }) {
  const { addActivity } = useApp();
  const [type, setType]   = useState("商談");
  const [memo, setMemo]   = useState("");

  if (!deal) return null;

  const yomi     = deal.yomi || "Bヨミ";
  const weight   = YOMI_WEIGHT[yomi] ?? 0.5;
  const weighted = (deal.amount || 0) * weight;
  const neglect  = isNeglected(deal);

  const sorted = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const handleAdd = () => {
    if (!memo.trim()) return;
    addActivity(deal.id, { type, memo: memo.trim() });
    setMemo("");
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.5)"}}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

        {/* ヘッダー */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-800 truncate">{deal.company}</h2>
              {neglect && (
                <span className="text-[10px] font-bold bg-red-100 text-red-500 border border-red-200 rounded-full px-2 py-0.5 shrink-0">
                  🔥 放置注意
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-500">{deal.team} / {deal.plan}</span>
              <span className="text-xs font-black text-slate-700">{fmtAmt(deal.amount)}</span>
              <span
                className="text-[10px] font-bold rounded-full px-2 py-0.5 text-white"
                style={{background: YOMI_COLOR[yomi] || "#94a3b8"}}
              >{yomi}</span>
              <span className="text-xs text-emerald-600 font-semibold">
                着地: {fmtAmt(weighted)}（×{Math.round(weight*100)}%）
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition shrink-0">
            <X size={18}/>
          </button>
        </div>

        {/* 活動履歴リスト */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            活動履歴（{sorted.length}件）
          </p>
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">まだ活動履歴がありません</p>
          ) : sorted.map(a => (
            <div key={a.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="mt-0.5 text-slate-400 shrink-0">{TYPE_ICON[a.type] || <Clock size={12}/>}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">{a.type}</span>
                  <span className="text-[10px] text-slate-400">{fmtDate(a.date)}</span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{a.memo}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 活動追加フォーム */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          <div className="flex gap-2">
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="shrink-0 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400"
            >
              {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleAdd()}
              placeholder="活動内容を入力（Enter で追加）"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              onClick={handleAdd}
              disabled={!memo.trim()}
              className="shrink-0 p-1.5 rounded-lg text-white disabled:opacity-40 transition"
              style={{background:"#0070d2"}}
            >
              <Plus size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
