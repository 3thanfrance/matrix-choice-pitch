import { useState, useEffect, useRef } from "react";
import { playPowerOn, startCRTHum, playStatic, playKeyClick, playGlitch } from "@/lib/sounds";
import MatrixAgents from "./MatrixAgents";

const BOOT_DURATION = 24000;

const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [flickerClass, setFlickerClass] = useState("opacity-0");
  const [scanlinePos, setScanlinePos] = useState(0);
  const [postLines, setPostLines] = useState<string[]>([]);
  const [loadingPct, setLoadingPct] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [brandText, setBrandText] = useState<"none" | "omni" | "blink1" | "lovable" | "blink2" | "fade">("none");
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const [eyeBlinkCommand, setEyeBlinkCommand] = useState(0); // increment to trigger a forced blink
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

  // Brand sequence during phase 2 — eye blinks to transition between credits
  useEffect(() => {
    if (phase !== 2) return;
    const timers = [
      setTimeout(() => setShowAgentOverlay(true), 0),
      setTimeout(() => setBrandText("omni"), 1200),
      // At 5.5s: trigger eye blink, switch text while eye is closed
      setTimeout(() => {
        setBrandText("blink1");
        setEyeBlinkCommand(c => c + 1);
        window.dispatchEvent(new CustomEvent("eye-blink"));
      }, 5500),
      // Eye closed ~400ms in, swap text
      setTimeout(() => setBrandText("lovable"), 6100),
      // At 9.5s: blink again to transition out
      setTimeout(() => {
        setBrandText("blink2");
        setEyeBlinkCommand(c => c + 1);
        window.dispatchEvent(new CustomEvent("eye-blink"));
      }, 9500),
      setTimeout(() => setBrandText("fade"), 10100),
    ];
    return () => timers.forEach(clearTimeout);
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
        setPostLines((prev) => [...prev, line]);
        playKeyClick();
      }, i * 280)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Loading bar
  useEffect(() => {
    if (phase !== 4) return;
    const interval = setInterval(() => {
      setLoadingPct((p) => {
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

  // Scanline sweep
  useEffect(() => {
    const interval = setInterval(() => setScanlinePos((p) => (p + 2) % 100), 30);
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

      {(phase === 1) && (
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

        {phase === 2 && (
          <div className="text-center space-y-3">
            {(brandText === "omni" || brandText === "blink1") && (
              <div className={`text-glow space-y-3 transition-opacity duration-300 ${brandText === "blink1" ? "opacity-0" : "opacity-100 animate-in fade-in duration-700"}`}>
                <div className="text-muted-foreground/50 text-[10px] tracking-[0.4em]">
                  PRESENTED BY
                </div>
                <div className="text-primary text-3xl sm:text-4xl tracking-[0.5em] sm:tracking-[0.7em] font-bold">
                  O M N I
                </div>
                <div className="text-muted-foreground/30 text-[10px] tracking-widest mt-2">
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━
                </div>
              </div>
            )}
            {(brandText === "lovable" || brandText === "blink2") && (
              <div className={`text-glow space-y-3 transition-opacity duration-300 ${brandText === "blink2" ? "opacity-0" : "opacity-100 animate-in fade-in duration-500"}`}>
                <div className="text-muted-foreground/50 text-[10px] tracking-[0.4em]">
                  ENABLED BY
                </div>
                <div className="text-primary text-xl sm:text-2xl tracking-[0.3em] sm:tracking-[0.5em]">
                  L O V A B L E
                </div>
                <div className="text-muted-foreground/30 text-[10px] tracking-widest mt-2">
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━
                </div>
              </div>
            )}
            {brandText === "fade" && (
              <div className="text-glow opacity-0 transition-opacity duration-500">
                <div className="text-primary text-xl">...</div>
              </div>
            )}
          </div>
        )}

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
