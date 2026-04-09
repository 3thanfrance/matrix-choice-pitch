import { useEffect, useRef } from "react";

/**
 * Matrix-style falling code with walking men-in-suits silhouettes.
 * The suits are "negative space" (dark/empty), while the shirt, face,
 * and fedora are formed by bright falling characters — creating the
 * typographic ASCII art effect inspired by Pretext demos.
 */

// High-detail agent bitmap (24 wide x 40 tall)
// '#' = bright chars (face, shirt, hands)
// '@' = suit (very dim / negative space)
// '^' = fedora (medium bright, structured)
// '.' = empty
const AGENT_BITMAP = [
  // Fedora
  "........^^^^^^^^........",
  ".......^^^^^^^^^^.......","......^^^^^^^^^^^^......",
  ".....^^^^^^^^^^^^^^.....","....^^^^^^^^^^^^^^^^....",
  "....==================..",
  // Head (face = bright)
  ".......########.........",
  "......##########........",
  "......##########........",
  ".......########.........",
  "........######..........",
  // Neck
  "........####............",
  // Shoulders + suit jacket + shirt
  "....@@@@####@@@@........",
  "...@@@@@####@@@@@.......",
  "..@@@@@@####@@@@@@......",
  ".@@@@@@@####@@@@@@@.....",
  ".@@@@@@@####@@@@@@@.....",
  "@@@@@@@@####@@@@@@@@....",
  "@@@@@@@@.##.@@@@@@@@....",
  "@@@@@@@..##..@@@@@@@....",
  "@@@@@@@..##..@@@@@@@....",
  "@@@@@@...##...@@@@@@....",
  // Waist
  "..@@@@@..##..@@@@@......",
  "..@@@@@..##..@@@@@......",
  "...@@@@..##..@@@@.......",
  // Legs (suit pants = dark)
  "...@@@@......@@@@.......",
  "...@@@@......@@@@.......",
  "...@@@@......@@@@.......",
  "...@@@@......@@@@.......",
  "..@@@@@......@@@@@......",
  "..@@@@@......@@@@@......",
  "..@@@@@......@@@@@......",
  // Shoes
  "..@@@@@......@@@@@......",
  ".@@@@@@......@@@@@@.....",
];

// Second walking frame — legs shifted
const AGENT_BITMAP_2 = [
  // Fedora (same)
  "........^^^^^^^^........",
  ".......^^^^^^^^^^.......","......^^^^^^^^^^^^......",
  ".....^^^^^^^^^^^^^^.....","....^^^^^^^^^^^^^^^^....",
  "....==================..",
  // Head
  ".......########.........",
  "......##########........",
  "......##########........",
  ".......########.........",
  "........######..........",
  // Neck
  "........####............",
  // Shoulders + suit jacket + shirt
  "....@@@@####@@@@........",
  "...@@@@@####@@@@@.......",
  "..@@@@@@####@@@@@@......",
  ".@@@@@@@####@@@@@@@.....",
  ".@@@@@@@####@@@@@@@.....",
  "@@@@@@@@####@@@@@@@@....",
  "@@@@@@@@.##.@@@@@@@@....",
  "@@@@@@@..##..@@@@@@@....",
  "@@@@@@@..##..@@@@@@@....",
  "@@@@@@...##...@@@@@@....",
  // Waist
  "..@@@@@..##..@@@@@......",
  "..@@@@@..##..@@@@@......",
  "...@@@@..##..@@@@.......",
  // Legs shifted
  "....@@@......@@@@@......",
  "....@@@......@@@@@......",
  ".....@@......@@@@@@.....",
  ".....@@......@@@@@@.....",
  "....@@@......@@@@@......",
  "...@@@@......@@@@.......",
  "...@@@@......@@@@.......",
  // Shoes
  "..@@@@@......@@@@@......",
  "@@@@@@........@@@@@@....",
];

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
const BRIGHT_CHARS = "01アカサタナハマヤラワ#%&@MATRIX";

interface Agent {
  x: number;
  speed: number;
  frame: number;
  frameTimer: number;
  scale: number;
  depth: number; // 0=far, 1=close — affects brightness
}

