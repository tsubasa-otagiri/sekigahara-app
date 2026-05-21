import { useState, useRef } from "react";
import { Plus, Edit2, Save, X, Eye, EyeOff, Download, Upload, FileText, Lock, UserX, UserCheck } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { TEAMS_OPT, ROLE_OPT, LS_KEYS } from "../../constants/index.js";
import { parseAmt, lsGet } from "../../utils/index.js";
import Confirm from "../ui/Confirm.jsx";

/* ── CSV ヘルパー ── */
function parseCSVLine(line) {
  const res = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { res.push(cur); cur = ""; }
    else cur += c;
  }
  res.push(cur);
  return res;
}
function csvEscape(v) { return `"${String(v ?? "").replace(/"/g, '""')}"`; }

/* ── 入力スタイル ── */
const INP = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const SEL = `${INP} appearance-none bg-white cursor-pointer`;
const BTN_PRI  = "px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm";
const BTN_GRAY = "px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition flex items-center gap-1.5";
const BTN_RED  = "px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition flex items-center gap-1.5 border border-red-200";

/* ━━━━━━━━ メンバーセクション ━━━━━━━━ */
function MembersSection() {
  const { members, addMember, updateMember, deleteMember, currentUser } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addForm,  setAddForm]  = useState({ name:"", team:"杉山T", role:"FS", target:30, pw:"1111" });
  const [showAdd,  setShowAdd]  = useState(false);
  const [confirm,  setConfirm]  = useState(null); // {id, name}

  const startEdit = (m) => { setEditId(m.id); setEditForm({ team: m.team, target: m.target, role: m.role }); };
  const cancelEdit = () => setEditId(null);
  const saveEdit = (id) => {
    updateMember(id, { team: editForm.team, target: Number(editForm.target) || 0, role: editForm.role });
    setEditId(null);
  };
  const toggleStatus = (m) => {
    if (m.status === "active") setConfirm({ id: m.id, name: m.name });
    else updateMember(m.id, { status: "active" });
  };
  const execRetire = () => {
    updateMember(confirm.id, { status: "inactive" });
    setConfirm(null);
  };
  const handleAdd = () => {
    if (!addForm.name.trim()) return;
    addMember({ ...addForm, badge: addForm.role, target: Number(addForm.target) || 30 });
    setAddForm({ name:"", team:"杉山T", role:"FS", target:30, pw:"1111" });
    setShowAdd(false);
  };

  const displayMembers = isAdmin
    ? members.filter(m => m.id !== "admin")
    : members.filter(m => m.id === currentUser?.id);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(v => !v)} className={BTN_PRI}>
            <Plus size={13} /> 新規メンバー追加
          </button>
        </div>
      )}

      {/* 追加フォーム */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-700">新規メンバー追加</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div><label className="text-[11px] text-gray-500 font-semibold mb-1 block">名前</label>
              <input className={INP} value={addForm.name} onChange={e => setAddForm(f=>({...f, name:e.target.value}))} placeholder="例: 田中" /></div>
            <div><label className="text-[11px] text-gray-500 font-semibold mb-1 block">チーム</label>
              <select className={SEL} value={addForm.team} onChange={e => setAddForm(f=>({...f, team:e.target.value}))}>
                {TEAMS_OPT.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label className="text-[11px] text-gray-500 font-semibold mb-1 block">ロール</label>
              <select className={SEL} value={addForm.role} onChange={e => setAddForm(f=>({...f, role:e.target.value}))}>
                {ROLE_OPT.map(r=><option key={r}>{r}</option>)}</select></div>
            <div><label className="text-[11px] text-gray-500 font-semibold mb-1 block">目標（万）</label>
              <input className={INP} type="number" value={addForm.target} onChange={e => setAddForm(f=>({...f, target:e.target.value}))} /></div>
            <div><label className="text-[11px] text-gray-500 font-semibold mb-1 block">初期パスワード</label>
              <input className={INP} value={addForm.pw} onChange={e => setAddForm(f=>({...f, pw:e.target.value}))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className={BTN_GRAY}><X size={12} />キャンセル</button>
            <button onClick={handleAdd} className={BTN_PRI}><Plus size={12} />追加</button>
          </div>
        </div>
      )}

      {/* メンバー一覧テーブル */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["名前", "チーム", "ロール", "目標（万）", "ステータス", "操作"].map(h=>(
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayMembers.map(m => {
                const isEditing = editId === m.id;
                const isRetired = m.status !== "active";
                return (
                  <tr key={m.id} className={`border-b border-gray-100 transition-colors ${isRetired ? "bg-gray-50 opacity-60" : "hover:bg-gray-50"}`}>
                    <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{m.name}</td>
                    <td className="px-3 py-2.5">
                      {isEditing && isAdmin
                        ? <select className={SEL + " w-28"} value={editForm.team} onChange={e=>setEditForm(f=>({...f, team:e.target.value}))}>
                            {TEAMS_OPT.map(t=><option key={t}>{t}</option>)}</select>
                        : <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">{m.team}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {isEditing && isAdmin
                        ? <select className={SEL + " w-24"} value={editForm.role} onChange={e=>setEditForm(f=>({...f, role:e.target.value}))}>
                            {ROLE_OPT.map(r=><option key={r}>{r}</option>)}</select>
                        : <span className="text-xs font-medium text-gray-600">{m.badge || m.role}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {isEditing
                        ? <input type="number" className={INP + " w-20"} value={editForm.target} onChange={e=>setEditForm(f=>({...f, target:e.target.value}))} />
                        : <span className="text-sm text-gray-700">{m.target}万</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isRetired ? "bg-gray-100 text-gray-500" : "bg-emerald-100 text-emerald-700"}`}>
                        {isRetired ? "退職" : "在籍"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={()=>saveEdit(m.id)} className={BTN_PRI}><Save size={12}/>保存</button>
                          <button onClick={cancelEdit} className={BTN_GRAY}><X size={12}/></button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={()=>startEdit(m)} className={BTN_GRAY} title="編集"><Edit2 size={12}/>編集</button>
                          {isAdmin && m.id !== "admin" && (
                            <button onClick={()=>toggleStatus(m)} className={isRetired ? BTN_GRAY : BTN_RED} title={isRetired?"復帰":"退職"}>
                              {isRetired ? <UserCheck size={12}/> : <UserX size={12}/>}
                              {isRetired ? "復帰" : "退職"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && (
        <Confirm
          message={`「${confirm.name}」を退職処理しますか？\nヨミ一覧からは削除されませんがログインできなくなります。`}
          danger okLabel="退職処理"
          onOk={execRetire} onCancel={()=>setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ━━━━━━━━ パスワード管理セクション ━━━━━━━━ */
function PasswordSection() {
  const { members, currentUser, updateMember } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const [targetId, setTargetId] = useState(currentUser?.id ?? "");
  const [newPw,    setNewPw]    = useState("");
  const [confirmPw,setConfirmPw]= useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [msg,      setMsg]      = useState(null); // {type:"ok"|"err", text}

  const changeTargets = isAdmin ? members.filter(m => m.status === "active") : [currentUser];

  const handleChange = () => {
    if (!newPw) { setMsg({type:"err", text:"新しいパスワードを入力してください"}); return; }
    if (newPw !== confirmPw) { setMsg({type:"err", text:"パスワードが一致しません"}); return; }
    if (newPw.length < 4) { setMsg({type:"err", text:"パスワードは4文字以上にしてください"}); return; }
    updateMember(targetId, { pw: newPw });
    setNewPw(""); setConfirmPw("");
    setMsg({type:"ok", text:"パスワードを変更しました"});
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="max-w-md space-y-4">
      {isAdmin && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">対象メンバー</label>
          <select className={SEL} value={targetId} onChange={e=>{setTargetId(e.target.value); setMsg(null);}}>
            {changeTargets.map(m=><option key={m.id} value={m.id}>{m.name}（{m.team}）</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">新しいパスワード</label>
        <div className="relative">
          <input type={showPw?"text":"password"} className={INP+" pr-10"} value={newPw}
            onChange={e=>{setNewPw(e.target.value); setMsg(null);}} placeholder="4文字以上" />
          <button type="button" onClick={()=>setShowPw(v=>!v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5">確認（再入力）</label>
        <input type={showPw?"text":"password"} className={INP} value={confirmPw}
          onChange={e=>{setConfirmPw(e.target.value); setMsg(null);}} placeholder="同じパスワードを入力" />
      </div>
      {msg && (
        <p className={`text-xs font-medium rounded-lg px-3 py-2 ${msg.type==="ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </p>
      )}
      <button onClick={handleChange} className={BTN_PRI}>
        <Lock size={13}/> パスワードを変更する
      </button>
    </div>
  );
}

/* ━━━━━━━━ バックアップセクション ━━━━━━━━ */
function BackupSection() {
  const { deals, members, currentUser, replaceDeals, replaceMembers } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const jsonRef = useRef(null);
  const csvRef  = useRef(null);
  const [status, setStatus] = useState("");

  const flash = (msg) => { setStatus(msg); setTimeout(()=>setStatus(""), 3500); };

  /* ── JSON エクスポート ── */
  const exportJSON = () => {
    const data = { version:1, exportedAt: new Date().toISOString(), members, deals };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sekigahara_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    flash("✅ JSONエクスポート完了");
  };

  /* ── JSON インポート ── */
  const importJSON = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.deals && !data.members) throw new Error();
        if (data.members) replaceMembers(data.members);
        if (data.deals)   replaceDeals(data.deals);
        flash("✅ JSONインポート完了（ページをリロードして反映を確認してください）");
      } catch { flash("❌ ファイルの形式が正しくありません"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── CSV エクスポート（管理者限定） ── */
  const exportCSV = () => {
    const headers = ["企業名","プラン","月額（万）","チーム","IS担当","FS担当","確度","フェーズ","メモ"];
    const rows = deals.map(d=>[d.company,d.plan,d.amount,d.team,d.is||"",d.fs||"",d.confidence,d.phase,d.note||""]);
    const csv = [headers, ...rows].map(r=>r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sekigahara_deals_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    flash("✅ CSVエクスポート完了");
  };

  /* ── CSV インポート（管理者限定） ── */
  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.replace(/^﻿/, "");
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        const [, ...dataLines] = lines; // ヘッダー行をスキップ
        const newDeals = dataLines.map((line, i) => {
          const cols = parseCSVLine(line);
          return {
            id: Date.now() + i,
            company:    cols[0] || "",
            plan:       cols[1] || "MDCスモール",
            amount:     parseAmt(cols[2]),
            team:       cols[3] || "",
            is:         cols[4] || "",
            fs:         cols[5] || "",
            confidence: cols[6] || "30%",
            phase:      cols[7] || "未設定",
            note:       cols[8] || "",
          };
        }).filter(d => d.company.trim());
        replaceDeals([...newDeals, ...deals]);
        flash(`✅ ${newDeals.length} 件の案件をインポートしました`);
      } catch { flash("❌ CSVの形式が正しくありません"); }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  return (
    <div className="space-y-5">
      {/* JSON バックアップ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-1">全データバックアップ</h3>
        <p className="text-xs text-gray-500 mb-4">案件・メンバー・パスワードなどすべてのデータをJSONとして保存・復元します。</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportJSON} className={BTN_PRI}>
            <Download size={13}/> JSONエクスポート
          </button>
          <label className={BTN_GRAY + " cursor-pointer"}>
            <Upload size={13}/> JSONインポート
            <input ref={jsonRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      {/* CSV（管理者限定） */}
      {isAdmin ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-700">案件CSVデータ管理</h3>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">管理者限定</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">案件データをCSV形式でExcel等に書き出し・一括インポートします。</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportCSV} className={BTN_PRI}>
              <FileText size={13}/> CSVエクスポート
            </button>
            <label className={BTN_GRAY + " cursor-pointer"}>
              <Upload size={13}/> CSVインポート（追加）
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
            </label>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            CSVフォーマット: 企業名, プラン, 月額（万）, チーム, IS担当, FS担当, 確度, フェーズ, メモ
          </p>
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 flex items-center gap-3">
          <Lock size={18} className="text-gray-400 flex-none" />
          <div>
            <p className="text-sm font-semibold text-gray-500">CSVデータ管理は管理者専用です</p>
            <p className="text-xs text-gray-400 mt-0.5">管理者アカウントでログインすると利用できます。</p>
          </div>
        </div>
      )}

      {/* ステータスメッセージ */}
      {status && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium transition-all
          ${status.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━ メインコンポーネント ━━━━━━━━ */
const SECTIONS = [
  { id:"members",  label:"メンバー" },
  { id:"password", label:"パスワード管理" },
  { id:"backup",   label:"バックアップ" },
];

export default function SettingsView() {
  const [section, setSection] = useState("members");

  return (
    /* 他ビューより濃いグレー背景 */
    <div className="min-h-full bg-gray-300/60 p-3 sm:p-5">
      <div className="max-w-4xl mx-auto">
        {/* ページタイトル */}
        <div className="mb-5">
          <h2 className="text-base font-black text-gray-700">設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">メンバー管理・パスワード変更・データバックアップ</p>
        </div>

        {/* セクションタブ */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition
                ${section === id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* セクション本体 */}
        {section === "members"  && <MembersSection />}
        {section === "password" && <PasswordSection />}
        {section === "backup"   && <BackupSection />}
      </div>
    </div>
  );
}
