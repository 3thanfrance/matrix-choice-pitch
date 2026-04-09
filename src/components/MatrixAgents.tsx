import { useEffect, useRef } from "react";

/**
 * Pretext-inspired dense character canvas with high-detail walking agent silhouettes.
 * Uses an offscreen canvas to draw detailed vector silhouettes, then samples
 * brightness at each character grid position to create typographic art.
 * Suits = negative space (invisible), faces/shirts = bright glowing characters.
 */

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&";
const BRIGHT_CHARS = "01アカサタナハマヤラワ#%&MATRIX";

interface Agent {
  x: number;
  speed: number;
  walkPhase: number;
  scale: number;
  depth: number;
}

/**
 * Draw a detailed man-in-suit silhouette onto a canvas context.
 * Uses three "layers":
 *  - Full body silhouette in black (the suit = negative space)
 *  - Face/neck/hands in white (bright characters)
 *  - Shirt + tie strip in white (bright characters)
 *  - Fedora brim in gray (medium brightness)
 */
function drawAgent(
  ctx: CanvasOffscreenContext,
  cx: number,
  groundY: number,
  scale: number,
  walkPhase: number
) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, groundY);

  // ---- FULL BODY SILHOUETTE (black = suit = negative space) ----
  ctx.fillStyle = "#000000";
  ctx.beginPath();

  // Fedora
  const hatTop = -s * 195;
  const hatBrim = -s * 170;
  const headTop = -s * 168;

  // Fedora crown
  ctx.ellipse(0, hatTop + s * 12, s * 22, s * 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fedora brim
  ctx.beginPath();
  ctx.ellipse(0, hatBrim, s * 38, s * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.ellipse(0, headTop + s * 20, s * 18, s * 22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.beginPath();
  ctx.fillRect(-s * 7, -s * 128, s * 14, s * 14);

  // Torso (suit jacket) - broad shoulders tapering to waist
  ctx.beginPath();
  ctx.moveTo(-s * 42, -s * 115);
  ctx.lineTo(s * 42, -s * 115);
  ctx.lineTo(s * 38, -s * 50);
  ctx.lineTo(s * 30, -s * 45);
  ctx.lineTo(s * 25, -s * 42);
  ctx.lineTo(-s * 25, -s * 42);
  ctx.lineTo(-s * 30, -s * 45);
  ctx.lineTo(-s * 38, -s * 50);
  ctx.closePath();
  ctx.fill();

  // Arms
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-s * 42, -s * 115);
  ctx.lineTo(-s * 52, -s * 110);
  ctx.lineTo(-s * 50 + Math.sin(walkPhase) * s * 4, -s * 55);
  ctx.lineTo(-s * 42 + Math.sin(walkPhase) * s * 3, -s * 50);
  ctx.lineTo(-s * 38, -s * 60);
  ctx.closePath();
  ctx.fill();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(s * 42, -s * 115);
  ctx.lineTo(s * 52, -s * 110);
  ctx.lineTo(s * 50 - Math.sin(walkPhase) * s * 4, -s * 55);
  ctx.lineTo(s * 42 - Math.sin(walkPhase) * s * 3, -s * 50);
  ctx.lineTo(s * 38, -s * 60);
  ctx.closePath();
  ctx.fill();

  // Legs
  const legSpread = Math.sin(walkPhase) * s * 12;

  // Left leg
  ctx.beginPath();
  ctx.moveTo(-s * 18, -s * 42);
  ctx.lineTo(-s * 5, -s * 42);
  ctx.lineTo(-s * 3 - legSpread, s * 2);
  ctx.lineTo(-s * 12 - legSpread, s * 5); // shoe
  ctx.lineTo(-s * 20 - legSpread, s * 2);
  ctx.closePath();
  ctx.fill();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(s * 5, -s * 42);
  ctx.lineTo(s * 18, -s * 42);
  ctx.lineTo(s * 20 + legSpread, s * 2);
  ctx.lineTo(s * 12 + legSpread, s * 5); // shoe
  ctx.lineTo(s * 3 + legSpread, s * 2);
  ctx.closePath();
  ctx.fill();

  // Shoes (thicker at bottom)
  ctx.beginPath();
  ctx.ellipse(-s * 14 - legSpread, s * 4, s * 12, s * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 14 + legSpread, s * 4, s * 12, s * 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- BRIGHT AREAS (white = visible characters) ----

  // Face
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(0, headTop + s * 22, s * 14, s * 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Shirt strip (between lapels)
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(-s * 8, -s * 128);
  ctx.lineTo(s * 8, -s * 128);
  ctx.lineTo(s * 6, -s * 42);
  ctx.lineTo(-s * 6, -s * 42);
  ctx.closePath();
  ctx.fill();

  // Tie (darker strip on shirt)
  ctx.fillStyle = "#999999";
  ctx.beginPath();
  ctx.moveTo(-s * 3, -s * 125);
  ctx.lineTo(s * 3, -s * 125);
  ctx.lineTo(s * 2, -s * 48);
  ctx.lineTo(0, -s * 44);
  ctx.lineTo(-s * 2, -s * 48);
  ctx.closePath();
  ctx.fill();

  // Hands (small bright spots at end of arms)
  ctx.fillStyle = "#DDDDDD";
  ctx.beginPath();
  ctx.ellipse(
    -s * 49 + Math.sin(walkPhase) * s * 3,
    -s * 52,
    s * 5, s * 4, 0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(
    s * 49 - Math.sin(walkPhase) * s * 3,
    -s * 52,
    s * 5, s * 4, 0, 0, Math.PI * 2
  );
  ctx.fill();

  // ---- FEDORA (medium brightness — structured) ----
  ctx.fillStyle = "#888888";
  ctx.beginPath();
  ctx.ellipse(0, hatTop + s * 12, s * 21, s * 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fedora brim highlight
  ctx.fillStyle = "#666666";
  ctx.beginPath();
  ctx.ellipse(0, hatBrim, s * 37, s * 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hat band (dark line)
  ctx.fillStyle = "#000000";
  ctx.fillRect(-s * 20, hatTop + s * 22, s * 40, s * 3);

  ctx.restore();
}

type CanvasOffscreenContext = CanvasRenderingContext2D;

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
    };
    resize();
    window.addEventListener("resize", resize);

    // Character grid parameters
    const fontSize = Math.max(8, Math.min(11, Math.floor(W / 140)));
    const charW = fontSize * 0.62;
    const charH = fontSize * 1.15;

    // Offscreen canvas for silhouette sampling
    const offscreen = document.createElement("canvas");
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext("2d")!;

    // Agents
    const numAgents = Math.max(2, Math.min(4, Math.floor(W / 350)));
    const agents: Agent[] = [];
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.3 + Math.random() * 0.7;
      agents.push({
        x: -200 - Math.random() * W * 0.6,
        speed: 0.6 + depth * 1.0,
        walkPhase: Math.random() * Math.PI * 2,
        scale: 0.6 + depth * 1.0,
        depth,
      });
    }
    agents.sort((a, b) => a.depth - b.depth);

    // Per-column rain state
    const cols = Math.ceil(W / charW);
    const rows = Math.ceil(H / charH);
    const charGrid: string[] = new Array(cols * rows);
    const charAge: number[] = new Array(cols * rows);
    for (let i = 0; i < charGrid.length; i++) {
      charGrid[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
      charAge[i] = Math.random() * 100;
    }

    // Rain drops
    const rainY: number[] = new Array(cols);
    const rainSpeed: number[] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      rainY[c] = Math.random() * rows;
      rainSpeed[c] = 0.15 + Math.random() * 0.35;
    }

    let tick = 0;

    const draw = () => {
      tick++;

      // Clear main canvas with heavy trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
      ctx.fillRect(0, 0, W, H);

      // ---- Draw agents to offscreen for sampling ----
      offCtx.clearRect(0, 0, W, H);
      agents.forEach((agent) => {
        agent.walkPhase += 0.04 * agent.speed;
        agent.x += agent.speed;
        if (agent.x > W + 300) {
          agent.x = -250 - Math.random() * 400;
          agent.depth = 0.3 + Math.random() * 0.7;
          agent.scale = 0.6 + agent.depth * 1.0;
          agent.speed = 0.6 + agent.depth * 1.0;
        }
        drawAgent(offCtx, agent.x, H * 0.78, agent.scale, agent.walkPhase);
      });

      // Sample the offscreen canvas
      const imageData = offCtx.getImageData(0, 0, W, H);
      const pixels = imageData.data;

      // Update rain
      for (let c = 0; c < cols; c++) {
        rainY[c] += rainSpeed[c];
        if (rainY[c] >= rows) rainY[c] = -Math.random() * 8;
        const ry = Math.floor(rainY[c]);
        if (ry >= 0 && ry < rows) {
          const idx = ry * cols + c;
          charGrid[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
          charAge[idx] = 0;
        }
      }

      // Random character cycling for ambient texture
      if (tick % 2 === 0) {
        const numCycles = Math.floor(cols * rows * 0.003);
        for (let i = 0; i < numCycles; i++) {
          const idx = Math.floor(Math.random() * charGrid.length);
          charGrid[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      // ---- Render character grid ----
      ctx.textBaseline = "top";
      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      for (let r = 0; r < rows; r++) {
        const py = r * charH;
        for (let c = 0; c < cols; c++) {
          const px = c * charW;
          const idx = r * cols + c;

          // Sample offscreen pixel at center of this character cell
          const sx = Math.floor(px + charW / 2);
          const sy = Math.floor(py + charH / 2);
          const pi = (sy * W + sx) * 4;
          const pr = pixels[pi] || 0;     // R
          const pg = pixels[pi + 1] || 0; // G
          const pb = pixels[pi + 2] || 0; // B
          const pa = pixels[pi + 3] || 0; // A

          // Determine character brightness based on silhouette
          let alpha: number;
          let glow = 0;
          let charToUse = charGrid[idx];

          if (pa > 10) {
            // Inside agent area
            const brightness = (pr + pg + pb) / 3;

            if (brightness > 200) {
              // Bright area: face, shirt, hands
              alpha = 0.7 + (brightness / 255) * 0.3;
              glow = 6 + (brightness / 255) * 10;
              // Use brighter character set, cycle faster
              if (tick % 2 === 0 && Math.random() > 0.4) {
                charGrid[idx] = BRIGHT_CHARS[Math.floor(Math.random() * BRIGHT_CHARS.length)];
                charToUse = charGrid[idx];
              }
            } else if (brightness > 80) {
              // Medium: fedora, tie
              alpha = 0.25 + (brightness / 255) * 0.35;
              glow = 2 + (brightness / 255) * 4;
              if (tick % 4 === 0 && Math.random() > 0.6) {
                charGrid[idx] = CHARS[Math.floor(Math.random() * CHARS.length)];
                charToUse = charGrid[idx];
              }
            } else {
              // Dark: suit body = negative space
              alpha = 0.008;
              glow = 0;
            }
          } else {
            // Background — subtle ambient rain
            charAge[idx]++;
            const freshness = Math.max(0, 1 - charAge[idx] / 60);
            alpha = 0.03 + freshness * 0.12;

            // Rain head glow
            const ry = Math.floor(rainY[c]);
            if (r === ry) {
              alpha = 0.3;
              glow = 3;
            } else if (r === ry - 1) {
              alpha = 0.15;
              glow = 1;
            }
          }

          if (alpha < 0.005) continue;

          if (glow > 0) {
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
