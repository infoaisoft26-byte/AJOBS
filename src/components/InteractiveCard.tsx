import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. "rgba(59, 130, 246, 0.2)"
  onClick?: () => void;
  id?: string;
  maxTilt?: number; // Maximum tilt degrees (defaults to 15)
}

/**
 * Reusable InteractiveCard component using motion/react
 * Implements smooth physics-based 3D tilt on hover, depth shadows, glare effect, and magnetic aura.
 */
export default function InteractiveCard({
  children,
  className = "",
  glowColor = "rgba(59, 130, 246, 0.25)",
  onClick,
  id,
  maxTilt = 15,
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Motion values to track normal mouse coordinates [-0.5, 0.5]
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Highly responsive, snappy spring physics configuration
  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  
  // Dynamic transformations for 3D rotation based on coordinates
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);

  // Glare / reflective shine position tracking
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);

  // Depth shadows mapping based on tilt position
  const shadowX = useSpring(useTransform(x, [-0.5, 0.5], [15, -15]), springConfig);
  const shadowY = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseX);
    y.set(mouseY);

    // Update css variables for radial lighting effects
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  const handleMouseEnter = () => {
    setHovering(true);
  };

  const handleMouseLeave = () => {
    setHovering(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      id={id}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX: rotateX,
        rotateY: rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
        boxShadow: hovering
          ? `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${glowColor}`
          : "0 10px 20px rgba(0,0,0,0.2)",
      }}
      animate={{
        scale: hovering ? 1.03 : 1,
        z: hovering ? 40 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative rounded-3xl border border-white/10 overflow-hidden bg-zinc-950/40 backdrop-blur-2xl transition-all duration-300 ${className}`}
    >
      {/* Laser-etched metallic borders */}
      <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none z-30" />
      
      {/* Bevel highlights */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-30" />

      {/* Dynamic Magnetic Ambient Backlight Aura */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-3xl z-0"
        style={{
          background: `radial-gradient(circle 220px at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 80%)`,
          opacity: hovering ? 0.75 : 0,
          mixBlendMode: "screen",
        }}
      />

      {/* Futuristic Glare Mirror Reflection Shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none mix-blend-overlay z-10"
        style={{
          background: `radial-gradient(circle 200px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.15) 0%, transparent 70%)`,
          opacity: hovering ? 0.8 : 0,
        }}
      />

      {/* Projected Content container using transform translateZ to create 3D depth */}
      <div style={{ transform: "translateZ(35px)" }} className="relative z-20 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
