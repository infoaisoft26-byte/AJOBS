import React from "react";
import { BriefcaseBusiness, FileUp, Radar, UserRoundPlus } from "lucide-react";

const steps = [
  { n: "01", title: "Create Free Profile", text: "Set up your candidate account and core career details.", icon: UserRoundPlus },
  { n: "02", title: "Upload Resume", text: "Add your resume so your experience and skills are easier to understand.", icon: FileUp },
  { n: "03", title: "Discover Matching Jobs", text: "Search live openings and explore roles aligned with your profile.", icon: Radar },
  { n: "04", title: "Apply & Track Progress", text: "Apply to opportunities and follow your application journey.", icon: BriefcaseBusiness }
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Simple candidate journey</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">How it works</h2>
          <p className="mt-3 text-sm sm:text-base text-slate-500">From profile creation to tracked applications in four straightforward steps.</p>
        </div>
        <div className="relative mt-10 grid md:grid-cols-4 gap-4">
          <div className="hidden md:block absolute left-[12%] right-[12%] top-10 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          {steps.map(({ n, title, text, icon: Icon }) => (
            <div key={n} className="relative rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#07152F] text-cyan-300 shadow-lg"><Icon className="w-5 h-5" /></span>
                <span className="text-xs font-black tracking-[0.2em] text-slate-300">{n}</span>
              </div>
              <h3 className="mt-5 text-base font-extrabold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
