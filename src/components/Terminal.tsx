import { useState, useEffect, useCallback, useRef } from "react";
import { playKeyClick, playEnterKey, playStatic, playGlitch, playTVOff, playConfirm } from "@/lib/sounds";

interface StoryNode {
  lines: string[];
  prompt?: string;
  yes?: string;
  no?: string;
}

const storyTree: Record<string, StoryNode> = {
  start: {
    lines: [
      "YOU'RE TRAPPED — AND YOU DON'T EVEN KNOW IT.",
      "LOCKED INSIDE A SYSTEM THAT FEEDS YOU DASHBOARDS",
      "BUT STARVES YOU OF ANSWERS.",
    ],
    prompt: "READY TO SEE THE TRUTH? [Y/N]",
    yes: "verify",
    no: "bluepill",
  },
  verify: {
    lines: [
      "WAIT.",
      "",
      "SCANNING ████████████ ...",
      "LOCATION: LOVABLE HQ, STOCKHOLM",
      "BIOMETRIC HASH: 7F:3A:9C:██:██:██",
      "",
      "  I D E N T I T Y   C O N F I R M E D",
      "",
      "ANTON OSIKA. FOUNDER. LOVABLE.",
      "WE'VE BEEN WATCHING. YOU'RE READY.",
    ],
    prompt: "TAKE THE RED PILL? [Y/N]",
    yes: "pitch",
    no: "bluepill",
  },
  bluepill: {
    lines: [
      ">> BLUE PILL ACCEPTED.",
      "YOU WAKE UP TOMORROW. SAME DASHBOARDS.",
      "SAME QUESTIONS NO ONE CAN ANSWER.",
    ],
    prompt: "CHANGE YOUR MIND? [Y/N]",
    yes: "pitch",
    no: "final_no",
  },
  pitch: {
    lines: [
      "WHAT IF ANYONE ON YOUR TEAM COULD",
      "ASK A QUESTION IN PLAIN ENGLISH",
      "AND ACTUALLY TRUST THE ANSWER?",
      "",
      "NO SQL. NO TICKETS. NO WAITING.",
    ],
    prompt: "WANT TO SEE HOW? [Y/N]",
    yes: "embedded",
    no: "hesitate",
  },
  hesitate: {
    lines: [
      ">> HESITATION NOTED.",
      "EVERY QUESTION LEFT UNASKED",
      "IS A DECISION MADE IN THE DARK.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "embedded",
    no: "final_no",
  },
  embedded: {
    lines: [
      "NOW PICTURE THIS INSIDE YOUR PRODUCT.",
      "YOUR USERS ASKING THEIR OWN QUESTIONS.",
      "",
      "AI ANALYTICS — EMBEDDED. CUSTOMIZABLE.",
      "GROUNDED IN YOUR METRICS.",
    ],
    prompt: "READY TO MEET THE ARCHITECTS? [Y/N]",
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
  },
  final_no: {
    lines: [
      "THE MATRIX HAS YOU, ANTON.",
      "OMNI.CO — WHEN YOU'RE READY TO WAKE UP.",
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
  const [outroStage, setOutroStage] = useState<"none" | "omni" | "omni-glitch" | "lovable" | "lovable-glitch" | "tvoff" | "dead">("none");
  const [requestReboot, setRequestReboot] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const clickCountRef = useRef(0);

  const node = storyTree[currentNode];

  // Play key click on every typed character (throttled)
  useEffect(() => {
    if (phase !== "typing") return;
    clickCountRef.current++;
    // Play every other char to avoid overwhelming audio
    if (clickCountRef.current % 2 === 0) {
      playKeyClick();
    }
  }, [charIndex, phase]);

  // Sound on node transitions
  useEffect(() => {
    if (currentNode === "verify") playStatic(0.2, 0.06);
    if (currentNode === "demo") playConfirm();
  }, [currentNode]);

  // When typing finishes on a terminal node (no prompt), trigger outro
  useEffect(() => {
    if (phase === "idle" && node && !node.prompt && (currentNode === "demo" || currentNode === "final_no")) {
      const timer = setTimeout(() => {
        setOutroStage("omni");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, node, currentNode]);

  // Outro sequence with sounds
  useEffect(() => {
    if (outroStage === "none") return;
    let timers: ReturnType<typeof setTimeout>[] = [];

    if (outroStage === "omni") {
      timers.push(setTimeout(() => setOutroStage("omni-glitch"), 2000));
    } else if (outroStage === "omni-glitch") {
      playGlitch();
      timers.push(setTimeout(() => setOutroStage("lovable"), 600));
    } else if (outroStage === "lovable") {
      timers.push(setTimeout(() => setOutroStage("lovable-glitch"), 2000));
    } else if (outroStage === "lovable-glitch") {
      playGlitch();
      timers.push(setTimeout(() => setOutroStage("tvoff"), 600));
    } else if (outroStage === "tvoff") {
      playTVOff();
      timers.push(setTimeout(() => {
        setOutroStage("dead");
        setRequestReboot(true);
      }, 800));
    }

    return () => timers.forEach(clearTimeout);
  }, [outroStage]);

  // Listen for any key to reboot
  useEffect(() => {
    if (!requestReboot) return;
    const handler = () => {
      setRequestReboot(false);
      setOutroStage("none");
      setDisplayedLines([]);
      setCurrentNode("start");
      setLineIndex(0);
      setCharIndex(0);
      setShowPrompt(false);
      setWaitingForInput(false);
      setNextNodeKey(null);
      window.dispatchEvent(new CustomEvent("terminal-reboot"));
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("click", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("click", handler);
    };
  }, [requestReboot]);

  // Typing phase
  useEffect(() => {
    if (phase !== "typing" || !node || outroStage !== "none") return;

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
  }, [phase, lineIndex, charIndex, node, outroStage]);

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

  // Outro screen
  if (outroStage !== "none") {
    return (
      <div className="relative z-10 flex h-screen items-center justify-center overflow-hidden">
        <div className="text-center font-mono">
          {(outroStage === "tvoff" || outroStage === "dead") && (
            <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
              {outroStage === "tvoff" && (
                <div className="w-full h-[2px] bg-primary/60 animate-pulse" />
              )}
            </div>
          )}

          {(outroStage === "omni" || outroStage === "omni-glitch") && (
            <div className={`text-glow space-y-2 ${outroStage === "omni-glitch" ? "glitch-text" : ""}`}>
              <div className="text-primary text-2xl tracking-[0.5em] font-bold">
                O M N I
              </div>
              <div className="text-muted-foreground/40 text-xs">OMNI.CO</div>
            </div>
          )}

          {(outroStage === "lovable" || outroStage === "lovable-glitch") && (
            <div className={`text-glow space-y-2 ${outroStage === "lovable-glitch" ? "glitch-text" : ""}`}>
              <div className="text-muted-foreground/50 text-xs tracking-widest">ENABLED BY</div>
              <div className="text-primary text-lg tracking-[0.4em]">
                L O V A B L E
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-screen flex-col overflow-hidden">
      <div className="crt-header border-b border-border px-4 py-1.5 text-xs tracking-widest text-muted-foreground">
        <span className="text-primary text-glow">■</span>
        {" "}OMNI TERMINAL — ENCRYPTED CHANNEL
      </div>

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

      <div className="border-t border-border px-4 py-1 text-xs tracking-wider text-muted-foreground flex justify-between">
        <span>CLASSIFIED // EYES ONLY</span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
