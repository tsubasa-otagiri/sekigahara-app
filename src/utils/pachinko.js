/**
 * pachinko.js
 * パチンコ風確変ルーレット演出（視覚のみ・音なし）
 *
 * 確率テーブル:
 *   10% … 🔥 フリーズ確変  → 必ず777（漆黒ブラックアウト1.5秒）
 *   20% … 🌈 通常大当たり  → 555 + レインボーフラッシュ
 *   70% … ✨ 通常          → confetti のみ
 *
 * フリーズ演出タイムライン (FREEZE_DUR = 1500ms):
 *   900ms       — リール突然停止 + 白爆発フラッシュ
 *   900〜2400ms — 漆黒ブラックアウト(0.97) + ⚡FREEZE⚡ + 電撃稲妻ストロボ
 *   2400ms      — 赤フラッシュで再始動
 *   3850ms      — 全リールホールド → 777
 *   3900ms      — レインボーフラッシュ炸裂 + 「大当たり！」
 *   6700ms      — フェードアウト → クリーンアップ
 *
 * 通常フロー (フリーズなし):
 *   1700/2050/2350ms — リール①②③ホールド
 *   [確変 40%] 2400ms — レインボー + 「大当たり！」(555) → 5200ms
 *   [通常 50%] 2350ms — confetti 発火 → 3600ms
 */

/* ════════════════════════════════════════════
   モジュール定数
════════════════════════════════════════════ */
const BASE_LOCK   = [1700, 2050, 2350]; // フリーズなし時のロック ms
const SYMBOLS     = ['7','7','♦','★','2','3','8','4','9','6','5','1'];
const N           = SYMBOLS.length;

const FREEZE_START = 900;
const FREEZE_DUR   = 1500;                        // 長尺漆黒ブラックアウト
const FREEZE_END   = FREEZE_START + FREEZE_DUR;  // 2400

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

/* ════════════════════════════════════════════
   リールオフセット計算（フリーズ対応）
   引数 t はリアル時刻、内部で effT に変換
════════════════════════════════════════════ */
function reelOff(i, t, finalSym, isFreezeOn) {
  /* フリーズ中: effT を FREEZE_START に固定、以降は時間をずらす */
  let effT = t;
  if (isFreezeOn) {
    if      (t >= FREEZE_END)   effT = t - FREEZE_DUR;
    else if (t >= FREEZE_START) effT = FREEZE_START;
  }

  /* BASE_LOCK は effT 空間で定義 */
  const L       = BASE_LOCK[i];
  const SPEED   = 0.013;
  const DECEL   = 380;
  const decelS  = L - DECEL;
  const baseOff = decelS * SPEED;
  const lockOff = baseOff + SPEED * DECEL * 0.5;

  /* 止まる位置: センター(j=1) が finalSym になるよう調整 */
  const fi     = SYMBOLS.findIndex(s => s === finalSym);
  const target = ((fi - 1) % N + N) % N;
  const curMod = ((Math.floor(lockOff)) % N + N) % N;
  const diff   = ((target - curMod) % N + N) % N;
  const stop   = Math.floor(lockOff) + diff;

  if (effT >= L) {
    const p    = Math.min(1, (effT - L) / 220);
    const ease = 1 - Math.pow(1 - p, 3);
    return lockOff + (stop - lockOff) * ease;
  }
  if (effT <= decelS) return effT * SPEED;
  const dt = effT - decelS;
  const p  = dt / DECEL;
  return baseOff + SPEED * DECEL * (p - p * p * 0.5);
}

