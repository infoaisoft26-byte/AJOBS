import React, { useState, FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  GraduationCap,
  Grid,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { UserProfile } from "../../types";

interface Props {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  user?: UserProfile | null;
}

export default function CandidateHero({ onGetStarted, setActiveView, user }: Props) {
  const reduceMotion = useReducedMotion();
  const [jobQuery, setJobQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const handleSearch = (e?: FormEvent) => {
    e?.preventDefault();
    if (jobQuery.trim()) sessionStorage.setItem("aijobs_search_query", jobQuery.trim());
    else sessionStorage.removeItem("aijobs_search_query");
    if (locationQuery.trim()) sessionStorage.setItem("aijobs_search_loc", locationQuery.trim());
    else sessionStorage.removeItem("aijobs_search_loc");
    if (categoryQuery.trim()) sessionStorage.setItem("aijobs_search_cat", categoryQuery.trim());
    else sessionStorage.removeItem("aijobs_search_cat");

    setActiveView("public-jobs");
  };

  return (
    <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-center gap-10 lg:gap-8">
          
          {/* LEFT COLUMN: HERO CONTENT & SEARCH */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10"
          >
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#08152e]/90 border border-cyan-400/30 text-cyan-200 text-xs sm:text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md mb-6">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span>India's Trusted AI Job Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              A Better Career{" "}
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#c084fc] bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(99,102,241,0.35)]">
                Starts Here
              </span>
            </h1>

            {/* Subheadings */}
            <p className="mt-5 text-base sm:text-lg lg:text-xl font-medium text-slate-200 leading-relaxed">
              Discover verified jobs. Build your future. No charges. No scams.
            </p>
            <p className="mt-1 text-sm sm:text-base text-slate-400 leading-normal">
              Just real opportunities with trusted employers.
            </p>

            {/* JOB SEARCH BAR */}
            <form
              onSubmit={handleSearch}
              className="mt-8 rounded-2xl sm:rounded-3xl bg-white p-2.5 sm:p-3 shadow-[0_20px_60px_rgba(0,12,40,0.5)] border border-slate-100"
            >
              <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1.1fr_auto] items-center gap-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-150">
                
                {/* Field 1: Title / Skill */}
                <div className="px-3 py-1.5 flex items-center gap-3">
                  <Search className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="search-title" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Job title / skill / company
                    </label>
                    <input
                      id="search-title"
                      type="text"
                      value={jobQuery}
                      onChange={(e) => setJobQuery(e.target.value)}
                      placeholder="e.g. Frontend Developer"
                      className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                {/* Field 2: Location */}
                <div className="px-3 py-1.5 flex items-center gap-3 pt-2 sm:pt-1.5">
                  <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="search-loc" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Location
                    </label>
                    <input
                      id="search-loc"
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className="w-full text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                    />
                  </div>
                </div>

                {/* Field 3: Category */}
                <div className="px-3 py-1.5 flex items-center gap-3 pt-2 sm:pt-1.5">
                  <Grid className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="search-cat" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        id="search-cat"
                        value={categoryQuery}
                        onChange={(e) => setCategoryQuery(e.target.value)}
                        className="w-full text-sm font-semibold text-slate-900 focus:outline-none bg-transparent appearance-none pr-5 cursor-pointer"
                      >
                        <option value="">Select category</option>
                        <option value="IT & Software">IT & Software</option>
                        <option value="Banking & Finance">Banking & Finance</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                        <option value="HR & Recruitment">HR & Recruitment</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Fresher Jobs">Fresher Jobs</option>
                        <option value="Remote">Work From Home</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Search Button */}
                <div className="pt-2 sm:pt-0 sm:pl-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto h-12 px-7 rounded-xl bg-[#0066FF] hover:bg-[#0052cc] text-white font-bold text-sm shadow-[0_8px_20px_rgba(0,102,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Search className="w-4 h-4 text-white" />
                    <span>Search Jobs</span>
                  </button>
                </div>
              </div>
            </form>

            {/* HERO CTA BUTTONS */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="h-13 px-8 rounded-2xl bg-gradient-to-r from-[#0066FF] via-[#4f46e5] to-[#7c3aed] hover:from-[#0052cc] hover:to-[#6d28d9] text-white font-bold text-sm sm:text-base shadow-[0_10px_25px_rgba(79,70,229,0.4)] transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
              >
                <UserPlus className="w-5 h-5 text-cyan-200" />
                <span>Create Free Profile</span>
                <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setActiveView("public-jobs")}
                className="h-13 px-7 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm sm:text-base border border-white/20 hover:border-white/30 backdrop-blur-md transition-all flex items-center gap-3 cursor-pointer group active:scale-98"
              >
                <Briefcase className="w-5 h-5 text-slate-300" />
                <span>Apply to Jobs</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: CINEMATIC VISUAL WITH INDIAN PROFESSIONALS & 3D HUD CARDS */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="relative lg:h-[580px] flex items-center justify-center"
          >
            {/* Top Right India Workforce Brand Message */}
            <div className="absolute top-0 right-2 sm:right-6 z-20 flex items-start gap-2.5 bg-black/40 backdrop-blur-md border border-white/10 px-3.5 py-2 rounded-xl text-right">
              {/* Indian Flag Strip Mini */}
              <div className="w-4 h-3 rounded-[2px] overflow-hidden flex flex-col border border-white/20 shrink-0 mt-0.5 shadow-sm">
                <div className="h-1 bg-[#FF9933]" />
                <div className="h-1 bg-white" />
                <div className="h-1 bg-[#138808]" />
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-slate-200 leading-tight">
                <span>Building</span><br />
                <span className="text-cyan-300">A Stronger Workforce</span><br />
                <span className="text-slate-300">For A Brighter India</span>
              </div>
            </div>

            {/* Main Visual Container */}
            <div className="relative w-full max-w-[560px] aspect-[16/11] sm:aspect-[16/10] lg:h-full rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-[#050b1c]">
              <img
                src="/assets/candidate-home/candidate-hero.webp"
                alt="Confident Indian corporate professionals building careers with AIJobs"
                className="w-full h-full object-cover object-top"
                loading="eager"
                onError={(e) => {
                  // Fallback to jpg if needed
                  const target = e.currentTarget;
                  if (!target.src.endsWith(".jpg")) {
                    target.src = "/assets/candidate-home/candidate-hero.jpg";
                  }
                }}
              />

              {/* Cinematic Vignette Gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/60 via-transparent to-transparent" />

              {/* FLOATING 3D TRANSLUCENT HUD GLASS CARDS */}
              
              {/* HUD 1: Better Opportunities (Top-Left) */}
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 left-4 sm:left-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-cyan-400/40 text-white backdrop-blur-md shadow-[0_8px_20px_rgba(6,182,212,0.2)]"
              >
                <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">Better</div>
                  <div className="text-xs font-extrabold text-white">Opportunities</div>
                </div>
              </motion.div>

              {/* HUD 2: Grow Your Skills (Middle-Left) */}
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                className="absolute top-44 left-3 sm:left-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-indigo-400/40 text-white backdrop-blur-md shadow-[0_8px_20px_rgba(99,102,241,0.2)]"
              >
                <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">Grow</div>
                  <div className="text-xs font-extrabold text-white">Your Skills</div>
                </div>
              </motion.div>

              {/* HUD 3: Dream Bigger (Middle-Right) */}
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
                className="absolute top-36 right-3 sm:right-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-purple-400/40 text-white backdrop-blur-md shadow-[0_8px_20px_rgba(168,85,247,0.2)]"
              >
                <div className="p-1 rounded-lg bg-purple-500/20 text-purple-300">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-purple-300">Dream</div>
                  <div className="text-xs font-extrabold text-white">Bigger</div>
                </div>
              </motion.div>

              {/* HUD 4: Brighter Tomorrow (Lower-Right) */}
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.8 }}
                className="absolute bottom-14 right-4 sm:right-8 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-black/60 border border-cyan-400/40 text-white backdrop-blur-md shadow-[0_8px_20px_rgba(6,182,212,0.2)]"
              >
                <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-300">Brighter</div>
                  <div className="text-xs font-extrabold text-white">Tomorrow</div>
                </div>
              </motion.div>

              {/* Bottom Right Handwritten Cursive Brand Tag */}
              <div className="absolute bottom-4 right-5 z-20 text-right">
                <span className="font-serif italic font-semibold text-sm sm:text-base text-cyan-200/90 tracking-wide drop-shadow-[0_2px_8px_rgba(6,182,212,0.6)]">
                  Jobs For A Stronger India
                </span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
