import { useState, useEffect, useCallback, useRef } from "react";
import { playKeyClick, playEnterKey, playStatic, playGlitch, playTVOff, playConfirm } from "@/lib/sounds";

interface StoryNode {
  lines: string[];      // Each entry = one "screen" (shown then cleared)
  prompt?: string;
  yes?: string;
  no?: string;
}

// Each node's lines array: lines are typed one at a time.
// Between nodes, ALL text is deleted before the next node types.
// Within a node, we show max ~3 lines at once by grouping.
const storyTree: Record<string, StoryNode> = {
  start: {
    lines: [
      "HELLO, ANTON.",
    ],
  },
  verify: {
    lines: [
      "INITIATING IDENTITY VERIFICATION...",
      "SCANNING ████████████████ ...",
      "LOCATION: LOVABLE HQ, STOCKHOLM",
    ],
  },
  verified: {
    lines: [
      "I D E N T I T Y   C O N F I R M E D",
    ],
  },
  trapped: {
    lines: [
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
      "YOUR TEAM ASKS A QUESTION.",
      "THREE DIFFERENT ANSWERS.",
    ],
    prompt: "SOUND FAMILIAR? [Y/N]",
    yes: "solution",
    no: "hesitate",
  },
  bluepill: {
    lines: [
      ">> BLUE PILL PROTOCOL: ACTIVATED.",
      "SAME DASHBOARDS. SAME CONFUSION.",
    ],
    prompt: "CHANGE YOUR MIND? [Y/N]",
    yes: "redpill",
    no: "final_no",
  },
  hesitate: {
    lines: [
      ">> HESITATION NOTED.",
      "EVERY WRONG ANSWER =",
      "A DECISION MADE IN THE DARK.",
    ],
    prompt: "RECONSIDER? [Y/N]",
    yes: "solution",
    no: "final_no",
  },
  solution: {
    lines: [
      "OMNI. ONE LAYER OF TRUTH.",
      "ASK IN PLAIN ENGLISH.",
      "GET REAL ANSWERS.",
    ],
    prompt: "SEE THE OTHER SIDE? [Y/N]",
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
      "THE MATRIX HAS YOU, ANTON.",
      "OMNI.CO — WHEN YOU'RE READY.",
    ],
  },
};

// Auto-advance sequence (no user input needed)
const AUTO_SEQUENCE = ["start", "verify", "verified", "trapped"];

const TYPING_SPEED = 25;
const DELETE_SPEED = 4;
const LINGER_DURATION = 1200;
const AUTO_LINGER = 1500;

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
  const autoSeqIndexRef = useRef(0);
  const clickCountRef = useRef(0);

  const node = storyTree[currentNode];

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
    if (phase !== "idle" || outroStage !== "none") return;
    if (!node) return;

    // Check if this is an auto-advance node
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

    // Terminal nodes (demo, final_no) → trigger outro after showing demo2
    if (currentNode === "demo") {
      const timer = setTimeout(() => {
        setNextNodeKey("demo2");
        setPhase("deleting");
      }, AUTO_LINGER);
      return () => clearTimeout(timer);
    }

    if (currentNode === "demo2" || currentNode === "final_no") {
      if (!node.prompt) {
        const timer = setTimeout(() => setOutroStage("omni"), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, currentNode, node, outroStage]);

  // Show prompt when typing finishes on interactive nodes
  useEffect(() => {
    if (phase !== "idle" || !node?.prompt) return;
    const timer = setTimeout(() => {
      setShowPrompt(true);
      setWaitingForInput(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [phase, node]);

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
      autoSeqIndexRef.current = 0;
      setPhase("typing");
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
      setPhase("idle");
      return;
    }
    const currentLine = node.lines[lineIndex];
    if (currentLine === "") {
      setDisplayedLines((prev) => [...prev, ""]);
      setTimeout(() => { setLineIndex((i) => i + 1); setCharIndex(0); }, 80);
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
      setTimeout(() => { setLineIndex((i) => i + 1); setCharIndex(0); }, 80);
    }
  }, [phase, lineIndex, charIndex, node, outroStage]);

  // Deleting phase — fast character-by-character delete
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

      <div className="flex flex-1 items-center justify-center overflow-hidden px-4 sm:px-8 md:px-12">
        <div className="w-full max-w-2xl text-center text-xs sm:text-sm leading-relaxed text-glow">
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

      <div className="border-t border-border px-3 sm:px-4 py-1 text-[10px] sm:text-xs tracking-wider text-muted-foreground flex justify-between">
        <span>MISSION BRIEF BY <span className="text-primary/60">OMNI.CO</span></span>
        <span className="text-primary text-glow">SIGNAL: ACTIVE</span>
      </div>
    </div>
  );
};

export default Terminal;
