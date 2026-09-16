import React from "react";
import { ArrowRight, Sparkles, UserPlus } from "lucide-react";

interface Props {
  onGetStarted: () => void;
}

export default function CandidateFinalCTA({ onGetStarted }: Props) {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
      <div className="relative rounded-3xl overflow-hidden bg-[#050e26] border border-blue-500/30 p-8 sm:p-12 lg:p-16 shadow-[0_25px_60px_rgba(0,10,35,0.8)]">
        
        {/* City Skyline Backdrop Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/candidate-home/city-bg.webp"
            alt="Futuristic Indian City Skyline"
            className="w-full h-full object-cover object-center opacity-25 mix-blend-screen"
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith(".jpg")) {
                target.src = "/assets/candidate-home/city-bg.jpg";
              }
            }}
          />
          {/* Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#050e26] via-[#050e26]/90 to-[#071338]/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050e26] via-transparent to-transparent" />
        </div>

        {/* Ambient Neon Blobs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          {/* Left Text Block */}
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Free Forever For Candidates</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Your Next Opportunity Is{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Closer Than You Think
              </span>
            </h2>

            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Join thousands of job seekers who are building better careers with AIJOBS.
            </p>
          </div>

          {/* Right Action Block & Cursive Brand Signature */}
          <div className="flex flex-col items-center lg:items-end gap-5 shrink-0">
            <button
              type="button"
              onClick={onGetStarted}
              className="h-14 px-9 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-base shadow-[0_12px_30px_rgba(255,255,255,0.2)] hover:shadow-[0_16px_40px_rgba(56,189,248,0.4)] transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
            >
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>Create Free Profile</span>
              <ArrowRight className="w-4 h-4 text-slate-900 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Cursive Signature on right */}
            <div className="text-center lg:text-right">
              <span className="font-serif italic font-semibold text-sm sm:text-base text-cyan-300/90 tracking-wide drop-shadow-[0_2px_8px_rgba(6,182,212,0.5)]">
                A Brighter Career · A Stronger India
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
