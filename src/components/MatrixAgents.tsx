import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * NEGATIVE SPACE agent silhouettes via @chenglou/pretext.
 *
 * The entire screen is filled with dense, pretext-laid multilingual text.
 * Agent silhouettes are CARVED OUT as empty negative space — the shapes
 * are defined by the ABSENCE of text, not its presence.
 * 
 * pretext handles all line-breaking, bidi, and segmentation across
 * Japanese, Chinese, Korean, Thai, Arabic, Hindi, Hebrew, Myanmar,
 * Urdu, and English.
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

interface AgentData {
  x: number;
  speed: number;
  phase: number;
  phaseSpeed: number;
  scale: number;
}

/**
 * Draw agent as a WHITE silhouette on the offscreen canvas.
 * White = agent body (will become EMPTY negative space).
 * Black = background (will be FILLED with text).
 */
function drawAgentMask(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number,
  walkPhase: number
) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.fillStyle = "#ffffff";

  const armSwing = Math.sin(walkPhase) * s * 10;
  const legSwing = Math.sin(walkPhase) * s * 18;

  // Fedora brim
  ctx.beginPath();
  ctx.ellipse(0, -s * 175, s * 46, s * 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fedora crown
  ctx.beginPath();
  ctx.ellipse(0, -s * 197, s * 28, s * 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.beginPath();
  ctx.ellipse(0, -s * 150, s * 22, s * 26, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck
  ctx.fillRect(-s * 8, -s * 128, s * 16, s * 10);
  // Shoulders + Torso
  ctx.beginPath();
  ctx.moveTo(-s * 52, -s * 122);
  ctx.quadraticCurveTo(-s * 54, -s * 78, -s * 38, -s * 40);
  ctx.lineTo(s * 38, -s * 40);
  ctx.quadraticCurveTo(s * 54, -s * 78, s * 52, -s * 122);
  ctx.closePath();
  ctx.fill();
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-s * 52, -s * 122);
  ctx.quadraticCurveTo(-s * 64, -s * 88, -s * 58 + armSwing, -s * 46);
  ctx.lineTo(-s * 46 + armSwing, -s * 42);
  ctx.quadraticCurveTo(-s * 44, -s * 80, -s * 44, -s * 118);
  ctx.closePath();
  ctx.fill();
  // Right arm
  ctx.beginPath();
  ctx.moveTo(s * 52, -s * 122);
  ctx.quadraticCurveTo(s * 64, -s * 88, s * 58 - armSwing, -s * 46);
  ctx.lineTo(s * 46 - armSwing, -s * 42);
  ctx.quadraticCurveTo(s * 44, -s * 80, s * 44, -s * 118);
  ctx.closePath();
  ctx.fill();
  // Left hand
  ctx.beginPath();
  ctx.ellipse(-s * 56 + armSwing, -s * 43, s * 8, s * 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right hand
  ctx.beginPath();
  ctx.ellipse(s * 56 - armSwing, -s * 43, s * 8, s * 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-s * 26, -s * 40); ctx.lineTo(-s * 4, -s * 40);
  ctx.lineTo(-s * 2 - legSwing, s * 12); ctx.lineTo(-s * 26 - legSwing, s * 14);
  ctx.closePath(); ctx.fill();
  // Right leg
  ctx.beginPath();
  ctx.moveTo(s * 4, -s * 40); ctx.lineTo(s * 26, -s * 40);
  ctx.lineTo(s * 26 + legSwing, s * 12); ctx.lineTo(s * 2 + legSwing, s * 14);
  ctx.closePath(); ctx.fill();
  // Shoes
  ctx.beginPath();
  ctx.ellipse(-s * 16 - legSwing, s * 16, s * 18, s * 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 16 + legSwing, s * 16, s * 18, s * 7, 0, 0, Math.PI * 2);
  ctx.fill();

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

    const fontSize = Math.max(10, Math.min(14, Math.floor(W / 90)));
    const lineHeight = Math.ceil(fontSize * 1.2);
    const font = `${fontSize}px 'Fira Code', monospace`;

    // Pretext layout
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

      // Lay out text with pretext
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

    // Agents
    const numAgents = Math.max(2, Math.min(5, Math.floor(W / 250)));
    const agents: AgentData[] = [];
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.3 + (i / Math.max(1, numAgents - 1)) * 0.7;
      agents.push({
        x: -250 - i * W * 0.3,
        speed: 0.9 + depth * 1.6,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.03 + depth * 0.015,
        scale: 0.6 + depth * 0.8,
      });
    }

    // Per-char animation offsets
    const pulsePhase = new Float32Array(charCells.length);
    for (let i = 0; i < pulsePhase.length; i++) {
      pulsePhase[i] = Math.random() * Math.PI * 2;
    }

    let tick = 0;

    const draw = () => {
      tick++;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Draw agent mask (white silhouettes on black)
      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, W, H);
      for (const agent of agents) {
        agent.phase += agent.phaseSpeed;
        agent.x += agent.speed;
        if (agent.x > W + 450) agent.x = -400 - Math.random() * 300;
        drawAgentMask(offCtx, agent.x, H * 0.8, agent.scale, agent.phase);
      }

      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // Render: text everywhere EXCEPT where agents are (negative space)
      ctx.font = font;
      ctx.textBaseline = "top";

      for (let i = 0; i < charCells.length; i++) {
        const cell = charCells[i];
        if (!cell.ch || cell.ch === " ") continue;

        // Sample mask at char center
        const sx = Math.min(W - 1, Math.max(0, Math.floor(cell.x + fontSize * 0.3)));
        const sy = Math.min(H - 1, Math.max(0, Math.floor(cell.y + lineHeight * 0.5)));
        const pi = (sy * W + sx) * 4;
        const mask = px[pi] || 0; // white = agent, black = text area

        // INVERSION: high mask = agent = DON'T draw (negative space)
        // Low mask = background = DRAW text
        if (mask > 80) {
          // Inside agent silhouette — skip (negative space)
          // But draw a very faint outline glow at the edge
          if (mask < 160) {
            // Edge zone — subtle bright outline
            const edgeAlpha = 0.15 + ((160 - mask) / 80) * 0.35;
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgba(0, 255, 65, ${edgeAlpha})`;
            // Use a random corpus char for the glowing edge
            const ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
            ctx.fillText(ch, cell.x, cell.y);
            ctx.shadowBlur = 0;
          }
          continue;
        }

        // Background text — the dense pretext-laid wall
        pulsePhase[i] += 0.015;
        const pulse = 0.5 + Math.sin(pulsePhase[i]) * 0.15;

        // Vary brightness: some chars glow brighter, creating depth
        const rowPulse = Math.sin(tick * 0.02 + cell.y * 0.01) * 0.05;
        const alpha = 0.12 + pulse * 0.15 + rowPulse;
        const glow = alpha > 0.25 ? 2 : 0;

        if (glow > 0) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = glow;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        // Occasionally cycle characters for a "living text" feel
        let ch = cell.ch;
        if (tick % 8 === 0 && Math.random() > 0.95) {
          ch = corpusChars[Math.floor(Math.random() * corpusChars.length)];
        }

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
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default MatrixAgents;
