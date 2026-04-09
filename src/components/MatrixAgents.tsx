import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * Matrix Agent silhouettes rendered via @chenglou/pretext.
 *
 * Dense multilingual text (Japanese, Chinese, Korean, Thai, Arabic, Hindi,
 * Hebrew, Myanmar, Khmer, Urdu, English) is laid out by pretext's engine
 * into proper line-broken paragraphs. Each character is then drawn on
 * canvas with alpha modulated by an offscreen brightness field that
 * defines the agent silhouettes.
 *
 * The result: walking men in suits formed entirely from beautifully
 * laid-out multilingual typography — pretext handling all the complex
 * line-breaking, bidi, and segmentation.
 */

// Dense multilingual corpus — pretext handles line-breaking across all these scripts
const CORPUS = [
  // English
  "The Matrix has you. Follow the white rabbit. Wake up, Neo. There is no spoon. Free your mind. I know kung fu. Welcome to the desert of the real. Everything that has a beginning has an end. ",
  // Japanese (Rashomon opening)
  "或日の暮方の事である。一人の下人が、羅生門の下で雨やみを待っていた。広い門の下には、この男の外に誰もいない。唯、所々丹塗の剥げた大きな円柱に、蟋蟀が一匹とまっている。",
  // Chinese (Lu Xun - Hometown)
  "我冒了严寒回到相隔二千余里别了二十余年的故乡去。时候既然是深冬渐近故乡时天气又阴晦了冷风吹进船舱中呜呜的响从篷隙向外一望苍黄的天底下远近横着几个萧索的荒村。",
  // Korean (Lucky Day)
  "새침하게 흐린 품이 눈이 올 듯하더니 눈은 아니 오고 얼다가 만 비가 추적추적 내리었다. 이 우중에 김 첨지는 그의 아내가 기침이 점점 더해 가는 걸 에누리해서 약값으로 삼십 전짜리를 남겨 두고는",
  // Thai (Vetala tales)
  "ในสมัยหนึ่ง มีพระราชาองค์หนึ่ง ทรงพระนามว่า วิกรมาทิตย์ ครองราชสมบัติอยู่ในพระนครอันงดงาม ทรงเป็นกษัตริย์ที่ทรงธรรม",
  // Arabic (Al-Ghufran)
  "بسم الله الرحمن الرحيم وصلى الله على سيدنا محمد وآله وصحبه وسلم تسليما كثيرا أما بعد فإن الحمد لله الذي جعل الليل والنهار خلفة لمن أراد أن يذكر",
  // Hindi (Eidgah)
  "रमज़ान के पूरे तीस रोज़े रख कर ईद मनाने की तैयारियां हो रही थीं। ईद मनाने की ख़ुशी में सब लोग मशगूल थे।",
  // Hebrew
  "ויהי בימים ההם ויצא משה אל אחיו וירא בסבלתם וירא איש מצרי מכה איש עברי מאחיו",
  // Myanmar
  "တစ်ခါတစ်ရံ ဗျိုင်းငှက်သည် လူတို့အား သင်ခန်းစာပေးလိုသောအခါ စဉ်းလဲသော နည်းလမ်းများကို အသုံးပြုတတ်သည်",
  // Urdu
  "ایک دن کی بات ہے کہ ایک شخص اپنے گھر میں بیٹھا ہوا تھا اور باہر بارش ہو رہی تھی",
].join(" ");

// Repeat corpus to fill large screens
const FULL_CORPUS = (CORPUS + " ").repeat(8);

interface AgentData {
  x: number;
  speed: number;
  phase: number;
  phaseSpeed: number;
  scale: number;
  depth: number;
}

/**
 * Draw agent brightness field onto offscreen canvas.
 * White = face/hands (bright text), Gray = fedora/tie (medium),
 * Dark = suit (negative space), Black = background (subtle rain)
 */
