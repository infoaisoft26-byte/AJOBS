import React from "react";
import { LucideIcon, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export interface EmployerStatCardProps {
  id?: string;
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trendText?: string;
  trendType?: "positive" | "neutral" | "highlight";
  accentColor?: "blue" | "cyan" | "purple" | "emerald";
  onClick?: () => void;
  loading?: boolean;
}

export default function EmployerStatCard({
  id,
  title,
  value,
  icon: Icon,
  subtitle,
  trendText,
  trendType = "positive",
  accentColor = "blue",
  onClick,
  loading = false
}: EmployerStatCardProps) {
  const colorMap = {
    blue: {
      bgIcon: "bg-blue-500/10",
      borderIcon: "border-blue-500/25",
      textIcon: "text-blue-400",
      glow: "hover:shadow-[0_0_25px_rgba(37,99,235,0.18)] hover:border-blue-500/40",
      pill: "text-blue-300 bg-blue-500/10 border-blue-500/20"
    },
    cyan: {
      bgIcon: "bg-cyan-500/10",
      borderIcon: "border-cyan-500/25",
      textIcon: "text-cyan-400",
      glow: "hover:shadow-[0_0_25px_rgba(6,182,212,0.18)] hover:border-cyan-500/40",
      pill: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20"
    },
    purple: {
      bgIcon: "bg-purple-500/10",
      borderIcon: "border-purple-500/25",
      textIcon: "text-purple-400",
      glow: "hover:shadow-[0_0_25px_rgba(168,85,247,0.18)] hover:border-purple-500/40",
      pill: "text-purple-300 bg-purple-500/10 border-purple-500/20"
    },
    emerald: {
      bgIcon: "bg-emerald-500/10",
      borderIcon: "border-emerald-500/25",
      textIcon: "text-emerald-400",
      glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.18)] hover:border-emerald-500/40",
      pill: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
    }
  };

  const scheme = colorMap[accentColor] || colorMap.blue;

  return (
    <motion.div
      id={id}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`relative overflow-hidden p-5.5 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-xl shadow-xl transition-all duration-300 ${scheme.glow} ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* Subtle top laser shine */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            {title}
          </span>
          
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
            {loading ? (
              <div className="h-8 w-16 bg-white/10 animate-pulse rounded-lg" />
            ) : (
              <span>{value}</span>
            )}
          </div>

          {(subtitle || trendText) && (
            <div className="pt-0.5 flex items-center gap-1.5 text-[11px] font-medium truncate">
              {trendType === "positive" && <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />}
              {trendType === "highlight" && <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />}
              <span className={trendType === "positive" ? "text-emerald-400" : trendType === "highlight" ? "text-cyan-300" : "text-slate-400"}>
                {trendText || subtitle}
              </span>
            </div>
          )}
        </div>

        <div className={`w-12 h-12 rounded-2xl ${scheme.bgIcon} border ${scheme.borderIcon} flex items-center justify-center ${scheme.textIcon} shrink-0 shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}
