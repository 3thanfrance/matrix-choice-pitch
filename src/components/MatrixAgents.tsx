import { useEffect, useRef } from "react";

/**
 * Pretext-inspired typographic ASCII art.
 * 
 * Uses a brightness field (offscreen canvas with blurred agent silhouettes)
 * to drive character selection: heavier/denser glyphs for bright areas,
 * lighter ones for dim areas. Multilingual characters from pretext's
 * corpus languages (Japanese, Chinese, Korean, Thai, Arabic, Hindi, etc.)
 * create the rich typographic texture.
 * 
 * Suits = negative space (no characters).
 * Faces/shirts = dense, bright, heavy glyphs.
 * Background = sparse, light characters with subtle rain.
 */

// Characters sorted roughly by visual weight (light → heavy)
// Multilingual corpus: Japanese, Chinese, Korean, Thai, Arabic, Hindi, Hebrew + ASCII
const CHARS_BY_WEIGHT = [
  // Very light
  "·.,:;'-`~\"",
  // Light  
  "+=*^!?|/\\(){}[]<>",
  // Medium-light
  "アイウエオカキクケコサシスセソタチツテトナニヌネノ01234",
  // Medium
  "ハヒフヘホマミムメモヤユヨラリルレロワヲン56789ABCDEF",
  // Medium-heavy (Chinese, Korean, Thai, Arabic, Hindi)
  "故鄉祝福羅生門蜘蛛糸운수좋은날소나기เวตาล",
  // Heavy
  "الغفرانالبخلاءईदगाहמסעות曙光黎明覺醒GHIJKLMNOPQRSTUVWXYZ",
  // Very heavy — used for brightest areas
  "#@$%&█▓▒░ΩΣΔΨ■□▪▫●○◆◇★☆",
];

// Flatten for random picks at each weight level
const WEIGHT_LEVELS = CHARS_BY_WEIGHT.map(s => [...s]);
const NUM_LEVELS = WEIGHT_LEVELS.length;

// All chars combined for background rain
const ALL_CHARS = CHARS_BY_WEIGHT.join("");

interface Agent {
  x: number;
  speed: number;
  walkPhase: number;
  walkSpeed: number;
  scale: number;
  depth: number;
}

/**
 * Draw the agent silhouette brightness field onto the offscreen canvas.
 * White = bright (face, shirt, hands) → heavy characters
 * Black = suit (negative space) → no characters  
 * Gray = medium areas (fedora, tie) → medium characters
 * The silhouette is drawn with soft edges (blur) for smooth transitions.
 */
