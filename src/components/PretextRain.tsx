import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * Pretext-powered ambient rain that interacts with the terminal text block.
 *
 * - Falling multilingual text columns
 * - Rain drops collide with the terminal text block (treated as a physical object)
 *   — splashing off it, pooling on top of it, flowing around it
 * - Splashes at the bottom of the screen
 * - Bottom pool of accumulated wobbling characters
 *
 * The terminal text block rect is communicated via a global:
 *   window.__terminalTextRect = { x, y, w, h }
 */

declare global {
  interface Window {
    __terminalTextRect?: { x: number; y: number; w: number; h: number };
  }
}

const RAIN_CORPUS = [
  "羅生門の下で雨やみを待っていた。蜘蛛の糸。故鄉。祝福。",
  "운수 좋은 날 소나기 흐린 품이 눈이 올 듯하더니",
  "เวตาลครองราชสมบัติอยู่ในพระนคร",
  "الغفران البخلاء الرحمن الرحيم",
  "ईदगाह रमज़ान तैयारियां",
  "מסעות בנימין מטודלה",
  "The Matrix has you. There is no spoon. Free your mind.",
  "SYSTEM BREACH DETECTED. FIREWALL BYPASSED. SIGNAL FOUND.",
  "Wake up. Follow the white rabbit. Knock knock, Neo.",
  "我冒了严寒回到相隔二千余里别了二十余年的故乡去。",
  "တစ်ခါတစ်ရံ ဗျိုင်းငှက်သည် လူတို့အား",
  "ایک دن کی بات ہے کہ ایک شخص اپنے گھر میں",
].join(" ");

const FULL_RAIN = (RAIN_CORPUS + " ").repeat(6);

interface Particle {
  x: number;
  y: number;
  ch: string;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  glow: number;
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

    const prepared = prepareWithSegments(FULL_RAIN, font);
    const layout = layoutWithLines(prepared, W, lineHeight);
    const allChars = Array.from(FULL_RAIN).filter(c => c.trim().length > 0);

    const colWidth = fontSize * 0.7;
    const numCols = Math.ceil(W / colWidth);

    type RainDrop = {
      col: number; y: number; speed: number;
      chars: string[]; tailLen: number; active: boolean;
    };

    const drops: RainDrop[] = [];
    for (let c = 0; c < numCols; c++) {
      if (Math.random() > 0.35) continue;
      const lineIdx = c % layout.lines.length;
      const chars = Array.from(layout.lines[lineIdx].text).filter(ch => ch.trim().length > 0);
      drops.push({
        col: c,
        y: -Math.random() * H * 1.5,
        speed: 1.5 + Math.random() * 3,
        chars: chars.length > 0 ? chars : ['ア'],
        tailLen: 6 + Math.floor(Math.random() * 14),
        active: true,
      });
    }

    const particles: Particle[] = [];
    const MAX_PARTICLES = 600;

    type PoolChar = {
      x: number; ch: string; alpha: number;
      wobble: number; wobbleSpeed: number;
      splashY: number;
      poolY: number; // the Y level this char pools at (text block top or screen bottom)
    };
    const pool: PoolChar[] = [];
    const MAX_POOL = Math.floor(W / (fontSize * 0.35));

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

