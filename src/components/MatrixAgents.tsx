import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

declare global {
  interface Window {
    __matrixZoomStart?: number;
    __matrixZoomOutStart?: number;
    __matrixPupilZoomStart?: number;
    __matrixPupilZoomOutStart?: number;
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
const PUPIL_ZOOM_DURATION = 2000;

function getEyePosition(W: number, H: number) {
  const figH = Math.min(H * 0.78, W * 1.0);
  const figTop = (H - figH) / 2 - figH * 0.02;
  const headH = figH / 7.5;
  const headW = headH * 0.82;
  const cx = W / 2;
  // Center on the LEFT lens of the sunglasses
  const glassSpacing = headW * 0.05;
  const glassW = headW * 0.52;
  const eyeX = cx - glassSpacing - glassW / 2;
  const eyeY = figTop + headH * 0.36; // Glasses Y position
  return { x: eyeX, y: eyeY };
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
 * - Slim build, sunglasses, fedora with TALL dome
 * - Glasses and tie render as BRIGHT green (edge glow range)
 * - Figure drawing 7.5-head Loomis proportions
 */
function drawSilhouetteMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2;
  const figH = Math.min(H * 0.78, W * 1.0);
  const figTop = (H - figH) / 2 - figH * 0.02;
  const headH = figH / 7.5;
  const headW = headH * 0.82;
  const shoulderW = headH * 1.45;
  const neckW = headH * 0.26;

  ctx.fillStyle = "#fff";

  // ── FULL BODY as single path ──
  ctx.beginPath();
  const bodyBottom = figTop + figH + 20;

  ctx.moveTo(cx - shoulderW * 0.55, bodyBottom);
  ctx.lineTo(cx - shoulderW * 0.75, bodyBottom);

  // Left arm
  ctx.bezierCurveTo(
    cx - shoulderW * 0.78, figTop + figH * 0.5,
    cx - shoulderW * 0.82, figTop + figH * 0.35,
    cx - shoulderW * 0.88, figTop + headH * 1.7
  );

  // Left shoulder
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

  // HIGH COAT COLLAR
  ctx.bezierCurveTo(
    cx - neckW * 1.1, figTop + headH * 0.80,
    cx - headW * 0.7, figTop + headH * 0.75,
    cx - headW * 0.78, figTop + headH * 0.62
  );

  // Left jaw
  ctx.bezierCurveTo(
    cx - headW * 0.88, figTop + headH * 0.48,
    cx - headW * 0.92, figTop + headH * 0.32,
    cx - headW * 0.78, figTop + headH * 0.15
  );

  // FEDORA — moderate brim, TALLER dome
  const brimW = headW * 1.5;
  const hatBrimY = figTop + headH * 0.13;
  ctx.lineTo(cx - brimW, hatBrimY + headH * 0.02);

  ctx.bezierCurveTo(
    cx - brimW * 1.03, hatBrimY,
    cx - brimW * 1.04, hatBrimY - headH * 0.015,
    cx - brimW * 1.0, hatBrimY - headH * 0.025
  );

  // Brim top to crown — TALLER dome (increased negative offset)
  ctx.lineTo(cx - headW * 0.65, figTop + headH * 0.04);

  // ROUNDED CROWN — significantly taller
  ctx.bezierCurveTo(
    cx - headW * 0.58, figTop - headH * 0.14,
    cx - headW * 0.38, figTop - headH * 0.32,
    cx - headW * 0.08, figTop - headH * 0.36
  );

  ctx.bezierCurveTo(
    cx, figTop - headH * 0.38,
    cx + headW * 0.08, figTop - headH * 0.36,
    cx + headW * 0.08, figTop - headH * 0.36
  );

  ctx.bezierCurveTo(
    cx + headW * 0.38, figTop - headH * 0.32,
    cx + headW * 0.58, figTop - headH * 0.14,
    cx + headW * 0.65, figTop + headH * 0.04
  );

  // Right brim
  ctx.lineTo(cx + brimW * 1.0, hatBrimY - headH * 0.025);
  ctx.bezierCurveTo(
    cx + brimW * 1.04, hatBrimY - headH * 0.015,
    cx + brimW * 1.03, hatBrimY,
    cx + brimW, hatBrimY + headH * 0.02
  );

  ctx.lineTo(cx + headW * 0.78, figTop + headH * 0.15);

  // Right jaw
  ctx.bezierCurveTo(
    cx + headW * 0.92, figTop + headH * 0.32,
    cx + headW * 0.88, figTop + headH * 0.48,
    cx + headW * 0.78, figTop + headH * 0.62
  );

  // Right collar
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

  // Right arm
  ctx.bezierCurveTo(
    cx + shoulderW * 0.82, figTop + figH * 0.35,
    cx + shoulderW * 0.78, figTop + figH * 0.5,
    cx + shoulderW * 0.75, bodyBottom
  );

  ctx.lineTo(cx + shoulderW * 0.55, bodyBottom);
  ctx.closePath();
  ctx.fill();

  // ── RIM LIGHT for depth — bright edge glow on left side (directional lighting) ──
  ctx.strokeStyle = "rgb(100, 100, 100)";
  ctx.lineWidth = headH * 0.04;
  // Left arm/shoulder edge highlight
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW * 0.88, figTop + headH * 1.7);
  ctx.bezierCurveTo(
    cx - shoulderW * 0.82, figTop + figH * 0.35,
    cx - shoulderW * 0.78, figTop + figH * 0.5,
    cx - shoulderW * 0.75, bodyBottom
  );
  ctx.stroke();
  // Left hat brim edge
  ctx.lineWidth = headH * 0.03;
  ctx.beginPath();
  ctx.moveTo(cx - brimW, hatBrimY + headH * 0.02);
  ctx.lineTo(cx - headW * 0.78, figTop + headH * 0.15);
  ctx.stroke();

  // rgb(140) → edgeFactor 0.8 = very bright glowing green chars
  ctx.fillStyle = "rgb(140, 140, 140)";
  const glassY = figTop + headH * 0.36;
  const glassW = headW * 0.52;
  const glassH = headH * 0.16;
  const glassSpacing = headW * 0.05;

  // Left lens
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

  // Right lens
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

  // Bridge
  ctx.strokeStyle = "rgb(140, 140, 140)";
  ctx.lineWidth = headH * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx - glassSpacing, glassY - glassH * 0.3);
  ctx.bezierCurveTo(
    cx - glassSpacing * 0.3, glassY - glassH * 0.6,
    cx + glassSpacing * 0.3, glassY - glassH * 0.6,
    cx + glassSpacing, glassY - glassH * 0.3
  );
  ctx.stroke();

  // ── SUIT DETAILS — subtle depth lines ──
  // Lapels slightly brighter than body for depth
  ctx.strokeStyle = "rgb(40,40,40)";

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

  // TIE — BRIGHT edge glow (higher gray = brighter green glow)
  ctx.fillStyle = "rgb(130, 130, 130)";
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

  // Shirt collar V — subtle depth
  ctx.strokeStyle = "rgb(50,50,50)";
  ctx.lineWidth = headH * 0.018;
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

  // Pocket square — bright edge glow
  ctx.fillStyle = "rgb(150, 150, 150)";
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

  // Sclera — white = dark void
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - eyeW / 2 - 10, cy - eyeH - 10, eyeW + 20, eyeH * 2 + 20);

  // Iris — gray for edge glow
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

  // Pupil — white = dark void = the terminal space
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
    let outroBlinkCompleted = false;

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

      // --- ZOOM (silhouette ↔ eye) ---
      const zoomInStart = window.__matrixZoomStart;
      const zoomOutStart = window.__matrixZoomOutStart;
      let rawZoom = 0;
      if (zoomOutStart) {
        rawZoom = Math.max(0, 1 - (Date.now() - zoomOutStart) / ZOOM_DURATION);
      } else if (zoomInStart) {
        rawZoom = Math.min(1, (Date.now() - zoomInStart) / ZOOM_DURATION);
      }

      // --- PUPIL ZOOM (eye ↔ inside pupil/terminal) ---
      const pupilZoomInStart = window.__matrixPupilZoomStart;
      const pupilZoomOutStart = window.__matrixPupilZoomOutStart;
      let rawPupilZoom = 0;
      if (pupilZoomOutStart) {
        rawPupilZoom = Math.max(0, 1 - (Date.now() - pupilZoomOutStart) / PUPIL_ZOOM_DURATION);
      } else if (pupilZoomInStart) {
        rawPupilZoom = Math.min(1, (Date.now() - pupilZoomInStart) / PUPIL_ZOOM_DURATION);
      }
      const pupilZoom = cinematicEase(rawPupilZoom);

      // Trigger blink at crossover during zoom-in
      if (zoomInStart && !zoomOutStart && rawZoom > 0.3 && rawZoom < 0.5 && !zoomBlinkTriggeredIn) {
        zoomBlinkTriggeredIn = true;
        handleForcedBlink();
      }
      if (!zoomInStart) zoomBlinkTriggeredIn = false;

      // Track when outro blink completes
      if (zoomOutStart && !zoomBlinkTriggeredOut) {
        zoomBlinkTriggeredOut = true;
        outroBlinkCompleted = false;
      }
      if (!zoomOutStart) {
        zoomBlinkTriggeredOut = false;
        outroBlinkCompleted = false;
      }

      const zoom = cinematicEase(Math.min(1, rawZoom));

      // --- BRIGHTNESS ---
      let brightness = 1;
      if (zoom < 0.3) {
        brightness = 1.8; // Brighter background for silhouette to make negative space pop
      } else if (zoom > 0.25 && zoom < 0.75) {
        const t = (zoom - 0.25) / 0.5;
        const dip = Math.pow(Math.sin(t * Math.PI), 2);
        brightness = Math.max(0.6, 1.8 - dip * 1.2);
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
            if (zoomOutStart) outroBlinkCompleted = true;
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

      // If pupil zoom is active and we're at the eye phase, scale the eye mask
      if (pupilZoom > 0.01 && zoom >= crossoverHigh) {
        const pupilScale = 1 + pupilZoom * 18;
        offCtx.save();
        offCtx.translate(W / 2, H / 2);
        offCtx.scale(pupilScale, pupilScale);
        offCtx.translate(-W / 2, -H / 2);
        drawEyeMask(offCtx, W, H, tick, blinkProgress);
        offCtx.restore();
      } else if (zoom <= crossoverLow) {
        // Pure silhouette — but during zoom-out, only show after blink completed
        if (isZoomingOut && !outroBlinkCompleted) {
          // Don't draw silhouette yet — keep screen dark
        } else {
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
        }
      } else if (zoom >= crossoverHigh) {
        // Pure eye (no pupil zoom)
        drawEyeMask(offCtx, W, H, tick, blinkProgress);
      } else {
        // Blend zone
        const blendT = (zoom - crossoverLow) / (crossoverHigh - crossoverLow);
        const easedBlend = cinematicEase(blendT);

        let showSilhouetteAmount: number;
        let showEyeAmount: number;

        if (isZoomingOut) {
          if (outroBlinkCompleted) {
            showSilhouetteAmount = 1 - easedBlend;
            showEyeAmount = easedBlend;
          } else {
            showSilhouetteAmount = 0;
            showEyeAmount = 1;
          }
        } else {
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

      // --- BRAND TEXT ---
      const brandText = window.__brandText;
      if (brandText && zoom >= 0.95 && pupilZoom < 0.3 && blinkProgress < 0.3) {
        const nameSize = Math.max(22, Math.floor(W * 0.05));
        const labelSize = Math.max(13, Math.floor(W * 0.02));
        const now = Date.now();
        const elapsed = brandText.startTime ? (now - brandText.startTime) / 1000 : 2;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#00FF41";

        const irisY = H / 2;
        const eyeW = Math.min(W * 0.55, H * 1.2);
        const irisR = eyeW * 0.17;
        const underlineY = irisY + irisR + nameSize * 0.5;

        // Step 1 (0-0.7s): Underline extends — THICK
        const underlineProgress = Math.min(1, elapsed / 0.7);
        const easeOut = 1 - Math.pow(1 - underlineProgress, 3);
        const lineW = nameSize * 2.5 * easeOut;

        if (underlineProgress > 0) {
          ctx.strokeStyle = `rgba(0, 255, 65, ${0.9 * brightness * underlineProgress})`;
          ctx.lineWidth = Math.max(5, nameSize * 0.16);
          ctx.shadowBlur = 18 * brightness;
          ctx.beginPath();
          ctx.moveTo(W / 2 - lineW / 2, underlineY);
          ctx.lineTo(W / 2 + lineW / 2, underlineY);
          ctx.stroke();
        }

        // Step 2 (0.6-1.1s): "O M N I"
        const textDelay = 0.6;
        const textAlpha = Math.min(1, Math.max(0, (elapsed - textDelay) / 0.5));
        if (textAlpha > 0) {
          ctx.font = `bold ${nameSize}px 'Fira Code', monospace`;
          ctx.shadowBlur = 22 * brightness;
          const textY = underlineY + nameSize * 0.8;
          ctx.fillStyle = `rgba(0, 255, 65, ${0.9 * brightness * textAlpha})`;
          ctx.fillText("O M N I", W / 2, textY);
        }

        // Step 3 (1.2-1.6s): "PRESENTED BY" — larger and more visible
        const labelDelay = 1.2;
        const labelAlpha = Math.min(1, Math.max(0, (elapsed - labelDelay) / 0.4));
        if (labelAlpha > 0) {
          ctx.font = `bold ${labelSize}px 'Fira Code', monospace`;
          ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(0, 255, 65, ${0.7 * brightness * labelAlpha})`;
          ctx.fillText(brandText.label, W / 2, irisY - irisR - nameSize * 0.8);
        }

        // Step 4 (1.8-2.3s): "enabled by lovable" — VISIBLE
        if (brandText.enabledBy) {
          const ebDelay = 1.8;
          const ebAlpha = Math.min(1, Math.max(0, (elapsed - ebDelay) / 0.5));
          if (ebAlpha > 0) {
            const ebSize = Math.max(12, Math.floor(W * 0.018));
            ctx.font = `${ebSize}px 'Fira Code', monospace`;
            ctx.shadowBlur = 12;
            ctx.fillStyle = `rgba(0, 255, 65, ${0.55 * brightness * ebAlpha})`;
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
          const edgeAlpha = (0.25 + edgeFactor * 0.65) * brightness;
          const ch = tick % 2 === 0
            ? corpusChars[Math.floor(Math.random() * corpusChars.length)]
            : cell.ch;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = (8 + edgeFactor * 16) * brightness;
          ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.85, edgeAlpha)})`;
          ctx.fillText(ch, cell.x, cell.y);
          ctx.shadowBlur = 0;
          continue;
        }

        pulsePhase[i] += 0.012;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;
        const wave = Math.sin(tick * 0.008 + cell.x * 0.003 + cell.y * 0.005) * 0.04;
        // Higher base alpha for brighter background — makes silhouette negative space pop
        const alpha = (0.28 + pulse * 0.2 + wave) * brightness;

        let ch = cell.ch;
        if (tick % 10 === 0 && Math.random() > 0.97) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

        const glow = alpha > 0.25 * brightness ? 2.5 * brightness : 0;
        ctx.shadowColor = glow > 0 ? "#00FF41" : "transparent";
        ctx.shadowBlur = glow;
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.55, alpha)})`;
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
