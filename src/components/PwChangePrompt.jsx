import { useState } from "react";
import { ShieldAlert, Key, Eye, EyeOff } from "lucide-react";
import { useApp } from "../contexts/useApp.js";

const INP = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0070d2] focus:border-transparent transition";

export default function PwChangePrompt() {
  const { currentUser, updateMember, setShowPwPrompt } = useApp();

  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPw.length < 4)      { setError("4文字以上で入力してください"); return; }
    if (newPw !== confirmPw)   { setError("パスワードが一致しません"); return; }
    if (newPw === "1111")      { setError("初期パスワードは使用できません"); return; }
    updateMember(currentUser.id, { pw: newPw });
    setDone(true);
    setTimeout(() => setShowPwPrompt(false), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* ── 完了表示 ── */}
        {done ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Key size={24} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-gray-800">パスワードを変更しました</p>
            <p className="text-xs text-gray-400 mt-1">このメッセージは次回から表示されません</p>
          </div>
        ) : (
          <>
            {/* ── ヘッダー帯 ── */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: "#fff8ed", borderBottom: "1px solid #fed7aa" }}>
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-none">
                <ShieldAlert size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">初期パスワードのままです</p>
                <p className="text-xs text-gray-500 mt-0.5">セキュリティのため変更をおすすめします</p>
              </div>
            </div>

            {/* ── フォーム ── */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* 新しいパスワード */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">新しいパスワード</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    className={INP + " pr-10"}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setError(""); }}
                    placeholder="4文字以上"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>

              {/* 確認 */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">確認（再入力）</label>
                <input
                  type={showPw ? "text" : "password"}
                  className={INP}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                  placeholder="同じパスワードを入力"
                />
              </div>

              {/* エラー */}
              {error && (
                <p className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* ボタン */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPwPrompt(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-50 transition"
                >
                  後で
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition hover:brightness-110 flex items-center justify-center gap-1.5 shadow-sm"
                  style={{ background: "#0070d2" }}
                >
                  <Key size={12} /> 変更する
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
