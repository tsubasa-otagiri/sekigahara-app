import { useApp } from "../contexts/useApp.js";
import { ALL_TABS, THEX } from "../constants/index.js";

const MY_COLOR = "#0070d2"; // SF ブルー（マイタブ専用）

export default function TeamTabs() {
  const { activeTab, setActiveTab, currentUser } = useApp();

  /* 全タブ: 「マイ」を一番左端に配置 */
  const tabs = currentUser ? ["マイ", ...ALL_TABS] : ALL_TABS;

  return (
    <div className="bg-white" style={{ borderBottom: "1px solid #f1f5f9" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const isMy     = tab === "マイ";
            const isActive = tab === activeTab;
            const color    = isMy ? MY_COLOR : (THEX[tab] ?? "#6d28d9");
            const isPre    = tab === "鈴木Tプレ";

            /* マイタブ: ボタン型デザイン（当月ボタンスタイル） */
            if (isMy) {
              return (
                <div key={tab} className="flex items-center px-3 shrink-0">
                  <button
                    onClick={() => setActiveTab(tab)}
                    className="flex flex-col items-center justify-center select-none outline-none cursor-pointer transition-all hover:brightness-110"
                    style={{
                      background: MY_COLOR,
                      color: "#fff",
                      border: `1.5px solid ${MY_COLOR}`,
                      borderRadius: "4px",
                      padding: "4px 12px",
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.03em",
                    }}
                  >
                    <span className="leading-tight">マイページ</span>
                    <span style={{ fontSize: "9px", fontWeight: "500", color: "rgba(255,255,255,0.7)", marginTop: "1px" }}>
                      {currentUser?.name}
                    </span>
                  </button>
                </div>
              );
            }

            /* 通常タブ */
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative shrink-0 flex items-center gap-1.5 px-4 py-3 text-[12px] font-semibold
                  whitespace-nowrap select-none outline-none transition-colors duration-150"
                style={{ color: isActive ? color : "#94a3b8" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#64748b"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#94a3b8"; }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-none transition-opacity duration-150"
                  style={{ background: color, opacity: isActive ? 1 : 0.35 }}
                />
                {tab}
                {isPre && (
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full leading-none"
                    style={{ background: color + "22", color }}>
                    合算
                  </span>
                )}
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
