import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, X, ChevronLeft, ChevronRight,
  CalendarDays, List, AlertCircle, Circle, CheckCircle2,
  Pencil, Users, CheckCheck, UserCircle2, StickyNote,
} from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { MEMBER_MASTER_NAMES, DISPLAY_GROUPS } from "../../constants/index.js";
import { fireNotif } from "../../utils/desktopNotif.js";
import { filterTasksByTab, getTabMemberNames, NAME_TO_TEAM } from "../../utils/index.js";
import { launchConfetti, showNiceJob } from "../../utils/confetti.js";
import { launchPachinko } from "../../utils/pachinko.js";
/* ────────────────────────────────────────────
   定数
──────────────────────────────────────────── */
const PRIORITY = [
  { value: "high",   label: "高", color: "#ef4444", bg: "#fef2f2" },
  { value: "medium", label: "中", color: "#f59e0b", bg: "#fffbeb" },
  { value: "low",    label: "低", color: "#94a3b8", bg: "#f8fafc" },
];
const pStyle = (v) => PRIORITY.find(p => p.value === v) || PRIORITY[1];

/* カテゴリ定義 */
const CATEGORIES = [
  { value: "",               label: "なし",             color: "#94a3b8", bg: "#f8fafc" },
  { value: "資料作成",        label: "資料作成",          color: "#0284c7", bg: "#e0f2fe" },
  { value: "見積書作成",      label: "見積書作成",         color: "#0891b2", bg: "#cffafe" },
  { value: "SF申請",         label: "SF申請",            color: "#7c3aed", bg: "#ede9fe" },
  { value: "与信WF申請",      label: "与信WF申請",         color: "#9333ea", bg: "#f3e8ff" },
  { value: "イレギュラーWF申請",label: "イレギュラーWF申請", color: "#db2777", bg: "#fce7f3" },
  { value: "デモ画面発行",    label: "デモ画面発行",        color: "#059669", bg: "#d1fae5" },
  { value: "日程調整",       label: "日程調整",           color: "#d97706", bg: "#fef3c7" },
  { value: "漫画資料",       label: "漫画資料",           color: "#ea580c", bg: "#ffedd5" },
  { value: "社内確認",       label: "社内確認",           color: "#16a34a", bg: "#dcfce7" },
  { value: "お礼メール",     label: "お礼メール",          color: "#e11d48", bg: "#ffe4e6" },
];
const catStyle = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[0];

/* チームセクション見出し色 */
const TEAM_HDR = {
  "杉山T": { hdr: "#166534", light: "#f0fdf4", border: "#86efac", dot: "#16a34a" },
  "中村T": { hdr: "#991b1b", light: "#fef2f2", border: "#fca5a5", dot: "#dc2626" },
  "渡部T": { hdr: "#854d0e", light: "#fefce8", border: "#fde047", dot: "#ca8a04" },
  "鈴木T": { hdr: "#4c1d95", light: "#f5f3ff", border: "#c4b5fd", dot: "#7c3aed" },
};
const teamHdr = (label) =>
  TEAM_HDR[label] || { hdr: "#1e3a5f", light: "#eff6ff", border: "#93c5fd", dot: "#0070d2" };

/* チームバッジスタイル（タスクカード内） */
const TEAM_BADGE = {
  "杉山T": { bg: "#dcfce7", color: "#166534" },
  "中村T": { bg: "#fee2e2", color: "#991b1b" },
  "渡部T": { bg: "#fef9c3", color: "#854d0e" },
  "鈴木T": { bg: "#ede9fe", color: "#5b21b6" },
};
const teamBadgeStyle = (team) =>
  TEAM_BADGE[team] || { bg: "#f1f5f9", color: "#475569" };

/* ────────────────────────────────────────────
   ユーティリティ
──────────────────────────────────────────── */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const TODAY_YM = todayStr().slice(0, 7);

function addMonths(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function fmtYM(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}
function getDaysInMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function getFirstDOW(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).getDay();
}

