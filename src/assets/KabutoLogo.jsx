/**
 * SEKIGAHARA 兜（カブト）ロゴ
 * Salesforce Blue (#0070d2) ベースのSVGアイコン
 * 大きく横に広がる鍬形（kuwagata）＋鉢（dome）＋吹き返し（crescent）
 * size: アイコンサイズ（px）
 * color: 背景色（デフォルト Salesforce Blue）
 */
export default function KabutoLogo({ size = 32, color = "#0070d2" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="SEKIGAHARA logo"
    >
      {/* 背景（角丸正方形） */}
      <rect width="64" height="64" rx="13" fill={color} />

      {/* 左 鍬形（kuwagata）— 大きく左へ弧を描く */}
      <path
        d="M 27,14 C 6,12 0,26 25,40"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 右 鍬形（kuwagata）— 左の鏡像 */}
      <path
        d="M 37,14 C 58,12 64,26 39,40"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 鉢（dome）— 中央の丸 */}
      <circle cx="32" cy="27" r="9" fill="white" />

      {/* 首元（鉢と吹き返しをつなぐ） */}
      <rect x="25" y="34" width="14" height="8" fill="white" />

      {/* 吹き返し（crescent）— 下部の弧 */}
      <path
        d="M 19,44 Q 32,58 45,44"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
