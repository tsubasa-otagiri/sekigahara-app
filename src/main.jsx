import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  旗印（ファビコン）の復元
 *  ── 開戦の合図としてブラウザ起動時に即座に掲げる ──
 *  LocalStorage に保存された旗印データがあれば、
 *  Reactが描画される前に <link rel="icon"> を上書きする。
 *  これにより「リロードしても旗が消えない」堅牢な仕様となる。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const _savedFavicon = localStorage.getItem("honnoji_favicon");
if (_savedFavicon) {
  const _link =
    document.querySelector('link[rel="icon"]') ||
    (() => {
      const l = document.createElement('link');
      l.rel  = 'icon';
      document.head.appendChild(l);
      return l;
    })();
  _link.href = _savedFavicon;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