function sortPending(tasks) {
  const today = todayStr();
  return [...tasks].sort((a, b) => {
    const oa = a.dueDate && a.dueDate < today;
    const ob = b.dueDate && b.dueDate < today;
    if (oa && !ob) return -1;
    if (!oa && ob) return 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    const po = { high: 0, medium: 1, low: 2 };
    return (po[a.priority] || 1) - (po[b.priority] || 1);
  });
}

/* ────────────────────────────────────────────
   セクション定義ビルダー
──────────────────────────────────────────── */
function buildSections(activeTab, members) {
  /* アクティブ一般メンバーの名前セット */
  const activeSet = new Set(
    members.filter(m => m.status === "active" && m.role !== "admin").map(m => m.name)
  );
  const activeNames = (names) => names.filter(n => activeSet.has(n));

  if (activeTab === "全体") {
    return DISPLAY_GROUPS.map(g => ({
      label: g.label,
      memberNames: activeNames(g.names),
    }));
  }
  if (activeTab === "鈴木Tプレ") {
    const suzuki  = activeNames(DISPLAY_GROUPS.find(g => g.label === "鈴木T")?.names || []);
    const sugiyama = activeNames(
      (DISPLAY_GROUPS.find(g => g.label === "杉山T")?.names || []).filter(n => n !== "杉山")
    );
    return [
      { label: "鈴木T",  memberNames: suzuki  },
      { label: "杉山T",  memberNames: sugiyama },
    ];
  }
  if (activeTab === "マイ") return null; // フラットリスト
  const group = DISPLAY_GROUPS.find(g => g.label === activeTab);
  if (group) return [{ label: group.label, memberNames: activeNames(group.names) }];
  return null;
}

