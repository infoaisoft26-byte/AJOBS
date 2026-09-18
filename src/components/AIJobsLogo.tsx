import React from "react";

export interface AIJobsLogoProps {
  variant?: "full" | "compact" | "icon" | "image";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showTagline?: boolean;
  taglineText?: string;
  animated?: boolean;
  onClick?: () => void;
  altText?: string;
}

export default function AIJobsLogo({
  variant = "full",
  size = "md",
  className = "",
  showTagline,
  taglineText = "AI Powered Hiring Platform",
  animated = true,
  onClick,
  altText = "AIJOBS - AI Powered Hiring Platform"
}: AIJobsLogoProps) {
  // Size dimensions
  const dimensions = {
    xs: { iconSize: 24, imgH: "h-6 w-6", textClass: "text-base", taglineClass: "text-[8px]", gap: "gap-1.5" },
    sm: { iconSize: 32, imgH: "h-8 w-8", textClass: "text-xl", taglineClass: "text-[9px]", gap: "gap-2" },
    md: { iconSize: 40, imgH: "h-10 w-10", textClass: "text-2xl", taglineClass: "text-[10px]", gap: "gap-2.5" },
    lg: { iconSize: 52, imgH: "h-13 w-13", textClass: "text-3xl", taglineClass: "text-xs", gap: "gap-3" },
    xl: { iconSize: 64, imgH: "h-16 w-16", textClass: "text-4xl", taglineClass: "text-sm", gap: "gap-3.5" },
  }[size] || { iconSize: 40, imgH: "h-10 w-10", textClass: "text-2xl", taglineClass: "text-[10px]", gap: "gap-2.5" };

  const displayTagline = showTagline ?? (variant === "full" && size !== "xs" && size !== "sm");

  // Variant "image": Renders the full wide brand lockup image directly
  if (variant === "image") {
    return (
      <div
        onClick={onClick}
        role={onClick ? "button" : "img"}
        tabIndex={onClick ? 0 : undefined}
        aria-label={altText}
        className={`inline-flex items-center select-none ${onClick ? "cursor-pointer group" : ""} ${className}`}
      >
        <img
          src="/assets/aijobs-logo-wide.png"
          alt={altText}
          className={`${dimensions.imgH} w-auto object-contain rounded-lg ${
            animated ? "transition-transform duration-300 group-hover:scale-105" : ""
          }`}
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : "img"}
      tabIndex={onClick ? 0 : undefined}
      aria-label={altText}
      className={`inline-flex items-center ${dimensions.gap} select-none ${
        onClick ? "cursor-pointer group" : ""
      } ${className}`}
    >
      {/* 3D Cyber Emblem with Glowing Aura */}
      <div
        className={`relative flex items-center justify-center shrink-0 ${
          animated ? "group-hover:scale-105 transition-transform duration-300" : ""
        }`}
      >
        {/* Neon Glow Aura */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500/40 via-blue-500/30 to-purple-600/30 blur-md transition-opacity duration-300 group-hover:opacity-100 opacity-80"
          style={{ width: dimensions.iconSize + 6, height: dimensions.iconSize + 6, margin: "-3px" }}
        />

        {/* Square Icon from the official logo */}
        <img
          src="/assets/aijobs-icon.png"
          alt={altText}
          width={dimensions.iconSize}
          height={dimensions.iconSize}
          className="relative z-10 rounded-xl object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.5)] border border-cyan-400/30 bg-[#030712]"
          style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
          loading="eager"
          onError={(e) => {
            // Fallback to logo.png if icon fails
            const target = e.currentTarget;
            if (!target.src.includes("logo.png")) {
              target.src = "/logo.png";
            }
          }}
        />
      </div>

      {/* Brand Text & Tagline matching new 3D typography */}
      {variant !== "icon" && (
        <div className="flex flex-col text-left justify-center">
          <div
            className={`font-black tracking-wide uppercase font-sans ${dimensions.textClass} flex items-center leading-none`}
          >
            <span className="bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              AI
            </span>
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] ml-0.5">
              JOBS
            </span>
          </div>

          {displayTagline && (
            <span
              className={`font-mono font-bold uppercase tracking-[0.18em] text-cyan-300/90 mt-1 ${dimensions.taglineClass}`}
            >
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
