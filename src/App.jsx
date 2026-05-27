import { useEffect, useRef } from "react";
import { AppProvider } from "./contexts/AppContext.jsx";
import { useApp } from "./contexts/useApp.js";
import Login from "./components/Login.jsx";
import Header from "./components/Header.jsx";
import MonthEndPanel, { MonthEndBanner, useMonthEndWarning } from "./components/MonthEndPanel.jsx";
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
import { LS_KEYS } from "./constants/index.js";

/* ── 期限監視フック ── */
function useTaskDeadlineWatcher() {
  const { tasks, addNotifLog, currentUserId, currentUser, getMyNotifSettings } = useApp();

  /*
   * notifiedRef: セッション中の発火済みキー管理
   * ★ localStorage にも永続化するため、リロード後に同じ通知が重複発火しない
   */
  const notifiedRef = useRef(null); // null = まだ初期化されていない

  useEffect(() => {
    if (!currentUserId) return;
    const myName = currentUser?.name || "";
    /* currentUser が確定していない間はスキップ（依存配列に currentUser があるので再実行される） */
    if (!myName) return;

    /* ── 初回のみ: localStorage から発火済みキーを復元 ── */
    const lsKey = `${LS_KEYS.WATCHER_PFX}${currentUserId}`;
    if (notifiedRef.current === null) {
      try {
        const saved = JSON.parse(localStorage.getItem(lsKey) || "[]");
        notifiedRef.current = new Set(saved);
      } catch {
        notifiedRef.current = new Set();
      }
    }

    /* キーを発火済みとしてメモリ + localStorage の両方に保存 */
    const markFired = (k) => {
      notifiedRef.current.add(k);
      try {
        /* 古いキーが溜まりすぎないよう最新500件に制限 */
        const arr = [...notifiedRef.current];
        localStorage.setItem(lsKey, JSON.stringify(arr.slice(-500)));
      } catch {}
    };

    const check = () => {
      const { notifyOnTaskReminder } = getMyNotifSettings(currentUserId);
      const now = Date.now();

      tasks.forEach(t => {
        if (t.completed || !t.dueDate) return;

        /* ★ 自分が担当者のタスクのみを通知対象とする */
        const isMyTask = (t.assignee === myName);

        const due = new Date(t.dueDate + "T23:59:59").getTime();
        const diffH = (due - now) / 3600000;

        /* 期限1日前アラート */
        const key24 = `${t.id}_24h`;
        if (diffH > 0 && diffH <= 24 && !notifiedRef.current.has(key24)) {
          markFired(key24); // 担当者不問でキーを記録（重複防止）
          if (isMyTask) {
            const body = `担当: ${myName}`;
            if (notifyOnTaskReminder)
              fireNotif(`⏰ 期限1日前: ${t.title}`, body, () => window.focus());
            addNotifLog({
              taskId: t.id, type: "task_deadline",
              targetUser: myName, // ★ 必ず自分の名前をセット
              title: `⏰ 期限1日前: ${t.title}`, body,
            });
          }
        }

        /* 期限1時間前アラート */
        const key1h = `${t.id}_1h`;
        if (diffH > 0 && diffH <= 1 && !notifiedRef.current.has(key1h)) {
          markFired(key1h);
          if (isMyTask) {
            const body = `担当: ${myName}`;
            if (notifyOnTaskReminder)
              fireNotif(`🔴 期限1時間前: ${t.title}`, body, () => window.focus());
            addNotifLog({
              taskId: t.id, type: "task_overdue",
              targetUser: myName,
              title: `🔴 期限1時間前: ${t.title}`, body,
            });
          }
        }
      });
    };

    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [tasks, currentUserId, currentUser, addNotifLog, getMyNotifSettings]);
}

/* ── 月末チェックリスト: 勤怠申請 18:55 専用ウォッチャー ── */
function useKintaiPanelWatcher() {
  const { currentUserId, currentUser, currentYear, currentMonth,
          monthEndChecks, panelTasks, addNotifLog, getMyNotifSettings } = useApp();
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (!currentUserId) return;
    const myName = currentUser?.name || "";
    if (!myName) return;

    /* 勤怠チェックがすでに済んでいるか */
    const month = (() => {
      if (!currentMonth) return new Date().getMonth() + 1;
      if (typeof currentMonth === "number") return currentMonth;
      const s = String(currentMonth);
      return parseInt(s.includes("-") ? s.split("-")[1] : s, 10);
    })();
    const year = currentYear || new Date().getFullYear();
    const ym   = `${year}-${String(month).padStart(2, "0")}`;

    const check = () => {
      const raw = monthEndChecks?.[`${currentUserId}_${ym}`];
      // isKintai タスクの ID を動的に取得
      const kintaiTask = (panelTasks || []).find(t => t.isKintai);
      const kintaiId   = kintaiTask?.id || "pt5";
      const kintaiDone = Array.isArray(raw) ? raw[5] === true : !!(raw?.[kintaiId]); // 旧フォーマット互換
      if (kintaiDone) return; // 完了済みなら通知不要

      const now = new Date();
      const h   = now.getHours();
      const m   = now.getMinutes();
      const key = `kintai_panel_${currentUserId}_${ym}`;

      /* 当日判定: 同じ年月の最終営業日かどうかはシンプルにh===18&&m>=55で発火 */
      if (h === 18 && m >= 55 && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        const { notifyOnTaskReminder } = getMyNotifSettings(currentUserId);
        if (notifyOnTaskReminder) {
          fireNotif(
            "🔔 勤怠申請の締め切りです！",
            `${myName} さん、18:55になりました。今すぐ申請してください！`,
            () => window.focus()
          );
        }
        addNotifLog({
          taskId: null, type: "task_overdue",
          targetUser: myName,
          title: "🔔 勤怠申請の締め切りです！",
          body: "18:55になりました。今すぐ申請してください！",
        });
      }
    };

    check();
    const timer = setInterval(check, 30000); // 30秒ごとにチェック
    return () => clearInterval(timer);
  }, [currentUserId, currentUser, currentYear, currentMonth, monthEndChecks, addNotifLog, getMyNotifSettings]);
}

function MainApp() {
  const {
    currentUserId, activeView,
    showNewDeal, setShowNewDeal,
    editingDeal, setEditingDeal,
    showPwPrompt,
  } = useApp();

  /* 月末警告バナー用データ */
  const { activeWarn, daysToEnd, incomplete, lastBizDay } = useMonthEndWarning();

  /* 通知許可 — ログイン後に一度だけ要求 */
  useEffect(() => {
    if (!currentUserId) return;
    requestNotifPermission();
  }, [currentUserId]);

  /* 期限監視 */
  useTaskDeadlineWatcher();

  /* 月末チェックリスト 勤怠18:55ウォッチャー */
  useKintaiPanelWatcher();

  if (!currentUserId) return <Login />;

  const closeDealModal = () => {
    setShowNewDeal(false);
    setEditingDeal(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f4f6f9" }}>

      {/* ── 月末警告バナー（Header の直上 layout-flow） ── */}
      {activeWarn && (
        <MonthEndBanner
          daysToEnd={daysToEnd}
          incomplete={incomplete}
          lastBizDay={lastBizDay}
          onOpen={() => {/* MonthEndPanel が自身で open 管理 — タブクリック相当 */
            document.getElementById("month-end-tab-btn")?.click();
          }}
        />
      )}

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

      {/* ── 月末処理チェックリスト（タブ + パネル + 起動モーダル） ── */}
      <MonthEndPanel />
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
