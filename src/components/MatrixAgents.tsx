import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

declare global {
  interface Window {
    __matrixZoomStart?: number;
    __matrixZoomOutStart?: number;
    __brandText?: { label: string; name: string; startTime?: number; enabledBy?: string } | null;
  }
}

const CORPUS = [
  "The Matrix has you. Follow the white rabbit. Wake up, Neo. There is no spoon. Free your mind. Welcome to the desert of the real. Everything that has a beginning has an end. ",
  "或日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。",
  "我冒了严寒回到相隔二千余里别了二十余年的故乡去。",
  "새침하게 흐린 품이 눈이 올 듯하더니",
  "ในสมัยหนึ่ง มีพระราชาองค์หนึ่ง",
  "بسم الله الرحمن الرحيم",
  "ויהי בימים ההם ויצא משה",
  "တစ်ခါတစ်ရံ ဗျိုင်းငှက်သည်",
].join(" ");

const FULL_CORPUS = (CORPUS + " ").repeat(12);
const ZOOM_DURATION = 4500;

function getEyePosition(W: number, H: number) {
  const figH = Math.min(H * 0.78, W * 1.0);
  const figTop = (H - figH) / 2 - figH * 0.02;
  // Use same 7.5-head proportion as drawSilhouetteMask
  const headH = figH / 7.5;
  const headW = headH * 0.82;
  const eyeY = figTop + headH * 0.46;
  const eyeSpacing = headW * 0.18;
  return { x: W / 2 - eyeSpacing, y: eyeY };
}

function cinematicEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const t2 = t * t;
  const t3 = t2 * t;
  return 6 * t3 * t2 - 15 * t2 * t2 + 10 * t3;
}

/**
 * Draw agent silhouette — faithful to reference images:
 * - image-3: Slim build, high collar/turtleneck, proportional head, sunglasses
 * - image-4: Fedora with moderate brim, large wraparound glasses, coat collar
 * 
 * Figure drawing proportions (Loomis method):
 * - Total height = 7.5 heads
 * - Shoulders = ~2 head widths (slim male)
 * - Head width = ~2/3 head height
 * - Waist at ~3 heads down, hips at ~4
 */
function drawSilhouetteMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2;
  // Figure fills ~78% of height, closer framing
  const figH = Math.min(H * 0.78, W * 1.0);
  const figTop = (H - figH) / 2 - figH * 0.02;
  const headH = figH / 7.5; // 7.5-head canon
  const headW = headH * 0.82; // wider head ratio (was 0.72 = too small)

  // Shoulders: ~1.45x head height (slimmer per reference image-3)
  const shoulderW = headH * 1.45;
  const neckW = headH * 0.26;

  ctx.fillStyle = "#fff";

  // ── FULL BODY as single path ──
  ctx.beginPath();

  const bodyBottom = figTop + figH + 20;

  // Start bottom-left
  ctx.moveTo(cx - shoulderW * 0.55, bodyBottom);
  ctx.lineTo(cx - shoulderW * 0.75, bodyBottom);

  // Left arm up — slight taper
  ctx.bezierCurveTo(
    cx - shoulderW * 0.78, figTop + figH * 0.5,
    cx - shoulderW * 0.82, figTop + figH * 0.35,
    cx - shoulderW * 0.88, figTop + headH * 1.7
  );

  // Left shoulder — clean line
  ctx.bezierCurveTo(
    cx - shoulderW * 0.86, figTop + headH * 1.45,
    cx - shoulderW * 0.72, figTop + headH * 1.2,
    cx - shoulderW * 0.5, figTop + headH * 1.12
  );

  // Shoulder to neck
  ctx.bezierCurveTo(
    cx - shoulderW * 0.28, figTop + headH * 1.05,
    cx - neckW * 1.4, figTop + headH * 1.02,
    cx - neckW, figTop + headH * 0.90
  );

  // HIGH COAT COLLAR (reference image-4) — rises up framing the jaw
  ctx.bezierCurveTo(
    cx - neckW * 1.1, figTop + headH * 0.80,
    cx - headW * 0.7, figTop + headH * 0.75,
    cx - headW * 0.78, figTop + headH * 0.62
  );

  // Left jaw — rounder, fuller head
  ctx.bezierCurveTo(
    cx - headW * 0.88, figTop + headH * 0.48,
    cx - headW * 0.92, figTop + headH * 0.32,
    cx - headW * 0.78, figTop + headH * 0.15
  );

  // FEDORA — moderate brim, not oversized (reference image-4)
  const brimW = headW * 1.5; // reduced from 2.2x — more proportional
  const hatBrimY = figTop + headH * 0.13;
  ctx.lineTo(cx - brimW, hatBrimY + headH * 0.02);

  // Brim left edge — slight curve
  ctx.bezierCurveTo(
    cx - brimW * 1.03, hatBrimY,
    cx - brimW * 1.04, hatBrimY - headH * 0.015,
    cx - brimW * 1.0, hatBrimY - headH * 0.025
  );

  // Brim top to crown — taller dome
  ctx.lineTo(cx - headW * 0.65, figTop + headH * 0.06);

  // ROUNDED CROWN — taller dome (not flat)
  ctx.bezierCurveTo(
    cx - headW * 0.58, figTop - headH * 0.08,
    cx - headW * 0.38, figTop - headH * 0.2,
    cx - headW * 0.08, figTop - headH * 0.24
  );

  // Crown apex
  ctx.bezierCurveTo(
    cx, figTop - headH * 0.25,
    cx + headW * 0.08, figTop - headH * 0.24,
    cx + headW * 0.08, figTop - headH * 0.24
  );

  // Right crown
  ctx.bezierCurveTo(
    cx + headW * 0.38, figTop - headH * 0.2,
    cx + headW * 0.58, figTop - headH * 0.08,
    cx + headW * 0.65, figTop + headH * 0.06
  );

  // Right crown to brim
  ctx.lineTo(cx + brimW * 1.0, hatBrimY - headH * 0.025);

  // Right brim edge
  ctx.bezierCurveTo(
    cx + brimW * 1.04, hatBrimY - headH * 0.015,
    cx + brimW * 1.03, hatBrimY,
    cx + brimW, hatBrimY + headH * 0.02
  );

  // Right brim to face
  ctx.lineTo(cx + headW * 0.78, figTop + headH * 0.15);

  // Right jaw
  ctx.bezierCurveTo(
    cx + headW * 0.92, figTop + headH * 0.32,
    cx + headW * 0.88, figTop + headH * 0.48,
    cx + headW * 0.78, figTop + headH * 0.62
  );

  // Right coat collar
  ctx.bezierCurveTo(
    cx + headW * 0.7, figTop + headH * 0.75,
    cx + neckW * 1.1, figTop + headH * 0.80,
    cx + neckW, figTop + headH * 0.90
  );

  // Right neck to shoulder
  ctx.bezierCurveTo(
    cx + neckW * 1.4, figTop + headH * 1.02,
    cx + shoulderW * 0.28, figTop + headH * 1.05,
    cx + shoulderW * 0.5, figTop + headH * 1.12
  );

  // Right shoulder
  ctx.bezierCurveTo(
    cx + shoulderW * 0.72, figTop + headH * 1.2,
    cx + shoulderW * 0.86, figTop + headH * 1.45,
    cx + shoulderW * 0.88, figTop + headH * 1.7
  );

  // Right arm down
  ctx.bezierCurveTo(
    cx + shoulderW * 0.82, figTop + figH * 0.35,
    cx + shoulderW * 0.78, figTop + figH * 0.5,
    cx + shoulderW * 0.75, bodyBottom
  );

  ctx.lineTo(cx + shoulderW * 0.55, bodyBottom);
  ctx.closePath();
  ctx.fill();

  // ── LARGE SUNGLASSES — black cutouts so green chars show through ──
  ctx.fillStyle = "#000";
  const glassY = figTop + headH * 0.36;
  const glassW = headW * 0.52;
  const glassH = headH * 0.16;
  const glassSpacing = headW * 0.05;

  // Left lens — aviator shape
  ctx.beginPath();
  ctx.moveTo(cx - glassSpacing - glassW, glassY - glassH * 0.4);
  ctx.bezierCurveTo(
    cx - glassSpacing - glassW * 0.85, glassY - glassH * 0.9,
    cx - glassSpacing - glassW * 0.15, glassY - glassH * 1.0,
    cx - glassSpacing, glassY - glassH * 0.5
  );
  ctx.bezierCurveTo(
    cx - glassSpacing, glassY + glassH * 0.5,
    cx - glassSpacing - glassW * 0.25, glassY + glassH * 1.0,
    cx - glassSpacing - glassW * 0.55, glassY + glassH * 0.95
  );
  ctx.bezierCurveTo(
    cx - glassSpacing - glassW * 0.85, glassY + glassH * 0.8,
    cx - glassSpacing - glassW * 1.05, glassY + glassH * 0.2,
    cx - glassSpacing - glassW, glassY - glassH * 0.4
  );
  ctx.closePath();
  ctx.fill();

  // Right lens (mirror)
  ctx.beginPath();
  ctx.moveTo(cx + glassSpacing + glassW, glassY - glassH * 0.4);
  ctx.bezierCurveTo(
    cx + glassSpacing + glassW * 0.85, glassY - glassH * 0.9,
    cx + glassSpacing + glassW * 0.15, glassY - glassH * 1.0,
    cx + glassSpacing, glassY - glassH * 0.5
  );
  ctx.bezierCurveTo(
    cx + glassSpacing, glassY + glassH * 0.5,
    cx + glassSpacing + glassW * 0.25, glassY + glassH * 1.0,
    cx + glassSpacing + glassW * 0.55, glassY + glassH * 0.95
  );
  ctx.bezierCurveTo(
    cx + glassSpacing + glassW * 0.85, glassY + glassH * 0.8,
    cx + glassSpacing + glassW * 1.05, glassY + glassH * 0.2,
    cx + glassSpacing + glassW, glassY - glassH * 0.4
  );
  ctx.closePath();
  ctx.fill();

  // Bridge between lenses
  ctx.strokeStyle = "#000";
  ctx.lineWidth = headH * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx - glassSpacing, glassY - glassH * 0.3);
  ctx.bezierCurveTo(
    cx - glassSpacing * 0.3, glassY - glassH * 0.6,
    cx + glassSpacing * 0.3, glassY - glassH * 0.6,
    cx + glassSpacing, glassY - glassH * 0.3
  );
  ctx.stroke();

  // ── SUIT DETAILS ──
  // Lapel V-lines
  ctx.strokeStyle = "rgb(10,10,10)";
  ctx.lineWidth = headH * 0.025;

  // Left lapel
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.9, figTop + headH * 0.96);
  ctx.bezierCurveTo(
    cx - shoulderW * 0.16, figTop + headH * 1.16,
    cx - shoulderW * 0.22, figTop + headH * 2.0,
    cx - shoulderW * 0.25, figTop + headH * 2.8
  );
  ctx.stroke();

  // Right lapel
  ctx.beginPath();
  ctx.moveTo(cx + neckW * 0.9, figTop + headH * 0.96);
  ctx.bezierCurveTo(
    cx + shoulderW * 0.16, figTop + headH * 1.16,
    cx + shoulderW * 0.22, figTop + headH * 2.0,
    cx + shoulderW * 0.25, figTop + headH * 2.8
  );
  ctx.stroke();

  // Lapel notches
  ctx.lineWidth = headH * 0.018;
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW * 0.17, figTop + headH * 1.2);
  ctx.lineTo(cx - shoulderW * 0.28, figTop + headH * 1.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + shoulderW * 0.17, figTop + headH * 1.2);
  ctx.lineTo(cx + shoulderW * 0.28, figTop + headH * 1.08);
  ctx.stroke();

  // TIE — black cutout
  ctx.fillStyle = "#000";
  // Knot
  ctx.beginPath();
  ctx.moveTo(cx - headH * 0.06, figTop + headH * 0.92);
  ctx.lineTo(cx + headH * 0.06, figTop + headH * 0.92);
  ctx.lineTo(cx + headH * 0.085, figTop + headH * 1.08);
  ctx.lineTo(cx - headH * 0.085, figTop + headH * 1.08);
  ctx.closePath();
  ctx.fill();

  // Tie body
  ctx.beginPath();
  ctx.moveTo(cx - headH * 0.085, figTop + headH * 1.08);
  ctx.lineTo(cx + headH * 0.085, figTop + headH * 1.08);
  ctx.bezierCurveTo(
    cx + headH * 0.075, figTop + headH * 2.3,
    cx + headH * 0.04, figTop + headH * 3.0,
    cx, figTop + headH * 3.4
  );
  ctx.bezierCurveTo(
    cx - headH * 0.04, figTop + headH * 3.0,
    cx - headH * 0.075, figTop + headH * 2.3,
    cx - headH * 0.085, figTop + headH * 1.08
  );
  ctx.closePath();
  ctx.fill();

  // Shirt collar V
  ctx.strokeStyle = "rgb(30,30,30)";
  ctx.lineWidth = headH * 0.014;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 1.3, figTop + headH * 0.94);
  ctx.lineTo(cx, figTop + headH * 1.14);
  ctx.lineTo(cx + neckW * 1.3, figTop + headH * 0.94);
  ctx.stroke();

  // Buttons
  ctx.fillStyle = "rgb(20,20,20)";
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(cx, figTop + headH * (1.9 + i * 0.45), headH * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pocket square hint
  ctx.fillStyle = "rgb(190,190,190)";
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW * 0.22, figTop + headH * 1.5);
  ctx.lineTo(cx - shoulderW * 0.16, figTop + headH * 1.46);
  ctx.lineTo(cx - shoulderW * 0.14, figTop + headH * 1.62);
  ctx.lineTo(cx - shoulderW * 0.2, figTop + headH * 1.66);
  ctx.closePath();
  ctx.fill();
}

