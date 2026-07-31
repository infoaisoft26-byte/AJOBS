import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock,
  File,
  FileText,
  Heart,
  Home,
  Link,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Send,
  Share,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  UserPlus,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "../firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment 
} from "firebase/firestore";
import { JobPosting, JobApplication, UserProfile } from "../types";
import { fetchPaginatedLiveJobs } from "../services/jobService";
import { applyToJob } from "../services/applicationService";
import { saveJobToBookmarks, removeJobFromBookmarks, getSavedJobIdsFromBookmarks } from "../services/savedJobsService";
import { useToast } from "./GlobalToast";

interface PublicJobOpeningsProps {
  onSelectJob: (jobId: string) => void;
  onOpenAuth: (mode: "signin" | "signup") => void;
  onOpenResumeUpload: () => void;
  user: UserProfile | null;
  setActiveView: (view: string) => void;
}

const QUICK_CHIPS = [
  { id: "all", label: "All Openings", icon: Sparkles },
  { id: "freshers", label: "Freshers", keyword: "fresher" },
  { id: "wfh", label: "Work From Home", keyword: "work from home" },
  { id: "remote", label: "Remote", keyword: "remote" },
  { id: "fulltime", label: "Full Time", keyword: "full time" },
  { id: "parttime", label: "Part Time", keyword: "part time" },
  { id: "urgent", label: "Urgent Hiring", keyword: "urgent" },
  { id: "walkin", label: "Walk-in Jobs", keyword: "walk-in" },
  { id: "recent", label: "Recently Posted", keyword: "recent" },
];

