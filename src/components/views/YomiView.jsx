import { useState, useMemo, useEffect } from "react";
import { CheckSquare, Square, Trash } from "lucide-react";
import { useApp } from "../../contexts/useApp.js";
import { filterByTab, fmtAmt, isNeglected } from "../../utils/index.js";
import { CONF, CTW } from "../../constants/index.js";
import { TeamBadge, ConfBadge, PlanBadge } from "../ui/Badges.jsx";
import Confirm from "../ui/Confirm.jsx";
import DealDetailModal from "../DealDetailModal.jsx";

/* 確度の表示順: 回収 → 70% → 50% → 30% */
const CONF_ORDER = [...CONF].reverse();

/* 最終行動日: activities の最新 date を "M/D" で返す。なければ "-" */
const lastActionDate = (deal) => {
  const acts = deal.activities;
  if (!acts || acts.length === 0) return "-";
  const latest = new Date(Math.max(...acts.map(a => new Date(a.date).getTime())));
  return `${latest.getMonth() + 1}/${latest.getDate()}`;
};

/* 最新の行動履歴メモ */
const lastActivityMemo = (deal) => {
  const acts = deal.activities;
  if (!acts || acts.length === 0) return null;
  return acts.reduce((prev, curr) =>
    new Date(curr.date) > new Date(prev.date) ? curr : prev
  ).memo || null;
};