function drawAgentField(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  scale: number,
  walkPhase: number,
  depth: number
) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, groundY);

  const blurAmount = 2 + depth * 3;

  // ---- SUIT BODY (dark silhouette that BLOCKS background) ----
  ctx.filter = `blur(${blurAmount}px)`;
  ctx.fillStyle = `rgba(10, 10, 10, ${0.85 + depth * 0.15})`;

  // Fedora
  ctx.beginPath();
  ctx.ellipse(0, -s * 192, s * 24, s * 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -s * 172, s * 42, s * 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(0, -s * 148, s * 19, s * 23, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.beginPath();
  ctx.moveTo(-s * 46, -s * 118);
  ctx.quadraticCurveTo(-s * 48, -s * 80, -s * 32, -s * 42);
  ctx.lineTo(s * 32, -s * 42);
  ctx.quadraticCurveTo(s * 48, -s * 80, s * 46, -s * 118);
  ctx.closePath();
  ctx.fill();

  // Left arm
  const armSwing = Math.sin(walkPhase) * s * 8;
  ctx.beginPath();
  ctx.moveTo(-s * 46, -s * 118);
  ctx.quadraticCurveTo(-s * 58, -s * 90, -s * 52 + armSwing, -s * 52);
  ctx.lineTo(-s * 42 + armSwing, -s * 48);
  ctx.quadraticCurveTo(-s * 40, -s * 80, -s * 38, -s * 110);
  ctx.closePath();
  ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(s * 46, -s * 118);
  ctx.quadraticCurveTo(s * 58, -s * 90, s * 52 - armSwing, -s * 52);
  ctx.lineTo(s * 42 - armSwing, -s * 48);
  ctx.quadraticCurveTo(s * 40, -s * 80, s * 38, -s * 110);
  ctx.closePath();
  ctx.fill();

  // Legs
  const legSwing = Math.sin(walkPhase) * s * 15;
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-s * 22, -s * 42);
  ctx.lineTo(-s * 4, -s * 42);
  ctx.lineTo(-s * 2 - legSwing, s * 5);
  ctx.lineTo(-s * 22 - legSwing, s * 8);
  ctx.closePath();
  ctx.fill();
  // Left shoe
  ctx.beginPath();
  ctx.ellipse(-s * 12 - legSwing, s * 8, s * 14, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(s * 4, -s * 42);
  ctx.lineTo(s * 22, -s * 42);
  ctx.lineTo(s * 22 + legSwing, s * 5);
  ctx.lineTo(s * 2 + legSwing, s * 8);
  ctx.closePath();
  ctx.fill();
  // Right shoe
  ctx.beginPath();
  ctx.ellipse(s * 12 + legSwing, s * 8, s * 14, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- BRIGHT AREAS (face, shirt, hands) — drawn ON TOP ----
  ctx.filter = `blur(${blurAmount + 1}px)`;
  const bright = `rgba(255, 255, 255, ${0.7 + depth * 0.3})`;

  // Face
  ctx.fillStyle = bright;
  ctx.beginPath();
  ctx.ellipse(0, -s * 150, s * 14, s * 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shirt (V between lapels)
  ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + depth * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(-s * 10, -s * 128);
  ctx.lineTo(s * 10, -s * 128);
  ctx.lineTo(s * 7, -s * 44);
  ctx.lineTo(-s * 7, -s * 44);
  ctx.closePath();
  ctx.fill();

  // Hands
  ctx.fillStyle = `rgba(220, 220, 220, ${0.5 + depth * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(-s * 50 + armSwing, -s * 49, s * 6, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 50 - armSwing, -s * 49, s * 6, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- MEDIUM AREAS (fedora crown, tie) ----
  ctx.fillStyle = `rgba(160, 160, 160, ${0.5 + depth * 0.2})`;
  ctx.filter = `blur(${blurAmount}px)`;
  // Fedora crown
  ctx.beginPath();
  ctx.ellipse(0, -s * 192, s * 22, s * 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fedora brim
  ctx.fillStyle = `rgba(120, 120, 120, ${0.4 + depth * 0.2})`;
  ctx.beginPath();
  ctx.ellipse(0, -s * 172, s * 40, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tie
  ctx.fillStyle = `rgba(140, 140, 140, ${0.4 + depth * 0.2})`;
  ctx.beginPath();
  ctx.moveTo(-s * 3.5, -s * 125);
  ctx.lineTo(s * 3.5, -s * 125);
  ctx.lineTo(s * 2.5, -s * 50);
  ctx.lineTo(0, -s * 44);
  ctx.lineTo(-s * 2.5, -s * 50);
  ctx.closePath();
  ctx.fill();

  ctx.filter = "none";
  ctx.restore();
}

const MatrixAgents = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let W = window.innerWidth;
    let H = window.innerHeight;

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      offscreen.width = W;
      offscreen.height = H;
    };

    // Offscreen canvas for brightness field
    const offscreen = document.createElement("canvas");
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext("2d")!;

    canvas.width = W;
    canvas.height = H;
    window.addEventListener("resize", resize);

    // Dense character grid
    const fontSize = Math.max(7, Math.min(10, Math.floor(W / 150)));
    const charW = fontSize * 0.58;
    const charH = fontSize * 1.05;
    const cols = Math.ceil(W / charW) + 1;
    const rows = Math.ceil(H / charH) + 1;

    // Character state per cell
    const gridSize = cols * rows;
    const charGrid: string[] = new Array(gridSize);
    const charAge: number[] = new Array(gridSize);
    for (let i = 0; i < gridSize; i++) {
      charGrid[i] = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
      charAge[i] = Math.floor(Math.random() * 80);
    }

    // Rain columns
    const rainY: number[] = new Array(cols);
    const rainSpeed: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      rainY[c] = Math.random() * rows;
      rainSpeed[c] = 0.08 + Math.random() * 0.25;
    }

    // Agents — speed calibrated so they cross the full screen during the intro
    const numAgents = Math.max(2, Math.min(4, Math.floor(W / 300)));
    const agents: Agent[] = [];
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.3 + (i / Math.max(1, numAgents - 1)) * 0.7;
      agents.push({
        x: -150 - i * W * 0.25,
        speed: 1.2 + depth * 1.5,
        walkPhase: Math.random() * Math.PI * 2,
        walkSpeed: 0.035 + depth * 0.02,
        scale: 0.5 + depth * 0.9,
        depth,
      });
    }
    agents.sort((a, b) => a.depth - b.depth);

    let tick = 0;

    const draw = () => {
      tick++;

      // Fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(0, 0, W, H);

      // ---- Draw agent brightness field ----
      offCtx.fillStyle = "#000000";
      offCtx.fillRect(0, 0, W, H);

      agents.forEach((agent) => {
        agent.walkPhase += agent.walkSpeed;
        agent.x += agent.speed;
        if (agent.x > W + 350) {
          agent.x = -300 - Math.random() * 300;
          agent.depth = 0.3 + Math.random() * 0.7;
          agent.scale = 0.5 + agent.depth * 0.9;
          agent.speed = 1.2 + agent.depth * 1.5;
        }
        drawAgentField(offCtx, agent.x, H * 0.82, agent.scale, agent.walkPhase, agent.depth);
      });

      // Sample the brightness field
      const imageData = offCtx.getImageData(0, 0, W, H);
      const pxData = imageData.data;

      // Update rain
      for (let c = 0; c < cols; c++) {
        rainY[c] += rainSpeed[c];
        if (rainY[c] >= rows) rainY[c] = -Math.random() * 12;
        const ry = Math.floor(rainY[c]);
        if (ry >= 0 && ry < rows) {
          const idx = ry * cols + c;
          charGrid[idx] = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
          charAge[idx] = 0;
        }
      }

      // Ambient character cycling
      if (tick % 3 === 0) {
        const numCycles = Math.floor(gridSize * 0.002);
        for (let i = 0; i < numCycles; i++) {
          const idx = Math.floor(Math.random() * gridSize);
          charGrid[idx] = ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
          charAge[idx] = Math.floor(Math.random() * 20);
        }
      }

      // ---- Render ----
      ctx.textBaseline = "top";
      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        for (let c = 0; c < cols; c++) {
          const px = c * charW;
          const idx = r * cols + c;

          // Sample brightness field
          const sx = Math.min(W - 1, Math.floor(px + charW * 0.5));
          const sy = Math.min(H - 1, Math.floor(py + charH * 0.5));
          const pi = (sy * W + sx) * 4;
          const pr = pxData[pi] || 0;
          const pg = pxData[pi + 1] || 0;
          const pb = pxData[pi + 2] || 0;
          const pa = pxData[pi + 3] || 0;

          const brightness = (pr * 0.3 + pg * 0.59 + pb * 0.11); // luminance
          const isAgent = pa > 15 && (pr > 5 || pg > 5 || pb > 5);

          let alpha: number;
          let glow = 0;
          let charToUse: string;

          if (isAgent && brightness > 30) {
            // BRIGHT agent area — map brightness to character weight
            const normalizedBright = Math.min(1, brightness / 255);
            const weightIndex = Math.min(NUM_LEVELS - 1, Math.floor(normalizedBright * NUM_LEVELS));
            const chars = WEIGHT_LEVELS[weightIndex];
            charToUse = chars[Math.floor(Math.random() * chars.length)];

            alpha = 0.3 + normalizedBright * 0.7;
            glow = normalizedBright * 12;

            // Cycle characters faster in bright areas
            if (tick % 2 === 0 && Math.random() > 0.3) {
              charGrid[idx] = charToUse;
            } else {
              charToUse = charGrid[idx];
              // Still re-pick weight-appropriate char periodically
              if (tick % 5 === 0) charGrid[idx] = chars[Math.floor(Math.random() * chars.length)];
            }
          } else if (isAgent && brightness <= 30) {
            // DARK suit area — nearly invisible negative space
            continue; // skip rendering entirely for clean negative space
          } else {
            // Background — subtle ambient rain
            charAge[idx]++;
            const freshness = Math.max(0, 1 - charAge[idx] / 50);
            alpha = 0.025 + freshness * 0.09;
            charToUse = charGrid[idx];

            // Rain head
            const ry = Math.floor(rainY[c]);
            if (r === ry) {
              alpha = 0.22;
              glow = 2;
            } else if (r === ry - 1) {
              alpha = 0.1;
            }
          }

          if (alpha < 0.01) continue;

          if (glow > 1) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = glow;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = `rgba(0, 255, 65, ${Math.min(1, alpha)})`;
          ctx.fillText(charToUse, px, py);
        }
      }

      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default MatrixAgents;
