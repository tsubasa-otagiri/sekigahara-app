import { useEffect, useRef } from "react";
import { AppProvider } from "./contexts/AppContext.jsx";
import { useApp } from "./contexts/useApp.js";
import Login from "./components/Login.jsx";
import Header from "./components/Header.jsx";
import TeamTabs from "./components/TeamTabs.jsx";
import PeriodNav from "./components/PeriodNav.jsx";
import ViewNav from "./components/ViewNav.jsx";
import DealModal        from "./components/DealModal.jsx";
import PwChangePrompt  from "./components/PwChangePrompt.jsx";
import RequestNotif    from "./components/RequestNotif.jsx";
import SummaryView  from "./components/views/SummaryView.jsx";
import YomiView     from "./components/views/YomiView.jsx";
import KanbanView   from "./components/views/KanbanView.jsx";
import StatsView    from "./components/views/StatsView.jsx";
import AnalysisView from "./components/views/AnalysisView.jsx";
import SettingsView from "./components/views/SettingsView.jsx";
import LostView          from "./components/views/LostView.jsx";
import TeamRankingView  from "./components/views/TeamRankingView.jsx";
import CalendarView    from "./components/views/CalendarView.jsx";
import TaskView       from "./components/views/TaskView.jsx";
import { requestNotifPermission, fireNotif } from "./utils/desktopNotif.js";

/* ── 期限監視フック ── */
function useTaskDeadlineWatcher() {
  const { tasks, addNotifLog, currentUserId, getMyNotifSettings } = useApp();
  /* 既に通知済みのタスクIDセットを ref で管理（セッション中） */
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const check = () => {
      const { notifyOnTaskReminder } = getMyNotifSettings(currentUserId);
      const now = Date.now();
      tasks.forEach(t => {
        if (t.completed || !t.dueDate) return;
        const due = new Date(t.dueDate + "T23:59:59").getTime();
        const diffH = (due - now) / 3600000;

        /* 1日前アラート */
        const key24 = `${t.id}_24h`;
        if (diffH > 0 && diffH <= 24 && !notifiedRef.current.has(key24)) {
          notifiedRef.current.add(key24);
          const body = t.assignee ? `担当: ${t.assignee}` : "担当者未設定";
          if (notifyOnTaskReminder) fireNotif(`⏰ 期限1日前: ${t.title}`, body, () => window.focus());
          addNotifLog({ taskId: t.id, type: "task_deadline",
            title: `⏰ 期限1日前: ${t.title}`, body });
        }

        /* 1時間前アラート */
        const key1 = `${t.id}_1h`;
        if (diffH > 0 && diffH <= 1 && !notifiedRef.current.has(key1)) {
          notifiedRef.current.add(key1);
          const body = t.assignee ? `担当: ${t.assignee}` : "担当者未設定";
          if (notifyOnTaskReminder) fireNotif(`🔴 期限1時間前: ${t.title}`, body, () => window.focus());
          addNotifLog({ taskId: t.id, type: "task_overdue",
            title: `🔴 期限1時間前: ${t.title}`, body });
        }
      });
    };

    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [tasks, currentUserId, addNotifLog, getMyNotifSettings]);
}

function MainApp() {
  const {
    currentUserId, activeView,
    showNewDeal, setShowNewDeal,
    editingDeal, setEditingDeal,
    showPwPrompt,
  } = useApp();

  /* 通知許可 — ログイン後に一度だけ要求 */
  useEffect(() => {
    if (!currentUserId) return;
    requestNotifPermission();
  }, [currentUserId]);

  /* 期限監視 */
  useTaskDeadlineWatcher();

  if (!currentUserId) return <Login />;

  const closeDealModal = () => {
    setShowNewDeal(false);
    setEditingDeal(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f4f6f9" }}>
      <Header />

      {/* ── 固定ナビ: チームタブ＋対象期間＋ビュー切替 ── */}
      <div
        className="sticky top-14 z-30 bg-white"
        style={{ boxShadow: "0 2px 8px -4px rgba(0,0,0,.12), 0 1px 0 0 rgba(0,0,0,.04)" }}
      >
        <TeamTabs />
        <PeriodNav />
        <ViewNav />
      </div>

      <main className="flex-1">
        {activeView === "summary"  && <SummaryView />}
        {activeView === "list"     && <YomiView />}
        {activeView === "kanban"   && <KanbanView />}
        {activeView === "lost"     && <LostView />}
        {activeView === "personal"     && <StatsView />}
        {activeView === "team-ranking" && <TeamRankingView />}
        {activeView === "calendar" && <CalendarView />}
        {activeView === "tasks"    && <TaskView />}
        {activeView === "analysis" && <AnalysisView />}
        {activeView === "settings" && <SettingsView />}
      </main>

      {/* 新規案件 / 編集モーダル — どのビューからでも開く */}
      {(showNewDeal || editingDeal) && (
        <DealModal deal={editingDeal} onClose={closeDealModal} />
      )}

      {/* 初回パスワード変更案内 */}
      {showPwPrompt && <PwChangePrompt />}

      {/* 要望対応通知バナー */}
      <RequestNotif />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