function drawEyeMask(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  tick: number, blinkProgress: number
) {
  const cx = W / 2;
  const cy = H / 2;
  const eyeW = Math.min(W * 0.55, H * 1.2);
  const eyeH = eyeW * 0.35;
  const pupilBase = eyeW * 0.08;
  const pupilPulse = Math.sin(tick * 0.015) * eyeW * 0.025;
  const pupilR = pupilBase + pupilPulse;
  const irisR = eyeW * 0.17;

  const eased = blinkProgress < 0.5
    ? 2 * blinkProgress * blinkProgress
    : 1 - Math.pow(-2 * blinkProgress + 2, 2) / 2;
  const openAmount = 1 - eased;

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * openAmount, cx + eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy + eyeH * openAmount, cx - eyeW / 2, cy);
  ctx.closePath();

  if (openAmount < 0.03) {
    ctx.strokeStyle = "rgb(200, 200, 200)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - eyeW / 2, cy);
    ctx.lineTo(cx + eyeW / 2, cy);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.clip();

  // Sclera — white mask = dark void (characters won't render here)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - eyeW / 2 - 10, cy - eyeH - 10, eyeW + 20, eyeH * 2 + 20);

  // Iris — medium gray so characters show as edge glow
  ctx.fillStyle = "rgb(100, 100, 100)";
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Iris detail rings
  ctx.strokeStyle = "rgb(140, 140, 140)";
  ctx.lineWidth = 2;
  for (let r = irisR * 0.4; r < irisR; r += irisR * 0.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Iris radial fibers
  ctx.strokeStyle = "rgb(120, 120, 120)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + tick * 0.003;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * pupilR * 1.3, cy + Math.sin(angle) * pupilR * 1.3);
    ctx.lineTo(cx + Math.cos(angle) * irisR * 0.95, cy + Math.sin(angle) * irisR * 0.95);
    ctx.stroke();
  }

  // Pupil — white mask = dark void = the terminal space we zoom into
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  ctx.beginPath();
  ctx.arc(cx - pupilR * 0.6, cy - pupilR * 0.5, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Eye outline
  ctx.strokeStyle = "rgb(200, 200, 200)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * openAmount, cx + eyeW / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy + eyeH * openAmount, cx - eyeW / 2 + eyeW, cy);
  ctx.stroke();

  ctx.restore();
}

const MatrixAgents = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { alpha: false })!;

    const fontSize = Math.max(9, Math.min(13, Math.floor(W / 100)));
    const lineHeight = Math.ceil(fontSize * 1.2);
    const font = `${fontSize}px 'Fira Code', monospace`;

    type CharCell = { ch: string; x: number; y: number };
    let charCells: CharCell[] = [];
    const corpusChars = Array.from(FULL_CORPUS).filter(c => c.trim().length > 0);

    function rebuildLayout() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreen.width = W;
      offscreen.height = H;

      const prepared = prepareWithSegments(FULL_CORPUS, font);
      const result = layoutWithLines(prepared, W, lineHeight);
      const lines = result.lines;

      charCells = [];
      ctx.font = font;
      let yOff = 0;
      let li = 0;
      while (yOff < H + lineHeight) {
        const line = lines[li % lines.length];
        const graphemes = Array.from(line.text);
        let xPos = 0;
        for (const g of graphemes) {
          if (xPos < W + fontSize) {
            charCells.push({ ch: g, x: xPos, y: yOff });
          }
          xPos += ctx.measureText(g).width;
        }
        yOff += lineHeight;
        li++;
      }
    }

    rebuildLayout();
    window.addEventListener("resize", rebuildLayout);

    const pulsePhase = new Float32Array(charCells.length);
    for (let i = 0; i < pulsePhase.length; i++) {
      pulsePhase[i] = Math.random() * Math.PI * 2;
    }

    let tick = 0;
    let blinkTimer = 0;
    let blinkProgress = 0;
    let isBlinking = false;
    let nextBlinkAt = 180 + Math.random() * 200;
    let forcedBlink = false;

    let zoomBlinkTriggeredIn = false;
    let zoomBlinkTriggeredOut = false;

    const handleForcedBlink = () => {
      if (!isBlinking) {
        isBlinking = true;
        forcedBlink = true;
        blinkTimer = 0;
      }
    };
    window.addEventListener("eye-blink", handleForcedBlink);

    const draw = () => {
      tick++;

      // --- ZOOM ---
      const zoomInStart = (window as any).__matrixZoomStart as number | undefined;
      const zoomOutStart = (window as any).__matrixZoomOutStart as number | undefined;
      let rawZoom = 0;
      if (zoomOutStart) {
        rawZoom = Math.max(0, 1 - (Date.now() - zoomOutStart) / ZOOM_DURATION);
      } else if (zoomInStart) {
        rawZoom = Math.min(1, (Date.now() - zoomInStart) / ZOOM_DURATION);
      }

      // Trigger blink at crossover during zoom-in
      if (zoomInStart && !zoomOutStart && rawZoom > 0.3 && rawZoom < 0.5 && !zoomBlinkTriggeredIn) {
        zoomBlinkTriggeredIn = true;
        handleForcedBlink();
      }
      if (!zoomInStart) zoomBlinkTriggeredIn = false;

      // Trigger blink at start of zoom-out
      if (zoomOutStart && !zoomBlinkTriggeredOut) {
        zoomBlinkTriggeredOut = true;
        handleForcedBlink();
      }
      if (!zoomOutStart) zoomBlinkTriggeredOut = false;

      const zoom = cinematicEase(rawZoom);

      // --- BRIGHTNESS — boost when showing silhouette so negative space pops ---
      let brightness = 1;
      if (zoom < 0.3) {
        // Silhouette phase: brighter background
        brightness = 1.4;
      } else if (zoom > 0.25 && zoom < 0.75) {
        const t = (zoom - 0.25) / 0.5;
        const dip = Math.pow(Math.sin(t * Math.PI), 2);
        brightness = Math.max(0.5, 1.4 - dip * 0.9);
      }

      // --- BLINK ---
      blinkTimer++;
      if (!isBlinking && blinkTimer > nextBlinkAt) {
        isBlinking = true;
        forcedBlink = false;
        blinkTimer = 0;
      }
      if (isBlinking) {
        if (forcedBlink) {
          const closeFrames = 12;
          const holdFrames = 10;
          const openFrames = 14;
          if (blinkTimer < closeFrames) blinkProgress = blinkTimer / closeFrames;
          else if (blinkTimer < closeFrames + holdFrames) blinkProgress = 1;
          else if (blinkTimer < closeFrames + holdFrames + openFrames) blinkProgress = 1 - (blinkTimer - closeFrames - holdFrames) / openFrames;
          else {
            blinkProgress = 0;
            isBlinking = false;
            forcedBlink = false;
            blinkTimer = 0;
            nextBlinkAt = 180 + Math.random() * 300;
          }
        } else {
          if (blinkTimer < 8) blinkProgress = blinkTimer / 8;
          else if (blinkTimer < 12) blinkProgress = 1;
          else if (blinkTimer < 20) blinkProgress = 1 - (blinkTimer - 12) / 8;
          else {
            blinkProgress = 0;
            isBlinking = false;
            blinkTimer = 0;
            nextBlinkAt = 180 + Math.random() * 300;
          }
        }
      }

      // --- CLEAR ---
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // --- DRAW MASK ---
      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, W, H);

      const crossoverLow = 0.3;
      const crossoverHigh = 0.7;
      const isZoomingOut = !!zoomOutStart;
      const blinkFullyClosed = blinkProgress > 0.9;

      if (zoom <= crossoverLow) {
        // Pure silhouette
        const eyePos = getEyePosition(W, H);
        const maxScale = 14;
        const normalizedZoom = zoom / crossoverLow;
        const scale = 1 + cinematicEase(normalizedZoom) * (maxScale - 1);

        offCtx.save();
        offCtx.translate(W / 2, H / 2);
        offCtx.scale(scale, scale);
        offCtx.translate(-eyePos.x, -eyePos.y);
        drawSilhouetteMask(offCtx, W, H);
        offCtx.restore();
      } else if (zoom >= crossoverHigh) {
        // Pure eye
        drawEyeMask(offCtx, W, H, tick, blinkProgress);
      } else {
        // Blend zone
        const blendT = (zoom - crossoverLow) / (crossoverHigh - crossoverLow);
        const easedBlend = cinematicEase(blendT);

        let showSilhouetteAmount: number;
        let showEyeAmount: number;

        if (isZoomingOut) {
          // Don't show silhouette until blink is fully closed
          if (blinkFullyClosed) {
            showSilhouetteAmount = 1 - easedBlend;
            showEyeAmount = easedBlend;
          } else {
            showSilhouetteAmount = 0;
            showEyeAmount = 1;
          }
        } else {
          // Zoom in: use blink to mask transition
          const blinkMask = blinkProgress > 0.7 ? 1 : easedBlend;
          showSilhouetteAmount = 1 - blinkMask;
          showEyeAmount = blinkMask;
        }

        if (showSilhouetteAmount > 0.02) {
          const eyePos = getEyePosition(W, H);
          const maxScale = 14;
          offCtx.save();
          offCtx.globalAlpha = showSilhouetteAmount;
          offCtx.translate(W / 2, H / 2);
          offCtx.scale(maxScale, maxScale);
          offCtx.translate(-eyePos.x, -eyePos.y);
          drawSilhouetteMask(offCtx, W, H);
          offCtx.restore();
        }

        if (showEyeAmount > 0.02) {
          offCtx.save();
          offCtx.globalAlpha = showEyeAmount;
          drawEyeMask(offCtx, W, H, tick, blinkProgress);
          offCtx.restore();
        }
        offCtx.globalAlpha = 1;
      }

      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // --- BRAND TEXT: Iris IS the O, underline extends, "O M N I", enabled by lovable ---
      const brandText = (window as any).__brandText as { label: string; name: string; startTime?: number; enabledBy?: string } | null;
      if (brandText && zoom >= 0.95 && blinkProgress < 0.3) {
        const nameSize = Math.max(18, Math.floor(W * 0.04));
        const labelSize = Math.max(10, Math.floor(W * 0.012));
        const now = Date.now();
        const elapsed = brandText.startTime ? (now - brandText.startTime) / 1000 : 2;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#00FF41";

        const irisY = H / 2;
        const eyeW = Math.min(W * 0.55, H * 1.2);
        const irisR = eyeW * 0.17;
        const underlineY = irisY + irisR + nameSize * 0.5;

        // Step 1 (0-0.7s): Underline extends — THICKER
        const underlineProgress = Math.min(1, elapsed / 0.7);
        const easeOut = 1 - Math.pow(1 - underlineProgress, 3);
        const lineW = nameSize * 2.5 * easeOut;

        if (underlineProgress > 0) {
          ctx.strokeStyle = `rgba(0, 255, 65, ${0.8 * brightness * underlineProgress})`;
          ctx.lineWidth = Math.max(3, nameSize * 0.12); // THICKER underline
          ctx.shadowBlur = 14 * brightness;
          ctx.beginPath();
          ctx.moveTo(W / 2 - lineW / 2, underlineY);
          ctx.lineTo(W / 2 + lineW / 2, underlineY);
          ctx.stroke();
        }

        // Step 2 (0.6-1.1s): "O M N I" text fades in
        const textDelay = 0.6;
        const textAlpha = Math.min(1, Math.max(0, (elapsed - textDelay) / 0.5));
        if (textAlpha > 0) {
          ctx.font = `bold ${nameSize}px 'Fira Code', monospace`;
          ctx.shadowBlur = 18 * brightness;
          const textY = underlineY + nameSize * 0.8;
          ctx.fillStyle = `rgba(0, 255, 65, ${0.85 * brightness * textAlpha})`;
          ctx.fillText("O M N I", W / 2, textY);
        }

        // Step 3 (1.2-1.6s): "PRESENTED BY" above
        const labelDelay = 1.2;
        const labelAlpha = Math.min(1, Math.max(0, (elapsed - labelDelay) / 0.4));
        if (labelAlpha > 0) {
          ctx.font = `${labelSize}px 'Fira Code', monospace`;
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(0, 255, 65, ${0.45 * brightness * labelAlpha})`;
          ctx.fillText(brandText.label, W / 2, irisY - irisR - nameSize * 0.8);
        }

        // Step 4 (1.6-2.1s): "enabled by lovable" at bottom
        if (brandText.enabledBy) {
          const ebDelay = 1.6;
          const ebAlpha = Math.min(1, Math.max(0, (elapsed - ebDelay) / 0.5));
          if (ebAlpha > 0) {
            const ebSize = Math.max(9, Math.floor(W * 0.011));
            ctx.font = `${ebSize}px 'Fira Code', monospace`;
            ctx.shadowBlur = 8;
            ctx.fillStyle = `rgba(0, 255, 65, ${0.35 * brightness * ebAlpha})`;
            ctx.fillText(brandText.enabledBy, W / 2, underlineY + nameSize * 1.8);
          }
        }

        ctx.shadowBlur = 0;
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
      }

      // --- PRETEXT CHARS ---
      ctx.font = font;
      ctx.textBaseline = "top";

      for (let i = 0; i < charCells.length; i++) {
        const cell = charCells[i];
        if (!cell.ch || cell.ch === " ") continue;

        const sx = Math.min(W - 1, Math.max(0, Math.floor(cell.x + fontSize * 0.3)));
        const sy = Math.min(H - 1, Math.max(0, Math.floor(cell.y + lineHeight * 0.5)));
        const pi = (sy * W + sx) * 4;
        const mask = px[pi] || 0;

        if (mask > 160) continue;

        if (mask > 60) {
          const edgeFactor = (mask - 60) / 100;
          const edgeAlpha = (0.2 + edgeFactor * 0.6) * brightness;
          const ch = tick % 2 === 0
            ? corpusChars[Math.floor(Math.random() * corpusChars.length)]
            : cell.ch;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = (6 + edgeFactor * 14) * brightness;
          ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.75, edgeAlpha)})`;
          ctx.fillText(ch, cell.x, cell.y);
          ctx.shadowBlur = 0;
          continue;
        }

        pulsePhase[i] += 0.012;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;
        const wave = Math.sin(tick * 0.008 + cell.x * 0.003 + cell.y * 0.005) * 0.04;
        // Higher base alpha for brighter background — makes silhouette pop via negative space
        const alpha = (0.18 + pulse * 0.16 + wave) * brightness;

        let ch = cell.ch;
        if (tick % 10 === 0 && Math.random() > 0.97) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

        const glow = alpha > 0.22 * brightness ? 2.2 * brightness : 0;
        ctx.shadowColor = glow > 0 ? "#00FF41" : "transparent";
        ctx.shadowBlur = glow;
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.5, alpha)})`;
        ctx.fillText(ch, cell.x, cell.y);
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", rebuildLayout);
      window.removeEventListener("eye-blink", handleForcedBlink);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default MatrixAgents;
