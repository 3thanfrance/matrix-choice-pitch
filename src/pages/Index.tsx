import MatrixRain from "@/components/MatrixRain";
import Terminal from "@/components/Terminal";

const Index = () => {
  return (
    <div className="scanlines crt-flicker min-h-screen overflow-hidden">
      <MatrixRain />
      <Terminal />
    </div>
  );
};

export default Index;
