import { AlertTriangle } from "lucide-react";

export default function Confirm({ message, onOk, onCancel, okLabel = "はい", danger = false }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-100" : "bg-blue-100"}`}>
          <AlertTriangle size={22} className={danger ? "text-red-500" : "text-blue-500"} />
        </div>
        <p className="text-sm text-gray-700 font-medium mb-5 whitespace-pre-line">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={onOk}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition ${danger ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
