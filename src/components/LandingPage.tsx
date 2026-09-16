import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Briefcase, Building2, Clock, FileText, MapPin, RefreshCw, ShieldCheck, Sparkles, Upload, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { JobPosting, UserProfile } from "../types";
import { getLiveJobs } from "../services/jobService";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { parseJsonResponse } from "../utils/apiHelper";
import { useToast } from "./GlobalToast";
import AIJobsLogo from "./AIJobsLogo";
import SmartResumeOtpModal, { CandidateParsedData } from "./SmartResumeOtpModal";
import CandidateHero from "./landing/CandidateHero";
import TrustStrip from "./landing/TrustStrip";
import WhyAIJobs from "./landing/WhyAIJobs";
import HowItWorks from "./landing/HowItWorks";
import SafetyBanner from "./landing/SafetyBanner";
import FinalCTA from "./landing/FinalCTA";
import candidateHeroImg from "../assets/images/cinematic_candidates_desk_1786908694614.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

const POPULAR_CATEGORIES = [
  { id: "it", title: "IT & Software", query: "software" },
  { id: "sales", title: "Sales", query: "sales" },
  { id: "finance", title: "Banking & Finance", query: "finance" },
  { id: "bpo", title: "BPO / Customer Service", query: "customer support" },
  { id: "hr", title: "HR & Recruitment", query: "hr" },
  { id: "marketing", title: "Marketing", query: "marketing" },
  { id: "operations", title: "Operations", query: "operations" },
  { id: "freshers", title: "Fresher Jobs", query: "fresher" },
  { id: "wfh", title: "Work From Home", query: "remote" }
];

