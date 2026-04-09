import { useEffect, useRef } from "react";

/**
 * Pretext-inspired dense character grid with walking agent silhouettes.
 * Every cell on screen has a character. Agents are formed through
 * brightness modulation — suits are negative space (near invisible),
 * faces/shirts are bright glowing characters, creating typographic silhouettes.
 */

// Characters for the grid
const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// High-detail agent bitmap (32 wide × 56 tall)
// '#' = bright (face, shirt, hands, tie)
// '@' = suit (negative space / very dark)
// '^' = fedora (medium-bright, structured)
// '~' = fedora brim shadow
// '.' = transparent (no agent influence)
const AGENT_FRAME_1 = [
  // Fedora top
  "..........^^^^^^^^..........",  // 0
  ".........^^^^^^^^^^.........",  // 1
  "........^^^^^^^^^^^^........",  // 2
  ".......^^^^^^^^^^^^^^.......",  // 3
  "......^^^^^^^^^^^^^^^^......",  // 4
  ".....^^^^^^^^^^^^^^^^^^.....",  // 5
  "....~~~~~~~~~~~~~~~~~~~~....",  // 6
  // Head
  "..........########..........",  // 7
  ".........##########.........",  // 8
  "........############........",  // 9
  "........############........",  // 10
  "........############........",  // 11
  ".........##########.........",  // 12
  "..........########..........",  // 13
  "...........######...........",  // 14
  // Neck + collar
  "...........####.............",  // 15
  "..........######............",  // 16
  // Shoulders + lapels + shirt + tie
  ".....@@@@@##@@##@@@@@.......",  // 17
  "....@@@@@@##@@##@@@@@@......",  // 18
  "...@@@@@@@##@@##@@@@@@@.....",  // 19
  "..@@@@@@@@##@@##@@@@@@@@....",  // 20
  ".@@@@@@@@@#.@@.#@@@@@@@@@...",  // 21
  "@@@@@@@@@@@.@@.@@@@@@@@@@...",  // 22
  "@@@@@@@@@@@.@@.@@@@@@@@@@...",  // 23
  "@@@@@@@@@@..@@..@@@@@@@@@...",  // 24
  "@@@@@@@@@@..@@..@@@@@@@@@...",  // 25
  "@@@@@@@@@...@@...@@@@@@@@...",  // 26
  "@@@@@@@@@...@@...@@@@@@@@...",  // 27
  // Torso / belt
  ".@@@@@@@@...@@...@@@@@@@@...",  // 28
  "..@@@@@@@...@@...@@@@@@@....",  // 29
  "..@@@@@@@...@@...@@@@@@@....",  // 30
  "...@@@@@@...@@...@@@@@@.....",  // 31
  "...@@@@@@........@@@@@@.....",  // 32
  // Upper legs
  "...@@@@@@........@@@@@@.....",  // 33
  "...@@@@@@........@@@@@@.....",  // 34
  "...@@@@@@........@@@@@@.....",  // 35
  "....@@@@@........@@@@@......",  // 36
  "....@@@@@........@@@@@......",  // 37
  // Lower legs
  "....@@@@@........@@@@@......",  // 38
  "....@@@@@........@@@@@......",  // 39
  "....@@@@@........@@@@@......",  // 40
  "...@@@@@@........@@@@@@.....",  // 41
  "...@@@@@@........@@@@@@.....",  // 42
  // Ankles + shoes
  "...@@@@@@........@@@@@@.....",  // 43
  "..@@@@@@@........@@@@@@@....",  // 44
  "..@@@@@@@@......@@@@@@@@....",  // 45
  ".@@@@@@@@@......@@@@@@@@@...",  // 46
];

