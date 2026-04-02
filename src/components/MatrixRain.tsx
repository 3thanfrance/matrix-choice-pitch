import { useEffect, useRef } from "react";

const MatrixRain = () => {
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

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -50);

    // Static noise state
    let staticIntensity = 0;
    let staticTarget = 0;
    let staticTimer = 0;

    const draw = () => {
      // Fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Matrix rain — sparse, slow
      ctx.font = `${fontSize}px 'Fira Code', monospace`;
      for (let i = 0; i < drops.length; i++) {
        // Only render ~40% of columns at any time for sparseness
        if (i % 3 !== 0 && drops[i] < 0) continue;

        if (drops[i] >= 0) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          const brightness = Math.random();
          
          if (brightness > 0.7) {
            ctx.fillStyle = "rgba(0, 255, 65, 0.4)";
            ctx.shadowColor = "#00FF41";
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = "rgba(0, 255, 65, 0.15)";
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
          }
          
          ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        }

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
          drops[i] = Math.random() * -20;
        }
        drops[i] += 0.5; // Half speed
      }

      // Green static / noise effect
      staticTimer++;
      if (staticTimer % 60 === 0) {
        staticTarget = Math.random() * 0.03;
      }
      staticIntensity += (staticTarget - staticIntensity) * 0.1;

      if (staticIntensity > 0.005) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const pixelCount = canvas.width * canvas.height;
        const noisePixels = Math.floor(pixelCount * staticIntensity);
        
        for (let n = 0; n < noisePixels; n++) {
          const idx = Math.floor(Math.random() * pixelCount) * 4;
          const val = Math.floor(Math.random() * 60);
          data[idx] = 0;           // R
          data[idx + 1] = val;     // G — green-tinted static
          data[idx + 2] = 0;       // B
          data[idx + 3] = Math.floor(Math.random() * 120); // A
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Occasional bright static burst
      if (Math.random() > 0.997) {
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.random() * 0.04})`;
        const y = Math.random() * canvas.height;
        const h = 1 + Math.random() * 3;
        ctx.fillRect(0, y, canvas.width, h);
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ opacity: 0.35 }}
    />
  );
};

export default MatrixRain;
