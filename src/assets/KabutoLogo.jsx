/**
 * HONNOJI no HEN 兜（カブト）ロゴ
 * Salesforce Blue (#0070d2) ベースのSVGイラスト
 * 鍬形（横広がり）＋鉢（ドーム）＋目の部（バイザー）＋しころ（ネックガード）
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
      aria-label="HONNOJI logo"
    >
      {/* 背景（角丸正方形） */}
      <rect width="64" height="64" rx="13" fill={color} />

      {/* 左 鍬形 — 上下に拡張して正方形背景を最大限に活用 */}
      <path
        d="M 27,10 C 6,8 0,24 25,46"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 右 鍬形 — 左の完全鏡像 */}
      <path
        d="M 37,10 C 58,8 64,24 39,46"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 鉢（helmet dome）— 半アーチ形 */}
      <path
        d="M 16,38 C 16,23 23,10 32,10 C 41,10 48,23 48,38 Z"
        fill="white"
      />

      {/* 目の部（visor opening）— 深みを出す凹み */}
      <ellipse cx="32" cy="29" rx="9" ry="8" fill={color} opacity="0.55" />

      {/* しころ（neck guard）— 下部フレア */}
      <path
        d="M 12,38 C 12,52 20,60 32,60 C 44,60 52,52 52,38 Z"
        fill="white"
        opacity="0.78"
      />
    </svg>
  );
}
