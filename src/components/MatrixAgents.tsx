import { useEffect, useRef } from "react";

/**
 * Matrix-style falling code with walking agent silhouettes.
 * Characters are denser/brighter inside the agent shapes,
 * creating a cinematic "men in suits" effect.
 */

// Simple walking figure bitmap (16 wide x 28 tall) — two frames for walk cycle
const AGENT_FRAMES = [
  // Frame 0 — left foot forward
  [
    "      ####      ",
    "     ######     ",
    "     ######     ",
    "      ####      ",
    "       ##       ",
    "    ########    ",
    "   ##########   ",
    "  ## ###### ##  ",
    "     ######     ",
    "     ######     ",
    "     ######     ",
    "     ######     ",
    "      ####      ",
    "      ####      ",
    "      #  #      ",
    "     ##  ##     ",
    "    ##    ##    ",
    "   ##      #    ",
    "   #       #    ",
    "  ##        #   ",
  ],
  // Frame 1 — right foot forward
  [
    "      ####      ",
    "     ######     ",
    "     ######     ",
    "      ####      ",
    "       ##       ",
    "    ########    ",
    "   ##########   ",
    "  ## ###### ##  ",
    "     ######     ",
    "     ######     ",
    "     ######     ",
    "     ######     ",
    "      ####      ",
    "      ####      ",
    "      #  #      ",
    "     ##  ##     ",
    "    ##    ##    ",
    "    #      ##   ",
    "    #       #   ",
    "   #        ##  ",
  ],
];

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";

interface Agent {
  x: number;      // horizontal position in pixels
  speed: number;   // px per frame
  frame: number;   // animation frame
  frameTimer: number;
  scale: number;   // size multiplier (depth effect)
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

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const rows = Math.floor(canvas.height / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -rows);

    // Spawn 3-5 agents walking across at different depths
    const agents: Agent[] = [];
    const numAgents = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAgents; i++) {
      agents.push({
        x: -100 - Math.random() * canvas.width * 0.5,
        speed: 1.5 + Math.random() * 2,
        frame: 0,
        frameTimer: 0,
        scale: 0.8 + Math.random() * 0.6,
      });
    }

    // Build agent mask for each frame — returns set of "col,row" keys
    const getAgentMask = (agent: Agent, frame: number): Set<string> => {
      const mask = new Set<string>();
      const bitmap = AGENT_FRAMES[frame % 2];
      const charW = fontSize;
      const charH = fontSize;
      const agentH = bitmap.length;
      const agentW = bitmap[0].length;

      // Center agent vertically, offset by scale
      const baseY = Math.floor((rows - agentH * agent.scale) / 2);
      const baseX = Math.floor(agent.x / charW);

      for (let r = 0; r < agentH; r++) {
        for (let c = 0; c < agentW; c++) {
          if (bitmap[r][c] === "#") {
            const col = baseX + Math.floor(c * agent.scale);
            const row = baseY + Math.floor(r * agent.scale);
            if (col >= 0 && col < columns && row >= 0 && row < rows) {
              mask.add(`${col},${row}`);
            }
          }
        }
      }
      return mask;
    };

    const draw = () => {
      // Fade
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Build combined agent mask
      const agentPixels = new Set<string>();
      agents.forEach((agent) => {
        agent.frameTimer++;
        if (agent.frameTimer % 12 === 0) {
          agent.frame = (agent.frame + 1) % 2;
        }
        agent.x += agent.speed;
        // Wrap around
        if (agent.x > canvas.width + 200) {
          agent.x = -200 - Math.random() * 300;
          agent.scale = 0.8 + Math.random() * 0.6;
          agent.speed = 1.5 + Math.random() * 2;
        }
        const mask = getAgentMask(agent, agent.frame);
        mask.forEach((k) => agentPixels.add(k));
      });

      ctx.font = `${fontSize}px 'Fira Code', monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (drops[i] < 0) {
          drops[i] += 0.3 + Math.random() * 0.3;
          continue;
        }

        const row = Math.floor(drops[i]);
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const isAgent = agentPixels.has(`${i},${row}`);

        if (isAgent) {
          // Bright, dense characters inside agent silhouette
          ctx.fillStyle = "rgba(0, 255, 65, 0.9)";
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 8;
        } else if (Math.random() > 0.6) {
          ctx.fillStyle = "rgba(0, 255, 65, 0.25)";
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 2;
        } else {
          ctx.fillStyle = "rgba(0, 255, 65, 0.08)";
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, i * fontSize, row * fontSize);

        // Also render dense chars for agent areas even if drop isn't there
        if (!isAgent) {
          // Normal rain behavior
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.96) {
            drops[i] = Math.random() * -10;
          }
          drops[i] += 0.4;
        } else {
          drops[i] += 0.6;
          if (drops[i] * fontSize > canvas.height) {
            drops[i] = Math.random() * -5;
          }
        }
      }

      // Fill in agent silhouettes with extra chars (denser)
      agentPixels.forEach((key) => {
        if (Math.random() > 0.4) {
          const [c, r] = key.split(",").map(Number);
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = `rgba(0, 255, 65, ${0.5 + Math.random() * 0.4})`;
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 6;
          ctx.fillText(char, c * fontSize, r * fontSize);
        }
      });

      ctx.shadowBlur = 0;
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