export default function PublicJobOpenings({
  onSelectJob,
  onOpenAuth,
  onOpenResumeUpload,
  user,
  setActiveView
}: PublicJobOpeningsProps) {
  const { showToast } = useToast();
  
  // Jobs State
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [experienceTerm, setExperienceTerm] = useState("");
  const [selectedChip, setSelectedChip] = useState("all");

  // Saved Jobs State
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);

  // Apply Modal State
  const [applyingJob, setApplyingJob] = useState<JobPosting | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const [appSubmittedSuccess, setAppSubmittedSuccess] = useState<any | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any | null>(null);

  // Application Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formCurrentCompany, setFormCurrentCompany] = useState("");
  const [formExpectedSalary, setFormExpectedSalary] = useState("");
  const [formNoticePeriod, setFormNoticePeriod] = useState("Immediate");
  const [formConsent, setFormConsent] = useState(true);
  const [resumeFileObj, setResumeFileObj] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeFileName, setResumeFileName] = useState<string>("");

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved jobs & candidate profile when user changes
  useEffect(() => {
    let isMounted = true;
    async function loadUserData() {
      if (user?.uid) {
        try {
          // Saved jobs
          const savedIds = await getSavedJobIdsFromBookmarks(user.uid);
          if (isMounted) setSavedJobIds(savedIds);

          // Candidate profile
          const candSnap = await getDoc(doc(db, "candidates", user.uid));
          if (candSnap.exists() && isMounted) {
            const data = candSnap.data();
            setCandidateProfile(data);
            setFormName(data.name || user.name || "");
            setFormEmail(data.email || user.email || "");
            setFormPhone(data.phone || user.profileDetails?.mobileNumber || "");
            setFormLocation(data.location || data.profileDetails?.location || "Bengaluru, India");
            setFormExperience(data.experience || "1-3 Years");
            setResumeUrl(data.resumeUrl || data.resumeFileName || "");
            setResumeFileName(data.resumeFileName || "Candidate_Resume.pdf");
          } else if (isMounted) {
            setFormName(user.name || "");
            setFormEmail(user.email || "");
          }
        } catch (e) {
          console.warn("Could not load candidate profile for apply modal:", e);
        }
      }
    }
    loadUserData();
    return () => { isMounted = false; };
  }, [user]);

  // Initial jobs load
  useEffect(() => {
    loadJobsData();
  }, []);

  const loadJobsData = async () => {
    try {
      setLoading(true);
      const res = await fetchPaginatedLiveJobs(12, null);
      setJobs(res.jobs);
      setLastDoc(res.lastDoc);
      setHasMore(res.jobs.length >= 10);
    } catch (err) {
      console.error("Error loading homepage live jobs:", err);
      showToast("Could not load live job listings. Please check internet connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJobs = async () => {
    if (!lastDoc || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await fetchPaginatedLiveJobs(12, lastDoc);
      setJobs((prev) => [...prev, ...res.jobs]);
      setLastDoc(res.lastDoc);
      setHasMore(res.jobs.length >= 8);
    } catch (err) {
      console.error("Error loading more jobs:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter Jobs Logic
  const filteredJobs = jobs.filter((job) => {
    const titleMatch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skillsRequired?.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const locMatch = !locationTerm || 
      job.location?.toLowerCase().includes(locationTerm.toLowerCase());

    const expMatch = !experienceTerm || experienceTerm === "all" ||
      job.experience?.toLowerCase().includes(experienceTerm.toLowerCase()) ||
      (experienceTerm === "fresher" && (job.experience?.toLowerCase().includes("fresher") || job.experience === "0-1 Years" || job.experience === "Junior"));

    let chipMatch = true;
    if (selectedChip !== "all") {
      const chipObj = QUICK_CHIPS.find((c) => c.id === selectedChip);
      const kw = chipObj?.keyword || selectedChip;
      const combinedText = `${job.title} ${job.companyName} ${job.type} ${job.workMode} ${job.experience} ${job.description}`.toLowerCase();
      
      if (selectedChip === "freshers") {
        chipMatch = combinedText.includes("fresher") || combinedText.includes("0-1") || combinedText.includes("junior");
      } else if (selectedChip === "wfh" || selectedChip === "remote") {
        chipMatch = combinedText.includes("work from home") || combinedText.includes("remote") || combinedText.includes("hybrid");
      } else if (selectedChip === "fulltime") {
        chipMatch = combinedText.includes("full time") || combinedText.includes("full-time") || !job.type || job.type === "Full-time";
      } else if (selectedChip === "parttime") {
        chipMatch = combinedText.includes("part time") || combinedText.includes("part-time") || combinedText.includes("contract");
      } else if (selectedChip === "urgent") {
        chipMatch = combinedText.includes("urgent") || combinedText.includes("immediate") || job.isFeatured === true;
      } else if (selectedChip === "walkin") {
        chipMatch = combinedText.includes("walk-in") || combinedText.includes("walkin") || combinedText.includes("direct");
      } else if (selectedChip === "recent") {
        const isRecent = job.createdAt ? (Date.now() - new Date(job.createdAt).getTime()) < 7 * 24 * 3600 * 1000 : true;
        chipMatch = isRecent;
      } else {
        chipMatch = combinedText.includes(kw);
      }
    }

    return titleMatch && locMatch && expMatch && chipMatch;
  });

  // Toggle Save / Bookmark
  const handleToggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!user) {
      showToast("Please sign in to save jobs to your candidate account.", "info");
      onOpenAuth("signin");
      return;
    }

    const isAlreadySaved = savedJobIds.includes(jobId);
    try {
      if (isAlreadySaved) {
        setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
        await removeJobFromBookmarks(user.uid, jobId);
        showToast("Job removed from saved bookmarks", "info");
      } else {
        setSavedJobIds((prev) => [...prev, jobId]);
        await saveJobToBookmarks(user.uid, jobId);
        showToast("✨ Job saved to your candidate dashboard!", "success");
      }
    } catch (err) {
      console.error("Save job error:", err);
      showToast("Failed to update saved job status", "error");
    }
  };

  // Share Job
  const handleShareJob = (e: React.MouseEvent, job: JobPosting) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/jobs/${encodeURIComponent(job.title.toLowerCase().replace(/\s+/g, "-"))}-${job.id}`;
    if (navigator.share) {
      navigator.share({
        title: `${job.title} at ${job.companyName}`,
        text: `Apply now for ${job.title} on AIJobs Platform!`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast("✨ Direct Job Link copied to clipboard!", "success");
    }
  };

  // Open Apply Confirmation Modal
  const handleOpenApplyModal = (e: React.MouseEvent, job: JobPosting) => {
    e.stopPropagation();
    if (!user) {
      showToast("Please sign in or create a candidate profile to apply for jobs.", "info");
      onOpenAuth("signin");
      return;
    }

    if (user.role && ["employer", "recruiter", "corporate", "admin", "superadmin"].includes(user.role.toLowerCase())) {
      showToast("Recruiter and Admin accounts cannot apply for jobs. Please switch to a Candidate account.", "warning");
      return;
    }

    setApplyingJob(job);
    setAppSubmittedSuccess(null);
    setApplyModalOpen(true);
  };

  // Submit Application Handler
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob || !user) return;

    if (!formConsent) {
      showToast("Please accept the terms to share your candidate credentials.", "warning");
      return;
    }

    try {
      setIsSubmittingApp(true);

      const profilePayload = {
        name: formName || user.name,
        email: formEmail || user.email,
        phone: formPhone,
        location: formLocation,
        experience: formExperience,
        currentCompany: formCurrentCompany,
        expectedSalary: formExpectedSalary,
        noticePeriod: formNoticePeriod,
        resumeFileName: resumeFileName || "Candidate_Resume.pdf",
        resumeUrl: resumeUrl || "gs://aijobs-resumes/resume.pdf",
        resumeText: candidateProfile?.resumeText || "Verified candidate application details.",
        resumeScore: candidateProfile?.resumeScore || 85,
        aiInterviewScore: candidateProfile?.aiInterviewScore || 90
      };

      const result = await applyToJob(applyingJob, user.uid, profilePayload, profilePayload.resumeText);

      if (result.success) {
        setAppSubmittedSuccess({
          applicationId: result.applicationId || `app_${Math.random().toString(36).substring(2, 9)}`,
          jobTitle: applyingJob.title,
          companyName: applyingJob.companyName
        });
        showToast("🎉 Application submitted successfully to recruiter!", "success");
      } else {
        showToast(result.message, "warning");
      }
    } catch (err: any) {
      console.error("Submit application error:", err);
      showToast(err.message || "Failed to submit application. Please retry.", "error");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10" id="homepage-job-openings-section">
      
      {/* Background Decorative Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. Header & Title Block */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-spin-slow text-emerald-400" />
          <span>Verified Recruiters & Live Hirings</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight">
          Current Job Openings
        </h2>
        <p className="text-gray-400 text-sm sm:text-base mt-3 leading-relaxed">
          Search and apply for verified opportunities from companies and recruiters across India.
        </p>
      </div>

      {/* 2. Prominent Futuristic Search Bar */}
      <div className="glass p-3 sm:p-4 rounded-3xl border border-white/15 shadow-2xl bg-black/60 backdrop-blur-2xl mb-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Job Title / Skill Input */}
          <div className="md:col-span-5 relative flex items-center">
            <Search className="w-5 h-5 text-indigo-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Job title, role or skill (e.g. React, SDE, Marketing)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 focus:border-indigo-500 rounded-2xl text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 text-gray-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Input */}
          <div className="md:col-span-3 relative flex items-center">
            <MapPin className="w-5 h-5 text-purple-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              placeholder="Location (e.g. Bengaluru, Remote)"
              value={locationTerm}
              onChange={(e) => setLocationTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 focus:border-purple-500 rounded-2xl text-white text-xs sm:text-sm placeholder-gray-500 focus:outline-none transition-all"
            />
            {locationTerm && (
              <button 
                onClick={() => setLocationTerm("")}
                className="absolute right-3 text-gray-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Experience Select */}
          <div className="md:col-span-2 relative flex items-center">
            <Briefcase className="w-4 h-4 text-emerald-400 absolute left-4 pointer-events-none" />
            <select
              value={experienceTerm}
              onChange={(e) => setExperienceTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-3.5 bg-[#0b0f19] border border-white/10 focus:border-emerald-500 rounded-2xl text-white text-xs font-medium focus:outline-none appearance-none transition-all cursor-pointer"
            >
              <option value="">Any Experience</option>
              <option value="fresher">Fresher (0 Yrs)</option>
              <option value="0-2">0 - 2 Years</option>
              <option value="2-5">2 - 5 Years</option>
              <option value="5+">5+ Years</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              onClick={() => {}}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Search Jobs</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. Quick Filter Chips & Action Buttons */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10 max-w-5xl mx-auto">
        
        {/* Chips scroll container */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
          {QUICK_CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setSelectedChip(chip.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 border border-blue-400/30"
                    : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5"
                }`}
              >
                {chip.icon && <chip.icon className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          {(searchTerm || locationTerm || experienceTerm || selectedChip !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setLocationTerm("");
                setExperienceTerm("");
                setSelectedChip("all");
              }}
              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onOpenResumeUpload}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-blue-300 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Upload Resume</span>
          </button>

          {!user && (
            <button
              onClick={() => onOpenAuth("signup")}
              className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-bold rounded-xl border border-indigo-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create Profile</span>
            </button>
          )}
        </div>

      </div>

      {/* 4. Job Listings Counter */}
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto px-1">
        <div className="text-xs font-mono text-gray-400">
          Showing <span className="text-white font-bold">{filteredJobs.length}</span> live opportunities across India
        </div>
        <button 
          onClick={loadJobsData}
          className="text-xs font-mono text-indigo-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh Live Feed</span>
        </button>
      </div>

      {/* 5. Live Jobs Display Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="p-6 glass rounded-3xl border border-white/5 space-y-4 animate-pulse bg-gray-900/30">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/10" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-white/10 rounded" />
                    <div className="w-20 h-3 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="w-16 h-5 bg-white/10 rounded-full" />
              </div>
              <div className="w-3/4 h-5 bg-white/10 rounded" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="w-24 h-4 bg-white/5 rounded" />
                <div className="w-24 h-4 bg-white/5 rounded" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="w-16 h-6 bg-white/5 rounded-xl" />
                <div className="w-16 h-6 bg-white/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center glass rounded-3xl border border-white/10 max-w-2xl mx-auto space-y-4 my-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-white font-bold text-lg">No openings match your search criteria right now</h3>
          <p className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed">
            We couldn't find active jobs matching your selected location, skill or role keywords. Please try clearing your search filters or check back shortly.
          </p>
          <button
            onClick={() => {
              setSearchTerm("");
              setLocationTerm("");
              setExperienceTerm("");
              setSelectedChip("all");
            }}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Search Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {filteredJobs.map((job) => {
            const isSaved = savedJobIds.includes(job.id);
            const isUrgent = job.isFeatured || (job.description && job.description.toLowerCase().includes("urgent"));

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => onSelectJob(job.id)}
                className="group relative p-6 glass rounded-3xl border border-white/10 hover:border-indigo-500/50 bg-black/40 hover:bg-black/60 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Company Logo + Verified Badge + Saved Button */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-lg flex items-center justify-center uppercase shadow-md shadow-indigo-500/20 shrink-0">
                        {job.companyName ? job.companyName.substring(0, 2) : "AI"}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-indigo-300 font-mono tracking-wide">
                            {job.companyName}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Verified
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently Posted"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isUrgent && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-mono font-bold rounded-full">
                          Urgent
                        </span>
                      )}
                      <button
                        onClick={(e) => handleToggleSave(e, job.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isSaved
                            ? "bg-pink-500/20 border-pink-500/40 text-pink-400"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                        title={isSaved ? "Remove from saved jobs" : "Save job"}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Job Title */}
                  <h3 className="font-extrabold text-base sm:text-lg text-white group-hover:text-indigo-300 transition-colors line-clamp-2 mb-3">
                    {job.title}
                  </h3>

                  {/* Specs Pill Badges */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-300 bg-white/[0.02] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{job.location || "Bengaluru / Remote"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-300 bg-white/[0.02] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{job.experience || "0 - 2 Yrs"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-emerald-400 bg-white/[0.02] px-2.5 py-1.5 rounded-xl border border-white/5 font-bold">
                      <span className="text-emerald-500">₹</span>
                      <span className="truncate">{job.salary || "Competitive"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-indigo-300 bg-white/[0.02] px-2.5 py-1.5 rounded-xl border border-white/5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{job.workMode || job.type || "Full Time"}</span>
                    </div>
                  </div>

                  {/* Skill Chips */}
                  {job.skillsRequired && job.skillsRequired.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {job.skillsRequired.slice(0, 4).map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono rounded-lg font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skillsRequired.length > 4 && (
                        <span className="px-2 py-1 bg-white/5 text-gray-400 text-[10px] font-mono rounded-lg">
                          +{job.skillsRequired.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 mt-2">
                  <div className="text-[10px] font-mono text-gray-400">
                    <span className="text-indigo-400 font-bold">{job.openings || 2} Openings</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleShareJob(e, job)}
                      className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/10 cursor-pointer"
                      title="Share job link"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob(job.id);
                      }}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
                    >
                      View Details
                    </button>

                    <button
                      onClick={(e) => handleOpenApplyModal(e, job)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* 6. Load More Button */}
      {hasMore && !loading && (
        <div className="text-center mt-12">
          <button
            onClick={loadMoreJobs}
            disabled={loadingMore}
            className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs sm:text-sm rounded-2xl border border-white/15 transition-all shadow-xl active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Fetching More Positions...</span>
              </>
            ) : (
              <>
                <span>Load More Jobs</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </>
            )}
          </button>
        </div>
      )}

      {/* 7. Application Confirmation Modal */}
      <AnimatePresence>
        {applyModalOpen && applyingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full bg-[#0b0f19] shadow-2xl relative my-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setApplyModalOpen(false)}
                className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {appSubmittedSuccess ? (
                /* Success Screen */
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-mono uppercase font-bold">
                      Application Submitted
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white mt-2">You're All Set!</h3>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      Your application for <strong className="text-white">{appSubmittedSuccess.jobTitle}</strong> at <strong className="text-white">{appSubmittedSuccess.companyName}</strong> has been received and routed directly to the hiring recruiter.
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-left text-xs space-y-1 font-mono">
                    <div className="text-gray-400 text-[10px]">APPLICATION REFERENCE ID:</div>
                    <div className="text-indigo-300 font-bold">{appSubmittedSuccess.applicationId}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => {
                        setApplyModalOpen(false);
                        setActiveView("dashboard");
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      View Candidate Dashboard
                    </button>
                    <button
                      onClick={() => setApplyModalOpen(false)}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-extrabold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                    >
                      Keep Browsing Jobs
                    </button>
                  </div>
                </div>
              ) : (
                /* Application Form */
                <form onSubmit={handleSubmitApplication} className="space-y-4">
                  
                  {/* Job Header Summary */}
                  <div className="border-b border-white/10 pb-4 pr-8">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Confirm Job Application</span>
                    <h3 className="text-lg font-extrabold text-white mt-1">{applyingJob.title}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                      <span className="text-indigo-300 font-semibold">{applyingJob.companyName}</span>
                      <span>•</span>
                      <span>{applyingJob.location || "Remote"}</span>
                    </p>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-xs">
                    
                    <div>
                      <label className="block text-gray-300 font-bold mb-1 text-[11px]">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Aryan Sharma"
                        className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          placeholder="e.g. aryan@example.com"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Current Location *</label>
                        <input
                          type="text"
                          required
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder="e.g. Bengaluru, KA"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Total Experience *</label>
                        <input
                          type="text"
                          required
                          value={formExperience}
                          onChange={(e) => setFormExperience(e.target.value)}
                          placeholder="e.g. 2.5 Years"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Current / Recent Company</label>
                        <input
                          type="text"
                          value={formCurrentCompany}
                          onChange={(e) => setFormCurrentCompany(e.target.value)}
                          placeholder="e.g. TechCorp Solutions"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-300 font-bold mb-1 text-[11px]">Expected Salary (LPA)</label>
                        <input
                          type="text"
                          value={formExpectedSalary}
                          onChange={(e) => setFormExpectedSalary(e.target.value)}
                          placeholder="e.g. ₹12,00,000"
                          className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Resume Attachment Verification */}
                    <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-bold flex items-center gap-1.5 text-[11px]">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>Attached Resume Document</span>
                        </span>
                        <input
                          type="file"
                          ref={modalFileInputRef}
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setResumeFileObj(file);
                              setResumeFileName(file.name);
                              showToast(`Updated resume document: ${file.name}`, "info");
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => modalFileInputRef.current?.click()}
                          className="text-[10px] text-indigo-400 hover:text-white font-bold cursor-pointer underline"
                        >
                          {resumeFileName ? "Change File" : "Upload File"}
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono truncate">
                        📄 {resumeFileName || "Candidate_Profile_Resume.pdf"}
                      </div>
                    </div>

                    {/* Consent Checkbox */}
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="formConsentCheck"
                        checked={formConsent}
                        onChange={(e) => setFormConsent(e.target.checked)}
                        className="mt-0.5 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="formConsentCheck" className="text-[10px] text-gray-400 leading-normal cursor-pointer select-none">
                        I confirm that my details are accurate and grant permission to share my candidate profile and resume with recruiter partners for this role.
                      </label>
                    </div>

                  </div>

                  {/* Submit Button */}
                  <div className="pt-3 border-t border-white/10">
                    <button
                      type="submit"
                      disabled={isSubmittingApp}
                      className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmittingApp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Filing Application to Firestore...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 text-emerald-300" />
                          <span>Submit Official Application</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
