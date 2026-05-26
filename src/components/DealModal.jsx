import { useState } from "react";
import { Save } from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { CONF, PHASES, PLANS, TEAMS_OPT, MEMBER_MASTER_NAMES, YOMI, LOSS_REASONS } from "../constants/index.js";
import { parseAmt, resolvePhase } from "../utils/index.js";
import Modal from "./ui/Modal.jsx";

/* ── スタイル定数 ── */
const SEL = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none cursor-pointer";
const INP = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

const Fld = ({ label, req, err, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1">
      {label}
      {req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
  </div>
);

const BLANK = {
  company: "", plan: "MDC", amount: "",
  team: "", is: "", fs: "",
  confidence: "50%", phase: "未設定", note: "",
  yomi: "50%", lossReason: "",
};

export default function DealModal({ deal, onClose }) {
  const { addDeal, updateDeal, members, currentPeriod } = useApp();
  const isEdit = !!deal;

  const [form, setForm] = useState(() =>
    isEdit
      ? { ...deal, amount: String(deal.amount), period: deal.period || currentPeriod }
      : { ...BLANK, period: currentPeriod }
  );
  const [errors, setErrors] = useState({});

  /* マスター順ソートヘルパー */
  const masterSort = (arr) =>
    [...arr].sort((a, b) => {
      const ai = MEMBER_MASTER_NAMES.indexOf(a.name);
      const bi = MEMBER_MASTER_NAMES.indexOf(b.name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  /* ── チームに応じたメンバー絞り込み（マスター順） ── */
  const teamMembers = masterSort(
    members.filter((m) => m.status === "active" && m.team === form.team)
  );
  /* 全社FS は常にFS候補に追加（マスター順） */
  const globalFs = masterSort(
    members.filter((m) => m.status === "active" && m.team === "全社FS")
  );

  /* IS: チームメンバーのみ */
  const isOptions = form.team ? teamMembers : [];

  /* FS = チームメンバー + 全社FS（重複除去） */
  const fsOptions = form.team
    ? masterSort([
        ...teamMembers,
        ...globalFs.filter((g) => !teamMembers.find((t) => t.id === g.id)),
      ])
    : [];

  /* ── フォーム更新ヘルパー ── */
  const set = (key, val) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      /* 確度 → フェーズ自動連動 */
      if (key === "confidence") next.phase = resolvePhase(val, prev.phase);
      /* 確度 → ヨミ度自動連動 */
      if (key === "confidence") {
        const map = {"回収":"受注","70%":"70%","50%":"50%","30%":"30%"};
        next.yomi = map[val] || next.yomi || "50%";
      }
      /* チーム変更 → IS/FSリセット */
      if (key === "team") { next.is = ""; next.fs = ""; }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  /* ── バリデーション ── */
  const validate = () => {
    const e = {};
    if (!form.company.trim()) e.company = "会社名を入力してください";
    if (!form.team)           e.team    = "チームを選択してください";
    if (!form.confidence)     e.confidence = "確度を選択してください";
    return e;
  };

  /* ── 送信 ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const data = { ...form, amount: parseAmt(form.amount) };
    if (isEdit) updateDeal(deal.id, data);
    else        addDeal(data);
    onClose();
  };

  const isKaishu = form.confidence === "回収";

  /* 対象年月の選択肢: currentPeriod を中心に前後12ヶ月 */
  const periodOptions = (() => {
    const [yr, mo] = currentPeriod.split('-').map(Number);
    const opts = [];
    for (let i = -12; i <= 12; i++) {
      let m = mo + i, y = yr;
      while (m > 12) { m -= 12; y++; }
      while (m < 1)  { m += 12; y--; }
      const val = `${y}-${String(m).padStart(2,'0')}`;
      opts.push({ value: val, label: `${y}年${m}月` });
    }
    return opts;
  })();

  return (
    <Modal
      onClose={onClose}
      title={isEdit ? "案件を編集" : "新規案件登録"}
      sub={isEdit ? form.company : undefined}
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4 pb-6">
        {/* 会社名 */}
        <Fld label="会社名" req err={errors.company}>
          <input
            className={INP}
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="株式会社〇〇"
            autoFocus
          />
        </Fld>

        {/* プラン ・ 月額 */}
        <div className="grid grid-cols-2 gap-3">
          <Fld label="プラン">
            <select className={SEL} value={form.plan} onChange={(e) => set("plan", e.target.value)}>
              {PLANS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Fld>
          <Fld label="月額（万円）">
            <input
              className={INP}
              value={form.amount}
              onChange={(e) => set("amount", e.target.value.replace(/[¥￥]/g, ""))}
              placeholder="例: 30 / 3.5万円 / ¥227,200"
            />
          </Fld>
        </div>

        {/* チーム */}
        <Fld label="チーム" req err={errors.team}>
          <select className={SEL} value={form.team} onChange={(e) => set("team", e.target.value)}>
            <option value="">チームを選択してください...</option>
            {TEAMS_OPT.filter((t) => t !== "全社FS").map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Fld>

        {/* IS担当 ・ FS担当 */}
        <div className="grid grid-cols-2 gap-3">
          <Fld label="IS担当">
            <select
              className={SEL}
              value={form.is}
              onChange={(e) => set("is", e.target.value)}
              disabled={!form.team}
            >
              <option value="">{form.team ? "未選択" : "チームを先に選択"}</option>
              {form.team && (
                <option disabled style={{ color: "#9ca3af", fontWeight: "600" }}>
                  ── {form.team} ──
                </option>
              )}
              {isOptions.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </Fld>
          <Fld label="FS担当">
            <select
              className={SEL}
              value={form.fs}
              onChange={(e) => set("fs", e.target.value)}
              disabled={!form.team}
            >
              <option value="">{form.team ? "未選択" : "チームを先に選択"}</option>
              {form.team && (
                <option disabled style={{ color: "#9ca3af", fontWeight: "600" }}>
                  ── {form.team} ──
                </option>
              )}
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
              {globalFs.filter(g => !teamMembers.find(t => t.id === g.id)).length > 0 && (
                <option disabled style={{ color: "#9ca3af", fontWeight: "600" }}>
                  ── 全社FS ──
                </option>
              )}
              {globalFs.filter(g => !teamMembers.find(t => t.id === g.id)).map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </Fld>
        </div>

        {/* 確度 ・ フェーズ */}
        <div className="grid grid-cols-2 gap-3">
          <Fld label="確度" req err={errors.confidence}>
            <select className={SEL} value={form.confidence} onChange={(e) => set("confidence", e.target.value)}>
              {CONF.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Fld>
          <Fld label={`フェーズ${isKaishu ? "（自動設定）" : ""}`}>
            <select
              className={`${SEL} ${isKaishu ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}`}
              value={form.phase}
              onChange={(e) => set("phase", e.target.value)}
              disabled={isKaishu}
            >
              {PHASES.map((p) => <option key={p}>{p}</option>)}
            </select>
            {isKaishu && (
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                確度「回収」→ フェーズ「受注」に自動設定
              </p>
            )}
          </Fld>
        </div>

        {/* ヨミ度 */}
        <div className="grid grid-cols-2 gap-3">
          <Fld label="ヨミ度">
            <select className={SEL} value={form.yomi || ""} onChange={e => set("yomi", e.target.value)}>
              <option value="">-- 選択 --</option>
              {YOMI.map(y => <option key={y}>{y}</option>)}
            </select>
          </Fld>
          {form.yomi === "失注" && (
            <Fld label="失注要因">
              <select className={SEL} value={form.lossReason || ""} onChange={e => set("lossReason", e.target.value)}>
                <option value="">-- 選択 --</option>
                {LOSS_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Fld>
          )}
        </div>

        {/* 対象年月 */}
        <Fld label="対象年月">
          <select
            className={SEL}
            value={form.period || currentPeriod}
            onChange={(e) => set("period", e.target.value)}
          >
            {periodOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Fld>

        {/* メモ */}
        <Fld label="メモ">
          <textarea
            className={`${INP} resize-none`}
            rows={2}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="補足事項など"
          />
        </Fld>

        {/* ボタン */}
        <div className="pt-1 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110"
            style={{ background: "#0070d2" }}
          >
            <Save size={14} />
            {isEdit ? "更新する" : "登録する"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
