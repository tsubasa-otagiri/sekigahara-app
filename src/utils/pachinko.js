/**
 * pachinko.js
 * パチンコ風確変ルーレット演出（視覚のみ・音なし）
 *
 * 演出フロー:
 *   0ms   — 暗転フェードイン
 *   200ms — リール 3本回転開始
 *  1700ms — リール①ホールド
 *  2050ms — リール②ホールド
 *  2350ms — リール③ホールド → 結果確定
 *
 *  [確変 50%]
 *  2400ms — レインボーフラッシュ炸裂 + 「大当り！確変突入！」金文字
 *  3200ms — 「さぁ、この調子でもう一回！」サブメッセージ
 *  5200ms — フェードアウト → クリーンアップ
 *
 *  [通常 50%]
 *  2350ms — confetti コールバック発火
 *  2400ms — 「お疲れ様でした！」金文字
 *  3600ms — フェードアウト → クリーンアップ
 */

/* ────────────────────────────────────────────
   定数
──────────────────────────────────────────── */
const SYMBOLS  = ['7','7','♦','★','2','3','8','4','9','6','5','1'];
const N        = SYMBOLS.length;
const LOCK_MS  = [1700, 2050, 2350];

/* ── rrect（roundRect ポリフィル） ── */
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y,      x + w, y + r,     r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h,  x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x,     y + h,  x,     y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x,     y,      x + r, y,         r);
  c.closePath();
}

/* ────────────────────────────────────────────
   リールオフセット計算
   戻り値: スクロール量（シンボル単位の実数）
──────────────────────────────────────────── */
function reelOff(i, t, finalSym) {
  const L          = LOCK_MS[i];
  const SPEED      = 0.013;        // symbols/ms（回転速度）
  const DECEL_DUR  = 380;          // 減速区間 ms
  const decelStart = L - DECEL_DUR;

  /* ロック時点でのオフセット（台形積分で減速）*/
  const baseOff    = decelStart * SPEED;
  const offAtLock  = baseOff + SPEED * DECEL_DUR * 0.5; // 平均速度 × 時間

  /* 止まる位置: center(j=1) が finalSym になるよう調整 */
  const fi      = SYMBOLS.findIndex(s => s === finalSym);
  const target  = ((fi - 1) % N + N) % N;
  const current = ((Math.floor(offAtLock)) % N + N) % N;
  const diff    = ((target - current) % N + N) % N;
  const stopOff = Math.floor(offAtLock) + diff;

  if (t >= L) {
    /* ロック後: easeOutCubic で stopOff にスナップ */
    const p    = Math.min(1, (t - L) / 220);
    const ease = 1 - Math.pow(1 - p, 3);
    return offAtLock + (stopOff - offAtLock) * ease;
  }

  if (t <= decelStart) return t * SPEED;

  /* 減速区間 */
  const dt = t - decelStart;
  const p  = dt / DECEL_DUR;
  return baseOff + SPEED * DECEL_DUR * (p - p * p * 0.5);
}