/* ── 1行 ── */
function DealRow({ deal, isAdmin, checked, onToggle, onDetail }) {
  return (
    <tr
      className="hover:bg-blue-50/40 transition-colors group border-b border-slate-100 last:border-0 cursor-pointer"
      onClick={() => onDetail && onDetail(deal)}
    >
      {isAdmin && (
        /* チェックボックスセルはクリックを伝播させない */
        <td className="px-3 py-3 w-8" onClick={e => e.stopPropagation()}>
          <button onClick={() => onToggle(deal.id)} className="text-slate-300 hover:text-violet-500 transition">
            {checked ? <CheckSquare size={14} className="text-violet-600" /> : <Square size={14} />}
          </button>
        </td>
      )}
      {/* 最終行動日 */}
      <td className="px-3 py-3 text-center whitespace-nowrap w-16">
        <span className={`text-[12px] font-bold tabular ${lastActionDate(deal) === "-" ? "text-slate-300" : "text-slate-600"}`}>
          {lastActionDate(deal)}
        </span>
      </td>
      <td className="px-4 py-3 min-w-[140px]">
        <span className="text-[13px] font-semibold text-slate-800">{deal.company}</span>
        {isNeglected(deal) && (
          <span className="ml-1.5 text-[9px] font-bold bg-red-100 text-red-500 border border-red-200 rounded px-1 py-0.5 shrink-0">
            🔥 放置注意
          </span>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <PlanBadge plan={deal.plan} />
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <span className="text-sm font-black text-slate-700 tabular">{fmtAmt(deal.amount)}</span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <TeamBadge team={deal.team} />
      </td>
      <td className="px-3 py-3 text-xs whitespace-nowrap">
        {deal.is && <span className="mr-2 text-cyan-700 font-semibold">{deal.is}</span>}
        {deal.fs && <span className="text-emerald-700 font-semibold">{deal.fs}</span>}
      </td>
      <td className="px-3 py-3 text-[11px] text-slate-500 whitespace-nowrap max-w-[160px] truncate">
        {deal.phase}
      </td>
      {/* 最新の行動履歴 */}
      <td className="px-3 py-3 min-w-[320px]">
        {(() => {
          const m = lastActivityMemo(deal);
          return m
            ? (
              <span
                className="text-[11px] text-slate-600 leading-relaxed whitespace-normal break-words line-clamp-3"
                title={m}
              >{m}</span>
            )
            : <span className="text-slate-300 text-[11px]">-</span>;
        })()}
      </td>
    </tr>
  );
}

/* ── グループヘッダー ── */
function GroupHeader({ conf, count, total, isAdmin, allChecked, onToggleAll }) {
  const tw = CTW[conf] ?? CTW["30%"];
  return (
    <tr className="border-y border-slate-100 bg-slate-50/80">
      {isAdmin && (
        <th className="px-3 py-2 w-8">
          {count > 0 && (
            <button onClick={onToggleAll} className="text-slate-300 hover:text-violet-500 transition">
              {allChecked ? <CheckSquare size={13} className="text-violet-600" /> : <Square size={13} />}
            </button>
          )}
        </th>
      )}
      <th colSpan={8} className="px-4 py-2 text-left">
        <div className="flex items-center gap-3">
          <ConfBadge conf={conf} />
          <span className={`text-[11px] font-bold ${tw.txt}`}>{count} 件</span>
          <span className="text-slate-300">·</span>
          <span className={`text-sm font-black ${tw.txt} tabular`}>{fmtAmt(total)}</span>
        </div>
      </th>
    </tr>
  );
}

/* ── テーブルヘッダー ── */
/* sticky top: Header(56) + TeamTabs(43) + PeriodNav(41) + ViewNav(42) = 182px */
const STICKY_TOP = "top-[182px]";
const TH_BASE = `sticky ${STICKY_TOP} z-20 bg-[#f8fafc] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap`;

function TableHead({ isAdmin }) {
  const TH = ({ children, cls = "" }) => (
    <th className={`${TH_BASE} ${cls}`}>{children}</th>
  );
  return (
    <thead>
      <tr className="border-b border-slate-200">
        {isAdmin && <th className={`${TH_BASE} w-8`} />}
        <TH cls="text-center w-16">最終行動日</TH>
        <TH>企業名</TH>
        <TH>プラン</TH>
        <TH cls="text-right">月額</TH>
        <TH>チーム</TH>
        <TH>IS / FS</TH>
        <TH>フェーズ</TH>
        <TH cls="min-w-[320px]">最新の行動履歴</TH>
      </tr>
    </thead>
  );
}

/* ── メインコンポーネント ── */
export default function YomiView() {
  const {
    deals, currentUser,
    deleteDeal, setEditingDeal,
    activeTab, searchQuery, activePeriods,
  } = useApp();

  const isAdmin = currentUser?.role === "admin";

  /* 選択中ID（管理者一括削除用） */
  const [selected, setSelected] = useState(new Set());
  /* 詳細モーダル */
  const [detailDeal, setDetailDeal] = useState(null);
  /* 削除確認ダイアログ状態 */
  const [confirmDel, setConfirmDel] = useState(null); // null | {mode:"single",id} | {mode:"bulk",ids:[]}

  /* タブ切り替えで選択リセット */
  useEffect(() => { setSelected(new Set()); }, [activeTab]);

  /* ── フィルター + 検索 ── */
  const filtered = useMemo(() => {
    const pdDeals = deals.filter(d => activePeriods.includes(d.period));
    let ds = filterByTab(pdDeals, activeTab);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      ds = ds.filter((d) =>
        d.company.toLowerCase().includes(q) ||
        (d.is  ?? "").toLowerCase().includes(q) ||
        (d.fs  ?? "").toLowerCase().includes(q) ||
        (d.note ?? "").toLowerCase().includes(q) ||
        (d.team ?? "").toLowerCase().includes(q)
      );
    }
    return ds;
  }, [deals, activeTab, searchQuery, activePeriods]);

  /* ── 確度別グループ ── */
  const groups = useMemo(() =>
    CONF_ORDER.map((conf) => {
      const ds = filtered.filter((d) => d.confidence === conf);
      return { conf, deals: ds, total: ds.reduce((s, d) => s + (d.amount || 0), 0) };
    }),
  [filtered]);

  /* ── 選択操作 ── */
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroupAll = (groupDeals) => {
    const ids = groupDeals.map((d) => d.id);
    const allIn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      allIn ? ids.forEach((id) => next.delete(id)) : ids.forEach((id) => next.add(id));
      return next;
    });
  };

  /* ── 削除アクション ── */
  const handleDeleteSingle = (id) => {
    setConfirmDel({ mode: "single", id });
  };

  const handleDeleteBulk = () => {
    setConfirmDel({ mode: "bulk", ids: [...selected] });
  };

  const execDelete = () => {
    if (!confirmDel) return;
    if (confirmDel.mode === "single") {
      deleteDeal(confirmDel.id);
      setSelected((prev) => { const n = new Set(prev); n.delete(confirmDel.id); return n; });
    } else {
      confirmDel.ids.forEach((id) => deleteDeal(id));
      setSelected(new Set());
    }
    setConfirmDel(null);
  };

  /* ── 確認ダイアログメッセージ ── */
  const confirmMsg = confirmDel?.mode === "single"
    ? `この案件を削除しますか？\n削除したデータは復元できません。`
    : `選択した ${confirmDel?.ids?.length} 件の案件を\nまとめて削除しますか？`;

  const totalFiltered = filtered.reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto fade-in">
      {/* サマリーバー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-700">{activeTab} — ヨミ一覧</h2>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
            {filtered.length} 件
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">合計</span>
          <span className="text-base font-black text-slate-800 tabular">{fmtAmt(totalFiltered)}</span>
        </div>
      </div>

      {/* 管理者: 一括削除バー */}
      {isAdmin && selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-2.5"
          style={{ background: "linear-gradient(135deg,#fef2f2,#fff5f5)", border: "1px solid #fecaca" }}>
          <span className="text-sm font-semibold text-red-600">
            {selected.size} 件を選択中
          </span>
          <button
            onClick={handleDeleteBulk}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white text-[11px] font-bold rounded-lg transition hover:brightness-105"
            style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
          >
            <Trash size={12} />
            一括削除
          </button>
        </div>
      )}

      {/* テーブル */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm font-semibold">
            {searchQuery ? "検索結果が見つかりません" : "案件がありません"}
          </p>
          <p className="text-xs mt-1 text-slate-300">{searchQuery ? `"${searchQuery}" に一致する案件なし` : "新規案件を登録してください"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden card-shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <TableHead isAdmin={isAdmin} />
              <tbody>
                {groups.map(({ conf, deals: gDeals, total }) => {
                  if (gDeals.length === 0) return null;
                  const allChecked = isAdmin && gDeals.length > 0 && gDeals.every((d) => selected.has(d.id));
                  return (
                    <>
                      <GroupHeader
                        key={`hd-${conf}`}
                        conf={conf}
                        count={gDeals.length}
                        total={total}
                        isAdmin={isAdmin}
                        allChecked={allChecked}
                        onToggleAll={() => toggleGroupAll(gDeals)}
                      />
                      {gDeals.map((deal) => (
                        <DealRow
                          key={deal.id}
                          deal={deal}
                          isAdmin={isAdmin}
                          checked={selected.has(deal.id)}
                          onToggle={toggleSelect}
                          onDetail={setDetailDeal}
                        />
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {confirmDel && (
        <Confirm
          message={confirmMsg}
          danger
          okLabel="削除する"
          onOk={execDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {/* 案件詳細モーダル */}
      {detailDeal && (
        <DealDetailModal deal={detailDeal} onClose={() => setDetailDeal(null)} />
      )}
    </div>
  );
}