const MatrixAgents = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = Math.max(10, Math.min(14, Math.floor(window.innerWidth / 100)));
    const columns = Math.floor(canvas.width / fontSize);
    const rows = Math.floor(canvas.height / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -rows);

    // Spawn agents at staggered positions walking left-to-right
    const agents: Agent[] = [];
    const numAgents = Math.max(2, Math.min(5, Math.floor(window.innerWidth / 300)));
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.3 + Math.random() * 0.7;
      agents.push({
        x: -200 - Math.random() * canvas.width * 0.8,
        speed: 0.8 + depth * 1.5,
        frame: 0,
        frameTimer: 0,
        scale: 0.5 + depth * 0.8,
        depth,
      });
    }
    // Sort by depth so far agents render first
    agents.sort((a, b) => a.depth - b.depth);

    // Build pixel map: returns map of "col,row" -> type ('#'=bright, '@'=suit, '^'=fedora)
    const getAgentPixels = (agent: Agent): Map<string, string> => {
      const pixels = new Map<string, string>();
      const bitmap = agent.frame % 2 === 0 ? AGENT_BITMAP : AGENT_BITMAP_2;
      const bitmapH = bitmap.length;
      const bitmapW = bitmap[0].length;

      const baseY = Math.floor((rows - bitmapH * agent.scale) / 2);
      const baseX = Math.floor(agent.x / fontSize);

      for (let r = 0; r < bitmapH; r++) {
        for (let c = 0; c < bitmapW; c++) {
          const ch = bitmap[r][c];
          if (ch === ".") continue;
          const col = baseX + Math.floor(c * agent.scale);
          const row = baseY + Math.floor(r * agent.scale);
          if (col >= 0 && col < columns && row >= 0 && row < rows) {
            pixels.set(`${col},${row}`, ch);
          }
        }
      }
      return pixels;
    };

    const draw = () => {
      // Fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Build combined agent pixel map
      const agentPixels = new Map<string, { type: string; depth: number }>();
      agents.forEach((agent) => {
        agent.frameTimer++;
        if (agent.frameTimer % 15 === 0) {
          agent.frame = (agent.frame + 1) % 2;
        }
        agent.x += agent.speed;
        if (agent.x > canvas.width + 300) {
          agent.x = -300 - Math.random() * 400;
          agent.depth = 0.3 + Math.random() * 0.7;
          agent.scale = 0.5 + agent.depth * 0.8;
          agent.speed = 0.8 + agent.depth * 1.5;
        }
        const pixels = getAgentPixels(agent);
        pixels.forEach((type, key) => {
          agentPixels.set(key, { type, depth: agent.depth });
        });
      });

      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      // Draw rain columns
      for (let i = 0; i < drops.length; i++) {
        if (drops[i] < 0) {
          drops[i] += 0.2 + Math.random() * 0.2;
          continue;
        }

        const row = Math.floor(drops[i]);
        const key = `${i},${row}`;
        const agentInfo = agentPixels.get(key);

        if (agentInfo) {
          const { type, depth } = agentInfo;
          if (type === "#") {
            // Bright face/shirt — dense bright chars
            const char = BRIGHT_CHARS[Math.floor(Math.random() * BRIGHT_CHARS.length)];
            const alpha = 0.7 + depth * 0.3;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 6 + depth * 6;
            ctx.fillText(char, i * fontSize, row * fontSize);
          } else if (type === "^" || type === "=") {
            // Fedora — medium brightness, structured
            const char = type === "=" ? "═" : CHARS[Math.floor(Math.random() * CHARS.length)];
            const alpha = 0.4 + depth * 0.3;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 3;
            ctx.fillText(char, i * fontSize, row * fontSize);
          } else if (type === "@") {
            // Suit = negative space — very dim or nothing
            if (Math.random() > 0.85) {
              const char = CHARS[Math.floor(Math.random() * CHARS.length)];
              ctx.fillStyle = `rgba(0, 255, 65, 0.04)`;
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;
              ctx.fillText(char, i * fontSize, row * fontSize);
            }
          }
        } else {
          // Normal subtle rain
          if (Math.random() > 0.55) {
            const char = CHARS[Math.floor(Math.random() * CHARS.length)];
            ctx.fillStyle = "rgba(0, 255, 65, 0.15)";
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 1;
            ctx.fillText(char, i * fontSize, row * fontSize);
          }
        }

        ctx.shadowBlur = 0;

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.96) {
          drops[i] = Math.random() * -10;
        }
        drops[i] += 0.35;
      }

      // Extra fill pass for bright agent areas (denser)
      agentPixels.forEach((info, key) => {
        if (info.type === "#" && Math.random() > 0.3) {
          const [c, r] = key.split(",").map(Number);
          const char = BRIGHT_CHARS[Math.floor(Math.random() * BRIGHT_CHARS.length)];
          const alpha = 0.5 + info.depth * 0.4;
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 4;
          ctx.fillText(char, c * fontSize, r * fontSize);
          ctx.shadowBlur = 0;
        }
      });
    };

    const interval = setInterval(draw, 45);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0" />;
};

export default MatrixAgents;
