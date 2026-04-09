import { useEffect, useRef } from "react";

/**
 * Dense typographic silhouette rendering.
 * Characters form agent shapes through brightness contrast:
 * - Suit body = near-invisible (negative space)
 * - Face/shirt/hands = bright, heavy, rapidly cycling multilingual glyphs
 * - Background = subtle dim rain
 * 
 * Inspired by pretext's multilingual corpus density.
 */

// Multilingual character pools by visual weight
const LIGHT = "·.·:;·.·,·.·";
const MEDIUM = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ01234567";
const HEAVY = "故鄉祝福羅生門蜘蛛糸운수좋은날소나기เวตาลالغفرانईदगाह█▓▒ΩΣΔΨ■●◆★#@%&";
const BRIGHT = "█████▓▓▓▒▒###@@@ΩΩΣΣΔΔ●●■■★★◆◆";

const ALL = LIGHT + MEDIUM + HEAVY;
const allArr = [...ALL];
const heavyArr = [...HEAVY];
const brightArr = [...BRIGHT];
const medArr = [...MEDIUM];
const lightArr = [...LIGHT];

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

interface AgentData {
  x: number;
  speed: number;
  phase: number;
  phaseSpeed: number;
  scale: number;
  depth: number; // 0-1, affects size/brightness
}

