/**
 * HONNOJI no HEN 兜（カブト）ロゴ
 * size      : アイコンサイズ（px）
 * color     : 背景色（デフォルト Salesforce Blue）
 * transparent: true → 背景の四角を非表示・ダーク背景用の白シルエット
 */
export default function KabutoLogo({ size = 32, color = "#0070d2", transparent = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="HONNOJI logo"
    >
      {/* 背景（角丸正方形） — transparent モード時は非表示 */}
      {!transparent && <rect width="64" height="64" rx="13" fill={color} />}

      {/* 左 鍬形 */}
      <path
        d="M 27,10 C 6,8 0,24 25,46"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 右 鍬形 */}
      <path
        d="M 37,10 C 58,8 64,24 39,46"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 鉢（helmet dome） */}
      <path
        d="M 16,38 C 16,23 23,10 32,10 C 41,10 48,23 48,38 Z"
        fill="white"
      />

      {/* 目の部（visor）
          通常: 背景色で穴を表現
          透過: ダーク半透明で穴を表現（どんな背景でも自然） */}
      <ellipse
        cx="32" cy="29" rx="9" ry="8"
        fill={transparent ? "rgba(0,8,24,0.55)" : color}
        opacity={transparent ? 1 : 0.55}
      />

      {/* しころ（neck guard） */}
      <path
        d="M 12,38 C 12,52 20,60 32,60 C 44,60 52,52 52,38 Z"
        fill="white"
        opacity="0.78"
      />
    </svg>
  );
}
