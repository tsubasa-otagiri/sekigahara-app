import { useState, useRef, useMemo } from "react";
import ImageCropModal from "../ImageCropModal.jsx";
import ImportDealsModal from "../ImportDealsModal.jsx";
import DuplicateCleanser from "../DuplicateCleanser.jsx";
import { Plus, Edit2, Save, X, Eye, EyeOff, Download, Upload, FileText, Lock, UserX, UserCheck, Flag, Bell, BellOff, Trash2, ChevronUp, ChevronDown, GripVertical, ClipboardList, Sparkles, FileSpreadsheet, Layers } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { DEFAULT_PANEL_TASKS } from "../../contexts/AppContext.jsx";
import { TEAMS_OPT, ROLE_OPT, LS_KEYS } from "../../constants/index.js";
import { parseAmt, lsGet, normalizeName, normalizePeriod } from "../../utils/index.js";
import { getLastBizDay } from "../../utils/monthlyTasks.js";
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
  const { members, addMember, updateMember, deleteMember, currentUser, loginCounts } = useApp();
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
                {["名前", "チーム", "ロール", "目標（万）", "ステータス", ...(isAdmin ? ["ログイン / 更新"] : []), "操作"].map(h=>(
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
                    {isAdmin && (() => {
                      const lc = loginCounts[m.id];
                      const cnt  = lc?.count ?? 0;
                      const fmtDt = (iso) => iso
                        ? new Date(iso).toLocaleString("ja-JP", {
                            year:"numeric", month:"numeric", day:"numeric",
                            hour:"2-digit", minute:"2-digit",
                          })
                        : null;
                      const lastLogin  = fmtDt(lc?.lastLogin);
                      const lastUpdate = fmtDt(m.updatedAt);
                      return (
                        <td className="px-3 py-2.5 text-center min-w-[130px]">
                          {/* ログイン回数 */}
                          <div>
                            <span className="text-sm font-bold text-gray-700">{cnt}</span>
                            <span className="text-[10px] text-gray-400 font-normal ml-0.5">回</span>
                          </div>
                          {/* 最終ログイン日時 */}
                          {lastLogin && (
                            <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
                              <span className="text-gray-300 mr-0.5">🔑</span>{lastLogin}
                            </div>
                          )}
                          {/* 最新更新日時（プロフィール変更） */}
                          {lastUpdate && (
                            <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
                              <span className="text-gray-300 mr-0.5">✏️</span>{lastUpdate}
                            </div>
                          )}
                        </td>
                      );
                    })()}
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
  const { deals, members, currentUser, replaceDeals, replaceMembers, currentPeriod } = useApp();
  const isAdmin = currentUser?.role === "admin";

  const jsonRef = useRef(null);
  const csvRef  = useRef(null);
  const [status, setStatus] = useState("");
  const [showExcelImport,    setShowExcelImport]    = useState(false);
  const [showDupCleanser,    setShowDupCleanser]    = useState(false);

  const flash = (msg) => { setStatus(msg); setTimeout(()=>setStatus(""), 3500); };

  /* ── JSON エクスポート ── */
  const exportJSON = () => {
    const data = { version:1, exportedAt: new Date().toISOString(), members, deals };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `honnoji_${new Date().toISOString().slice(0,10)}.json`;
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
    /* 列順: id, 企業名, プラン, 月額(円), IS担当, FS担当, チーム, 確度, フェーズ, 備考, 対象年月 */
    const headers = ["id","企業名","プラン","月額","IS担当","FS担当","チーム","確度","フェーズ","備考","対象年月"];
    const rows = deals.map(d=>[
      d.id,
      d.company, d.plan,
      Math.round((d.amount||0)*10000),
      d.is||"", d.fs||"", d.team,
      d.confidence, d.phase, d.note||"", d.period||"",
    ]);
    const csv = [headers, ...rows].map(r=>r.map(csvEscape).join(",")).join("\r\n");
    const blob = new Blob(["﻿"+csv], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `honnoji_deals_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    flash("✅ CSVエクスポート完了");
  };

  /* ── CSV インポート（追加 or 更新） ── */
  const importCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result.replace(/^﻿/, "");
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const [headerLine, ...dataLines] = lines;

        /* ヘッダーから列インデックスを動的解決（旧フォーマット互換） */
        const headers = parseCSVLine(headerLine).map(h => h.trim());
        const col = (name) => headers.indexOf(name);
        const hasId = col("id") !== -1;

        /* 既存案件をMapに（ID文字列→deal） */
        const existingMap = new Map(deals.map(d => [String(d.id), d]));

        let added = 0, updated = 0;
        const updatedDeals = [...deals]; // 既存を複製

        dataLines.forEach((line, i) => {
          const c = parseCSVLine(line);
          const company = c[hasId ? col("企業名") : col("企業名") === -1 ? 0 : col("企業名")] || "";
          if (!company.trim()) return;

          /* フィールドパース */
          const rawPeriod = (c[hasId ? col("対象年月") : 9] || "").trim();
          const patch = {
            company,
            plan:       c[hasId ? col("プラン")    : 1] || "MDC",
            amount:     parseAmt(c[hasId ? col("月額")     : 2]),
            is:         normalizeName(c[hasId ? col("IS担当")  : 3] || ""),
            fs:         normalizeName(c[hasId ? col("FS担当")  : 4] || ""),
            team:       c[hasId ? col("チーム")   : 5] || "",
            confidence: c[hasId ? col("確度")     : 6] || "30%",
            phase:      c[hasId ? col("フェーズ") : 7] || "未設定",
            note:       c[hasId ? col("備考")     : 8] || "",
            /* ★ "Jun-26" 等Excel形式 → "2026-06" に正規化、空なら currentPeriod */
            period:     normalizePeriod(rawPeriod) || currentPeriod,
          };

          const rawId = hasId ? String(c[col("id")] || "").trim() : "";
          const existing = rawId ? existingMap.get(rawId) : null;

          if (existing) {
            /* 更新: 活動履歴など既存データは保持しつつ上書き
             * ★ 前回CSVから実際にフィールドが変わった場合のみ updatedAt をアップロード日時に更新
             *   変更なし → 既存の updatedAt を維持（放置アラートを誤リセットしない） */
            const idx = updatedDeals.findIndex(d => String(d.id) === rawId);
            if (idx !== -1) {
              const changed =
                existing.company    !== patch.company                        ||
                existing.plan       !== patch.plan                           ||
                existing.amount     !== patch.amount                         ||
                existing.is         !== patch.is                             ||
                existing.fs         !== patch.fs                             ||
                existing.team       !== patch.team                           ||
                existing.confidence !== patch.confidence                     ||
                existing.phase      !== patch.phase                          ||
                (existing.note  || "") !== (patch.note  || "")               ||
                (existing.period|| "") !== (patch.period|| "");
              updatedDeals[idx] = {
                ...existing,
                ...patch,
                updatedAt: changed ? new Date().toISOString() : existing.updatedAt,
              };
            }
            updated++;
          } else {
            /* 新規追加 — 必須フィールドをすべて揃えて追加
             * nextId() はページリロードで 101 にリセットされるため
             * 既存案件と ID が衝突し削除・更新が誤動作する原因になる。
             * タイムスタンプ＋インデックスの文字列 ID で衝突を防ぐ。 */
            const now = new Date().toISOString();
            updatedDeals.push({
              id:         `deal_${Date.now()}_${i}`,
              activities: [],
              lossReason: "",
              yomi:       patch.confidence,
              createdAt:  now,
              updatedAt:  now,
              ...patch,
            });
            added++;
          }
        });

        replaceDeals(updatedDeals);
        flash(`✅ 追加 ${added} 件 / 更新 ${updated} 件`);
      } catch (err) {
        console.error(err);
        flash("❌ CSVの形式が正しくありません");
      }
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

      {/* CSV / Excelインポート（管理者限定） */}
      {isAdmin ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-700">案件CSVデータ管理</h3>
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">管理者限定</span>
          </div>

          {/* 当月ヨミ Excelインポート */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileSpreadsheet size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-800 mb-0.5">当月ヨミ Excel 一括インポート</p>
                <p className="text-[11px] text-blue-600 mb-3">
                  「当月ヨミ(案件管理)」シートの横並び形式（30%/50%/70%/回収済み）を解析して一括登録・更新します。
                  法人格の表記ゆれ（株式会社・(株) など）は自動吸収。
                </p>
                <button
                  onClick={() => setShowExcelImport(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
                >
                  <FileSpreadsheet size={13} /> Excel インポートを開く
                </button>
              </div>
            </div>
          </div>

          {/* 重複クレンジング */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <Layers size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-800 mb-0.5">重複案件クレンジング</p>
                <p className="text-[11px] text-amber-600 mb-3">
                  企業名の表記ゆれ（株式会社あり・なし等）を正規化して重複案件を検出。
                  削除する件数を確認してから一括削除できます。
                </p>
                <button
                  onClick={() => setShowDupCleanser(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                >
                  <Layers size={13} /> 重複クレンジングを開く
                </button>
              </div>
            </div>
          </div>

          {/* 従来の CSV */}
          <div>
            <p className="text-xs text-gray-500 mb-3">従来の案件CSVデータ管理（エクスポート / インポート）</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportCSV} className={BTN_PRI}>
                <FileText size={13}/> CSVエクスポート
              </button>
              <label className={BTN_GRAY + " cursor-pointer"}>
                <Upload size={13}/> CSVインポート（追加 / 更新）
                <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
              </label>
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              CSVフォーマット: id, 企業名, プラン, 月額, IS担当, FS担当, チーム, 確度, フェーズ, 備考, 対象年月<br />
              id列が一致する行は更新、id列が空または新規の行は追加。活動履歴は保持されます。
            </p>
          </div>
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

      {showExcelImport  && <ImportDealsModal    onClose={() => setShowExcelImport(false)}  />}
      {showDupCleanser  && <DuplicateCleanser   onClose={() => setShowDupCleanser(false)}   />}

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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  旗印（ファビコン）セクション
 *  ── 陣頭に掲げる旗印を管理者権限で自由に変更できる ──
 *  画像をアップロードすると即座にタブアイコンに反映し、
 *  LocalStorage に保存することでリロード後も旗印を維持する。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* デフォルト旗印（HONNOJIロゴSVG） — リセット時に使用 */
/* デフォルト = なし（カスタム未設定時はロゴ・ファビコン非表示） */
const DEFAULT_FAVICON = null;

function FaviconSection() {
  const { currentUser, logoDataUrl, saveLogo } = useApp();
  const isAdmin = currentUser?.role === "admin";
  const fileRef = useRef(null);

  const [status,       setStatus]       = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [showFixModal, setShowFixModal] = useState(false);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(""), 3500); };

  const isCustom = !!logoDataUrl;

  /* ファイル選択 → トリミングモーダルを開く */
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      flash("❌ 画像ファイル（PNG / JPG / SVG / WebP）を選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      flash("❌ ファイルサイズは 5MB 以下にしてください");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* トリミングモーダルで「適用」 */
  const handleCropApply = (dataUrl) => {
    saveLogo(dataUrl);
    setPendingImage(null);
    flash("✅ 旗印を掲げました！ヘッダー・ログイン画面・タブに即時反映されました");
  };

  /* 旗印リセット（HONNOJIデフォルトに戻す） */
  const handleReset = () => {
    saveLogo(null);
    flash("🔄 旗印を削除しました（ロゴ・ファビコンなし）");
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 flex items-center gap-3">
        <Lock size={18} className="text-gray-400 flex-none" />
        <div>
          <p className="text-sm font-semibold text-gray-500">旗印の変更は管理者専用です</p>
          <p className="text-xs text-gray-400 mt-0.5">管理者アカウントでログインすると利用できます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 mb-1">
          <Flag size={14} className="text-blue-600" />
          <h3 className="text-sm font-bold text-gray-700">旗印（ファビコン）設定</h3>
          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">管理者限定</span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          ブラウザのタブに表示されるアイコンを自由に差し替えます。
          設定はこのブラウザの LocalStorage に保存され、リロード後も引き継がれます。
        </p>

        {/* 現在の旗印プレビュー */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 mb-5">
          <div className="w-14 h-14 rounded-xl border border-gray-300 shadow-sm flex items-center justify-center bg-white flex-none">
            {logoDataUrl
              ? <img src={logoDataUrl} alt="favicon preview" className="w-10 h-10 object-contain" />
              : <span className="text-gray-300 text-xs font-bold">なし</span>
            }
          </div>
          <div>
            <p className="text-xs font-bold text-gray-600">現在の旗印</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isCustom
                ? "✦ カスタム画像（LocalStorageに保存中）"
                : "未設定（ロゴ・ファビコンなし）"}
            </p>
            {isCustom && (
              <p className="text-[11px] text-blue-500 mt-1 font-medium">
                リロード後もこの旗印が引き継がれます
              </p>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-3">
          <label className={BTN_PRI + " cursor-pointer"}>
            <Upload size={13} />
            旗印を変更する
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
          {isCustom && (
            <>
              <button
                onClick={() => setShowFixModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold
                  text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition"
              >
                📌 アプリに固定する
              </button>
              <button onClick={handleReset} className={BTN_GRAY}>
                <X size={13} />
                デフォルトに戻す
              </button>
            </>
          )}
        </div>

        {/* 注意書き */}
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          対応形式: PNG / JPG / SVG / WebP　／　サイズ制限: 5MB 以下<br />
          アップロード後にトリミング・白背景透過・自動最大化が可能です
        </p>

        {/* シークレットモード注意 */}
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            現在の設定は <strong>このブラウザの LocalStorage</strong> に保存されています。
            シークレットモードや別のデバイスでは表示されません。<br />
            全環境で表示するには「📌 アプリに固定する」から開発者にコードを送ってください。
          </p>
        </div>

        {/* アプリ固定モーダル */}
        {showFixModal && logoDataUrl && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowFixModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-black text-slate-800">📌 アプリにファビコンを固定する</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                下記のコードを<strong>開発者（Claude）</strong>にそのまま貼り付けて送ってください。<br />
                コードがアプリに組み込まれると、シークレットモード・どのデバイスでも表示されます。
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-mono text-slate-500 break-all line-clamp-4 select-all">
                  {logoDataUrl.slice(0, 200)}...
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(logoDataUrl).then(() => {
                      setShowFixModal(false);
                      flash("✅ クリップボードにコピーしました！開発者に送ってください");
                    });
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:brightness-110"
                  style={{ background: "#0070d2" }}
                >
                  📋 コードをコピーする
                </button>
                <button
                  onClick={() => setShowFixModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ステータスメッセージ */}
      {status && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium transition-all
          ${status.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : status.startsWith("🔄") ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "bg-red-50 text-red-600 border border-red-200"}`}
        >
          {status}
        </div>
      )}

      {/* トリミング・調整モーダル */}
      {pendingImage && (
        <ImageCropModal
          src={pendingImage}
          onApply={handleCropApply}
          onCancel={() => setPendingImage(null)}
        />
      )}
    </div>
  );
}

