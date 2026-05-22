import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, MessageSquare, Phone, Mail, FileText, Users, Clock } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { ACTIVITY_TYPES, YOMI_COLOR, YOMI_WEIGHT } from "../constants/index.js";
import { fmtAmt, isNeglected } from "../utils/index.js";

const TYPE_ICON = {
  "商談":       <Users size={12} />,
  "電話":       <Phone size={12} />,
  "メール":     <Mail size={12} />,
  "提案書提出": <FileText size={12} />,
  "社内MTG":    <MessageSquare size={12} />,
  "その他":     <Clock size={12} />,
};

/* 今日の日付を "YYYY-MM-DD" で返す */
const todayStr = () => new Date().toISOString().split("T")[0];

/* "YYYY-MM-DD" → ローカル正午のISO文字列（タイムゾーンズレ防止） */
const dateStrToIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

/* ISO → "YYYY/MM/DD HH:MM"（正午入力=日付のみ表示） */
const fmtDate = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const date = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")}`;
  const h = dt.getHours(), mi = dt.getMinutes();
  return (h === 12 && mi === 0) ? date : `${date} ${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`;
};

/* 共通 input スタイル */
const INP = "text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition";

export default function DealDetailModal({ deal: dealProp, onClose }) {
  /* ── contextから最新の deal を常に参照（即時反映） ── */
  const { deals, addActivity, deleteActivity } = useApp();
  const deal = deals.find(d => d.id === dealProp.id) ?? dealProp;

  const [type, setType] = useState("商談");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayStr);

  /* ── スクロールロック ── */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* ── Escape で閉じる ── */
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!deal) return null;

  const yomi     = deal.yomi || "50%";
  const weight   = YOMI_WEIGHT[yomi] ?? 0.5;
  const weighted = (deal.amount || 0) * weight;
  const neglect  = isNeglected(deal);

  /* 日付降順（最新が先頭） */
  const sorted = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /* ── 活動追加 ── */
  const handleAdd = () => {
    if (!memo.trim()) return;
    addActivity(deal.id, {
      type,
      memo: memo.trim(),
      date: dateStrToIso(date),
    });
    setMemo("");
    setDate(todayStr());
  };

  /* ── 活動削除（確認あり） ── */
  const handleDelete = (actId) => {
    if (!window.confirm("この活動履歴を削除してもよろしいですか？")) return;
    deleteActivity(deal.id, actId);
  };

  return createPortal(
    /* ── オーバーレイ（背景クリックで閉じる） ── */
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── モーダル本体 ── */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ── ヘッダー ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
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
                style={{ background: YOMI_COLOR[yomi] || "#94a3b8" }}
              >{yomi}</span>
              <span className="text-xs text-emerald-600 font-semibold">
                着地: {fmtAmt(weighted)}（×{Math.round(weight * 100)}%）
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* ── 活動履歴リスト（スクロール可） ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            活動履歴（{sorted.length}件）
          </p>
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">まだ活動履歴がありません</p>
          ) : sorted.map(a => (
            <div key={a.id} className="group flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 transition-colors">
              <div className="mt-0.5 text-slate-400 shrink-0">{TYPE_ICON[a.type] || <Clock size={12} />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500">{a.type}</span>
                  <span className="text-[10px] text-slate-400">{fmtDate(a.date)}</span>
                </div>
                <p className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{a.memo}</p>
              </div>
              {/* 削除ボタン（ホバー時に表示） */}
              <button
                onClick={() => handleDelete(a.id)}
                className="shrink-0 self-start p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* ── 活動追加フォーム ── */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0">

          {/* 1行目: 種別 ＋ 日付 */}
          <div className="flex gap-2">
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className={`shrink-0 ${INP}`}
            >
              {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
              className={`shrink-0 ${INP}`}
            />
          </div>

          {/* 2行目: メモ ＋ 追加ボタン */}
          <div className="flex gap-2">
            <input
              value={memo}
              onChange={e => setMemo(e.target.value)}
              /* Enter キーでの暴発防止 — ボタンクリックのみで追加 */
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="活動内容を入力..."
              className={`flex-1 ${INP}`}
            />
            <button
              onClick={handleAdd}
              disabled={!memo.trim()}
              className="shrink-0 px-4 py-1.5 rounded-lg text-white text-xs font-bold
                disabled:opacity-40 transition active:scale-95 hover:brightness-110 whitespace-nowrap"
              style={{ background: "#0070d2" }}
            >
              追加
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
