/**
 * HONNOJI 兜（カブト）ロゴ — 透過 SVG アイコン
 * 背景は完全に持たない。白い兜シルエットのみ。
 * - ダーク背景（ログイン画面）: そのまま使用
 * - ライト背景（ヘッダー）: 親要素で背景色を付ける
 */
export default function KabutoLogo({ size = 32 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{ display: "block", background: "none" }}
      aria-label="HONNOJI logo"
    >
      {/* 背景なし — 完全透過 */}

      {/* 左 鍬形 */}
      <path
        d="M 27,10 C 6,8 0,24 25,46"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"
      />
      {/* 右 鍬形 */}
      <path
        d="M 37,10 C 58,8 64,24 39,46"
        fill="none" stroke="white" strokeWidth="7" strokeLinecap="round"
      />
      {/* 鉢（dome） */}
      <path
        d="M 16,38 C 16,23 23,10 32,10 C 41,10 48,23 48,38 Z"
        fill="white"
      />
      {/* 目の部（visor）— どんな背景でも自然に見えるダーク半透明 */}
      <ellipse cx="32" cy="29" rx="9" ry="8" fill="rgba(0,8,24,0.62)" />
      {/* しころ（neck guard） */}
      <path
        d="M 12,38 C 12,52 20,60 32,60 C 44,60 52,52 52,38 Z"
        fill="white" opacity="0.78"
      />
    </svg>
  );
}
