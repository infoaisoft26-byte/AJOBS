import React from "react";
import { ArrowRight, CheckCircle, Sparkles, UserPlus } from "lucide-react";

interface Props {
  onGetStarted: () => void;
  className?: string;
}

export default function CandidateRegistrationCTA({ onGetStarted, className = "" }: Props) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#09173a] to-[#040918] border border-blue-500/30 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,10,35,0.7)] flex flex-col justify-between ${className}`}
    >
      {/* Background Neon Aura */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

      {/* Text Content */}
      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Candidate Exclusive</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
          Ready to Start Your Journey?
        </h3>

        <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          Create your free profile and get discovered by top employers across India.
        </p>

        {/* Feature Highlights */}
        <div className="mt-4 space-y-2 text-xs text-slate-300 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Free — No hidden charges</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct access to verified recruiters</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>AI match alerts for relevant roles</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onGetStarted}
            className="w-full h-12 px-6 rounded-xl bg-gradient-to-r from-[#0066FF] via-[#4f46e5] to-[#7c3aed] hover:from-[#0052cc] hover:to-[#6d28d9] text-white font-bold text-sm shadow-[0_8px_20px_rgba(79,70,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4 text-cyan-200" />
            <span>Create Free Profile</span>
            <ArrowRight className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </div>

      {/* Visual Element: Professional Female Candidate with Laptop */}
      <div className="relative mt-6 pt-4 border-t border-white/10 z-10">
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-white/10 shadow-lg bg-[#071126]">
          <img
            src="/assets/candidate-home/candidate-registration.webp"
            alt="Candidate finding career opportunities on AIJobs"
            className="w-full h-full object-cover object-top"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith(".jpg")) {
                target.src = "/assets/candidate-home/candidate-registration.jpg";
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040918] via-transparent to-transparent opacity-80" />
          
          {/* Cursive Tag */}
          <div className="absolute bottom-3 left-4 right-4 text-center">
            <span className="font-serif italic text-sm font-semibold text-cyan-200 drop-shadow-[0_2px_8px_rgba(6,182,212,0.6)]">
              Your Career Our Mission
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
