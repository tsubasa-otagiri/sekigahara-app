import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

export default function RequestModal({ onClose }) {
  const { currentUser, requests, addRequest, resolveRequest } = useApp();

  /* 管理者 or 小田切（チームリーダー）が管理画面を見られる */
  const canManage = currentUser?.role === "admin" || currentUser?.name === "小田切";

  const [tab,     setTab]     = useState("submit");   // "submit" | "manage"
  const [content, setContent] = useState("");
  const [sent,    setSent]    = useState(false);

  /* スクロールロック */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Escape */
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSend = () => {
    if (!content.trim()) return;
    addRequest(content.trim());
    setContent("");
    setSent(true);
    setTimeout(() => { setSent(false); onClose(); }, 1800);
  };

  /* 未対応件数 */
  const pendingCount = requests.filter(r => r.status === "未対応").length;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base"
              style={{ background: "#0070d2" }}>💬</div>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-none">要望・ご意見</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">機能の改善・追加要望をお送りください</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>

        {/* タブ（管理者のみ） */}
        {canManage && (
          <div className="flex border-b border-slate-100 shrink-0">
            <button
              onClick={() => setTab("submit")}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition
                ${tab === "submit" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40" : "text-slate-500 hover:bg-slate-50"}`}
            >
              要望を送る
            </button>
            <button
              onClick={() => setTab("manage")}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition flex items-center justify-center gap-1.5
                ${tab === "manage" ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/40" : "text-slate-500 hover:bg-slate-50"}`}
            >
              届いた要望
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">

          {/* ── 送信タブ ── */}
          {tab === "submit" && (
            <div className="px-6 py-5">
              {sent ? (
                /* 送信完了メッセージ */
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <CheckCircle size={44} className="text-emerald-500" />
                  <p className="text-base font-bold text-slate-700">ご要望を送信しました！</p>
                  <p className="text-xs text-slate-400">ありがとうございます。確認後に対応いたします。</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    要望があればこちらに記載ください。<br />
                    <span className="text-[11px] text-slate-400">機能の改善・追加・不具合報告などなんでもお気軽にどうぞ。</span>
                  </p>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={6}
                    placeholder="例: カンバン画面でフィルター機能が欲しい&#10;例: ○○が使いにくいので改善してほしい"
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-3 resize-none
                      focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[11px] text-slate-400">{content.length} 文字</p>
                    <button
                      onClick={handleSend}
                      disabled={!content.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold
                        disabled:opacity-40 transition hover:brightness-110 active:scale-[0.98]"
                      style={{ background: "#0070d2" }}
                    >
                      <Send size={14} />
                      送信
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 管理タブ（管理者のみ） ── */}
          {tab === "manage" && canManage && (
            <div className="px-6 py-4 space-y-3">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <MessageSquare size={36} className="mb-3 opacity-30" />
                  <p className="text-sm">まだ要望はありません</p>
                </div>
              ) : (
                requests.map(r => (
                  <div
                    key={r.id}
                    className={`rounded-xl border p-4 space-y-2 transition
                      ${r.status === "対応済" ? "bg-slate-50 border-slate-200 opacity-70" : "bg-white border-blue-200"}`}
                  >
                    {/* メタ情報 */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-700">{r.user}</span>
                        <span className="text-[10px] text-slate-400">{fmtDate(r.createdAt)}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 flex items-center gap-1
                          ${r.status === "対応済"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"}`}
                      >
                        {r.status === "対応済"
                          ? <><CheckCircle size={10} /> 対応済</>
                          : <><Clock size={10} /> 未対応</>
                        }
                      </span>
                    </div>

                    {/* 内容 */}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{r.content}</p>

                    {/* 対応完了ボタン */}
                    {r.status === "未対応" && (
                      <div className="pt-1">
                        <button
                          onClick={() => resolveRequest(r.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold
                            text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          <CheckCircle size={12} />
                          対応完了にする
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
