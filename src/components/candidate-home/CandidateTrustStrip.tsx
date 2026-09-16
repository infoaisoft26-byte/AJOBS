import React from "react";
import {
  BadgeCheck,
  Building,
  CheckCircle2,
  IndianRupee,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export default function CandidateTrustStrip() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Verified Jobs",
      desc: "Only genuine opportunities",
    },
    {
      icon: Users,
      title: "Trusted Employers",
      desc: "Real companies. Real roles.",
    },
    {
      icon: Lock,
      title: "Secure Platform",
      desc: "Your data stays safe",
    },
    {
      icon: IndianRupee,
      title: "100% Free for Candidates",
      desc: "No charges. Ever.",
    },
    {
      icon: Zap,
      title: "Quick Apply",
      desc: "Apply in just a few clicks",
    },
    {
      icon: Shield,
      title: "Safe Job Search",
      desc: "A safer, smarter way to find jobs",
    },
  ];

  return (
    <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 sm:-mt-4 mb-12 sm:mb-16">
      <div className="rounded-2xl sm:rounded-3xl bg-[#081226]/80 backdrop-blur-xl border border-white/10 p-4 sm:p-6 shadow-[0_16px_50px_rgba(0,10,35,0.7)]">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(6,1fr)_auto] items-center gap-4 sm:gap-6 divide-y sm:divide-y-0 divide-white/5">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 pt-3 sm:pt-0 group hover:translate-y-[-1px] transition-transform"
              >
                {/* Glowing Blue Icon Container */}
                <div className="h-10 w-10 sm:h-11 sm:sm-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.3)] group-hover:bg-blue-600/30 group-hover:border-cyan-400/60 transition-all">
                  <Icon className="w-5 h-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight truncate">
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Right end of strip: Divider & Nationwide Trust Marker */}
          <div className="col-span-2 md:col-span-3 xl:col-span-1 pt-4 xl:pt-0 xl:pl-6 border-t xl:border-t-0 xl:border-l border-white/10 flex flex-col justify-center">
            <div className="text-xs sm:text-sm font-extrabold text-cyan-300 tracking-tight leading-snug flex items-center gap-1.5">
              <span>Trusted by employers across India</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
              Real opportunities. Real people. Real careers.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
