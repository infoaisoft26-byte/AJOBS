import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Clock, Calendar, Sparkles, ShieldCheck } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function LaunchCountdown3D() {
  const calculateTimeLeft = (): TimeLeft => {
    // Target date: August 19, 2026 00:00:00 IST (UTC +5:30) -> 2026-08-18T18:30:00Z
    const targetDate = new Date("2026-08-18T18:30:00Z").getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section className="relative py-20 bg-[#020617] text-white overflow-hidden border-b border-cyan-500/10">
      {/* Studio Lighting Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-10">
        {/* Section Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Official Launch Date • 19 August 2026</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Countdown to Launch
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            Pre-register today and become part of the AIJobs launch community.
          </p>
        </div>

        {/* Solid Metallic Titanium 3D Modules */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {timeUnits.map((unit) => (
            <motion.div
              key={unit.label}
              whileHover={{ scale: 1.04, y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative group p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#020617] border border-slate-700 hover:border-cyan-400 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center overflow-hidden"
            >
              {/* Brushed Metallic Edge Ring */}
              <div className="absolute inset-0.5 rounded-[22px] border border-slate-600/50 group-hover:border-cyan-400/50 transition-colors pointer-events-none" />

              {/* Top Metallic Bolt Accents */}
              <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-slate-500 border border-slate-400" />
              <div className="absolute top-3 right-4 w-1.5 h-1.5 rounded-full bg-slate-500 border border-slate-400" />

              {/* Illuminated Electric Blue Number Display */}
              <span className="text-4xl sm:text-6xl font-black font-mono text-cyan-300 drop-shadow-[0_0_15px_rgba(2,132,199,0.8)] tracking-tight">
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mt-2">
                {unit.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Bottom Callout */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Guaranteed Early Access Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Zero Public Platform Fee for Candidates</span>
          </div>
        </div>
      </div>
    </section>
  );
}
