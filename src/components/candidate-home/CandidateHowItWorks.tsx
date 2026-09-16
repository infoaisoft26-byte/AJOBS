import React from "react";
import { ArrowRight, Award, CheckSquare, Search, Sparkles, UserPlus } from "lucide-react";

export default function CandidateHowItWorks() {
  const steps = [
    {
      number: "1",
      icon: UserPlus,
      title: "Create Your Profile",
      desc: "Sign up and build your professional profile in minutes.",
      highlight: "Quick 2-min setup",
    },
    {
      number: "2",
      icon: Search,
      title: "Search Jobs",
      desc: "Find relevant jobs from verified employers.",
      highlight: "AI-matched roles",
    },
    {
      number: "3",
      icon: CheckSquare,
      title: "Apply Easily",
      desc: "Apply to jobs with just a few clicks.",
      highlight: "Direct to recruiter",
    },
    {
      number: "4",
      icon: Award,
      title: "Get Hired",
      desc: "Track your applications and land your dream job.",
      highlight: "Zero fees forever",
    },
  ];

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simple Process</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          How It{" "}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
            Works
          </span>
        </h2>
        <p className="mt-2.5 text-sm sm:text-base text-slate-400">
          Get hired in 4 simple steps
        </p>
      </div>

      {/* 4 Connected Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          return (
            <div key={idx} className="relative group">
              {/* Card Container */}
              <div className="h-full rounded-2xl sm:rounded-3xl bg-[#0a1532]/70 backdrop-blur-md border border-blue-500/20 p-6 sm:p-7 shadow-[0_12px_35px_rgba(0,12,35,0.5)] group-hover:border-blue-400/50 group-hover:bg-[#0d1a3e]/80 transition-all flex flex-col justify-between">
                <div>
                  {/* Step Number & Icon Header */}
                  <div className="flex items-center justify-between mb-5">
                    {/* Glowing Numbered Badge */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-base flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                      {step.number}
                    </div>

                    {/* Step Icon */}
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                {/* Sub-badge */}
                <div className="mt-5 pt-3 border-t border-white/5">
                  <span className="text-[11px] font-semibold text-cyan-400/90 uppercase tracking-wider font-mono">
                    {step.highlight}
                  </span>
                </div>
              </div>

              {/* Directional Connecting Arrow (visible on large screens between cards) */}
              {!isLast && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#050b1d] border border-blue-400/40 text-cyan-300 items-center justify-center shadow-md">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
