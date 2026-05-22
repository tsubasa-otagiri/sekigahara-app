/**
 * ImageCropModal
 * - ドラッグでトリミング範囲を選択
 * - 白背景を Canvas API で自動透過（threshold ベース）
 * - コンテンツのバウンディングボックスを検出し 256×256 に最大化
 * - 128px / 48px / 24px のリアルタイムプレビュー
 */
import { useState, useRef, useEffect } from "react";
import { Scissors, Check, X, RotateCcw } from "lucide-react";

const CHECKERED =
  "repeating-conic-gradient(#e5e7eb 0% 25%,#fff 0% 50%) 0/12px 12px";
const MAX_DISP   = 320; // 表示エリアの最大 px
const OUTPUT_PX  = 256; // 出力解像度（正方形）
const PAD_RATIO  = 0.04; // コンテンツ周囲の余白（4%）
const WHITE_THR  = 235; // 白と判定する最小輝度（0-255）

/* ── 白背景除去 ── */
function removeWhite(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d   = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const brightness = Math.min(d[i], d[i + 1], d[i + 2]);
    if (brightness >= WHITE_THR) {
      const fade = (brightness - WHITE_THR) / (255 - WHITE_THR); // 0→1
      d[i + 3]   = Math.round(d[i + 3] * (1 - fade));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ── 不透明ピクセルのバウンディングボックスを検出 ── */
function getBounds(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let l = w, r = 0, t = h, b = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
    }
  }
  return l > r || t > b ? { x: 0, y: 0, w, h } : { x: l, y: t, w: r - l + 1, h: b - t + 1 };
}

/**
 * メイン処理:
 *   src (dataURL) → cropPct (割合 or null) → 白除去 → 最大化 → PNG dataURL
 */
function processImage(src, cropPct, doRmWhite, onDone) {
  const img = new Image();
  img.onload = () => {
    const nw = img.naturalWidth, nh = img.naturalHeight;

    /* 1. 切り取り */
    const sx = cropPct ? Math.round(cropPct.x * nw) : 0;
    const sy = cropPct ? Math.round(cropPct.y * nh) : 0;
    const sw = cropPct ? Math.round(cropPct.w * nw) : nw;
    const sh = cropPct ? Math.round(cropPct.h * nh) : nh;

    const c1  = document.createElement("canvas");
    c1.width  = sw; c1.height = sh;
    const ctx1 = c1.getContext("2d");
    ctx1.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    /* 2. 白背景除去 */
    if (doRmWhite) removeWhite(ctx1, sw, sh);

    /* 3. バウンディングボックス検出 */
    const bounds = getBounds(ctx1, sw, sh);

    /* 4. bounds 部分を temp canvas に切り出す */
    const tmp  = document.createElement("canvas");
    tmp.width  = bounds.w; tmp.height = bounds.h;
    const tctx = tmp.getContext("2d");
    tctx.putImageData(ctx1.getImageData(bounds.x, bounds.y, bounds.w, bounds.h), 0, 0);

    /* 5. OUTPUT_PX × OUTPUT_PX に余白付きでスケール */
    const inner  = Math.round(OUTPUT_PX * (1 - PAD_RATIO * 2));
    const scale  = Math.min(inner / bounds.w, inner / bounds.h);
    const dw     = Math.round(bounds.w * scale);
    const dh     = Math.round(bounds.h * scale);
    const dx     = Math.round((OUTPUT_PX - dw) / 2);
    const dy     = Math.round((OUTPUT_PX - dh) / 2);

    const c2  = document.createElement("canvas");
    c2.width  = OUTPUT_PX; c2.height = OUTPUT_PX;
    const ctx2 = c2.getContext("2d");
    ctx2.imageSmoothingEnabled  = true;
    ctx2.imageSmoothingQuality  = "high";
    ctx2.drawImage(tmp, 0, 0, bounds.w, bounds.h, dx, dy, dw, dh);

    onDone(c2.toDataURL("image/png"));
  };
  img.src = src;
}

