import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Pencil, Check, Ban, MessageSquare, Phone, Mail, FileText, Users, Clock } from "lucide-react";
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

const todayStr = () => new Date().toISOString().split("T")[0];

const dateStrToIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const date = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")}`;
  const h = dt.getHours(), mi = dt.getMinutes();
  return (h === 12 && mi === 0) ? date : `${date} ${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`;
};

/* 共通入力スタイル */
const INP = "text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition";

export default function DealDetailModal({ deal: dealProp, onClose }) {
  const { deals, addActivity, deleteActivity, updateActivity } = useApp();
  const deal = deals.find(d => d.id === dealProp.id) ?? dealProp;

  /* 新規追加フォーム */
  const [type, setType] = useState("商談");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(todayStr);

  /* インライン編集 */
  const [editingId,   setEditingId]   = useState(null);
  const [editMemo,    setEditMemo]    = useState("");

  /* スクロールロック */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Escape で閉じる（編集中は編集キャンセル優先） */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        if (editingId) { setEditingId(null); setEditMemo(""); }
        else onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose, editingId]);

  if (!deal) return null;

  const yomi     = deal.yomi || "50%";
  const weight   = YOMI_WEIGHT[yomi] ?? 0.5;
  const weighted = (deal.amount || 0) * weight;
  const neglect  = isNeglected(deal);

  /* 日付降順 */
  const sorted = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /* 追加 */
  const handleAdd = () => {
    if (!memo.trim()) return;
    addActivity(deal.id, { type, memo: memo.trim(), date: dateStrToIso(date) });
    setMemo("");
    setDate(todayStr());
  };

  /* 削除（確認あり） */
  const handleDelete = (actId) => {
    if (!window.confirm("この活動履歴を削除してもよろしいですか？")) return;
    deleteActivity(deal.id, actId);
    if (editingId === actId) { setEditingId(null); setEditMemo(""); }
  };

  /* 編集開始 */
  const startEdit = (act) => {
    setEditingId(act.id);
    setEditMemo(act.memo);
  };

  /* 保存 */
  const saveEdit = () => {
    if (!editMemo.trim()) return;
    updateActivity(deal.id, editingId, { memo: editMemo.trim() });
    setEditingId(null);
    setEditMemo("");
  };

  /* キャンセル */
  const cancelEdit = () => {
    setEditingId(null);
    setEditMemo("");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ヘッダー */}
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

        {/* 活動履歴リスト */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            活動履歴（{sorted.length}件）
          </p>

          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">まだ活動履歴がありません</p>
          ) : sorted.map(a => (
            <div key={a.id} className="group flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 transition-colors">
              {/* アイコン */}
              <div className="mt-0.5 text-slate-400 shrink-0">{TYPE_ICON[a.type] || <Clock size={12} />}</div>

              {/* 本文エリア */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[10px] font-bold text-slate-500">{a.type}</span>
                  <span className="text-[10px] text-slate-400">{fmtDate(a.date)}</span>
                </div>

                {editingId === a.id ? (
                  /* ── インライン編集モード ── */
                  <div className="space-y-1.5">
                    <textarea
                      value={editMemo}
                      onChange={e => setEditMemo(e.target.value)}
                      rows={3}
                      className={`w-full resize-y ${INP}`}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={saveEdit}
                        disabled={!editMemo.trim()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[11px] font-bold disabled:opacity-40 transition hover:brightness-110"
                        style={{ background: "#0070d2" }}
                      >
                        <Check size={11} /> 保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 text-[11px] font-bold transition hover:bg-slate-300"
                      >
                        <Ban size={11} /> キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── 通常表示（改行対応） ── */
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{a.memo}</p>
                )}
              </div>

              {/* 操作ボタン（ホバー時表示・編集中は非表示） */}
              {editingId !== a.id && (
                <div className="flex items-start gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => startEdit(a)}
                    className="p-1 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition"
                    title="編集"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                    title="削除"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 追加フォーム */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0">

          {/* 種別 + 日付 */}
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

          {/* メモ（textarea）+ 追加ボタン */}
          <div className="flex gap-2 items-end">
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              rows={3}
              placeholder="活動内容を入力...&#10;（Shift+Enter で改行、追加ボタンで登録）"
              className={`flex-1 resize-none ${INP}`}
            />
            <button
              onClick={handleAdd}
              disabled={!memo.trim()}
              className="shrink-0 px-4 py-1.5 rounded-lg text-white text-xs font-bold
                disabled:opacity-40 transition active:scale-95 hover:brightness-110 whitespace-nowrap mb-0.5"
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
