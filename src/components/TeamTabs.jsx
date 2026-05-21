import { useApp } from "../contexts/useApp.js";
import { ALL_TABS, THEX } from "../constants/index.js";

export default function TeamTabs() {
  const { activeTab, setActiveTab } = useApp();

  return (
    <div className="bg-white sticky top-14 z-30" style={{ borderBottom: "1px solid #f1f5f9", boxShadow: "0 1px 0 0 rgba(0,0,0,.03)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex overflow-x-auto no-scrollbar">
          {ALL_TABS.map(tab => {
            const isActive  = tab === activeTab;
            const color     = THEX[tab] ?? "#6d28d9";
            const isPre     = tab === "鈴木Tプレ";
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold
                  whitespace-nowrap select-none outline-none transition-colors duration-150"
                style={{
                  color: isActive ? color : "#94a3b8",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#64748b"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#94a3b8"; }}
              >
                {/* チームカラードット */}
                <span
                  className="w-1.5 h-1.5 rounded-full flex-none transition-opacity duration-150"
                  style={{ background: color, opacity: isActive ? 1 : 0.35 }}
                />
                {tab}
                {/* 合算バッジ */}
                {isPre && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full leading-none"
                    style={{ background: color + "22", color }}>
                    合算
                  </span>
                )}
                {/* アクティブ下線 — smooth transition */}
                <span
                  className="absolute bottom-0 left-0 right-0 transition-all duration-200"
                  style={{
                    height: 2,
                    background: isActive ? color : "transparent",
                    borderRadius: "2px 2px 0 0",
                    transform: isActive ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "center",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
