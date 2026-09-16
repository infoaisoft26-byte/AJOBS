import React from "react";
import { AlertTriangle, CheckCircle2, Flag, ShieldCheck } from "lucide-react";

export default function SafetyBanner() {
  const points = [
    "AIJOBS does not charge candidates for job applications.",
    "Never pay for interviews or job offers.",
    "Apply only to verified opportunities.",
    "Report suspicious activity."
  ];

  return (
    <section className="py-14 sm:py-16 bg-[#07152F] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[30px] border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] via-white/[0.04] to-blue-400/[0.06] p-6 sm:p-8 lg:p-10 shadow-2xl">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200"><ShieldCheck className="w-4 h-4" />Candidate Safety</div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Your career search should stay safe.</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-400">Use AIJOBS job flows carefully and report anything that looks suspicious or asks you to pay for a job.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {points.map((point, index) => (
                <div key={point} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-slate-200">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-amber-200">
                    {index === 3 ? <Flag className="w-4 h-4" /> : index === 1 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </span>
                  <span className="leading-6">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
