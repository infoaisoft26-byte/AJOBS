import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Brain, Cpu, FileText, CheckCircle2, Building, ArrowRight, X } from "lucide-react";
import AIJobsLogo from "./AIJobsLogo";

interface AIJobs3DIntroProps {
  onComplete: () => void;
}

export default function AIJobs3DIntro({ onComplete }: AIJobs3DIntroProps) {
  const [scene, setScene] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Safety timer and prefers-reduced-motion check
  useEffect(() => {
    // 1. Check prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onComplete();
      return;
    }

    // 2. Lock body scroll during intro
    document.body.style.overflow = "hidden";

    // 3. Scene timing pipeline (total ~7.5s)
    const timers = [
      setTimeout(() => setScene(2), 1400), // Brain formation
      setTimeout(() => setScene(3), 2900), // Holographic Resumes & AI Scan
      setTimeout(() => setScene(4), 4400), // Connection Beams & Matching
      setTimeout(() => setScene(5), 5700), // Metallic Logo Transformation
      setTimeout(() => setScene(6), 6800), // Metrics & Zoom
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          document.body.style.overflow = "";
          onComplete();
        }, 600);
      }, 7600),
    ];

    // 4. Ultimate hard safety fallback at 8.2s
    const hardFallback = setTimeout(() => {
      document.body.style.overflow = "";
      onComplete();
    }, 8200);

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
      onComplete();
    }, 300);
  };

  // Canvas particle neural network renderer
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

    // Particles array
    const particles = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: Math.random() * 2.5 + 1,
      color: Math.random() > 0.4 ? "#00f0ff" : Math.random() > 0.5 ? "#3b82f6" : "#a855f7",
    }));

    // Digital stream columns
    const dataStreams = Array.from({ length: 12 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: Math.random() * 2 + 1,
      chars: "01010101010101010101",
    }));

    let frame = 0;

    const render = () => {
      frame++;
      ctx.fillStyle = "rgba(2, 6, 23, 0.25)";
      ctx.fillRect(0, 0, width, height);

      // Render digital data streams
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(0, 240, 255, 0.15)";
      dataStreams.forEach((stream) => {
        stream.y -= stream.speed;
        if (stream.y < -100) stream.y = height + 100;
        ctx.fillText(stream.chars.slice(0, 6), stream.x, stream.y);
      });

      // Update & render particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Connect nearby particles with neural lines
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.35 * (1 - dist / 110)})`;
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
      className={`fixed inset-0 z-[9999] bg-[#020617] text-white flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="AIJobs Opening 3D Presentation"
    >
      {/* Background Neural Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Atmospheric Ambient Glow Orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] top-1/4 left-1/4 animate-pulse" />
      <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[150px] bottom-1/4 right-1/4 animate-pulse" style={{ animationDuration: "6s" }} />

      {/* Top Bar: Skip Intro Button */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={handleSkip}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-gray-300 hover:text-white rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer group hover:border-cyan-400/50"
        >
          <span>Skip Intro</span>
          <X className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Main 3D Scene Stages */}
      <div className="relative z-10 max-w-4xl w-full px-6 text-center flex flex-col items-center justify-center min-h-[400px]">
        <AnimatePresence mode="wait">
          {/* SCENE 1: Deep Navy Space & Particles */}
          {scene === 1 && (
            <motion.div
              key="scene1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-widest">
                <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Initializing Neural Subspace</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black font-sans tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Next-Gen AI Hiring Architecture
              </h1>
            </motion.div>
          )}

          {/* SCENE 2: 3D AI Brain Formation */}
          {scene === 2 && (
            <motion.div
              key="scene2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 flex flex-col items-center"
            >
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-indigo-500/40 animate-[spin_8s_linear_infinite]" />
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.3)]">
                  <Brain className="w-12 h-12 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                  Synaptic Engine Loaded
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white">
                  Constructing AI Intelligence Core
                </h2>
              </div>
            </motion.div>
          )}

          {/* SCENE 3: Holographic Resumes & AI Scan */}
          {scene === 3 && (
            <motion.div
              key="scene3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 flex flex-col items-center w-full"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
                {[
                  { icon: FileText, label: "Resume Analysis" },
                  { icon: CheckCircle2, label: "Skill Verification" },
                  { icon: Brain, label: "AI Interview" },
                  { icon: Sparkles, label: "Smart Matching" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3.5 bg-white/5 border border-cyan-500/30 rounded-2xl backdrop-blur-md flex flex-col items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                  >
                    <item.icon className="w-6 h-6 text-cyan-400 animate-bounce" style={{ animationDuration: `${2 + i * 0.5}s` }} />
                    <span className="text-[11px] font-mono font-bold text-gray-200">{item.label}</span>
                  </motion.div>
                ))}
              </div>
              <p className="text-xs font-mono text-cyan-300 tracking-wider uppercase font-extrabold">
                Scanning Candidate Profiles & Semantic Match Scores...
              </p>
            </motion.div>
          )}

          {/* SCENE 4: Connection Beams & Matching */}
          {scene === 4 && (
            <motion.div
              key="scene4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="space-y-5 flex flex-col items-center"
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl">
                  <Brain className="w-8 h-8 text-indigo-300" />
                </div>
                <div className="h-0.5 w-20 bg-gradient-to-r from-indigo-500 via-cyan-400 to-purple-500 animate-pulse" />
                <div className="p-4 bg-purple-500/20 border border-purple-500/40 rounded-2xl">
                  <Building className="w-8 h-8 text-purple-300" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl md:text-3xl font-extrabold text-white">
                  Matching Talent with Global Companies
                </h3>
                <p className="text-xs font-mono text-gray-400">
                  Smarter Hiring Powered by Artificial Intelligence
                </p>
              </div>
            </motion.div>
          )}

          {/* SCENE 5 & 6: Metallic 3D Logo Transformation & Live Metrics */}
          {(scene === 5 || scene === 6) && (
            <motion.div
              key="scene5_6"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: scene === 6 ? 1.05 : 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.6 }}
              className="space-y-8 flex flex-col items-center"
            >
              {/* Metallic Logo */}
              <AIJobsLogo variant="full" size="xl" animated />

              {/* Tagline */}
              <div className="space-y-1">
                <p className="text-sm font-mono font-extrabold text-cyan-300 uppercase tracking-[0.25em]">
                  Find Smarter. Hire Faster.
                </p>
              </div>

              {/* Live Animated Metrics */}
              {scene === 6 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl pt-2"
                >
                  {[
                    { label: "Candidates", val: "1M+" },
                    { label: "Companies", val: "25K+" },
                    { label: "Active Jobs", val: "50K+" },
                    { label: "AI Match Score", val: "95%" },
                  ].map((m) => (
                    <div key={m.label} className="p-3 bg-white/5 border border-white/10 rounded-2xl font-mono text-center">
                      <div className="text-lg font-black text-white">{m.val}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{m.label}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Scene Indicator Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((st) => (
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
