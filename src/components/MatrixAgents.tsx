import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

declare global {
  interface Window {
    __matrixZoomStart?: number;
    __matrixZoomOutStart?: number;
    __brandText?: { label: string; name: string } | null;
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
const ZOOM_DURATION = 4000;

function getEyePosition(W: number, H: number) {
  const figH = Math.min(H * 0.82, W * 1.1);
  const figTop = (H - figH) / 2 - figH * 0.02;
  // Eyes at ~head center, roughly 1/8 down from top
  const headH = figH / 7.5;
  const eyeY = figTop + headH * 0.55;
  const eyeSpacing = headH * 0.22;
  return { x: W / 2 - eyeSpacing, y: eyeY };
}

/**
 * Attempt a steep S-curve with long plateau — Apple fluid transition inspired
 */
function cinematicEase(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Attempt steep S with lingering middle
  const t2 = t * t;
  const t3 = t2 * t;
  return 6 * t3 * t2 - 15 * t2 * t2 + 10 * t3;
}

/**
 * Draw a realistic James Bond-style agent silhouette using smooth bezier curves.
 * Based on ~7.5 head proportions. The silhouette is white on black — 
 * pretext characters show through the BLACK (negative space) areas.
 * The white shape IS the figure.
 */
function drawSilhouetteMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2;
  // Figure height fills most of the canvas
  const figH = Math.min(H * 0.82, W * 1.1);
  const figTop = (H - figH) / 2 - figH * 0.02;
  const headH = figH / 7.5;
  const headW = headH * 0.72;
  const shoulderW = headH * 2.1;
  const neckW = headH * 0.32;

  ctx.fillStyle = "#fff";

  // ── FULL BODY SILHOUETTE as single continuous path ──
  ctx.beginPath();

  // Start from bottom-left (off-screen)
  const bodyBottom = figTop + figH + 20;
  const hipW = shoulderW * 0.7;

  // Left side of body, going up
  ctx.moveTo(cx - hipW, bodyBottom);

  // Left arm/side
  ctx.lineTo(cx - shoulderW * 0.9, bodyBottom);

  // Left forearm up to shoulder
  ctx.bezierCurveTo(
    cx - shoulderW * 0.95, figTop + figH * 0.55,
    cx - shoulderW * 1.0, figTop + figH * 0.38,
    cx - shoulderW, figTop + headH * 1.65
  );

  // Left shoulder up (squared, powerful — Bond style)
  ctx.bezierCurveTo(
    cx - shoulderW * 0.98, figTop + headH * 1.45,
    cx - shoulderW * 0.85, figTop + headH * 1.25,
    cx - shoulderW * 0.65, figTop + headH * 1.18
  );

  // Left shoulder to neck
  ctx.bezierCurveTo(
    cx - shoulderW * 0.35, figTop + headH * 1.1,
    cx - neckW * 1.2, figTop + headH * 1.08,
    cx - neckW, figTop + headH * 0.95
  );

  // Left side of neck up to jaw
  ctx.bezierCurveTo(
    cx - neckW, figTop + headH * 0.85,
    cx - headW * 0.85, figTop + headH * 0.82,
    cx - headW * 0.9, figTop + headH * 0.7
  );

  // Left jaw line
  ctx.bezierCurveTo(
    cx - headW * 0.95, figTop + headH * 0.55,
    cx - headW, figTop + headH * 0.4,
    cx - headW * 0.85, figTop + headH * 0.2
  );

  // Left side of hat brim
  const brimW = headW * 1.8;
  const hatBrimY = figTop + headH * 0.18;
  ctx.lineTo(cx - brimW, hatBrimY + headH * 0.04);

  // Hat brim left edge (slightly drooping)
  ctx.bezierCurveTo(
    cx - brimW * 1.05, hatBrimY,
    cx - brimW * 1.08, hatBrimY - headH * 0.02,
    cx - brimW, hatBrimY - headH * 0.04
  );

  // Brim top left to crown
  ctx.lineTo(cx - headW * 0.72, figTop + headH * 0.12);

  // Left side of crown
  ctx.bezierCurveTo(
    cx - headW * 0.68, figTop - headH * 0.02,
    cx - headW * 0.5, figTop - headH * 0.1,
    cx - headW * 0.2, figTop - headH * 0.12
  );

  // Crown dent (pinch)
  ctx.bezierCurveTo(
    cx - headW * 0.1, figTop - headH * 0.08,
    cx, figTop - headH * 0.06,
    cx + headW * 0.1, figTop - headH * 0.08
  );

  // Right side of crown (slight asymmetry for character)
  ctx.bezierCurveTo(
    cx + headW * 0.2, figTop - headH * 0.12,
    cx + headW * 0.5, figTop - headH * 0.1,
    cx + headW * 0.7, figTop - headH * 0.01
  );

  // Right crown to brim
  ctx.lineTo(cx + headW * 0.72, figTop + headH * 0.12);
  ctx.lineTo(cx + brimW, hatBrimY - headH * 0.03);

  // Right brim edge
  ctx.bezierCurveTo(
    cx + brimW * 1.08, hatBrimY - headH * 0.01,
    cx + brimW * 1.05, hatBrimY + headH * 0.02,
    cx + brimW, hatBrimY + headH * 0.05
  );

  // Right brim to face
  ctx.lineTo(cx + headW * 0.85, figTop + headH * 0.2);

  // Right side of face
  ctx.bezierCurveTo(
    cx + headW, figTop + headH * 0.4,
    cx + headW * 0.95, figTop + headH * 0.55,
    cx + headW * 0.9, figTop + headH * 0.7
  );

  // Right jaw
  ctx.bezierCurveTo(
    cx + headW * 0.85, figTop + headH * 0.82,
    cx + neckW, figTop + headH * 0.85,
    cx + neckW, figTop + headH * 0.95
  );

  // Right neck to shoulder
  ctx.bezierCurveTo(
    cx + neckW * 1.2, figTop + headH * 1.08,
    cx + shoulderW * 0.35, figTop + headH * 1.1,
    cx + shoulderW * 0.65, figTop + headH * 1.18
  );

  // Right shoulder
  ctx.bezierCurveTo(
    cx + shoulderW * 0.85, figTop + headH * 1.25,
    cx + shoulderW * 0.98, figTop + headH * 1.45,
    cx + shoulderW, figTop + headH * 1.65
  );

  // Right arm down
  ctx.bezierCurveTo(
    cx + shoulderW * 1.0, figTop + figH * 0.38,
    cx + shoulderW * 0.95, figTop + figH * 0.55,
    cx + shoulderW * 0.9, bodyBottom
  );

  // Bottom right to bottom left
  ctx.lineTo(cx + hipW, bodyBottom);

  ctx.closePath();
  ctx.fill();

  // ── SUNGLASSES (cut out as dark voids in the white face) ──
  ctx.fillStyle = "rgb(15,15,15)";
  const glassY = figTop + headH * 0.42;
  const glassW = headW * 0.48;
  const glassH = headH * 0.14;
  const glassSpacing = headW * 0.08;

  // Left lens (rounded trapezoid — aviator)
  ctx.beginPath();
  ctx.moveTo(cx - glassSpacing - glassW, glassY - glassH * 0.3);
  ctx.bezierCurveTo(
    cx - glassSpacing - glassW * 0.9, glassY - glassH * 0.8,
    cx - glassSpacing - glassW * 0.1, glassY - glassH * 0.9,
    cx - glassSpacing, glassY - glassH * 0.4
  );
  ctx.bezierCurveTo(
    cx - glassSpacing, glassY + glassH * 0.6,
    cx - glassSpacing - glassW * 0.3, glassY + glassH,
    cx - glassSpacing - glassW * 0.6, glassY + glassH * 0.9
  );
  ctx.bezierCurveTo(
    cx - glassSpacing - glassW * 0.9, glassY + glassH * 0.7,
    cx - glassSpacing - glassW * 1.05, glassY + glassH * 0.2,
    cx - glassSpacing - glassW, glassY - glassH * 0.3
  );
  ctx.closePath();
  ctx.fill();

  // Right lens (mirror)
  ctx.beginPath();
  ctx.moveTo(cx + glassSpacing + glassW, glassY - glassH * 0.3);
  ctx.bezierCurveTo(
    cx + glassSpacing + glassW * 0.9, glassY - glassH * 0.8,
    cx + glassSpacing + glassW * 0.1, glassY - glassH * 0.9,
    cx + glassSpacing, glassY - glassH * 0.4
  );
  ctx.bezierCurveTo(
    cx + glassSpacing, glassY + glassH * 0.6,
    cx + glassSpacing + glassW * 0.3, glassY + glassH,
    cx + glassSpacing + glassW * 0.6, glassY + glassH * 0.9
  );
  ctx.bezierCurveTo(
    cx + glassSpacing + glassW * 0.9, glassY + glassH * 0.7,
    cx + glassSpacing + glassW * 1.05, glassY + glassH * 0.2,
    cx + glassSpacing + glassW, glassY - glassH * 0.3
  );
  ctx.closePath();
  ctx.fill();

  // Bridge between lenses
  ctx.strokeStyle = "rgb(15,15,15)";
  ctx.lineWidth = headH * 0.018;
  ctx.beginPath();
  ctx.moveTo(cx - glassSpacing, glassY - glassH * 0.2);
  ctx.bezierCurveTo(cx - glassSpacing * 0.4, glassY - glassH * 0.5, cx + glassSpacing * 0.4, glassY - glassH * 0.5, cx + glassSpacing, glassY - glassH * 0.2);
  ctx.stroke();

  // ── SUIT DETAILS (carved into the white shape) ──
  ctx.fillStyle = "#fff";

  // Lapel lines (dark lines over white suit)
  ctx.strokeStyle = "rgb(30,30,30)";
  ctx.lineWidth = headH * 0.02;

  // Left lapel
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 0.8, figTop + headH * 1.0);
  ctx.bezierCurveTo(
    cx - shoulderW * 0.2, figTop + headH * 1.2,
    cx - shoulderW * 0.3, figTop + headH * 2.0,
    cx - shoulderW * 0.35, figTop + headH * 2.8
  );
  ctx.stroke();

  // Right lapel
  ctx.beginPath();
  ctx.moveTo(cx + neckW * 0.8, figTop + headH * 1.0);
  ctx.bezierCurveTo(
    cx + shoulderW * 0.2, figTop + headH * 1.2,
    cx + shoulderW * 0.3, figTop + headH * 2.0,
    cx + shoulderW * 0.35, figTop + headH * 2.8
  );
  ctx.stroke();

  // Lapel notches
  ctx.lineWidth = headH * 0.015;
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW * 0.22, figTop + headH * 1.25);
  ctx.lineTo(cx - shoulderW * 0.35, figTop + headH * 1.15);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + shoulderW * 0.22, figTop + headH * 1.25);
  ctx.lineTo(cx + shoulderW * 0.35, figTop + headH * 1.15);
  ctx.stroke();

  // Tie (dark void down center)
  ctx.fillStyle = "rgb(25,25,25)";
  ctx.beginPath();
  // Knot
  ctx.moveTo(cx - headH * 0.06, figTop + headH * 0.98);
  ctx.lineTo(cx + headH * 0.06, figTop + headH * 0.98);
  ctx.lineTo(cx + headH * 0.08, figTop + headH * 1.12);
  ctx.lineTo(cx - headH * 0.08, figTop + headH * 1.12);
  ctx.closePath();
  ctx.fill();

  // Tie body
  ctx.beginPath();
  ctx.moveTo(cx - headH * 0.08, figTop + headH * 1.12);
  ctx.lineTo(cx + headH * 0.08, figTop + headH * 1.12);
  ctx.bezierCurveTo(
    cx + headH * 0.07, figTop + headH * 2.5,
    cx + headH * 0.03, figTop + headH * 3.2,
    cx, figTop + headH * 3.5
  );
  ctx.bezierCurveTo(
    cx - headH * 0.03, figTop + headH * 3.2,
    cx - headH * 0.07, figTop + headH * 2.5,
    cx - headH * 0.08, figTop + headH * 1.12
  );
  ctx.closePath();
  ctx.fill();

  // Shirt collar V (slightly lighter than suit)
  ctx.strokeStyle = "rgb(50,50,50)";
  ctx.lineWidth = headH * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 1.3, figTop + headH * 1.0);
  ctx.lineTo(cx, figTop + headH * 1.18);
  ctx.lineTo(cx + neckW * 1.3, figTop + headH * 1.0);
  ctx.stroke();

  // Buttons
  ctx.fillStyle = "rgb(40,40,40)";
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(cx, figTop + headH * (2.0 + i * 0.5), headH * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pocket square hint
  ctx.fillStyle = "rgb(200,200,200)";
  ctx.beginPath();
  ctx.moveTo(cx - shoulderW * 0.28, figTop + headH * 1.6);
  ctx.lineTo(cx - shoulderW * 0.2, figTop + headH * 1.55);
  ctx.lineTo(cx - shoulderW * 0.18, figTop + headH * 1.72);
  ctx.lineTo(cx - shoulderW * 0.26, figTop + headH * 1.75);
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

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - eyeW / 2 - 10, cy - eyeH - 10, eyeW + 20, eyeH * 2 + 20);

  ctx.fillStyle = "rgb(100, 100, 100)";
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgb(140, 140, 140)";
  ctx.lineWidth = 2;
  for (let r = irisR * 0.4; r < irisR; r += irisR * 0.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgb(120, 120, 120)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + tick * 0.003;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * pupilR * 1.3, cy + Math.sin(angle) * pupilR * 1.3);
    ctx.lineTo(cx + Math.cos(angle) * irisR * 0.95, cy + Math.sin(angle) * irisR * 0.95);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx - pupilR * 0.6, cy - pupilR * 0.5, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

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

    // Track zoom-triggered blinks
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

      // --- ZOOM (cinematic easing for fluid transitions) ---
      const zoomInStart = (window as any).__matrixZoomStart as number | undefined;
      const zoomOutStart = (window as any).__matrixZoomOutStart as number | undefined;
      let rawZoom = 0;
      if (zoomOutStart) {
        rawZoom = Math.max(0, 1 - (Date.now() - zoomOutStart) / ZOOM_DURATION);
      } else if (zoomInStart) {
        rawZoom = Math.min(1, (Date.now() - zoomInStart) / ZOOM_DURATION);
      }

      // Trigger a blink at crossover point during zoom-in
      if (zoomInStart && !zoomOutStart && rawZoom > 0.35 && rawZoom < 0.55 && !zoomBlinkTriggeredIn) {
        zoomBlinkTriggeredIn = true;
        handleForcedBlink();
      }
      // Reset trigger when not zooming in
      if (!zoomInStart) zoomBlinkTriggeredIn = false;

      // Trigger a blink at the start of zoom-out (masks the transition)
      if (zoomOutStart && !zoomBlinkTriggeredOut) {
        zoomBlinkTriggeredOut = true;
        handleForcedBlink();
      }
      if (!zoomOutStart) zoomBlinkTriggeredOut = false;

      // Apply cinematic easing
      const zoom = cinematicEase(rawZoom);

      // --- BRIGHTNESS DEPTH ---
      let brightness = 1;
      if (rawZoom > 0.2 && rawZoom < 0.8) {
        const t = (rawZoom - 0.2) / 0.6;
        const dip = Math.pow(Math.sin(t * Math.PI), 2);
        brightness = Math.max(0.4, 1 - dip * 0.6);
      }
      const edgeBoost = zoom >= 0.95 ? 1.12 : 1;

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

      // Crossover: blend between silhouette and eye
      // Use blink to mask the transition — when blinking, we swap instantly
      const crossoverLow = 0.35;
      const crossoverHigh = 0.65;

      if (zoom <= crossoverLow) {
        // Pure silhouette — zoom toward left eye
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
        // Blend zone — use blink progress to mask transition
        const blendT = (zoom - crossoverLow) / (crossoverHigh - crossoverLow);
        const easedBlend = cinematicEase(blendT);

        // If eye is mostly closed during blink, lean heavily toward eye
        const blinkMask = blinkProgress > 0.7 ? 1 : easedBlend;

        if (blinkMask < 0.95) {
          // Still showing silhouette
          const eyePos = getEyePosition(W, H);
          const maxScale = 14;
          offCtx.save();
          offCtx.globalAlpha = 1 - blinkMask;
          offCtx.translate(W / 2, H / 2);
          offCtx.scale(maxScale, maxScale);
          offCtx.translate(-eyePos.x, -eyePos.y);
          drawSilhouetteMask(offCtx, W, H);
          offCtx.restore();
        }

        if (blinkMask > 0.05) {
          offCtx.save();
          offCtx.globalAlpha = blinkMask;
          drawEyeMask(offCtx, W, H, tick, blinkProgress);
          offCtx.restore();
        }
        offCtx.globalAlpha = 1;
      }

      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // --- BRAND TEXT ---
      const brandText = (window as any).__brandText as { label: string; name: string } | null;
      if (brandText && zoom >= 0.95 && blinkProgress < 0.3) {
        const labelSize = Math.max(10, Math.floor(W * 0.012));
        const nameSize = Math.max(18, Math.floor(W * 0.04));

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = `${labelSize}px 'Fira Code', monospace`;
        ctx.fillStyle = `rgba(0, 255, 65, ${0.4 * brightness})`;
        ctx.fillText(brandText.label, W / 2, H / 2 - nameSize * 0.9);

        ctx.font = `bold ${nameSize}px 'Fira Code', monospace`;
        ctx.shadowColor = "#00FF41";
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(0, 255, 65, ${0.85 * brightness})`;
        ctx.fillText(brandText.name, W / 2, H / 2);
        ctx.shadowBlur = 0;

        ctx.strokeStyle = `rgba(0, 255, 65, ${0.2 * brightness})`;
        ctx.lineWidth = 1;
        const lineW = nameSize * 3;
        ctx.beginPath();
        ctx.moveTo(W / 2 - lineW / 2, H / 2 + nameSize * 0.7);
        ctx.lineTo(W / 2 + lineW / 2, H / 2 + nameSize * 0.7);
        ctx.stroke();

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
          const edgeAlpha = (0.15 + edgeFactor * 0.55) * brightness * edgeBoost;
          const ch = tick % 2 === 0
            ? corpusChars[Math.floor(Math.random() * corpusChars.length)]
            : cell.ch;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = (5 + edgeFactor * 12) * brightness * edgeBoost;
          ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.7, edgeAlpha)})`;
          ctx.fillText(ch, cell.x, cell.y);
          ctx.shadowBlur = 0;
          continue;
        }

        pulsePhase[i] += 0.012;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;
        const wave = Math.sin(tick * 0.008 + cell.x * 0.003 + cell.y * 0.005) * 0.04;
        const alpha = (0.12 + pulse * 0.14 + wave) * brightness;

        let ch = cell.ch;
        if (tick % 10 === 0 && Math.random() > 0.97) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

        const glow = alpha > 0.2 * brightness ? 1.8 * brightness : 0;
        ctx.shadowColor = glow > 0 ? "#00FF41" : "transparent";
        ctx.shadowBlur = glow;
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.45, alpha)})`;
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
