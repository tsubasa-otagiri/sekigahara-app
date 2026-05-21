import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import KabutoLogo from "../assets/KabutoLogo.jsx";

export default function Login() {
  const { login, members, logoDataUrl } = useApp();

  const activeMembers = members.filter(m => m.status === "active");

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

  /* Salesforce Blue グラデーション背景 */
  const BG = "linear-gradient(135deg,#001639 0%,#032d60 50%,#0070d2 100%)";
  const SF_BLUE = "#0070d2";
  const SF_DARK = "#005a9e";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">

        {/* ── ロゴエリア ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 drop-shadow-xl">
            {logoDataUrl
              ? <img
                  src={logoDataUrl}
                  alt="HONNOJI logo"
                  className="w-[72px] h-[72px] rounded-2xl object-contain"
                />
              : <KabutoLogo size={72} color={SF_BLUE} />
            }
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">HONNOJI</h1>
          <p className="text-gray-400 text-sm mt-1 font-semibold tracking-wide">no HEN</p>
        </div>

        {/* ── カード ── */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* カードヘッダーバー */}
          <div className="px-6 py-4" style={{ background: SF_BLUE }}>
            <div className="flex items-center gap-2 text-white">
              <Lock size={15} />
              <span className="text-sm font-bold">ログイン</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* メンバー選択 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">メンバー</label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setError(""); }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white
                  focus:outline-none focus:border-[#0070d2] focus:ring-2 focus:ring-[#d8edff]
                  transition appearance-none cursor-pointer text-slate-700"
              >
                <option value="" disabled>メンバーを選択してください...</option>
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}（{m.team}）</option>
                ))}
              </select>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">パスワード</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(""); }}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm
                    focus:outline-none focus:border-[#0070d2] focus:ring-2 focus:ring-[#d8edff] transition"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* エラー */}
            {error && (
              <p className="text-xs text-red-600 font-medium bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* ログインボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-bold shadow
                hover:brightness-110 active:scale-[.98] transition disabled:opacity-60
                flex items-center justify-center gap-2"
              style={{ background: loading ? SF_BLUE : `linear-gradient(135deg,${SF_BLUE},${SF_DARK})` }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> ログイン中…</>
                : "ログイン"
              }
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">© GMO Tech Solutions</p>
      </div>
    </div>
  );
}
