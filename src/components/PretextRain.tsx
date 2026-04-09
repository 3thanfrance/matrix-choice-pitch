import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * Pretext-powered ambient rain + scatter/coalesce transitions.
 *
 * - Falling multilingual text columns with BIG splashes at the bottom
 * - Listens for "pretext-scatter" events to burst characters outward
 * - Listens for "pretext-coalesce" events to swirl chars into center
 * - Bottom pool of accumulated, wobbling characters
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

    // Particles: splashes, scatter bursts, coalesce swirls
    const particles: Particle[] = [];
    const MAX_PARTICLES = 500;

    // Bottom pool
    type PoolChar = {
      x: number; ch: string; alpha: number;
      wobble: number; wobbleSpeed: number;
      splashY: number; // vertical offset for splash bounce
    };
    const pool: PoolChar[] = [];
    const MAX_POOL = Math.floor(W / (fontSize * 0.4));

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

    // --- SCATTER EVENT: burst characters outward from center ---
    const handleScatter = () => {
      const cx = W / 2;
      const cy = H / 2;
      const numBurst = 60 + Math.floor(Math.random() * 40);
      for (let i = 0; i < numBurst && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        particles.push({
          x: cx + (Math.random() - 0.5) * 200,
          y: cy + (Math.random() - 0.5) * 60,
          ch: allChars[Math.floor(Math.random() * allChars.length)],
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          alpha: 0.7 + Math.random() * 0.3,
          life: 50 + Math.floor(Math.random() * 50),
          glow: 6 + Math.random() * 8,
        });
      }
    };

    // --- COALESCE EVENT: characters swirl inward to center ---
    const handleCoalesce = () => {
      const cx = W / 2;
      const cy = H / 2;
      const numSwirl = 80 + Math.floor(Math.random() * 40);
      for (let i = 0; i < numSwirl && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 300;
        const startX = cx + Math.cos(angle) * dist;
        const startY = cy + Math.sin(angle) * dist;
        // Velocity toward center with spin
        const toCenter = Math.atan2(cy - startY, cx - startX);
        const speed = 2 + Math.random() * 4;
        const spin = (Math.random() - 0.5) * 3;
        particles.push({
          x: startX,
          y: startY,
          ch: allChars[Math.floor(Math.random() * allChars.length)],
          vx: Math.cos(toCenter + spin * 0.3) * speed,
          vy: Math.sin(toCenter + spin * 0.3) * speed,
          alpha: 0.5 + Math.random() * 0.3,
          life: 40 + Math.floor(Math.random() * 30),
          glow: 4 + Math.random() * 6,
        });
      }
    };

    window.addEventListener("pretext-scatter", handleScatter);
    window.addEventListener("pretext-coalesce", handleCoalesce);

    let tick = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);
      ctx.font = font;
      ctx.textBaseline = "top";

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

        for (let t = 0; t < drop.tailLen; t++) {
          const ty = drop.y - t * lineHeight;
          if (ty < -lineHeight || ty > H) continue;

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

        // --- BIG SPLASH at bottom ---
        if (drop.y > H - 25 && drop.y < H + lineHeight) {
          const splashX = drop.col * colWidth;

          // Splash particles — more, wider, bigger arcs
          const numSplash = 4 + Math.floor(Math.random() * 5);
          for (let s = 0; s < numSplash && particles.length < MAX_PARTICLES; s++) {
            const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7; // upward arc
            const speed = 2 + Math.random() * 5;
            particles.push({
              x: splashX + (Math.random() - 0.5) * 8,
              y: H - 8 - Math.random() * 10,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
              vy: Math.sin(angle) * speed,
              alpha: 0.5 + Math.random() * 0.4,
              life: 25 + Math.floor(Math.random() * 35),
              glow: 3 + Math.random() * 5,
            });
          }

          // Pool accumulation — wider spread
          for (let p = 0; p < 2 && pool.length < MAX_POOL; p++) {
            pool.push({
              x: splashX + (Math.random() - 0.5) * 40,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              alpha: 0.3 + Math.random() * 0.2,
              wobble: Math.random() * Math.PI * 2,
              wobbleSpeed: 0.015 + Math.random() * 0.025,
              splashY: -3 - Math.random() * 6, // initial bounce
            });
          }

          drop.y = -Math.random() * H * 0.4;
          drop.speed = 1.5 + Math.random() * 3;
          drop.active = Math.random() > 0.1;
        }
      }

      // --- PARTICLES (splashes, scatters, coalesces) ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.98; // air resistance
        p.life--;
        p.alpha *= 0.965;

        if (p.life <= 0 || p.alpha < 0.01 || p.y > H + 50 || p.x < -50 || p.x > W + 50) {
          particles.splice(i, 1);
          continue;
        }

        if (p.glow > 1) {
          ctx.shadowColor = "#00FF41";
          ctx.shadowBlur = p.glow * (p.alpha / 0.5);
        } else {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = `rgba(0, 255, 65, ${p.alpha})`;
        ctx.fillText(p.ch, p.x, p.y);
      }

      // --- BOTTOM POOL ---
      ctx.shadowBlur = 0;
      const basePoolY = H - lineHeight - 6;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.wobble += p.wobbleSpeed;
        p.alpha *= 0.9992;
        // Settle splash bounce
        p.splashY *= 0.92;

        if (p.alpha < 0.015) {
          pool.splice(i, 1);
          continue;
        }

        const wobbleX = Math.sin(p.wobble) * 2;
        const py = basePoolY + p.splashY;

        if (p.alpha > 0.15) {
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
      window.removeEventListener("pretext-scatter", handleScatter);
      window.removeEventListener("pretext-coalesce", handleCoalesce);
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
