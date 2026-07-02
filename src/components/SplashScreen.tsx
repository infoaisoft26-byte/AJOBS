import { useState, useEffect, useRef } from "react";
import logoImg from "../assets/images/aijobs_logo_1783014982325.jpg";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-complete splash after 4.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for fade-out animation to complete before calling callback
      setTimeout(onComplete, 600);
    }, 4500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Digital Circuit Particle Effect on Canvas
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

    // Particle definition
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 1.2;
        this.speedY = (Math.random() - 0.5) * 1.2;
        this.color = Math.random() > 0.5 ? "147, 51, 234" : "59, 130, 246"; // purple / blue
        this.alpha = Math.random() * 0.5 + 0.3;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce/Wrap
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.fill();
        ctx.restore();
      }
    }

    const particles: Particle[] = Array.from({ length: 45 }, () => new Particle());

    // Connect particles with faint circuit lines
    const drawConnections = () => {
      const maxDistance = 140;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            // Draw angular robotic/circuit style paths sometimes
            if (dist > 80 && Math.random() > 0.95) {
              ctx.lineTo(particles[i].x + dx / 2, particles[i].y);
            }
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = particles[i].color === "147, 51, 234" 
              ? `rgba(147, 51, 234, ${alpha})`
              : `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    };

    const render = () => {
      ctx.fillStyle = "rgba(3, 3, 8, 0.25)"; // Trails
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      drawConnections();

      // Periodic random circuit burst
      if (Math.random() > 0.97) {
        ctx.strokeStyle = "rgba(147, 51, 234, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const startX = Math.random() * width;
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + (Math.random() - 0.5) * 100, height * 0.3);
        ctx.lineTo(startX + (Math.random() - 0.5) * 200, height * 0.7);
        ctx.lineTo(startX + (Math.random() - 0.5) * 100, height);
        ctx.stroke();
      }

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#030308] text-white overflow-hidden select-none"
        >
          {/* Futuristic Grid Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
          />

          {/* Subtly animated ambient lights */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Spacer */}
          <div className="h-20" />

          {/* Main Animated Logo Node */}
          <div className="relative flex flex-col items-center justify-center z-10 scale-90 sm:scale-100">
            {/* 3D Glass Rotating Outer Core */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Purple Energy Ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
                style={{ width: "230px", height: "230px" }}
              />

              {/* Blue Neon Circuit Ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-double border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                style={{ width: "200px", height: "200px" }}
              />

              {/* Core 3D Glass Card Container */}
              <motion.div
                initial={{ rotateY: -180, scale: 0.3, opacity: 0 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }}
                style={{ perspective: 1000 }}
                className="relative w-44 h-44 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group"
              >
                {/* Diagonal Highlight Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent rotate-45 transform translate-y-[-100%] animate-[shimmer_3s_infinite_ease-in-out]" />

                {/* Stunning Premium Logo Image */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-black/40"
                >
                  <img
                    src={logoImg}
                    alt="AIJobs Premium Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Digital Chip Micro-paths in Glass background */}
                <div className="absolute bottom-2 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                <div className="absolute top-2 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              </motion.div>
            </div>

            {/* AIJOBS Text & Tagline */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-center mt-6"
            >
              <h1 className="text-4xl sm:text-5xl font-sans font-black tracking-[0.15em] bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-500 bg-clip-text text-transparent filter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                AIJOBS
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 font-sans tracking-[0.25em] uppercase font-semibold mt-2">
                Find Smarter. Hire Faster.
              </p>
            </motion.div>
          </div>

          {/* Powered By Details at Footer */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col items-center justify-center z-10 text-center font-sans mb-12"
          >
            <span className="text-[10px] text-gray-500 tracking-[0.3em] uppercase font-bold">
              Powered By
            </span>
            <span className="text-sm font-semibold text-gray-300 tracking-[0.15em] mt-1 hover:text-white transition-colors duration-200">
              The Flex Force Services
            </span>
            <div className="w-16 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 my-2 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
            <span className="text-[10px] text-purple-400/80 font-mono tracking-widest uppercase font-medium">
              Established 2024
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
