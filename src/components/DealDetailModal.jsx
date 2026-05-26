import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, Pencil, Check, Ban, MessageSquare, Phone, Mail, FileText, Users, Clock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { ACTIVITY_TYPES, YOMI_COLOR, PLANS, TEAMS_OPT, MEMBER_MASTER_NAMES, CONF } from "../constants/index.js";
import { fmtAmt, isNeglected, parseAmt } from "../utils/index.js";

const TYPE_ICON = {
  "商談":       <Users size={12} />,
  "電話":       <Phone size={12} />,
  "メール":     <Mail size={12} />,
  "提案書提出": <FileText size={12} />,
  "社内MTG":    <MessageSquare size={12} />,
  "その他":     <Clock size={12} />,
};

const todayStr = () => new Date().toISOString().split("T")[0];

const dateStrToIso = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const date = `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,"0")}/${String(dt.getDate()).padStart(2,"0")}`;
  const h = dt.getHours(), mi = dt.getMinutes();
  return (h === 12 && mi === 0) ? date : `${date} ${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`;
};

const INP = "text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition";

const sortByMaster = (arr) =>
  [...arr].sort((a, b) => {
    const ai = MEMBER_MASTER_NAMES.indexOf(a.name);
    const bi = MEMBER_MASTER_NAMES.indexOf(b.name);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

export default function DealDetailModal({ deal: dealProp, onClose }) {
  const { deals, members, addActivity, deleteActivity, updateActivity, updateDeal, deleteDeal } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deal = deals.find(d => d.id === dealProp.id) ?? dealProp;

  /* 活動追加フォーム */
  const [type,   setType]   = useState("商談");
  const [memo,   setMemo]   = useState("");
  const [date,   setDate]   = useState(todayStr);

  /* 活動インライン編集 */
  const [editingId,  setEditingId]  = useState(null);
  const [editMemo,   setEditMemo]   = useState("");

  /* 案件情報編集パネル */
  const [showEdit,   setShowEdit]   = useState(false);
  const [eCompany,   setECompany]   = useState("");
  const [ePlan,      setEPlan]      = useState("");
  const [eAmount,    setEAmount]    = useState("");
  const [eIs,        setEIs]        = useState("");
  const [eFs,        setEFs]        = useState("");
  const [ePeriod,    setEPeriod]    = useState("");
  const [eConf,      setEConf]      = useState("");

  /* スクロールロック */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Escape で閉じる */
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        if (showEdit) { setShowEdit(false); return; }
        if (editingId) { setEditingId(null); setEditMemo(""); return; }
        onClose();
      }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose, editingId, showEdit]);

  if (!deal) return null;

  const yomi    = deal.yomi || "50%";
  const neglect = isNeglected(deal);

  /* 折半: IS ≠ FS（両方設定・別人）→ ×0.5、それ以外 → ×1.0 */
  const isHalved = !!(deal.is && deal.fs && deal.is !== deal.fs);
  const landing  = (deal.amount || 0) * (isHalved ? 0.5 : 1.0);

  /* 担当者選択肢 */
  const activeMembers = sortByMaster(members.filter(m => m.status === "active"));
  const teamMembers   = deal.team
    ? activeMembers.filter(m => m.team === deal.team || m.team === "全社FS")
    : activeMembers;

  /* 活動履歴: 日付降順 */
  const sorted = [...(deal.activities || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  /* 案件情報編集 open */
  const openEdit = () => {
    setECompany(deal.company || "");
    setEPlan(deal.plan || "");
    setEAmount(String(deal.amount || ""));
    setEIs(deal.is || "");
    setEFs(deal.fs || "");
    setEPeriod(deal.period || "");
    setEConf(deal.confidence || "30%");
    setShowEdit(true);
  };

  /* 案件情報 保存 */
  const saveInfo = () => {
    updateDeal(deal.id, {
      company:    eCompany.trim() || deal.company,
      plan:       ePlan,
      amount:     parseAmt(eAmount),
      is:         eIs,
      fs:         eFs,
      period:     ePeriod || deal.period,
      confidence: eConf,
    });
    setShowEdit(false);
  };

  /* 活動追加 */
  const handleAdd = () => {
    if (!memo.trim()) return;
    addActivity(deal.id, { type, memo: memo.trim(), date: dateStrToIso(date) });
    setMemo("");
    setDate(todayStr());
  };

  /* 活動削除 */
  const handleDelete = (actId) => {
    if (!window.confirm("この活動履歴を削除してもよろしいですか？")) return;
    deleteActivity(deal.id, actId);
    if (editingId === actId) { setEditingId(null); setEditMemo(""); }
  };

  const startEdit  = (act) => { setEditingId(act.id); setEditMemo(act.memo); };
  const saveEdit   = () => {
    if (!editMemo.trim()) return;
    updateActivity(deal.id, editingId, { memo: editMemo.trim() });
    setEditingId(null); setEditMemo("");
  };
  const cancelEdit = () => { setEditingId(null); setEditMemo(""); };

  /* フェーズ変更 */
  const handlePhaseChange = (e) => updateDeal(deal.id, { phase: e.target.value });

  /* PHASES は DealModal と同じ定数から取得 */
  const PHASES_LIST = ["未設定","2nd","デモ","社内資料すり合わせ","上長共有","決済者商談予定","決済者共有","稟議中","受注","失注"];

  return createPortal(
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >

        {/* ── ヘッダー ── */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-slate-800 truncate">{deal.company}</h2>
              {neglect && (
                <span className="text-[10px] font-bold bg-red-100 text-red-500 border border-red-200 rounded-full px-2 py-0.5 shrink-0">
                  🔥 放置注意
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs">
              <span className="text-slate-500">{deal.team} / {deal.plan}</span>
              <span className="font-black text-slate-700">{fmtAmt(deal.amount)}</span>
              <span
                className="text-[10px] font-bold rounded-full px-2 py-0.5 text-white"
                style={{ background: YOMI_COLOR[yomi] || "#94a3b8" }}
              >{yomi}</span>
              {/* 着地: 折半時のみ表示 */}
              {isHalved && (
                <span className="text-emerald-600 font-semibold">
                  着地: {fmtAmt(landing)}（折半）
                </span>
              )}
            </div>

            {/* IS / FS */}
            {(deal.is || deal.fs) && (
              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                {deal.is && <span className="text-cyan-700 font-semibold">IS: {deal.is}</span>}
                {deal.fs && <span className="text-emerald-700 font-semibold">FS: {deal.fs}</span>}
              </div>
            )}

            {/* フェーズ変更 */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] font-bold text-slate-400 shrink-0 tracking-wide">フェーズ</span>
              <select
                value={deal.phase || "未設定"}
                onChange={handlePhaseChange}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              >
                {PHASES_LIST.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {/* 案件情報編集トグル */}
            <button
              onClick={showEdit ? () => setShowEdit(false) : openEdit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition
                text-slate-500 hover:bg-slate-100"
              title="案件情報を編集"
            >
              <Pencil size={12} />
              編集
              {showEdit ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {/* 案件削除ボタン */}
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition
                text-red-400 hover:bg-red-50 hover:text-red-600"
              title="案件を削除"
            >
              <Trash2 size={12} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── 案件情報編集パネル ── */}
        {showEdit && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">案件情報を編集</p>

            {/* 案件名 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 shrink-0">案件名</span>
              <input value={eCompany} onChange={e => setECompany(e.target.value)}
                className={`flex-1 ${INP}`} placeholder="会社名" />
            </div>

            {/* プラン・金額 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 shrink-0">プラン</span>
              <select value={ePlan} onChange={e => setEPlan(e.target.value)} className={`flex-1 ${INP}`}>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
              <input
                value={eAmount}
                onChange={e => setEAmount(e.target.value.replace(/[¥￥]/g, ""))}
                className={`w-24 ${INP}`}
                placeholder="金額（万）"
              />
            </div>

            {/* 対象年月 / 確度 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 shrink-0">対象年月</span>
              <input
                type="month"
                value={ePeriod}
                onChange={e => setEPeriod(e.target.value)}
                className={`flex-1 ${INP}`}
              />
              <span className="text-[10px] text-slate-500 shrink-0">確度</span>
              <select value={eConf} onChange={e => setEConf(e.target.value)} className={`w-20 ${INP}`}>
                {CONF.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* IS / FS */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-16 shrink-0">IS / FS</span>
              <select value={eIs} onChange={e => setEIs(e.target.value)} className={`flex-1 ${INP}`}>
                <option value="">未選択</option>
                {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <select value={eFs} onChange={e => setEFs(e.target.value)} className={`flex-1 ${INP}`}>
                <option value="">未選択</option>
                {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>

            {/* 保存・キャンセル */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveInfo}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold transition hover:brightness-110"
                style={{ background: "#0070d2" }}
              >
                <Check size={11} /> 保存
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-[11px] font-bold transition hover:bg-slate-300"
              >
                <Ban size={11} /> キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ── 活動履歴リスト ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            活動履歴（{sorted.length}件）
          </p>
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">まだ活動履歴がありません</p>
          ) : sorted.map(a => (
            <div key={a.id} className="group flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/70 transition-colors">
              <div className="mt-0.5 text-slate-400 shrink-0">{TYPE_ICON[a.type] || <Clock size={12} />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[10px] font-bold text-slate-500">{a.type}</span>
                  <span className="text-[10px] text-slate-400">{fmtDate(a.date)}</span>
                  {a.member && (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-px">
                      👤 {a.member}
                    </span>
                  )}
                </div>
                {editingId === a.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editMemo}
                      onChange={e => setEditMemo(e.target.value)}
                      rows={3}
                      className={`w-full resize-y ${INP}`}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button onClick={saveEdit} disabled={!editMemo.trim()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[11px] font-bold disabled:opacity-40 transition hover:brightness-110"
                        style={{ background: "#0070d2" }}>
                        <Check size={11} /> 保存
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-200 text-slate-600 text-[11px] font-bold transition hover:bg-slate-300">
                        <Ban size={11} /> キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{a.memo}</p>
                )}
              </div>
              {editingId !== a.id && (
                <div className="flex items-start gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => startEdit(a)}
                    className="p-1 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition" title="編集">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition" title="削除">
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── 活動追加フォーム ── */}
        <div className="px-5 py-4 border-t border-slate-100 space-y-2 shrink-0">
          <div className="flex gap-2 flex-wrap">
            <select value={type} onChange={e => setType(e.target.value)} className={`shrink-0 ${INP}`}>
              {ACTIVITY_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input type="date" value={date} max={todayStr()}
              onChange={e => setDate(e.target.value)} className={`shrink-0 ${INP}`} />
          </div>
          <div className="flex gap-2 items-end">
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              rows={3}
              placeholder={"活動内容を入力...\n（追加ボタンで登録）"}
              className={`flex-1 resize-none ${INP}`}
            />
            <button
              onClick={handleAdd}
              disabled={!memo.trim()}
              className="shrink-0 px-4 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-40 transition active:scale-95 hover:brightness-110 whitespace-nowrap mb-0.5"
              style={{ background: "#0070d2" }}
            >
              追加
            </button>
          </div>
        </div>

      </div>

      {/* ── 案件削除 確認ダイアログ ── */}
      {confirmDelete && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 fade-in">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </span>
              <div>
                <p className="text-sm font-black text-slate-800">案件を削除しますか？</p>
                <p className="text-xs text-slate-500 mt-0.5">「{deal.company}」を完全に削除します。この操作は元に戻せません。</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => { deleteDeal(deal.id); onClose(); }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition"
              >
                削除する
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>,
    document.body
  );
}
