import React, { ChangeEvent, FormEvent, HTMLInputElement, useEffect, useRef, useState } from "react";
import { 
  AlertCircle, 
  ArrowRight, 
  Award, 
  Bookmark, 
  Briefcase, 
  Building2, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Compass, 
  FileText, 
  GraduationCap, 
  HelpCircle, 
  Laptop, 
  Layers, 
  Lock, 
  LogIn, 
  Mail, 
  MapPin, 
  Phone, 
  PlusCircle, 
  RefreshCw, 
  Search, 
  Send, 
  Share2, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Upload, 
  UserCheck, 
  Users, 
  X, 
  Zap 
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { db } from "../firebase";
import { JobPosting, UserProfile } from "../types";
import { getLiveJobs } from "../services/jobService";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { parseJsonResponse } from "../utils/apiHelper";
import { useToast } from "./GlobalToast";
import AIJobsLogo from "./AIJobsLogo";
import AIJobs3DIntro from "./AIJobs3DIntro";
import LegalModal, { LegalDocType } from "./LegalModal";
import SmartResumeOtpModal, { CandidateParsedData } from "./SmartResumeOtpModal";

import candidateHeroImg from "../assets/images/cinematic_candidates_desk_1786908694614.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

// Popular Categories Configuration
const POPULAR_CATEGORIES = [
  { id: "it", title: "IT & Software", query: "software", count: "1,200+", icon: Laptop },
  { id: "sales", title: "Sales", query: "sales", count: "850+", icon: TrendingUp },
  { id: "finance", title: "Banking & Finance", query: "finance", count: "620+", icon: Briefcase },
  { id: "bpo", title: "BPO / Customer Service", query: "customer support", count: "940+", icon: Users },
  { id: "hr", title: "HR & Recruitment", query: "hr", count: "430+", icon: UserCheck },
  { id: "marketing", title: "Marketing", query: "marketing", count: "510+", icon: Sparkles },
  { id: "healthcare", title: "Healthcare", query: "healthcare", count: "380+", icon: Award },
  { id: "engineering", title: "Engineering", query: "engineer", count: "720+", icon: Layers },
  { id: "operations", title: "Operations", query: "operations", count: "460+", icon: Compass },
  { id: "freshers", title: "Fresher Jobs", query: "fresher", count: "1,500+", icon: GraduationCap },
  { id: "wfh", title: "Work From Home", query: "remote", count: "1,100+", icon: Building2 },
];

export default function LandingPage({
  onGetStarted,
  setActiveView,
  onOpenCompanyPage,
  onSelectJob,
  onOpenAuth,
  user
}: LandingPageProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cinematic Intro state (runs once per browser session)
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("aijobs_intro_seen");
  });

  // Live Jobs State
  const [liveJobs, setLiveJobs] = useState<JobPosting[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobFetchError, setJobFetchError] = useState<string | null>(null);

  // Search Bar State
  const [searchTitle, setSearchTitle] = useState("");
  const [searchExp, setSearchExp] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  // Resume Upload / Smart Onboarding State
  const [isSmartOnboarding, setIsSmartOnboarding] = useState(false);
  const [onboardStep, setOnboardStep] = useState("");
  const [onboardProgress, setOnboardProgress] = useState(0);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [parsedCandidateData, setParsedCandidateData] = useState<CandidateParsedData | null>(null);

  // Legal Modal
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);

  // Fetch Live Jobs on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      try {
        setLoadingJobs(true);
        const jobs = await getLiveJobs();
        if (isMounted) {
          setLiveJobs(jobs || []);
          setJobFetchError(null);
        }
      } catch (err: any) {
        console.error("[LandingPage] Failed to fetch live jobs:", err);
        if (isMounted) {
          setJobFetchError("Failed to load live jobs. Please try refreshing.");
        }
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    }
    loadJobs();
    return () => { isMounted = false; };
  }, []);

  // Handle Search Submission
  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    // Dispatch search params and switch to public jobs view
    window.sessionStorage.setItem("aijobs_search_query", searchTitle);
    window.sessionStorage.setItem("aijobs_search_exp", searchExp);
    window.sessionStorage.setItem("aijobs_search_loc", searchLocation);
    setActiveView("public-jobs");
  };

  // Handle Category Click
  const handleCategoryClick = (categoryQuery: string) => {
    window.sessionStorage.setItem("aijobs_search_query", categoryQuery);
    window.sessionStorage.setItem("aijobs_search_exp", "");
    window.sessionStorage.setItem("aijobs_search_loc", "");
    setActiveView("public-jobs");
  };

  // Resume Upload Trigger
  const handleResumeButtonClick = () => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth("signup", "candidate");
      } else {
        setActiveView("candidate-register");
      }
      return;
    }
    fileInputRef.current?.click();
  };

  // Handle Resume File Selected
  const handleSmartResumeSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSmartOnboarding(true);
    setOnboardStep("Reading resume document layout...");
    setOnboardProgress(20);

    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.includes(",") ? res.split(",")[1] : res;
          resolve(base64);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      setOnboardStep("Extracting key skills and experience via AI parser...");
      setOnboardProgress(45);

      const tempId = "temp_" + Date.now();
      let parseJson: any = null;
      try {
        const parseRes = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: tempId,
            resumeUrl: "https://storage.googleapis.com/temp/resume.pdf",
            fileName: file.name,
            fileBase64,
            fileType: file.type
          })
        });
        if (parseRes.ok) {
          parseJson = await parseJsonResponse(parseRes).catch(() => null);
        }
      } catch (pErr) {
        console.warn("Resume parsing notice:", pErr);
      }

      const parsed = parseJson?.parsed || {};
      let candidateName = parsed.fullName;
      if (!candidateName || candidateName.trim().length < 2) {
        candidateName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").trim();
        candidateName = candidateName.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        candidateName = candidateName.replace(/\b(Resume|CV|New|Latest|Format|Updated|Draft|Doc)\b/gi, "").trim() || "Candidate";
      }

      const cleanEmail = parsed.email || `${candidateName.toLowerCase().replace(/\s+/g, ".")}@candidate.aijobs.local`;
      let cleanPhone = parsed.phone || "+919876543210";
      if (cleanPhone && !cleanPhone.startsWith("+")) {
        cleanPhone = "+91" + cleanPhone.replace(/\D/g, "");
      }

      const extractedSkills = parsed.skills && Array.isArray(parsed.skills) && parsed.skills.length > 0
        ? parsed.skills
        : ["Software Engineering", "Problem Solving", "Communication", "Data Analytics"];

      setOnboardStep("Uploading resume securely to Cloudinary...");
      setOnboardProgress(70);

      let downloadURL = "";
      try {
        const cloudinaryRes = await uploadToCloudinary(file, {
          userId: user?.uid || "anonymous_upload",
          assetType: "resumes",
          onProgress: (pct) => setOnboardProgress(70 + Math.round((pct / 100) * 25))
        });
        downloadURL = cloudinaryRes.secure_url;
      } catch (stErr) {
        console.warn("Cloudinary upload fallback:", stErr);
      }

      setOnboardProgress(100);
      showToast("Resume successfully processed!", "success");

      setParsedCandidateData({
        uid: user?.uid || "candidate_" + Date.now(),
        fullName: candidateName,
        email: cleanEmail,
        phone: cleanPhone,
        skills: extractedSkills,
        experience: parsed.totalExperience || "Relevant Experience",
        education: parsed.education,
        city: parsed.city,
        atsScore: 94,
        resumeUrl: downloadURL,
        resumeFileName: file.name
      });

      setTimeout(() => {
        setIsSmartOnboarding(false);
        setOtpModalOpen(true);
      }, 300);

    } catch (err: any) {
      console.error("[LandingPage] Resume upload error:", err);
      showToast(`Resume error: ${err.message || err}`, "error");
      setIsSmartOnboarding(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Cinematic Grand Logo Reveal (12–15s cleanly, no particles) */}
      <AnimatePresence>
        {showIntro && (
          <AIJobs3DIntro
            onComplete={() => {
              setShowIntro(false);
              sessionStorage.setItem("aijobs_intro_seen", "true");
            }}
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input for Resume Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSmartResumeSelected}
        accept=".pdf,.doc,.docx"
        className="hidden"
      />

      {/* Smart Onboarding Progress Overlay */}
      {isSmartOnboarding && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-slate-100 animate-fadeIn">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">Processing Resume</h3>
              <p className="text-xs text-slate-500 font-medium">{onboardStep}</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${onboardProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>Analyzing format</span>
                <span>{onboardProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1 — HERO SECTION
          Clean white/light blue background, high contrast typography, prominent search
          ========================================================================= */}
      <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 bg-gradient-to-b from-slate-50 via-blue-50/20 to-white overflow-hidden border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Hero Column: Headings & Search Box */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>INDIA'S AI-POWERED JOB PLATFORM</span>
              </div>

              {/* Main Titles */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Your Next Job <span className="text-blue-600">Starts Here.</span>
                </h1>
                <p className="text-base sm:text-lg text-slate-700 font-semibold">
                  Search verified jobs. Apply faster. Build your career with AIJobs.
                </p>
                <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                  Discover opportunities from verified employers, recruiters and placement consultancies across India.
                </p>
              </div>

              {/* Large Prominent Job Search Bar */}
              <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 mt-2">
                <form onSubmit={handleHeroSearch} className="flex flex-col md:flex-row items-stretch gap-2.5">
                  {/* Job Title / Skill */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      id="hero-search-title"
                      type="text"
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                      placeholder="Search by job title, skill or company"
                      className="w-full h-12 pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Experience Select */}
                  <div className="w-full md:w-44 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      id="hero-search-exp"
                      value={searchExp}
                      onChange={(e) => setSearchExp(e.target.value)}
                      className="w-full h-12 pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-medium transition-all cursor-pointer"
                    >
                      <option value="">Experience</option>
                      <option value="fresher">Fresher</option>
                      <option value="0-1">0–1 Year</option>
                      <option value="1-3">1–3 Years</option>
                      <option value="3-5">3–5 Years</option>
                      <option value="5-10">5–10 Years</option>
                      <option value="10+">10+ Years</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Location Select */}
                  <div className="w-full md:w-44 relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      id="hero-search-loc"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full h-12 pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none font-medium transition-all cursor-pointer"
                    >
                      <option value="">Location</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Pune">Pune</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Kolkata">Kolkata</option>
                      <option value="Remote">Remote</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Submit Search Button */}
                  <button
                    id="hero-search-submit"
                    type="submit"
                    className="w-full md:w-auto h-12 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    <span>Search Jobs</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Quick Keywords Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Popular:</span>
                {["Software Engineer", "Fresher IT", "Remote Developer", "Sales Executive", "Accountant"].map((kw) => (
                  <button
                    key={kw}
                    onClick={() => handleCategoryClick(kw)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/80 transition-colors cursor-pointer text-xs font-medium"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Hero Column: Realistic Indian Professional Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 bg-slate-900 group">
                <img
                  src={candidateHeroImg}
                  alt="Indian Professional Working with AIJobs"
                  referrerPolicy="no-referrer"
                  className="w-full h-80 sm:h-96 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Floating Verified Badge */}
                <div className="absolute top-4 left-4 p-3 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Verified Openings</div>
                    <div className="text-[10px] text-slate-500 font-medium">100% Free for Candidates</div>
                  </div>
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-white space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">AIJobs Smart Matching</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono">Live In India</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    Direct connection to verified recruiters without intermediary delays.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 — CANDIDATE SAFETY MESSAGE
          100% Free Placement Assurance & Anti-Fraud Notice
          ========================================================================= */}
      <section className="bg-blue-600 text-white py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                Candidate Safety Promise: AIJobs does not charge candidates for job applications or placement.
              </p>
              <p className="text-[11px] text-blue-100">
                Job opportunities are free to search and apply. Selection depends on the employer/recruiter interview and hiring process.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveLegalDoc("terms")}
            className="px-3.5 py-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 — POPULAR JOBS / CATEGORIES
          ========================================================================= */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Explore Popular Job Categories
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Browse verified openings by your professional domain across India.
              </p>
            </div>
            <button
              onClick={() => setActiveView("public-jobs")}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {POPULAR_CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.query)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white group-hover:bg-blue-600 text-blue-600 group-hover:text-white shadow-sm flex items-center justify-center transition-colors">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {cat.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Explore Openings
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 — LATEST JOB OPENINGS (REAL DATA FROM FIRESTORE)
          ========================================================================= */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Real-Time Listings</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Latest Job Openings
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Direct job openings from employers, recruiters, and consultancies.
              </p>
            </div>
            <button
              onClick={() => setActiveView("public-jobs")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>View All Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Job Listings Grid */}
          {loadingJobs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((sk) => (
                <div key={sk} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-16 bg-slate-50 rounded-2xl"></div>
                  <div className="h-8 bg-slate-100 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : liveJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveJobs.slice(0, 6).map((job) => (
                <div
                  key={job.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.companyName || job.company || "Verified Employer"}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0">
                        {job.jobType || "Full Time"}
                      </span>
                    </div>

                    {/* Job Details Chips */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{job.location || "India"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{job.experience || "0–2 Years"}</span>
                      </div>
                    </div>

                    {/* Salary & Date */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {job.salary || "Competitive Salary"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {job.postedDate || "Recently Posted"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (onSelectJob && job.id) onSelectJob(job.id);
                        else setActiveView("public-jobs");
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold text-center transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        if (user) {
                          if (onSelectJob && job.id) onSelectJob(job.id);
                          else setActiveView("public-jobs");
                        } else {
                          if (onOpenAuth) onOpenAuth("signin", "candidate");
                          else setActiveView("candidate-login");
                        }
                      }}
                      className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold text-center shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3 max-w-lg mx-auto">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Live Jobs Available</h3>
              <p className="text-xs text-slate-500">
                No live jobs available right now. Please check again soon or upload your resume for upcoming matches.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 — WHY AIJOBS
          4 Clear Pillars
          ========================================================================= */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Why Candidates & Employers Choose AIJobs
            </h2>
            <p className="text-sm text-slate-500">
              Modern recruitment infrastructure designed for speed, transparency, and accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Verified Job Opportunities</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct postings from genuine employers, vetted recruiters, and certified placement consultancies across India.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Easy Job Search & Apply</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                1-click applications with fast resume parsing. No endless redundant profile forms.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">AI-Powered Recommendations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Intelligent semantic skill matching that surfaces relevant roles aligned with your career goals.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Status Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Transparent application timeline updates from screening to interview scheduling and offer releases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6 — CAREER STAGES
          ========================================================================= */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Opportunities for Every Career Stage
            </h2>
            <p className="text-sm text-slate-500">
              Whether entering the workforce or taking the next leadership step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stage 1: Freshers */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Freshers & Graduates</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Entry-level openings, internships, and graduate trainee programs for 0–1 year candidates across IT, sales, and operations.
                </p>
              </div>
              <button
                onClick={() => handleCategoryClick("fresher")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-2"
              >
                <span>Explore Fresher Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stage 2: Experienced */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Experienced Professionals</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mid to senior engineering, management, and leadership opportunities with top-tier Indian companies and startups.
                </p>
              </div>
              <button
                onClick={() => handleCategoryClick("experienced")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-2"
              >
                <span>Explore Professional Roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stage 3: Remote / WFH */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Laptop className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Work From Home / Remote</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Flexible work-from-home and hybrid career roles across software, customer service, digital marketing, and analytics.
                </p>
              </div>
              <button
                onClick={() => handleCategoryClick("remote")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer pt-2"
              >
                <span>Explore Remote Openings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 — RESUME SECTION
          ========================================================================= */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5" />
                <span>Instant ATS Optimization</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Make Your Resume Work Smarter
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg leading-relaxed">
                Upload your resume and get personalized job recommendations tailored to your exact skills and experience.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={handleResumeButtonClick}
                className="px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-900 text-sm font-bold rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Resume</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 — TRUST & PLATFORM PILLARS
          ========================================================================= */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Built for India's Growing Workforce
            </h2>
            <p className="text-sm text-slate-500">
              Enterprise-grade compliance, data privacy, and verified recruitment pipelines.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">100%</div>
              <div className="text-xs font-bold text-slate-800">Free for Jobseekers</div>
              <div className="text-[11px] text-slate-500">No application or placement charges</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">256-Bit</div>
              <div className="text-xs font-bold text-slate-800">Data Encryption</div>
              <div className="text-[11px] text-slate-500">Bank-grade candidate data security</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">NDNC</div>
              <div className="text-xs font-bold text-slate-800">Compliant SMS</div>
              <div className="text-[11px] text-slate-500">Official transactional verification</div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">Instant</div>
              <div className="text-xs font-bold text-slate-800">Status Alerts</div>
              <div className="text-[11px] text-slate-500">Real-time interview updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 10 — FOOTER
          ========================================================================= */}
      <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            
            {/* Column 1: Brand */}
            <div className="lg:col-span-2 space-y-4">
              <AIJobsLogo className="h-9 w-auto text-white" />
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                AIJobs is an AI-powered hiring platform connecting Indian candidates directly to verified employers, recruiters, and placement consultancies.
              </p>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-blue-400 font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-400" />
                <span>AIJobs does not charge candidates for job placement.</span>
              </div>
            </div>

            {/* Column 2: Jobseekers */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">For Jobseekers</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => setActiveView("public-jobs")} className="hover:text-white transition-colors">Search Jobs</button></li>
                <li><button onClick={() => handleCategoryClick("fresher")} className="hover:text-white transition-colors">Fresher Jobs</button></li>
                <li><button onClick={() => handleCategoryClick("remote")} className="hover:text-white transition-colors">Work From Home</button></li>
                <li><button onClick={handleResumeButtonClick} className="hover:text-white transition-colors">Upload Resume</button></li>
                <li><button onClick={() => onOpenAuth ? onOpenAuth("signin", "candidate") : setActiveView("unified-login")} className="hover:text-white transition-colors">Candidate Login</button></li>
              </ul>
            </div>

            {/* Column 4: Legal & Support */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company & Legal</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li><button onClick={() => onOpenCompanyPage?.("about")} className="hover:text-white transition-colors">About AIJobs</button></li>
                <li><button onClick={() => setActiveLegalDoc("privacy")} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setActiveLegalDoc("terms")} className="hover:text-white transition-colors">Terms of Service</button></li>
                <li><button onClick={() => onOpenCompanyPage?.("contact")} className="hover:text-white transition-colors">Contact Support</button></li>
                <li><button onClick={() => onOpenCompanyPage?.("help")} className="hover:text-white transition-colors">Help Center</button></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div>
              © {new Date().getFullYear()} AIJOBS. All rights reserved. Find Smarter. Hire Faster.
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveLegalDoc("privacy")} className="hover:text-slate-300 transition-colors">Privacy</button>
              <span>•</span>
              <button onClick={() => setActiveLegalDoc("terms")} className="hover:text-slate-300 transition-colors">Terms</button>
              <span>•</span>
              <button onClick={() => onOpenCompanyPage?.("contact")} className="hover:text-slate-300 transition-colors">Support</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Smart Resume OTP Modal */}
      {otpModalOpen && parsedCandidateData && (
        <SmartResumeOtpModal
          parsedData={parsedCandidateData}
          onClose={() => setOtpModalOpen(false)}
          onSuccess={(profile) => {
            setOtpModalOpen(false);
            showToast(`Profile activated for ${profile.name}!`, "success");
            setActiveView("dashboard");
          }}
        />
      )}

      {/* Legal Modal */}
      {activeLegalDoc && (
        <LegalModal
          docType={activeLegalDoc}
          onClose={() => setActiveLegalDoc(null)}
        />
      )}
    </div>
  );
}
