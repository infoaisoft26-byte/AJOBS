import { useState, useEffect, useRef } from "react";
import logoImg from "../assets/images/aijobs_logo_1783014982325.jpg";
import { Sparkles, Cpu, Globe, Database, Radio, Compass, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-complete splash after 5.5 seconds (cinematic duration)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for luxury fade-out
    }, 5500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Cinematic load phase simulation
  useEffect(() => {
    const intervals = [800, 1800, 2800, 4200];
    const timers = intervals.map((ms, idx) => 
      setTimeout(() => setLoadingStep(idx + 1), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Track mouse movement for luxury parallax/3D lens-flare effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX - window.innerWidth / 2) / 35,
        y: (e.clientY - window.innerHeight / 2) / 35,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Complex canvas: Neural Networks + Cyber Code Rain + Atmospheric Aurora Dust
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Aurora Glow Blob configuration
    interface Aurora {
      x: number;
      y: number;
      radius: number;
      color: string;
      vx: number;
      vy: number;
    }

    const auroras: Aurora[] = [
      { x: width * 0.2, y: height * 0.3, radius: 450, color: "rgba(99, 102, 241, 0.08)", vx: 0.3, vy: 0.1 },
      { x: width * 0.8, y: height * 0.7, radius: 550, color: "rgba(168, 85, 247, 0.07)", vx: -0.2, vy: -0.2 },
      { x: width * 0.5, y: height * 0.2, radius: 400, color: "rgba(59, 130, 246, 0.06)", vx: 0.1, vy: 0.3 },
    ];

    // Neural Node definition
    class Node {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      alpha: number;
      pulseSpeed: number;
      pulseAngle: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.alpha = Math.random() * 0.4 + 0.2;
        this.pulseSpeed = 0.02 + Math.random() * 0.03;
        this.pulseAngle = Math.random() * Math.PI;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulseAngle += this.pulseSpeed;
        this.alpha = 0.2 + Math.sin(this.pulseAngle) * 0.2;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${this.alpha})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(168, 85, 247, 0.8)";
        ctx.fill();
      }
    }

    // Cyber Rain column definition (elegant, ultra-fine)
    class RainDrop {
      x: number;
      y: number;
      speed: number;
      length: number;
      alpha: number;
      chars: string[];
      currentChar: string;
      updateTimer: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height;
        this.speed = Math.random() * 4 + 2;
        this.length = Math.random() * 80 + 40;
        this.alpha = Math.random() * 0.15 + 0.05;
        this.chars = "010101XYZΩΨΦΞ▲◆⬡".split("");
        this.currentChar = this.chars[Math.floor(Math.random() * this.chars.length)];
        this.updateTimer = 0;
      }

      update() {
        this.y += this.speed;
        this.updateTimer++;
        if (this.updateTimer > 15) {
          this.currentChar = this.chars[Math.floor(Math.random() * this.chars.length)];
          this.updateTimer = 0;
        }
        if (this.y > height) {
          this.y = -100;
          this.x = Math.random() * width;
          this.speed = Math.random() * 4 + 2;
        }
      }

      draw() {
        if (!ctx) return;
        // Fine gradient trail
        const grad = ctx.createLinearGradient(this.x, this.y - this.length, this.x, this.y);
        grad.addColorStop(0, "rgba(99, 102, 241, 0)");
        grad.addColorStop(0.8, `rgba(59, 130, 246, ${this.alpha * 0.6})`);
        grad.addColorStop(1, `rgba(168, 85, 247, ${this.alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.length);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        // Render fine terminal character at head of trail
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 1.5})`;
        ctx.font = "8px monospace";
        ctx.fillText(this.currentChar, this.x - 3, this.y);
      }
    }

    const nodes = Array.from({ length: 60 }, () => new Node());
    const rain = Array.from({ length: 45 }, () => new RainDrop());

    const render = () => {
      // Clear with absolute rich black-slate background
      ctx.fillStyle = "#020204";
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Nebula/Aurora Layer (Depth 0)
      auroras.forEach((a) => {
        a.x += a.vx;
        a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;

        const gradient = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.radius);
        gradient.addColorStop(0, a.color);
        gradient.addColorStop(1, "rgba(2, 2, 4, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Digital Rain Layer (Depth 1)
      rain.forEach((r) => {
        r.update();
        r.draw();
      });

      // 3. Draw Neural network connecting graph (Depth 2)
      nodes.forEach((n) => {
        n.update();
        n.draw();
      });

      // Connect nodes based on distance thresholds
      const maxDistance = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = (1 - dist / maxDistance) * 0.15;
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity * (nodes[i].alpha + nodes[j].alpha)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            // Inject organic angled cyber-circuit logic
            if (dist > 100 && Math.random() > 0.985) {
              ctx.lineTo(nodes[i].x + dx * 0.3, nodes[i].y);
            }
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 4. Volumetric Light Beams (Depth 3)
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const beamGrad = ctx.createLinearGradient(0, 0, width, height * 0.4);
      beamGrad.addColorStop(0, "rgba(129, 140, 248, 0.04)");
      beamGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.02)");
      beamGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.4, 0);
      ctx.lineTo(width * 0.75, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="splash-screen-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(15px)" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black text-white overflow-hidden select-none"
        >
          {/* Base Atmospheric Canvas Rendering */}
          <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

          {/* Depth of Field Background Light Blooms */}
          <div className="absolute inset-0 pointer-events-none z-1 overflow-hidden">
            {/* Ambient Aurora Blue / Purple Blooms */}
            <motion.div
              animate={{
                scale: [1, 1.15, 0.95, 1],
                opacity: [0.35, 0.5, 0.3, 0.35],
                x: [-15, 15, -10, -15],
                y: [10, -15, 15, 10],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/6 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[140px]"
            />
            <motion.div
              animate={{
                scale: [1, 0.9, 1.1, 1],
                opacity: [0.25, 0.4, 0.25, 0.25],
                x: [10, -10, 15, 10],
                y: [-15, 15, -10, -15],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-1/6 right-1/4 translate-x-1/2 translate-y-1/2 w-[800px] h-[800px] bg-purple-600/8 rounded-full blur-[150px]"
            />
          </div>

          {/* Cinematic Animated Lens Flare (Dynamic Sweep) */}
          <motion.div
            initial={{ left: "-20%", top: "25%", opacity: 0 }}
            animate={{ left: "120%", top: "35%", opacity: [0, 0.95, 0.95, 0] }}
            transition={{ duration: 4.8, ease: "easeInOut", delay: 0.4 }}
            className="absolute w-[450px] h-[2px] bg-gradient-to-r from-transparent via-sky-300 to-transparent pointer-events-none z-10 blur-[1px] rotate-[-5deg]"
            style={{
              boxShadow: "0 0 40px 10px rgba(125, 211, 252, 0.4)",
            }}
          >
            {/* Core Lens Flare Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 blur-[6px] shadow-[0_0_20px_5px_rgba(255,255,255,0.9)]" />
            <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-400/40 blur-[4px]" />
            <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-500/15 blur-[8px]" />
          </motion.div>

          {/* Top Decorative Spatially Isolated UI (Apple Vision Pro Space Bar Feel) */}
          <div className="w-full flex justify-between items-center px-10 pt-8 z-10 pointer-events-none">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 backdrop-blur-md bg-white/[0.03] border border-white/5 px-4 py-1.5 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-[pulse_1.5s_infinite_ease-in-out]" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
                Secured Hypernode: Online
              </span>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 text-gray-500 text-[10px] font-mono tracking-widest"
            >
              <span>V3.80.12 // ENTERPRISE</span>
              <span className="h-3 w-[1px] bg-white/10" />
              <span>UTC {new Date().toISOString().split("T")[1].slice(0, 5)}</span>
            </motion.div>
          </div>

          {/* Interactive Floating Holographic Panels & 3D Spatial Frame */}
          <div
            className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-6 z-10 mt-6"
            style={{
              transform: `rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)`,
              transformStyle: "preserve-3d",
              perspective: 1000,
              transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* BACKGROUND DE-FOCUSED PANEL (Left Side Depth of Field Hologram) */}
            <motion.div
              initial={{ scale: 0.8, x: -60, opacity: 0, rotateY: 15 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              transition={{ delay: 1.4, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ transform: "translateZ(-80px) rotateY(12deg)" }}
              className="hidden lg:flex flex-col gap-4 w-60 p-5 rounded-2xl border border-white/5 bg-neutral-900/10 backdrop-blur-md shadow-2xl filter blur-[1.5px] hover:blur-0 transition-all duration-300 pointer-events-none text-left"
            >
              <div className="flex items-center gap-2 text-indigo-400">
                <Cpu className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold">Neural Matching Engine</span>
              </div>
              <div className="space-y-2">
                <div className="h-[2px] bg-gradient-to-r from-indigo-500/50 to-transparent rounded-full" />
                <span className="text-[9px] font-mono text-gray-400 block">SEMANTIC THREADS: 1,482/SEC</span>
                <span className="text-[9px] font-mono text-gray-400 block">COGNITIVE MATCH COEFFICIENT: 0.998</span>
                <span className="text-[9px] font-mono text-emerald-400 block">SYSTEM LOAD: OPTIMAL</span>
              </div>
              {/* Fake Micro Graph */}
              <div className="h-10 w-full bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden relative flex items-end p-1 gap-1">
                <div className="h-4 w-full bg-indigo-500/20 rounded-sm animate-[pulse_1.5s_infinite_ease-in-out]" />
                <div className="h-8 w-full bg-indigo-500/30 rounded-sm animate-[pulse_1.8s_infinite_ease-in-out]" />
                <div className="h-6 w-full bg-indigo-500/40 rounded-sm animate-[pulse_1.2s_infinite_ease-in-out]" />
                <div className="h-9 w-full bg-indigo-500/50 rounded-sm animate-[pulse_2s_infinite_ease-in-out]" />
              </div>
            </motion.div>

            {/* CORE APPLE VISION PRO GLASS CARD CONTAINER (Foreground In-Focus) */}
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ transform: "translateZ(80px)" }}
              className="relative w-full max-w-md h-[420px] rounded-[36px] bg-[#0c0c14]/30 border border-white/10 backdrop-blur-3xl flex flex-col items-center justify-between p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.95)] overflow-hidden group"
            >
              {/* Realistic glass diagonal mirror highlight sweep overlay */}
              <motion.div
                animate={{
                  x: ["-100%", "250%"],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent skew-x-12 pointer-events-none"
              />

              {/* Edge/Corner glowing accents inside glass container */}
              <div className="absolute top-0 left-0 w-24 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="absolute bottom-0 right-0 w-24 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

              {/* Top Luxury Header Inside Card */}
              <div className="w-full flex justify-between items-start pointer-events-none">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-indigo-400 font-extrabold">
                    AIJOBS COGNITIVE CORE
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-mono uppercase text-emerald-400">
                      LIVE STREAM
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg">
                  <Cpu className="w-4 h-4 text-indigo-300" />
                </div>
              </div>

              {/* Metallic Logo Frame with Multi-layered Highlights and Glowing Aura */}
              <div className="relative flex items-center justify-center pointer-events-none">
                {/* Ultra high-contrast glowing shadow halo */}
                <div className="absolute w-40 h-40 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full blur-[35px] animate-[pulse_3s_infinite_ease-in-out]" />

                {/* Metallic Chrome Ring (Outer Bevel) */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute p-[1.5px] rounded-[32px] bg-gradient-to-tr from-zinc-600 via-zinc-100 to-zinc-700 shadow-2xl"
                  style={{ width: "152px", height: "152px" }}
                >
                  <div className="w-full h-full rounded-[30px] bg-[#08080d]" />
                </motion.div>

                {/* Inner Neon Ring */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute rounded-full border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  style={{ width: "128px", height: "128px" }}
                />

                {/* Glass core layer with authentic high-gloss shadow */}
                <motion.div
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.8)] bg-black/40 flex items-center justify-center z-10"
                >
                  <img
                    src={logoImg}
                    alt="AIJobs Metallic Core"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                  />
                  {/* Glass Gloss Overlay Reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent rotate-45 transform translate-y-[-50%]" />
                </motion.div>
              </div>

              {/* Dynamic Bottom Status / Stepped Loading Loader */}
              <div className="w-full space-y-4">
                <div className="flex justify-between items-end text-xs">
                  <div className="text-left">
                    <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-widest">
                      Booting System
                    </span>
                    <span className="font-bold text-white tracking-[0.05em] font-mono">
                      {loadingStep === 0 && "INIT INTEGRATED GRAPH..."}
                      {loadingStep === 1 && "CONNECTING CLOUD FIREBASE..."}
                      {loadingStep === 2 && "LOADING TALENT SEMANTICS..."}
                      {loadingStep === 3 && "ACTIVATING INTUITIVE INTERFACES..."}
                      {loadingStep === 4 && "DECRYPTION MATRIX LOADED."}
                    </span>
                  </div>
                  <span className="font-mono text-indigo-400 font-extrabold text-[11px]">
                    {loadingStep * 25}%
                  </span>
                </div>

                {/* Elegant, ultra-fine high-contrast progress tracker */}
                <div className="h-1.5 w-full bg-white/[0.03] border border-white/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: `${loadingStep * 25}%` }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  />
                </div>
              </div>
            </motion.div>

            {/* BACKGROUND DE-FOCUSED PANEL (Right Side Depth of Field Hologram) */}
            <motion.div
              initial={{ scale: 0.8, x: 60, opacity: 0, rotateY: -15 }}
              animate={{ scale: 1, x: 0, opacity: 1 }}
              transition={{ delay: 1.6, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ transform: "translateZ(-80px) rotateY(-12deg)" }}
              className="hidden lg:flex flex-col gap-4 w-60 p-5 rounded-2xl border border-white/5 bg-neutral-900/10 backdrop-blur-md shadow-2xl filter blur-[1.5px] hover:blur-0 transition-all duration-300 pointer-events-none text-left"
            >
              <div className="flex items-center gap-2 text-purple-400">
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold">Global Talent Registry</span>
              </div>
              <div className="space-y-2">
                <div className="h-[2px] bg-gradient-to-r from-purple-500/50 to-transparent rounded-full" />
                <span className="text-[9px] font-mono text-gray-400 block">CONNECTED ENDPOINTS: 14,208</span>
                <span className="text-[9px] font-mono text-gray-400 block">VERIFIED CV INDEX: 24.8M</span>
                <span className="text-[9px] font-mono text-emerald-400 block">DATASPACE NODE: ASIA-EAST1</span>
              </div>
              {/* Digital Globe / Radar HUD Indicator */}
              <div className="h-10 w-full flex items-center justify-center gap-1.5 border border-white/5 bg-white/[0.01] rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,transparent_70%)] animate-pulse" />
                <Globe className="w-5 h-5 text-purple-400/30 animate-spin" style={{ animationDuration: "12s" }} />
                <span className="text-[8px] font-mono text-purple-400/80 tracking-widest animate-pulse">SYNCING DATA ATLAS</span>
              </div>
            </motion.div>
          </div>

          {/* Luxury Minimal Bottom Footer (Tesla / OpenAI Inspired Brand Presentation) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.8, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center z-10 text-center font-sans mb-10 pb-4"
          >
            {/* Elegant luxury minimalist company branding logo lettering */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-sans font-black tracking-[0.25em] bg-gradient-to-r from-white via-zinc-300 to-zinc-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                AIJOBS
              </h1>
              <span className="text-[7px] border border-white/15 px-1.5 py-0.5 rounded-full font-mono text-gray-400 uppercase tracking-widest bg-white/[0.02]">
                PRO ACCELERATOR
              </span>
            </div>

            <p className="text-[9px] sm:text-xs text-gray-400 font-sans tracking-[0.4em] uppercase font-bold text-center pl-[0.4em]">
              FIND SMARTER. HIRE FASTER.
            </p>

            <div className="w-20 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent my-3.5 rounded-full" />

            <div className="flex items-center gap-3 text-[9px] text-gray-500 tracking-[0.2em] uppercase font-semibold">
              <span>POWERED BY THE FLEX FORCE SERVICES</span>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/40" />
              <span className="text-purple-400 font-mono">ESTD 2024</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
