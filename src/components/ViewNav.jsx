import { BarChart2, List, Kanban, User, TrendingUp, Settings } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

const VIEWS = [
  { id: "summary",  label: "サマリー",   Icon: BarChart2  },
  { id: "list",     label: "ヨミ一覧",   Icon: List        },
  { id: "kanban",   label: "カンバン",   Icon: Kanban      },
  { id: "personal", label: "ランキング",  Icon: User        },
  { id: "analysis", label: "個人数字",   Icon: TrendingUp  },
  { id: "settings", label: "設定",       Icon: Settings    },
];

export default function ViewNav() {
  const { activeView, setActiveView } = useApp();

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