/* ════════════════════════════════════════════
   リール描画
════════════════════════════════════════════ */
function drawReels(ctx, t, W, H, RESULT, lockT, isFreezeOn) {
  const SW  = Math.min(108, W * 0.145);
  const SH  = SW * 1.26;
  const GAP = SW * 0.13;
  const TW  = SW * 3 + GAP * 2;
  const SX  = (W - TW) / 2;
  const SY  = H * 0.5 - SH * 0.5 - 10;

  /* 外枠 */
  ctx.save();
  const fg = ctx.createLinearGradient(SX - 14, SY, SX + TW + 14, SY + SH);
  fg.addColorStop(0, '#ffd700'); fg.addColorStop(0.5, '#fffacc'); fg.addColorStop(1, '#ffa500');
  ctx.fillStyle = fg;
  rrect(ctx, SX - 14, SY - 14, TW + 28, SH + 28, 18);
  ctx.fill();
  ctx.fillStyle = '#03031a';
  rrect(ctx, SX - 6, SY - 6, TW + 12, SH + 12, 12);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < 3; i++) {
    const rx     = SX + i * (SW + GAP);
    const locked = t >= lockT[i];
    const off    = reelOff(i, t, RESULT, isFreezeOn);
    const base   = Math.floor(off);
    const frac   = off - base;
    const symH   = SH / 3;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, SY, SW, SH);
    ctx.clip();

    for (let j = -1; j <= 3; j++) {
      const idx = ((base + j) % N + N) % N;
      const sym = (locked && j === 1) ? RESULT : SYMBOLS[idx];
      const yy  = SY + (j - (locked ? 0 : frac)) * symH;
      const mid = j === 1;

      if (mid) {
        ctx.fillStyle = locked ? 'rgba(255,215,0,0.13)' : 'rgba(255,255,255,0.07)';
        ctx.fillRect(rx + 3, yy + 2, SW - 6, symH - 4);
      }

      const fs = symH * 0.62;
      ctx.font = `900 ${fs}px "Arial Black",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowBlur = 0;

      if (mid && locked && RESULT === '7') {
        /* フリーズ確変 777 — 炎ゴールド */
        const tg = ctx.createLinearGradient(0, yy, 0, yy + symH);
        tg.addColorStop(0, '#fffaaa'); tg.addColorStop(0.4, '#ffd700'); tg.addColorStop(1, '#ff7800');
        ctx.fillStyle = tg; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 28;
      } else if (mid && locked && RESULT === '5') {
        /* 通常確変 555 — 翡翠グリーン〜ゴールド */
        const tg = ctx.createLinearGradient(0, yy, 0, yy + symH);
        tg.addColorStop(0, '#efffcc'); tg.addColorStop(0.4, '#7fff00'); tg.addColorStop(1, '#00e676');
        ctx.fillStyle = tg; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 26;
      } else if (mid && locked) {
        ctx.fillStyle = '#cce0ff'; ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 14;
      } else {
        ctx.fillStyle = `rgba(180,190,220,${mid ? 0.8 : 0.35})`;
      }
      ctx.fillText(sym, rx + SW / 2, yy + symH / 2);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    /* 枠線 */
    ctx.save();
    if (locked) {
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
    }
    rrect(ctx, rx, SY, SW, SH, 7);
    ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();

    /* ロック瞬間フラッシュ */
    if (locked) {
      const lp = Math.min(1, (t - lockT[i]) / 260);
      if (lp < 1) {
        ctx.save();
        ctx.fillStyle = `rgba(255,255,160,${(1 - lp) * 0.58})`;
        rrect(ctx, rx - 5, SY - 5, SW + 10, SH + 10, 12);
        ctx.fill(); ctx.restore();
      }
    }
  }

  /* ペイライン */
  ctx.save();
  ctx.strokeStyle = 'rgba(255,215,0,0.52)'; ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(SX - 6, SY + SH / 2);
  ctx.lineTo(SX + TW + 6, SY + SH / 2);
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();
}

/* ════════════════════════════════════════════
   ⚡ フリーズ演出
   ft = t - FREEZE_START (0〜FREEZE_DUR)
════════════════════════════════════════════ */
function drawFreeze(ctx, t, W, H) {
  const ft = t - FREEZE_START; // 0 〜 FREEZE_DUR (1500ms)

  /* ① 突入白爆発フラッシュ (0〜100ms) */
  if (ft < 100) {
    const fa = (1 - ft / 100) * 0.95;
    ctx.fillStyle = `rgba(255,255,255,${fa})`;
    ctx.fillRect(0, 0, W, H);
  }

  /* ② 漆黒ブラックアウト (70〜1300ms) — ほぼ完全に真っ黒 */
  if (ft >= 70) {
    const ramp    = Math.min(1, (ft - 70) / 130);            // 70〜200ms で完全黒へ
    const exitRmp = ft > 1250 ? (ft - 1250) / 250 : 0;       // 1250〜1500ms で黒明け
    const alpha   = ramp * (1 - exitRmp) * 0.97;             // 最大 0.97 = 漆黒
    ctx.fillStyle = `rgba(0,0,4,${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  /* ③ 電撃稲妻 (120〜1280ms) — ブラックアウト中にランダム点滅 */
  if (ft >= 120 && ft < 1280) {
    /* 80ms 周期でストロボ（漆黒の中でより衝撃的）*/
    if (Math.floor(ft / 80) % 3 !== 0) drawLightning(ctx, t, W, H);
  }

  /* ④ ⚡FREEZE⚡テキスト (160〜1260ms) */
  if (ft >= 160 && ft < 1260) {
    const enterA = Math.min(1, (ft - 160) / 140);
    const exitA  = Math.max(0, 1 - (ft - 1120) / 140);
    const alpha  = Math.min(enterA, exitA);
    const bounce = Math.sin(ft / 90) * 7;
    drawFreezeText(ctx, W, H / 2 + bounce, alpha);
  }

  /* ⑤ 再始動赤フラッシュ (1300〜1500ms) */
  if (ft >= 1300) {
    const fa = Math.min(1, (ft - 1300) / 200) * 0.72;
    ctx.fillStyle = `rgba(210,10,0,${fa})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* 電撃稲妻ライン */
function drawLightning(ctx, t, W, H) {
  const pulse = Math.sin(t / 28) * 0.4 + 0.6;

  /* 画面の端から中央付近へ向かう5本の雷 */
  const bolts = [
    [0,   0,   W * 0.42, H * 0.48],
    [W,   0,   W * 0.58, H * 0.48],
    [W/2, 0,   W * 0.5,  H * 0.5 ],
    [0,   H,   W * 0.38, H * 0.52],
    [W,   H,   W * 0.62, H * 0.52],
  ];

  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 18;

  bolts.forEach(([sx, sy, ex, ey], bi) => {
    /* 2フレームに1回点滅させる */
    if (bi === 2 && Math.floor(t / 45) % 2 === 0) return;

    ctx.strokeStyle = `rgba(160,220,255,${pulse * 0.85})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy);

    const steps = 6;
    for (let s = 1; s < steps; s++) {
      const prog = s / steps;
      const jx = sx + (ex - sx) * prog + Math.sin(t / 38 + bi * 3.1 + s) * 28;
      const jy = sy + (ey - sy) * prog + Math.cos(t / 32 + bi * 2.7 + s) * 28;
      ctx.lineTo(jx, jy);
    }
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });

  /* 中央の輝点 */
  const glow = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, 60);
  glow.addColorStop(0,   `rgba(180,230,255,${pulse * 0.5})`);
  glow.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}

