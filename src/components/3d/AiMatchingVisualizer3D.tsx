import { useEffect, useRef, useState } from "react";
import { ref } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import { Building, Cpu, FileText, Grid, Pause, Play, Search, Section, ShieldCheck, Sparkles, Upload, Verified } from "lucide-react";
const SKILL_NODES = [
  { id: "tech", label: "Technology & AI", score: "98% Match", color: "#06B6D4" },
  { id: "banking", label: "Banking & Finance", score: "94% Match", color: "#2563EB" },
  { id: "sales", label: "Sales & Growth", score: "91% Match", color: "#7C3AED" },
  { id: "ops", label: "Operations & Supply", score: "95% Match", color: "#38BDF8" },
  { id: "cs", label: "Customer Service", score: "92% Match", color: "#10B981" },
];

const PIPELINE_STEPS = [
  {
    step: 1,
    title: "Candidate Profile",
    subtitle: "Resume Upload & Document Parsing",
    icon: FileText,
    desc: "Candidate profile and resume bytes are ingested securely into AIJobs processing engine.",
  },
  {
    step: 2,
    title: "AI Resume Analysis",
    subtitle: "Gemini 2.5 Semantic Extraction",
    icon: Cpu,
    desc: "Extracts hard skills, domain experience, work history, and certification credentials.",
  },
  {
    step: 3,
    title: "Skill Intelligence",
    subtitle: "Synaptic Scoring & Verification",
    icon: Sparkles,
    desc: "Calculates precise multidimensional skill vectors and candidate readiness index.",
  },
  {
    step: 4,
    title: "Opportunity Matching",
    subtitle: "Direct Company & Job Alignment",
    icon: Search,
    desc: "Algorithms evaluate role fit against active hiring mandates from recruiters.",
  },
  {
    step: 5,
    title: "Employer / Consultancy Connection",
    subtitle: "Verified Partner Linkage",
    icon: Building,
    desc: "Direct handshake between candidates, consultancies, and top employers.",
  },
];

export default function AiMatchingVisualizer3D() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto step rotation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev >= 5 ? 1 : prev + 1));
    }, 3200);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Interactive Canvas background beam animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 320);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 320;
    };
    window.addEventListener("resize", handleResize);

    let scanX = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Scanner laser beam
      scanX = (scanX + 2.5) % width;
      const gradient = ctx.createLinearGradient(scanX - 60, 0, scanX + 10, 0);
      gradient.addColorStop(0, "rgba(6, 182, 212, 0)");
      gradient.addColorStop(0.5, "rgba(6, 182, 212, 0.25)");
      gradient.addColorStop(1, "rgba(37, 99, 235, 0.8)");

      ctx.fillStyle = gradient;
      ctx.fillRect(scanX - 60, 0, 70, height);

      // Vertical scanner line
      ctx.shadowColor = "#06B6D4";
      ctx.shadowBlur = 12;
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <section className="relative py-20 bg-[#020617] text-white overflow-hidden border-t border-b border-cyan-500/10">
      {/* Glow Orbs */}
      <div className="absolute top-1/2 left-10 w-96 h-96 rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>AI Neural Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            How AIJobs Connects Talent
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            AI-powered matching designed to connect the right skills with the right opportunities.
          </p>
        </div>

        {/* Holographic 3D Pipeline Visualizer Canvas */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#07152E]/80 to-[#020617]/90 border border-cyan-500/20 backdrop-blur-xl p-6 sm:p-10 shadow-[0_0_50px_rgba(6,182,212,0.1)] overflow-hidden">
          {/* Background Canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

          {/* Top Controls */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-sm font-mono font-bold text-cyan-300">
                Live Engine Pipeline • Stage {activeStep} of 5
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-gray-300 flex items-center gap-2 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{isPlaying ? "Pause Simulation" : "Play Simulation"}</span>
              </button>
            </div>
          </div>

          {/* 5-Step Pipeline Steps Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-5 gap-3 mb-10">
            {PIPELINE_STEPS.map((stepItem) => {
              const isActive = activeStep === stepItem.step;
              const Icon = stepItem.icon;
              return (
                <button
                  key={stepItem.step}
                  onClick={() => {
                    setActiveStep(stepItem.step);
                    setIsPlaying(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between h-36 ${
                    isActive
                      ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                      : "bg-white/5 border-white/10 hover:border-cyan-500/40 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-mono font-bold ${isActive ? "text-cyan-400" : "text-gray-500"}`}>
                      0{stepItem.step}
                    </span>
                    <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400 animate-bounce" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${isActive ? "text-white" : "text-gray-300"}`}>
                      {stepItem.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                      {stepItem.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed Active Stage Simulation Panel */}
          <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <AnimatePresence mode="wait">
              {PIPELINE_STEPS.map((stepItem) => {
                if (stepItem.step !== activeStep) return null;
                const Icon = stepItem.icon;
                return (
                  <motion.div
                    key={stepItem.step}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                  >
                    <div className="md:col-span-7 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-white">
                            {stepItem.title}
                          </h3>
                          <p className="text-xs font-mono text-cyan-300">
                            {stepItem.subtitle}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {stepItem.desc}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>AI Security Verified</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold">
                          Latency: &lt;12ms
                        </span>
                      </div>
                    </div>

                    {/* Skill Node Hologram */}
                    <div className="md:col-span-5 bg-[#020617]/80 border border-cyan-500/30 rounded-xl p-4 space-y-2">
                      <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-2">
                        Evaluated Skill Vector Nodes
                      </span>
                      {SKILL_NODES.map((sn) => (
                        <div
                          key={sn.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 hover:border-cyan-400/30 transition-colors"
                        >
                          <span className="text-xs font-medium text-gray-200">{sn.label}</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">{sn.score}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
