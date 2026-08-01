
export interface AIJobsLogoProps {
  variant?: "full" | "compact" | "icon";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export default function AIJobsLogo({
  variant = "full",
  size = "md",
  className = "",
  showTagline,
  animated = true,
  onClick
}: AIJobsLogoProps) {
  // Size dimensions
  const dimensions = {
    sm: { iconSize: 28, textClass: "text-lg", taglineClass: "text-[9px]" },
    md: { iconSize: 36, textClass: "text-2xl", taglineClass: "text-[10px]" },
    lg: { iconSize: 48, textClass: "text-3xl", taglineClass: "text-xs" },
    xl: { iconSize: 64, textClass: "text-4xl", taglineClass: "text-sm" },
  }[size];

  const displayTagline = showTagline ?? (variant === "full" && size !== "sm");

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label="AIJobs – AI Powered Hiring Platform"
      className={`inline-flex items-center gap-3 select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      {/* 3D Metallic Emblem with Glowing Circuit Lines */}
      <div className={`relative flex items-center justify-center shrink-0 ${animated ? "group-hover:scale-105 transition-transform duration-300" : ""}`}>
        {/* Neon Glow Aura */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/30 via-indigo-500/30 to-purple-500/20 blur-md transition-opacity duration-300 group-hover:opacity-100 opacity-75"
          style={{ width: dimensions.iconSize + 8, height: dimensions.iconSize + 8, margin: "-4px" }}
        />

        <svg
          width={dimensions.iconSize}
          height={dimensions.iconSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 drop-shadow-[0_4px_12px_rgba(0,240,255,0.4)]"
        >
          <defs>
            {/* Metallic Silver Outer Gradient */}
            <linearGradient id="metallicSilver" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>

            {/* Neon Electric Blue/Cyan Inner Core */}
            <linearGradient id="electricCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            {/* Glowing Circuit Node Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Glass Background Gradient */}
            <linearGradient id="glassBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.9)" />
              <stop offset="100%" stopColor="rgba(30, 41, 59, 0.7)" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Container Frame */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="24"
            fill="url(#glassBg)"
            stroke="url(#electricCore)"
            strokeWidth="3"
            strokeOpacity="0.8"
          />

          {/* Background Circuit Grid Lines */}
          <path d="M20 25 H40 M60 25 H80 M15 75 H35 M65 75 H85 M25 15 V35 M75 15 V35" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="3 3" />

          {/* Futuristic Metallic Letter "A" Structure */}
          {/* Left Stem */}
          <path
            d="M 50 16 L 22 80 H 38 L 50 50 Z"
            fill="url(#metallicSilver)"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))"
          />

          {/* Right Stem */}
          <path
            d="M 50 16 L 78 80 H 62 L 50 50 Z"
            fill="url(#electricCore)"
            filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))"
          />

          {/* Crossbar & Core Energy Node */}
          <path
            d="M 33 58 H 67 L 50 40 Z"
            fill="url(#electricCore)"
          />

          {/* Neural Circuit Lines running through the Letter A */}
          <path d="M 50 16 V 40" stroke="#00f0ff" strokeWidth="2.5" filter="url(#neonGlow)" />
          <path d="M 32 66 H 68" stroke="#00f0ff" strokeWidth="2" filter="url(#neonGlow)" />
          <path d="M 22 80 L 12 90" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 78 80 L 88 90" stroke="#a855f7" strokeWidth="2" />

          {/* Glowing Neural Circuit Nodes */}
          <circle cx="50" cy="16" r="4" fill="#ffffff" filter="url(#neonGlow)" />
          <circle cx="50" cy="40" r="3.5" fill="#00f0ff" filter="url(#neonGlow)" />
          <circle cx="33" cy="58" r="3" fill="#00f0ff" filter="url(#neonGlow)" />
          <circle cx="67" cy="58" r="3" fill="#a855f7" filter="url(#neonGlow)" />
          <circle cx="12" cy="90" r="2.5" fill="#38bdf8" />
          <circle cx="88" cy="90" r="2.5" fill="#a855f7" />
        </svg>
      </div>

      {/* Brand Text & Tagline */}
      {variant !== "icon" && (
        <div className="flex flex-col text-left">
          <div className={`font-black tracking-wider uppercase font-sans ${dimensions.textClass} flex items-center leading-none`}>
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              AI
            </span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]">
              JOBS
            </span>
          </div>

          {displayTagline && (
            <span className={`font-mono font-extrabold uppercase tracking-[0.18em] text-cyan-300/80 mt-1 ${dimensions.taglineClass}`}>
              AI Powered Hiring Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
