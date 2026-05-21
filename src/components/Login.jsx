import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

export default function Login() {
  const { login, members } = useApp();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 shadow-lg">
            <span className="text-3xl font-black text-white" style={{ letterSpacing: "-1px" }}>関</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SEKIGAHARA</h1>
          <p className="text-blue-300 text-sm mt-1 font-medium">案件管理 by GMO</p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <Lock size={16} />
              <span className="text-sm font-semibold">ログイン</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* メンバー選択 */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                メンバー
              </label>
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setError(""); }}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer text-gray-700"
              >
                <option value="" disabled>メンバーを選択してください...</option>
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}（{m.team}）
                  </option>
                ))}
              </select>
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                パスワード
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(""); }}
                  placeholder="パスワード"
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* エラー */}
            {error && (
              <p className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow hover:opacity-90 active:scale-[.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> ログイン中…</>
                : "ログイン"
              }
            </button>
          </form>
        </div>

        <p className="text-center text-blue-400/60 text-xs mt-6">
          © GMO Tech Solutions
        </p>
      </div>
    </div>
  );
}
