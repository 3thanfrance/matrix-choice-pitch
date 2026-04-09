import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

/**
 * Pretext-powered ambient rain + smooth phase/slide transitions.
 *
 * - Falling multilingual text columns with splashes at the bottom
 * - "pretext-scatter" → characters smoothly slide/fade outward (no explosion)
 * - "pretext-coalesce" → characters gently phase in from edges
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
  // For slide transitions: target position and easing
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0→1 easing progress
  duration: number; // total frames
  alpha: number;
  startAlpha: number;
  glow: number;
  mode: "splash" | "slide-out" | "slide-in";
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

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
    const MAX_PARTICLES = 500;

    type PoolChar = {
      x: number; ch: string; alpha: number;
      wobble: number; wobbleSpeed: number;
      splashY: number;
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

    // --- SCATTER: smooth slide-out + fade (not explosive) ---
    const handleScatter = () => {
      const cx = W / 2;
      const cy = H / 2;
      const num = 40 + Math.floor(Math.random() * 20);
      for (let i = 0; i < num && particles.length < MAX_PARTICLES; i++) {
        // Start near center, slide outward smoothly
        const angle = Math.random() * Math.PI * 2;
        const startDist = 20 + Math.random() * 80;
        const endDist = 150 + Math.random() * 250;
        const sx = cx + Math.cos(angle) * startDist;
        const sy = cy + Math.sin(angle) * startDist * 0.3;
        const tx = cx + Math.cos(angle) * endDist;
        const ty = cy + Math.sin(angle) * endDist * 0.4;
        const duration = 60 + Math.floor(Math.random() * 40); // ~1-1.7s
        particles.push({
          x: sx, y: sy, ch: allChars[Math.floor(Math.random() * allChars.length)],
          startX: sx, startY: sy, targetX: tx, targetY: ty,
          progress: 0, duration,
          alpha: 0.6 + Math.random() * 0.3, startAlpha: 0.6 + Math.random() * 0.3,
          glow: 3 + Math.random() * 4,
          mode: "slide-out",
        });
      }
    };

    // --- COALESCE: smooth slide-in from edges ---
    const handleCoalesce = () => {
      const cx = W / 2;
      const cy = H / 2;
      const num = 50 + Math.floor(Math.random() * 30);
      for (let i = 0; i < num && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 300;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist * 0.4;
        // Slide toward center area (not exact center — slight randomness)
        const tx = cx + (Math.random() - 0.5) * 100;
        const ty = cy + (Math.random() - 0.5) * 40;
        const duration = 50 + Math.floor(Math.random() * 40);
        particles.push({
          x: sx, y: sy, ch: allChars[Math.floor(Math.random() * allChars.length)],
          startX: sx, startY: sy, targetX: tx, targetY: ty,
          progress: 0, duration,
          alpha: 0, startAlpha: 0.5 + Math.random() * 0.3,
          glow: 2 + Math.random() * 4,
          mode: "slide-in",
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

        // --- SPLASH at bottom ---
        if (drop.y > H - 25 && drop.y < H + lineHeight) {
          const splashX = drop.col * colWidth;

          const numSplash = 3 + Math.floor(Math.random() * 4);
          for (let s = 0; s < numSplash && particles.length < MAX_PARTICLES; s++) {
            const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
            const speed = 1.5 + Math.random() * 3;
            const vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
            const vy = Math.sin(angle) * speed;
            // Splash particles: use simple arc with gravity via progress-based interpolation
            const duration = 30 + Math.floor(Math.random() * 25);
            particles.push({
              x: splashX, y: H - 8,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              startX: splashX, startY: H - 8,
              targetX: splashX + vx * duration * 0.5,
              targetY: H - 8 + vy * duration * 0.3,
              progress: 0, duration,
              alpha: 0.5 + Math.random() * 0.3, startAlpha: 0.5 + Math.random() * 0.3,
              glow: 3 + Math.random() * 4,
              mode: "splash",
            });
          }

          for (let p = 0; p < 2 && pool.length < MAX_POOL; p++) {
            pool.push({
              x: splashX + (Math.random() - 0.5) * 40,
              ch: allChars[Math.floor(Math.random() * allChars.length)],
              alpha: 0.3 + Math.random() * 0.2,
              wobble: Math.random() * Math.PI * 2,
              wobbleSpeed: 0.015 + Math.random() * 0.025,
              splashY: -3 - Math.random() * 6,
            });
          }

          drop.y = -Math.random() * H * 0.4;
          drop.speed = 1.5 + Math.random() * 3;
          drop.active = Math.random() > 0.1;
        }
      }

      // --- PARTICLES ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += 1 / p.duration;

        if (p.progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        if (p.mode === "slide-out") {
          const ease = easeInOutCubic(p.progress);
          p.x = p.startX + (p.targetX - p.startX) * ease;
          p.y = p.startY + (p.targetY - p.startY) * ease;
          // Fade out smoothly in the second half
          p.alpha = p.startAlpha * (1 - easeOutQuad(p.progress));
        } else if (p.mode === "slide-in") {
          const ease = easeInOutCubic(p.progress);
          p.x = p.startX + (p.targetX - p.startX) * ease;
          p.y = p.startY + (p.targetY - p.startY) * ease;
          // Fade in first half, fade out last 20%
          if (p.progress < 0.5) {
            p.alpha = p.startAlpha * easeOutQuad(p.progress * 2);
          } else if (p.progress > 0.8) {
            p.alpha = p.startAlpha * (1 - easeOutQuad((p.progress - 0.8) / 0.2));
          } else {
            p.alpha = p.startAlpha;
          }
        } else {
          // splash — parabolic arc
          const t = p.progress;
          const ease = easeOutQuad(t);
          p.x = p.startX + (p.targetX - p.startX) * ease;
          // Arc upward then fall
          const arcHeight = -40 * (1 - (2 * t - 1) * (2 * t - 1));
          p.y = p.startY + arcHeight + t * 20;
          p.alpha = p.startAlpha * (1 - t * t);
        }

        if (p.alpha < 0.01) {
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

      // --- BOTTOM POOL ---
      ctx.shadowBlur = 0;
      const basePoolY = H - lineHeight - 6;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.wobble += p.wobbleSpeed;
        p.alpha *= 0.9992;
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
