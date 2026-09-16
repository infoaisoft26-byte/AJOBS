import React, { FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, ChevronDown, MapPin, Search, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import candidateHeroImage from "../../assets/images/candidate-home-professionals.webp";

interface CandidateHeroProps {
  keyword: string; location: string; category: string; isRegistered: boolean; candidateName?: string;
  onKeywordChange: (value: string) => void; onLocationChange: (value: string) => void; onCategoryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void; onCreateProfile: () => void; onBrowseJobs: () => void;
}

export default function CandidateHero({ keyword, location, category, isRegistered, candidateName, onKeywordChange, onLocationChange, onCategoryChange, onSearch, onCreateProfile, onBrowseJobs }: CandidateHeroProps) {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden bg-transparent text-white">
      <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-20">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.55 }} className="relative z-10">
          {isRegistered && candidateName && <p className="mb-4 text-sm font-bold text-cyan-200">Welcome back, {candidateName.split(" ")[0]}</p>}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/[0.08] px-3.5 py-2 text-xs font-extrabold text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,.12)] backdrop-blur-xl"><ShieldCheck className="h-4 w-4 text-cyan-300" />India&apos;s Trusted AI Job Platform</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-.04em] sm:text-5xl lg:text-6xl">A Better Career <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">Starts Here</span></h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-200 sm:text-xl">Discover verified jobs. Build your future. No charges. No scams.</p>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Just real opportunities with trusted employers.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={onCreateProfile} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-[0_18px_50px_rgba(37,99,235,.38)] transition hover:-translate-y-0.5 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"><UserPlus className="h-4 w-4" />{isRegistered ? "Open Candidate Dashboard" : "Create Free Profile"}</button>
            <button onClick={onBrowseJobs} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.13] focus:outline-none focus:ring-2 focus:ring-cyan-300"><BriefcaseBusiness className="h-4 w-4" />Apply to Jobs <ArrowRight className="h-4 w-4" /></button>
          </div>
          <form onSubmit={onSearch} className="mt-8 rounded-[26px] border border-white/15 bg-white/[0.09] p-3 shadow-[0_28px_80px_rgba(2,8,23,.42)] backdrop-blur-2xl">
            <div className="grid gap-2.5 md:grid-cols-[1.45fr_1fr_1fr_auto]">
              <label className="relative block"><span className="sr-only">Job title, skill or company</span><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder="Job title, skill or company" className="h-12 w-full rounded-2xl border border-white/10 bg-[#07152F]/80 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10" /></label>
              <label className="relative block"><span className="sr-only">Location</span><MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={location} onChange={(event) => onLocationChange(event.target.value)} placeholder="Location" className="h-12 w-full rounded-2xl border border-white/10 bg-[#07152F]/80 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10" /></label>
              <label className="relative block"><span className="sr-only">Job category</span><Sparkles className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-white/10 bg-[#07152F]/80 pl-10 pr-9 text-sm text-slate-200 outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-400/10"><option value="">Category</option><option value="software">IT &amp; Software</option><option value="sales">Sales</option><option value="banking finance">Banking &amp; Finance</option><option value="customer support">BPO / Customer Service</option><option value="hr recruitment">HR &amp; Recruitment</option><option value="marketing">Marketing</option><option value="operations">Operations</option><option value="fresher">Fresher Jobs</option><option value="remote">Work From Home</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /></label>
              <button type="submit" className="h-12 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-300">Search Jobs</button>
            </div>
          </form>
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: 0.95, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : 0.08 }} className="relative z-10 mx-auto w-full max-w-lg">
          <div className="absolute -inset-6 rounded-[44px] bg-gradient-to-br from-blue-500/25 via-cyan-400/10 to-violet-500/25 blur-2xl" />
          <div className="relative overflow-hidden rounded-[36px] border border-white/15 bg-white/10 p-2 shadow-[0_35px_90px_rgba(1,8,25,.58)] backdrop-blur-xl">
            <img src={candidateHeroImage} alt="Indian male and female professionals building their careers" fetchPriority="high" className="h-[390px] w-full rounded-[29px] object-cover object-center sm:h-[500px]" />
            <div className="absolute inset-2 rounded-[29px] bg-gradient-to-t from-[#07152F] via-transparent to-transparent" />
            <motion.div animate={reduceMotion ? undefined : { y: [0, -6, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }} className="absolute left-6 top-6 rounded-2xl border border-white/15 bg-[#07152F]/80 p-3.5 backdrop-blur-xl"><div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><ShieldCheck className="h-4 w-4" /></span><span><strong className="block text-xs">Safer Job Search</strong><small className="text-[10px] text-slate-400">No candidate charges</small></span></div></motion.div>
            <motion.div animate={reduceMotion ? undefined : { y: [0, 6, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="absolute bottom-6 right-6 max-w-[230px] rounded-2xl border border-white/15 bg-[#07152F]/85 p-4 backdrop-blur-xl"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">AIJOBS Career Flow</p><p className="mt-2 text-sm font-extrabold">Profile → Match → Apply → Track</p></motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
