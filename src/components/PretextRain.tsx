import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * Pretext-powered ambient rain for the pitch phase.
 * 
 * Falling columns of pretext-laid multilingual text that "splash" into
 * horizontally scattered characters at the bottom of the screen.
 * Characters pool and ripple along the bottom edge.
 * 
 * Also provides subtle ambient glow that complements the terminal text.
 */

const RAIN_CORPUS = [
  "羅生門の下で雨やみを待っていた。蜘蛛の糸。故鄉。祝福。",
  "운수 좋은 날 소나기 흐린 품이 눈이 올 듯하더니",
  "เวตาลครองราชสมบัติอยู่ในพระนคร",
  "الغفران البخلاء الرحمن الرحيم",
  "ईदगाह रमज़ान तैयारियां",
  "מסעות בנימין מטודלה",
  "The Matrix has you. There is no spoon. Free your mind.",
  "SYSTEM BREACH DETECTED. FIREWALL BYPASSED. SIGNAL FOUND.",
  "Wake up. The Matrix has you. Follow the white rabbit.",
].join(" ");

const FULL_RAIN = (RAIN_CORPUS + " ").repeat(6);

interface Splash {
  x: number;
  y: number;
  ch: string;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
}

const PretextRain = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const fontSize = 12;
    const lineHeight = Math.ceil(fontSize * 1.2);
    const font = `${fontSize}px 'Fira Code', monospace`;

    // Pretext layout for rain columns
    const prepared = prepareWithSegments(FULL_RAIN, font);
    const layout = layoutWithLines(prepared, W, lineHeight);
    const allChars = Array.from(FULL_RAIN).filter(c => c.trim().length > 0);

    // Rain columns
    const colWidth = fontSize * 0.7;
    const numCols = Math.ceil(W / colWidth);

    interface RainDrop {
      col: number;
      y: number;
      speed: number;
      chars: string[];
      tailLen: number;
      active: boolean;
    }

    const drops: RainDrop[] = [];
    // Initialize sparse drops
    for (let c = 0; c < numCols; c++) {
      if (Math.random() > 0.3) continue; // only 30% of columns active
      // Pick chars from pretext-laid lines
      const lineIdx = c % layout.lines.length;
      const lineText = layout.lines[lineIdx].text;
      const chars = Array.from(lineText).filter(ch => ch.trim().length > 0);

      drops.push({
        col: c,
        y: -Math.random() * H * 1.5,
        speed: 1.2 + Math.random() * 2.5,
        chars: chars.length > 0 ? chars : ['ア'],
        tailLen: 8 + Math.floor(Math.random() * 16),
        active: true,
      });
    }

    // Splash particles at bottom
    const splashes: Splash[] = [];
    const MAX_SPLASHES = 150;

    // Bottom pool — accumulated chars that ripple
    interface PoolChar {
      x: number;
      ch: string;
      alpha: number;
      wobble: number;
      wobbleSpeed: number;
    }
    const pool: PoolChar[] = [];
    const MAX_POOL = Math.floor(W / (fontSize * 0.5));

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let tick = 0;

    const draw = () => {
      tick++;

      // Clear with transparency
      ctx.clearRect(0, 0, W, H);

      ctx.font = font;
      ctx.textBaseline = "top";

      // Draw rain drops
      for (const drop of drops) {
        if (!drop.active) continue;

        drop.y += drop.speed;

        const x = drop.col * colWidth;

        // Draw tail
        for (let t = 0; t < drop.tailLen; t++) {
          const ty = drop.y - t * lineHeight;
          if (ty < -lineHeight || ty > H) continue;

          const charIdx = (Math.floor(drop.y / lineHeight) + t) % drop.chars.length;
          let ch = drop.chars[charIdx];

          // Head char cycles rapidly
          if (t === 0 && tick % 2 === 0) {
            ch = allChars[Math.floor(Math.random() * allChars.length)];
          }

          const fade = 1 - t / drop.tailLen;
          const alpha = t === 0 ? 0.6 : fade * 0.2;

          if (t === 0) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          } else if (t < 3) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 2;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha * 0.7})`;
          }

          ctx.fillText(ch, x, ty);
        }

        // Splash when hitting bottom
        if (drop.y > H - 20 && drop.y < H + lineHeight) {
          const splashX = drop.col * colWidth;
          // Create splash particles
          const numSplash = 2 + Math.floor(Math.random() * 3);
          for (let s = 0; s < numSplash && splashes.length < MAX_SPLASHES; s++) {
            splashes.push({
              x: splashX,
              y: H - 10 - Math.random() * 15,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              vx: (Math.random() - 0.5) * 4,
              vy: -1 - Math.random() * 3,
              alpha: 0.4 + Math.random() * 0.3,
              life: 30 + Math.floor(Math.random() * 40),
            });
          }

          // Add to bottom pool
          if (pool.length < MAX_POOL) {
            pool.push({
              x: splashX + (Math.random() - 0.5) * 20,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              alpha: 0.25 + Math.random() * 0.15,
              wobble: Math.random() * Math.PI * 2,
              wobbleSpeed: 0.02 + Math.random() * 0.03,
            });
          }

          // Reset drop
          drop.y = -Math.random() * H * 0.5;
          drop.speed = 1.2 + Math.random() * 2.5;
          drop.active = Math.random() > 0.15; // some go dormant
        }

        // Reactivate dormant drops occasionally
        if (!drop.active && Math.random() > 0.998) {
          drop.active = true;
          drop.y = -Math.random() * 100;
        }
      }

      // Draw splash particles
      ctx.shadowColor = "#00FF41";
      ctx.shadowBlur = 3;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12; // gravity
        s.life--;
        s.alpha *= 0.96;

        if (s.life <= 0 || s.alpha < 0.01) {
          splashes.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(0, 255, 65, ${s.alpha})`;
        ctx.fillText(s.ch, s.x, s.y);
      }

      // Draw bottom pool — characters that have accumulated, gently wobbling
      ctx.shadowBlur = 1;
      const poolY = H - lineHeight - 4;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.wobble += p.wobbleSpeed;
        p.alpha *= 0.9995; // very slow fade

        if (p.alpha < 0.02) {
          pool.splice(i, 1);
          continue;
        }

        const wobbleX = Math.sin(p.wobble) * 1.5;
        ctx.fillStyle = `rgba(0, 255, 65, ${p.alpha})`;
        ctx.fillText(p.ch, p.x + wobbleX, poolY);
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
};

export default PretextRain;
