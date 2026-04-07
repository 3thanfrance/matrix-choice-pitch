import { useState, useCallback } from "react";
import MatrixRain from "@/components/MatrixRain";
import Terminal from "@/components/Terminal";
import BootSequence from "@/components/BootSequence";

const Index = () => {
  const [booted, setBooted] = useState(false);
  const handleBootComplete = useCallback(() => setBooted(true), []);

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
