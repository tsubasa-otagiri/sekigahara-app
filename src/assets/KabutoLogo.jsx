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

      {/* 左 鍬形 — 大きく外へ張り出す弧 */}
      <path
        d="M 27,14 C 6,12 0,26 25,40"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 右 鍬形 — 左の完全鏡像 */}
      <path
        d="M 37,14 C 58,12 64,26 39,40"
        fill="none"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* 鉢（helmet dome）— 半アーチ形 */}
      <path
        d="M 16,36 C 16,21 23,14 32,14 C 41,14 48,21 48,36 Z"
        fill="white"
      />

      {/* 目の部（visor opening）— 深みを出す凹み */}
      <ellipse cx="32" cy="29" rx="9" ry="7" fill={color} opacity="0.55" />

      {/* しころ（neck guard）— 下部フレア */}
      <path
        d="M 12,37 C 12,50 20,54 32,54 C 44,54 52,50 52,37 Z"
        fill="white"
        opacity="0.78"
      />
    </svg>
  );
}
