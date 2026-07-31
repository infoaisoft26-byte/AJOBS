import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Zap
} from "lucide-react";
import { motion } from "motion/react";

interface CardsProps {
  onCandidateRegister: () => void;
  onCandidateLogin: () => void;
  onConsultancyRegister: () => void;
  onConsultancyLogin: () => void;
}

export default function CandidateConsultancy3DCards({
  onCandidateRegister,
  onCandidateLogin,
  onConsultancyRegister,
  onConsultancyLogin,
}: CardsProps) {
  return (
    <section className="relative py-20 bg-[#020617] text-white border-b border-cyan-500/10 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-96 h-96 rounded-full bg-purple-500/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Dual Ecosystem Pre-Launch</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Choose Your Ecosystem Role
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            Pre-register today for early platform access before the official launch.
          </p>
        </div>

        {/* Two Large Premium Glassmorphism Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {/* CARD 1: FOR CANDIDATES */}
          <motion.div
            whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative rounded-3xl bg-gradient-to-b from-[#07152E]/90 to-[#020617]/95 border border-cyan-500/30 hover:border-cyan-400 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col justify-between space-y-8 overflow-hidden group"
          >
            {/* Top Cyan Accent Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-400/30 transition-all duration-300" />

            <div className="space-y-6 relative z-10">
              {/* Header Badge & Holographic Avatar */}
              <div className="flex items-center justify-between">
                <div className="p-3.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400">
                  <UserCheck className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase">
                  100% Free Candidate Access
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-200 transition-colors">
                  For Candidates
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Create your professional profile, upload your resume and get early access to relevant opportunities.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 pt-2">
                {[
                  "Free Candidate Registration",
                  "Resume Profile & Gemini AI Parsing",
                  "Early Opportunity Access",
                  "Secure Personal Data & Privacy Control",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3 text-xs sm:text-sm text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate CTA Buttons */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10">
              <button
                onClick={onCandidateRegister}
                className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Register as Candidate</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onCandidateLogin}
                className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 text-white text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>Candidate Login</span>
              </button>
            </div>
          </motion.div>

          {/* CARD 2: FOR RECRUITMENT CONSULTANCIES */}
          <motion.div
            whileHover={{ y: -6, rotateX: 2, rotateY: 2 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative rounded-3xl bg-gradient-to-b from-[#07152E]/90 to-[#020617]/95 border border-purple-500/30 hover:border-purple-400 p-8 sm:p-10 backdrop-blur-2xl shadow-[0_0_40px_rgba(124,58,237,0.15)] flex flex-col justify-between space-y-8 overflow-hidden group"
          >
            {/* Top Purple Accent Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-400/30 transition-all duration-300" />

            <div className="space-y-6 relative z-10">
              {/* Header Badge & Holographic Icon */}
              <div className="flex items-center justify-between">
                <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                  <Building2 className="w-8 h-8" />
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold uppercase">
                  Verified Agency Access
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-200 transition-colors">
                  For Recruitment Consultancies
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Register your consultancy and prepare to access AI-powered recruitment tools and hiring networks.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-3 pt-2">
                {[
                  "Consultancy Profile & Agency Branding",
                  "Agency Verification Process",
                  "Recruitment Network & Lead Sharing",
                  "Early Platform Access & AI Copilots",
                ].map((feat) => (
                  <div key={feat} className="flex items-center gap-3 text-xs sm:text-sm text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consultancy CTA Buttons */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/10">
              <button
                onClick={onConsultancyRegister}
                className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(124,58,237,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Register as Consultancy</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onConsultancyLogin}
                className="px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 text-white text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-purple-400" />
                <span>Consultancy Login</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
