import { useState, useCallback, useEffect, useRef } from "react";
import PretextRain from "@/components/PretextRain";
import Terminal from "@/components/Terminal";
import BootSequence from "@/components/BootSequence";

const Index = () => {
  const [booted, setBooted] = useState(false);
  const hasBootedOnce = useRef(false);
  const [isReboot, setIsReboot] = useState(false);

  const handleBootComplete = useCallback(() => {
    setBooted(true);
    hasBootedOnce.current = true;
  }, []);

  useEffect(() => {
    const handler = () => {
      setBooted(false);
      setIsReboot(true);
    };
    window.addEventListener("terminal-reboot", handler);
    return () => window.removeEventListener("terminal-reboot", handler);
  }, []);

  return (
    <div className="scanlines crt-flicker h-[100dvh] overflow-hidden bg-background">
      {!booted && <BootSequence onComplete={handleBootComplete} isReboot={isReboot} />}
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
