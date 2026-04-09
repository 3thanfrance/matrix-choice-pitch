import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

declare global {
  interface Window {
    __matrixZoomStart?: number;
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
const ZOOM_DURATION = 3000;

function getEyePosition(W: number, H: number) {
  const figH = Math.min(H * 0.7, W * 0.9);
  const figTop = (H - figH) / 2 - figH * 0.05;
  const eyeY = figTop + figH * 0.25;
  const eyeSpacing = figH * 0.065;
  return { x: W / 2 - eyeSpacing, y: eyeY };
}

function drawSilhouetteMask(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2;
  const figH = Math.min(H * 0.7, W * 0.9);
  const figTop = (H - figH) / 2 - figH * 0.05;

  ctx.fillStyle = "#fff";

  // Hat crown
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.18, figTop + figH * 0.15);
  ctx.quadraticCurveTo(cx - figH * 0.16, figTop + figH * 0.02, cx, figTop);
  ctx.quadraticCurveTo(cx + figH * 0.16, figTop + figH * 0.02, cx + figH * 0.18, figTop + figH * 0.15);
  ctx.closePath();
  ctx.fill();

  // Hat brim
  ctx.beginPath();
  ctx.ellipse(cx, figTop + figH * 0.15, figH * 0.28, figH * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hat band
  ctx.fillStyle = "rgb(40,40,40)";
  ctx.fillRect(cx - figH * 0.17, figTop + figH * 0.125, figH * 0.34, figH * 0.018);
  ctx.fillStyle = "#fff";

  // Face
  ctx.beginPath();
  ctx.ellipse(cx, figTop + figH * 0.28, figH * 0.13, figH * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sunglasses
  const glassW = figH * 0.1;
  const glassH = figH * 0.05;
  const eyeY = figTop + figH * 0.25;
  const eyeSpacing = figH * 0.065;

  ctx.fillStyle = "rgb(50,50,50)";
  const lx = cx - eyeSpacing - glassW / 2;
  ctx.beginPath();
  ctx.roundRect(lx, eyeY - glassH / 2, glassW, glassH, glassH * 0.25);
  ctx.fill();

  const rx = cx + eyeSpacing - glassW / 2;
  ctx.beginPath();
  ctx.roundRect(rx, eyeY - glassH / 2, glassW, glassH, glassH * 0.25);
  ctx.fill();

  // Bridge & arms
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = figH * 0.007;
  ctx.beginPath();
  ctx.moveTo(cx - eyeSpacing + glassW / 2, eyeY);
  ctx.lineTo(cx + eyeSpacing - glassW / 2, eyeY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lx, eyeY);
  ctx.lineTo(lx - figH * 0.05, eyeY - figH * 0.01);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx + glassW, eyeY);
  ctx.lineTo(rx + glassW + figH * 0.05, eyeY - figH * 0.01);
  ctx.stroke();

  ctx.fillStyle = "#fff";

  // Neck
  ctx.fillRect(cx - figH * 0.04, figTop + figH * 0.4, figH * 0.08, figH * 0.06);

  // Shoulders
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.04, figTop + figH * 0.46);
  ctx.lineTo(cx - figH * 0.35, figTop + figH * 0.6);
  ctx.lineTo(cx - figH * 0.35, H + 50);
  ctx.lineTo(cx + figH * 0.35, H + 50);
  ctx.lineTo(cx + figH * 0.35, figTop + figH * 0.6);
  ctx.lineTo(cx + figH * 0.04, figTop + figH * 0.46);
  ctx.closePath();
  ctx.fill();

  // Lapels
  ctx.strokeStyle = "rgb(50,50,50)";
  ctx.lineWidth = figH * 0.005;
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.02, figTop + figH * 0.46);
  ctx.lineTo(cx - figH * 0.15, figTop + figH * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + figH * 0.02, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.15, figTop + figH * 0.65);
  ctx.stroke();

  // Tie knot
  ctx.fillStyle = "rgb(70,70,70)";
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.025, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.025, figTop + figH * 0.46);
  ctx.lineTo(cx + figH * 0.03, figTop + figH * 0.5);
  ctx.lineTo(cx - figH * 0.03, figTop + figH * 0.5);
  ctx.closePath();
  ctx.fill();

  // Tie body
  ctx.beginPath();
  ctx.moveTo(cx - figH * 0.03, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.03, figTop + figH * 0.5);
  ctx.lineTo(cx + figH * 0.015, figTop + figH * 0.75);
  ctx.lineTo(cx, figTop + figH * 0.78);
  ctx.lineTo(cx - figH * 0.015, figTop + figH * 0.75);
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

  ctx.restore(); // pop clip

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

      // --- ZOOM ---
      const zoomStart = (window as any).__matrixZoomStart as number | undefined;
      let zoom = 0;
      if (zoomStart) {
        zoom = Math.min(1, (Date.now() - zoomStart) / ZOOM_DURATION);
      }

      // --- BRIGHTNESS DEPTH (dip during zoom transition) ---
      let brightness = 1;
      if (zoom > 0.3 && zoom < 0.7) {
        const t = (zoom - 0.3) / 0.4;
        brightness = 1 - Math.pow(Math.sin(t * Math.PI), 2) * 0.92;
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

      const useEye = zoom >= 0.5;

      if (!useEye) {
        // Silhouette with zoom toward eye
        const eyePos = getEyePosition(W, H);
        const maxScale = 10;
        const normalizedZoom = zoom / 0.5;
        const scale = 1 + normalizedZoom * (maxScale - 1);

        offCtx.save();
        offCtx.translate(W / 2, H / 2);
        offCtx.scale(scale, scale);
        offCtx.translate(-eyePos.x, -eyePos.y);
        drawSilhouetteMask(offCtx, W, H);
        offCtx.restore();
      } else {
        drawEyeMask(offCtx, W, H, tick, blinkProgress);
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

        // Decorative line
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
          const edgeAlpha = (0.1 + edgeFactor * 0.5) * brightness;
          const ch = tick % 2 === 0
            ? corpusChars[Math.floor(Math.random() * corpusChars.length)]
            : cell.ch;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = (4 + edgeFactor * 8) * brightness;
          ctx.fillStyle = `rgba(0, 255, 65, ${edgeAlpha})`;
          ctx.fillText(ch, cell.x, cell.y);
          ctx.shadowBlur = 0;
          continue;
        }

        pulsePhase[i] += 0.012;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;
        const wave = Math.sin(tick * 0.008 + cell.x * 0.003 + cell.y * 0.005) * 0.04;
        const alpha = (0.1 + pulse * 0.12 + wave) * brightness;

        let ch = cell.ch;
        if (tick % 10 === 0 && Math.random() > 0.97) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

        const glow = alpha > 0.22 * brightness ? 1.5 * brightness : 0;
        ctx.shadowColor = glow > 0 ? "#00FF41" : "transparent";
        ctx.shadowBlur = glow;
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(0.4, alpha)})`;
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
