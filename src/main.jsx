import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BRAND_FAVICON } from './constants/brandConfig.js'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  ① 過去の旗印（sghr_* キー）を焼き尽くし、
 *     新たなる HONNOJI（honnoji_* キー）へ移し替える
 *
 *  旧 SEKIGAHARA 時代に積もった LocalStorage の残骸を
 *  React が描画される前に一掃する。
 *  データは失わず、新キーへ引き継いだ上で旧キーを削除。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const _MIGRATION_MAP = {
  sghr_auth:    "honnoji_auth",
  sghr_deals:   "honnoji_deals",
  sghr_members: "honnoji_members",
  sghr_targets: "honnoji_targets",
};
Object.entries(_MIGRATION_MAP).forEach(([oldKey, newKey]) => {
  const legacy = localStorage.getItem(oldKey);
  if (legacy !== null) {
    /* 新キーにまだデータがない場合のみ移植（上書き防止） */
    if (localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, legacy);
    }
    localStorage.removeItem(oldKey); /* 旧キーを完全消去 */
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  ② 旗印（ファビコン）の復元
 *     LocalStorage の honnoji_favicon → <link rel="icon">
 *     React が描画される前に適用することで
 *     「リロード直後から正しい旗が立っている」状態を保つ
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* BRAND_FAVICON（コードに埋め込み）→ LocalStorage の順で優先適用 */
const _faviconUrl = BRAND_FAVICON || localStorage.getItem("honnoji_favicon");
if (_faviconUrl) {
  const _link =
    document.querySelector('link[rel="icon"]') ||
    (() => {
      const l = document.createElement('link');
      l.rel  = 'icon';
      document.head.appendChild(l);
      return l;
    })();
  _link.href = _faviconUrl;
  /* BRAND_FAVICON が設定されている場合は LocalStorage にも同期して AppContext と整合させる */
  if (BRAND_FAVICON && !localStorage.getItem("honnoji_favicon")) {
    localStorage.setItem("honnoji_favicon", BRAND_FAVICON);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