/* ────────────────────────────────────────────
   TaskModal
──────────────────────────────────────────── */
function TaskModal({ task, members, defaultAssignee = "", onSave, onDelete, onClose }) {
  const isEdit = !!task;
  const [title,    setTitle]    = useState(task?.title    || "");
  const [dueDate,  setDueDate]  = useState(task?.dueDate  || "");
  const [dueTime,  setDueTime]  = useState(task?.dueTime  || "");
  const [assignee, setAssignee] = useState(task?.assignee ?? defaultAssignee);
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [category, setCategory] = useState(task?.category || "");
  const [note,     setNote]     = useState(task?.note     || "");
  const [err,      setErr]      = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  const activeMembers = members
    .filter(m => m.status === "active" && m.role !== "admin")
    .sort((a, b) => {
      const ai = MEMBER_MASTER_NAMES.indexOf(a.name);
      const bi = MEMBER_MASTER_NAMES.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  const handleSave = () => {
    if (!title.trim()) { setErr("タスク名を入力してください"); return; }
    onSave({ title: title.trim(), dueDate, dueTime, assignee, priority, category, note });
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onMouseDown={e => e.stopPropagation()}>

        {/* ── ヘッダー ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">{isEdit ? "タスクを編集" : "新しいタスク"}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>

        {/* ── フォーム ── */}
        <div className="px-5 py-4 space-y-3">
          {/* タスク名 */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">タスク名 *</label>
            <input
              autoFocus value={title}
              onChange={e => { setTitle(e.target.value); setErr(""); }}
              onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="タスク名を入力"
            />
            {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
          </div>

          {/* カテゴリ */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">カテゴリ</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* 担当者 */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">担当者</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
              <option value="">未割り当て</option>
              {DISPLAY_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.names.map(name => {
                    const m = activeMembers.find(m => m.name === name);
                    return m ? <option key={m.id} value={m.name}>{m.name}</option> : null;
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 期限（日付＋時間）・優先度 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">期限</label>
              <div className="flex gap-2">
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                  step="1800"
                  className="w-24 border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="--:--" />
              </div>
            </div>
            <div className="w-24 shrink-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">優先度</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
                {PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">メモ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="補足など" />
          </div>

          {/* 削除確認エリア（編集時のみ） */}
          {isEdit && confirmDel && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-[12px] font-bold text-red-600 flex-1">本当に削除しますか？</span>
              <button onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-red-500 text-white hover:bg-red-600 transition-colors">
                削除する
              </button>
              <button onClick={() => setConfirmDel(false)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
            </div>
          )}
        </div>

        {/* ── フッター ── */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
          {/* 削除ボタン（編集時のみ左端） */}
          {isEdit && !confirmDel && (
            <button onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-red-200">
              <Trash2 size={12} /> 削除
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            キャンセル
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors hover:brightness-110"
            style={{ background: "#0070d2" }}>
            {isEdit ? "保存" : "追加"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ────────────────────────────────────────────
   TaskCard（完了ボタン強調・雲消えアニメ・削除確認付き）
──────────────────────────────────────────── */
function TaskCard({ task, onToggle, onEdit }) {
  const today = todayStr();
  const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
  const ps = pStyle(task.priority);
  const cs = task.category ? catStyle(task.category) : null;
  const [vanishing,  setVanishing]  = useState(false);
  const [showNote,   setShowNote]   = useState(false);

  /* 担当者のチーム名を DISPLAY_GROUPS から逆引き */
  const assigneeTeam = task.assignee ? (NAME_TO_TEAM[task.assignee] || null) : null;
  const tbs = assigneeTeam ? teamBadgeStyle(assigneeTeam) : null;

  /* ── 完了トグル：未完了→完了時は雲消えアニメ後に実行 ── */
  const handleToggle = (e) => {
    if (task.completed) {
      /* 完了→未完了: 即座に戻す */
      onToggle(task.id);
      return;
    }
    /* 未完了→完了: パチンコ演出（オーバーレイ独立） + カード消滅アニメ */
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = rect.left + rect.width  / 2;
    const oy = rect.top  + rect.height / 2;

    /* パチンコルーレット起動
     *   通常大当り(50%) → onNormal でコンフェッティ + NiceJob トースト
     *   確変大当り(50%) → レインボーフラッシュ（pachinko.js 内で完結）   */
    launchPachinko({
      onNormal: () => {
        launchConfetti(ox, oy);
        showNiceJob();
      },
    });

    /* カード消滅アニメ（演出とは独立して実行）*/
    setVanishing(true);
    setTimeout(() => {
      onToggle(task.id);
      setVanishing(false);
    }, 520);
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white transition-all
        ${task.completed ? "opacity-45" : "card-shadow hover:shadow-md"}
        ${vanishing ? "task-vanish" : ""}`}
      style={{ borderLeft: `3px solid ${task.completed ? "#cbd5e1" : ps.color}` }}
    >
      {/* ── 完了ボタン ── */}
      <button
        onClick={handleToggle}
        title={task.completed ? "未完了に戻す" : "完了にする"}
        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all
          ${task.completed
            ? "bg-emerald-400 border-emerald-400 text-white"
            : "border-slate-300 text-transparent hover:border-emerald-400 hover:text-emerald-400 hover:scale-110"
          }`}
      >
        <CheckCircle2 size={13} strokeWidth={2.5} />
      </button>

      {/* ── タスク名＋メタ（クリックでメモ展開） ── */}
      <div
        className={`flex-1 min-w-0 ${task.note ? "cursor-pointer" : ""}`}
        onClick={() => { if (task.note) setShowNote(v => !v); }}
      >
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-semibold leading-snug truncate
            ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
            {task.title}
          </p>
          {/* メモありインジケーター */}
          {task.note && (
            <StickyNote
              size={11}
              className={`shrink-0 transition-colors ${showNote ? "text-amber-400" : "text-slate-300"}`}
            />
          )}
        </div>

        {/* メタ情報行 */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">

            {/* カテゴリ */}
            {cs && task.category && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                style={{ background: cs.bg, color: cs.color }}>
                {cs.label}
              </span>
            )}

            {/* 担当者 */}
            {task.assignee && (
              <span className="text-[11px] text-slate-500 font-medium shrink-0">@ {task.assignee}</span>
            )}

            {/* 期限＋時間 */}
            {task.dueDate && (
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 shrink-0
                ${isOverdue ? "text-red-500 font-bold" : "text-slate-400"}`}>
                {isOverdue ? "⚠" : "📅"} {task.dueDate}
                {task.dueTime && (
                  <span className="ml-0.5">{task.dueTime}</span>
                )}
              </span>
            )}

          </div>

          {/* 追加者（右端・薄く） */}
          {task.createdBy && (
            <span className="text-[9px] text-slate-300 shrink-0 whitespace-nowrap">
              {task.createdBy}
            </span>
          )}
        </div>

        {/* ── メモ展開エリア ── */}
        {showNote && task.note && (
          <div className="mt-2 text-[11px] text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 leading-relaxed whitespace-pre-wrap">
            {task.note}
          </div>
        )}
      </div>

      {/* ── 編集ボタン ── */}
      <button onClick={() => onEdit(task)}
        className="shrink-0 p-1 text-slate-200 hover:text-blue-400 transition-colors" title="編集">
        <Pencil size={13} />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────
   TeamSection（1チーム分のカード）
──────────────────────────────────────────── */
function TeamSection({ label, memberNames, tasks, memberFilter, onToggle, onEdit, onDelete }) {
  const today = todayStr();
  const [showCompleted, setShowCompleted] = useState(false);
  const th = teamHdr(label);

  /* このセクションに属するタスク（memberFilter が指定されていればさらに絞る） */
  const sectionTasks = useMemo(() => {
    const base = tasks.filter(t => t.assignee && memberNames.includes(t.assignee));
    if (memberFilter && memberFilter !== "全体") {
      return base.filter(t => t.assignee === memberFilter);
    }
    return base;
  }, [tasks, memberNames, memberFilter]);

  const pending   = useMemo(() => sortPending(sectionTasks.filter(t => !t.completed)), [sectionTasks]);
  const completed = useMemo(() => sectionTasks.filter(t => t.completed), [sectionTasks]);
  const overdue   = pending.filter(t => t.dueDate && t.dueDate < today);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: `1.5px solid ${th.border}`, background: th.light }}>

      {/* ── セクションヘッダー ── */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: th.hdr }}>
        <div className="flex items-center gap-2 min-w-0">
          <Users size={12} className="text-white/80 shrink-0" />
          <span className="text-[13px] font-black text-white tracking-wide">{label}</span>
          <span className="text-[10px] text-white/60 hidden sm:inline truncate">
            {memberNames.join(" · ")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {overdue.length > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5">
              <AlertCircle size={8} /> {overdue.length}件
            </span>
          )}
          <span className="text-[10px] font-bold text-white/80 bg-white/20 rounded-full px-2 py-0.5">
            {pending.length}件
          </span>
        </div>
      </div>

      {/* ── タスクリスト ── */}
      <div className="p-3 space-y-2 min-h-[72px]">
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-14 gap-1 opacity-60">
            <CheckCheck size={16} style={{ color: th.dot }} />
            <p className="text-[10px] font-semibold" style={{ color: th.dot }}>
              現在タスクはありません
            </p>
          </div>
        ) : (
          pending.map(t => (
            <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
          ))
        )}
      </div>

      {/* ── 完了済み折りたたみ ── */}
      {completed.length > 0 && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: th.border + "80" }}>
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="flex items-center gap-1.5 mt-2 text-[10px] font-bold transition-colors"
            style={{ color: th.dot }}>
            <CheckCircle2 size={11} />
            完了済み {completed.length}件
            <span className="text-[9px]">{showCompleted ? "▲" : "▼"}</span>
          </button>
          {showCompleted && (
            <div className="space-y-1.5 mt-2">
              {completed.slice(0, 8).map(t => (
                <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
              ))}
              {completed.length > 8 && (
                <p className="text-[9px] text-center font-semibold" style={{ color: th.dot + "88" }}>
                  他 {completed.length - 8} 件
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   ListView（セクション対応・メンバーフィルター連動）
──────────────────────────────────────────── */
function ListView({ tasks, members, activeTab, onToggle, onEdit, onDelete }) {
  const today = todayStr();
  const [memberFilter, setMemberFilter] = useState("全体");

  /* activeTab が変わったらメンバーフィルターをリセット */
  useMemo(() => { setMemberFilter("全体"); }, [activeTab]);

  const sections = useMemo(() => buildSections(activeTab, members), [activeTab, members]);

  /* このタブで表示されるメンバー名リスト（メンバーフィルターボタン用） */
  const tabMemberNames = useMemo(() => {
    if (!sections) return []; // マイタブ
    const names = sections.flatMap(s => s.memberNames);
    /* MEMBER_MASTER_NAMES の順序に沿ってソート */
    return names.sort((a, b) => {
      const ai = MEMBER_MASTER_NAMES.indexOf(a);
      const bi = MEMBER_MASTER_NAMES.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [sections]);

  /* ── マイタブ: フラットリスト ── */
  if (!sections) {
    const pending   = sortPending(tasks.filter(t => !t.completed));
    const completed = tasks.filter(t => t.completed);
    const overdue   = pending.filter(t => t.dueDate && t.dueDate < today);
    return (
      <div className="space-y-3">
        {overdue.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600">期限切れのタスクが {overdue.length} 件あります</p>
          </div>
        )}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">未完了 ({pending.length})</p>
        {pending.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-2xl card-shadow">
            <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">すべて完了しています 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">完了済み ({completed.length})</p>
            {completed.slice(0, 10).map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── チームセクション表示 ── */
  const isSingle = sections.length === 1;
  /* 全セクションに渡っている未割り当てタスク（担当者が表示メンバー外 or 未設定） */
  const allMemberNames = sections.flatMap(s => s.memberNames);
  const unassigned = tasks.filter(t => !t.assignee || !allMemberNames.includes(t.assignee));
  const unassignedPending = sortPending(unassigned.filter(t => !t.completed));

  return (
    <div className="space-y-4">

      {/* ── メンバーフィルターボタン（単一チーム or 鈴木Tプレ時に表示） ── */}
      {tabMemberNames.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setMemberFilter("全体")}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all outline-none"
            style={memberFilter === "全体"
              ? { background: "#0070d2", color: "#fff", boxShadow: "0 2px 8px -2px rgba(0,112,210,.35)" }
              : { background: "#fff", color: "#64748b", border: "1px solid #dddbda" }
            }
          >
            全員
          </button>
          {tabMemberNames.map(name => {
            const team = NAME_TO_TEAM[name];
            const tbs  = team ? teamBadgeStyle(team) : null;
            return (
              <button key={name}
                onClick={() => setMemberFilter(name)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all outline-none"
                style={memberFilter === name
                  ? { background: "#0070d2", color: "#fff", boxShadow: "0 2px 8px -2px rgba(0,112,210,.35)" }
                  : { background: "#fff", color: "#64748b", border: "1px solid #dddbda" }
                }
              >
                {name}
                {tbs && memberFilter !== name && (
                  <span className="text-[8px] font-black px-1 py-0.5 rounded-full"
                    style={{ background: tbs.bg, color: tbs.color }}>
                    {team}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── チームセクション グリッド ── */}
      <div className={`grid gap-4 ${isSingle ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {sections.map(sec => (
          <TeamSection
            key={sec.label}
            label={sec.label}
            memberNames={sec.memberNames}
            tasks={tasks}
            memberFilter={memberFilter}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* ── 担当者未割り当てタスク ── */}
      {unassignedPending.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid #cbd5e1", background: "#f8fafc" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#475569" }}>
            <span className="text-[12px] font-black text-white">担当者未割り当て</span>
            <span className="text-[10px] font-bold text-white/70 bg-white/20 rounded-full px-2 py-0.5">
              {unassignedPending.length}件
            </span>
          </div>
          <div className="p-3 space-y-2">
            {unassignedPending.map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────
   CalView（カレンダー）
──────────────────────────────────────────── */
function CalView({ tasks, onDayClick }) {
  const [ym, setYm] = useState(TODAY_YM);
  const today = todayStr();
  const days = getDaysInMonth(ym);
  const firstDow = getFirstDOW(ym);
  const WEEKS = ["日", "月", "火", "水", "木", "金", "土"];

  const tasksByDay = useMemo(() => {
    const map = {};
    tasks.filter(t => t.dueDate && t.dueDate.startsWith(ym)).forEach(t => {
      const day = parseInt(t.dueDate.slice(8), 10);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return map;
  }, [tasks, ym]);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setYm(y => addMonths(y, -1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-[#0070d2]" />
          <span className="text-base font-black text-slate-800">{fmtYM(ym)}</span>
          {ym === TODAY_YM && <span className="text-[10px] font-black text-white bg-[#0070d2] rounded-full px-2 py-0.5">今月</span>}
        </div>
        <button onClick={() => setYm(y => addMonths(y, 1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKS.map((w, i) => (
            <div key={w} className={`py-2 text-center text-[11px] font-black
              ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400"}`}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/30" />;
            const [y, m] = ym.split("-");
            const ds = `${y}-${m}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDay[day] || [];
            const isToday = ds === today;
            const isPast  = ds < today;
            const dow = (firstDow + day - 1) % 7;
            const hasOverdue = isPast && dayTasks.some(t => !t.completed);
            return (
              <div key={day}
                onClick={() => dayTasks.length > 0 && onDayClick(day, ym, dayTasks)}
                className={`min-h-[80px] p-1.5 border-b border-r border-slate-50 transition-colors
                  ${dayTasks.length > 0 ? "cursor-pointer hover:bg-slate-50" : ""}
                  ${hasOverdue ? "bg-red-50/30" : ""}`}
              >
                <div className="flex items-center gap-0.5 mb-1">
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-[#0070d2] text-white" : dow === 0 ? "text-rose-400" : dow === 6 ? "text-blue-400" : "text-slate-500"}`}>
                    {day}
                  </span>
                  {hasOverdue && <AlertCircle size={9} className="text-red-400" />}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(t => {
                    const ps = pStyle(t.priority);
                    return (
                      <div key={t.id}
                        className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate leading-tight
                          ${t.completed ? "line-through opacity-40" : ""}`}
                        style={{ background: ps.bg, color: ps.color, borderLeft: `2px solid ${ps.color}` }}>
                        {t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-[9px] text-slate-400 text-center">+{dayTasks.length - 3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {PRIORITY.map(p => (
          <div key={p.value} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.bg, border: `1.5px solid ${p.color}` }} />
            <span className="text-[10px] font-bold" style={{ color: p.color }}>{p.label}優先度</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   DayTaskModal
──────────────────────────────────────────── */
function DayTaskModal({ day, ym, tasks, onClose, onToggle, onEdit, onDelete }) {
  const [y, m] = ym.split("-");
  const ds = `${y}-${m}-${String(day).padStart(2, "0")}`;
  const today = todayStr();
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-black text-slate-800">{fmtYM(ym)} {day}日</p>
            {ds < today && <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠ 期限切れのタスクがあります</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} onToggle={onToggle}
              onEdit={(t) => { onClose(); onEdit(t); }} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ────────────────────────────────────────────
   TaskView（メイン）
──────────────────────────────────────────── */
export default function TaskView() {
  const { tasks, members, addTask, updateTask, deleteTask, toggleTask,
          addNotifLog, currentUserId, getMyNotifSettings,
          activeTab, currentUser } = useApp();
  const myName = currentUser?.name || "";

  /* ★ activeTab で厳格フィルター（utils の修正版 filterTasksByTab を使用） */
  const filteredTasks = useMemo(() =>
    filterTasksByTab(tasks, activeTab, members, myName),
  [tasks, activeTab, members, myName]);

  /* 新規追加時のデフォルト担当者 */
  const defaultAssignee = useMemo(() => {
    if (activeTab === "全体") return "";
    if (activeTab === "マイ")  return myName;
    const names = getTabMemberNames(activeTab, members, myName);
    if (!names || names.length === 0) return "";
    return names.includes(myName) ? myName : (names[0] || "");
  }, [activeTab, members, myName]);

  const [subView,      setSubView]      = useState("list");
  const [showModal,    setShowModal]    = useState(false);
  const [editTask,     setEditTask]     = useState(null);
  const [dayModal,     setDayModal]     = useState(null);

  const handleSave = (data) => {
    if (editTask) {
      updateTask(editTask.id, data);
    } else {
      /* 追加者を自動セット */
      const taskData = { ...data, createdBy: myName };
      addTask(taskData);

      /* 【通知ルール】
       *  - 担当者が設定されている
       *  - 追加者 ≠ 担当者（自分で自分のタスクを追加した場合は通知不要）
       *  のときだけ担当者の通知センターに記録する
       */
      const assignee   = data.assignee;
      const isSelf     = !assignee || assignee === myName;
      if (!isSelf) {
        const body = `${myName} さんがタスクを追加しました`;
        addNotifLog({
          taskId: null, type: "task_add", targetUser: assignee,
          title: `✅ 新規タスク: ${data.title}`, body,
        });
      }

      /* 自分が担当の場合はデスクトップ通知のみ（通知センターには記録しない） */
      if (assignee === myName) {
        const { notifyOnTaskAdded } = getMyNotifSettings(currentUserId);
        if (notifyOnTaskAdded)
          fireNotif(`✅ 新規タスク: ${data.title}`, `担当: ${myName}`, () => window.focus());
      }
    }
    setEditTask(null);
  };

  const handleEdit = (t) => { setEditTask(t); setShowModal(true); };
  const handleAdd  = ()  => { setEditTask(null); setShowModal(true); };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

      {/* ── ヘッダー（青いタスク追加ボタン 1つのみ） ── */}
      <div className="flex items-center justify-between mb-5">
        {/* リスト / カレンダー セグメントコントロール */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
          {[
            { id: "list",     label: "リスト",       Icon: List },
            { id: "calendar", label: "カレンダー",   Icon: CalendarDays },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSubView(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap
                ${subView === id
                  ? "bg-white text-[#0070d2] shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
                }`}
              style={subView === id ? { boxShadow: "0 1px 4px rgba(0,112,210,.15)" } : {}}
            >
              <Icon size={13} strokeWidth={subView === id ? 2.5 : 2} />
              {label}
            </button>
          ))}
        </div>

        {/* 右側ボタン群 */}
        <div className="flex items-center gap-2">
          {/* タスク追加ボタン */}
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors hover:brightness-110"
            style={{ background: "#0070d2", boxShadow: "0 2px 8px -2px rgba(0,112,210,.4)" }}>
            <Plus size={14} /> タスクを追加
          </button>
        </div>
      </div>

      {/* ── コンテンツ ── */}
      {subView === "list" ? (
        <ListView
          tasks={filteredTasks}
          members={members}
          activeTab={activeTab}
          onToggle={toggleTask}
          onEdit={handleEdit}
          onDelete={deleteTask}
        />
      ) : (
        <CalView
          tasks={filteredTasks}
          onDayClick={(day, ym, ds) => setDayModal({ day, ym, deals: ds })}
        />
      )}

      {/* タスク追加/編集モーダル */}
      {showModal && (
        <TaskModal
          task={editTask}
          members={members}
          defaultAssignee={editTask ? undefined : defaultAssignee}
          onSave={handleSave}
          onDelete={deleteTask}
          onClose={() => { setShowModal(false); setEditTask(null); }}
        />
      )}

      {/* 日別タスクポップアップ */}
      {dayModal && (
        <DayTaskModal
          day={dayModal.day}
          ym={dayModal.ym}
          tasks={dayModal.deals}
          onClose={() => setDayModal(null)}
          onToggle={toggleTask}
          onEdit={handleEdit}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
