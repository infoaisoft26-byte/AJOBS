import React, { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  baseAlpha: number;
  color: string;
}

export default function Candidate3DAnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check mobile & motion preferences
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const motionListener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", motionListener);

    const handleMouseMove = (e: MouseEvent) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 2;
      const normY = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x: normX, y: normY });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("resize", checkMobile);
      mediaQuery.removeEventListener("change", motionListener);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Canvas Neural Network & Particle Starfield Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle count: scaled down on mobile for ultra smooth 60fps
    const particleCount = isMobile ? 35 : prefersReducedMotion ? 40 : 85;
    const particles: Particle[] = [];
    const colors = ["#00E5FF", "#008CFF", "#2563EB", "#7C3AED", "#FFFFFF"];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 400 + 50,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2.2 + 0.8,
        baseAlpha: Math.random() * 0.5 + 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Parallax camera offset
      const offsetX = mousePos.x * 15;
      const offsetY = mousePos.y * 15;

      // Draw faint connections (neural network lines)
      const maxDist = isMobile ? 80 : 130;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x + offsetX * 0.4, particles[i].y + offsetY * 0.4);
            ctx.lineTo(particles[j].x + offsetX * 0.4, particles[j].y + offsetY * 0.4);
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw floating particles & soft sparkles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Sparkle oscillation
        const sparkle = Math.sin(time * 2 + i) * 0.2;
        const currentAlpha = Math.max(0.1, Math.min(1, p.baseAlpha + sparkle));

        ctx.beginPath();
        ctx.arc(p.x + offsetX * 0.6, p.y + offsetY * 0.6, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isMobile ? 4 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile, mousePos.x, mousePos.y, prefersReducedMotion]);

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 80% 20%, #071338 0%, #030712 55%, #020617 100%)",
      }}
      aria-hidden="true"
    >
      {/* Dynamic Interactive Starfield & Neural Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      {/* Cybernetic Perspective Grid (Ground Level) */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[380px] opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 229, 255, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 140, 255, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(65deg) translateY(60px)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 90%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 90%)",
        }}
      />

      {/* Light Energy Wave across the bottom horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[140px] pointer-events-none opacity-40 bg-gradient-to-t from-cyan-500/15 via-blue-600/10 to-transparent blur-xl" />

      {/* Ambient Neon Radial Blooms */}
      <div
        className="absolute -top-[15%] right-[5%] w-[650px] h-[650px] rounded-full opacity-35 blur-[120px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0, 140, 255, 0.4) 0%, rgba(124, 58, 237, 0.25) 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[10%] left-[5%] w-[450px] h-[450px] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0, 229, 255, 0.35) 0%, rgba(37, 99, 235, 0.15) 60%, transparent 80%)",
        }}
      />

      {/* ========================================================================= */}
      {/* 3D HOLOGRAPHIC AIJOBS LOGO (Positioned on the RIGHT side) */}
      {/* ========================================================================= */}
      <div
        className="hidden lg:flex absolute right-12 xl:right-24 top-[14%] 2xl:top-[18%] flex-col items-center justify-center pointer-events-none select-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -18}px, ${mousePos.y * -14}px, 0)`,
        }}
      >
        {/* Holographic 3D Floating Stage Container */}
        <div className="relative flex flex-col items-center animate-float-bob">
          {/* Subtle Purple / Cyan Ambient Halo behind the Logo */}
          <div
            className="absolute -inset-10 rounded-full blur-3xl opacity-60"
            style={{
              background: "radial-gradient(circle, rgba(0, 229, 255, 0.45) 0%, rgba(37, 99, 235, 0.3) 40%, rgba(124, 58, 237, 0.2) 70%, transparent 85%)",
            }}
          />

          {/* Floating Transparent 3D Glass Data Cubes */}
          <div
            className="absolute -top-6 -left-10 w-8 h-8 rounded-lg border border-cyan-400/50 bg-cyan-500/10 backdrop-blur-md rotate-12 animate-pulse shadow-[0_0_15px_rgba(0,229,255,0.4)]"
            style={{ animationDuration: "4s" }}
          />
          <div
            className="absolute top-20 -right-8 w-6 h-6 rounded-md border border-purple-400/50 bg-purple-500/10 backdrop-blur-md -rotate-45 shadow-[0_0_12px_rgba(124,58,237,0.4)]"
            style={{ animationDuration: "5s" }}
          />
          <div
            className="absolute -bottom-4 -left-6 w-5 h-5 rounded-md border border-blue-400/50 bg-blue-500/10 backdrop-blur-md rotate-45 shadow-[0_0_10px_rgba(0,140,255,0.4)]"
            style={{ animationDuration: "3.5s" }}
          />

          {/* 3D Crystal Hologram Logo Structure */}
          <div
            className="relative w-44 h-44 xl:w-52 xl:h-52 rounded-3xl p-3 flex items-center justify-center shadow-[0_0_60px_rgba(0,140,255,0.35)]"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.82) 0%, rgba(4, 12, 35, 0.9) 100%)",
              border: "2px solid rgba(0, 229, 255, 0.6)",
              boxShadow: "0 0 35px rgba(0, 229, 255, 0.35), inset 0 0 25px rgba(0, 140, 255, 0.3)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Holographic Laser Scanner Line moving vertically */}
            <div
              className="absolute left-2 right-2 h-[3px] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_15px_#00E5FF] animate-scan-laser pointer-events-none z-20"
            />

            {/* Glowing Corner Accents */}
            <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-purple-400" />
            <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-400" />

            {/* REAL AIJOBS 3D EMBLEM SVG */}
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-32 h-32 xl:w-40 xl:h-40 drop-shadow-[0_0_25px_rgba(0,229,255,0.7)]"
            >
              <defs>
                <linearGradient id="holoSilver" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor="#e0f2fe" />
                  <stop offset="70%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>

                <linearGradient id="holoElectric" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="45%" stopColor="#008CFF" />
                  <stop offset="85%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>

                <filter id="holoGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background Cybernetic Circuit Grid */}
              <path
                d="M18 25 H38 M62 25 H82 M14 75 H34 M66 75 H86 M25 14 V34 M75 14 V34"
                stroke="#00E5FF"
                strokeWidth="1.6"
                strokeOpacity="0.4"
                strokeDasharray="3 3"
              />

              {/* Futuristic Metallic Letter "A" Left Stem */}
              <path
                d="M 50 14 L 20 82 H 36 L 50 50 Z"
                fill="url(#holoSilver)"
                filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.7))"
              />

              {/* Futuristic Metallic Letter "A" Right Stem */}
              <path
                d="M 50 14 L 80 82 H 64 L 50 50 Z"
                fill="url(#holoElectric)"
                filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.7))"
              />

              {/* Central Core Crossbar */}
              <path d="M 32 58 H 68 L 50 40 Z" fill="url(#holoElectric)" />

              {/* Neural Synaptic Laser Lines */}
              <path d="M 50 14 V 40" stroke="#00E5FF" strokeWidth="2.8" filter="url(#holoGlow)" />
              <path d="M 32 66 H 68" stroke="#00E5FF" strokeWidth="2.4" filter="url(#holoGlow)" />
              <path d="M 20 82 L 10 92" stroke="#008CFF" strokeWidth="2.2" />
              <path d="M 80 82 L 90 92" stroke="#7C3AED" strokeWidth="2.2" />

              {/* Glowing Quantum Nodes */}
              <circle cx="50" cy="14" r="4.5" fill="#ffffff" filter="url(#holoGlow)" />
              <circle cx="50" cy="40" r="4" fill="#00E5FF" filter="url(#holoGlow)" />
              <circle cx="32" cy="58" r="3.5" fill="#00E5FF" filter="url(#holoGlow)" />
              <circle cx="68" cy="58" r="3.5" fill="#7C3AED" filter="url(#holoGlow)" />
              <circle cx="10" cy="92" r="3" fill="#008CFF" />
              <circle cx="90" cy="92" r="3" fill="#7C3AED" />
            </svg>
          </div>

          {/* Holographic Typography Labels */}
          <div className="mt-4 text-center">
            <div className="font-extrabold tracking-[0.22em] text-2xl uppercase flex items-center justify-center font-sans drop-shadow-[0_0_18px_rgba(0,229,255,0.6)]">
              <span className="text-white">AI</span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 bg-clip-text text-transparent ml-1">
                JOBS
              </span>
            </div>
            <p className="text-[11px] font-mono font-bold tracking-[0.25em] text-cyan-300/90 uppercase mt-1">
              Find Smarter. Hire Faster.
            </p>
          </div>

          {/* Concentric Rotating Holographic Base Rings */}
          <div className="relative mt-5 w-60 h-16 flex items-center justify-center">
            {/* Outer Rotating Ring */}
            <div
              className="absolute inset-0 rounded-[100%] border border-cyan-400/40 border-dashed animate-spin shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              style={{ animationDuration: "14s" }}
            />
            {/* Middle Reverse Ring */}
            <div
              className="absolute inset-2 rounded-[100%] border border-blue-500/50 border-dotted animate-spin shadow-[0_0_15px_rgba(0,140,255,0.3)]"
              style={{ animationDuration: "9s", animationDirection: "reverse" }}
            />
            {/* Inner Core Platform Glow */}
            <div className="w-28 h-6 rounded-[100%] bg-cyan-400/30 blur-md shadow-[0_0_30px_#00E5FF]" />
          </div>
        </div>
      </div>
    </div>
  );
}
