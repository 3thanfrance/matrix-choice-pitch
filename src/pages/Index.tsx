import { useState, useCallback, useEffect } from "react";
import PretextRain from "@/components/PretextRain";
import Terminal from "@/components/Terminal";
import BootSequence from "@/components/BootSequence";

const Index = () => {
  const [booted, setBooted] = useState(false);
  const handleBootComplete = useCallback(() => setBooted(true), []);

  useEffect(() => {
    const handler = () => {
      setBooted(false);
      setTimeout(() => {}, 0);
    };
    window.addEventListener("terminal-reboot", handler);
    return () => window.removeEventListener("terminal-reboot", handler);
  }, []);

  return (
    <div className="scanlines crt-flicker h-[100dvh] overflow-hidden bg-background">
      {!booted && <BootSequence onComplete={handleBootComplete} />}
      {booted && (
        <>
          <PretextRain />
          <Terminal />
        </>
      )}
    </div>
  );
};

export default Index;
