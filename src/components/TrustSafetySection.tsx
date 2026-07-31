import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { motion } from "motion/react";


export default function TrustSafetySection() {
  const trustCards = [
    {
      title: "Candidate Registration Is Free",
      desc: "100% free forever for job seekers. We never charge candidates for registration, assessments or interview scheduling.",
      icon: ShieldCheck,
      color: "#10B981",
    },
    {
      title: "Secure Profile Storage",
      desc: "Bank-grade Firestore encryption & strict access controls protect your resume, contact details, and career credentials.",
      icon: Lock,
      color: "#06B6D4",
    },
    {
      title: "Transparent Recruitment Process",
      desc: "Real-time application stage updates without hidden fees or third-party agent markups.",
      icon: FileCheck2,
      color: "#2563EB",
    },
    {
      title: "Privacy-Controlled Access",
      desc: "Your data is only shared with verified employers & recruiters after your explicit consent.",
      icon: UserCheck,
      color: "#7C3AED",
    },
  ];

  return (
    <section className="relative py-20 bg-[#020617] text-white border-b border-cyan-500/10 overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Main Prominent Notice Box */}
        <div className="relative rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#07152E] to-cyan-950/40 border border-emerald-500/40 p-6 sm:p-10 shadow-[0_0_40px_rgba(16,185,129,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shrink-0">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold uppercase">
                Official Trust Notice
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                AIJobs does not charge candidates for registration, interviews or job placement.
              </h3>
              <p className="text-xs sm:text-sm text-gray-300">
                Final selection depends on candidate eligibility, interview performance and employer requirements.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Trust Indicator Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                whileHover={{ y: -5 }}
                className="p-6 rounded-3xl bg-[#07152E]/70 border border-white/10 hover:border-cyan-500/40 backdrop-blur-xl transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] space-y-4"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `${card.color}15`,
                    borderColor: `${card.color}40`,
                    color: card.color,
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white">{card.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