    /** Spawn splash particles at a collision point */
    function spawnSplash(sx: number, sy: number, count: number, direction: "up" | "sides") {
      for (let s = 0; s < count && particles.length < MAX_PARTICLES; s++) {
        let angle: number, speed: number;
        if (direction === "up") {
          angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
          speed = 1.5 + Math.random() * 3;
        } else {
          // Sides — splash left or right off the text block
          angle = (Math.random() > 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
          speed = 1 + Math.random() * 2.5;
        }
        particles.push({
          x: sx + (Math.random() - 0.5) * 6,
          y: sy - Math.random() * 4,
          ch: allChars[Math.floor(Math.random() * allChars.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 0.4 + Math.random() * 0.4,
          life: 20 + Math.floor(Math.random() * 30),
          glow: 2 + Math.random() * 4,
        });
      }
    }

    /** Add a character to the pool at a given Y level */
    function addToPool(x: number, poolY: number) {
      if (pool.length >= MAX_POOL) return;
      pool.push({
        x: x + (Math.random() - 0.5) * 20,
        ch: allChars[Math.floor(Math.random() * allChars.length)],
        alpha: 0.25 + Math.random() * 0.2,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.025,
        splashY: -2 - Math.random() * 4,
        poolY,
      });
    }

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);
      ctx.font = font;
      ctx.textBaseline = "top";

      // Get the terminal text block rect (if available)
      const tr = window.__terminalTextRect;
      const hasTextBlock = tr && tr.w > 0 && tr.h > 0;

      // --- RAIN DROPS ---
      for (const drop of drops) {
        if (!drop.active) {
          if (Math.random() > 0.997) {
            drop.active = true;
            drop.y = -Math.random() * 100;
          }
          continue;
        }

        drop.y += drop.speed;
        const x = drop.col * colWidth;

        // Check collision with text block
        let hitTextBlock = false;
        if (hasTextBlock) {
          const padding = 8;
          const tbLeft = tr.x - padding;
          const tbRight = tr.x + tr.w + padding;
          const tbTop = tr.y - padding;

          if (x >= tbLeft && x <= tbRight && drop.y >= tbTop && drop.y < tbTop + drop.speed + 4) {
            hitTextBlock = true;
            // Splash upward off the text block
            spawnSplash(x, tbTop, 2 + Math.floor(Math.random() * 3), "up");
            addToPool(x, tbTop - lineHeight);

            // Reset drop
            drop.y = -Math.random() * H * 0.3;
            drop.speed = 1.5 + Math.random() * 3;
            drop.active = Math.random() > 0.08;
          }
        }

        if (hitTextBlock) continue;

        // Draw the rain tail
        for (let t = 0; t < drop.tailLen; t++) {
          const ty = drop.y - t * lineHeight;
          if (ty < -lineHeight || ty > H) continue;

          // Skip drawing tail chars that overlap text block
          if (hasTextBlock) {
            const padding = 8;
            if (x >= tr.x - padding && x <= tr.x + tr.w + padding &&
                ty >= tr.y - padding && ty <= tr.y + tr.h + padding) {
              continue;
            }
          }

          const charIdx = (Math.floor(drop.y / lineHeight) + t) % drop.chars.length;
          let ch = drop.chars[charIdx];
          if (t === 0 && tick % 2 === 0) {
            ch = allChars[Math.floor(Math.random() * allChars.length)];
          }

          const fade = 1 - t / drop.tailLen;
          const alpha = t === 0 ? 0.65 : fade * 0.22;

          if (t < 2) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = t === 0 ? 8 : 3;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.fillText(ch, x, ty);
        }

        // --- SPLASH at bottom ---
        if (drop.y > H - 25 && drop.y < H + lineHeight) {
          const splashX = drop.col * colWidth;
          spawnSplash(splashX, H - 8, 3 + Math.floor(Math.random() * 3), "up");
          addToPool(splashX, H - lineHeight - 6);

          drop.y = -Math.random() * H * 0.4;
          drop.speed = 1.5 + Math.random() * 3;
          drop.active = Math.random() > 0.1;
        }
      }

      // --- PARTICLES ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.98;
        p.life--;
        p.alpha *= 0.96;

        if (p.life <= 0 || p.alpha < 0.01 || p.y > H + 50 || p.x < -50 || p.x > W + 50) {
          particles.splice(i, 1);
          continue;
        }

        if (p.glow > 1 && p.alpha > 0.1) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = p.glow * p.alpha;
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = `rgba(0, 255, 65, ${p.alpha})`;
        ctx.fillText(p.ch, p.x, p.y);
      }

      // --- POOL (on text block top + screen bottom) ---
      ctx.shadowBlur = 0;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.wobble += p.wobbleSpeed;
        p.alpha *= 0.9988;
        p.splashY *= 0.92;

        if (p.alpha < 0.012) {
          pool.splice(i, 1);
          continue;
        }

        const wobbleX = Math.sin(p.wobble) * 2;
        const py = p.poolY + p.splashY;

        if (p.alpha > 0.12) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = 1.5;
        }
        ctx.fillStyle = `rgba(0, 255, 65, ${p.alpha})`;
        ctx.fillText(p.ch, p.x + wobbleX, py);
        ctx.shadowBlur = 0;
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
      style={{ opacity: 0.5 }}
    />
  );
};

export default PretextRain;