/* ━━━━━━━━ メインコンポーネント ━━━━━━━━ */
/* ━━━━━━━━ 通知設定セクション（全ユーザー共通） ━━━━━━━━ */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 outline-none shrink-0
        ${checked ? "bg-[#0070d2]" : "bg-slate-200"} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
        ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function NotifSection() {
  const { currentUser, currentUserId, getMyNotifSettings, updateMyNotifSettings } = useApp();
  const s = getMyNotifSettings(currentUserId);

  const browserGranted = ("Notification" in window) && Notification.permission === "granted";
  const browserDenied  = ("Notification" in window) && Notification.permission === "denied";

  const toggle = (key, val) => updateMyNotifSettings(currentUserId, { [key]: val });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3"
        style={{ background: "linear-gradient(90deg,#0070d2 0%,#1589ee 100%)" }}>
        <Bell size={16} className="text-white shrink-0" />
        <div>
          <p className="text-sm font-black text-white">通知カスタム設定</p>
          <p className="text-[10px] text-blue-100 mt-0.5">{currentUser?.name} さんの個人設定（自動保存）</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* ブラウザ通知状態バナー */}
        {browserDenied && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <BellOff size={14} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600">
              ブラウザの通知がブロックされています。ブラウザの設定から許可してください。
            </p>
          </div>
        )}
        {!("Notification" in window) && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <BellOff size={14} className="text-amber-500 shrink-0" />
            <p className="text-[11px] font-bold text-amber-600">このブラウザはデスクトップ通知に対応していません。</p>
          </div>
        )}

        {/* 設定項目 */}
        {[
          {
            key: "notifyOnTaskAdded",
            label: "自分を担当者とする新規タスクが追加されたときにPC通知を受け取る",
            desc:  "他のメンバーが自分を担当者として割り当てたタスクが追加されたときに通知が届きます",
            icon:  "✅",
          },
          {
            key: "notifyOnTaskReminder",
            label: "自分が担当するタスクの期限前にPC通知を受け取る",
            desc:  "自分が担当者に設定されたタスクの期限1日前・1時間前に自動で通知が届きます",
            icon:  "⏰",
          },
        ].map(({ key, label, desc, icon }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-slate-50 last:border-0">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-lg leading-none shrink-0 mt-0.5">{icon}</span>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle
              checked={s[key]}
              onChange={(v) => toggle(key, v)}
              disabled={browserDenied || !("Notification" in window)}
            />
          </div>
        ))}

        <p className="text-[10px] text-slate-400 pt-1">
          ※ デスクトップ通知のON/OFFのみ制御します。アプリ内の通知センター（🔔）への履歴記録は常に行われます。
        </p>
      </div>
    </div>
  );
}