/* ⚡FREEZE⚡ テキスト */
function drawFreezeText(ctx, W, cy, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const fs = Math.min(78, W * 0.105);
  ctx.font = `900 ${fs}px "Arial Black",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  /* 外縁（濃紺）*/
  ctx.strokeStyle = '#001a33'; ctx.lineWidth = 10;
  ctx.shadowColor = '#0088ff'; ctx.shadowBlur = 50;
  ctx.strokeText('⚡ FREEZE ⚡', W / 2, cy);

  /* 本体（氷青白）*/
  const tg = ctx.createLinearGradient(W/2 - 200, cy - fs/2, W/2 + 200, cy + fs/2);
  tg.addColorStop(0, '#e8f8ff'); tg.addColorStop(0.4, '#aaddff');
  tg.addColorStop(0.6, '#ffffff'); tg.addColorStop(1, '#88ccff');
  ctx.fillStyle = tg;
  ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 30;
  ctx.fillText('⚡ FREEZE ⚡', W / 2, cy);
  ctx.restore();
}

/* ════════════════════════════════════════════
   レインボーフラッシュ（確変専用）
════════════════════════════════════════════ */
function drawRainbow(ctx, t, W, H, rushStart) {
  const rt    = t - rushStart;
  const hue   = (rt * 1.5) % 360;
  const pulse = Math.sin(rt / 45) * 0.5 + 0.5;

  /* 放射状グラデーション */
  const cx = W / 2, cy = H / 2;
  const rg  = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) * 0.75);
  rg.addColorStop(0,    `hsla(${hue},          100%, 70%, ${0.7 + pulse * 0.3})`);
  rg.addColorStop(0.3,  `hsla(${(hue+90)%360}, 100%, 55%, ${0.6 + pulse * 0.25})`);
  rg.addColorStop(0.65, `hsla(${(hue+200)%360},100%, 42%, 0.55)`);
  rg.addColorStop(1,    `hsla(${(hue+300)%360},100%, 32%, 0.65)`);
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

  /* 斜め高速スキャンバンド（5本）*/
  const sweep = rt * 0.6;
  for (let b = 0; b < 5; b++) {
    const bh = (hue + b * 72) % 360;
    const bx = ((sweep + b * (W * 0.22)) % (W + 240)) - 120;
    const bg = ctx.createLinearGradient(bx - 75, 0, bx + 75, H);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(0.5, `hsla(${bh},100%,82%,${0.30 * pulse})`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  }

  /* 突入白爆発（450ms 以内）*/
  if (rt < 450) {
    const fa = Math.max(0, (1 - rt / 230)) * pulse * 0.78;
    ctx.fillStyle = `rgba(255,255,255,${fa})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* ════════════════════════════════════════════
   テキスト描画
════════════════════════════════════════════ */
function drawText(ctx, t, W, H, IS_RUSH, lockT, rushStart) {
  if (t < lockT[2] + 60) return;

  if (IS_RUSH) {
    const rt = t - rushStart;
    if (rt < 0) return;

    /* 「大当たり！」*/
    const alpha = Math.min(1, rt / 160);
    const prog  = Math.min(1, rt / 320);
    const scale = prog < 0.5 ? (2.4 - prog * 2.8) : (1.0 - (prog - 0.5) * 0.1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2 - Math.min(110, H * 0.14));
    ctx.scale(scale, scale);

    const fs = Math.min(80, W * 0.1);
    ctx.font = `900 ${fs}px "Arial Black","Noto Sans JP",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    const shimmer = (rt / 8) % 360;
    const tg = ctx.createLinearGradient(-W * 0.3, 0, W * 0.3, 0);
    tg.addColorStop(0, '#fff7aa');
    tg.addColorStop(0.25, `hsl(${shimmer},100%,80%)`);
    tg.addColorStop(0.5, '#ffffff');
    tg.addColorStop(0.75, `hsl(${(shimmer+120)%360},100%,75%)`);
    tg.addColorStop(1, '#ff8c00');

    ctx.strokeStyle = '#6a0000'; ctx.lineWidth = 8;
    ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 36;
    ctx.strokeText('大当たり！', 0, 0);
    ctx.fillStyle = tg;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 22;
    ctx.fillText('大当たり！', 0, 0);
    ctx.restore();

    /* サブメッセージ */
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
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 8;
      ctx.fillText('さぁ、この調子でもう一回タスクを処理しよう！ 👍', W / 2, ty);
      ctx.restore();
    }

  }
}

/* ════════════════════════════════════════════
   メインエクスポート
   @param {function} opts.onNormal  通常大当り時（confetti 起動用）
   @param {function} opts.onDone    演出完了時
════════════════════════════════════════════ */
export function launchPachinko({ onNormal, onDone } = {}) {
  /* 確率判定 */
  const IS_FREEZE = Math.random() < 0.10;               // 10% フリーズ確変
  const IS_RUSH   = IS_FREEZE || Math.random() < (2/9); // 残90%中に20%確変 → 2/9≈22.2%

  /* フリーズ=777 / 通常確変=555 / 通常=2 */
  const RESULT = IS_FREEZE ? '7' : IS_RUSH ? '5' : '2';

  /* フリーズ有無でロックタイミングをずらす（リアル時刻） */
  const lockT    = BASE_LOCK.map(l => l + (IS_FREEZE ? FREEZE_DUR : 0));
  const rushStart = lockT[2] + 50; // レインボー / 大当たりテキスト開始

  const TOTAL = (IS_RUSH ? 5200 : 3600) + (IS_FREEZE ? FREEZE_DUR : 0);

  const W = window.innerWidth;
  const H = window.innerHeight;

  /* canvas */
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  Object.assign(cv.style, {
    position: 'fixed', inset: '0',
    pointerEvents: 'none', zIndex: '9999',
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

    const fadeFrom = TOTAL - 650;

    /* 暗転オーバーレイ（レインボー開始後は差し替え） */
    if (!(IS_RUSH && t > rushStart)) {
      const oa = Math.min(1, t / 360) * 0.88;
      ctx.fillStyle = `rgba(0,0,16,${oa})`;
      ctx.fillRect(0, 0, W, H);
    }

    /* レインボーフラッシュ（確変のみ） */
    if (IS_RUSH && t > rushStart) drawRainbow(ctx, t, W, H, rushStart);

    /* リール（200ms 後から描画） */
    if (t > 200) drawReels(ctx, t, W, H, RESULT, lockT, IS_FREEZE);

    /* ⚡フリーズ演出（リールの上に重ねて描画） */
    if (IS_FREEZE && t >= FREEZE_START && t < FREEZE_END) {
      drawFreeze(ctx, t, W, H);
    }

    /* テキスト */
    drawText(ctx, t, W, H, IS_RUSH, lockT, rushStart);

    /* 通常: confetti コールバック発火 */
    if (!IS_RUSH && !fired.normal && t > lockT[2]) {
      fired.normal = true;
      onNormal?.();
    }

    /* フェードアウト */
    if (t > fadeFrom) {
      const fa = Math.min(1, (t - fadeFrom) / 650);
      ctx.fillStyle = `rgba(0,0,0,${fa})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (t >= TOTAL) { finish(); return; }
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);
  setTimeout(finish, 9000); /* 安全弁 */
}
