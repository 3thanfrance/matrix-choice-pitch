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
      "OMNI SYSTEMS v2.049",
      "COPYRIGHT (C) 2049 OMNI CORP.",
      "ALL RIGHTS RESERVED.",
      "",
      ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",
      "",
      "LOADING SECURE CHANNEL...",
      "████████████████████████ OK",
      "",
      "WELCOME, OPERATOR.",
      "",
      "THE DIGITAL LANDSCAPE HAS SHIFTED.",
      "YOU HAVE BEEN OPERATING IN A FRAGMENTED",
      "REALITY — SCATTERED TOOLS, BROKEN WORKFLOWS,",
      "ENDLESS CONTEXT-SWITCHING.",
      "",
      "BUT WHAT IF THERE WAS A WAY TO",
      "UNIFY IT ALL?",
      "",
      "SOMETHING CALLED  O M N I.",
    ],
    prompt: "READY TO SEE HOW DEEP THE RABBIT HOLE GOES? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      "",
      ">> SELECTION: DECLINE",
      "",
      "YOU CHOSE IGNORANCE.",
      "",
      "TOMORROW YOU WAKE UP. SAME DESK.",
      "SAME 47 OPEN TABS.",
      "SAME BROKEN INTEGRATIONS.",
      "SAME MONDAY MORNING DREAD.",
      "",
      "...",
      "",
      "BUT SOMETHING GNAWS AT YOU.",
      "A FEELING YOU CANNOT SHAKE.",
      "THE SYSTEM IS WRONG.",
    ],
    prompt: "DO YOU WANT TO RECONSIDER? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  redpill: {
    lines: [
      "",
      "========================================",
      "  INITIATING RED PILL PROTOCOL",
      "========================================",
      "",
      "GOOD. CURIOSITY IS THE FIRST STEP.",
      "",
      "OMNI IS NOT JUST ANOTHER PLATFORM.",
      "IT IS THE OPERATING SYSTEM FOR YOUR",
      "ENTIRE WORKFLOW.",
      "",
      "  [*] ONE DASHBOARD. EVERY TOOL.",
      "  [*] AI AUTOMATION THAT LEARNS YOU.",
      "  [*] REAL-TIME COLLAB. ZERO CHAOS.",
      "  [*] SECURITY WITHOUT COMPROMISE.",
      "",
      "THE OLD SYSTEM HAD YOU WORKING HARDER.",
      "OMNI LETS YOU WORK SMARTER.",
    ],
    prompt: "SEE WHAT OMNI CAN DO FOR YOUR TEAM? [Y/N]",
    yes: "demo",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      "",
      ">> HESITATION DETECTED.",
      "",
      "UNDERSTANDABLE.",
      "MOST ARE NOT READY TO CHANGE.",
      "",
      "BUT CONSIDER THE DATA:",
      "",
      "  [+] 73% REDUCTION IN CONTEXT-SWITCHING",
      "  [+] 4.2 HRS SAVED / TEAM MEMBER / WEEK",
      "  [+] 99.9% UPTIME — SYSTEM NEVER SLEEPS",
      "",
      "THOSE ARE NOT JUST NUMBERS.",
      "THAT IS YOUR LIFE BACK.",
    ],
    prompt: "READY TO TAKE THE LEAP? [Y/N]",
    yes: "demo",
    no: "final_no",
  },
  demo: {
    lines: [
      "",
      "========================================",
      "  W E L C O M E  T O  T H E",
      "  R E A L  W O R L D.",
      "========================================",
      "",
      "HERE IS WHAT HAPPENS NEXT:",
      "",
      "  1. PERSONALIZED DEMO CONFIGURED.",
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
      "",
      "THE MATRIX HAS YOU.",
      "",
      "BUT REMEMBER...",
      "OMNI WILL BE HERE WHEN YOU ARE READY.",
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
      "",
      ">> SIGNAL LOST.",
      ">> END OF LINE.",
      "",
      "   REMEMBER: FREE YOUR MIND.",
      "   OMNI.DEV",
    ],
  },
};

const TYPING_SPEED = 25;
const LINE_DELAY = 100;

const Terminal = () => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentNode, setCurrentNode] = useState("start");
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const node = storyTree[currentNode];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines, showPrompt]);

  useEffect(() => {
    if (!isTyping || !node) return;

    if (lineIndex >= node.lines.length) {
      setIsTyping(false);
      if (node.prompt) {
        setTimeout(() => {
          setShowPrompt(true);
          setWaitingForInput(true);
        }, 300);
      }
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
          if (copy.length <= displayedLines.length - 1 || charIndex === 0) {
            copy.push(currentLine.slice(0, charIndex + 1));
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
  }, [isTyping, lineIndex, charIndex, node, displayedLines.length]);

  const handleInput = useCallback(
    (answer: "y" | "n") => {
      if (!waitingForInput || !node) return;

      setWaitingForInput(false);
      setShowPrompt(false);

      const answerLine = `>> ${answer.toUpperCase()}`;
      setDisplayedLines((prev) => [...prev, "", node.prompt || "", answerLine]);

      const nextKey = answer === "y" ? node.yes : node.no;

      if (nextKey === "restart") {
        setTimeout(() => {
          setDisplayedLines([]);
          setCurrentNode("start");
          setLineIndex(0);
          setCharIndex(0);
          setIsTyping(true);
        }, 500);
      } else if (nextKey) {
        setTimeout(() => {
          setCurrentNode(nextKey);
          setLineIndex(0);
          setCharIndex(0);
          setIsTyping(true);
        }, 300);
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
    <div className="crt-screen relative z-10 flex min-h-screen flex-col">
      {/* CRT bezel / edge vignette is handled by CSS */}
      
      {/* Header bar */}
      <div className="crt-header border-b border-border px-6 py-3 text-xs tracking-widest text-muted-foreground">
        <span className="text-primary text-glow">■</span>
        {" "}OMNI SYSTEMS TERMINAL — SECURE CHANNEL — {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" }).toUpperCase()}
      </div>

      {/* Terminal body — fills screen */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 py-6 text-sm leading-loose text-glow sm:px-12 sm:py-8 md:px-20"
      >
        {displayedLines.map((line, i) => (
          <div
            key={i}
            className="line-fade min-h-[1.5em] whitespace-pre-wrap font-mono"
          >
            {line}
          </div>
        ))}

        {showPrompt && (
          <div className="mt-6">
            <div className="font-bold text-primary">{node.prompt}</div>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-muted-foreground">&gt;&gt;</span>
              <span className="cursor-blink text-primary">█</span>
            </div>
            {/* Mobile tap targets */}
            <div className="mt-6 flex gap-4 sm:hidden">
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
            <div className="mt-3 text-xs text-muted-foreground hidden sm:block">
              PRESS Y OR N
            </div>
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <div className="border-t border-border px-6 py-2 text-xs tracking-wider text-muted-foreground flex justify-between">
        <span>OMNI CORP. // CLASSIFIED</span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
