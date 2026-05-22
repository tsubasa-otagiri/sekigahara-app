import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, LogIn, CalendarDays, LayoutKanban, Database, RefreshCw, AlertTriangle } from "lucide-react";

const Section = ({ icon: Icon, color, title, children }) => (
  <div className="rounded-xl border border-slate-100 overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: color + "0d", borderBottom: `1px solid ${color}22` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
        <Icon size={15} style={{ color }} />
      </div>
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
    </div>
    <div className="px-4 py-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
      {children}
    </div>
  </div>
);

const Tip = ({ children }) => (
  <p className="flex gap-1.5"><span className="text-slate-300 shrink-0">▶</span><span>{children}</span></p>
);

const Code = ({ children }) => (
  <kbd className="inline-block bg-slate-100 text-slate-700 border border-slate-200 rounded px-1.5 py-px text-[11px] font-mono font-semibold">
    {children}
  </kbd>
);

export default function HelpModal({ onClose }) {
  /* スクロールロック */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* Escape で閉じる */
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-base"
              style={{ background: "#0070d2" }}>❓</div>
            <div>
              <h2 className="text-base font-black text-slate-800 leading-none">操作マニュアル</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">HONNOJI no HEN — ヘルプガイド</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>

        {/* スクロールコンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* 1. ログイン */}
          <Section icon={LogIn} color="#0070d2" title="1. ログイン画面とメンバー選択">
            <Tip>メンバー選択プルダウンはチーム別（中村T → 渡部T → 鈴木T → 杉山T の順）にグループ化されています。</Tip>
            <Tip>旧ニックネーム（はやけん・なおきなど）や旧フルネームは、起動時に自動で正式名称に名寄せされます。</Tip>
            <Tip>初期パスワードは全員 <Code>1111</Code> です。ログイン後すぐに変更を促すメッセージが表示されます。</Tip>
          </Section>

          {/* 2. 対象期間 */}
          <Section icon={CalendarDays} color="#16a34a" title="2. 対象期間の切り替え">
            <Tip>年・月のプルダウンは常に表示されており、Q1〜Q4 ボタンと併用できます。</Tip>
            <Tip>Qボタンを押すと四半期モードになりますが、月プルダウンで月を選び直すと月次モードに戻ります。</Tip>
            <Tip><strong>「当月」ボタン</strong>をクリックすると、現在の年月に一発で切り替わります。</Tip>
            <Tip>ログイン・リロード時は自動的に当月・マイページ表示になります。</Tip>
          </Section>

          {/* 3. カンバン・案件 */}
          <Section icon={LayoutKanban} color="#7c3aed" title="3. カンバン画面と案件の登録・編集">
            <Tip>右上の<strong>「新規案件」ボタン</strong>で案件を登録。月は「対象年月」プルダウンで設定します。</Tip>
            <Tip>カンバンのカードをドラッグ＆ドロップすると確度（列）を変更できます（確認ダイアログあり）。</Tip>
            <Tip>案件行（またはカード）をクリックすると詳細モーダルが開きます。詳細モーダル内から案件名・担当・金額・プランの編集、フェーズ変更、活動履歴の記録ができます。</Tip>
            <Tip><strong>IS / FS 折半ロジック</strong>：IS と FS が別人の場合、マイページの集計では各担当者の金額が自動的に 50% に折半されます。</Tip>
            <Tip>「マイページ」タブでは自分が IS または FS として担当している案件のみが表示されます。</Tip>
          </Section>

          {/* 4. バックアップ（管理者） */}
          <Section icon={Database} color="#dc2626" title="4. データのバックアップと移行">
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
              <AlertTriangle size={13} className="text-red-500 shrink-0" />
              <p className="text-[11px] font-bold text-red-600">この機能は管理者ユーザー専用です。一般メンバーには設定タブが表示されません。</p>
            </div>
            <Tip>ナビの<strong>「設定」タブ</strong>（管理者のみ表示）からデータのエクスポート / インポートができます。</Tip>
            <Tip><strong>エクスポート</strong>：「データをエクスポート」ボタンをクリックすると、全案件・メンバーデータが JSON ファイルでダウンロードされます。定期的にバックアップとして保存してください。</Tip>
            <Tip><strong>インポート</strong>：取得した JSON ファイルを「インポート」欄で選択すると、全データが一括で復元されます。※ 既存データはすべて上書きされます。</Tip>
          </Section>

          {/* 5. トラブル */}
          <Section icon={RefreshCw} color="#ea580c" title="5. 画面がおかしい・古いときの解決策">
            <Tip>ブラウザにキャッシュが残っていると、更新が画面に反映されないことがあります。</Tip>
            <Tip>
              <strong>スーパーリロード</strong>を試してください：
              Windows → <Code>Ctrl</Code> + <Code>F5</Code>　/　Mac → <Code>⌘ Cmd</Code> + <Code>⇧ Shift</Code> + <Code>R</Code>
            </Tip>
            <Tip>それでも改善しない場合は、ブラウザの「開発者ツール → Application → Storage → Clear site data」でキャッシュを完全削除してください。</Tip>
            <Tip>データは LocalStorage に保存されています。クリアするとデータが消えるため、事前にエクスポートで必ずバックアップしてください（管理者のみ）。</Tip>
          </Section>
        </div>

        {/* フッター */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#0070d2" }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
