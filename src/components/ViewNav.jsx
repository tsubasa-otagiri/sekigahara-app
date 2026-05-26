import { BarChart2, List, Kanban, User, Users, TrendingUp, Settings, XCircle, CalendarDays } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

const ALL_VIEWS = [
  { id: "summary",      label: "サマリー",       Icon: BarChart2,  adminOnly: false },
  { id: "list",         label: "ヨミ一覧",       Icon: List,       adminOnly: false },
  { id: "kanban",       label: "カンバン",       Icon: Kanban,     adminOnly: false },
  { id: "calendar",     label: "受注予定",        Icon: CalendarDays, adminOnly: false },
  { id: "lost",         label: "失注",           Icon: XCircle,    adminOnly: false },
  { id: "personal",     label: "個人ランキング",  Icon: User,       adminOnly: false },
  { id: "team-ranking", label: "チームランキング", Icon: Users,      adminOnly: false },
  { id: "analysis",     label: "個人数字",       Icon: TrendingUp, adminOnly: false },
  { id: "settings",     label: "設定",           Icon: Settings,   adminOnly: true  },
];

export default function ViewNav() {
  const { activeView, setActiveView, currentUser } = useApp();
  const isAdmin = currentUser?.role === "admin";

  /* 管理者以外には adminOnly タブを非表示 */
  const VIEWS = ALL_VIEWS.filter(v => !v.adminOnly || isAdmin);

  return (
    <div className="bg-slate-50/80" style={{ borderBottom: "1px solid #e2e8f0" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1.5">
          {VIEWS.map(({ id, label, Icon }) => {
            const isActive = id === activeView;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg
                  text-[11px] font-semibold whitespace-nowrap transition-all duration-150 outline-none
                  ${isActive
                    ? "bg-white text-[#0070d2] shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }`}
                style={isActive ? { boxShadow: "0 1px 3px 0 rgba(0,112,210,.12), 0 0 0 1px rgba(0,112,210,.08)" } : {}}
              >
                <Icon size={12} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
