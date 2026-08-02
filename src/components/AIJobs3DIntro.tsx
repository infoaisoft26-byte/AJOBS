import { storage } from "../firebase";
import { useEffect, useRef, useState } from "react";
import { ref } from "firebase/storage";
import { AnimatePresence, motion } from "motion/react";
import { Brain, Check, Cpu, Lock, Presentation, Scan, Volume2, VolumeX, X } from "lucide-react";
import AIJobsLogo from "./AIJobsLogo";
import soundSynth from "../utils/audioSynth";

interface AIJobs3DIntroProps {
  onComplete: () => void;
}

export default function AIJobs3DIntro({ onComplete }: AIJobs3DIntroProps) {
  const [scene, setScene] = useState<1 | 2 | 3 | 4>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check prefers-reduced-motion and session storage
  useEffect(() => {
    // 1. Reduced motion check
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    // 2. Lock body scroll during intro
    document.body.style.overflow = "hidden";

    // 3. Precise 4-second total timeline
    // Scene 1: 0ms - 900ms (Energy Activation)
    // Scene 2: 900ms - 1900ms (AI Recruitment Core)
    // Scene 3: 1900ms - 2900ms (Smart Matching & Skills)
    // Scene 4: 2900ms - 3800ms (AIJobs Logo Reveal)
    // Finish at 4000ms
    const timers = [
      setTimeout(() => setScene(2), 900),
      setTimeout(() => setScene(3), 1900),
      setTimeout(() => setScene(4), 2900),
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          document.body.style.overflow = "";
          sessionStorage.setItem("aijobs_intro_seen", "true");
          onComplete();
        }, 300);
      }, 3700),
    ];

    const hardFallback = setTimeout(() => {
      document.body.style.overflow = "";
      sessionStorage.setItem("aijobs_intro_seen", "true");
      onComplete();
    }, 4200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(hardFallback);
      document.body.style.overflow = "";
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      sessionStorage.setItem("aijobs_intro_seen", "true");
      onComplete();
    }, 200);
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) {
      soundSynth.playSubtleTone(660, "sine", 0.15, 0.1);
    }
  };

  // Canvas 3D particle neural network renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() * 2.5 + 1,
      color: Math.random() > 0.4 ? "#06B6D4" : Math.random() > 0.5 ? "#2563EB" : "#7C3AED",
    }));

    const render = () => {
      ctx.fillStyle = "rgba(2, 6, 23, 0.3)";
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#020617] text-white flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="AIJobs Cinematic 3D Presentation"
    >
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Atmospheric Ambient Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px] top-1/4 left-1/4 animate-pulse pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/15 blur-[150px] bottom-1/4 right-1/4 animate-pulse pointer-events-none" />

      {/* Top Controls: Audio & Skip Intro */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={toggleAudio}
          className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-full border border-white/10 backdrop-blur-md transition-all cursor-pointer"
          title={audioEnabled ? "Mute audio" : "Enable subtle audio"}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
        </button>

        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-gray-300 hover:text-white rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer hover:border-cyan-400/50"
        >
          <span>Skip Intro</span>
          <X className="w-3.5 h-3.5 text-cyan-400" />
        </button>
      </div>

      {/* Main Intro Scene Content */}
      <div className="relative z-10 max-w-4xl w-full px-6 text-center flex flex-col items-center justify-center min-h-[350px]">
        <AnimatePresence mode="wait">
          {/* SCENE 1: Energy Activation */}
          {scene === 1 && (
            <motion.div
              key="scene1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest">
                <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>AI Neural Subspace Active</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-sans tracking-tight bg-gradient-to-r from-white via-cyan-100 to-slate-300 bg-clip-text text-transparent">
                Next-Gen AI Hiring Architecture
              </h1>
            </motion.div>
          )}

          {/* SCENE 2: AI Recruitment Core */}
          {scene === 2 && (
            <motion.div
              key="scene2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex flex-col items-center"
            >
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                  <Brain className="w-10 h-10 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-extrabold text-white">
                Constructing AI Intelligence Core
              </h2>
            </motion.div>
          )}

          {/* SCENE 3: Resume Scan & Skill Matching */}
          {scene === 3 && (
            <motion.div
              key="scene3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 flex flex-col items-center w-full"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["Technology", "Banking", "Sales", "Operations", "Finance", "Customer Service"].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 backdrop-blur-md shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-xs font-mono text-gray-300 tracking-wider uppercase font-extrabold">
                Scanning Resume Data Nodes & Matching Opportunities...
              </p>
            </motion.div>
          )}

          {/* SCENE 4: AIJobs Reveal */}
          {scene === 4 && (
            <motion.div
              key="scene4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.4 }}
              className="space-y-4 flex flex-col items-center"
            >
              <AIJobsLogo variant="full" size="xl" animated />
              <p className="text-sm font-mono font-extrabold text-cyan-300 uppercase tracking-[0.25em]">
                Find Smarter. Hire Faster.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {[1, 2, 3, 4].map((st) => (
          <div
            key={st}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              scene === st ? "w-6 bg-cyan-400" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
