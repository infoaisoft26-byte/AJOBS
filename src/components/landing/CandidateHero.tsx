import React, { FormEvent } from "react";
import { ArrowRight, Briefcase, CheckCircle2, ChevronDown, MapPin, Search, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { motion } from "motion/react";

interface CandidateHeroProps {
  searchTitle: string;
  searchLocation: string;
  searchCategory: string;
  onSearchTitleChange: (value: string) => void;
  onSearchLocationChange: (value: string) => void;
  onSearchCategoryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onCreateProfile: () => void;
  onApplyJobs: () => void;
  heroImage: string;
}

const trustPoints = ["100% Free for Job Seekers", "No Charges", "No Middlemen", "No Scams"];

export default function CandidateHero({
  searchTitle,
  searchLocation,
  searchCategory,
  onSearchTitleChange,
  onSearchLocationChange,
  onSearchCategoryChange,
  onSearch,
  onCreateProfile,
  onApplyJobs,
  heroImage
}: CandidateHeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#07152F] text-white pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[#2563EB]/25 blur-3xl" />
        <div className="absolute top-12 right-0 h-96 w-96 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#06B6D4]/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/8 px-3.5 py-2 text-[11px] sm:text-xs font-bold tracking-wide text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,.10)] backdrop-blur-xl">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                <span>India&apos;s Trusted AI Job Platform</span>
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.04]">
                A Better Career <span className="bg-gradient-to-r from-[#60A5FA] via-[#22D3EE] to-[#A78BFA] bg-clip-text text-transparent">Starts Here</span>
              </h1>
              <p className="mt-5 text-lg sm:text-xl font-semibold text-slate-200 max-w-2xl">Discover verified jobs. Build your future. No charges. No scams.</p>
              <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl">Just real opportunities with trusted employers.</p>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button onClick={onCreateProfile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 py-3 text-sm font-extrabold text-white shadow-[0_18px_50px_rgba(37,99,235,.35)] transition hover:-translate-y-0.5 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                  <UserPlus className="w-4 h-4" />Create Free Profile
                </button>
                <button onClick={onApplyJobs} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-cyan-300">
                  <Briefcase className="w-4 h-4" />Apply to Jobs<ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] sm:text-xs text-slate-300">
                {trustPoints.map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />{item}</span>)}
              </div>

              <form onSubmit={onSearch} className="mt-8 rounded-[26px] border border-white/12 bg-white/[0.09] p-3 shadow-[0_28px_80px_rgba(2,8,23,.40)] backdrop-blur-2xl">
                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_auto] gap-2.5">
                  <label className="relative block">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={searchTitle} onChange={(e) => onSearchTitleChange(e.target.value)} placeholder="Job, role, skill or company" className="h-12 w-full rounded-2xl border border-white/10 bg-[#07152F]/75 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10" />
                  </label>
                  <label className="relative block">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={searchLocation} onChange={(e) => onSearchLocationChange(e.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#07152F]/75 pl-10 pr-9 text-sm text-slate-200 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10">
                      <option value="">Location</option><option value="Bengaluru">Bengaluru</option><option value="Mumbai">Mumbai</option><option value="Delhi NCR">Delhi NCR</option><option value="Hyderabad">Hyderabad</option><option value="Pune">Pune</option><option value="Chennai">Chennai</option><option value="Kolkata">Kolkata</option><option value="Remote">Remote</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </label>
                  <label className="relative block">
                    <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={searchCategory} onChange={(e) => onSearchCategoryChange(e.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#07152F]/75 pl-10 pr-9 text-sm text-slate-200 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10">
                      <option value="">Category</option><option value="software">IT & Software</option><option value="sales">Sales</option><option value="finance">Banking & Finance</option><option value="customer support">BPO / Customer Service</option><option value="hr">HR & Recruitment</option><option value="marketing">Marketing</option><option value="operations">Operations</option><option value="fresher">Fresher Jobs</option><option value="remote">Work From Home</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </label>
                  <button type="submit" className="h-12 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#06B6D4] px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300">Search Jobs</button>
                </div>
              </form>
            </motion.div>
          </div>

          <motion.div className="lg:col-span-5 relative" initial={{ opacity: 0, scale: 0.96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}>
            <div className="relative mx-auto max-w-lg">
              <div className="absolute -inset-5 rounded-[42px] bg-gradient-to-br from-blue-500/20 via-cyan-400/10 to-purple-500/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[34px] border border-white/15 bg-white/10 shadow-[0_35px_90px_rgba(1,8,25,.55)] backdrop-blur-xl">
                <img src={heroImage} alt="Indian male and female professionals exploring career opportunities with AIJOBS" className="h-[430px] sm:h-[500px] w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07152F] via-transparent to-transparent" />
                <motion.div className="absolute top-5 left-5 rounded-2xl border border-white/15 bg-[#07152F]/75 p-3.5 backdrop-blur-xl" animate={{ y: [0, -5, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
                  <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><ShieldCheck className="w-4 h-4" /></div><div><div className="text-xs font-extrabold">Safer Job Search</div><div className="mt-0.5 text-[10px] text-slate-400">No candidate charges</div></div></div>
                </motion.div>
                <motion.div className="absolute bottom-5 right-5 max-w-[220px] rounded-2xl border border-white/15 bg-[#07152F]/80 p-4 backdrop-blur-xl" animate={{ y: [0, 5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">AIJOBS Career Flow</div>
                  <div className="mt-2 text-sm font-extrabold">Profile → Match → Apply → Track</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-400">Built for faster, clearer candidate journeys.</div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
