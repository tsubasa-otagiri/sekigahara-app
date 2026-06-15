import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
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
  kintai:        { emoji: "🔔", color: "#7c3aed" },
};

/* 通知 type → 設定カテゴリキーへのマッピング */
function notifCategory(type) {
  if (type === "task_add") return "notifTaskAssigned";
  if (type === "kintai")   return "notifKintai";
  if (type === "task_deadline" || type === "task_overdue") return "notifTaskReminder";
  return null; // 未知タイプは常に通常表示
}

export default function NotificationCenter() {
  const { notifLogs, markNotifRead, markAllNotifsRead, currentUser, currentUserId, getEffectiveNotifMode, userSettings } = useApp();
  const myName = currentUser?.name || "";
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  /* 種別ごとの実効モードを解決
     （管理者の全体設定が個人設定より優先 / 未知カテゴリは normal 扱い） */
  const modeOf = (n) => {
    const cat = notifCategory(n.type);
    return cat ? getEffectiveNotifMode(currentUserId, cat) : "normal";
  };

  /* ────────────────────────────────────────────
     【核心】自分宛て（targetUser === myName）の通知のみに絞り込む
     + 個人設定が "off" の種別は非表示
     targetUser が未設定の古いエントリーは表示しない（他人のデータ混入防止）
  ──────────────────────────────────────────── */
  const myLogs = useMemo(() => {
    if (!myName) return [];
    return notifLogs.filter(n => n.targetUser === myName && modeOf(n) !== "off");
  }, [notifLogs, myName, userSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 未読件数: "normal" 種別の未読のみカウント（silent はバッジに数えない） */
  const unread = useMemo(
    () => myLogs.filter(n => !n.isRead && modeOf(n) === "normal").length,
    [myLogs, userSettings] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* パネル外クリックで閉じる */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* すべて既読: 自分宛てのみ */
  const handleMarkAll = () => markAllNotifsRead(myName);

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
          {/* ── ヘッダー（✕ 閉じるのみ。削除ボタン完全撤廃） ── */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"
            style={{ background: "#0070d2" }}>
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-white" />
              <span className="text-[12px] font-black text-white">通知センター</span>
              {myName && (
                <span className="text-[9px] font-bold text-white/60 bg-white/20 rounded-full px-1.5 py-0.5">
                  {myName}宛て
                </span>
              )}
              {unread > 0 && (
                <span className="text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {unread}件未読
                </span>
              )}
            </div>
            {/* ✕ 閉じるボタンのみ（削除ボタン完全撤廃） */}
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-0.5">
              <X size={14} />
            </button>
          </div>

          {/* ── アクションバー: 「すべて既読」のみ（未読がある場合に表示） ── */}
          {unread > 0 && (
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80">
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-[10px] font-bold text-[#0070d2] hover:text-blue-700 transition-colors"
              >
                <CheckCheck size={12} /> すべて既読にする
              </button>
            </div>
          )}

          {/* ── 通知リスト（自分宛てのみ表示） ── */}
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {myLogs.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">通知はありません</p>
                {myName && (
                  <p className="text-[10px] text-slate-300 mt-1">{myName}宛ての通知が届くとここに表示されます</p>
                )}
              </div>
            ) : (
              <>
                {myLogs.map(n => {
                  const ti = TYPE_ICON[n.type] || { emoji: "🔔", color: "#64748b" };
                  /* silent 種別は未読でもバッジに数えないため、常に「静かに記録」スタイル */
                  const isSilent = modeOf(n) === "silent";
                  const muted    = n.isRead || isSilent;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 transition-colors
                        ${muted ? "bg-white" : "bg-blue-50/40"}`}
                    >
                      {/* アイコン */}
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                        style={{ background: muted ? "#f1f5f9" : ti.color + "18" }}>
                        <span style={{ opacity: muted ? 0.45 : 1 }}>{ti.emoji}</span>
                      </div>

                      {/* 本文 */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] leading-snug
                          ${muted ? "text-slate-400 font-normal" : "text-slate-800 font-semibold"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className={`text-[10px] mt-0.5 truncate
                            ${muted ? "text-slate-300" : "text-slate-400"}`}>
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-[9px] text-slate-300">{timeAgo(n.createdAt)}</p>
                          {isSilent && (
                            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 rounded px-1 py-0.5 leading-none">
                              🔕 静かに記録
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 既読インジケーター（silent はバッジ非対象なので操作不要） */}
                      {isSilent ? (
                        <span className="shrink-0 w-5 h-5" />
                      ) : n.isRead ? (
                        /* 既読済み: 緑チェック（操作不可） */
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-400"
                          title="既読済み">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      ) : (
                        /* 未読: 青いボタン → クリックで既読 */
                        <button
                          onClick={() => markNotifRead(n.id)}
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors
                            bg-blue-100 hover:bg-blue-500 text-blue-500 hover:text-white"
                          title="既読にする"
                        >
                          <Check size={10} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {/* 全件既読済みフッター */}
                {unread === 0 && myLogs.length > 0 && (
                  <div className="py-3 text-center">
                    <p className="text-[10px] text-slate-300 font-semibold">すべて既読です</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