export default function LandingPage({ setActiveView, onOpenCompanyPage, onSelectJob, onOpenAuth, user }: LandingPageProps) {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [liveJobs, setLiveJobs] = useState<JobPosting[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobFetchError, setJobFetchError] = useState<string | null>(null);
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [isSmartOnboarding, setIsSmartOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState("");
  const [onboardProgress, setOnboardProgress] = useState(0);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [parsedCandidateData, setParsedCandidateData] = useState<CandidateParsedData | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const jobs = await getLiveJobs();
        if (mounted) {
          setLiveJobs(jobs || []);
          setJobFetchError(null);
        }
      } catch (error) {
        console.error("[LandingPage] Failed to fetch live jobs:", error);
        if (mounted) setJobFetchError("Live jobs are temporarily unavailable. Please try again shortly.");
      } finally {
        if (mounted) setLoadingJobs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openCandidateSignup = () => {
    if (user) return setActiveView("dashboard");
    if (onOpenAuth) onOpenAuth("signup", "candidate");
    else setActiveView("candidate-register");
  };

  const handleHeroSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = [searchTitle.trim(), searchCategory.trim()].filter(Boolean).join(" ");
    sessionStorage.setItem("aijobs_search_query", query);
    sessionStorage.setItem("aijobs_search_exp", "");
    sessionStorage.setItem("aijobs_search_loc", searchLocation);
    setActiveView("public-jobs");
  };

  const handleCategoryClick = (query: string) => {
    sessionStorage.setItem("aijobs_search_query", query);
    sessionStorage.setItem("aijobs_search_exp", "");
    sessionStorage.setItem("aijobs_search_loc", "");
    setActiveView("public-jobs");
  };

  const handleResumeButtonClick = () => {
    if (!user) return openCandidateSignup();
    fileInputRef.current?.click();
  };

  const handleSmartResumeSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSmartOnboarding(true);
    setOnboardStep("Reading resume document layout...");
    setOnboardProgress(20);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(",") ? result.split(",")[1] : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setOnboardStep("Extracting skills and experience...");
      setOnboardProgress(45);
      let parseJson: any = null;
      try {
        const parseRes = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: `temp_${Date.now()}`,
            resumeUrl: "https://storage.googleapis.com/temp/resume.pdf",
            fileName: file.name,
            fileBase64,
            fileType: file.type
          })
        });
        if (parseRes.ok) parseJson = await parseJsonResponse(parseRes).catch(() => null);
      } catch (error) {
        console.warn("Resume parsing notice:", error);
      }

      const parsed = parseJson?.parsed || {};
      let candidateName = parsed.fullName;
      if (!candidateName || candidateName.trim().length < 2) {
        candidateName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
        candidateName = candidateName.split(" ").map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        candidateName = candidateName.replace(/\b(Resume|CV|New|Latest|Format|Updated|Draft|Doc)\b/gi, "").trim() || "Candidate";
      }

      const cleanEmail = parsed.email || user?.email || "";
      let cleanPhone = parsed.phone || user?.phone || "";
      if (cleanPhone && !cleanPhone.startsWith("+")) cleanPhone = "+91" + cleanPhone.replace(/\D/g, "");

      setOnboardStep("Uploading resume securely...");
      setOnboardProgress(70);
      let downloadURL = "";
      try {
        const upload = await uploadToCloudinary(file, {
          userId: user?.uid || "anonymous_upload",
          assetType: "resumes",
          onProgress: (percent) => setOnboardProgress(70 + Math.round((percent / 100) * 25))
        });
        downloadURL = upload.secure_url;
      } catch (error) {
        console.warn("Resume upload notice:", error);
      }

      setOnboardProgress(100);
      showToast("Resume successfully processed!", "success");
      setParsedCandidateData({
        uid: user?.uid || `candidate_${Date.now()}`,
        fullName: candidateName,
        email: cleanEmail,
        phone: cleanPhone,
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        experience: parsed.totalExperience || "Relevant Experience",
        education: parsed.education,
        city: parsed.city,
        atsScore: Number(parsed.atsScore || parsed.resumeScore || 0),
        resumeUrl: downloadURL,
        resumeFileName: file.name
      });
      setTimeout(() => {
        setIsSmartOnboarding(false);
        setOtpModalOpen(true);
      }, 250);
    } catch (error: any) {
      console.error("[LandingPage] Resume upload error:", error);
      showToast(`Resume error: ${error?.message || error}`, "error");
      setIsSmartOnboarding(false);
    } finally {
      event.target.value = "";
    }
  };

  const openJob = (job: JobPosting) => {
    if (onSelectJob && job.id) onSelectJob(job.id);
    else setActiveView("public-jobs");
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-slate-900 selection:bg-blue-600 selection:text-white">
      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleSmartResumeSelected} />

      {isSmartOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07152F]/90 p-4 backdrop-blur-xl">
          <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><RefreshCw className="h-7 w-7 animate-spin" /></div>
            <h3 className="mt-5 text-xl font-black">Processing Resume</h3>
            <p className="mt-2 text-sm text-slate-500">{onboardStep}</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all" style={{ width: `${onboardProgress}%` }} /></div>
            <div className="mt-2 text-right text-xs font-bold text-slate-400">{onboardProgress}%</div>
          </div>
        </div>
      )}

      <div className="relative bg-[#07152F]">
        {!reduceMotion && <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">{Array.from({ length: 18 }).map((_, index) => <motion.span key={index} className="absolute h-1 w-1 rounded-full bg-cyan-300/50 shadow-[0_0_16px_rgba(34,211,238,.8)]" style={{ left: `${(index * 17) % 96}%`, top: `${12 + ((index * 29) % 76)}%` }} animate={{ y: [0, -18, 0], opacity: [0.18, 0.7, 0.18] }} transition={{ duration: 4 + (index % 5), repeat: Infinity, delay: index * 0.16, ease: "easeInOut" }} />)}</div>}
        <CandidateHero searchTitle={searchTitle} searchLocation={searchLocation} searchCategory={searchCategory} onSearchTitleChange={setSearchTitle} onSearchLocationChange={setSearchLocation} onSearchCategoryChange={setSearchCategory} onSearch={handleHeroSearch} onCreateProfile={openCandidateSignup} onApplyJobs={() => setActiveView("public-jobs")} heroImage={candidateHeroImg} />
      </div>

      <TrustStrip />

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-2xl"><span className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Find your direction</span><h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Explore job categories</h2><p className="mt-3 text-sm sm:text-base text-slate-500">Browse opportunities by the work you want to do—without invented job counts.</p></div>
            <button onClick={() => setActiveView("public-jobs")} className="inline-flex items-center gap-2 text-sm font-extrabold text-blue-600">View all live jobs <ArrowRight className="w-4 h-4" /></button>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">{POPULAR_CATEGORIES.map((category) => <button key={category.id} onClick={() => handleCategoryClick(category.query)} className="group rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-lg"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Briefcase className="w-4 h-4" /></div><div className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-blue-700">{category.title}</div><div className="mt-1 text-[11px] font-semibold text-slate-400">Explore openings</div></button>)}</div>
        </div>
      </section>

      <WhyAIJobs />

      <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div><span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600"><Clock className="w-3.5 h-3.5" />Real data only</span><h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Latest job openings</h2><p className="mt-3 text-sm sm:text-base text-slate-500">Shown from the current AIJOBS live-jobs data source.</p></div>
            <button onClick={() => setActiveView("public-jobs")} className="min-h-11 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20">View All Jobs</button>
          </div>

          <div className="mt-9">
            {loadingJobs ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{[1,2,3,4,5,6].map((item) => <div key={item} className="h-64 animate-pulse rounded-[26px] border border-slate-200 bg-white" />)}</div>
            ) : jobFetchError ? (
              <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-amber-800">{jobFetchError}</div>
            ) : liveJobs.length ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{liveJobs.slice(0, 6).map((job) => <article key={job.id} className="flex min-h-[270px] flex-col justify-between rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"><div><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-base font-black text-slate-950 line-clamp-2">{job.title}</h3><div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500"><Building2 className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{job.companyName || job.company || "Employer"}</span></div></div>{job.jobType && <span className="shrink-0 rounded-xl bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-700">{job.jobType}</span>}</div><div className="mt-5 grid gap-2 text-xs text-slate-600">{job.location && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span>{job.location}</span></div>}{job.experience && <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-slate-400" /><span>{job.experience}</span></div>}</div>{(job.salary || job.postedDate) && <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs"><span className="font-extrabold text-slate-800">{job.salary || ""}</span><span className="text-slate-400">{job.postedDate || ""}</span></div>}</div><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => openJob(job)} className="min-h-10 rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-700">View Details</button><button onClick={() => openJob(job)} className="min-h-10 rounded-xl bg-[#2563EB] px-3 text-xs font-extrabold text-white shadow-md shadow-blue-500/20">Quick Apply</button></div></article>)}</div>
            ) : (
              <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm"><Briefcase className="mx-auto h-9 w-9 text-slate-300" /><h3 className="mt-4 font-black text-slate-900">No live jobs available right now</h3><p className="mt-2 text-sm text-slate-500">Check again soon or create your free profile so you are ready when new opportunities go live.</p><button onClick={openCandidateSignup} className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white">Create Free Profile</button></div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid lg:grid-cols-2 gap-8 items-center"><div className="rounded-[30px] bg-[#07152F] p-7 sm:p-9 text-white shadow-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-3 py-1.5 text-xs font-extrabold text-cyan-300"><Zap className="w-4 h-4" />Quick Apply</div><h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Less repetition. Faster applications.</h2><p className="mt-3 text-sm sm:text-base leading-7 text-slate-400">Browse live jobs, review the role and continue through the existing application flow. Creating a profile makes repeat applications easier while quick apply remains available from live jobs.</p><button onClick={() => setActiveView("public-jobs")} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-[#07152F]">Browse Jobs <ArrowRight className="w-4 h-4" /></button></div><div className="grid sm:grid-cols-2 gap-4">{[{title:"Save profile",text:"Keep your candidate details ready for future applications.",icon:FileText},{title:"Save applications",text:"Stay organized as you apply to more roles.",icon:Briefcase},{title:"Resume visibility",text:"A complete resume helps recruiters understand your experience.",icon:Upload},{title:"Better matching",text:"Use profile context to discover more relevant opportunities.",icon:Sparkles}].map(({title,text,icon:Icon}) => <div key={title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm"><Icon className="w-4 h-4" /></div><h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></div></div>
      </section>

      <HowItWorks />

      <section className="py-16 sm:py-20 bg-slate-50"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center rounded-[30px] border border-slate-200 bg-white p-7 sm:p-9 shadow-sm"><div><span className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Resume & profile</span><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Make your profile ready before the right job appears.</h2><p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-500">Upload your resume after signing in, keep your candidate profile current and make repeat applications easier.</p></div><div className="flex flex-col sm:flex-row lg:flex-col gap-3"><button onClick={openCandidateSignup} className="min-h-12 rounded-2xl bg-blue-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20">Create Free Profile</button><button onClick={handleResumeButtonClick} className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-extrabold text-slate-800">Upload Resume</button></div></div></div></section>

      <SafetyBanner />
      <FinalCTA onCreateProfile={openCandidateSignup} onBrowseJobs={() => setActiveView("public-jobs")} />

      <footer className="bg-slate-950 text-slate-300 border-t border-white/10 pt-14 pb-10"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid md:grid-cols-2 lg:grid-cols-4 gap-9"><div className="lg:col-span-2"><AIJobsLogo className="h-9 w-auto text-white" /><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">AIJOBS connects candidates with live recruitment opportunities through a modern job discovery and application experience.</p><div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-cyan-300"><ShieldCheck className="w-4 h-4" />No candidate placement charges</div></div><div><h4 className="text-xs font-black uppercase tracking-[0.16em] text-white">For Candidates</h4><div className="mt-4 flex flex-col gap-2 text-sm text-slate-400"><button className="text-left hover:text-white" onClick={() => setActiveView("public-jobs")}>Search Jobs</button><button className="text-left hover:text-white" onClick={openCandidateSignup}>Create Profile</button><button className="text-left hover:text-white" onClick={handleResumeButtonClick}>Upload Resume</button><button className="text-left hover:text-white" onClick={() => onOpenAuth ? onOpenAuth("signin", "candidate") : setActiveView("unified-login")}>Candidate Login</button></div></div><div><h4 className="text-xs font-black uppercase tracking-[0.16em] text-white">Support & Legal</h4><div className="mt-4 flex flex-col gap-2 text-sm text-slate-400"><button className="text-left hover:text-white" onClick={() => onOpenCompanyPage?.("about")}>About AIJOBS</button><a className="hover:text-white" href="/privacy-policy">Privacy Policy</a><a className="hover:text-white" href="/terms">Terms of Service</a><button className="text-left hover:text-white" onClick={() => onOpenCompanyPage?.("contact")}>Contact Support</button></div></div></div><div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-white/10 pt-7 text-xs text-slate-500"><span>© {new Date().getFullYear()} AIJOBS. All rights reserved.</span><span>Find Smarter. Hire Faster.</span></div></div></footer>

      {otpModalOpen && parsedCandidateData && <SmartResumeOtpModal parsedData={parsedCandidateData} onClose={() => setOtpModalOpen(false)} onSuccess={(profile) => { setOtpModalOpen(false); showToast(`Profile activated for ${profile.name}!`, "success"); setActiveView("dashboard"); }} />}
    </div>
  );
}