/**
 * Draw detailed agent silhouette onto offscreen canvas.
 * Uses distinct brightness levels:
 * - White (255) = face, hands
 * - Light gray (200) = shirt/collar  
 * - Medium gray (120) = fedora, tie
 * - Dark (30) = suit body (negative space)
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

  // === SUIT BODY (dark = negative space) ===
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

  // Shoulders + Torso
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

  // Left leg
  ctx.beginPath();
  ctx.moveTo(-s * 24, -s * 40);
  ctx.lineTo(-s * 4, -s * 40);
  ctx.lineTo(-s * 2 - legSwing, s * 10);
  ctx.lineTo(-s * 24 - legSwing, s * 12);
  ctx.closePath();
  ctx.fill();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(s * 4, -s * 40);
  ctx.lineTo(s * 24, -s * 40);
  ctx.lineTo(s * 24 + legSwing, s * 10);
  ctx.lineTo(s * 2 + legSwing, s * 12);
  ctx.closePath();
  ctx.fill();

  // Shoes
  ctx.beginPath();
  ctx.ellipse(-s * 14 - legSwing, s * 14, s * 16, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 14 + legSwing, s * 14, s * 16, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // === BRIGHT: Face ===
  ctx.fillStyle = "rgb(255, 255, 255)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 153, s * 15, s * 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // === BRIGHT: Shirt (V-shape between lapels) ===
  ctx.fillStyle = "rgb(220, 220, 220)";
  ctx.beginPath();
  ctx.moveTo(-s * 12, -s * 130);
  ctx.lineTo(s * 12, -s * 130);
  ctx.lineTo(s * 8, -s * 45);
  ctx.lineTo(-s * 8, -s * 45);
  ctx.closePath();
  ctx.fill();

  // === BRIGHT: Hands ===
  ctx.fillStyle = "rgb(240, 240, 240)";
  ctx.beginPath();
  ctx.ellipse(-s * 54 + armSwing, -s * 45, s * 7, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 54 - armSwing, -s * 45, s * 7, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // === MEDIUM: Fedora detail ===
  ctx.fillStyle = "rgb(120, 120, 120)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 195, s * 24, s * 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Brim edge
  ctx.fillStyle = "rgb(100, 100, 100)";
  ctx.beginPath();
  ctx.ellipse(0, -s * 175, s * 42, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // === MEDIUM: Tie ===
  ctx.fillStyle = "rgb(110, 110, 110)";
  ctx.beginPath();
  ctx.moveTo(-s * 4, -s * 128);
  ctx.lineTo(s * 4, -s * 128);
  ctx.lineTo(s * 3, -s * 48);
  ctx.lineTo(0, -s * 42);
  ctx.lineTo(-s * 3, -s * 48);
  ctx.closePath();
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

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreen.width = W;
      offscreen.height = H;
    };

    const offscreen = document.createElement("canvas");
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext("2d", { alpha: false })!;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    window.addEventListener("resize", resize);

    // Character grid sizing
    const fontSize = Math.max(9, Math.min(13, Math.floor(W / 100)));
    const cW = fontSize * 0.62;
    const cH = fontSize * 1.1;
    const cols = Math.ceil(W / cW) + 1;
    const rows = Math.ceil(H / cH) + 1;
    const gridSize = cols * rows;

    // Per-cell state
    const grid: string[] = new Array(gridSize);
    const age: number[] = new Array(gridSize);
    for (let i = 0; i < gridSize; i++) {
      grid[i] = pick(allArr);
      age[i] = Math.floor(Math.random() * 60);
    }

    // Rain drops
    const rainY: number[] = new Array(cols);
    const rainSpd: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      rainY[c] = Math.random() * rows;
      rainSpd[c] = 0.06 + Math.random() * 0.2;
    }

    // Agents — start off-screen left, walk right
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

    let tick = 0;

    const draw = () => {
      tick++;

      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Draw agent brightness field to offscreen
      offCtx.fillStyle = "#000";
      offCtx.fillRect(0, 0, W, H);

      for (const agent of agents) {
        agent.phase += agent.phaseSpeed;
        agent.x += agent.speed;
        if (agent.x > W + 400) {
          agent.x = -350 - Math.random() * 250;
        }
        drawAgent(offCtx, agent.x, H * 0.8, agent.scale, agent.phase);
      }

      // Read brightness field
      const imgData = offCtx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // Update rain
      for (let c = 0; c < cols; c++) {
        rainY[c] += rainSpd[c];
        if (rainY[c] >= rows) rainY[c] = -Math.random() * 10;
        const ry = Math.floor(rainY[c]);
        if (ry >= 0 && ry < rows) {
          const idx = ry * cols + c;
          grid[idx] = pick(allArr);
          age[idx] = 0;
        }
      }

      // Cycle some chars
      if (tick % 2 === 0) {
        const n = Math.floor(gridSize * 0.003);
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(Math.random() * gridSize);
          grid[idx] = pick(allArr);
          age[idx] = Math.floor(Math.random() * 15);
        }
      }

      // Render character grid
      ctx.textBaseline = "top";
      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      for (let r = 0; r < rows; r++) {
        const py = r * cH;
        for (let c = 0; c < cols; c++) {
          const pxX = c * cW;
          const idx = r * cols + c;

          // Sample brightness at center of this cell
          const sx = Math.min(W - 1, Math.floor(pxX + cW * 0.5));
          const sy = Math.min(H - 1, Math.floor(py + cH * 0.5));
          const pi = (sy * W + sx) * 4;
          const red = px[pi] || 0;
          const brightness = red; // grayscale, so R≈G≈B

          let alpha: number;
          let glow: number;
          let ch: string;

          if (brightness > 180) {
            // BRIGHT area: face, hands — dense bright heavy glyphs, rapidly cycling
            ch = tick % 3 === 0 ? pick(brightArr) : grid[idx];
            if (tick % 3 === 0) grid[idx] = ch;
            alpha = 0.85 + (brightness / 255) * 0.15;
            glow = 8 + (brightness / 255) * 10;
          } else if (brightness > 100) {
            // MEDIUM: shirt, fedora, tie
            ch = tick % 4 === 0 ? pick(heavyArr) : grid[idx];
            if (tick % 4 === 0) grid[idx] = ch;
            alpha = 0.4 + ((brightness - 100) / 155) * 0.45;
            glow = 3 + ((brightness - 100) / 155) * 6;
          } else if (brightness > 20) {
            // SUIT: dark negative space — very dim, sparse
            ch = grid[idx];
            alpha = 0.015;
            glow = 0;
          } else {
            // BACKGROUND: subtle rain
            age[idx]++;
            const freshness = Math.max(0, 1 - age[idx] / 45);
            alpha = 0.02 + freshness * 0.07;
            glow = 0;
            ch = grid[idx];

            // Rain head glow
            const ry = Math.floor(rainY[c]);
            if (r === ry) {
              alpha = 0.18;
              glow = 2;
            } else if (r === ry - 1) {
              alpha = 0.08;
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
          ctx.fillText(ch, pxX, py);
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
