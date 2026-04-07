import { useState, useEffect } from "react";

const GLITCH_DURATION = 3200;

const BootSequence = ({ onComplete }: { onComplete: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [flickerClass, setFlickerClass] = useState("");
  const [scanlinePos, setScanlinePos] = useState(0);

  useEffect(() => {
    // Phase 0: black screen with flicker (0-600ms)
    // Phase 1: static burst (600-1200ms)
    // Phase 2: green screen flash + text fragments (1200-2200ms)
    // Phase 3: settle into terminal (2200-3200ms)

    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => onComplete(), GLITCH_DURATION),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Rapid flicker effect
  useEffect(() => {
    if (phase < 1) return;
    const interval = setInterval(() => {
      setFlickerClass(Math.random() > 0.5 ? "opacity-100" : "opacity-0");
    }, 50 + Math.random() * 80);

    if (phase >= 3) {
      clearInterval(interval);
      setFlickerClass("opacity-100");
    }
    return () => clearInterval(interval);
  }, [phase]);

  // Moving scanline
  useEffect(() => {
    const interval = setInterval(() => {
      setScanlinePos((p) => (p + 3) % 100);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      {/* Scan line sweep */}
      <div
        className="absolute left-0 right-0 h-1 bg-primary/30 blur-sm pointer-events-none"
        style={{ top: `${scanlinePos}%`, transition: "none" }}
      />

      {/* Static noise overlay */}
      {phase >= 1 && phase < 3 && (
        <div className="absolute inset-0 pointer-events-none boot-static" />
      )}

      {/* Content */}
      <div className={`text-center font-mono transition-opacity duration-100 ${flickerClass}`}>
        {phase === 0 && (
          <div className="text-primary/20 text-xs">_</div>
        )}
        {phase === 1 && (
          <div className="text-primary text-glow text-xs space-y-1 glitch-text">
            <div>██████ SIGNAL DETECTED ██████</div>
            <div className="text-muted-foreground">CALIBRATING...</div>
          </div>
        )}
        {phase >= 2 && phase < 3 && (
          <div className="text-primary text-glow space-y-1">
            <div className="text-xs text-muted-foreground">OMNI TERMINAL v2.049</div>
            <div className="text-lg tracking-[0.3em] font-bold glitch-text">
              INITIALIZING
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              ████████████████ {Math.floor(Math.random() * 40 + 60)}%
            </div>
          </div>
        )}
        {phase >= 3 && (
          <div className="text-primary text-glow animate-pulse">
            <div className="text-xs tracking-[0.5em]">CONNECTED</div>
          </div>
        )}
      </div>

      {/* Green screen flash */}
      {phase === 2 && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};

export default BootSequence;
