import { useEffect, useRef } from "react";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

declare global {
  interface Window {
    __terminalTextRect?: { x: number; y: number; w: number; h: number };
    __terminalTextLines?: string[];
    __terminalPromptText?: string;
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
      poolY: number;
    };
    const pool: PoolChar[] = [];
    const MAX_POOL = Math.floor(W / (fontSize * 0.35));

    // Offscreen canvas for rendering terminal text (pixel collision mask)
    const textMask = document.createElement("canvas");
    const textMaskCtx = textMask.getContext("2d", { alpha: false })!;

    let maskData: ImageData | null = null;
    let maskW = 0;
    let maskH = 0;
    let lastTextKey = "";
    let prevHadMask = false;

    function updateTextMask() {
      const tr = window.__terminalTextRect;
      const lines = window.__terminalTextLines || [];
      const prompt = window.__terminalPromptText || "";
      if (!tr || tr.w === 0 || (lines.length === 0 && !prompt)) {
        // Text disappeared — clear residual splash/pool
        if (prevHadMask) {
          pool.length = 0;
          particles.length = 0;
          prevHadMask = false;
        }
        maskData = null;
        lastTextKey = "";
        return;
      }

      prevHadMask = true;

      const key = `${tr.x}|${tr.y}|${tr.w}|${tr.h}|${lines.join("\n")}|${prompt}`;
      if (key === lastTextKey) return;
      lastTextKey = key;

      maskW = Math.ceil(tr.w);
      maskH = Math.ceil(tr.h);
      if (maskW < 1 || maskH < 1) { maskData = null; return; }

      textMask.width = maskW;
      textMask.height = maskH;

      textMaskCtx.fillStyle = "#000";
      textMaskCtx.fillRect(0, 0, maskW, maskH);

      const termFontSize = W >= 640 ? 14 : 12;
      const termLineHeight = termFontSize * 1.5;
      const termFont = `${termFontSize}px 'Fira Code', monospace`;

      textMaskCtx.font = termFont;
      textMaskCtx.fillStyle = "#fff";
      textMaskCtx.textAlign = "center";
      textMaskCtx.textBaseline = "top";

      const cx = maskW / 2;
      let y = 0;

      for (const line of lines) {
        if (line.length > 0) {
          textMaskCtx.fillText(line, cx, y);
        }
        y += termLineHeight;
      }

      if (prompt) {
        y += termFontSize * 0.75;
        textMaskCtx.font = `bold ${termFontSize}px 'Fira Code', monospace`;
        textMaskCtx.fillText(prompt, cx, y);
      }

      maskData = textMaskCtx.getImageData(0, 0, maskW, maskH);
    }

    function hitsText(screenX: number, screenY: number): boolean {
      if (!maskData) return false;
      const tr = window.__terminalTextRect;
      if (!tr) return false;

      const lx = Math.floor(screenX - tr.x);
      const ly = Math.floor(screenY - tr.y);

      if (lx < 0 || lx >= maskW || ly < 0 || ly >= maskH) return false;

      const pi = (ly * maskW + lx) * 4;
      return maskData.data[pi] > 80;
    }

    function findTextTopAt(screenX: number, screenY: number): number {
      if (!maskData) return screenY;
      const tr = window.__terminalTextRect;
      if (!tr) return screenY;

      const lx = Math.floor(screenX - tr.x);
      if (lx < 0 || lx >= maskW) return screenY;

      const lyStart = Math.floor(screenY - tr.y);
      for (let ly = lyStart; ly >= 0; ly--) {
        const pi = (ly * maskW + lx) * 4;
        if (maskData.data[pi] <= 80) return tr.y + ly + 1;
      }
      return tr.y;
    }

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

    function spawnSplash(sx: number, sy: number, count: number) {
      for (let s = 0; s < count && particles.length < MAX_PARTICLES; s++) {
        const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
        const speed = 1 + Math.random() * 3;
        particles.push({
          x: sx + (Math.random() - 0.5) * 4,
          y: sy - Math.random() * 2,
          ch: allChars[Math.floor(Math.random() * allChars.length)],
          vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
          vy: Math.sin(angle) * speed,
          alpha: 0.35 + Math.random() * 0.35,
          life: 18 + Math.floor(Math.random() * 25),
          glow: 2 + Math.random() * 3,
        });
      }
    }

    function addToPool(x: number, poolY: number) {
      if (pool.length >= MAX_POOL) return;
      pool.push({
        x: x + (Math.random() - 0.5) * 12,
        ch: allChars[Math.floor(Math.random() * allChars.length)],
        alpha: 0.2 + Math.random() * 0.15,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.015 + Math.random() * 0.025,
        splashY: -1 - Math.random() * 3,
        poolY,
      });
    }

    let tick = 0;
    let maskUpdateCounter = 0;

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, W, H);
      ctx.font = font;
      ctx.textBaseline = "top";

      maskUpdateCounter++;
      if (maskUpdateCounter >= 6) {
        maskUpdateCounter = 0;
        updateTextMask();
      }

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

        // Vertical sweep: check several points along the drop head for text
        // collision so fast drops never "jump over" a glyph in a single frame.
        if (maskData) {
          const steps = Math.max(2, Math.ceil(drop.speed));
          let collidedY: number | null = null;
          for (let s = 0; s <= steps; s++) {
            const checkY = drop.y - s * (drop.speed / steps);
            if (hitsText(x, checkY)) {
              collidedY = checkY;
              break;
            }
          }
          if (collidedY !== null && Math.random() > 0.6) {
            const topY = findTextTopAt(x, collidedY);
            spawnSplash(x, topY, 1 + Math.floor(Math.random() * 2));
          }
        }

        for (let t = 0; t < drop.tailLen; t++) {
          const ty = drop.y - t * lineHeight;
          if (ty < -lineHeight || ty > H) continue;

          // Sample the mask across the glyph's vertical extent so partial
          // overlaps still get dimmed — no more drops shining through text.
          let overText = false;
          if (maskData) {
            for (let dy = 0; dy < lineHeight; dy += 3) {
              if (hitsText(x, ty + dy)) { overText = true; break; }
            }
          }

          const charIdx = (Math.floor(drop.y / lineHeight) + t) % drop.chars.length;
          let ch = drop.chars[charIdx];
          if (t === 0 && tick % 2 === 0) {
            ch = allChars[Math.floor(Math.random() * allChars.length)];
          }

          const fade = 1 - t / drop.tailLen;
          let alpha = t === 0 ? 0.65 : fade * 0.22;
          if (overText) alpha *= 0.08; // hard fade so text stays readable

          if (t < 2 && !overText) {
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = t === 0 ? 8 : 3;
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.fillText(ch, x, ty);
        }

        if (drop.y > H + drop.tailLen * lineHeight) {
          spawnSplash(drop.col * colWidth, H - 8, 2 + Math.floor(Math.random() * 2));
          drop.y = -Math.random() * H * 0.4;
          drop.speed = 1.5 + Math.random() * 3;
        }
      }


      // --- PARTICLES ---
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
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

      // --- POOL (fade faster to avoid residue) ---
      ctx.shadowBlur = 0;
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.wobble += p.wobbleSpeed;
        p.alpha *= 0.996;
        p.splashY *= 0.92;

        if (p.alpha < 0.015) {
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
