import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where, doc, getDoc } from "firebase/firestore";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, BadgeCheck, Banknote, Bookmark, BriefcaseBusiness, Building2,
  Check, ChevronRight, Clock3, Code2, GraduationCap, HeartPulse, Laptop,
  MapPin, Megaphone, Search, ShieldCheck, Sparkles, Stethoscope, Target,
  TrendingUp, UserRound, UsersRound, WalletCards, X, Zap
} from "lucide-react";
import { db } from "../firebase";
import { JobApplication, JobPosting, UserProfile } from "../types";
import { getLiveJobs } from "../services/jobService";
import { getSavedJobIdsFromBookmarks, removeJobFromBookmarks, saveJobToBookmarks } from "../services/savedJobsService";
import { useToast } from "./GlobalToast";
import EasyApplyModal from "./EasyApplyModal";
import candidateHeroImg from "../assets/images/cinematic_candidates_desk_1786908694614.jpg";

interface Props {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

const popularSearches = ["Customer Support", "Banking Executive", "Sales Executive", "Fresher Jobs", "Work From Home"];
const floatingBadges = ["New Job", "Remote", "Urgent Hiring", "Verified Employer", "AI Match", "Higher Salary", "Dream Job"];
const categoryConfig = [
  ["IT & Software", "software", Code2], ["Sales", "sales", TrendingUp], ["Banking & Finance", "bank", WalletCards],
  ["BPO / Customer Service", "customer", UsersRound], ["HR & Recruitment", "hr", UserRound], ["Marketing", "marketing", Megaphone],
  ["Healthcare", "health", Stethoscope], ["Engineering", "engineer", Target], ["Operations", "operations", BriefcaseBusiness],
  ["Fresher Jobs", "fresher", GraduationCap], ["Work From Home", "remote", Laptop], ["Part Time Jobs", "part time", Clock3]
] as const;

const searchableText = (job: JobPosting) => `${job.title || ""} ${job.companyName || ""} ${(job as any).company || ""} ${job.location || ""} ${job.experience || ""} ${(job as any).jobType || ""} ${(job.skillsRequired || []).join(" ")} ${job.description || ""}`.toLowerCase();
const dateValue = (value: any) => {
  const raw = typeof value?.toDate === "function" ? value.toDate() : value;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};
const postedLabel = (job: JobPosting) => {
  const timestamp = dateValue(job.createdAt || (job as any).datePosted || (job as any).postedDate);
  if (!timestamp) return "Recently posted";
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  return days === 0 ? "Posted today" : days === 1 ? "Posted yesterday" : `Posted ${days} days ago`;
};
const scoreJob = (job: JobPosting, profile: any) => {
  const skills = Array.isArray(profile?.skills) ? profile.skills.map((s: string) => s.toLowerCase()) : [];
  const target = `${profile?.targetRole || ""} ${profile?.experience || ""} ${profile?.location || ""}`.toLowerCase();
  const haystack = searchableText(job);
  const skillHits = skills.filter((skill: string) => haystack.includes(skill)).length;
  const targetHits = target.split(/\s+/).filter((word: string) => word.length > 3 && haystack.includes(word)).length;
  return Math.min(98, 58 + skillHits * 7 + targetHits * 4);
};

export default function PremiumCandidateHomepage({ setActiveView, onOpenCompanyPage, onSelectJob, onOpenAuth, user }: Props) {
  const reduceMotion = useReducedMotion();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(user || null);
  const [applyJob, setApplyJob] = useState<JobPosting | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ role: "", experience: "", location: "", salary: "", preference: "" });
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<JobPosting[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getLiveJobs();
      setJobs(data || []);
      setLoadError("");
    } catch (error) {
      console.error("[PremiumHomepage] jobs", error);
      setLoadError("Live jobs could not be loaded. Check your connection and retry.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void loadJobs();
    try { setRecentSearches(JSON.parse(localStorage.getItem("aijobs_recent_searches") || "[]").slice(0, 4)); } catch { setRecentSearches([]); }
    getDocs(query(collection(db, "testimonials"), where("published", "==", true), limit(6)))
      .then((snap) => setTestimonials(snap.docs.map((item) => ({ id: item.id, ...item.data() }))))
      .catch(() => setTestimonials([]));
  }, []);

  useEffect(() => {
    if (!user?.uid) { setProfile(null); setSavedIds([]); return; }
    Promise.all([getDoc(doc(db, "candidates", user.uid)), getSavedJobIdsFromBookmarks(user.uid)])
      .then(([candidate, ids]) => { setProfile({ ...user, ...(candidate.exists() ? candidate.data() : {}) }); setSavedIds(ids); })
      .catch(() => setProfile(user));
  }, [user]);

  const suggestions = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return popularSearches;
    const terms = new Set<string>();
    jobs.forEach((job) => {
      if (searchableText(job).includes(q)) {
        if (job.title) terms.add(job.title);
        (job.skillsRequired || []).forEach((skill) => { if (skill.toLowerCase().includes(q) || q.includes(skill.toLowerCase())) terms.add(skill); });
      }
    });
    return [...terms].slice(0, 5);
  }, [keyword, jobs]);

  const matchingJobs = useMemo(() => jobs.filter((job) => {
    const text = searchableText(job);
    return (!keyword || keyword.toLowerCase().split(/\s+/).every((part) => text.includes(part))) &&
      (!location || text.includes(location.toLowerCase())) && (!experience || text.includes(experience.toLowerCase()) || experience === "any");
  }), [jobs, keyword, location, experience]);

  const recommended = useMemo(() => [...jobs].sort((a, b) => scoreJob(b, profile) - scoreJob(a, profile)).slice(0, 4), [jobs, profile]);
  const jobsToday = jobs.filter((job) => Date.now() - dateValue(job.createdAt || (job as any).datePosted) < 86400000).length;

  const runSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const term = keyword.trim();
    if (term) {
      const next = [term, ...recentSearches.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      setRecentSearches(next); localStorage.setItem("aijobs_recent_searches", JSON.stringify(next));
    }
    sessionStorage.setItem("aijobs_search_query", term);
    sessionStorage.setItem("aijobs_search_exp", experience);
    sessionStorage.setItem("aijobs_search_loc", location);
    setActiveView("public-jobs");
  };

  const chooseSearch = (value: string) => { setKeyword(value); setSearchFocused(false); };
  const openApply = (job: JobPosting) => {
    if (!user) { onOpenAuth?.("signin", "candidate"); return; }
    const missing = [!profile?.phone && "contact details", !profile?.experience && "experience", !profile?.education && "education", !(profile?.resumeUrl || profile?.resumeURL) && "resume"].filter(Boolean);
    if (missing.length) {
      showToast(`Complete your ${missing.join(", ")} before applying.`, "warning");
      setActiveView("resume-onboarding"); return;
    }
    setApplyJob(job);
  };
  const toggleSave = async (jobId: string) => {
    if (!user) { onOpenAuth?.("signin", "candidate"); return; }
    const saved = savedIds.includes(jobId);
    setSavedIds((ids) => saved ? ids.filter((id) => id !== jobId) : [...ids, jobId]);
    try { saved ? await removeJobFromBookmarks(user.uid, jobId) : await saveJobToBookmarks(user.uid, jobId); }
    catch { setSavedIds((ids) => saved ? [...ids, jobId] : ids.filter((id) => id !== jobId)); showToast("Saved jobs could not be updated.", "error"); }
  };
  const runAiMatch = () => {
    setAiAnalyzing(true);
    window.setTimeout(() => {
      const words = `${aiForm.role} ${aiForm.location} ${aiForm.experience} ${aiForm.preference}`.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const ranked = [...jobs].sort((a, b) => words.filter((w) => searchableText(b).includes(w)).length - words.filter((w) => searchableText(a).includes(w)).length).slice(0, 3);
      setAiResults(ranked); setAiAnalyzing(false);
    }, reduceMotion ? 100 : 1100);
  };
  const openCandidateTab = (tab: string) => {
    if (!user) { onOpenAuth?.("signin", "candidate"); return; }
    sessionStorage.setItem("aijobs_candidate_start_tab", tab);
    setActiveView("dashboard");
  };

  const JobCard = ({ job }: { job: JobPosting }) => {
    const score = scoreJob(job, profile);
    return <motion.article whileHover={reduceMotion ? undefined : { y: -6 }} className="group min-w-0 rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,.07)] transition-shadow hover:shadow-[0_24px_60px_rgba(37,99,235,.14)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3 min-w-0"><div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-white grid place-items-center font-black">{(job.companyName || "A").charAt(0)}</div><div className="min-w-0"><p className="text-xs font-bold text-blue-700 flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5"/> Verified employer</p><h3 className="font-black text-slate-950 truncate">{job.title}</h3><p className="text-sm text-slate-500 truncate">{job.companyName || (job as any).company || "Employer"}</p></div></div>
        <button aria-label={savedIds.includes(job.id) ? "Remove saved job" : "Save job"} onClick={() => void toggleSave(job.id)} className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Bookmark className={`h-5 w-5 ${savedIds.includes(job.id) ? "fill-blue-600 text-blue-600" : ""}`}/></button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 text-cyan-600"/>{job.location || "India"}</span><span className="flex items-center gap-1.5 truncate"><BriefcaseBusiness className="h-3.5 w-3.5 text-violet-600"/>{job.experience || "Experience varies"}</span><span className="flex items-center gap-1.5 truncate"><Banknote className="h-3.5 w-3.5 text-emerald-600"/>{job.salary || "Salary disclosed by employer"}</span><span className="flex items-center gap-1.5 truncate"><Clock3 className="h-3.5 w-3.5"/>{postedLabel(job)}</span></div>
      {!!job.skillsRequired?.length && <div className="mt-4 flex gap-1.5 overflow-hidden">{job.skillsRequired.slice(0,3).map((skill) => <span key={skill} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 whitespace-nowrap">{skill}</span>)}</div>}
      <div className="mt-5 flex items-center justify-between gap-3"><div className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-black text-violet-700"><Sparkles className="mr-1 inline h-3.5 w-3.5"/>AI Match {score}%</div><div className="flex gap-2"><button onClick={() => onSelectJob ? onSelectJob(job.id) : setActiveView("public-jobs")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Details</button><button onClick={() => openApply(job)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">Apply Now</button></div></div>
    </motion.article>;
  };

  return <main className="min-h-screen overflow-hidden bg-[#f8fbff] text-slate-950 pb-20 md:pb-0">
    <section className="relative isolate overflow-hidden bg-[#07152F] px-4 pb-16 pt-10 text-white sm:px-6 md:pb-24 md:pt-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.35),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(6,182,212,.22),transparent_30%),radial-gradient(circle_at_55%_100%,rgba(139,92,246,.18),transparent_40%)]"/>
      {floatingBadges.map((badge, index) => <motion.span key={badge} aria-hidden className="absolute hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-cyan-100 backdrop-blur-md lg:block" style={{ left: `${5 + (index * 13) % 82}%`, top: `${12 + (index * 17) % 70}%` }} animate={reduceMotion ? undefined : { y: [0,-10,0], opacity: [.45,.9,.45] }} transition={{ duration: 4 + index * .35, repeat: Infinity }}>{badge}</motion.span>)}
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
          {user && <p className="mb-4 text-sm font-bold text-cyan-300">Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, {user.name?.split(" ")[0] || "Candidate"} 👋</p>}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200"><Sparkles className="h-3.5 w-3.5"/>AI-powered verified opportunities</div>
          <h1 className="max-w-3xl text-4xl font-black tracking-[-.04em] sm:text-5xl md:text-6xl">Your Next Job <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Starts Here.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Search verified jobs. Apply faster. Build your career with AIJobs.</p>
          {user && <p className="mt-2 text-sm text-blue-200">{recommended.length ? `${recommended.length} current jobs match your profile.` : "Complete your profile to unlock smarter recommendations."}</p>}
          <form onSubmit={runSearch} className="relative mt-8 rounded-[1.7rem] border border-white/15 bg-white/10 p-2.5 shadow-2xl shadow-blue-950/40 backdrop-blur-xl focus-within:border-cyan-300/50 focus-within:ring-4 focus-within:ring-cyan-400/10">
            <div className="grid gap-2 md:grid-cols-[1fr_145px_160px_auto]"><label className="relative"><span className="sr-only">Search job, skill or company</span><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={keyword} onFocus={() => setSearchFocused(true)} onChange={(e) => setKeyword(e.target.value)} placeholder="Search Job / Skill / Company" className="h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-sm text-slate-950 outline-none"/></label><select aria-label="Experience" value={experience} onChange={(e) => setExperience(e.target.value)} className="h-12 rounded-2xl bg-white px-4 text-sm text-slate-700 outline-none"><option value="">Experience</option><option value="fresher">Fresher</option><option value="0-2">0–2 Years</option><option value="2-5">2–5 Years</option><option value="5+">5+ Years</option></select><label className="relative"><span className="sr-only">Location</span><MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="h-12 w-full rounded-2xl bg-white pl-9 pr-3 text-sm text-slate-950 outline-none"/></label><button className="h-12 rounded-2xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-500">Search Jobs</button></div>
            <AnimatePresence>{searchFocused && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute left-2 right-2 top-[calc(100%+8px)] z-30 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl"><div className="flex items-center justify-between px-2 pb-2"><p className="text-[11px] font-black uppercase tracking-wider text-blue-600">{keyword ? "AI matches" : recentSearches.length ? "Recent & popular" : "Popular searches"}</p><button type="button" onClick={() => setSearchFocused(false)}><X className="h-4 w-4 text-slate-400"/></button></div>{suggestions.map((item) => <button type="button" key={item} onClick={() => chooseSearch(item)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-blue-50"><Sparkles className="h-3.5 w-3.5 text-blue-600"/>{item}</button>)}{keyword && <p className="mt-2 border-t px-3 pt-3 text-xs font-bold text-slate-500">AI found {matchingJobs.length} matching live jobs</p>}</motion.div>}</AnimatePresence>
          </form>
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="relative mx-auto w-full max-w-lg"><div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 p-2 shadow-2xl"><img src={candidateHeroImg} alt="Professional candidate finding jobs with AIJOBS" loading="eager" className="h-[380px] w-full rounded-[1.6rem] object-cover"/><div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#07152F]/85 p-4 backdrop-blur-xl"><p className="text-xs text-cyan-300">Live verified opportunities</p><p className="mt-1 text-xl font-black">{jobs.length} jobs available now</p></div></div></motion.div>
      </div>
    </section>

    {jobsToday > 0 && <div className="mx-auto mt-5 max-w-7xl px-4"><div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">✨ {jobsToday} new {jobsToday === 1 ? "job was" : "jobs were"} added in the last 24 hours.</div></div>}

    {user && recommended.length > 0 && <section className="mx-auto max-w-7xl px-4 py-14"><div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Personalized for you</p><h2 className="mt-1 text-2xl font-black md:text-3xl">Recommended For You</h2></div><button onClick={() => setActiveView("public-jobs")} className="text-sm font-bold text-blue-600">View all →</button></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{recommended.map((job) => <JobCard key={job.id} job={job}/>)}</div></section>}

    <section className="mx-auto max-w-7xl px-4 py-14"><div className="text-center"><p className="text-xs font-black uppercase tracking-widest text-blue-600">Explore opportunities</p><h2 className="mt-2 text-3xl font-black">Jobs for every career path</h2></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categoryConfig.map(([label, term, Icon]) => { const count=jobs.filter((job) => searchableText(job).includes(term)).length; return <motion.button whileHover={reduceMotion ? undefined : { y:-4 }} key={label} onClick={() => { setKeyword(term); sessionStorage.setItem("aijobs_search_query",term); setActiveView("public-jobs"); }} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-lg"><Icon className="h-6 w-6 text-blue-600 transition-transform group-hover:scale-110"/><p className="mt-4 text-sm font-black">{label}</p><p className="mt-1 text-xs text-slate-500">{count ? `${count} live ${count === 1 ? "job" : "jobs"}` : "Explore category"}</p><ChevronRight className="ml-auto mt-3 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-600"/></motion.button>; })}</div></section>

    <section className="bg-white py-16"><div className="mx-auto max-w-7xl px-4"><div className="mb-7 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-600">Real-time listings</p><h2 className="mt-2 text-3xl font-black">Latest verified jobs</h2><p className="mt-2 text-sm text-slate-500">Showing real approved opportunities from the AIJOBS database.</p></div><button onClick={() => setActiveView("public-jobs")} className="hidden rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white sm:block">View all jobs</button></div>{loading ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map((i)=><div key={i} className="h-64 animate-pulse rounded-[1.6rem] bg-slate-100"/>)}</div> : loadError ? <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center"><p className="font-bold text-red-800">{loadError}</p><button onClick={() => void loadJobs()} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white">Retry</button></div> : jobs.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{jobs.slice(0,6).map((job)=><JobCard key={job.id} job={job}/>)}</div> : <div className="rounded-3xl border border-slate-200 p-10 text-center"><BriefcaseBusiness className="mx-auto h-9 w-9 text-slate-300"/><p className="mt-3 font-black">No approved live jobs available right now.</p><p className="mt-1 text-sm text-slate-500">Please check again soon.</p></div>}</div></section>

    <section className="mx-auto max-w-7xl px-4 py-16"><div className="overflow-hidden rounded-[2rem] bg-[#07152F] p-7 text-white md:p-12"><div className="grid items-center gap-8 md:grid-cols-[1fr_auto]"><div><div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200"><Sparkles className="h-4 w-4"/>AI career intelligence</div><h2 className="mt-5 text-3xl font-black">Let AI Find the Best Jobs For You</h2><p className="mt-3 max-w-2xl text-slate-300">Tell us what you want. AIJOBS ranks current real opportunities against your role, experience, location and work preference.</p></div><button onClick={() => {setAiOpen(true);setAiResults([]);}} className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 font-black shadow-xl">Try AI Job Match <ArrowRight className="ml-2 inline h-4 w-4"/></button></div></div></section>

    <section className="bg-[#eef7ff] py-16"><div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[.8fr_1.2fr]"><div><ShieldCheck className="h-10 w-10 text-blue-600"/><h2 className="mt-4 text-3xl font-black">AIJobs Candidate Safety Promise</h2><p className="mt-3 text-slate-600">AIJobs does not charge candidates for job applications or placement. If anyone asks for money, report it immediately.</p></div><div className="grid grid-cols-2 gap-3">{[["Verified Employers",BadgeCheck],["Safe Applications",ShieldCheck],["No Candidate Fees",Banknote],["Direct Recruiter Connection",UsersRound]].map(([label,Icon]:any)=><div key={label} className="rounded-2xl border border-blue-100 bg-white p-4 font-bold text-slate-800"><Icon className="mb-3 h-5 w-5 text-cyan-600"/>{label}</div>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-4 py-16 text-center"><h2 className="text-3xl font-black">Four steps to your next career move</h2><div className="relative mt-10 grid gap-4 md:grid-cols-4">{[["01","Create Profile"],["02","Search & Apply"],["03","Get Interviewed"],["04","Start Your Career"]].map(([number,label],index)=><motion.div initial={reduceMotion ? false : {opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.08}} key={number} className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"><span className="text-xs font-black text-blue-600">STEP {number}</span><p className="mt-3 text-lg font-black">{label}</p><div className="mt-5 h-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"/></motion.div>)}</div></section>

    {testimonials.length > 0 && <section className="bg-white py-16"><div className="mx-auto max-w-7xl px-4"><h2 className="text-center text-3xl font-black">Candidate success stories</h2><div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4">{testimonials.map((item)=><article key={item.id} className="min-w-[290px] snap-center rounded-3xl border border-slate-200 p-6 md:min-w-[360px]"><div className="flex items-center gap-3">{item.photoUrl ? <img src={item.photoUrl} alt={item.name || "Candidate"} loading="lazy" className="h-12 w-12 rounded-full object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{String(item.name || "C").charAt(0)}</div>}<div><p className="font-black">{item.name}</p><p className="text-xs text-slate-500">{item.jobTitle}{item.company ? ` · ${item.company}` : ""}</p></div></div><p className="mt-4 text-sm leading-6 text-slate-600">{item.review}</p></article>)}</div></div></section>}

    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-xl md:hidden"><button onClick={()=>setActiveView("home")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-blue-600"><Sparkles className="h-5 w-5"/>Home</button><button onClick={()=>setActiveView("public-jobs")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><Search className="h-5 w-5 text-blue-600"/>Jobs</button><button onClick={()=>openCandidateTab("saved-jobs")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><Bookmark className="h-5 w-5 text-blue-600"/>Saved</button><button onClick={()=>openCandidateTab("applied-jobs")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><BriefcaseBusiness className="h-5 w-5 text-blue-600"/>Applications</button><button onClick={()=>openCandidateTab("profile")} className="flex flex-col items-center gap-1 py-1 text-[10px] font-bold text-slate-500"><UserRound className="h-5 w-5 text-blue-600"/>Profile</button></nav>

    <AnimatePresence>{aiOpen && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"><motion.div initial={reduceMotion?false:{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:30,opacity:0}} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-[2rem]"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">AI Job Match</p><h2 className="mt-1 text-2xl font-black">Find your strongest opportunities</h2></div><button onClick={()=>setAiOpen(false)} className="rounded-xl bg-slate-100 p-2"><X className="h-5 w-5"/></button></div>{aiAnalyzing ? <div className="py-16 text-center"><motion.div animate={reduceMotion?undefined:{rotate:360}} transition={{duration:1,repeat:Infinity,ease:"linear"}} className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-blue-200 border-t-blue-600"><Sparkles className="h-5 w-5 text-blue-600"/></motion.div><p className="mt-5 font-black">Analyzing {jobs.length} live opportunities...</p></div> : aiResults.length ? <div className="mt-6 space-y-4"><h3 className="font-black">Your Top AI Matches</h3>{aiResults.map((job)=><JobCard key={job.id} job={job}/>)}{!aiResults.length&&<p>No current matches found.</p>}</div> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{[["role","What job are you looking for?"],["experience","Your experience"],["location","Preferred location"],["salary","Expected salary"],["preference","Remote / Hybrid / On-site"]].map(([key,label])=><label key={key} className="text-xs font-bold text-slate-600">{label}<input value={(aiForm as any)[key]} onChange={(e)=>setAiForm({...aiForm,[key]:e.target.value})} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/></label>)}<button onClick={runAiMatch} disabled={!aiForm.role.trim()||!jobs.length} className="mt-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-50 sm:col-span-2">Analyze Live Jobs</button></div>}</motion.div></motion.div>}</AnimatePresence>

    {applyJob && user && <EasyApplyModal job={applyJob} userId={user.uid} userName={user.name || "Candidate"} profile={profile || user} onClose={()=>setApplyJob(null)} onAppliedSuccess={(_app:JobApplication)=>showToast("Application submitted successfully.","success")} onNavigateToApplications={()=>{setApplyJob(null);setActiveView("applications");}} onNavigateToFindJobs={()=>{setApplyJob(null);setActiveView("public-jobs");}} onUploadResumeClick={()=>{setApplyJob(null);setActiveView("resume-onboarding");}}/>}
  </main>;
}