/* ────────────────────────────────────────────
   リール描画
──────────────────────────────────────────── */
function drawReels(ctx, t, W, H, RESULT) {
  const SW  = Math.min(108, W * 0.145);
  const SH  = SW * 1.26;
  const GAP = SW * 0.13;
  const TW  = SW * 3 + GAP * 2;
  const SX  = (W - TW) / 2;
  const SY  = H * 0.5 - SH * 0.5 - 10;

  /* ── 外枠（金色）── */
  ctx.save();
  const fg = ctx.createLinearGradient(SX - 14, SY, SX + TW + 14, SY + SH);
  fg.addColorStop(0,   '#ffd700');
  fg.addColorStop(0.5, '#fffacc');
  fg.addColorStop(1,   '#ffa500');
  ctx.fillStyle = fg;
  rrect(ctx, SX - 14, SY - 14, TW + 28, SH + 28, 18);
  ctx.fill();
  ctx.fillStyle = '#03031a';
  rrect(ctx, SX - 6,  SY - 6,  TW + 12, SH + 12, 12);
  ctx.fill();
  ctx.restore();

  /* ── リール 3本 ── */
  for (let i = 0; i < 3; i++) {
    const rx     = SX + i * (SW + GAP);
    const locked = t >= LOCK_MS[i];
    const off    = reelOff(i, t, RESULT);
    const base   = Math.floor(off);
    const frac   = off - base;

    /* クリップ */
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, SY, SW, SH);
    ctx.clip();

    const symH = SH / 3;

    for (let j = -1; j <= 3; j++) {
      const idx = ((base + j) % N + N) % N;
      const sym = (locked && j === 1) ? RESULT : SYMBOLS[idx];
      const yy  = SY + (j - (locked ? 0 : frac)) * symH;
      const mid = j === 1;

      /* 中央セル背景 */
      if (mid) {
        ctx.fillStyle = locked
          ? 'rgba(255,215,0,0.13)'
          : 'rgba(255,255,255,0.07)';
        ctx.fillRect(rx + 3, yy + 2, SW - 6, symH - 4);
      }

      /* シンボル */
      const fs = symH * 0.62;
      ctx.font = `900 ${fs}px "Arial Black",sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur   = 0;

      if (mid && locked && RESULT === '7') {
        const tg = ctx.createLinearGradient(0, yy, 0, yy + symH);
        tg.addColorStop(0,   '#fffaaa');
        tg.addColorStop(0.4, '#ffd700');
        tg.addColorStop(1,   '#ff7800');
        ctx.fillStyle  = tg;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur  = 28;
      } else if (mid && locked) {
        ctx.fillStyle  = '#cce0ff';
        ctx.shadowColor = '#88aaff';
        ctx.shadowBlur  = 14;
      } else {
        ctx.fillStyle = `rgba(180,190,220,${mid ? 0.8 : 0.35})`;
      }

      ctx.fillText(sym, rx + SW / 2, yy + symH / 2);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    /* リール枠線 */
    ctx.save();
    if (locked) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 18;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth   = 1.5;
    }
    rrect(ctx, rx, SY, SW, SH, 7);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    /* ロック瞬間フラッシュ */
    if (locked) {
      const lp = Math.min(1, (t - LOCK_MS[i]) / 260);
      if (lp < 1) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,160,${(1 - lp) * 0.58})`;
        rrect(ctx, rx - 5, SY - 5, SW + 10, SH + 10, 12);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ペイライン（点線）*/
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.52)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(SX - 6,     SY + SH / 2);
  ctx.lineTo(SX + TW + 6, SY + SH / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ────────────────────────────────────────────
   レインボーフラッシュ（確変専用）
   ① 放射状グラデ  ② 斜めスキャンバンド  ③ 突入白爆発
──────────────────────────────────────────── */
function drawRainbow(ctx, t, W, H) {
  const rt    = t - 2400;
  const hue   = (rt * 1.5) % 360;              // 1.5 deg/ms ≈ 2.5サイクル/秒
  const pulse = Math.sin(rt / 45) * 0.5 + 0.5; // ~70ms 周期の脈動

  /* ① 放射状グラデーション（内→外で虹色回転）*/
  const cx = W / 2, cy = H / 2;
  const rg  = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.75);
  rg.addColorStop(0,    `hsla(${hue},           100%, 70%, ${0.7 + pulse * 0.3})`);
  rg.addColorStop(0.3,  `hsla(${(hue+90)%360},  100%, 55%, ${0.6 + pulse * 0.25})`);
  rg.addColorStop(0.65, `hsla(${(hue+200)%360}, 100%, 42%, 0.55)`);
  rg.addColorStop(1,    `hsla(${(hue+300)%360}, 100%, 32%, 0.65)`);
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  /* ② 斜め高速スキャンバンド（5本）*/
  const sweep = rt * 0.6;
  for (let b = 0; b < 5; b++) {
    const bh = (hue + b * 72) % 360;
    const bx = ((sweep + b * (W * 0.22)) % (W + 240)) - 120;
    const bg = ctx.createLinearGradient(bx - 75, 0, bx + 75, H);
    bg.addColorStop(0,   'rgba(0,0,0,0)');
    bg.addColorStop(0.5, `hsla(${bh}, 100%, 82%, ${0.30 * pulse})`);
    bg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  /* ③ 突入直後の白爆発（450ms 以内）*/
  if (rt < 450) {
    const fa = Math.max(0, (1 - rt / 230)) * pulse * 0.78;
    ctx.fillStyle = `rgba(255,255,255,${fa})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ────────────────────────────────────────────
   テキスト描画
──────────────────────────────────────────── */
function drawText(ctx, t, W, H, IS_RUSH) {
  const allLocked = t >= LOCK_MS[2] + 60;
  if (!allLocked) return;

  if (IS_RUSH) {
    /* ── 確変テキスト: 2400ms 以降 ── */
    const rt = t - 2400;
    if (rt < 0) return;

    /* 「大当り！確変突入！」*/
    const alpha = Math.min(1, rt / 160);
    const prog  = Math.min(1, rt / 320);
    const scale = prog < 0.5
      ? 2.4 - prog * 2.8         // 大→適正サイズ
      : 1.0 - (prog - 0.5) * 0.1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2 - Math.min(110, H * 0.14));
    ctx.scale(scale, scale);

    const fs = Math.min(66, W * 0.088);
    ctx.font = `900 ${fs}px "Arial Black","Noto Sans JP",sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    /* シマーグラデーション */
    const shimmer = (rt / 8) % 360;
    const tg = ctx.createLinearGradient(-W * 0.3, 0, W * 0.3, 0);
    tg.addColorStop(0,    '#fff7aa');
    tg.addColorStop(0.25, `hsl(${shimmer}, 100%, 80%)`);
    tg.addColorStop(0.5,  '#ffffff');
    tg.addColorStop(0.75, `hsl(${(shimmer + 120) % 360}, 100%, 75%)`);
    tg.addColorStop(1,    '#ff8c00');

    ctx.strokeStyle = '#6a0000';
    ctx.lineWidth   = 8;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur  = 36;
    ctx.strokeText('大当り！確変突入！', 0, 0);

    ctx.fillStyle  = tg;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 22;
    ctx.fillText('大当り！確変突入！', 0, 0);
    ctx.restore();

    /* 「🌈脳汁ドバドバ！🌈」*/
    if (rt > 220) {
      const a2 = Math.min(1, (rt - 220) / 160);
      ctx.save();
      ctx.globalAlpha = a2;
      const fs2 = Math.min(36, W * 0.048);
      ctx.font = `bold ${fs2}px sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur  = 12;
      ctx.fillText('🌈 脳汁ドバドバ！ 🌈', W / 2, H / 2 - Math.min(28, H * 0.04));
      ctx.restore();
    }

    /* サブメッセージ「さぁ、この調子で…」*/
    if (rt > 820) {
      const a3     = Math.min(1, (rt - 820) / 220);
      const bounce = Math.sin((rt - 820) / 120) * 5;
      ctx.save();
      ctx.globalAlpha = a3;
      const ty = H / 2 + Math.min(90, H * 0.12) + bounce;
      const pW = Math.min(490, W * 0.78);
      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      rrect(ctx, W / 2 - pW / 2, ty - 22, pW, 44, 22);
      ctx.fill();
      const fs3 = Math.min(20, W * 0.027);
      ctx.font = `bold ${fs3}px "Noto Sans JP",sans-serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle   = '#ffffff';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 8;
      ctx.fillText('さぁ、この調子でもう一回タスクを処理しよう！ 👍', W / 2, ty);
      ctx.restore();
    }

  } else {
    /* ── 通常: 「お疲れ様でした！」── */
    const textT = t - LOCK_MS[2];
    const a = Math.min(1, textT / 220);
    if (a <= 0) return;

    ctx.save();
    ctx.globalAlpha = a;
    const fs = Math.min(50, W * 0.07);
    ctx.font = `900 ${fs}px "Arial Black",sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tg = ctx.createLinearGradient(W / 2 - 160, 0, W / 2 + 160, 0);
    tg.addColorStop(0,   '#ffd700');
    tg.addColorStop(0.5, '#ffffff');
    tg.addColorStop(1,   '#ffd700');

    ctx.strokeStyle = '#7a3800';
    ctx.lineWidth   = 5;
    ctx.shadowColor = '#ff8c00';
    ctx.shadowBlur  = 22;
    ctx.strokeText('お疲れ様でした！ ✨', W / 2, H / 2 - Math.min(65, H * 0.1));
    ctx.fillStyle = tg;
    ctx.fillText('お疲れ様でした！ ✨', W / 2, H / 2 - Math.min(65, H * 0.1));
    ctx.restore();
  }
}

/* ════════════════════════════════════════════
   メインエクスポート
   @param {function} opts.onNormal  通常大当り時（confetti 起動用）
   @param {function} opts.onDone    演出完了時
════════════════════════════════════════════ */
export function launchPachinko({ onNormal, onDone } = {}) {
  const IS_RUSH = Math.random() < 0.5;
  const RESULT  = IS_RUSH ? '7' : '2';

  const W = window.innerWidth;
  const H = window.innerHeight;

  /* canvas 生成（固定・最前面・クリック透過）*/
  const cv = document.createElement('canvas');
  cv.width  = W;
  cv.height = H;
  Object.assign(cv.style, {
    position:      'fixed',
    inset:         '0',
    pointerEvents: 'none',
    zIndex:        '9999',
  });
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  const t0   = performance.now();
  let raf;
  const fired = { normal: false, done: false };

  const finish = () => {
    cancelAnimationFrame(raf);
    cv.remove();
    if (!fired.done) { fired.done = true; onDone?.(); }
  };

  /* ── アニメーションループ ── */
  function tick(now) {
    const t = now - t0;
    ctx.clearRect(0, 0, W, H);

    const TOTAL    = IS_RUSH ? 5200 : 3600;
    const FADE_FROM = TOTAL - 650;

    /* 暗転オーバーレイ（確変突入後はレインボーに差し替え）*/
    if (!(IS_RUSH && t > 2400)) {
      const oa = Math.min(1, t / 360) * 0.88;
      ctx.fillStyle = `rgba(0,0,16,${oa})`;
      ctx.fillRect(0, 0, W, H);
    }

    /* レインボーフラッシュ（確変のみ）*/
    if (IS_RUSH && t > 2400) drawRainbow(ctx, t, W, H);

    /* リール（200ms 後から描画）*/
    if (t > 200) drawReels(ctx, t, W, H, RESULT);

    /* テキスト */
    drawText(ctx, t, W, H, IS_RUSH);

    /* 通常: confetti コールバック発火（2350ms）*/
    if (!IS_RUSH && !fired.normal && t > 2350) {
      fired.normal = true;
      onNormal?.();
    }

    /* フェードアウト */
    if (t > FADE_FROM) {
      const fa = Math.min(1, (t - FADE_FROM) / 650);
      ctx.fillStyle = `rgba(0,0,0,${fa})`;
      ctx.fillRect(0, 0, W, H);
    }

    /* 終了 */
    if (t >= TOTAL) { finish(); return; }

    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  /* 安全弁: 7秒後に強制クリーンアップ */
  setTimeout(finish, 7000);
}
