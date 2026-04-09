import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * NEGATIVE SPACE silhouettes via @chenglou/pretext.
 *
 * A giant Matrix-style EYE is carved as negative space from a wall of
 * dense, pretext-laid multilingual text. The eye blinks, the pupil
 * dilates, and the iris pulses — all rendered as voids in typography.
 *
 * pretext handles all line-breaking/bidi across 10+ scripts.
 */

const CORPUS = [
  "The Matrix has you. Follow the white rabbit. Wake up, Neo. There is no spoon. Free your mind. Welcome to the desert of the real. Everything that has a beginning has an end. ",
  "或日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。広い門の下には、この男の外に誰もいない。唯、所々丹塗の剥げた大きな円柱に、蟋蟀が一匹とまっている。",
  "我冒了严寒回到相隔二千余里别了二十余年的故乡去。时候既然是深冬渐近故乡时天气又阴晦了冷风吹进船舱中呜呜的响从篷隙向外一望苍黄的天底下远近横着几个萧索的荒村。",
  "새침하게 흐린 품이 눈이 올 듯하더니 눈은 아니 오고 얼다가 만 비가 추적추적 내리었다. 이 우중에 김 첨지는 그의 아내가 기침이 점점 더해 가는 걸 에누리해서 약값으로 삼십 전짜리를 남겨 두고는",
  "ในสมัยหนึ่ง มีพระราชาองค์หนึ่ง ทรงพระนามว่า วิกรมาทิตย์ ครองราชสมบัติอยู่ในพระนครอันงดงาม ทรงเป็นกษัตริย์ที่ทรงธรรม",
  "بسم الله الرحمن الرحيم وصلى الله على سيدنا محمد وآله وصحبه وسلم تسليما كثيرا أما بعد فإن الحمد لله الذي جعل الليل والنهار خلفة لمن أراد أن يذكر",
  "रमज़ान के पूरे तीस रोज़े रख कर ईद मनाने की तैयारियां हो रही थीं। ईद मनाने की ख़ुशी में सब लोग मशगूल थे।",
  "ויהי בימים ההם ויצא משה אל אחיו וירא בסבלתם וירא איש מצרי מכה איש עברי מאחיו",
  "တစ်ခါတစ်ရံ ဗျိုင်းငှက်သည် လူတို့အား သင်ခန်းစာပေးလိုသောအခါ စဉ်းလဲသော နည်းလမ်းများကို အသုံးပြုတတ်သည်",
  "ایک دن کی بات ہے کہ ایک شخص اپنے گھر میں بیٹھا ہوا تھا اور باہر بارش ہو رہی تھی",
].join(" ");

const FULL_CORPUS = (CORPUS + " ").repeat(12);

/**
 * Draw the eye mask onto offscreen canvas.
 * White = eye area (negative space — no text)
 * Black = background (filled with text)
 * 
 * The eye: almond shape with iris ring and pupil.
 * Pupil dilates. Eye blinks (lid closes). Iris has detail rings.
 */
function drawEyeMask(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  tick: number,
  blinkProgress: number // 0 = open, 1 = closed
) {
  const cx = W / 2;
  const cy = H / 2;
  
  // Eye proportions relative to screen
  const eyeW = Math.min(W * 0.55, H * 1.2);
  const eyeH = eyeW * 0.35;
  
  // Pupil dilation — slow breathing pulse
  const pupilBase = eyeW * 0.08;
  const pupilPulse = Math.sin(tick * 0.015) * eyeW * 0.025;
  const pupilR = pupilBase + pupilPulse;
  
  // Iris
  const irisR = eyeW * 0.17;
  
  ctx.save();
  
  // --- OUTER EYE SHAPE (almond) ---
  // Draw as two arcs meeting at points
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  
  // Upper lid arc
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * (1 - blinkProgress * 0.95), cx + eyeW / 2, cy);
  // Lower lid arc
  ctx.quadraticCurveTo(cx, cy + eyeH * (1 - blinkProgress * 0.95), cx - eyeW / 2, cy);
  ctx.closePath();
  ctx.fill();
  
  // --- IRIS (medium gray — partial negative space) ---
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
  
  // Iris radial lines (spokes)
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
  
  // --- PUPIL (brightest white — total void) ---
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupil light reflection (small bright spot offset)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx - pupilR * 0.6, cy - pupilR * 0.5, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // --- LID EDGES (thin bright lines for definition) ---
  ctx.strokeStyle = "rgb(200, 200, 200)";
  ctx.lineWidth = 3;
  // Upper lid line
  ctx.beginPath();
  ctx.moveTo(cx - eyeW / 2, cy);
  ctx.quadraticCurveTo(cx, cy - eyeH * (1 - blinkProgress * 0.95), cx + eyeW / 2, cy);
  ctx.stroke();
  // Lower lid line
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

    // Per-char pulse
    const pulsePhase = new Float32Array(charCells.length);
    for (let i = 0; i < pulsePhase.length; i++) {
      pulsePhase[i] = Math.random() * Math.PI * 2;
    }

    let tick = 0;
    let blinkTimer = 0;
    let blinkProgress = 0;
    let isBlinking = false;
    let nextBlinkAt = 180 + Math.random() * 200;

    const draw = () => {
      tick++;

      // Blink logic
      blinkTimer++;
      if (!isBlinking && blinkTimer > nextBlinkAt) {
        isBlinking = true;
        blinkTimer = 0;
      }
      if (isBlinking) {
        if (blinkTimer < 8) {
          blinkProgress = blinkTimer / 8; // closing
        } else if (blinkTimer < 12) {
          blinkProgress = 1; // closed
        } else if (blinkTimer < 20) {
          blinkProgress = 1 - (blinkTimer - 12) / 8; // opening
        } else {
          blinkProgress = 0;
          isBlinking = false;
          blinkTimer = 0;
          nextBlinkAt = 180 + Math.random() * 300;
        }
      }

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Draw eye mask
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

        if (mask > 160) {
          // Deep inside eye — total void (negative space)
          continue;
        }

        if (mask > 60) {
          // Iris/edge zone — glowing edge characters
          const edgeFactor = (mask - 60) / 100;
          const edgeAlpha = 0.1 + edgeFactor * 0.5;

          // Iris chars cycle rapidly for a "scanning" effect
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

        // Background text wall
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
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default MatrixAgents;
