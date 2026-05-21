/**
 * SEKIGAHARA 兜（カブト）ロゴ
 * Salesforce Blue (#0070d2) ベースのSVGアイコン
 * size: アイコンサイズ（px）
 * color: 背景色（デフォルト Salesforce Blue）
 */
export default function KabutoLogo({ size = 32, color = "#0070d2" }) {
  const id = `kbg_${size}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="SEKIGAHARA logo"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.22" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 背景（角丸正方形） */}
      <rect width="64" height="64" rx="13" fill={color} />
      <rect width="64" height="64" rx="13" fill={`url(#${id})`} />

      {/* 前立て（金色三角クレスト） */}
      <polygon points="32,4 27.5,17 36.5,17" fill="#fbbf24" />
      <polygon points="32,6 29,17 35,17" fill="#fde68a" opacity="0.65" />

      {/* 鉢（ドーム本体） */}
      <path
        d="M11 40 C11 22 21 14 32 14 C43 14 53 22 53 40 Z"
        fill="white"
        opacity="0.92"
      />
      {/* 鉢ハイライト（光沢） */}
      <path
        d="M18 27 Q26 19 39 23"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
        opacity="0.38"
        strokeLinecap="round"
      />

      {/* しころ（ネックガード2層） */}
      <path
        d="M9 40 L7 51 L32 55 L57 51 L55 40 Z"
        fill="white"
        opacity="0.55"
      />
      <path
        d="M11 43 L10 50 L32 53 L54 50 L53 43 Z"
        fill="white"
        opacity="0.3"
      />

      {/* 面（顔の開口部） */}
      <ellipse cx="32" cy="35" rx="12" ry="8" fill={color} opacity="0.72" />

      {/* 中央縦線（装飾） */}
      <line
        x1="32" y1="15" x2="32" y2="39"
        stroke="white"
        strokeWidth="1.4"
        opacity="0.38"
      />
    </svg>
  );
}
