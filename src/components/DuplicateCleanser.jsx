/**
 * DuplicateCleanser.jsx
 * 全案件を正規化キーでグループ化し、重複を一覧表示・一括削除するモーダル
 */
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Trash2, CheckSquare, Square, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { fmtAmt, stripCompany, normalizeCompanyKey } from "../utils/index.js";
import { ConfBadge, TeamBadge } from "./ui/Badges.jsx";
import Confirm from "./ui/Confirm.jsx";

export default function DuplicateCleanser({ onClose }) {
  const { deals, replaceDeals } = useApp();
  const [selected, setSelected] = useState(new Set()); // 削除対象 deal ID
  const [confirm,  setConfirm]  = useState(false);
  const [done,     setDone]     = useState(false);

  /* 全案件を正規化キーでグループ化 → 2件以上のグループだけ返す */
  const groups = useMemo(() => {
    const byKey = new Map(); // key → [{deal, key}]
    for (const d of deals) {
      const key = normalizeCompanyKey(d.company || "");
      if (key.length < 2) continue;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(d);
    }
    /* includes チェックで異キー間のグループを統合 */
    const keys = [...byKey.keys()];
    const merged = new Map([...byKey]); // コピー
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (!merged.has(keys[i]) || !merged.has(keys[j])) continue;
        if (keys[i].includes(keys[j]) || keys[j].includes(keys[i])) {
          /* j → i に統合 */
          const combined = [...merged.get(keys[i]), ...merged.get(keys[j])];
          merged.set(keys[i], combined);
          merged.delete(keys[j]);
        }
      }
    }
    return [...merged.values()]
      .filter(g => g.length > 1)
      .sort((a, b) => b.length - a.length); // 多い順
  }, [deals]);

  const totalDups = groups.reduce((s, g) => s + g.length, 0);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  /* グループ内の「新しい順で先頭以外」を一括選択 */
  const autoSelect = (group) => {
    const sorted = [...group].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    setSelected(prev => {
      const next = new Set(prev);
      sorted.slice(1).forEach(d => next.add(d.id)); // 最新1件を残して選択
      return next;
    });
  };

  const autoSelectAll = () => {
    groups.forEach(autoSelect);
  };

  const execDelete = () => {
    /* 複数 deleteDeal を連続呼びすると apiSet が競合して最後の1件だけ KV に反映される。
       replaceDeals で1回だけ書き込み、確実に削除する。 */
    replaceDeals(deals.filter(d => !selected.has(d.id)));
    setSelected(new Set());
    setConfirm(false);
    setDone(true);
  };

  const fmtPeriod = (ym) => {
    if (!ym) return "-";
    const [y, m] = ym.split("-");
    return `${y}年${Number(m)}月`;
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[71]
          w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">重複クレンジング</p>
            <p className="text-[11px] text-slate-500">
              {groups.length} グループ / {totalDups} 件の重複を検出
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {done ? (
          /* 完了画面 */
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-slate-800">クレンジング完了</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-white text-sm font-bold"
              style={{ background: "#0070d2" }}
            >
              閉じる
            </button>
          </div>
        ) : groups.length === 0 ? (
          /* 重複なし */
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <CheckCircle2 size={32} className="text-emerald-400" />
            <p className="text-sm font-semibold">重複案件はありません</p>
          </div>
        ) : (
          <>
            {/* ツールバー */}
            <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3 shrink-0 bg-slate-50/60">
              <button
                onClick={autoSelectAll}
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                ✦ 最新1件を残して全選択
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[11px] font-bold text-slate-500 hover:underline"
              >
                選択解除
              </button>
              <span className="ml-auto text-[11px] font-bold text-red-500">
                {selected.size} 件を削除予定
              </span>
            </div>

            {/* グループリスト */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {groups.map((group, gi) => (
                <div key={gi} className="rounded-xl border border-slate-200 overflow-hidden">
                  {/* グループヘッダー */}
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                    <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                    <span className="text-[11px] font-bold text-amber-700 flex-1 truncate">
                      {group[0].company}
                    </span>
                    <span className="text-[10px] text-amber-500">{group.length} 件</span>
                    <button
                      onClick={() => autoSelect(group)}
                      className="text-[10px] font-bold text-blue-600 hover:underline ml-2 shrink-0"
                    >
                      最新残す
                    </button>
                  </div>

                  {/* 案件行 */}
                  {group
                    .slice()
                    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
                    .map(d => (
                      <div
                        key={d.id}
                        onClick={() => toggle(d.id)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                          ${selected.has(d.id)
                            ? "bg-red-50 border-b border-red-100"
                            : "bg-white border-b border-slate-100 hover:bg-slate-50"}`}
                      >
                        {/* チェック */}
                        <span className={selected.has(d.id) ? "text-red-500" : "text-slate-300"}>
                          {selected.has(d.id)
                            ? <CheckSquare size={14} />
                            : <Square size={14} />}
                        </span>

                        {/* 情報 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-slate-800 truncate">{d.company}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">{fmtPeriod(d.period)}</span>
                            <TeamBadge team={d.team} />
                            <ConfBadge conf={d.confidence} />
                            {d.is && <span className="text-[10px] text-cyan-700">IS {d.is}</span>}
                            {d.fs && <span className="text-[10px] text-emerald-700">FS {d.fs}</span>}
                          </div>
                        </div>

                        <span className={`text-sm font-black tabular shrink-0
                          ${selected.has(d.id) ? "text-red-400 line-through" : "text-slate-700"}`}>
                          {fmtAmt(d.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            {/* フッター */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => selected.size > 0 && setConfirm(true)}
                disabled={selected.size === 0}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ background: "#e42b2b" }}
              >
                <Trash2 size={14} />
                {selected.size} 件を削除
              </button>
            </div>
          </>
        )}
      </div>

      {confirm && (
        <Confirm
          message={`選択した ${selected.size} 件を削除しますか？\n削除したデータは復元できません。`}
          danger
          okLabel="削除する"
          onOk={execDelete}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>,
    document.body
  );
}
