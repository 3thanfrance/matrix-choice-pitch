import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * NEGATIVE SPACE eye via @chenglou/pretext.
 *
 * Listens for "eye-blink" custom events to perform forced blinks
 * (used to transition between credit texts during boot).
 */

const CORPUS = [
  "The Matrix has you. Follow the white rabbit. Wake up, Neo. There is no spoon. Free your mind. Welcome to the desert of the real. Everything that has a beginning has an end. ",
  "或日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。広い門の下には、この男の外に誰もいない。唯、所々丹塗の剥げた大きな円柱に、蟋蟀が一匹とまっている。",
  "我冒了严寒回到相隔二千余里别了二十余年的故乡去。时候既然是深冬渐近故乡时天气又阴晦了冷风吹进船舱中呜呜的响从篷隙向外一望苍黄的天底下远近横着几个萧索的荒村。",
  "새침하게 흐린 품이 눈이 올 듯하더니 눈은 아니 오고 얼다가 만 비가 추적추적 내리었다。",
  "ในสมัยหนึ่ง มีพระราชาองค์หนึ่ง ทรงพระนามว่า วิกรมาทิตย์",
  "بسم الله الرحمن الرحيم وصلى الله على سيدنا محمد وآله وصحبه وسلم",
  "רמज़ान के पूरे तीस रोज़े रख कर ईद मनाने की तैयारियां हो रही थीं।",
  "ויהי בימים ההם ויצא משה אל אחיו וירא בסבלתם",
  "တစ်ခါတစ်ရံ ဗျိုင်းငှက်သည် လူတို့အား သင်ခန်းစာပေးလိုသောအခါ",
  "ایک دن کی بات ہے کہ ایک شخص اپنے گھر میں بیٹھا ہوا تھا",
].join(" ");

const FULL_CORPUS = (CORPUS + " ").repeat(12);

function drawEyeMask(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  tick: number,
  blinkProgress: number
) {
  const cx = W / 2;
  const cy = H / 2;
  const eyeW = Math.min(W * 0.55, H * 1.2);
  const eyeH = eyeW * 0.35;
  const pupilBase = eyeW * 0.08;
  const pupilPulse = Math.sin(tick * 0.015) * eyeW * 0.025;
  const pupilR = pupilBase + pupilPulse;
  const irisR = eyeW * 0.17;

  ctx.save();

  // Outer eye shape (almond)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * (1 - blinkProgress * 0.95), cx + eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy + eyeH * (1 - blinkProgress * 0.95), cx - eyeW / 2, cy);
  ctx.closePath();
  ctx.fill();

  // Iris
  ctx.fillStyle = "rgb(100, 100, 100)";
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Iris rings
  ctx.strokeStyle = "rgb(140, 140, 140)";
  ctx.lineWidth = 2;
  for (let r = irisR * 0.4; r < irisR; r += irisR * 0.2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Iris spokes
  ctx.strokeStyle = "rgb(120, 120, 120)";
  ctx.lineWidth = 1.5;
  const numSpokes = 24;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2 + tick * 0.003;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * pupilR * 1.3, cy + Math.sin(angle) * pupilR * 1.3);
    ctx.lineTo(cx + Math.cos(angle) * irisR * 0.95, cy + Math.sin(angle) * irisR * 0.95);
    ctx.stroke();
  }

  // Pupil
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // Reflection
  ctx.beginPath();
  ctx.arc(cx - pupilR * 0.6, cy - pupilR * 0.5, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Lid edges
  ctx.strokeStyle = "rgb(200, 200, 200)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * (1 - blinkProgress * 0.95), cx + eyeW / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy + eyeH * (1 - blinkProgress * 0.95), cx + eyeW / 2, cy);
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

    // Listen for forced blink events (credit transitions)
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

      // Blink logic — forced blinks are slower/smoother
      blinkTimer++;
      if (!isBlinking && blinkTimer > nextBlinkAt) {
        isBlinking = true;
        forcedBlink = false;
        blinkTimer = 0;
      }
      if (isBlinking) {
        if (forcedBlink) {
          // Slow, dramatic blink for credit transitions
          const closeFrames = 12;
          const holdFrames = 10;
          const openFrames = 14;
          if (blinkTimer < closeFrames) {
            blinkProgress = blinkTimer / closeFrames;
          } else if (blinkTimer < closeFrames + holdFrames) {
            blinkProgress = 1;
          } else if (blinkTimer < closeFrames + holdFrames + openFrames) {
            blinkProgress = 1 - (blinkTimer - closeFrames - holdFrames) / openFrames;
          } else {
            blinkProgress = 0;
            isBlinking = false;
            forcedBlink = false;
            blinkTimer = 0;
            nextBlinkAt = 180 + Math.random() * 300;
          }
        } else {
          // Normal quick blink
          if (blinkTimer < 8) {
            blinkProgress = blinkTimer / 8;
          } else if (blinkTimer < 12) {
            blinkProgress = 1;
          } else if (blinkTimer < 20) {
            blinkProgress = 1 - (blinkTimer - 12) / 8;
          } else {
            blinkProgress = 0;
            isBlinking = false;
            blinkTimer = 0;
            nextBlinkAt = 180 + Math.random() * 300;
          }
        }
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, W, H);
      drawEyeMask(offCtx, W, H, tick, blinkProgress);

      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

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
          const edgeAlpha = 0.1 + edgeFactor * 0.5;
          const ch = tick % 2 === 0
            ? corpusChars[Math.floor(Math.random() * corpusChars.length)]
            : cell.ch;

          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 4 + edgeFactor * 8;
          ctx.fillStyle = `rgba(0, 255, 65, ${edgeAlpha})`;
          ctx.fillText(ch, cell.x, cell.y);
          ctx.shadowBlur = 0;
          continue;
        }

        pulsePhase[i] += 0.012;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;
        const wave = Math.sin(tick * 0.008 + cell.x * 0.003 + cell.y * 0.005) * 0.04;
        const alpha = 0.1 + pulse * 0.12 + wave;

        let ch = cell.ch;
        if (tick % 10 === 0 && Math.random() > 0.97) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

        const glow = alpha > 0.22 ? 1.5 : 0;
        if (glow > 0) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = glow;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

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
