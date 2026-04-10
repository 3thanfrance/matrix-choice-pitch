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
      "YOUR DATA IS BURIED.",
      "SCATTERED ACROSS DASHBOARDS.",
      "YOUR TEAM ASKS ONE QUESTION.",
      "THREE DIFFERENT ANSWERS.",
    ],
    prompt: "TIRED OF GUESSING? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  redpill: {
    lines: [
      ">> THOUGHT SO.",
      "THE PROBLEM ISN'T YOUR DATA.",
      "IT'S THE LAYERS BETWEEN YOU AND IT.",
      "CHARTS. DASHBOARDS. TRANSLATIONS.",
      "EVERY LAYER ADDS NOISE.",
    ],
    prompt: "WANT TO CUT THROUGH? [Y/N]",
    yes: "solution",
    no: "hesitate",
  },
  bluepill: {
    lines: [
      ">> UNDERSTOOD.",
      "MOST STAY COMFORTABLE.",
      "BUT COMFORT ISN'T CLARITY.",
    ],
    prompt: "CURIOUS WHAT CLARITY LOOKS LIKE? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  hesitate: {
    lines: [
      ">> FAIR ENOUGH.",
      "BUT EVERY HOUR SPENT",
      "TRANSLATING CHARTS INTO DECISIONS",
      "IS AN HOUR LOST.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "solution",
    no: "final_no",
  },
  solution: {
    lines: [
      "OMNI. NO DASHBOARDS. NO NOISE.",
      "ASK IN PLAIN ENGLISH.",
      "GET ONE ANSWER. THE RIGHT ONE.",
    ],
    prompt: "READY TO SEE IT? [Y/N]",
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
      "SEE YOU ON THE OTHER SIDE.",
    ],
  },
  final_no: {
    lines: [
      "THE OFFER STANDS.",
      "OMNI.CO — WHEN YOU'RE READY.",
    ],
  },
};

const AUTO_SEQUENCE = ["verify", "verified", "start", "trapped"];

const TYPING_SPEED = 25;
const DELETE_SPEED = 4;
const LINGER_DURATION = 1200;
const AUTO_LINGER = 1500;
const OUTRO_DELAY = 3500;
const ZOOM_OUT_DURATION = 3500;

type Phase = "typing" | "lingering" | "deleting" | "idle";

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

  // Publish text block rect + content for PretextRain pixel collision
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

    // End states: zoom back out and loop
    if (currentNode === "demo2" || currentNode === "final_no") {
      if (!node.prompt) {
        const timer = setTimeout(() => setShowOutro(true), OUTRO_DELAY);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentNode, node, showOutro]);

  // Outro: blink first, then zoom back out to silhouette, then reboot
  useEffect(() => {
    if (!showOutro) return;

    // Trigger a blink first — must fully close before zoom-out starts
    window.dispatchEvent(new CustomEvent("eye-blink"));

    // Start zoom-out AFTER blink has fully closed (~650ms)
    const zoomDelay = setTimeout(() => {
      (window as any).__matrixZoomOutStart = Date.now();
    }, 650);

    const rebootTimer = setTimeout(() => {
      (window as any).__matrixZoomOutStart = undefined;
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
    }, ZOOM_OUT_DURATION + 1000);

    return () => {
      clearTimeout(zoomDelay);
      clearTimeout(rebootTimer);
      (window as any).__matrixZoomOutStart = undefined;
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
          {displayedLines.map((line, i) => (
            <div key={`${currentNode}-${i}`} className="line-fade min-h-[1.2em] whitespace-pre-wrap font-mono">
              {line}
            </div>
          ))}
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
