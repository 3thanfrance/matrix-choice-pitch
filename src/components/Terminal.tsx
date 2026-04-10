import { useState, useEffect, useCallback, useRef } from "react";
import { playKeyClick, playEnterKey, playStatic, playConfirm } from "@/lib/sounds";
import MatrixAgents from "./MatrixAgents";

declare global {
  interface Window {
    __terminalTextRect?: { x: number; y: number; w: number; h: number };
    __terminalTextLines?: string[];
    __terminalPromptText?: string;
  }
}

interface StoryNode {
  lines: string[];
  prompt?: string;
  yes?: string;
  no?: string;
}

const storyTree: Record<string, StoryNode> = {
  verify: {
    lines: [
      "INITIATING IDENTITY VERIFICATION...",
      "SCANNING ████████████████ ...",
      "LOCATION: LOVABLE HQ, STOCKHOLM",
    ],
  },
  verified: {
    lines: ["I D E N T I T Y   C O N F I R M E D"],
  },
  start: {
    lines: ["HELLO, ANTON."],
  },
  trapped: {
    lines: [
      "YOU OPEN YOUR ANALYTICS TOOL.",
      "WRITE A QUERY. WAIT. DEBUG. REWRITE.",
      "THIRTY MINUTES LATER, A CHART.",
      "NOBODY ASKS WHAT IT MEANS.",
      "BECAUSE NOBODY READS IT.",
    ],
    prompt: "SOUND FAMILIAR? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  redpill: {
    lines: [
      ">> RED PILL PROTOCOL ACTIVATED <<",
      "",
      "NOTEBOOKS. SQL. PYTHON. DRAG. DROP. PRAY.",
      "YOU DIDN'T SIGN UP TO BE A DASHBOARD ENGINEER.",
      "THE INSIGHT WAS ALWAYS THERE.",
      "BURIED UNDER PROCESS.",
    ],
    prompt: "READY TO STOP BUILDING AND START KNOWING? [Y/N]",
    yes: "solution",
    no: "hesitate",
  },
  bluepill: {
    lines: [
      ">> BLUE PILL PROTOCOL ACTIVATED <<",
      "",
      "YOU WANT TO STAY.",
      "STITCHING QUERIES. FORMATTING CHARTS.",
      "PRESENTING DASHBOARDS NOBODY READS.",
      "COMFORTABLE.",
    ],
    prompt: "OR... DO YOU WANT THE TRUTH? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  hesitate: {
    lines: [
      ">> INTERESTING.",
      "EVERY HOUR SPENT:",
      "WRITE SQL. BUILD CHART. EXPLAIN CHART.",
      "REPEAT. EVERY. WEEK.",
      "THE ANSWER WAS ALWAYS THERE.",
      "YOU JUST COULDN'T GET TO IT.",
    ],
    prompt: "WHAT IF THE PROCESS DISAPPEARED? [Y/N]",
    yes: "solution",
    no: "final_no",
  },
  solution: {
    lines: [
      "THIS IS OMNI.",
      "NO NOTEBOOKS. NO SQL. NO DASHBOARDS.",
      "ASK A QUESTION. IN PLAIN ENGLISH.",
      "GET THE ANSWER. NOT A CHART.",
      "THE ANSWER.",
      "",
      "YOUR DATA FINALLY TALKS BACK.",
    ],
    prompt: "READY TO HEAR IT? [Y/N]",
    yes: "demo",
    no: "final_no",
  },
  demo: {
    lines: [
      "═══════════════════════════",
      "A C C E S S   G R A N T E D",
      "═══════════════════════════",
    ],
  },
  demo2: {
    lines: [
      "OMNI.CO/SCHEDULE",
      "",
      "THE MATRIX HAD DASHBOARDS TOO.",
      "NEO CHOSE DIFFERENTLY.",
    ],
  },
  final_no: {
    lines: [
      "THE NOTEBOOK AWAITS.",
      "BUT WHEN THE QUERIES PILE UP...",
      "OMNI.CO",
    ],
  },
};

const AUTO_SEQUENCE = ["verify", "verified", "start", "trapped"];

const TYPING_SPEED = 25;
const DELETE_SPEED = 4;
const LINGER_DURATION = 1200;
const AUTO_LINGER = 1500;
const OUTRO_DELAY = 3500;
const PUPIL_ZOOM_OUT_DURATION = 2000;
const ZOOM_OUT_DURATION = 4500;

