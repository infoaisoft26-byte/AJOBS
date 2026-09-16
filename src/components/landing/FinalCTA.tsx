import React from "react";
import { ArrowRight, BellRing, BookmarkCheck, Eye, Sparkles } from "lucide-react";

const benefits = [
  { title: "Save applications", icon: BookmarkCheck },
  { title: "Resume visibility", icon: Eye },
  { title: "Better job matching", icon: Sparkles },
  { title: "Recruiter alerts", icon: BellRing }
];

export default function FinalCTA({ onCreateProfile, onBrowseJobs }: { onCreateProfile: () => void; onBrowseJobs: () => void }) {
  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-[#07152F] via-[#0A1E45] to-[#111B4F] p-7 sm:p-10 lg:p-12 text-white shadow-[0_30px_80px_rgba(7,21,47,.22)]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-300">Your next step</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Create your free candidate profile.</h2>
              <p className="mt-3 max-w-xl text-sm sm:text-base text-slate-300">Save your career details, keep applications organized and make future job applications faster.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={onCreateProfile} className="min-h-12 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">Create Free Profile</button>
                <button onClick={onBrowseJobs} className="min-h-12 rounded-2xl border border-white/15 bg-white/[0.07] px-6 text-sm font-bold transition hover:bg-white/[0.11]">Browse Live Jobs <ArrowRight className="inline ml-1 w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {benefits.map(({ title, icon: Icon }) => (
                <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon className="w-4 h-4" /></span>
                  <span className="text-sm font-bold text-slate-200">{title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
