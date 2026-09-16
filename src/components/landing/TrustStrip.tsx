import React from "react";
import { BadgeCheck, BriefcaseBusiness, CheckCircle2, LockKeyhole, MousePointerClick, SearchCheck, ShieldCheck } from "lucide-react";

const items = [
  { title: "Verified Jobs", icon: BadgeCheck },
  { title: "Trusted Employers", icon: BriefcaseBusiness },
  { title: "Secure Platform", icon: LockKeyhole },
  { title: "Quick Apply", icon: MousePointerClick },
  { title: "Real Opportunities", icon: CheckCircle2 },
  { title: "Safer Job Search", icon: SearchCheck }
];

export default function TrustStrip() {
  return (
    <section className="bg-[#07152F] border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map(({ title, icon: Icon }) => (
            <div key={title} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-bold text-slate-200 backdrop-blur-xl">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-cyan-300"><Icon className="w-4 h-4" /></span>
              <span>{title}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-cyan-300" />
          <span>Real opportunities. Real people. Real careers.</span>
        </div>
      </div>
    </section>
  );
}
