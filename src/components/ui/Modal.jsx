import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ onClose, title, sub, maxW = "sm:max-w-lg", children }) {
  /* Escape キーで閉じる */
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white w-full overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[95vh] sm:max-h-[92vh] ${maxW}`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
