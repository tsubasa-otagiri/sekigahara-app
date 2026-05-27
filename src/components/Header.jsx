import { useState } from "react";
import { Plus, Search, LogOut, HelpCircle, MessageSquarePlus } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { THEX } from "../constants/index.js";
import KabutoLogo from "../assets/KabutoLogo.jsx";
import HelpModal from "./HelpModal.jsx";
import RequestModal from "./RequestModal.jsx";
import NotificationCenter from "./NotificationCenter.jsx";

const ROLE_BG = {
  admin:  "#9c27b0",
  leader: "#e8590c",
  IS:     "#0176d3",
  FS:     "#04844b",
};

const SF_BLUE = "#0070d2";

export default function Header() {
  const {
    currentUser, logout,
    searchQuery, setSearchQuery,
    setShowNewDeal,
    activeTab,
    logoDataUrl,
  } = useApp();

  const [helpOpen,    setHelpOpen]    = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const teamColor = THEX[activeTab] ?? SF_BLUE;

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-white/97 backdrop-blur-sm"
        style={{ borderBottom: "1px solid #dddbda", boxShadow: "0 1px 0 0 rgba(0,0,0,.04)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">

          {/* ── ブランドロゴ ── */}
          <div className="flex items-center gap-2 shrink-0 mr-1">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="HONNOJI logo"
                className="w-8 h-8 rounded-lg object-contain flex-none"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex-none flex items-center justify-center"
                style={{ background: SF_BLUE }}
              >
                <KabutoLogo size={22} />
              </div>
            )}
            <div className="hidden sm:flex flex-col leading-none">
              <span className="text-[13px] font-black text-slate-800 tracking-tight">HONNOJI</span>
              <span className="text-[9px] font-semibold text-slate-400 tracking-widest">no HEN</span>
            </div>
          </div>

          {/* ── アクティブチームバッジ ── */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-none"
            style={{
              color: teamColor,
              borderColor: teamColor + "40",
              background: teamColor + "12",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: teamColor }} />
            {activeTab}
          </div>

          {/* ── 検索窓 ── */}
          <div className="flex-1 relative max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="会社名・担当者で検索..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-full bg-[#f3f7f9] border border-transparent
                focus:bg-white focus:border-[#0070d2] focus:ring-2 focus:ring-[#d8edff]
                outline-none transition-all placeholder:text-slate-400 text-slate-700"
            />
          </div>

          <div className="flex-1" />

          {/* ── 要望 ＋ ヘルプ ＋ 新規案件ボタン ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 通知センター */}
            <NotificationCenter />

            {/* 要望依頼ボタン */}
            <button
              onClick={() => setRequestOpen(true)}
              title="要望・ご意見"
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl
                transition-all active:scale-95 hover:bg-blue-50"
              style={{
                color: SF_BLUE,
                border: `1.5px solid ${SF_BLUE}`,
                background: "#fff",
              }}
            >
              <MessageSquarePlus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">要望</span>
            </button>

            {/* ヘルプボタン（アウトラインスタイル） */}
            <button
              onClick={() => setHelpOpen(true)}
              title="操作マニュアル"
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl
                transition-all active:scale-95 hover:bg-blue-50"
              style={{
                color: SF_BLUE,
                border: `1.5px solid ${SF_BLUE}`,
                background: "#fff",
              }}
            >
              <HelpCircle size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">ヘルプ</span>
            </button>

            {/* 新規案件ボタン */}
            <button
              onClick={() => setShowNewDeal(true)}
              className="flex items-center gap-1.5 text-white text-[11px] font-bold
                px-3.5 py-2 rounded-xl shadow-sm transition-all active:scale-95
                hover:brightness-110"
              style={{ background: SF_BLUE }}
            >
              <Plus size={13} strokeWidth={2.5} />
              <span className="hidden sm:inline">新規案件</span>
            </button>
          </div>

          {/* ── ユーザーアバター + ログアウト ── */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex flex-col items-end leading-none">
              <span className="text-[12px] font-semibold text-slate-700">{currentUser?.name}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">{currentUser?.team}</span>
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-black flex-none"
              style={{ background: ROLE_BG[currentUser?.role] ?? SF_BLUE }}
            >
              {currentUser?.name?.[0] ?? "?"}
            </div>
            <button
              onClick={logout}
              title="ログアウト"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ヘルプモーダル */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {/* 要望モーダル */}
      {requestOpen && <RequestModal onClose={() => setRequestOpen(false)} />}
    </>
  );
}