type Phase = "typing" | "lingering" | "deleting" | "idle";
type PillFlash = "red" | "blue" | null;

const Terminal = () => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentNode, setCurrentNode] = useState("verify");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [nextNodeKey, setNextNodeKey] = useState<string | null>(null);
  const [floatOffset, setFloatOffset] = useState(0);
  const [showOutro, setShowOutro] = useState(false);
  const [staticBurst, setStaticBurst] = useState(false);
  const [pillFlash, setPillFlash] = useState<PillFlash>(null);
  const autoSeqIndexRef = useRef(0);
  const clickCountRef = useRef(0);
  const floatRef = useRef<number>(0);
  const textBlockRef = useRef<HTMLDivElement>(null);

  const node = storyTree[currentNode];

  // Subtle floating animation
  useEffect(() => {
    let t = 0;
    const animate = () => {
      t += 0.008;
      setFloatOffset(Math.sin(t) * 2);
      floatRef.current = requestAnimationFrame(animate);
    };
    floatRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(floatRef.current);
  }, []);

  // Occasional static bursts on the terminal screen
  useEffect(() => {
    const triggerStatic = () => {
      setStaticBurst(true);
      setTimeout(() => setStaticBurst(false), 80 + Math.random() * 120);
    };
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && !showOutro) triggerStatic();
    }, 4000 + Math.random() * 6000);
    return () => clearInterval(interval);
  }, [showOutro]);

  // Publish text block rect
  useEffect(() => {
    const updateRect = () => {
      const el = textBlockRef.current;
      if (el && !showOutro) {
        const rect = el.getBoundingClientRect();
        window.__terminalTextRect = {
          x: rect.left, y: rect.top, w: rect.width, h: rect.height,
        };
        window.__terminalTextLines = displayedLines;
        window.__terminalPromptText = showPrompt && node?.prompt ? node.prompt : "";
      } else {
        window.__terminalTextRect = { x: 0, y: 0, w: 0, h: 0 };
        window.__terminalTextLines = [];
        window.__terminalPromptText = "";
      }
    };
    updateRect();
    const interval = setInterval(updateRect, 100);
    return () => {
      clearInterval(interval);
      window.__terminalTextRect = { x: 0, y: 0, w: 0, h: 0 };
      window.__terminalTextLines = [];
      window.__terminalPromptText = "";
    };
  }, [displayedLines, showPrompt, floatOffset, node, showOutro]);

  // Key click sounds
  useEffect(() => {
    if (phase !== "typing") return;
    clickCountRef.current++;
    if (clickCountRef.current % 2 === 0) playKeyClick();
  }, [charIndex, phase]);

  // Sound on specific nodes
  useEffect(() => {
    if (currentNode === "verify") playStatic(0.2, 0.06);
    if (currentNode === "verified") playConfirm();
    if (currentNode === "demo") playConfirm();
  }, [currentNode]);

  // Auto-advance for non-interactive nodes
  useEffect(() => {
    if (phase !== "idle" || showOutro) return;
    if (!node) return;

    const autoIdx = AUTO_SEQUENCE.indexOf(currentNode);
    if (autoIdx >= 0 && autoIdx < AUTO_SEQUENCE.length - 1) {
      const nextAutoNode = AUTO_SEQUENCE[autoIdx + 1];
      const timer = setTimeout(() => {
        setNextNodeKey(nextAutoNode);
        autoSeqIndexRef.current = autoIdx + 1;
        setPhase("deleting");
      }, AUTO_LINGER);
      return () => clearTimeout(timer);
    }

    if (currentNode === "demo") {
      const timer = setTimeout(() => {
        setNextNodeKey("demo2");
        setPhase("deleting");
      }, AUTO_LINGER);
      return () => clearTimeout(timer);
    }

    // End states: zoom back out
    if (currentNode === "demo2" || currentNode === "final_no") {
      if (!node.prompt) {
        const timer = setTimeout(() => setShowOutro(true), OUTRO_DELAY);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentNode, node, showOutro]);

  // Outro: reverse the intro — pupil zoom out → eye visible → blink → zoom out to silhouette → hold → reboot
  useEffect(() => {
    if (!showOutro) return;

    // Set zoom to "fully zoomed in" (eye visible) by pretending zoom-in completed long ago
    window.__matrixZoomStart = Date.now() - 10000;
    window.__matrixZoomOutStart = undefined;
    window.__matrixPupilZoomOutStart = undefined;

    // Step 1: Pupil zoom out (we're inside the pupil → eye becomes visible)
    window.__matrixPupilZoomOutStart = Date.now();

    // Step 2: After pupil zoom completes, blink then zoom out eye → silhouette
    const eyeZoomDelay = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("eye-blink"));
      // After blink closes, start the eye→silhouette zoom out
      setTimeout(() => {
        window.__matrixZoomOutStart = Date.now();
      }, 800);
    }, PUPIL_ZOOM_OUT_DURATION + 500);

    // Step 3: Reboot after everything
    const totalOutroDuration = PUPIL_ZOOM_OUT_DURATION + 500 + 800 + ZOOM_OUT_DURATION + 2000;
    const rebootTimer = setTimeout(() => {
      window.__matrixZoomOutStart = undefined;
      window.__matrixPupilZoomOutStart = undefined;
      window.__matrixZoomStart = undefined;
      window.__matrixPupilZoomStart = undefined;
      setShowOutro(false);
      setDisplayedLines([]);
      setCurrentNode("verify");
      setLineIndex(0);
      setCharIndex(0);
      setShowPrompt(false);
      setWaitingForInput(false);
      setNextNodeKey(null);
      autoSeqIndexRef.current = 0;
      setPhase("typing");
      window.dispatchEvent(new CustomEvent("terminal-reboot"));
    }, totalOutroDuration);

    return () => {
      clearTimeout(eyeZoomDelay);
      clearTimeout(rebootTimer);
      window.__matrixZoomOutStart = undefined;
      window.__matrixPupilZoomOutStart = undefined;
    };
  }, [showOutro]);

  // Show prompt when typing finishes
  useEffect(() => {
    if (phase !== "idle" || !node?.prompt) return;
    const timer = setTimeout(() => {
      setShowPrompt(true);
      setWaitingForInput(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [phase, node]);

  // Typing phase
  useEffect(() => {
    if (phase !== "typing" || !node || showOutro) return;
    if (lineIndex >= node.lines.length) {
      setPhase("idle");
      return;
    }
    const currentLine = node.lines[lineIndex];
    if (currentLine === "") {
      setDisplayedLines(prev => [...prev, ""]);
      setTimeout(() => { setLineIndex(i => i + 1); setCharIndex(0); }, 80);
      return;
    }
    if (charIndex < currentLine.length) {
      const timer = setTimeout(() => {
        setDisplayedLines(prev => {
          const copy = [...prev];
          if (charIndex === 0) copy.push(currentLine.slice(0, 1));
          else copy[copy.length - 1] = currentLine.slice(0, charIndex + 1);
          return copy;
        });
        setCharIndex(c => c + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => { setLineIndex(i => i + 1); setCharIndex(0); }, 80);
    }
  }, [phase, lineIndex, charIndex, node, showOutro]);

  // Deleting phase
  useEffect(() => {
    if (phase !== "deleting") return;
    if (displayedLines.length === 0) {
      if (nextNodeKey) {
        setCurrentNode(nextNodeKey);
        setNextNodeKey(null);
        setLineIndex(0);
        setCharIndex(0);
        setShowPrompt(false);
        setPhase("typing");
      }
      return;
    }
    const lastLine = displayedLines[displayedLines.length - 1];
    if (lastLine === "" || lastLine.length === 0) {
      const timer = setTimeout(() => setDisplayedLines(prev => prev.slice(0, -1)), DELETE_SPEED);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setDisplayedLines(prev => {
        const copy = [...prev];
        const line = copy[copy.length - 1];
        if (line.length <= 1) copy.pop();
        else copy[copy.length - 1] = line.slice(0, -1);
        return copy;
      });
    }, DELETE_SPEED);
    return () => clearTimeout(timer);
  }, [phase, displayedLines, nextNodeKey]);

  const handleInput = useCallback(
    (answer: "y" | "n") => {
      if (!waitingForInput || !node) return;
      playEnterKey();
      setWaitingForInput(false);
      setShowPrompt(false);
      const nextKey = answer === "y" ? node.yes : node.no;
      if (nextKey) {
        // Set pill protocol color indicator (no screen flash/shake)
        if (nextKey === "redpill") {
          setPillFlash("red");
          playStatic(0.15, 0.06);
          setTimeout(() => setPillFlash(null), 2500);
        } else if (nextKey === "bluepill") {
          setPillFlash("blue");
          playStatic(0.15, 0.06);
          setTimeout(() => setPillFlash(null), 2500);
        }
        setNextNodeKey(nextKey);
        setTimeout(() => {
          playStatic(0.1, 0.04);
          setPhase("deleting");
        }, LINGER_DURATION);
      }
    },
    [waitingForInput, node]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!waitingForInput) return;
      const key = e.key.toLowerCase();
      if (key === "y") handleInput("y");
      else if (key === "n") handleInput("n");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [waitingForInput, handleInput]);

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden">
      {/* Outro zoom-out overlay */}
      {showOutro && <MatrixAgents />}

      {/* Occasional static burst overlay */}
      {staticBurst && (
        <div className="absolute inset-0 pointer-events-none z-20 boot-static opacity-30" />
      )}

      {/* Pill flash removed — color is now on the text itself */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.05) 2px, rgba(0,255,65,0.05) 4px)',
        }}
      />

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      <div className={`crt-header border-b border-border px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs tracking-widest text-muted-foreground transition-opacity duration-700 ${showOutro ? "opacity-0" : ""}`}>
        <span className="text-primary text-glow">■</span>
        {" "}OMNI TERMINAL — ENCRYPTED CHANNEL
      </div>

      <div className={`flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-8 md:px-12 transition-opacity duration-700 ${showOutro ? "opacity-0" : ""}`}>
        <div
          ref={textBlockRef}
          className="w-full max-w-2xl text-center text-xs sm:text-sm leading-relaxed text-glow transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateY(${floatOffset}px)` }}
        >
          {displayedLines.map((line, i) => {
            const isRedProtocol = pillFlash === "red" && line.includes("RED PILL PROTOCOL");
            const isBlueProtocol = pillFlash === "blue" && line.includes("BLUE PILL PROTOCOL");
            return (
              <div
                key={`${currentNode}-${i}`}
                className="line-fade min-h-[1.2em] whitespace-pre-wrap font-mono"
                style={
                  isRedProtocol
                    ? { color: "#ff3333", textShadow: "0 0 8px rgba(255,0,0,0.6), 0 0 20px rgba(255,0,0,0.25)" }
                    : isBlueProtocol
                    ? { color: "#3388ff", textShadow: "0 0 8px rgba(50,100,255,0.6), 0 0 20px rgba(50,100,255,0.25)" }
                    : undefined
                }
              >
                {line}
              </div>
            );
          })}
          {phase === "typing" && (
            <div className="min-h-[1.2em]">
              <span className="cursor-blink text-primary">█</span>
            </div>
          )}
          {showPrompt && (
            <div className="mt-3">
              <div className="font-bold text-primary text-xs sm:text-sm">{node.prompt}</div>
              <div className="mt-1 items-center justify-center gap-1 hidden sm:flex">
                <span className="text-muted-foreground">&gt;&gt;</span>
                <span className="cursor-blink text-primary">█</span>
              </div>
              <div className="mt-3 flex justify-center gap-3 sm:hidden">
                <button
                  onClick={() => handleInput("y")}
                  className="border border-primary bg-secondary px-6 py-2.5 text-xs font-bold text-primary active:bg-primary active:text-primary-foreground transition-colors"
                >
                  [Y] YES
                </button>
                <button
                  onClick={() => handleInput("n")}
                  className="border border-border bg-secondary px-6 py-2.5 text-xs font-bold text-muted-foreground active:bg-primary active:text-primary-foreground transition-colors"
                >
                  [N] NO
                </button>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground hidden sm:block">
                PRESS Y OR N
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`border-t border-border px-3 sm:px-4 py-1 text-[10px] sm:text-xs tracking-wider text-muted-foreground flex justify-between transition-opacity duration-700 ${showOutro ? "opacity-0" : ""}`}>
        <span>MISSION BRIEF BY <span className="text-primary/60">OMNI.CO</span></span>
        <span className="text-muted-foreground/40">enabled by <span className="text-primary/40">lovable</span></span>
      </div>
    </div>
  );
};

export default Terminal;
