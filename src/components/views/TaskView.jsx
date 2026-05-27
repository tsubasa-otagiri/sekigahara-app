import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Trash2, X, ChevronLeft, ChevronRight,
  CalendarDays, List, AlertCircle, Circle, CheckCircle2,
  Pencil, Users, CheckCheck, UserCircle2,
} from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { MEMBER_MASTER_NAMES, DISPLAY_GROUPS } from "../../constants/index.js";
import { fireNotif } from "../../utils/desktopNotif.js";
import { filterTasksByTab, getTabMemberNames, NAME_TO_TEAM } from "../../utils/index.js";
import { launchConfetti, showNiceJob } from "../../utils/confetti.js";

/* ────────────────────────────────────────────
   定数
──────────────────────────────────────────── */
const PRIORITY = [
  { value: "high",   label: "高", color: "#ef4444", bg: "#fef2f2" },
  { value: "medium", label: "中", color: "#f59e0b", bg: "#fffbeb" },
  { value: "low",    label: "低", color: "#94a3b8", bg: "#f8fafc" },
];
const pStyle = (v) => PRIORITY.find(p => p.value === v) || PRIORITY[1];

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
function TaskModal({ task, members, defaultAssignee = "", onSave, onClose }) {
  const isEdit = !!task;
  const [title,    setTitle]    = useState(task?.title    || "");
  const [dueDate,  setDueDate]  = useState(task?.dueDate  || "");
  const [assignee, setAssignee] = useState(task?.assignee ?? defaultAssignee);
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [note,     setNote]     = useState(task?.note     || "");
  const [err,      setErr]      = useState("");

  const activeMembers = members
    .filter(m => m.status === "active" && m.role !== "admin")
    .sort((a, b) => {
      const ai = MEMBER_MASTER_NAMES.indexOf(a.name);
      const bi = MEMBER_MASTER_NAMES.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  const handleSave = () => {
    if (!title.trim()) { setErr("タスク名を入力してください"); return; }
    onSave({ title: title.trim(), dueDate, assignee, priority, note });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onMouseDown={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">{isEdit ? "タスクを編集" : "新しいタスク"}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">タスク名 *</label>
            <input
              autoFocus value={title}
              onChange={e => { setTitle(e.target.value); setErr(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="タスク名を入力"
            />
            {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
          </div>
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
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">期限</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">優先度</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white">
                {PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">メモ</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="補足など" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 justify-end">
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
   TaskCard（チームバッジ・担当者名強調付き）
──────────────────────────────────────────── */
function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const today = todayStr();
  const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
  const ps = pStyle(task.priority);
  const [bouncing, setBouncing] = useState(false);

  /* 担当者のチーム名を DISPLAY_GROUPS から逆引き */
  const assigneeTeam = task.assignee ? (NAME_TO_TEAM[task.assignee] || null) : null;
  const tbs = assigneeTeam ? teamBadgeStyle(assigneeTeam) : null;

  const handleToggle = (e) => {
    if (!task.completed) {
      const rect = e.currentTarget.getBoundingClientRect();
      launchConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      showNiceJob();
      setBouncing(true);
      setTimeout(() => setBouncing(false), 500);
    }
    onToggle(task.id);
  };

  return (
    <div
      className={`flex items-start gap-3 px-3 py-3 rounded-xl bg-white transition-all
        ${task.completed ? "opacity-50" : "card-shadow hover:shadow-md"}
        ${bouncing ? "task-bounce" : ""}`}
      style={{ borderLeft: `3px solid ${task.completed ? "#cbd5e1" : ps.color}` }}
    >
      {/* チェックボタン */}
      <button onClick={handleToggle} className="mt-0.5 shrink-0">
        {task.completed
          ? <CheckCircle2 size={17} className="text-emerald-400" />
          : <Circle size={17} className="text-slate-300 hover:text-blue-400 transition-colors" />
        }
      </button>

      <div className="flex-1 min-w-0">
        {/* タスク名 */}
        <p className={`text-[13px] font-bold leading-snug
          ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
          {task.title}
        </p>

        {/* メタ情報行 */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">

          {/* 優先度バッジ */}
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: ps.bg, color: ps.color }}>
            {ps.label}
          </span>

          {/* 担当者 + チームバッジ（セットで強調表示） */}
          {task.assignee && (
            <span className="flex items-center gap-1">
              <UserCircle2 size={11} className="text-slate-400" />
              <span className="text-[11px] font-bold text-slate-700">{task.assignee}</span>
              {tbs && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: tbs.bg, color: tbs.color }}>
                  {assigneeTeam}
                </span>
              )}
            </span>
          )}

          {/* 期限 */}
          {task.dueDate && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
              ${isOverdue ? "bg-red-50 text-red-500 font-black" : "text-slate-400"}`}>
              {isOverdue ? "⚠ " : "📅 "}{task.dueDate}
            </span>
          )}

          {/* メモ */}
          {task.note && (
            <span className="text-[9px] text-slate-300 truncate max-w-[100px]">{task.note}</span>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        <button onClick={() => onEdit(task)} className="p-1 text-slate-200 hover:text-blue-400 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(task.id)} className="p-1 text-slate-200 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
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
            <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
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
                <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
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
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-1">完了済み ({completed.length})</p>
            {completed.slice(0, 10).map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
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
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
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
              onEdit={(t) => { onClose(); onEdit(t); }} onDelete={onDelete} />
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

  const [subView,   setSubView]   = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [editTask,  setEditTask]  = useState(null);
  const [dayModal,  setDayModal]  = useState(null);

  const handleSave = (data) => {
    if (editTask) {
      updateTask(editTask.id, data);
    } else {
      addTask(data);
      /* 【担当者限定】自分が担当者の場合のみ通知 */
      const isMyTask = data.assignee && data.assignee === myName;
      if (isMyTask) {
        const body = `担当: ${data.assignee}`;
        const { notifyOnTaskAdded } = getMyNotifSettings(currentUserId);
        if (notifyOnTaskAdded) fireNotif(`✅ 新規タスク: ${data.title}`, body, () => window.focus());
        addNotifLog({ taskId: null, type: "task_add", targetUser: data.assignee,
          title: `✅ 新規タスク: ${data.title}`, body });
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
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 card-shadow">
          <button onClick={() => setSubView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
              ${subView === "list" ? "bg-[#0070d2] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <List size={12} /> リスト
          </button>
          <button onClick={() => setSubView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
              ${subView === "calendar" ? "bg-[#0070d2] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <CalendarDays size={12} /> カレンダー
          </button>
        </div>

        {/* ★ タスク追加ボタンはここだけ（1つに統一） */}
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors hover:brightness-110"
          style={{ background: "#0070d2", boxShadow: "0 2px 8px -2px rgba(0,112,210,.4)" }}>
          <Plus size={14} /> タスクを追加
        </button>
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
