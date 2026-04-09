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
      "HELLO, ANTON.",
      "",
      "INITIATING IDENTITY VERIFICATION...",
      "",
      "SCANNING ████████████████ ...",
      "LOCATION: LOVABLE HQ, STOCKHOLM",
      "ROLE: FOUNDER / CEO",
      "BIOMETRIC HASH: 7F:3A:9C:██:██:██",
      "",
      "  I D E N T I T Y   C O N F I R M E D",
      "",
      "ANTON — YOU'RE TRAPPED.",
      "AND YOU DON'T EVEN KNOW IT.",
    ],
    prompt: "READY TO BREAK FREE? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  verify: {
    lines: [
      "SCANNING ████████████████ ...",
      "LOCATION: LOVABLE HQ, STOCKHOLM",
      "ROLE: FOUNDER / CEO",
      "BIOMETRIC HASH: 7F:3A:9C:██:██:██",
      "",
      "  I D E N T I T Y   C O N F I R M E D",
      "",
      "ANTON — YOU'RE TRAPPED.",
      "AND YOU DON'T EVEN KNOW IT.",
    ],
    prompt: "READY TO BREAK FREE? [Y/N]",
    yes: "redpill",
    no: "bluepill",
  },
  redpill: {
    lines: [
      ">> RED PILL PROTOCOL: ACTIVATED.",
      "",
      "YOUR TEAM ASKS A QUESTION.",
      "THREE PEOPLE PULL THE SAME METRIC.",
      "THREE DIFFERENT ANSWERS.",
      "NOBODY KNOWS WHO'S RIGHT.",
    ],
    prompt: "SOUND FAMILIAR? [Y/N]",
    yes: "solution",
    no: "hesitate",
  },
  bluepill: {
    lines: [
      ">> BLUE PILL PROTOCOL: ACTIVATED.",
      "SAME DASHBOARDS. SAME CONFUSION.",
      "NOTHING CHANGES.",
    ],
    prompt: "CHANGE YOUR MIND? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  hesitate: {
    lines: [
      ">> HESITATION NOTED.",
      "EVERY QUESTION YOUR AI ANSWERS WRONG —",
      "A DECISION MADE IN THE DARK.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "solution",
    no: "final_no",
  },
  solution: {
    lines: [
      "OMNI. ONE LAYER OF TRUTH.",
      "ASK IN PLAIN ENGLISH. GET REAL ANSWERS.",
      "NO BOTTLENECK. NO ROGUE AI.",
      "PLUGS INTO WHAT YOU ALREADY HAVE.",
    ],
    prompt: "READY TO SEE THE OTHER SIDE? [Y/N]",
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
      "",
      "SEE YOU ON THE OTHER SIDE, ANTON.",
    ],
  },
  final_no: {
    lines: [
      "THE MATRIX HAS YOU, ANTON.",
      "OMNI.CO — WHEN YOU'RE READY.",
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

  // Key click on typing
  useEffect(() => {
    if (phase !== "typing") return;
    clickCountRef.current++;
    if (clickCountRef.current % 2 === 0) playKeyClick();
  }, [charIndex, phase]);

  // Sound on node transitions
  useEffect(() => {
    if (currentNode === "verify") playStatic(0.2, 0.06);
    if (currentNode === "demo") playConfirm();
  }, [currentNode]);

  // Terminal nodes trigger outro
  useEffect(() => {
    if (phase === "idle" && node && !node.prompt && (currentNode === "demo" || currentNode === "final_no")) {
      const timer = setTimeout(() => setOutroStage("omni"), 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, node, currentNode]);

  // Outro sequence
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

  // Reboot listener
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
      setTimeout(() => { setLineIndex((i) => i + 1); setCharIndex(0); }, LINE_DELAY);
      return;
    }
    if (charIndex < currentLine.length) {
      const timer = setTimeout(() => {
        setDisplayedLines((prev) => {
          const copy = [...prev];
          if (charIndex === 0) copy.push(currentLine.slice(0, 1));
          else copy[copy.length - 1] = currentLine.slice(0, charIndex + 1);
          return copy;
        });
        setCharIndex((c) => c + 1);
      }, TYPING_SPEED);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => { setLineIndex((i) => i + 1); setCharIndex(0); }, LINE_DELAY);
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
      const timer = setTimeout(() => setDisplayedLines((prev) => prev.slice(0, -1)), DELETE_SPEED);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setDisplayedLines((prev) => {
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

  // Outro screen
  if (outroStage !== "none") {
    return (
      <div className="relative z-10 flex h-[100dvh] items-center justify-center overflow-hidden">
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
              <div className="text-primary text-xl sm:text-2xl tracking-[0.5em] font-bold">O M N I</div>
              <div className="text-muted-foreground/40 text-xs">OMNI.CO</div>
            </div>
          )}
          {(outroStage === "lovable" || outroStage === "lovable-glitch") && (
            <div className={`text-glow space-y-2 ${outroStage === "lovable-glitch" ? "glitch-text" : ""}`}>
              <div className="text-muted-foreground/50 text-xs tracking-widest">ENABLED BY</div>
              <div className="text-primary text-base sm:text-lg tracking-[0.4em]">L O V A B L E</div>
            </div>
          )}
        </div>

        {outroStage !== "tvoff" && outroStage !== "dead" && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-border px-4 py-1 text-[10px] sm:text-xs tracking-wider text-muted-foreground/40 flex justify-center z-40">
            <span>MISSION BRIEF BY <span className="text-primary/50">OMNI.CO</span></span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden">
      <div className="crt-header border-b border-border px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs tracking-widest text-muted-foreground">
        <span className="text-primary text-glow">■</span>
        {" "}OMNI TERMINAL — ENCRYPTED CHANNEL
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-8 md:px-12"
      >
        <div className="w-full max-w-2xl text-center text-xs sm:text-sm leading-snug text-glow">
          {displayedLines.map((line, i) => (
            <div key={i} className="line-fade min-h-[1.15em] whitespace-pre-wrap font-mono">
              {line}
            </div>
          ))}
          {showPrompt && (
            <div className="mt-2">
              <div className="font-bold text-primary text-xs sm:text-sm">{node.prompt}</div>
              <div className="mt-1 items-center justify-center gap-1 hidden sm:flex">
                <span className="text-muted-foreground">&gt;&gt;</span>
                <span className="cursor-blink text-primary">█</span>
              </div>
              {/* Mobile tap buttons */}
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

      <div className="border-t border-border px-3 sm:px-4 py-1 text-[10px] sm:text-xs tracking-wider text-muted-foreground flex justify-between">
        <span>MISSION BRIEF BY <span className="text-primary/60">OMNI.CO</span></span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
