import React, { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

interface Props {
  className?: string;
  showSkyline?: boolean;
}

export default function CandidateAnimatedBackground({ className = "", showSkyline = true }: Props) {
  const reduceMotion = useReducedMotion();

  // Generate deterministic gentle particle positions
  const particles = useMemo(() => [
    { id: 1, left: "12%", top: "25%", size: 3, delay: 0, duration: 6 },
    { id: 2, left: "28%", top: "65%", size: 4, delay: 1.5, duration: 7 },
    { id: 3, left: "45%", top: "18%", size: 2, delay: 0.8, duration: 5.5 },
    { id: 4, left: "62%", top: "42%", size: 3.5, delay: 2.2, duration: 8 },
    { id: 5, left: "78%", top: "22%", size: 4, delay: 1.1, duration: 6.5 },
    { id: 6, left: "88%", top: "70%", size: 3, delay: 3, duration: 7.2 },
    { id: 7, left: "20%", top: "82%", size: 2.5, delay: 2, duration: 6.8 },
    { id: 8, left: "70%", top: "85%", size: 3, delay: 0.5, duration: 5.8 },
  ], []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none -z-10 bg-[#030712] ${className}`}
    >
      {/* Deep Midnight Navy Base Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,35,80,0.85),rgba(3,7,18,1))]" />

      {/* Luminous Glow Blobs: Electric Blue, Cyan, Purple */}
      <motion.div
        className="absolute -top-32 left-[10%] h-[480px] w-[480px] rounded-full bg-blue-600/20 blur-[130px]"
        animate={reduceMotion ? undefined : {
          x: [0, 20, 0],
          y: [0, -15, 0],
          opacity: [0.35, 0.55, 0.35]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-20 right-[5%] h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[140px]"
        animate={reduceMotion ? undefined : {
          x: [0, -25, 0],
          y: [0, 20, 0],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-[45%] left-[25%] h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[120px]"
        animate={reduceMotion ? undefined : {
          scale: [1, 1.08, 1],
          opacity: [0.2, 0.38, 0.2]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-10 right-[20%] h-[420px] w-[420px] rounded-full bg-purple-600/18 blur-[130px]"
        animate={reduceMotion ? undefined : {
          y: [0, -20, 0],
          opacity: [0.25, 0.45, 0.25]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Subtle Digital Grid Network Accent */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 40%, transparent 100%)",
        }}
      />

      {/* Cybernetic Diagonal Ambient Light Beams */}
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(56,189,248,0.03)_40%,rgba(168,85,247,0.03)_50%,transparent_60%)]" />

      {/* Soft Ambient Floating Light Particles */}
      {!reduceMotion && (
        <div className="hidden sm:block absolute inset-0">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
              }}
              animate={{
                y: [0, -18, 0],
                opacity: [0.2, 0.85, 0.2],
                scale: [1, 1.25, 1],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Skyline Silhouette Overlay */}
      {showSkyline && (
        <div
          className="absolute bottom-0 left-0 right-0 h-44 opacity-20 bg-repeat-x bg-bottom"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 180' fill='%230b1e42'%3E%3Cpath d='M0,180 L0,140 L30,140 L30,90 L60,90 L60,140 L90,140 L90,110 L120,110 L120,60 L140,40 L160,60 L160,140 L190,140 L190,100 L220,100 L220,150 L260,150 L260,70 L300,70 L300,140 L330,140 L330,120 L370,120 L370,50 L410,50 L410,140 L450,140 L450,90 L480,90 L480,150 L530,150 L530,30 L560,30 L560,140 L600,140 L600,100 L640,100 L640,140 L680,140 L680,80 L720,80 L720,150 L770,150 L770,45 L800,45 L800,140 L840,140 L840,110 L880,110 L880,150 L920,150 L920,70 L960,70 L960,140 L1000,140 L1000,90 L1040,90 L1040,150 L1090,150 L1090,55 L1130,55 L1130,140 L1170,140 L1170,110 L1200,110 L1200,180 Z'/%3E%3C/svg%3E")`,
            backgroundSize: "600px 90px",
          }}
        />
      )}
    </div>
  );
}
