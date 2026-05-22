import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import KabutoLogo from "../assets/KabutoLogo.jsx";
import { DISPLAY_GROUPS, MEMBER_MASTER_NAMES } from "../constants/index.js";

const SF = "#0070d2";

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

  /* ── 入力フィールド共通スタイル（白ライト系：半透明白 + 白テキスト） ── */
  const INP =
    "w-full px-4 py-3 rounded-xl text-sm text-white " +
    "border border-white/20 focus:outline-none focus:border-blue-300/70 " +
    "focus:ring-2 focus:ring-blue-400/15 transition placeholder:text-white/35";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(150deg,#00101f 0%,#001a38 30%,#002a5c 65%,#0050a0 100%)" }}
    >
      {/* 背景: 微細グリッドパターン */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      {/* 背景: 中央グロー */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "28%", left: "50%", transform: "translate(-50%,-50%)",
          width: "800px", height: "500px",
          background: "radial-gradient(ellipse,rgba(0,112,210,0.22) 0%,transparent 68%)",
        }}
      />

      {/* ── コンテンツ ── */}
      <div className="w-full max-w-sm relative z-10">

        {/* ロゴエリア */}
        <div className="text-center mb-9">
          {logoDataUrl ? (
            <div className="inline-flex mb-5">
              <img
                src={logoDataUrl}
                alt="logo"
                className="w-20 h-20 rounded-2xl object-contain"
              />
            </div>
          ) : (
            /* drop-shadow をDIVではなくSVG内部に閉じ込めることで白い矩形を回避 */
            <div className="inline-flex mb-5">
              <KabutoLogo size={84} transparent />
            </div>
          )}
          <h1
            className="text-[30px] font-black text-white leading-none"
            style={{ letterSpacing: "0.22em", textShadow: "0 2px 20px rgba(0,112,210,0.5)" }}
          >
            HONNOJI
          </h1>
          <p
            className="mt-2 text-xs font-bold"
            style={{ letterSpacing: "0.45em", color: "rgba(255,255,255,0.3)" }}
          >
            no HEN
          </p>
        </div>

        {/* ── ログインカード（ガラス） ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(0,12,35,0.72)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow:
              "0 24px 48px rgba(0,0,0,0.55)," +
              "0 0 0 1px rgba(255,255,255,0.04)," +
              "inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* カードヘッダーバー */}
          <div
            className="px-6 py-3.5 flex items-center gap-2"
            style={{
              background: "rgba(0,100,200,0.55)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Lock size={13} className="text-white/70 flex-none" />
            <span className="text-[13px] font-bold text-white tracking-wide">ログイン</span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* メンバー選択 */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-white/40 mb-1.5 uppercase">
                メンバー
              </label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setError(""); }}
                className={INP + " cursor-pointer appearance-none"}
                style={{ background: "rgba(255,255,255,0.10)" }}
              >
                <option value="" disabled>メンバーを選択してください...</option>
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
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest text-white/40 mb-1.5 uppercase">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(""); }}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  className={INP + " pr-10"}
                  style={{ background: "rgba(255,255,255,0.10)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <p className="text-xs font-semibold text-red-300 bg-red-500/15 border border-red-400/25 rounded-xl px-3 py-2.5">
                {error}
              </p>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all
                active:scale-[.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? "rgba(0,112,210,0.6)"
                  : `linear-gradient(135deg,${SF} 0%,#004fa8 100%)`,
                boxShadow: loading
                  ? "none"
                  : "0 4px 20px rgba(0,112,210,0.45),inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> ログイン中…</>
              ) : (
                <><span>ログイン</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        {/* フッター */}
        <p
          className="text-center text-xs mt-5 tracking-wider"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          GMO TECH株式会社 / 営業部
        </p>
      </div>
    </div>
  );
}
