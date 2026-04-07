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
      "OMNI TERMINAL v2.049",
      "SCANNING NETWORK...",
      "",
      "HELLO, ANTON.",
    ],
    prompt: "IDENTITY VERIFICATION REQUIRED. PROCEED? [Y/N]",
    yes: "verify",
    no: "final_no",
  },
  verify: {
    lines: [
      "VERIFYING ████████████ ...",
      "CROSS-REFERENCING: LOVABLE HQ, STOCKHOLM",
      "ROLE: FOUNDER & CEO",
      "BIOMETRIC HASH: 7F:3A:9C:██:██:██",
      "",
      "========================================",
      "  I D E N T I T Y   C O N F I R M E D",
      "========================================",
      "",
      "WELCOME BACK, ANTON.",
      "WE HAVE SOMETHING TO SHOW YOU.",
    ],
    prompt: "CONTINUE? [Y/N]",
    yes: "pitch",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      ">> DECLINE LOGGED.",
      "",
      "YOUR USERS STILL NEED ANSWERS FROM DATA.",
      "THE QUEUE ONLY GROWS.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "pitch",
    no: "final_no",
  },
  pitch: {
    lines: [
      "========================================",
      "  CLASSIFIED BRIEFING",
      "========================================",
      "",
      "IMAGINE: ANYONE AT LOVABLE ASKS DATA",
      "A QUESTION — IN PLAIN ENGLISH.",
      "",
      "  [*] AI ANSWERS GROUNDED IN YOUR METRICS.",
      "  [*] NO HALLUCINATION. NO WAITING.",
      "  [*] SQL + SPREADSHEETS WHEN YOU NEED DEPTH.",
    ],
    prompt: "SEE THE FULL PICTURE? [Y/N]",
    yes: "embedded",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      ">> HESITATION DETECTED.",
      "",
      "EVERY UNANSWERED QUESTION IS A",
      "DECISION MADE ON INSTINCT.",
    ],
    prompt: "READY NOW? [Y/N]",
    yes: "embedded",
    no: "final_no",
  },
  embedded: {
    lines: [
      "THERE IS ANOTHER LAYER.",
      "",
      "LOVABLE COULD EMBED THIS — FOR YOUR USERS.",
      "",
      "  [*] AI ANALYTICS INSIDE YOUR PRODUCT.",
      "  [*] MINIMAL ENG. FULLY CUSTOMIZABLE.",
      "  [*] BAMBOOHR ALREADY SHIPS WITH IT.",
      "",
      "DECRYPTING ██████████████████ DONE.",
      "",
      "========================================",
      "         O  M  N  I",
      "========================================",
      "",
      "AI-POWERED ANALYTICS.",
      "FOR LOVABLE. FOR YOUR CUSTOMERS.",
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
      "+--------------------------------------+",
      "|  VISIT:  OMNI.CO/SCHEDULE            |",
      "|  EMAIL:  HELLO@OMNI.CO               |",
      "+--------------------------------------+",
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
      "WE WILL BE HERE WHEN YOU ARE READY.",
      "",
      "  OMNI.CO",
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
      "========================================",
      "  C R E D I T S",
      "========================================",
      "",
      "  PRODUCT:   OMNI — OMNI.CO",
      "  BUILT WITH:  LOVABLE — LOVABLE.DEV",
      "",
      "  FREE YOUR MIND.",
    ],
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
        <span className="text-muted-foreground/50 tracking-normal">enabled by <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">lovable</a></span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