// Walking frame 2 — legs in stride
const AGENT_FRAME_2 = [
  // Same upper body
  "..........^^^^^^^^..........",
  ".........^^^^^^^^^^.........",
  "........^^^^^^^^^^^^........",
  ".......^^^^^^^^^^^^^^.......",
  "......^^^^^^^^^^^^^^^^......",
  ".....^^^^^^^^^^^^^^^^^^.....",
  "....~~~~~~~~~~~~~~~~~~~~....",
  "..........########..........",
  ".........##########.........",
  "........############........",
  "........############........",
  "........############........",
  ".........##########.........",
  "..........########..........",
  "...........######...........",
  "...........####.............",
  "..........######............",
  ".....@@@@@##@@##@@@@@.......",
  "....@@@@@@##@@##@@@@@@......",
  "...@@@@@@@##@@##@@@@@@@.....",
  "..@@@@@@@@##@@##@@@@@@@@....",
  ".@@@@@@@@@#.@@.#@@@@@@@@@...",
  "@@@@@@@@@@@.@@.@@@@@@@@@@...",
  "@@@@@@@@@@@.@@.@@@@@@@@@@...",
  "@@@@@@@@@@..@@..@@@@@@@@@...",
  "@@@@@@@@@@..@@..@@@@@@@@@...",
  "@@@@@@@@@...@@...@@@@@@@@...",
  "@@@@@@@@@...@@...@@@@@@@@...",
  ".@@@@@@@@...@@...@@@@@@@@...",
  "..@@@@@@@...@@...@@@@@@@....",
  "..@@@@@@@...@@...@@@@@@@....",
  "...@@@@@@...@@...@@@@@@.....",
  "...@@@@@@........@@@@@@.....",
  // Legs in stride
  "....@@@@@........@@@@@@.....",
  ".....@@@@........@@@@@@@....",
  ".....@@@@........@@@@@@@@...",
  "......@@@........@@@@@@@....",
  "......@@@........@@@@@@.....",
  ".....@@@@........@@@@@......",
  "....@@@@@........@@@@.......",
  "...@@@@@@........@@@@.......",
  "...@@@@@@........@@@@@......",
  "..@@@@@@@........@@@@@@.....",
  "..@@@@@@@........@@@@@@.....",
  "@@@@@@@@@.........@@@@@@@...",
  "@@@@@@@@...........@@@@@@...",
  ".@@@@@@..............@@@@@..",
];

interface Agent {
  x: number;
  speed: number;
  frame: number;
  frameTimer: number;
  scale: number;
  depth: number; // 0=far, 1=close
}

interface Cell {
  char: string;
  brightness: number; // 0-1
  glow: number;
  cycleSpeed: number;
  cycleOffset: number;
}

