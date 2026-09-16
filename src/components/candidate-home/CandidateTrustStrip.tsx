import React from "react";
import { BadgeCheck, Building2, FileCheck2, LockKeyhole, SearchCheck, ShieldCheck } from "lucide-react";

const trustItems = [["Verified Jobs", BadgeCheck], ["Trusted Employers", Building2], ["Secure Platform", LockKeyhole], ["100% Free for Candidates", ShieldCheck], ["Quick Apply", FileCheck2], ["Safe Job Search", SearchCheck]] as const;

export default function CandidateTrustStrip() {
  return <section className="relative z-10 border-y border-slate-200 bg-white py-8" aria-labelledby="candidate-trust-heading"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="mb-6 text-center"><h2 id="candidate-trust-heading" className="text-lg font-black text-slate-950">Trusted by employers across India</h2><p className="mt-1 text-sm text-slate-500">Real opportunities. Real people. Real careers.</p></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{trustItems.map(([label, Icon]) => <div key={label} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center shadow-sm"><Icon className="mb-2 h-5 w-5 text-blue-600" /><span className="text-xs font-extrabold text-slate-800">{label}</span></div>)}</div></div></section>;
}
