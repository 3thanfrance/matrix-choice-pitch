import { useState, useEffect, useRef } from "react";
import { playPowerOn, startCRTHum, playStatic, playKeyClick } from "@/lib/sounds";
import MatrixAgents from "./MatrixAgents";

const FIRST_BOOT_DURATION = 32000;

interface BootSequenceProps {
  onComplete: () => void;
  isReboot?: boolean;
}

const BootSequence = ({ onComplete, isReboot = false }: BootSequenceProps) => {
  const [phase, setPhase] = useState(isReboot ? 2 : 0);
  const [flickerClass, setFlickerClass] = useState(isReboot ? "opacity-100" : "opacity-0");
  const [scanlinePos, setScanlinePos] = useState(0);
  const [postLines, setPostLines] = useState<string[]>([]);
  const [loadingPct, setLoadingPct] = useState(0);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showAgentOverlay, setShowAgentOverlay] = useState(isReboot);
  const [waitingForInput, setWaitingForInput] = useState(isReboot);
  const humStopRef = useRef<(() => void) | null>(null);

  // Audio init (skip power-on sound on reboot)
  useEffect(() => {
    if (isReboot) return;
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
  }, [audioStarted, isReboot]);

  useEffect(() => () => { humStopRef.current?.(); }, []);

  // === REBOOT PATH: silhouette visible, wait for any input to start zoom ===
  useEffect(() => {
    if (!isReboot || !waitingForInput) return;
    
    // Clear any leftover zoom state
    window.__matrixZoomStart = undefined;
    window.__matrixZoomOutStart = undefined;
    window.__matrixPupilZoomStart = undefined;
    window.__matrixPupilZoomOutStart = undefined;
    window.__brandText = null;
    window.__silhouetteText = null;
    
    const handleInput = () => {
      setWaitingForInput(false);
      // Start zoom immediately on input
      window.__matrixZoomStart = Date.now();
      
      // Pupil zoom after eye zoom completes
      setTimeout(() => {
        window.__matrixPupilZoomStart = Date.now();
      }, 5000);
      
      // Complete boot after pupil zoom
      setTimeout(() => onComplete(), 7500);
    };

    window.addEventListener("click", handleInput, { once: true });
    window.addEventListener("keydown", handleInput, { once: true });
    return () => {
      window.removeEventListener("click", handleInput);
      window.removeEventListener("keydown", handleInput);
    };
  }, [isReboot, waitingForInput, onComplete]);

  // === FIRST BOOT PATH: full cinematic sequence ===
  // Phase timeline (first boot only)
  useEffect(() => {
    if (isReboot) return;
    const timers = [
      setTimeout(() => setPhase(1), 2000),
      setTimeout(() => setPhase(2), 4000),
      setTimeout(() => setPhase(3), 23000),
      setTimeout(() => setPhase(4), 27000),
      setTimeout(() => setPhase(5), 29500),
      setTimeout(() => onComplete(), FIRST_BOOT_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, isReboot]);

  // Phase 2 (first boot): Silhouette → "enabled by lovable" → blink → zoom → eye → OMNI → blink → pupil zoom
  useEffect(() => {
    if (phase !== 2 || isReboot) return;
    const timers = [
      // Show MatrixAgents immediately
      setTimeout(() => setShowAgentOverlay(true), 0),

      // Step 1 (1s): Show "enabled by lovable" on the silhouette screen
      setTimeout(() => {
        window.__silhouetteText = {
          text: "enabled by lovable",
          startTime: Date.now(),
        };
      }, 1000),

      // Step 2 (4s): Blink to transition away from "enabled by lovable"
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("eye-blink"));
      }, 4000),

      // Step 3 (4.5s): Clear silhouette text & start zoom into eye
      setTimeout(() => {
        window.__silhouetteText = null;
        window.__matrixZoomStart = Date.now();
      }, 4500),

      // Step 4 (9s): Show OMNI brand text on the eye (zoom is complete by ~9s)
      setTimeout(() => {
        window.__brandText = {
          label: "PRESENTED BY",
          name: "O M N I",
          startTime: Date.now(),
        };
      }, 9500),

      // Step 5 (14.5s): Blink to dismiss OMNI brand
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("eye-blink"));
      }, 14500),

      // Step 6 (15s): Clear brand text
      setTimeout(() => {
        window.__brandText = null;
      }, 15000),

      // Step 7 (16s): Pupil zoom into terminal
      setTimeout(() => {
        window.__matrixPupilZoomStart = Date.now();
      }, 16000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      window.__brandText = null;
      window.__silhouetteText = null;
      window.__matrixZoomStart = undefined;
      window.__matrixPupilZoomStart = undefined;
    };
  }, [phase, isReboot]);

  // Sound per phase
  useEffect(() => {
    if (isReboot) return;
    if (phase === 1) playStatic(0.3, 0.1);
    if (phase === 3) playStatic(0.15, 0.05);
    if (phase === 5) playStatic(0.1, 0.04);
  }, [phase, isReboot]);

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

  // Flicker (first boot only)
  useEffect(() => {
    if (isReboot) return;
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
  }, [phase, isReboot]);

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

  // Reboot: just show the MatrixAgents canvas, nothing else
  if (isReboot) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-hidden">
        {showAgentOverlay && <MatrixAgents />}
      </div>
    );
  }

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
