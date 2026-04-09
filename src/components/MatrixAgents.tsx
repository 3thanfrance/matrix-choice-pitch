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
const ZOOM_DURATION = 3500;

function getEyePosition(W: number, H: number) {
  const figH = Math.min(H * 0.75, W * 0.95);
  const figTop = (H - figH) / 2 - figH * 0.05;
  const eyeY = figTop + figH * 0.24;
  const eyeSpacing = figH * 0.07;
  return { x: W / 2 - eyeSpacing, y: eyeY };
}

/**
 * Cinematic easing — fast start, slow through middle, fast end
 * Inspired by Apple fluid transitions: continuous, responsive feel
 */
function cinematicEase(t: number): number {
  // Custom bezier-like: ease-in-out with a lingering mid-section
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Attempt a steep S-curve with a plateau in the middle
  // Using smootherstep (Ken Perlin) for extra smoothness
  const t2 = t * t;
  const t3 = t2 * t;
  return 6 * t3 * t2 - 15 * t2 * t2 + 10 * t3;
}

function drawSilhouetteMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2;
  const figH = Math.min(H * 0.75, W * 0.95);
  const figTop = (H - figH) / 2 - figH * 0.05;

  ctx.fillStyle = "#fff";

  // --- FEDORA HAT (dramatic, wide brim like noir detective) ---
  // Crown (tall, slightly tapered)
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.14, figTop + figH * 0.14);
  ctx.lineTo(cx - figH * 0.12, figTop + figH * 0.03);
  ctx.quadraticCurveTo(cx - figH * 0.06, figTop - figH * 0.01, cx, figTop - figH * 0.005);
  ctx.quadraticCurveTo(cx + figH * 0.06, figTop - figH * 0.01, cx + figH * 0.12, figTop + figH * 0.03);
  ctx.lineTo(cx + figH * 0.14, figTop + figH * 0.14);
  ctx.closePath();
  ctx.fill();

  // Crown dent (pinch at top)
  ctx.fillStyle = "rgb(30,30,30)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.06, figTop + figH * 0.035);
  ctx.quadraticCurveTo(cx, figTop + figH * 0.055, cx + figH * 0.06, figTop + figH * 0.035);
  ctx.quadraticCurveTo(cx, figTop + figH * 0.015, cx - figH * 0.06, figTop + figH * 0.035);
  ctx.fill();
  ctx.fillStyle = "#fff";

  // Brim (wide, dramatic, slightly tilted)
  ctx.beginPath();
  ctx.ellipse(cx - figH * 0.01, figTop + figH * 0.145, figH * 0.32, figH * 0.022, -0.03, 0, Math.PI * 2);
  ctx.fill();

  // Hat band
  ctx.fillStyle = "rgb(50,50,50)";
  ctx.fillRect(cx - figH * 0.135, figTop + figH * 0.115, figH * 0.27, figH * 0.022);
  ctx.fillStyle = "#fff";

  // --- FACE (slightly narrower, more angular) ---
  ctx.beginPath();
  ctx.ellipse(cx, figTop + figH * 0.27, figH * 0.11, figH * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw line (sharper)
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.09, figTop + figH * 0.3);
  ctx.quadraticCurveTo(cx - figH * 0.06, figTop + figH * 0.42, cx, figTop + figH * 0.43);
  ctx.quadraticCurveTo(cx + figH * 0.06, figTop + figH * 0.42, cx + figH * 0.09, figTop + figH * 0.3);
  ctx.fill();

  // --- SUNGLASSES (sharper, more angular - aviator style) ---
  const glassW = figH * 0.105;
  const glassH = figH * 0.048;
  const eyeY = figTop + figH * 0.24;
  const eyeSpacing = figH * 0.07;

  ctx.fillStyle = "rgb(40,40,40)";

  // Left lens
  const lx = cx - eyeSpacing - glassW / 2;
  ctx.beginPath();
  ctx.moveTo(lx + glassH * 0.15, eyeY - glassH / 2);
  ctx.lineTo(lx + glassW - glassH * 0.1, eyeY - glassH / 2);
  ctx.lineTo(lx + glassW, eyeY + glassH * 0.1);
  ctx.lineTo(lx + glassW - glassH * 0.2, eyeY + glassH / 2);
  ctx.lineTo(lx + glassH * 0.1, eyeY + glassH / 2);
  ctx.lineTo(lx, eyeY - glassH * 0.1);
  ctx.closePath();
  ctx.fill();

  // Right lens
  const rx = cx + eyeSpacing - glassW / 2;
  ctx.beginPath();
  ctx.moveTo(rx + glassH * 0.1, eyeY - glassH / 2);
  ctx.lineTo(rx + glassW - glassH * 0.15, eyeY - glassH / 2);
  ctx.lineTo(rx + glassW, eyeY - glassH * 0.1);
  ctx.lineTo(rx + glassW - glassH * 0.1, eyeY + glassH / 2);
  ctx.lineTo(rx + glassH * 0.2, eyeY + glassH / 2);
  ctx.lineTo(rx, eyeY + glassH * 0.1);
  ctx.closePath();
  ctx.fill();

  // Bridge
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = figH * 0.006;
  ctx.beginPath();
  ctx.moveTo(cx - eyeSpacing + glassW / 2, eyeY - glassH * 0.1);
  ctx.quadraticCurveTo(cx, eyeY - glassH * 0.3, cx + eyeSpacing - glassW / 2, eyeY - glassH * 0.1);
  ctx.stroke();

  // Temple arms
  ctx.beginPath();
  ctx.moveTo(lx, eyeY);
  ctx.lineTo(lx - figH * 0.06, eyeY - figH * 0.015);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx + glassW, eyeY);
  ctx.lineTo(rx + glassW + figH * 0.06, eyeY - figH * 0.015);
  ctx.stroke();

  // Subtle nose shadow
  ctx.fillStyle = "rgb(60,60,60)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.012, figTop + figH * 0.29);
  ctx.lineTo(cx + figH * 0.012, figTop + figH * 0.29);
  ctx.lineTo(cx + figH * 0.018, figTop + figH * 0.35);
  ctx.lineTo(cx - figH * 0.018, figTop + figH * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";

  // --- NECK ---
  ctx.fillRect(cx - figH * 0.035, figTop + figH * 0.41, figH * 0.07, figH * 0.06);

  // --- SHIRT COLLAR (V-shape, visible above suit) ---
  ctx.fillStyle = "rgb(200,200,200)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.04, figTop + figH * 0.44);
  ctx.lineTo(cx - figH * 0.07, figTop + figH * 0.5);
  ctx.lineTo(cx, figTop + figH * 0.54);
  ctx.lineTo(cx + figH * 0.07, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.04, figTop + figH * 0.44);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";

  // --- SHOULDERS & SUIT (broader, more powerful stance) ---
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.04, figTop + figH * 0.46);
  // Left shoulder — wider, squared
  ctx.lineTo(cx - figH * 0.22, figTop + figH * 0.5);
  ctx.lineTo(cx - figH * 0.38, figTop + figH * 0.58);
  // Left arm
  ctx.lineTo(cx - figH * 0.36, H + 50);
  // Right arm
  ctx.lineTo(cx + figH * 0.36, H + 50);
  // Right shoulder
  ctx.lineTo(cx + figH * 0.38, figTop + figH * 0.58);
  ctx.lineTo(cx + figH * 0.22, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.04, figTop + figH * 0.46);
  ctx.closePath();
  ctx.fill();

  // --- LAPELS (sharp V, wider) ---
  ctx.strokeStyle = "rgb(40,40,40)";
  ctx.lineWidth = figH * 0.006;
  // Left lapel
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.035, figTop + figH * 0.46);
  ctx.lineTo(cx - figH * 0.12, figTop + figH * 0.58);
  ctx.lineTo(cx - figH * 0.18, figTop + figH * 0.64);
  ctx.stroke();
  // Right lapel
  ctx.beginPath();
  ctx.moveTo(cx + figH * 0.035, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.12, figTop + figH * 0.58);
  ctx.lineTo(cx + figH * 0.18, figTop + figH * 0.64);
  ctx.stroke();

  // Lapel notch detail
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.12, figTop + figH * 0.58);
  ctx.lineTo(cx - figH * 0.15, figTop + figH * 0.56);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + figH * 0.12, figTop + figH * 0.58);
  ctx.lineTo(cx + figH * 0.15, figTop + figH * 0.56);
  ctx.stroke();

  // --- POCKET SQUARE (left breast) ---
  ctx.fillStyle = "rgb(180,180,180)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.13, figTop + figH * 0.6);
  ctx.lineTo(cx - figH * 0.1, figTop + figH * 0.59);
  ctx.lineTo(cx - figH * 0.09, figTop + figH * 0.63);
  ctx.lineTo(cx - figH * 0.12, figTop + figH * 0.64);
  ctx.closePath();
  ctx.fill();

  // --- TIE ---
  // Knot
  ctx.fillStyle = "rgb(60,60,60)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.022, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.022, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.028, figTop + figH * 0.5);
  ctx.lineTo(cx - figH * 0.028, figTop + figH * 0.5);
  ctx.closePath();
  ctx.fill();

  // Tie body (long, tapered)
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.028, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.028, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.012, figTop + figH * 0.78);
  ctx.lineTo(cx, figTop + figH * 0.82);
  ctx.lineTo(cx - figH * 0.012, figTop + figH * 0.78);
  ctx.closePath();
  ctx.fill();

  // Tie stripe detail
  ctx.strokeStyle = "rgb(80,80,80)";
  ctx.lineWidth = figH * 0.003;
  for (let s = 0.55; s < 0.75; s += 0.05) {
    const tieW = figH * 0.025 * (1 - (s - 0.5) / 0.35);
    ctx.beginPath();
    ctx.moveTo(cx - tieW, figTop + figH * s);
    ctx.lineTo(cx + tieW, figTop + figH * (s + 0.02));
    ctx.stroke();
  }

  // --- SUIT BUTTONS ---
  ctx.fillStyle = "rgb(50,50,50)";
  ctx.beginPath();
  ctx.arc(cx, figTop + figH * 0.62, figH * 0.008, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, figTop + figH * 0.68, figH * 0.008, 0, Math.PI * 2);
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
  ctx.quadraticCurveTo(cx, cy + eyeH * openAmount, cx + eyeW / 2, cy);
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
      // Apply cinematic easing for fluid feel
      const zoom = cinematicEase(rawZoom);

      // --- BRIGHTNESS DEPTH (cinematic, multi-phase) ---
      // Creates a "passing through darkness" effect during the transition
      let brightness = 1;
      if (rawZoom > 0.15 && rawZoom < 0.85) {
        // Bell curve centered at 0.5 — darkest in the middle of the zoom
        const t = (rawZoom - 0.15) / 0.7;
        const dip = Math.pow(Math.sin(t * Math.PI), 2);
        // Deeper dip (down to 0.35) for dramatic depth, with subtle flicker
        const flicker = 1 + Math.sin(tick * 0.3) * 0.02;
        brightness = Math.max(0.35, 1 - dip * 0.65) * flicker;
      }

      // Boost when fully zoomed for crisp eye detail
      const edgeBoost = zoom >= 0.95 ? 1.15 : 1;

      // --- BLINK ---
      blinkTimer++;
      if (!isBlinking && blinkTimer > nextBlinkAt) {
        isBlinking = true;
        forcedBlink = false;
        blinkTimer = 0;
      }
      if (isBlinking) {
        if (forcedBlink) {
          const closeFrames = 14;
          const holdFrames = 12;
          const openFrames = 16;
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

      // Crossover point — blend between silhouette and eye
      // Use a wider blend zone for smoother transition
      const crossoverLow = 0.4;
      const crossoverHigh = 0.6;

      if (zoom <= crossoverLow) {
        // Pure silhouette
        const eyePos = getEyePosition(W, H);
        const maxScale = 12;
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
        // Blend zone: cross-dissolve between silhouette zoom and eye
        const blendT = (zoom - crossoverLow) / (crossoverHigh - crossoverLow);
        const easedBlend = cinematicEase(blendT);

        // Draw silhouette at max zoom
        const eyePos = getEyePosition(W, H);
        const maxScale = 12;
        offCtx.save();
        offCtx.globalAlpha = 1 - easedBlend;
        offCtx.translate(W / 2, H / 2);
        offCtx.scale(maxScale, maxScale);
        offCtx.translate(-eyePos.x, -eyePos.y);
        drawSilhouetteMask(offCtx, W, H);
        offCtx.restore();

        // Draw eye fading in
        offCtx.save();
        offCtx.globalAlpha = easedBlend;
        drawEyeMask(offCtx, W, H, tick, blinkProgress);
        offCtx.restore();
        offCtx.globalAlpha = 1;
      }

      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // --- BRAND TEXT (visible through the eye void) ---
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
