/**
 * 超軽量・自作 Confetti エフェクト（外部ライブラリ不使用）
 * canvas を動的生成 → パーティクルをアニメーション → 自動クリーンアップ
 */

const COLORS = [
  "#0070d2", // Salesforce Blue
  "#00a1e0", // Sky Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Gold
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#22d3ee", // Cyan
  "#a3e635", // Lime
];

/** originX, originY: 発射起点（省略時は画面中央） */
export function launchConfetti(originX, originY) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = originX ?? W / 2;
  const cy = originY ?? H * 0.45;

  /* ── canvas 生成 ── */
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width:  "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9998",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  /* ── パーティクル生成 ── */
  const COUNT = 72;
  const particles = Array.from({ length: COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 6 + Math.random() * 10;
    return {
      x:  cx,
      y:  cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4, // 上方向バイアス
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 14,
      w:  5 + Math.random() * 6,
      h:  3 + Math.random() * 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      shape: Math.random() < 0.3 ? "circle" : "rect",
    };
  });

  let frame;
  const GRAVITY = 0.38;
  const DRAG    = 0.985;

  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;

    particles.forEach(p => {
      if (p.alpha <= 0) return;
      alive = true;

      p.vx *= DRAG;
      p.vy  = p.vy * DRAG + GRAVITY;
      p.x  += p.vx;
      p.y  += p.vy;
      p.rot += p.rotV;

      /* 画面外に出たら即消滅 */
      if (p.y > H + 20 || p.x < -20 || p.x > W + 20) { p.alpha = 0; return; }

      /* フェードアウト（下半分から） */
      if (p.y > H * 0.55) p.alpha = Math.max(0, p.alpha - 0.025);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === "circle") {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    });

    if (alive) {
      frame = requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };

  frame = requestAnimationFrame(tick);

  /* 安全弁: 4秒後に強制クリーンアップ */
  setTimeout(() => {
    cancelAnimationFrame(frame);
    canvas.remove();
  }, 4000);
}

/** Nice Job! トーストを表示（1.4秒で自動消滅） */
export function showNiceJob() {
  const MESSAGES = [
    "お疲れ様でした！ ✨",
    "Nice Job! 👍",
    "タスク完了！ 🎉",
    "よし！ 完璧！ 🏆",
    "素晴らしい！ ⭐",
  ];
  const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const el = document.createElement("div");
  el.className = "nice-job-toast";
  el.textContent = msg;
  Object.assign(el.style, {
    fontSize: "clamp(22px, 4vw, 32px)",
    fontWeight: "900",
    color: "#fff",
    textShadow: "0 2px 16px rgba(0,0,0,.35)",
    background: "linear-gradient(135deg, #0070d2, #10b981)",
    borderRadius: "20px",
    padding: "14px 32px",
    boxShadow: "0 8px 32px -4px rgba(0,112,210,.45)",
    letterSpacing: "-0.5px",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
