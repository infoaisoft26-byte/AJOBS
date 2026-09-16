import React from "react";
import { BadgeCheck, BrainCircuit, Eye, LockKeyhole, MousePointerClick, WalletCards } from "lucide-react";

const cards = [
  { title: "Verified Jobs", text: "Explore opportunities published through AIJOBS hiring workflows.", icon: BadgeCheck },
  { title: "AI Job Matching", text: "Use profile and skill context to surface more relevant roles.", icon: BrainCircuit },
  { title: "Easy Apply", text: "Move from discovery to application with less repetitive effort.", icon: MousePointerClick },
  { title: "Secure Profile", text: "Keep your career information inside a protected candidate experience.", icon: LockKeyhole },
  { title: "No Candidate Charges", text: "AIJOBS does not charge candidates for job applications or placement.", icon: WalletCards },
  { title: "Better Recruiter Visibility", text: "A complete profile and resume can improve how recruiters understand your fit.", icon: Eye }
];

export default function WhyAIJobs() {
  return (
    <section className="py-16 sm:py-20 bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-cyan-300">Built for candidates</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Why AIJOBS for your next move</h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">A clearer candidate journey focused on opportunity discovery, safety and speed.</p>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ title, text, icon: Icon }) => (
            <div key={title} className="group rounded-[26px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.075]">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/15 to-purple-500/15 text-cyan-300"><Icon className="w-5 h-5" /></div>
              <h3 className="mt-5 text-base font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
