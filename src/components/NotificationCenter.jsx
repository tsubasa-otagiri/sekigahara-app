import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "たった今";
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}時間前`;
  return `${Math.floor(hr / 24)}日前`;
}

const TYPE_ICON = {
  task_add:      { emoji: "✅", color: "#059669" },
  task_deadline: { emoji: "⏰", color: "#d97706" },
  task_overdue:  { emoji: "🔴", color: "#ef4444" },
};

export default function NotificationCenter() {
  const { notifLogs, markNotifRead, markAllNotifsRead, clearNotifLogs } = useApp();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unread = notifLogs.filter(n => !n.isRead).length;

  /* パネル外クリックで閉じる */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* 🔔 ボタン */}
      <button
        onClick={() => setOpen(o => !o)}
        title="通知センター"
        className="relative flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl
          transition-all active:scale-95 hover:bg-blue-50"
        style={{
          color: "#0070d2",
          border: "1.5px solid #0070d2",
          background: open ? "#eff6ff" : "#fff",
        }}
      >
        <Bell size={13} strokeWidth={2.5} />
        <span className="hidden sm:inline">通知</span>
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center
              text-[9px] font-black text-white rounded-full px-1 leading-none"
            style={{ background: "#ef4444", boxShadow: "0 0 0 2px #fff" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* ドロップダウンパネル */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl z-[80] flex flex-col overflow-hidden"
          style={{ border: "1px solid #e2e8f0", boxShadow: "0 8px 32px -4px rgba(0,0,0,.18)" }}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"
            style={{ background: "#0070d2" }}>
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-white" />
              <span className="text-[12px] font-black text-white">通知センター</span>
              {unread > 0 && (
                <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {unread}件未読
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-0.5">
              <X size={14} />
            </button>
          </div>

          {/* アクションバー */}
          {notifLogs.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <button
                onClick={markAllNotifsRead}
                className="flex items-center gap-1 text-[10px] font-bold text-[#0070d2] hover:text-blue-700 transition-colors"
              >
                <CheckCheck size={12} /> すべて既読
              </button>
              <button
                onClick={clearNotifLogs}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} /> 全削除
              </button>
            </div>
          )}

          {/* 通知リスト */}
          <div className="flex-1 overflow-y-auto max-h-[360px]">
            {notifLogs.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">通知はありません</p>
              </div>
            ) : (
              notifLogs.map(n => {
                const ti = TYPE_ICON[n.type] || { emoji: "🔔", color: "#64748b" };
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 transition-colors
                      ${n.isRead ? "bg-white" : "bg-blue-50/40"}`}
                  >
                    {/* アイコン */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                      style={{ background: ti.color + "18" }}>
                      <span>{ti.emoji}</span>
                    </div>

                    {/* 本文 */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] leading-snug ${n.isRead ? "text-slate-500" : "text-slate-800 font-semibold"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[9px] text-slate-300 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* 既読ボタン */}
                    {!n.isRead && (
                      <button
                        onClick={() => markNotifRead(n.id)}
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors
                          bg-blue-100 hover:bg-blue-200 text-blue-500"
                        title="既読にする"
                      >
                        <Check size={10} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
