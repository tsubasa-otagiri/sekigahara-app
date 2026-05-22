import { createPortal } from "react-dom";
import { CheckCircle, X } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

export default function RequestNotif() {
  const { requestNotifs, dismissAllNotifs } = useApp();
  if (!requestNotifs || requestNotifs.length === 0) return null;

  return createPortal(
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] w-full max-w-sm px-4 space-y-2"
      style={{ pointerEvents: "none" }}
    >
      {requestNotifs.map(r => (
        <div
          key={r.id}
          className="flex items-start gap-3 bg-white rounded-2xl shadow-2xl border border-emerald-200 px-4 py-3"
          style={{ pointerEvents: "auto" }}
        >
          <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">ご要望が対応されました 🎉</p>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
              「{r.content.length > 40 ? r.content.slice(0, 40) + "…" : r.content}」
            </p>
          </div>
          <button
            onClick={dismissAllNotifs}
            className="shrink-0 text-slate-400 hover:text-slate-600 transition p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* 全て既読にするボタン（複数件のとき） */}
      {requestNotifs.length > 0 && (
        <div style={{ pointerEvents: "auto" }} className="flex justify-center">
          <button
            onClick={dismissAllNotifs}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition bg-white/80 rounded-full px-3 py-1 shadow"
          >
            通知を閉じる
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