const MatrixAgents = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const fontSize = Math.max(8, Math.min(12, Math.floor(window.innerWidth / 120)));
    const cols = Math.floor(canvas.width / (fontSize * 0.65));
    const rowH = fontSize * 1.1;
    const rows = Math.floor(canvas.height / rowH);

    // Initialize cell grid — every cell has a character
    const grid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = {
          char: CHARS[Math.floor(Math.random() * CHARS.length)],
          brightness: 0.06 + Math.random() * 0.04, // very dim base
          glow: 0,
          cycleSpeed: 0.5 + Math.random() * 2,
          cycleOffset: Math.random() * 1000,
        };
      }
    }

    // Rain drops for ambient character cycling
    const rainDrops: number[] = Array(cols).fill(0).map(() => Math.random() * rows);
    const rainSpeeds: number[] = Array(cols).fill(0).map(() => 0.1 + Math.random() * 0.3);

    // Agents
    const numAgents = Math.max(2, Math.min(5, Math.floor(window.innerWidth / 280)));
    const agents: Agent[] = [];
    for (let i = 0; i < numAgents; i++) {
      const depth = 0.25 + Math.random() * 0.75;
      agents.push({
        x: -300 - Math.random() * canvas.width,
        speed: 0.5 + depth * 1.2,
        frame: Math.floor(Math.random() * 2),
        frameTimer: 0,
        scale: 0.4 + depth * 0.9,
        depth,
      });
    }
    agents.sort((a, b) => a.depth - b.depth);

    const bitmaps = [AGENT_FRAME_1, AGENT_FRAME_2];

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update rain drops — cycle characters along columns
      for (let c = 0; c < cols; c++) {
        rainDrops[c] += rainSpeeds[c];
        if (rainDrops[c] >= rows) rainDrops[c] = -Math.random() * 10;

        const dropRow = Math.floor(rainDrops[c]);
        if (dropRow >= 0 && dropRow < rows) {
          grid[dropRow][c].char = CHARS[Math.floor(Math.random() * CHARS.length)];
          grid[dropRow][c].brightness = Math.min(0.25, grid[dropRow][c].brightness + 0.08);
        }
      }

      // Random character cycling for texture
      if (tick % 2 === 0) {
        for (let i = 0; i < cols * 2; i++) {
          const r = Math.floor(Math.random() * rows);
          const c = Math.floor(Math.random() * cols);
          grid[r][c].char = CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      // Build agent influence map
      const agentMap = new Map<string, { type: string; depth: number }>();

      agents.forEach((agent) => {
        agent.frameTimer++;
        if (agent.frameTimer % 12 === 0) {
          agent.frame = (agent.frame + 1) % 2;
        }
        agent.x += agent.speed;
        if (agent.x > canvas.width + 400) {
          agent.x = -400 - Math.random() * 600;
          agent.depth = 0.25 + Math.random() * 0.75;
          agent.scale = 0.4 + agent.depth * 0.9;
          agent.speed = 0.5 + agent.depth * 1.2;
        }

        const bitmap = bitmaps[agent.frame];
        const bitmapH = bitmap.length;
        const bitmapW = bitmap[0].length;
        const baseCol = Math.floor(agent.x / (fontSize * 0.65));
        const baseRow = Math.floor((rows - bitmapH * agent.scale) * 0.65);

        for (let br = 0; br < bitmapH; br++) {
          for (let bc = 0; bc < bitmapW; bc++) {
            const ch = bitmap[br][bc];
            if (ch === ".") continue;
            const col = baseCol + Math.floor(bc * agent.scale);
            const row = baseRow + Math.floor(br * agent.scale);
            if (col >= 0 && col < cols && row >= 0 && row < rows) {
              const key = `${col},${row}`;
              // Later agents (closer) overwrite earlier ones
              agentMap.set(key, { type: ch, depth: agent.depth });
            }
          }
        }
      });

      // Render every cell
      ctx.textBaseline = "top";
      const charWidth = fontSize * 0.65;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const key = `${c},${r}`;
          const agentInfo = agentMap.get(key);

          let alpha: number;
          let glowAmount = 0;
          let charToRender = cell.char;

          if (agentInfo) {
            const { type, depth } = agentInfo;
            if (type === "#") {
              // Bright area — face, shirt, tie
              alpha = 0.65 + depth * 0.35;
              glowAmount = 4 + depth * 8;
              // Cycle characters faster in bright areas
              if (tick % 3 === 0 && Math.random() > 0.5) {
                cell.char = CHARS[Math.floor(Math.random() * CHARS.length)];
                charToRender = cell.char;
              }
            } else if (type === "^") {
              // Fedora — medium bright
              alpha = 0.35 + depth * 0.3;
              glowAmount = 2 + depth * 4;
            } else if (type === "~") {
              // Fedora brim shadow — slightly brighter than suit
              alpha = 0.15 + depth * 0.15;
              glowAmount = 1;
            } else {
              // '@' — suit — negative space (nearly invisible)
              alpha = 0.015 + depth * 0.01;
              glowAmount = 0;
            }
          } else {
            // Background — very subtle ambient
            alpha = cell.brightness;
            // Decay brightness back to base
            cell.brightness = Math.max(0.04, cell.brightness * 0.97);
          }

          if (alpha < 0.01) continue;

          const x = c * charWidth;
          const y = r * rowH;

          if (glowAmount > 0) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = glowAmount;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }

          ctx.font = `${fontSize}px 'Fira Code', monospace`;
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.fillText(charToRender, x, y);
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
