/**
 * importDeals.js
 *
 * 「当月ヨミ(案件管理)」シートのパース & 企業名正規化ロジック
 *
 * シート構造:
 *   Row 0: "自動反映（編集禁止）" ラベル行
 *   Row 1: ヨミ区分ヘッダー  Col[1]=30%, Col[9]=50%, Col[17]=70%, Col[25]=回収済み
 *   Row 2: 空行
 *   Row 3: 件数・合計行（集計）
 *   Row 4: 列ヘッダー（企業名 / 提案プラン / 金額 / IS / FS / チーム / 備考）
 *   Row 5+: 案件データ
 */
import * as XLSX from "xlsx";

/* ══════════════════════════════════════════════════════════════
   企業名正規化
   「株式会社GMO」「GMO(株)」「ＧＭＯ」→ すべて "gmo" に変換
   ※ 表示・保存用の企業名は変更しない。マッチング時のキー生成専用
══════════════════════════════════════════════════════════════ */
export const normalizeCompanyName = (name) => {
  if (!name) return "";
  let s = String(name).trim();

  /* ① 法人格（前付き・後付き） */
  s = s.replace(
    /株式会社|有限会社|合同会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|医療法人|学校法人|社会福祉法人|特定非営利活動法人|ＮＰＯ法人|NPO法人/g,
    ""
  );

  /* ② 略称（株）(有)(合) 各種バリエーション */
  s = s.replace(/（株）|\(株\)|【株】|\[株\]|（有）|\(有\)|（合）|\(合\)/g, "");

  /* ③ 全角英数 → 半角 */
  s = s.replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  s = s.replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  s = s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

  /* ④ スペース（全角・半角）除去 */
  s = s.replace(/[\s　]/g, "");

  /* ⑤ 記号除去 */
  s = s.replace(/[・、，,.\-・]/g, "");

  /* ⑥ 小文字化 */
  return s.toLowerCase();
};

/* ══════════════════════════════════════════════════════════════
   ヨミ区分ブロックの列定義（0-indexed）
   30%: Col1-7 / 50%: Col9-15 / 70%: Col17-23 / 回収済み: Col25-31
══════════════════════════════════════════════════════════════ */
const BLOCKS = [
  { confidence: "30%",  cols: { co: 1,  pl: 2,  am: 3,  is: 4,  fs: 5,  team: 6,  note: 7  } },
  { confidence: "50%",  cols: { co: 9,  pl: 10, am: 11, is: 12, fs: 13, team: 14, note: 15 } },
  { confidence: "70%",  cols: { co: 17, pl: 18, am: 19, is: 20, fs: 21, team: 22, note: 23 } },
  { confidence: "回収", cols: { co: 25, pl: 26, am: 27, is: 28, fs: 29, team: 30, note: 31 } },
];

/**
 * 行配列（sheet_to_json header:1）から案件配列を生成
 * @param {Array[]} rows
 * @param {string}  period  "YYYY-MM"
 */
const parseYomiRows = (rows, period) => {
  const deals = [];
  /* Row 0-4 はヘッダー・集計行なのでスキップ → Row 5 からデータ */
  for (let ri = 5; ri < rows.length; ri++) {
    const row = rows[ri];
    if (!row || row.length === 0) continue;

    for (const { confidence, cols } of BLOCKS) {
      const company = String(row[cols.co] ?? "").trim();
      if (!company) continue;

      /* 金額: Excel は円単位（例: 80000） → 万単位に変換 */
      const amtRaw = row[cols.am] ?? 0;
      const amtNum = parseFloat(String(amtRaw).replace(/[,¥￥円]/g, "")) || 0;
      const amount = amtNum >= 1000
        ? Math.round(amtNum / 10000 * 100) / 100
        : amtNum;

      deals.push({
        company,
        plan:       String(row[cols.pl]   ?? "").trim() || "MDC",
        amount,
        is:         String(row[cols.is]   ?? "").trim(),
        fs:         String(row[cols.fs]   ?? "").trim(),
        team:       String(row[cols.team] ?? "").trim(),
        note:       String(row[cols.note] ?? "").trim(),
        confidence,
        period,
      });
    }
  }
  return deals;
};

/**
 * Excel ファイル (.xlsx/.xls) を解析
 * @param {File}   file
 * @param {string} period  "YYYY-MM"
 * @returns {{ deals: Object[], sheetName: string }}
 */
export const parseExcelFile = async (file, period) => {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  /* 「当月ヨミ(案件管理)」シートを探す（部分一致） */
  const sheetName =
    wb.SheetNames.find(n => n.includes("ヨミ") || n.includes("案件")) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`シート「${sheetName}」が見つかりません`);

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return { deals: parseYomiRows(rows, period), sheetName };
};

/**
 * CSV テキストを解析
 * @param {string} text
 * @param {string} period  "YYYY-MM"
 * @returns {{ deals: Object[], sheetName: string }}
 */
export const parseCsvText = (text, period) => {
  const rows = text.split(/\r?\n/).map(line => {
    const cols = [];
    let cur = "", inq = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inq = !inq; }
      else if (c === "," && !inq) { cols.push(cur); cur = ""; }
      else { cur += c; }
    }
    cols.push(cur);
    return cols;
  });
  return { deals: parseYomiRows(rows, period), sheetName: "CSV" };
};