export default function ImageCropModal({ src, onApply, onCancel }) {
  const boxRef = useRef(null);

  const [nat,  setNat]  = useState({ w: 1, h: 1 });
  const [disp, setDisp] = useState({ w: MAX_DISP, h: MAX_DISP });

  const [crop,      setCrop]      = useState(null);   // {x,y,w,h} display px
  const [dragStart, setDragStart] = useState(null);
  const [doRmWhite, setDoRmWhite] = useState(true);
  const [preview,   setPreview]   = useState(null);   // 処理済み dataURL

  /* 画像の自然サイズを取得 → 表示サイズを計算 */
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(MAX_DISP / img.naturalWidth, MAX_DISP / img.naturalHeight, 1);
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setDisp({ w: Math.round(img.naturalWidth * s), h: Math.round(img.naturalHeight * s) });
    };
    img.src = src;
  }, [src]);

  /* crop / doRmWhite が変わるたびにプレビュー再生成 */
  useEffect(() => {
    const hasCrop = crop && crop.w > 4 && crop.h > 4;
    const cropPct = hasCrop
      ? { x: crop.x / disp.w, y: crop.y / disp.h,
          w: crop.w / disp.w, h: crop.h / disp.h }
      : null;
    processImage(src, cropPct, doRmWhite, setPreview);
  }, [crop, doRmWhite, src, disp]);

  /* マウス座標取得（表示エリア内にクランプ） */
  const getPos = (e) => {
    const rect = boxRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, disp.w)),
      y: Math.max(0, Math.min(e.clientY - rect.top,  disp.h)),
    };
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    const p = getPos(e);
    setDragStart(p);
    setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const onMouseMove = (e) => {
    if (!dragStart) return;
    const p = getPos(e);
    setCrop({
      x: Math.min(dragStart.x, p.x), y: Math.min(dragStart.y, p.y),
      w: Math.abs(p.x - dragStart.x), h: Math.abs(p.y - dragStart.y),
    });
  };
  const onMouseUp = () => setDragStart(null);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3"
      style={{ background: "rgba(0,0,0,0.65)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[740px] overflow-hidden flex flex-col">

        {/* ヘッダー */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
          <Scissors size={14} className="text-blue-600 flex-none" />
          <span className="text-sm font-bold text-gray-800">トリミング・調整</span>
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-gray-600">
              <input
                type="checkbox"
                className="accent-blue-600 w-3.5 h-3.5"
                checked={doRmWhite}
                onChange={e => setDoRmWhite(e.target.checked)}
              />
              白背景を自動で透過
            </label>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ボディ */}
        <div className="flex gap-6 p-5 overflow-auto">

          {/* 左: 元画像 ＋ ドラッグ選択 */}
          <div className="shrink-0">
            <p className="text-[11px] text-gray-400 font-medium mb-1.5">
              ドラッグでトリミング範囲を選択（なし = 全体）
            </p>
            <div
              ref={boxRef}
              className="relative select-none cursor-crosshair rounded-xl border border-gray-200 overflow-hidden"
              style={{ width: disp.w, height: disp.h, background: CHECKERED }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <img
                src={src}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "fill", display: "block", userSelect: "none" }}
              />
              {/* トリミング選択オーバーレイ */}
              {crop && crop.w > 2 && crop.h > 2 && (
                <div
                  className="absolute border-2 border-blue-400 pointer-events-none"
                  style={{
                    left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.42)",
                  }}
                />
              )}
            </div>
            {crop && (
              <button
                onClick={() => setCrop(null)}
                className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 underline"
              >
                <RotateCcw size={10} /> 選択をリセット
              </button>
            )}
          </div>

          {/* 右: 処理後プレビュー */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 font-medium mb-3">
              プレビュー（白背景透過 ＋ 自動最大化）
            </p>
            {preview ? (
              <div className="space-y-4">
                {[
                  { sz: 128, label: "128px（ヘッダー）" },
                  { sz: 48,  label: "48px" },
                  { sz: 24,  label: "24px（ブラウザタブ）" },
                ].map(({ sz, label }) => (
                  <div key={sz} className="flex items-center gap-3">
                    <div
                      style={{
                        width: sz, height: sz,
                        background: CHECKERED,
                        borderRadius: sz >= 64 ? "10px" : "5px",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={preview}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-400">{label}</span>
                  </div>
                ))}
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  ✓ 白背景を透過済み<br />
                  ✓ {OUTPUT_PX}×{OUTPUT_PX}px の正方形に最大化
                </p>
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">
                処理中...
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            onClick={() => preview && onApply(preview)}
            disabled={!preview}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40 hover:brightness-110 transition"
            style={{ background: "#0070d2" }}
          >
            <Check size={13} /> この画像を適用する
          </button>
        </div>
      </div>
    </div>
  );
}
