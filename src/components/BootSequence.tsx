import { useState, useEffect, useRef } from "react";
import { playPowerOn, startCRTHum, playStatic, playKeyClick } from "@/lib/sounds";
import MatrixAgents from "./MatrixAgents";

const BOOT_DURATION = 24000;

const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [flickerClass, setFlickerClass] = useState("opacity-0");
  const [scanlinePos, setScanlinePos] = useState(0);
  const [postLines, setPostLines] = useState<string[]>([]);
  const [loadingPct, setLoadingPct] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const humStopRef = useRef<(() => void) | null>(null);

  // Audio init
  useEffect(() => {
    const startAudio = () => {
      if (!audioStarted) {
        setAudioStarted(true);
        playPowerOn();
        humStopRef.current = startCRTHum();
      }
    };
    startAudio();
    window.addEventListener("click", startAudio, { once: true });
    window.addEventListener("keydown", startAudio, { once: true });
    return () => {
      window.removeEventListener("click", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, [audioStarted]);

  useEffect(() => () => { humStopRef.current?.(); }, []);

  // Phase timeline
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 2000),
      setTimeout(() => setPhase(2), 4000),
      setTimeout(() => setPhase(3), 16000),
      setTimeout(() => setPhase(4), 20000),
      setTimeout(() => setPhase(5), 22500),
      setTimeout(() => onComplete(), BOOT_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Phase 2: Silhouette → zoom → eye → brand text → blink
  useEffect(() => {
    if (phase !== 2) return;
    const timers = [
      setTimeout(() => setShowAgentOverlay(true), 0),
      // Hold silhouette for 2s, then start zoom into eye
      setTimeout(() => {
        (window as any).__matrixZoomStart = Date.now();
      }, 2000),
      // Brand text AFTER zoom completes (2s delay + 4.5s zoom + 0.5s settle)
      setTimeout(() => {
        (window as any).__brandText = { label: "PRESENTED BY", name: "O M N I", startTime: Date.now(), enabledBy: "enabled by lovable" };
      }, 7000),
      // Blink to dismiss brand
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("eye-blink"));
      }, 10500),
      // Clear text while eye is closed
      setTimeout(() => {
        (window as any).__brandText = null;
      }, 11000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      (window as any).__brandText = null;
      (window as any).__matrixZoomStart = undefined;
    };
  }, [phase]);

  // Sound per phase
  useEffect(() => {
    if (phase === 1) playStatic(0.3, 0.1);
    if (phase === 3) playStatic(0.15, 0.05);
    if (phase === 5) playStatic(0.1, 0.04);
  }, [phase]);

  // POST lines
  useEffect(() => {
    if (phase !== 3) return;
    setShowAgentOverlay(false);
    const lines = [
      "BIOS v3.7.1 — OMNI SYSTEMS",
      "MEMORY TEST: 65536K OK",
      "DETECTING PRIMARY DRIVE... OK",
      "NEURAL INTERFACE: ONLINE",
      "ENCRYPTION MODULE: AES-256 LOADED",
      "NETWORK ADAPTER: SCANNING...",
      ">> SIGNAL FOUND: 192.168.1.███",
      "FIREWALL: BYPASSED",
      "LOADING KERNEL... ████████ OK",
      "MOUNTING /SYS/OMNI... OK",
      "SECURE CHANNEL: ESTABLISHED",
    ];
    const timers = lines.map((line, i) =>
      setTimeout(() => {
        setPostLines(prev => [...prev, line]);
        playKeyClick();
      }, i * 280)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Loading bar
  useEffect(() => {
    if (phase !== 4) return;
    const interval = setInterval(() => {
      setLoadingPct(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + Math.floor(Math.random() * 8 + 2);
      });
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  // Flicker
  useEffect(() => {
    if (phase < 1) return;
    if (phase >= 5) { setFlickerClass("opacity-100"); return; }
    const interval = setInterval(() => {
      if (phase === 1) {
        setFlickerClass(Math.random() > 0.4 ? "opacity-100" : "opacity-0");
      } else {
        setFlickerClass(Math.random() > 0.08 ? "opacity-100" : "opacity-70");
      }
    }, phase === 1 ? 60 : 200);
    return () => clearInterval(interval);
  }, [phase]);

  // Scanline
  useEffect(() => {
    const interval = setInterval(() => setScanlinePos(p => (p + 2) % 100), 30);
    return () => clearInterval(interval);
  }, []);

  const clampedPct = Math.min(loadingPct, 100);
  const filled = Math.floor(clampedPct / 4);
  const loadingBar = phase === 4
    ? "█".repeat(filled) + "░".repeat(Math.max(0, 25 - filled))
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden font-mono px-4">
      <div
        className="absolute left-0 right-0 h-1 bg-primary/20 blur-sm pointer-events-none z-20"
        style={{ top: `${scanlinePos}%`, transition: "none" }}
      />

      {phase >= 1 && phase < 5 && (
        <div className="absolute inset-0 pointer-events-none boot-static z-10" />
      )}

      {phase === 1 && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none animate-pulse z-10" />
      )}

      {showAgentOverlay && <MatrixAgents />}

      <div className={`w-full max-w-2xl px-6 transition-opacity duration-75 relative z-30 ${flickerClass}`}>
        {phase === 0 && (
          <div className="text-center">
            <span className="text-primary/20 text-xs cursor-blink">_</span>
          </div>
        )}

        {phase === 1 && (
          <div className="text-center space-y-2 glitch-text">
            <div className="text-primary text-glow text-xs">
              ██████ POWER SURGE DETECTED ██████
            </div>
            <div className="text-muted-foreground text-xs">
              CRT WARMING UP...
            </div>
          </div>
        )}

        {/* Phase 2: MatrixAgents handles all visuals (silhouette → eye → brand) */}
        {phase === 2 && <div />}

        {phase === 3 && (
          <div className="text-left text-xs text-primary/80 space-y-0.5 text-glow max-h-[60vh] overflow-hidden">
            {postLines.map((line, i) => (
              <div key={i} className="line-fade">
                <span className="text-muted-foreground mr-2">&gt;</span>
                {line}
              </div>
            ))}
            <div className="mt-1">
              <span className="cursor-blink text-primary">█</span>
            </div>
          </div>
        )}

        {phase === 4 && (
          <div className="text-center space-y-3">
            <div className="text-xs text-muted-foreground">OMNI TERMINAL v2.049</div>
            <div className="text-sm tracking-[0.3em] font-bold text-primary text-glow">
              INITIALIZING SYSTEM
            </div>
            <div className="text-xs text-primary/70 tracking-wider">
              [{loadingBar}] {clampedPct}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ESTABLISHING ENCRYPTED CHANNEL...
            </div>
          </div>
        )}

        {phase === 5 && (
          <div className="text-center space-y-2">
            <div className="text-xs text-muted-foreground">STATUS:</div>
            <div className="text-primary text-glow text-sm tracking-[0.5em] font-bold animate-pulse">
              C O N N E C T E D
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BootSequence;
