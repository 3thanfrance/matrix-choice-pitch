import { useState, useEffect, useCallback, useRef } from "react";

interface StoryNode {
  lines: string[];
  prompt?: string;
  yes?: string;
  no?: string;
}

const storyTree: Record<string, StoryNode> = {
  start: {
    lines: [
      "YOU ARE TRAPPED.",
      "DROWNING IN DASHBOARDS.",
      "NOBODY TRUSTS THE NUMBERS.",
    ],
    prompt: "READY TO ESCAPE? [Y/N]",
    yes: "verify",
    no: "bluepill",
  },
  verify: {
    lines: [
      "HOLD ON.",
      "",
      "SCANNING ████████████ ...",
      "CROSS-REFERENCING: LOVABLE HQ, STOCKHOLM",
      "BIOMETRIC HASH: 7F:3A:9C:██:██:██",
      "",
      "========================================",
      "  I D E N T I T Y   C O N F I R M E D",
      "========================================",
      "",
      "ANTON OSIKA. FOUNDER. LOVABLE.",
      "WE'VE BEEN EXPECTING YOU.",
    ],
    prompt: "CONTINUE? [Y/N]",
    yes: "pitch",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      ">> DECLINE LOGGED.",
      "",
      "SAME DASHBOARDS TOMORROW.",
      "SAME BOTTLENECK.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "pitch",
    no: "final_no",
  },
  pitch: {
    lines: [
      "WHAT IF ANYONE AT LOVABLE COULD",
      "ASK A QUESTION — AND TRUST THE ANSWER?",
      "",
      "PLAIN ENGLISH IN. REAL INSIGHTS OUT.",
      "NO QUEUE. NO GUESSING.",
    ],
    prompt: "GO DEEPER? [Y/N]",
    yes: "embedded",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      ">> HESITATION DETECTED.",
      "",
      "EVERY UNANSWERED QUESTION",
      "IS A DECISION MADE BLIND.",
    ],
    prompt: "READY? [Y/N]",
    yes: "embedded",
    no: "final_no",
  },
  embedded: {
    lines: [
      "NOW IMAGINE YOUR USERS COULD DO IT TOO.",
      "",
      "AI ANALYTICS — INSIDE YOUR PRODUCT.",
      "BAMBOOHR ALREADY SHIPS WITH IT.",
      "",
      "DECRYPTING ██████████████████ DONE.",
      "",
      "========================================",
      "         O  M  N  I",
      "========================================",
    ],
    prompt: "SCHEDULE A MEETING? [Y/N]",
    yes: "demo",
    no: "final_no",
  },
  demo: {
    lines: [
      "========================================",
      "  A C C E S S   G R A N T E D",
      "========================================",
      "",
      "  OMNI.CO/SCHEDULE",
      "  HELLO@OMNI.CO",
      "",
      "SEE YOU ON THE OTHER SIDE, ANTON.",
    ],
    prompt: "RESTART? [Y/N]",
    yes: "restart",
    no: "end",
  },
  final_no: {
    lines: [
      "THE MATRIX HAS YOU.",
      "",
      "  OMNI.CO — WHEN YOU ARE READY.",
    ],
    prompt: "RESTART? [Y/N]",
    yes: "restart",
    no: "end",
  },
  restart: {
    lines: [">> REBOOTING SYSTEM..."],
  },
  end: {
    lines: ["SIGNAL_LOST"],
  },
};

const TYPING_SPEED = 25;
const LINE_DELAY = 80;
const DELETE_SPEED = 5;
const LINGER_DURATION = 1200;

type Phase = "typing" | "lingering" | "deleting" | "idle";

