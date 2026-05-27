import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Check, Trash2, X, ChevronLeft, ChevronRight,
  CalendarDays, List, AlertCircle, Circle, CheckCircle2, Pencil
} from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { MEMBER_MASTER_NAMES, DISPLAY_GROUPS, THEX } from "../../constants/index.js";
import { fireNotif } from "../../utils/desktopNotif.js";

/* ── 優先度 ── */
const PRIORITY = [
  { value: "high",   label: "高",   color: "#ef4444", bg: "#fef2f2" },
  { value: "medium", label: "中",   color: "#f59e0b", bg: "#fffbeb" },
  { value: "low",    label: "低",   color: "#94a3b8", bg: "#f8fafc" },
];
const pStyle = (v) => PRIORITY.find(p => p.value === v) || PRIORITY[1];

/* ── 月ユーティリティ ── */
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
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const TODAY_YM = todayStr().slice(0,7);

/* ── タスク追加/編集モーダル ── */
function TaskModal({ task, members, onSave, onClose }) {
  const isEdit = !!task;
  const [title,    setTitle]    = useState(task?.title    || "");
  const [dueDate,  setDueDate]  = useState(task?.dueDate  || "");
  const [assignee, setAssignee] = useState(task?.assignee || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [note,     setNote]     = useState(task?.note     || "");
  const [err,      setErr]      = useState("");

  const activeMembers = members
    .filter(m => m.status === "active" && m.role !== "admin")
    .sort((a,b) => {
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
        {/* ヘッダー */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-800">{isEdit ? "タスクを編集" : "新しいタスク"}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* タスク名 */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">タスク名 *</label>
            <input
              autoFocus
              value={title}
              onChange={e => { setTitle(e.target.value); setErr(""); }}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="タスク名を入力"
            />
            {err && <p className="text-[10px] text-red-500 mt-1">{err}</p>}
          </div>

          {/* 担当者 */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">担当者</label>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
            >
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

          {/* 期限 / 優先度 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">期限</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">優先度</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                {PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">メモ</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              rows={2}
              placeholder="補足など"
            />
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

/* ── タスクカード ── */
function TaskCard({ task, onToggle, onEdit, onDelete }) {
  const today = todayStr();
  const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
  const ps = pStyle(task.priority);

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl bg-white transition-all
      ${task.completed ? "opacity-50" : "card-shadow hover:shadow-md"}`}
      style={{ borderLeft: `3px solid ${task.completed ? "#cbd5e1" : ps.color}` }}
    >
      {/* チェックボタン */}
      <button onClick={() => onToggle(task.id)} className="mt-0.5 shrink-0 transition-colors">
        {task.completed
          ? <CheckCircle2 size={18} className="text-emerald-400" />
          : <Circle size={18} className="text-slate-300 hover:text-blue-400" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold ${task.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* 優先度 */}
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: ps.bg, color: ps.color }}>
            {ps.label}
          </span>
          {/* 担当者 */}
          {task.assignee && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
              👤 {task.assignee}
            </span>
          )}
          {/* 期限 */}
          {task.dueDate && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
              ${isOverdue ? "bg-red-50 text-red-500 font-black" : "text-slate-400"}`}>
              {isOverdue && "⚠ "}{task.dueDate}
            </span>
          )}
          {/* メモ */}
          {task.note && (
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{task.note}</span>
          )}
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(task)}
          className="p-1 text-slate-300 hover:text-blue-400 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(task.id)}
          className="p-1 text-slate-300 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── リストビュー ── */
function ListView({ tasks, members, onToggle, onEdit, onDelete, onAdd }) {
  const today = todayStr();
  const [memberFilter, setMemberFilter] = useState("全体");

  const activeMembers = useMemo(() =>
    members
      .filter(m => m.status === "active" && m.role !== "admin")
      .sort((a,b) => {
        const ai = MEMBER_MASTER_NAMES.indexOf(a.name);
        const bi = MEMBER_MASTER_NAMES.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }),
  [members]);

  const filtered = useMemo(() => {
    if (memberFilter === "全体") return tasks;
    if (memberFilter === "未割り当て") return tasks.filter(t => !t.assignee);
    return tasks.filter(t => t.assignee === memberFilter);
  }, [tasks, memberFilter]);

  const pending   = filtered.filter(t => !t.completed);
  const completed = filtered.filter(t => t.completed);
  const overdue   = pending.filter(t => t.dueDate && t.dueDate < today);

  return (
    <div className="space-y-4">
      {/* メンバーフィルター */}
      <div className="flex gap-1.5 flex-wrap">
        {["全体", "未割り当て", ...activeMembers.map(m => m.name)].map(name => (
          <button key={name}
            onClick={() => setMemberFilter(name)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all outline-none"
            style={memberFilter === name
              ? { background: "#0070d2", color: "#fff", boxShadow: "0 2px 8px -2px rgba(0,112,210,.35)" }
              : { background: "#fff", color: "#64748b", border: "1px solid #dddbda" }
            }
          >
            {name}
          </button>
        ))}
      </div>

      {/* 期限切れ警告 */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-[11px] font-bold text-red-600">期限切れのタスクが {overdue.length} 件あります</p>
        </div>
      )}

      {/* 未完了 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            未完了 ({pending.length})
          </p>
          <button onClick={onAdd}
            className="flex items-center gap-1 text-[11px] font-bold text-[#0070d2] hover:text-blue-700 transition-colors">
            <Plus size={13} /> タスクを追加
          </button>
        </div>
        {pending.length === 0 ? (
          <div className="py-8 text-center bg-white rounded-2xl card-shadow">
            <CheckCircle2 size={28} className="text-emerald-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">すべて完了しています 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending
              .sort((a,b) => {
                /* 期限切れ → 期限あり → 期限なし の順 */
                const oa = a.dueDate && a.dueDate < today;
                const ob = b.dueDate && b.dueDate < today;
                if (oa && !ob) return -1;
                if (!oa && ob) return 1;
                if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                const po = { high:0, medium:1, low:2 };
                return (po[a.priority]||1) - (po[b.priority]||1);
              })
              .map(t => (
                <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              ))}
          </div>
        )}
      </div>

      {/* 完了済み */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">完了済み ({completed.length})</p>
          <div className="space-y-1.5">
            {completed.slice(0,10).map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── カレンダービュー ── */
function CalView({ tasks, onDayClick, onAdd }) {
  const [ym, setYm] = useState(TODAY_YM);
  const today = todayStr();
  const days = getDaysInMonth(ym);
  const firstDow = getFirstDOW(ym);
  const WEEKS = ["日","月","火","水","木","金","土"];

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
      {/* 月ナビ */}
      <div className="flex items-center justify-between">
        <button onClick={() => setYm(y => addMonths(y,-1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-[#0070d2]" />
          <span className="text-base font-black text-slate-800">{fmtYM(ym)}</span>
          {ym === TODAY_YM && <span className="text-[10px] font-black text-white bg-[#0070d2] rounded-full px-2 py-0.5">今月</span>}
        </div>
        <button onClick={() => setYm(y => addMonths(y,1))}
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* グリッド */}
      <div className="bg-white rounded-2xl overflow-hidden card-shadow">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKS.map((w,i) => (
            <div key={w} className={`py-2 text-center text-[11px] font-black
              ${i===0?"text-rose-400":i===6?"text-blue-400":"text-slate-400"}`}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="min-h-[80px] border-b border-r border-slate-50 bg-slate-50/30" />;
            const [y, m] = ym.split("-");
            const ds = `${y}-${m}-${String(day).padStart(2,"0")}`;
            const dayTasks = tasksByDay[day] || [];
            const isToday = ds === today;
            const isPast  = ds < today;
            const dow = (firstDow + day - 1) % 7;
            const hasOverdue = isPast && dayTasks.some(t => !t.completed);

            return (
              <div
                key={day}
                onClick={() => dayTasks.length > 0 && onDayClick(day, ym, dayTasks)}
                className={`min-h-[80px] p-1.5 border-b border-r border-slate-50 transition-colors
                  ${dayTasks.length > 0 ? "cursor-pointer hover:bg-slate-50" : ""}
                  ${hasOverdue ? "bg-red-50/30" : ""}
                `}
              >
                <div className="flex items-center gap-0.5 mb-1">
                  <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday?"bg-[#0070d2] text-white":dow===0?"text-rose-400":dow===6?"text-blue-400":"text-slate-500"}`}>
                    {day}
                  </span>
                  {hasOverdue && <AlertCircle size={9} className="text-red-400" />}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0,3).map(t => {
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
                    <div className="text-[9px] text-slate-400 text-center">+{dayTasks.length-3}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
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

/* ── 日別タスクポップアップ ── */
function DayTaskModal({ day, ym, tasks, onClose, onToggle, onEdit, onDelete }) {
  const [y, m] = ym.split("-");
  const ds = `${y}-${m}-${String(day).padStart(2,"0")}`;
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
            <TaskCard key={t.id} task={t} onToggle={onToggle} onEdit={(t) => { onClose(); onEdit(t); }} onDelete={onDelete} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── メイン ── */
export default function TaskView() {
  const { tasks, members, addTask, updateTask, deleteTask, toggleTask, addNotifLog } = useApp();

  const [subView,    setSubView]    = useState("list");  // "list" | "calendar"
  const [showModal,  setShowModal]  = useState(false);
  const [editTask,   setEditTask]   = useState(null);
  const [dayModal,   setDayModal]   = useState(null);

  const handleSave = (data) => {
    if (editTask) {
      updateTask(editTask.id, data);
    } else {
      /* 新規追加: デスクトップ通知 + ログ */
      addTask(data);
      const body = data.assignee ? `担当: ${data.assignee}` : "担当者未設定";
      fireNotif(`✅ 新規タスク: ${data.title}`, body, () => window.focus());
      addNotifLog({ taskId: null, type: "task_add",
        title: `✅ 新規タスク: ${data.title}`, body });
    }
    setEditTask(null);
  };

  const handleEdit = (t) => { setEditTask(t); setShowModal(true); };
  const handleAdd  = ()  => { setEditTask(null); setShowModal(true); };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 card-shadow">
          <button
            onClick={() => setSubView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
              ${subView === "list" ? "bg-[#0070d2] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <List size={12} /> リスト
          </button>
          <button
            onClick={() => setSubView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
              ${subView === "calendar" ? "bg-[#0070d2] text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <CalendarDays size={12} /> カレンダー
          </button>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors hover:brightness-110"
          style={{ background: "#0070d2", boxShadow: "0 2px 8px -2px rgba(0,112,210,.4)" }}
        >
          <Plus size={14} /> タスクを追加
        </button>
      </div>

      {/* ── コンテンツ ── */}
      {subView === "list" ? (
        <ListView
          tasks={tasks}
          members={members}
          onToggle={toggleTask}
          onEdit={handleEdit}
          onDelete={deleteTask}
          onAdd={handleAdd}
        />
      ) : (
        <CalView
          tasks={tasks}
          onDayClick={(day, ym, ds) => setDayModal({ day, ym, deals: ds })}
          onAdd={handleAdd}
        />
      )}

      {/* タスク追加/編集モーダル */}
      {showModal && (
        <TaskModal
          task={editTask}
          members={members}
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
