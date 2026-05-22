import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import KabutoLogo from "../assets/KabutoLogo.jsx";
import { DISPLAY_GROUPS, MEMBER_MASTER_NAMES } from "../constants/index.js";

const SF = "#0070d2";

/* フィールド共通スタイル */
const FIELD =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-700 bg-white " +
  "border border-slate-200 focus:outline-none focus:border-blue-400 " +
  "focus:ring-2 focus:ring-blue-100 transition placeholder:text-slate-400";

export default function Login() {
  const { login, members, logoDataUrl } = useApp();
  const activeMembers = members.filter(m => m.status === "active");

  /* マスター順グループ化 */
  const memberGroups = DISPLAY_GROUPS.map(g => ({
    label: g.label,
    members: g.names.map(name => activeMembers.find(m => m.name === name)).filter(Boolean),
  })).filter(g => g.members.length > 0);
  const ungrouped = activeMembers.filter(m => !MEMBER_MASTER_NAMES.includes(m.name));

  const [selectedId, setSelectedId] = useState("");
  const [pw,         setPw]         = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId || !pw) { setError("メンバーを選択してパスワードを入力してください"); return; }
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 400));
    const ok = login(selectedId, pw);
    setLoading(false);
    if (!ok) setError("パスワードが正しくありません");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(150deg,#00101f 0%,#001a38 30%,#002a5c 65%,#0050a0 100%)" }}
    >
      {/* 背景グリッド */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* ── 白カード ── */}
      <div
        className="relative z-10 w-full max-w-sm bg-white rounded-3xl px-8 py-8"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
      >
        {/* ロゴ＋タイトル */}
        <div className="flex items-center gap-3 mb-7">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt="logo"
              className="w-11 h-11 rounded-2xl object-contain flex-none"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-2xl flex-none flex items-center justify-center"
              style={{ background: SF }}
            >
              <KabutoLogo size={28} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              HONNOJI
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 tracking-widest">no HEN</p>
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* メンバー選択 */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              メンバー選択
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setError(""); }}
                className={FIELD + " appearance-none cursor-pointer pr-9"}
              >
                <option value="" disabled>-- 選択してください --</option>
                {memberGroups.map(g => (
                  <optgroup key={g.label} label={`── ${g.label} ──`}>
                    {g.members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
                {ungrouped.length > 0 && (
                  <optgroup label="── 管理者 ──">
                    {ungrouped.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {/* カスタム矢印 */}
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                width="14" height="8" viewBox="0 0 14 8" fill="none"
              >
                <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => { setPw(e.target.value); setError(""); }}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className={FIELD + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <p className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-sm font-bold
              flex items-center justify-center gap-2 transition disabled:opacity-60
              hover:brightness-110 active:scale-[.98]"
            style={{ background: SF }}
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> ログイン中…</>
              : "ログイン"
            }
          </button>
        </form>

        {/* フッター */}
        <p className="text-center text-[11px] text-slate-300 mt-6 tracking-wide">
          GMO TECH株式会社 / 営業部
        </p>
      </div>
    </div>
  );
}
