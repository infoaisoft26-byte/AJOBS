import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Check touch devices or user preference
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      setIsEnabled(false);
      return;
    }

    let particleId = 0;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      // Check if hovering over interactive elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.tagName === "INPUT" ||
          target.closest("button") ||
          target.closest("a") ||
          target.classList.contains("cursor-pointer") ||
          target.getAttribute("role") === "button")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }

      // Add particle trail on fast mouse move
      if (Math.random() > 0.6) {
        const colors = ["#6366f1", "#a855f7", "#3b82f6", "#38bdf8"];
        const newParticle: Particle = {
          id: particleId++,
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          size: Math.random() * 5 + 2,
          color: colors[Math.floor(Math.random() * colors.length)]
        };

        setParticles((prev) => [...prev.slice(-12), newParticle]);
      }
    };

    const handleMouseDown = () => {
      setIsClicked(true);
    };

    const handleMouseUp = () => {
      setIsClicked(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (!isEnabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
      {/* Particle Trail */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 0.1, y: p.y - 15 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`
          }}
        />
      ))}

      {/* Main Cursor Outer Ring */}
      <motion.div
        animate={{
          x: position.x - (isHovered ? 24 : 16),
          y: position.y - (isHovered ? 24 : 16),
          scale: isClicked ? 0.75 : isHovered ? 1.5 : 1,
          borderColor: isHovered ? "rgba(168, 85, 247, 0.8)" : "rgba(99, 102, 241, 0.6)",
          backgroundColor: isHovered ? "rgba(168, 85, 247, 0.12)" : "rgba(99, 102, 241, 0.05)"
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          mass: 0.2
        }}
        className={`absolute rounded-full border-2 backdrop-blur-[1px] ${
          isHovered ? "shadow-[0_0_20px_rgba(168,85,247,0.5)]" : "shadow-[0_0_12px_rgba(99,102,241,0.3)]"
        }`}
        style={{
          width: 32,
          height: 32
        }}
      />

      {/* Center Core Pointer Dot */}
      <motion.div
        animate={{
          x: position.x - 3,
          y: position.y - 3,
          scale: isHovered ? 0 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 800,
          damping: 35
        }}
        className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
      />
    </div>
  );
}

export default CustomCursor;
