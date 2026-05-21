import { AppProvider } from "./contexts/AppContext.jsx";
import { useApp } from "./contexts/useApp.js";
import Login from "./components/Login.jsx";
import Header from "./components/Header.jsx";
import TeamTabs from "./components/TeamTabs.jsx";
import ViewNav from "./components/ViewNav.jsx";
import DealModal from "./components/DealModal.jsx";
import SummaryView  from "./components/views/SummaryView.jsx";
import YomiView     from "./components/views/YomiView.jsx";
import KanbanView   from "./components/views/KanbanView.jsx";
import StatsView    from "./components/views/StatsView.jsx";
import AnalysisView from "./components/views/AnalysisView.jsx";
import SettingsView from "./components/views/SettingsView.jsx";

function MainApp() {
  const {
    currentUserId, activeView,
    showNewDeal, setShowNewDeal,
    editingDeal, setEditingDeal,
  } = useApp();

  if (!currentUserId) return <Login />;

  const closeDealModal = () => {
    setShowNewDeal(false);
    setEditingDeal(null);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f4f6f9" }}>
      <Header />
      <TeamTabs />
      <ViewNav />

      <main className="flex-1">
        {activeView === "summary"  && <SummaryView />}
        {activeView === "list"     && <YomiView />}
        {activeView === "kanban"   && <KanbanView />}
        {activeView === "personal" && <StatsView />}
        {activeView === "analysis" && <AnalysisView />}
        {activeView === "settings" && <SettingsView />}
      </main>

      {/* 新規案件 / 編集モーダル — どのビューからでも開く */}
      {(showNewDeal || editingDeal) && (
        <DealModal deal={editingDeal} onClose={closeDealModal} />
      )}
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
