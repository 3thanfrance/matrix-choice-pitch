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
      "> SYSTEM BOOT...",
      "> LOADING omni_sales_protocol.exe...",
      "> ████████████████████████ 100%",
      "",
      "Wake up...",
      "",
      "The digital world has changed.",
      "You've been living in a fragmented reality —",
      "scattered tools, broken workflows, endless tabs.",
      "",
      "But what if I told you there was something",
      "that could unify it all?",
      "",
      "Something called OMNI.",
    ],
    prompt: "Are you ready to see how deep the rabbit hole goes? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      "",
      "You chose the blue pill.",
      "",
      "You wake up in your bed tomorrow and believe",
      "whatever you want to believe.",
      "",
      "The same 47 open tabs.",
      "The same broken integrations.",
      "The same Monday morning dread.",
      "",
      "...",
      "",
      "But something gnaws at you.",
      "A feeling you can't shake.",
    ],
    prompt: "Do you want to reconsider? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  redpill: {
    lines: [
      "",
      "█▓▒░ INITIATING RED PILL PROTOCOL ░▒▓█",
      "",
      "Good. You're curious. That's the first step.",
      "",
      "OMNI is not just another platform.",
      "It's the operating system for your entire workflow.",
      "",
      "  → One dashboard. Every tool connected.",
      "  → AI-powered automation that learns YOUR patterns.",
      "  → Real-time collaboration without the chaos.",
      "  → Security that doesn't slow you down.",
      "",
      "The Matrix had you working harder.",
      "OMNI lets you work smarter.",
    ],
    prompt: "Want to see what OMNI can do for your team? [Y/N]",
    yes: "demo",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      "",
      "I understand your hesitation.",
      "",
      "Most people aren't ready to change.",
      "They're comfortable in the system.",
      "",
      "But consider this:",
      "  → 73% reduction in context-switching",
      "  → 4.2 hours saved per team member, per week",
      "  → 99.9% uptime — the system never sleeps",
      "",
      "Those aren't just numbers.",
      "That's your life back.",
    ],
    prompt: "Ready to take the leap? [Y/N]",
    yes: "demo",
    no: "final_no",
  },
  demo: {
    lines: [
      "",
      "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░",
      "  WELCOME TO THE REAL WORLD.",
      "░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░",
      "",
      "Here's what happens next:",
      "",
      "  1. We set up a personalized demo.",
      "  2. You see OMNI in action with YOUR data.",
      "  3. You wonder how you ever lived without it.",
      "",
      "No contracts. No pressure. Just clarity.",
      "",
      "  ╔══════════════════════════════════════╗",
      "  ║   Visit: omni.dev/demo               ║",
      "  ║   Email: neo@omni.dev                ║",
      "  ╚══════════════════════════════════════╝",
      "",
      "There is no spoon. But there IS a better way to work.",
    ],
    prompt: "Would you like to restart the simulation? [Y/N]",
    yes: "restart",
    no: "end",
  },
  final_no: {
    lines: [
      "",
      "The Matrix has you.",
      "",
      "But remember...",
      "OMNI will be here when you're ready.",
      "",
      "  ╔══════════════════════════════════════╗",
      "  ║   omni.dev — when you're ready.      ║",
      "  ╚══════════════════════════════════════╝",
      "",
      "> CONNECTION TERMINATED.",
    ],
    prompt: "Restart? [Y/N]",
    yes: "restart",
    no: "end",
  },
  restart: {
    lines: ["> REBOOTING SYSTEM..."],
  },
  end: {
    lines: [
      "",
      "> SIGNAL LOST.",
      "> END OF LINE.",
      "",
      "  Remember: free your mind.",
      "  omni.dev",
    ],
  },
};

const TYPING_SPEED = 30;
const LINE_DELAY = 120;

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

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines, showPrompt]);

  // Typewriter effect
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
      // Empty line — add immediately
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

      const answerLine = `> ${answer.toUpperCase()}`;
      setDisplayedLines((prev) => [...prev, "", node.prompt || "", answerLine]);

      const nextKey =
        answer === "y" ? node.yes : node.no;

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

  // Keyboard listener
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
    <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded border border-border bg-background/90 shadow-lg backdrop-blur-sm"
           style={{ boxShadow: "0 0 30px hsl(120 100% 50% / 0.1)" }}>
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-destructive" />
          <span className="h-3 w-3 rounded-full bg-accent" />
          <span className="h-3 w-3 rounded-full bg-primary" />
          <span className="ml-4 text-xs text-muted-foreground">
            omni_terminal v2.049 — SECURE CONNECTION
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="h-[70vh] overflow-y-auto p-6 text-sm leading-relaxed text-glow"
        >
          {displayedLines.map((line, i) => (
            <div key={i} className="line-fade min-h-[1.4em] whitespace-pre-wrap font-mono">
              {line}
            </div>
          ))}

          {showPrompt && (
            <div className="mt-4">
              <div className="text-primary font-bold">{node.prompt}</div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-muted-foreground">&gt;</span>
                <span className="cursor-blink text-primary">█</span>
              </div>
              {/* Mobile buttons */}
              <div className="mt-4 flex gap-4 sm:hidden">
                <button
                  onClick={() => handleInput("y")}
                  className="border border-primary bg-secondary px-6 py-2 text-sm text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  [Y] YES
                </button>
                <button
                  onClick={() => handleInput("n")}
                  className="border border-border bg-secondary px-6 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  [N] NO
                </button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground hidden sm:block">
                Press Y or N on your keyboard
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Terminal;