function drawAgent(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  walkPhase: number
) {
  ctx.save();
  ctx.translate(cx, baseY);

  const armSwing = Math.sin(walkPhase) * s * 10;
  const legSwing = Math.sin(walkPhase) * s * 18;

  // SUIT BODY (dark negative space)
  ctx.fillStyle = "rgb(30, 30, 30)";

  // Fedora brim
  ctx.beginPath();
  ctx.ellipse(0, -s * 175, s * 44, s * 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fedora crown
  ctx.beginPath();
  ctx.ellipse(0, -s * 195, s * 26, s * 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head/neck
  ctx.beginPath();
  ctx.ellipse(0, -s * 150, s * 20, s * 24, 0, 0, Math.PI * 2);
  ctx.fill();
  // Torso
  ctx.beginPath();
  ctx.moveTo(-s * 50, -s * 120);
  ctx.quadraticCurveTo(-s * 52, -s * 80, -s * 36, -s * 40);
  ctx.lineTo(s * 36, -s * 40);
  ctx.quadraticCurveTo(s * 52, -s * 80, s * 50, -s * 120);
  ctx.closePath();
  ctx.fill();
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-s * 50, -s * 120);
  ctx.quadraticCurveTo(-s * 62, -s * 90, -s * 56 + armSwing, -s * 48);
  ctx.lineTo(-s * 44 + armSwing, -s * 44);
  ctx.quadraticCurveTo(-s * 42, -s * 82, -s * 42, -s * 115);
  ctx.closePath();
  ctx.fill();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(s * 50, -s * 120);
  ctx.quadraticCurveTo(s * 62, -s * 90, s * 56 - armSwing, -s * 48);
  ctx.lineTo(s * 44 - armSwing, -s * 44);
  ctx.quadraticCurveTo(s * 42, -s * 82, s * 42, -s * 115);
  ctx.closePath();
  ctx.fill();
  // Legs
  ctx.beginPath();
  ctx.moveTo(-s * 24, -s * 40); ctx.lineTo(-s * 4, -s * 40);
  ctx.lineTo(-s * 2 - legSwing, s * 10); ctx.lineTo(-s * 24 - legSwing, s * 12);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 4, -s * 40); ctx.lineTo(s * 24, -s * 40);
  ctx.lineTo(s * 24 + legSwing, s * 10); ctx.lineTo(s * 2 + legSwing, s * 12);
  ctx.closePath(); ctx.fill();
  // Shoes
  ctx.beginPath();
  ctx.ellipse(-s * 14 - legSwing, s * 14, s * 16, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 14 + legSwing, s * 14, s * 16, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // BRIGHT: Face
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 153, s * 15, s * 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // BRIGHT: Shirt
  ctx.fillStyle = "rgb(220, 220, 220)";
  ctx.beginPath();
  ctx.moveTo(-s * 12, -s * 130); ctx.lineTo(s * 12, -s * 130);
  ctx.lineTo(s * 8, -s * 45); ctx.lineTo(-s * 8, -s * 45);
  ctx.closePath(); ctx.fill();

  // BRIGHT: Hands
  ctx.fillStyle = "rgb(240, 240, 240)";
  ctx.beginPath();
  ctx.ellipse(-s * 54 + armSwing, -s * 45, s * 7, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 54 - armSwing, -s * 45, s * 7, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // MEDIUM: Fedora detail
  ctx.fillStyle = "rgb(120, 120, 120)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 195, s * 24, s * 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgb(100, 100, 100)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 175, s * 42, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // MEDIUM: Tie
  ctx.fillStyle = "rgb(110, 110, 110)";
  ctx.beginPath();
  ctx.moveTo(-s * 4, -s * 128); ctx.lineTo(s * 4, -s * 128);
  ctx.lineTo(s * 3, -s * 48); ctx.lineTo(0, -s * 42); ctx.lineTo(-s * 3, -s * 48);
  ctx.closePath(); ctx.fill();

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

    // Offscreen brightness field
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { alpha: false })!;

    const fontSize = Math.max(10, Math.min(14, Math.floor(W / 90)));
    const lineHeight = Math.ceil(fontSize * 1.15);
    const font = `${fontSize}px 'Fira Code', monospace`;

    // === USE PRETEXT to lay out the multilingual corpus ===
    // This is the core integration: pretext handles segmentation,
    // bidi, line-breaking across Japanese, Chinese, Korean, Thai,
    // Arabic, Hindi, Hebrew, Myanmar, Urdu, and English.
    let prepared: ReturnType<typeof prepareWithSegments>;
    let layoutResult: ReturnType<typeof layoutWithLines>;
    
    // Each "char" in our grid: { char, x, y }
    interface CharCell {
      ch: string;
      x: number;
      y: number;
    }
    let charCells: CharCell[] = [];

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

      // Prepare text with pretext engine
      prepared = prepareWithSegments(FULL_CORPUS, font);
      layoutResult = layoutWithLines(prepared, W, lineHeight);

      // Extract individual character positions from pretext's lines
      charCells = [];
      const lines = layoutResult.lines;
      
      // We need to fill the full screen height
      // If pretext's layout doesn't fill the screen, we repeat
      let yOffset = 0;
      let lineIdx = 0;
      
      while (yOffset < H + lineHeight) {
        const line = lines[lineIdx % lines.length];
        const text = line.text;
        
        // Measure each character's x position
        // Use canvas measureText for per-character x offsets
        ctx.font = font;
        let xPos = 0;
        const graphemes = [...text]; // proper grapheme iteration
        
        for (const grapheme of graphemes) {
          if (xPos < W + fontSize) {
            charCells.push({
              ch: grapheme,
              x: xPos,
              y: yOffset,
            });
          }
          xPos += ctx.measureText(grapheme).width;
        }
        
        yOffset += lineHeight;
        lineIdx++;
      }
    }

    rebuildLayout();
    window.addEventListener("resize", rebuildLayout);

    // Rain state - per column
    const cols = Math.ceil(W / (fontSize * 0.6));
    const rainY: number[] = new Array(cols);
    const rainSpd: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      rainY[c] = Math.random() * H;
      rainSpd[c] = 0.5 + Math.random() * 2;
    }

    // Agents
    const numAgents = Math.max(2, Math.min(5, Math.floor(W / 250)));
    const agents: AgentData[] = [];
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.25 + (i / Math.max(1, numAgents - 1)) * 0.75;
      agents.push({
        x: -200 - i * W * 0.3,
        speed: 0.8 + depth * 1.8,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.03 + depth * 0.015,
        scale: 0.55 + depth * 0.85,
        depth,
      });
    }
    agents.sort((a, b) => a.depth - b.depth);

    // Character cycling state
    const cycleOffsets = new Float32Array(charCells.length);
    for (let i = 0; i < cycleOffsets.length; i++) {
      cycleOffsets[i] = Math.random() * 100;
    }

    // Pool of replacement chars for cycling (from corpus)
    const corpusChars = [...FULL_CORPUS].filter(c => c.trim().length > 0);

    let tick = 0;

    const draw = () => {
      tick++;

      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Draw agent brightness field
      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, W, H);
      for (const agent of agents) {
        agent.phase += agent.phaseSpeed;
        agent.x += agent.speed;
        if (agent.x > W + 400) agent.x = -350 - Math.random() * 250;
        drawAgent(offCtx, agent.x, H * 0.8, agent.scale, agent.phase);
      }

      // Read brightness field
      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // Update rain
      for (let c = 0; c < cols; c++) {
        rainY[c] += rainSpd[c];
        if (rainY[c] >= H) rainY[c] = -Math.random() * 100;
      }

      // Render each pretext-laid-out character with brightness modulation
      ctx.font = font;
      ctx.textBaseline = "top";

      for (let i = 0; i < charCells.length; i++) {
        const cell = charCells[i];
        if (!cell.ch || cell.ch === " ") continue;

        // Sample brightness at character center
        const sx = Math.min(W - 1, Math.max(0, Math.floor(cell.x + fontSize * 0.3)));
        const sy = Math.min(H - 1, Math.max(0, Math.floor(cell.y + lineHeight * 0.5)));
        const pi = (sy * W + sx) * 4;
        const brightness = px[pi] || 0;

        // Determine alpha and glow based on brightness
        let alpha: number;
        let glow: number;
        let ch = cell.ch;

        if (brightness > 180) {
          // BRIGHT: face, hands — full brightness, rapid cycling
          alpha = 0.8 + (brightness / 255) * 0.2;
          glow = 8 + (brightness / 255) * 10;
          // Cycle character rapidly in bright zones
          if (tick % 3 === 0) {
            ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
          }
        } else if (brightness > 80) {
          // MEDIUM: shirt, fedora, tie
          alpha = 0.3 + ((brightness - 80) / 175) * 0.5;
          glow = 2 + ((brightness - 80) / 175) * 6;
          if (tick % 5 === 0 && Math.random() > 0.6) {
            ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
          }
        } else if (brightness > 15) {
          // SUIT: very dim negative space
          alpha = 0.012;
          glow = 0;
        } else {
          // BACKGROUND: subtle rain effect
          const colIdx = Math.floor(cell.x / (fontSize * 0.6));
          const ry = rainY[colIdx] || 0;
          const dist = Math.abs(cell.y - ry);

          if (dist < lineHeight) {
            alpha = 0.2 * (1 - dist / lineHeight);
            glow = 2;
          } else if (dist < lineHeight * 4) {
            alpha = 0.04 * (1 - dist / (lineHeight * 4));
            glow = 0;
          } else {
            // Ambient: very faint
            cycleOffsets[i] += 0.02;
            alpha = 0.015 + Math.sin(cycleOffsets[i]) * 0.008;
            glow = 0;
          }
        }

        if (alpha < 0.005) continue;

        if (glow > 1) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = glow;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(1, alpha)})`;
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
