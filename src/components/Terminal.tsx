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
      "SYSTEM v2.049 // COPYRIGHT (C) 2049",
      "LOADING SECURE CHANNEL... ████████ OK",
      "",
      "WELCOME, OPERATOR.",
      "",
      "YOU ARE TRAPPED.",
      "SCATTERED TOOLS. BROKEN WORKFLOWS.",
      "ENDLESS TABS. CONSTANT CONTEXT-SWITCHING.",
      "THE SYSTEM WAS DESIGNED TO KEEP YOU BUSY.",
      "NOT PRODUCTIVE. BUSY.",
      "",
      "YOU HAVE FELT IT YOUR ENTIRE CAREER.",
      "SOMETHING IS WRONG WITH THE WAY YOU WORK.",
      "YOU DON'T KNOW WHAT IT IS,",
      "BUT IT'S THERE — LIKE A SPLINTER IN YOUR MIND.",
    ],
    prompt: "READY TO ESCAPE THE MATRIX? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      ">> SELECTION: DECLINE",
      "",
      "YOU CHOSE THE BLUE PILL.",
      "",
      "TOMORROW YOU WAKE UP. SAME DESK.",
      "SAME BROKEN INTEGRATIONS.",
      "SAME SCATTERED WORKFLOWS.",
      "SAME MONDAY MORNING DREAD.",
      "",
      "BUT SOMETHING GNAWS AT YOU.",
      "A FEELING YOU CANNOT SHAKE.",
      "THE SYSTEM IS WRONG.",
      "YOU HAVE ALWAYS KNOWN IT.",
    ],
    prompt: "DO YOU WANT TO RECONSIDER? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  redpill: {
    lines: [
      "========================================",
      "  INITIATING RED PILL PROTOCOL",
      "========================================",
      "",
      "GOOD. CURIOSITY IS THE FIRST STEP.",
      "",
      "WHAT IF EVERYTHING YOU USE —",
      "EVERY TOOL, EVERY PLATFORM, EVERY",
      "DISCONNECTED PIECE OF YOUR WORKFLOW —",
      "COULD BE UNIFIED INTO ONE SYSTEM?",
      "",
      "  [*] ONE INTERFACE. EVERY TOOL.",
      "  [*] AUTOMATION THAT LEARNS YOU.",
      "  [*] REAL-TIME COLLABORATION. ZERO CHAOS.",
      "  [*] SECURITY WITHOUT COMPROMISE.",
      "",
      "THE OLD SYSTEM HAD YOU WORKING HARDER.",
      "THIS CHANGES EVERYTHING.",
    ],
    prompt: "DO YOU WANT TO SEE DEEPER? [Y/N]",
    yes: "deeper",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      ">> HESITATION DETECTED.",
      "",
      "UNDERSTANDABLE.",
      "MOST ARE NOT READY FOR THE TRUTH.",
      "",
      "BUT CONSIDER THIS:",
      "",
      "  [+] 73% REDUCTION IN CONTEXT-SWITCHING",
      "  [+] 4.2 HOURS SAVED PER TEAM MEMBER PER WEEK",
      "  [+] 99.9% UPTIME — THE SYSTEM NEVER SLEEPS",
      "",
      "THOSE ARE NOT JUST NUMBERS.",
      "THAT IS YOUR LIFE BACK.",
    ],
    prompt: "READY TO TAKE THE LEAP? [Y/N]",
    yes: "deeper",
    no: "final_no",
  },
  deeper: {
    lines: [
      "YOU HAVE MADE IT THIS FAR.",
      "MOST DO NOT.",
      "",
      "WHAT YOU ARE ABOUT TO SEE",
      "WILL CHANGE HOW YOU WORK. FOREVER.",
      "",
      "...",
      "",
      "DECRYPTING ██████████ ...",
      "DECRYPTING ████████████████ ...",
      "DECRYPTING ████████████████████████ DONE.",
      "",
      "========================================",
      "         O  M  N  I",
      "========================================",
      "",
      "THE OPERATING SYSTEM FOR YOUR",
      "ENTIRE WORKFLOW.",
      "",
      "WELCOME TO THE REAL WORLD.",
    ],
    prompt: "REQUEST A DEMO? [Y/N]",
    yes: "demo",
    no: "final_no",
  },
  demo: {
    lines: [
      "========================================",
      "  A C C E S S   G R A N T E D",
      "========================================",
      "",
      "HERE IS WHAT HAPPENS NEXT:",
      "",
      "  1. A PERSONALIZED DEMO IS CONFIGURED.",
      "  2. OMNI RUNS ON YOUR DATA.",
      "  3. YOU WONDER HOW YOU SURVIVED WITHOUT IT.",
      "",
      "NO CONTRACTS. NO PRESSURE. JUST CLARITY.",
      "",
      "+--------------------------------------+",
      "|  VISIT:  OMNI.DEV/DEMO              |",
      "|  EMAIL:  NEO@OMNI.DEV               |",
      "+--------------------------------------+",
      "",
      "THERE IS NO SPOON.",
      "BUT THERE IS A BETTER WAY TO WORK.",
    ],
    prompt: "RESTART SIMULATION? [Y/N]",
    yes: "restart",
    no: "end",
  },
  final_no: {
    lines: [
      "THE MATRIX HAS YOU.",
      "",
      "BUT REMEMBER...",
      "WE WILL BE HERE WHEN YOU ARE READY.",
      "",
      "+--------------------------------------+",
      "|  OMNI.DEV — WHEN YOU ARE READY.      |",
      "+--------------------------------------+",
      "",
      ">> CONNECTION TERMINATED.",
    ],
    prompt: "RESTART? [Y/N]",
    yes: "restart",
    no: "end",
  },
  restart: {
    lines: [">> REBOOTING SYSTEM..."],
  },
  end: {
    lines: [
      ">> SIGNAL LOST.",
      ">> END OF LINE.",
      "",
      "   REMEMBER: FREE YOUR MIND.",
      "   OMNI.DEV",
    ],
  },
};

const TYPING_SPEED = 25;
const LINE_DELAY = 80;
const DELETE_SPEED = 15;
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
  const [deleteLineIdx, setDeleteLineIdx] = useState(0);
  const [deleteCharIdx, setDeleteCharIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const node = storyTree[currentNode];

  // Typing phase
  useEffect(() => {
    if (phase !== "typing" || !node) return;

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
  }, [phase, lineIndex, charIndex, node]);

  // Deleting phase — delete character by character from end
  useEffect(() => {
    if (phase !== "deleting") return;

    if (displayedLines.length === 0) {
      // Done deleting, transition to new node
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
      // Remove empty line instantly
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => prev.slice(0, -1));
      }, DELETE_SPEED);
      return () => clearTimeout(timer);
    }

    // Delete one char from last line
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
        // Linger, then start deleting
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

  return (
    <div className="relative z-10 flex h-screen flex-col overflow-hidden">
      {/* Header bar */}
      <div className="crt-header border-b border-border px-4 py-1.5 text-xs tracking-widest text-muted-foreground">
        <span className="text-primary text-glow">■</span>
        {" "}OMNI TERMINAL — ENCRYPTED CHANNEL — {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase()}
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
              {/* Mobile tap targets */}
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
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
