import { useState, useCallback, useEffect } from "react";
import MatrixRain from "@/components/MatrixRain";
import Terminal from "@/components/Terminal";
import BootSequence from "@/components/BootSequence";

const Index = () => {
  const [booted, setBooted] = useState(false);
  const handleBootComplete = useCallback(() => setBooted(true), []);

  // Listen for terminal reboot event to replay boot sequence
  useEffect(() => {
    const handler = () => {
      setBooted(false);
      // Small delay to ensure BootSequence remounts
      setTimeout(() => {}, 0);
    };
    window.addEventListener("terminal-reboot", handler);
    return () => window.removeEventListener("terminal-reboot", handler);
  }, []);

  return (
    <div className="scanlines crt-flicker min-h-screen overflow-hidden bg-background">
      {!booted && <BootSequence onComplete={handleBootComplete} />}
      {booted && (
        <>
          <MatrixRain />
          <Terminal />
        </>
      )}
    </div>
  );
};

export default Index;
