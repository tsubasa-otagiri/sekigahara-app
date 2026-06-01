/**
 * ImportDealsModal.jsx
 *
 * Salesforce 風 Excel/CSV インポートモーダル
 * 「当月ヨミ(案件管理)」シートの横並び形式を解析し、
 * バックエンド /api/import-deals で Upsert（追加・更新）を実行
 */
import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Upload, X, FileSpreadsheet, CheckCircle2,
  AlertTriangle, ArrowRight, RotateCcw, Loader2,
} from "lucide-react";
import { useApp } from "../contexts/useApp.js";
import { parseExcelFile, parseCsvText } from "../utils/importDeals.js";

/* 確度ラベル表示用 */
const CONF_LABEL = { "30%":"30%", "50%":"50%", "70%":"70%", "回収":"回収" };
const CONF_COLOR = {
  "30%":  "bg-amber-100 text-amber-700",
  "50%":  "bg-blue-100 text-blue-700",
  "70%":  "bg-emerald-100 text-emerald-700",
  "回収": "bg-violet-100 text-violet-700",
};

export default function ImportDealsModal({ onClose }) {
  const { importDeals, currentPeriod, currentYear, currentMonth } = useApp();

  /* ── ステート ── */
  const [step,        setStep]        = useState("upload");   // upload|preview|importing|done|error
  const [period,      setPeriod]      = useState(currentPeriod);
  const [parsedDeals, setParsedDeals] = useState([]);
  const [sheetName,   setSheetName]   = useState("");
  const [fileName,    setFileName]    = useState("");
  const [result,      setResult]      = useState(null);       // { added, updated, total }
  const [errorMsg,    setErrorMsg]    = useState("");
  const [isDragging,  setIsDragging]  = useState(false);
  const fileRef = useRef();

  /* 対象年月の選択肢: currentPeriod 前後12ヶ月 */
  const periodOptions = (() => {
    const opts = [];
    for (let i = -6; i <= 6; i++) {
      let m = currentMonth + i, y = currentYear;
      while (m > 12) { m -= 12; y++; }
      while (m < 1)  { m += 12; y--; }
      const val = `${y}-${String(m).padStart(2, "0")}`;
      opts.push({ value: val, label: `${y}年${m}月` });
    }
    return opts;
  })();

  /* ── ファイル処理 ── */
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setErrorMsg("");
    setFileName(file.name);
    try {
      let res;
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        res = parseCsvText(text, period);
      } else {
        res = await parseExcelFile(file, period);
      }
      if (res.deals.length === 0) throw new Error("案件データが見つかりませんでした。ファイル形式を確認してください。");
      setParsedDeals(res.deals);
      setSheetName(res.sheetName);
      setStep("preview");
    } catch (e) {
      setErrorMsg(e.message);
    }
  }, [period]);

  /* drag & drop */
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── インポート実行 ── */
  const handleConfirm = useCallback(async () => {
    setStep("importing");
    try {
      const res = await importDeals(parsedDeals, period);
      setResult(res);
      setStep("done");
    } catch (e) {
      setErrorMsg(e.message);
      setStep("error");
    }
  }, [importDeals, parsedDeals, period]);

  /* ── 集計 ── */
  const summary = (() => {
    const by = { "30%": 0, "50%": 0, "70%": 0, "回収": 0 };
    for (const d of parsedDeals) by[d.confidence] = (by[d.confidence] || 0) + 1;
    return by;
  })();

  /* ── レンダリング ── */
  const modal = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.55)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "90vh" }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <FileSpreadsheet size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Excel / CSV インポート</p>
            <p className="text-[11px] text-slate-400">当月ヨミ(案件管理) シートから一括登録・更新</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* ボディ */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP: upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* 対象年月 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  対象年月 <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                >
                  {periodOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* ドロップゾーン */}
              <div
                className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                  ${isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/30"}`}
                style={{ minHeight: 180 }}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => handleFile(e.target.files[0])}
                />
                <div className="flex flex-col items-center justify-center py-10 gap-3 pointer-events-none select-none">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
                    ${isDragging ? "bg-blue-100" : "bg-slate-100"}`}>
                    <Upload size={22} className={isDragging ? "text-blue-500" : "text-slate-400"} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      ファイルをドロップ または クリックして選択
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">.xlsx / .xls / .csv に対応</p>
                  </div>
                </div>
              </div>

              {/* エラー */}
              {errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-600">{errorMsg}</p>
                </div>
              )}

              {/* 形式説明 */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
                <p className="text-[11px] font-bold text-slate-600">対応フォーマット</p>
                <p className="text-[11px] text-slate-500">
                  「当月ヨミ(案件管理)」シートの横並び構造を自動解析します。
                  30%・50%・70%・回収済み の4ブロックを一括取込。
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* ファイル情報 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-200">
                <FileSpreadsheet size={18} className="text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-blue-800 truncate">{fileName}</p>
                  <p className="text-[11px] text-blue-500">{sheetName} シート · {parsedDeals.length} 件検出</p>
                </div>
              </div>

              {/* 確度別内訳 */}
              <div className="grid grid-cols-4 gap-2">
                {(["30%","50%","70%","回収"]).map(conf => (
                  <div key={conf} className={`rounded-xl px-3 py-2.5 text-center ${CONF_COLOR[conf]}`}>
                    <p className="text-[10px] font-bold mb-0.5">{CONF_LABEL[conf]}</p>
                    <p className="text-lg font-black tabular">{summary[conf] || 0}</p>
                    <p className="text-[9px] opacity-70">件</p>
                  </div>
                ))}
              </div>

              {/* 対象年月確認 */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[12px] font-semibold text-slate-600">対象年月</span>
                <span className="text-[13px] font-black text-slate-800">
                  {periodOptions.find(o => o.value === period)?.label || period}
                </span>
              </div>

              {/* 案件プレビュー（最大5件） */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-2">取込データプレビュー（先頭5件）</p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {parsedDeals.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${CONF_COLOR[d.confidence]}`}>
                        {d.confidence}
                      </span>
                      <span className="text-[12px] font-semibold text-slate-800 truncate flex-1">{d.company}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">{d.team}</span>
                    </div>
                  ))}
                  {parsedDeals.length > 5 && (
                    <p className="text-[11px] text-slate-400 text-center py-1">… 他 {parsedDeals.length - 5} 件</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[11px] text-amber-700">
                  <span className="font-bold">企業名で既存案件を照合し</span>、一致した場合は確度・金額・担当者を更新、
                  存在しない場合は新規追加します。法人格の表記ゆれ（株式会社・(株) など）は自動で吸収します。
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: importing ── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 size={36} className="text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">インポート処理中...</p>
                <p className="text-[11px] text-slate-400 mt-1">{parsedDeals.length} 件を処理しています</p>
              </div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === "done" && result && (
            <div className="flex flex-col items-center justify-center py-8 gap-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-slate-800 mb-3">インポート完了！</p>
                <div className="flex gap-4 justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-black text-blue-600 tabular">{result.added}</p>
                    <p className="text-[11px] text-slate-500">新規追加</p>
                  </div>
                  <div className="w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-amber-500 tabular">{result.updated}</p>
                    <p className="text-[11px] text-slate-500">更新</p>
                  </div>
                  <div className="w-px bg-slate-200" />
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-700 tabular">{result.total ?? "-"}</p>
                    <p className="text-[11px] text-slate-500">総案件数</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: error ── */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800 mb-2">インポートに失敗しました</p>
                <p className="text-[12px] text-red-500 max-w-sm">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          {step === "upload" && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("upload"); setParsedDeals([]); setFileName(""); }}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                <RotateCcw size={13} />
                やり直す
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110"
                style={{ background: "#0070d2" }}
              >
                <ArrowRight size={14} />
                {parsedDeals.length} 件をインポート
              </button>
            </>
          )}

          {(step === "done" || step === "error") && (
            <>
              {step === "error" && (
                <button
                  onClick={() => setStep("upload")}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  再試行
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-sm hover:brightness-110"
                style={{ background: "#0070d2" }}
              >
                閉じる
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
