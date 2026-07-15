import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // e.g. "rgba(59, 130, 246, 0.4)"
  onClick?: () => void;
  id?: string;
}

export default function HolographicCard({
  children,
  className = "",
  glowColor = "rgba(59, 130, 246, 0.2)",
  onClick,
  id,
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);

  // Framer Motion spring configurations for ultra-smooth buttery responsive tilts
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 180, mass: 0.6 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), springConfig);

  // Glare/reflection coordinates
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [0, 100]), springConfig);
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [0, 100]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    // Calculate normal offset [-0.5, 0.5]
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    x.set(mouseX);
    y.set(mouseY);
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
      }}
      animate={{
        scale: hovering ? 1.025 : 1,
        z: hovering ? 50 : 0,
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative glass rounded-[24px] border border-white/5 backdrop-blur-xl overflow-hidden cursor-pointer shadow-xl ${className}`}
    >
      {/* Dynamic Ambient Neo-glowing Backlight (Magnetic Aura) */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-[24px]"
        style={{
          background: `radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 80%)`,
          opacity: hovering ? 0.8 : 0,
          mixBlendMode: "screen",
        }}
      />

      {/* Glass Mirror Glare Shimmer Sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 mix-blend-overlay"
        style={{
          background: `radial-gradient(circle 180px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.12) 0%, transparent 60%)`,
          opacity: hovering ? 0.9 : 0,
        }}
      />

      {/* Fine Horizontal Metallic Bevel Shimmers */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />

      {/* Inner card content (projected out with preserve-3d) */}
      <div style={{ transform: "translateZ(30px)" }} className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