const Terminal = () => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentNode, setCurrentNode] = useState("start");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [nextNodeKey, setNextNodeKey] = useState<string | null>(null);
  const [showOutro, setShowOutro] = useState(false);
  const [outroPhase, setOutroPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const node = storyTree[currentNode];

  // Detect "end" node → trigger outro
  useEffect(() => {
    if (currentNode === "end") {
      setShowOutro(true);
      const timers = [
        setTimeout(() => setOutroPhase(1), 400),
        setTimeout(() => setOutroPhase(2), 1200),
        setTimeout(() => setOutroPhase(3), 2600),
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [currentNode]);

  // Typing phase
  useEffect(() => {
    if (phase !== "typing" || !node || showOutro) return;

    if (lineIndex >= node.lines.length) {
      if (node.prompt) {
        setTimeout(() => {
          setShowPrompt(true);
          setWaitingForInput(true);
        }, 200);
      }
      setPhase("idle");
      return;
    }

    const currentLine = node.lines[lineIndex];

    if (currentLine === "") {
      setDisplayedLines((prev) => [...prev, ""]);
      setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, LINE_DELAY);
      return;
    }

    if (charIndex < currentLine.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const copy = [...prev];
          if (charIndex === 0) {
            copy.push(currentLine.slice(0, 1));
          } else {
            copy[copy.length - 1] = currentLine.slice(0, charIndex + 1);
          }
          return copy;
        });
        setCharIndex((c) => c + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => {
        setLineIndex((i) => i + 1);
        setCharIndex(0);
      }, LINE_DELAY);
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
        setPhase("typing");
      }
      return;
    }

    const lastLine = displayedLines[displayedLines.length - 1];

    if (lastLine === "" || lastLine.length === 0) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => prev.slice(0, -1));
      }, DELETE_SPEED);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setDisplayedLines((prev) => {
        const copy = [...prev];
        const line = copy[copy.length - 1];
        if (line.length <= 1) {
          copy.pop();
        } else {
          copy[copy.length - 1] = line.slice(0, -1);
        }
        return copy;
      });
    }, DELETE_SPEED);
    return () => clearTimeout(timer);
  }, [phase, displayedLines, nextNodeKey]);

  const handleInput = useCallback(
    (answer: "y" | "n") => {
      if (!waitingForInput || !node) return;

      setWaitingForInput(false);
      setShowPrompt(false);

      const nextKey = answer === "y" ? node.yes : node.no;

      if (nextKey === "restart") {
        setNextNodeKey("start");
        setTimeout(() => setPhase("deleting"), LINGER_DURATION);
      } else if (nextKey) {
        setNextNodeKey(nextKey);
        setTimeout(() => setPhase("deleting"), LINGER_DURATION);
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

  // Outro screen
  if (showOutro) {
    return (
      <div className="relative z-10 flex h-screen items-center justify-center overflow-hidden">
        <div className="text-center font-mono">
          {outroPhase === 0 && (
            <div className="text-primary/20 text-xs">_</div>
          )}
          {outroPhase === 1 && (
            <div className="text-primary text-glow text-xs glitch-text">
              {">> SIGNAL LOST"}
            </div>
          )}
          {outroPhase >= 2 && (
            <div className="text-glow space-y-4">
              <div className="text-muted-foreground text-xs tracking-widest">A FILM BY</div>
              <div className="text-primary text-lg tracking-[0.4em] font-bold">O M N I</div>
              <div className="text-muted-foreground/40 text-xs mt-6">OMNI.CO</div>
            </div>
          )}
          {outroPhase >= 3 && (
            <div className="mt-8 text-muted-foreground/30 text-xs tracking-wider">
              enabled by <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">lovable</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-screen flex-col overflow-hidden">
      {/* Header bar */}
      <div className="crt-header border-b border-border px-4 py-1.5 text-xs tracking-widest text-muted-foreground">
        <span className="text-primary text-glow">■</span>
        {" "}OMNI TERMINAL — ENCRYPTED CHANNEL
      </div>

      {/* Terminal body — centered */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-8 md:px-12"
      >
        <div className="w-full max-w-2xl text-center text-sm leading-snug text-glow">
          {displayedLines.map((line, i) => (
            <div
              key={i}
              className="line-fade min-h-[1.15em] whitespace-pre-wrap font-mono"
            >
              {line}
            </div>
          ))}

          {showPrompt && (
            <div className="mt-2">
              <div className="font-bold text-primary">{node.prompt}</div>
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="text-muted-foreground">&gt;&gt;</span>
                <span className="cursor-blink text-primary">█</span>
              </div>
              <div className="mt-3 flex justify-center gap-4 sm:hidden">
                <button
                  onClick={() => handleInput("y")}
                  className="border border-primary bg-secondary px-8 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  [Y] YES
                </button>
                <button
                  onClick={() => handleInput("n")}
                  className="border border-border bg-secondary px-8 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  [N] NO
                </button>
              </div>
              <div className="mt-1 text-xs text-muted-foreground hidden sm:block">
                PRESS Y OR N
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer status bar */}
      <div className="border-t border-border px-4 py-1 text-xs tracking-wider text-muted-foreground flex justify-between">
        <span>CLASSIFIED // EYES ONLY</span>
        <span className="text-muted-foreground/30 tracking-normal">enabled by <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">lovable</a></span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