/* ━━━━━━━━ 月末タスク定義管理セクション（管理者限定） ━━━━━━━━ */
function MonthEndTaskSection() {
  const { panelTasks, setPanelTasks, generateMonthlyCheckTasks, currentYear, currentMonth } = useApp();
  const [list, setList] = useState(() => (panelTasks || DEFAULT_PANEL_TASKS).map(t => ({ ...t })));
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saved, setSaved] = useState(false);

  /* ── 一括生成 ── */
  const [genYear,   setGenYear]   = useState(() => currentYear);
  const [genMonth,  setGenMonth]  = useState(() => currentMonth);
  const [genResult, setGenResult] = useState(null); // null | { added, skipped, total, lastBizDay }

  const lastBizDayPreview = useMemo(() => {
    try { return getLastBizDay(genYear, genMonth); } catch { return null; }
  }, [genYear, genMonth]);

  const handleGenerate = () => {
    const res = generateMonthlyCheckTasks(genYear, genMonth);
    const lbd = getLastBizDay(genYear, genMonth);
    setGenResult({ ...res, lastBizDay: lbd });
  };

  const move = (i, dir) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
  };

  const del = (i) => {
    setList(prev => prev.filter((_, idx) => idx !== i));
    setDeleteConfirm(null);
  };

  const addNew = () => {
    setList(prev => [...prev, {
      id: `pt_${Date.now()}`,
      emoji: "📋",
      title: "新しいタスク",
      when: "最終営業日当日",
      daysBefore: 0,
      isKintai: false,
    }]);
  };

  const updateField = (i, field, value) => {
    setList(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    setPanelTasks(list);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    const fresh = DEFAULT_PANEL_TASKS.map(t => ({ ...t }));
    setList(fresh);
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー説明 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={14} className="text-blue-600" />
          <h3 className="text-sm font-bold text-gray-700">月末処理タスク定義</h3>
          <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">管理者限定</span>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          月末チェックリストの項目を追加・編集・削除・並び替えできます。<br />
          保存すると全メンバーの月末処理パネルに即時反映されます。
        </p>
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
          ⚠️ 「何日前」はその日の締切になります。0=最終営業日当日、3=3日前
        </p>
      </div>

      {/* タスクリスト */}
      <div className="space-y-2">
        {list.map((task, i) => (
          <div key={task.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* メイン行 */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <GripVertical size={14} className="text-gray-300 shrink-0" />
              {/* 順番ボタン */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0}
                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20">
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === list.length - 1}
                  className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20">
                  <ChevronDown size={12} />
                </button>
              </div>
              {/* 絵文字 */}
              <input
                className="w-10 text-center text-[16px] bg-gray-50 border border-gray-200 rounded-lg py-1 shrink-0"
                value={task.emoji}
                onChange={e => updateField(i, "emoji", e.target.value)}
                maxLength={2}
              />
              {/* タイトル */}
              <input
                className={INP + " flex-1 text-[12px] min-w-0"}
                value={task.title}
                onChange={e => updateField(i, "title", e.target.value)}
                placeholder="タスク名"
              />
              {/* 削除 */}
              {deleteConfirm === i ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-red-500 font-bold whitespace-nowrap">削除?</span>
                  <button onClick={() => del(i)}
                    className="px-2 py-1 text-[10px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600">
                    はい
                  </button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 text-[10px] font-bold bg-gray-200 text-gray-600 rounded-lg">
                    いいえ
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(i)}
                  className="p-1.5 text-gray-300 hover:text-red-400 shrink-0">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {/* サブ行：期限・何日前・勤怠通知 */}
            <div className="px-3 pb-2.5 flex items-center gap-3 flex-wrap border-t border-gray-50 pt-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-gray-400 shrink-0">表示テキスト:</span>
                <input
                  className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-0.5 w-36"
                  value={task.when}
                  onChange={e => updateField(i, "when", e.target.value)}
                  placeholder="最終営業日当日"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 shrink-0">何日前:</span>
                <input
                  type="number"
                  min={0} max={30}
                  className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-0.5 w-16 text-center"
                  value={task.daysBefore ?? 0}
                  onChange={e => updateField(i, "daysBefore", Number(e.target.value))}
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!task.isKintai}
                  onChange={e => updateField(i, "isKintai", e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-[10px] text-gray-400">勤怠18:55通知</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={addNew} className={BTN_PRI}>
          <Plus size={13} /> タスクを追加
        </button>
        <button onClick={handleReset} className={BTN_GRAY}>
          デフォルトに戻す
        </button>
        <div className="flex-1" />
        <button onClick={handleSave} className={BTN_PRI}>
          <Save size={13} /> 保存して全員に反映
        </button>
      </div>

      {saved && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ 保存しました。全メンバーの月末処理パネルに反映されます。
        </div>
      )}

      {/* ── 一括生成セクション ── */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-amber-500" />
          <h3 className="text-sm font-bold text-gray-700">月末タスク 一括生成</h3>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">管理者限定</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          上記のタスク定義をもとに、指定した年月の月末タスクを全メンバー分まとめて作成します。<br />
          既に同じIDのタスクが存在する場合はスキップされます（重複防止）。
        </p>

        {/* 年月セレクタ */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-500 font-semibold shrink-0">年:</label>
            <select
              value={genYear}
              onChange={e => { setGenYear(Number(e.target.value)); setGenResult(null); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-gray-500 font-semibold shrink-0">月:</label>
            <select
              value={genMonth}
              onChange={e => { setGenMonth(Number(e.target.value)); setGenResult(null); }}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          {lastBizDayPreview && (
            <span className="text-[11px] text-gray-400">
              最終営業日: <span className="font-bold text-gray-600">
                {lastBizDayPreview.getFullYear()}/{lastBizDayPreview.getMonth()+1}/{lastBizDayPreview.getDate()}
              </span>
            </span>
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-colors hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 2px 8px -2px rgba(245,158,11,.4)" }}
        >
          <Sparkles size={13} />
          {genYear}年{genMonth}月の月末タスクを一括生成
        </button>

        {genResult && (
          <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-medium border ${
            genResult.added > 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-50 text-slate-600 border-slate-200"
          }`}>
            {genResult.added > 0 ? "✅" : "ℹ️"}{" "}
            <span className="font-bold">{genResult.added}</span> 件生成
            {genResult.skipped > 0 && (
              <span className="text-[11px] font-normal ml-2 opacity-70">
                （{genResult.skipped} 件はすでに存在のためスキップ）
              </span>
            )}
            {genResult.added > 0 && (
              <span className="text-[11px] font-normal ml-2 opacity-70">
                — {genYear}年{genMonth}月 最終営業日:{" "}
                {genResult.lastBizDay.getFullYear()}/{genResult.lastBizDay.getMonth()+1}/{genResult.lastBizDay.getDate()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SECTIONS = [
  { id:"members",   label:"メンバー"      },
  { id:"password",  label:"パスワード管理" },
  { id:"backup",    label:"バックアップ"   },
  { id:"favicon",   label:"旗印"          },
  { id:"monthend",  label:"📋 月末タスク" },
  { id:"notif",     label:"🔔 通知設定"   },
];

export default function SettingsView() {
  const [section, setSection] = useState("members");
  const { currentUser } = useApp();

  /* 管理者以外: 通知設定のみ表示 */
  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-full bg-gray-300/60 p-3 sm:p-5">
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h2 className="text-base font-black text-gray-700">設定</h2>
            <p className="text-xs text-gray-500 mt-0.5">個人の通知設定を管理できます</p>
          </div>
          <NotifSection />
        </div>
      </div>
    );
  }

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
        {section === "favicon"  && <FaviconSection />}
        {section === "monthend" && <MonthEndTaskSection />}
        {section === "notif"    && <NotifSection />}
      </div>
    </div>
  );
}
