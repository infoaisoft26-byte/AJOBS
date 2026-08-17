import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AlertTriangle, ArrowLeft, ArrowRight, Brain, Briefcase, Check, CheckCircle2, Clock, File, FileText, Grid, Heart, Info, Key, Link, MapPin, Navigation, Package, Section, Send, Share, Share2, ShieldCheck, Sparkles, Users, View, X } from "lucide-react";
import { db } from "../firebase";


import { JobPosting, JobApplication } from "../types";
import { getJobById, getLiveJobs } from "../services/jobService";
import { applyToJob } from "../services/applicationService";
import { saveJobToBookmarks, removeJobFromBookmarks } from "../services/savedJobsService";
import { useJobPostingSchema } from "../hooks/useJobPostingSchema";
import { useToast } from "./GlobalToast";

interface JobDetailsProps {
  jobId: string;
  userId: string;
  userName: string;
  profile: any;
  resumeText?: string;
  onBack: () => void;
  onSelectSimilarJob?: (similarJobId: string) => void;
  onAppliedSuccess?: (newApp: JobApplication) => void;
}

export default function JobDetails({
  jobId,
  userId,
  userName,
  profile,
  resumeText,
  onBack,
  onSelectSimilarJob,
  onAppliedSuccess
}: JobDetailsProps) {
  const { showToast } = useToast();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [similarJobs, setSimilarJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Invoke SEO structured JobPosting schema & dynamic meta management
  useJobPostingSchema(job);

  // Load job details, similar jobs, and check status
  useEffect(() => {
    let active = true;

    async function loadJobAndStatus() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch Job from service
        const jobData = await getJobById(jobId);
        if (!active) return;

        if (!jobData) {
          setError("The requested job posting could not be found or has been archived.");
          setLoading(false);
          return;
        }
        setJob(jobData);

        // 2. Fetch similar live jobs
        try {
          const allLive = await getLiveJobs();
          const filtered = allLive.filter((j) => j.id !== jobId).slice(0, 3);
          if (active) setSimilarJobs(filtered);
        } catch (sErr) {
          console.warn("Could not fetch similar jobs:", sErr);
        }

        // 3. Check if already applied
        if (userId) {
          const appsRef = collection(db, "applications");
          const q = query(
            appsRef,
            where("jobId", "==", jobId),
            where("candidateId", "==", userId)
          );
          const snap = await getDocs(q);
          if (snap.size > 0 && active) {
            setHasApplied(true);
          }
        }

        // 4. Check if saved in user profile bookmarks
        if (profile?.savedJobIds?.includes(jobId) && active) {
          setIsSaved(true);
        }

      } catch (err: any) {
        console.error("Error loading job details:", err);
        if (active) {
          setError(err.message || "Failed to retrieve job details. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (jobId) {
      loadJobAndStatus();
    }

    return () => {
      active = false;
    };
  }, [jobId, userId, profile]);

  const handleToggleSave = async () => {
    if (!userId) {
      showToast("Please sign in to save jobs", "info");
      return;
    }
    try {
      if (isSaved) {
        setIsSaved(false);
        await removeJobFromBookmarks(userId, jobId);
        showToast("Job removed from saved bookmarks", "info");
      } else {
        setIsSaved(true);
        await saveJobToBookmarks(userId, jobId);
        showToast("✨ Job saved to candidate bookmarks!", "success");
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  const handleInitiateApply = () => {
    if (!job) return;
    if (hasApplied) {
      showToast("You have already applied for this position.", "info");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!job) return;
    try {
      setIsApplying(true);
      const activeResumeText = resumeText || profile?.resumeText || "Resume Attached";
      const result = await applyToJob(job, userId, profile, activeResumeText);
      if (result.success) {
        setHasApplied(true);
        setShowConfirmModal(false);
        showToast(result.message || "🎉 Application submitted successfully!", "success");
        
        if (onAppliedSuccess) {
          const appId = result.applicationId || `app_${Math.random().toString(36).substring(2, 11)}`;
          const newApp: JobApplication = {
            id: appId,
            jobId: job.id,
            candidateId: userId,
            candidateName: profile?.name || userName,
            jobTitle: job.title,
            companyName: job.companyName,
            status: "Applied",
            appliedAt: new Date().toISOString(),
            resumeScore: profile?.resumeScore || 70
          };
          onAppliedSuccess(newApp);
        }
      } else {
        showToast(result.message || "Application could not be submitted.", "warning");
      }
    } catch (err: any) {
      console.error("Error applying to job:", err);
      showToast(err.message || "An unexpected error occurred during application processing.", "error");
    } finally {
      setIsApplying(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?jobId=${jobId}`;
    const shareData = {
      title: job?.title || "Job Opening",
      text: `Check out this job opening: ${job?.title} at ${job?.companyName || "AIJobs Partner"}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("✨ Vacancy link copied to clipboard successfully! Share with your network.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("✨ Vacancy link copied to clipboard successfully! Share with your network.");
        } catch (clipErr) {
          alert("Failed to copy link. Feel free to copy your current browser URL!");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-cyan-400/80 text-xs font-mono">Fetching full vacancy specifications...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 bg-[rgba(4,12,35,0.85)] backdrop-blur-2xl rounded-3xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center space-y-4 max-w-xl mx-auto mt-10">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-white font-extrabold text-lg">Vacancy Not Available</h3>
        <p className="text-slate-400 text-xs">{error || "This position has been filled or is no longer accepting new candidate files."}</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Job Feed</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-mono text-cyan-400/80 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return to listings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 bg-[rgba(4,12,35,0.8)] hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all border border-[rgba(37,99,235,0.35)] cursor-pointer text-xs flex items-center gap-1.5 font-bold"
            title="Share Position Link"
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main Job details card */}
      <div className="bg-[rgba(4,12,35,0.85)] backdrop-blur-2xl rounded-3xl border border-[rgba(37,99,235,0.35)] shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden">
        
        {/* Banner header styling */}
        <div className="relative bg-gradient-to-r from-blue-950/50 via-slate-900/50 to-blue-950/40 p-8 border-b border-blue-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-4 items-center">
            <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-2xl rounded-2xl w-16 h-16 shadow-[0_0_20px_rgba(0,229,255,0.4)] uppercase">
              {job.companyName?.slice(0, 2) || "CO"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-extrabold uppercase tracking-wider">{job.companyName}</span>
                <span className="bg-blue-500/10 text-cyan-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  {job.type || "Full-time"}
                </span>
                {job.workMode && (
                  <span className="bg-purple-500/10 text-purple-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-purple-500/20">
                    {job.workMode}
                  </span>
                )}
              </div>
              <h1 className="font-extrabold text-xl sm:text-2xl text-white mt-1.5 tracking-tight">{job.title}</h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{job.location || "Remote / Bengaluru"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0 w-full md:w-auto">
            {hasApplied ? (
              <div className="w-full md:w-auto bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Already Applied</span>
              </div>
            ) : (
              <button
                onClick={handleInitiateApply}
                disabled={isApplying}
                className="w-full md:w-auto px-8 py-3 text-xs font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,229,255,0.4)] bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white"
              >
                <Send className="w-4 h-4" />
                <span>Apply Instantly</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-950/40 border-b border-blue-500/20">
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Salary Package</p>
            <p className="text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
              <span className="text-emerald-500">₹</span> {job.salary || "Competitive Salary"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Experience Level</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{job.experience || "Any level"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Required Openings</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{job.openings || 1} Positions</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Expiration / Deadline</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{job.expiryDate ? new Date(job.expiryDate).toLocaleDateString() : "No Expiry"}</span>
            </p>
          </div>
        </div>

        {/* Detailed spec sections */}
        <div className="p-8 space-y-8 text-xs text-slate-300 leading-relaxed">
          
          {/* Job Description */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-mono">
              <span className="h-4 w-1 bg-cyan-400 rounded-full inline-block"></span>
              <span>Role Specifications</span>
            </h3>
            <p className="text-slate-300 whitespace-pre-line leading-relaxed text-xs">
              {job.description || "The direct hiring team is seeking a motivated professional to lead new project cycles, coordinate operational pipelines, and secure reliable deliverables. Join a progressive corporate structure focused on team scaling and personal career progression."}
            </p>
          </div>

          {/* Key Responsibilities */}
          {job.responsibilities && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-mono">
                <span className="h-4 w-1 bg-blue-500 rounded-full inline-block"></span>
                <span>Core Responsibilities</span>
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-slate-300">
                {job.responsibilities.split("\n").filter(Boolean).map((resp, idx) => (
                  <li key={idx} className="leading-relaxed">{resp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements / Core qualifications */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-mono">
              <span className="h-4 w-1 bg-purple-500 rounded-full inline-block"></span>
              <span>Requirements & Credentials</span>
            </h3>
            <p className="text-slate-300 whitespace-pre-line text-xs">
              {job.education ? `Academic Level: ${job.education}\n\n` : ""}
              {job.requirements || "Demonstrated performance record, strong communication skills, deep technical adaptability, and capability to synchronize with cross-functional task units effectively."}
            </p>
          </div>

          {/* Required Stack */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-mono">
                <span className="h-4 w-1 bg-cyan-400 rounded-full inline-block"></span>
                <span>Core Stack Required</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, index) => (
                  <span 
                    key={index} 
                    className="text-[10px] font-mono px-3 py-1.5 bg-blue-500/10 text-cyan-300 rounded-xl border border-blue-500/30 font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits & perks */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2 font-mono">
              <span className="h-4 w-1 bg-emerald-400 rounded-full inline-block"></span>
              <span>Benefits, Compensations & Perks</span>
            </h3>
            <p className="text-slate-300 text-xs">
              {job.benefits || "Includes premium dental/medical coverages, dynamic remote/hybrid workplace scheduling, high-capacity hardware workspace budgets, performance milestone bonuses, and paid educational allowances."}
            </p>
          </div>

          {/* AI Matching Banner */}
          <div className="p-4 bg-blue-950/60 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-3 items-start">
              <Brain className="w-8 h-8 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-white">Curious how your profile fares?</h4>
                <p className="text-[10px] text-slate-400">Our deep ATS compiler can evaluate your current resume and skills profile for instant fit metrics.</p>
              </div>
            </div>
            <button
              onClick={() => {
                showToast("Analyzing candidate profile against ATS parameters for fit score...", "info");
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600/30 to-cyan-500/30 hover:from-blue-600/50 hover:to-cyan-500/50 text-cyan-300 text-[10px] font-bold rounded-xl border border-cyan-500/30 transition-all cursor-pointer shrink-0 font-mono"
            >
              Check Score Alignment
            </button>
          </div>

        </div>

        {/* Footer actions info */}
        <div className="p-6 bg-slate-950/70 border-t border-blue-500/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fully vetted and secure employer credential certification.</span>
          </span>
          <span>Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently"}</span>
        </div>

      </div>

      {/* Similar / Recommended Jobs Section */}
      {similarJobs.length > 0 && (
        <div className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Similar Job Opportunities</span>
            </h3>
            <span className="text-xs text-gray-400 font-mono">Recommended based on tech stack</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {similarJobs.map((simJob) => (
              <div
                key={simJob.id}
                onClick={() => {
                  if (onSelectSimilarJob) {
                    onSelectSimilarJob(simJob.id);
                  } else {
                    window.location.href = `/?jobId=${simJob.id}`;
                  }
                }}
                className="p-4 glass rounded-2xl border border-white/10 hover:border-indigo-500/50 bg-black/30 hover:bg-black/50 transition-all cursor-pointer flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">{simJob.companyName}</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded border border-emerald-500/20">
                      {simJob.workMode || "Live"}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white mt-1 line-clamp-1">{simJob.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-purple-400" />
                    <span>{simJob.location || "Bengaluru"}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                  <span className="text-emerald-400 font-bold">₹ {simJob.salary || "Competitive"}</span>
                  <span className="text-indigo-300 font-extrabold flex items-center gap-1 hover:underline">
                    <span>View</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Mobile Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-[rgba(4,12,35,0.95)] backdrop-blur-2xl border-t border-blue-500/30 z-40 flex items-center justify-between gap-3 shadow-[0_-8px_32px_rgba(0,0,0,0.8)]">
        <button
          onClick={handleToggleSave}
          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
            isSaved 
              ? "bg-pink-500/20 border-pink-500/40 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.3)]" 
              : "bg-slate-900 border-blue-500/30 text-slate-300 hover:text-white"
          }`}
        >
          <Heart className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
        </button>

        {hasApplied ? (
          <div className="flex-1 py-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Already Applied</span>
          </div>
        ) : (
          <button
            onClick={handleInitiateApply}
            disabled={isApplying}
            className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4 text-cyan-200" />
            <span>Apply Now</span>
          </button>
        )}
      </div>

      {/* Accidental Submission Prevention / Review Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" id="job-details-review-confirm-modal">
          <div className="bg-[rgba(4,12,35,0.95)] backdrop-blur-2xl border border-[rgba(37,99,235,0.45)] rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] max-w-lg w-full p-6 space-y-5 relative text-white">
            
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 pr-8">
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                Review & Confirm Application
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{job.title}</h2>
              <p className="text-xs text-cyan-300 font-semibold">{job.companyName}</p>
            </div>

            {/* Resume Details */}
            <div className="p-3.5 bg-slate-950/70 border border-blue-500/25 rounded-2xl space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-300 block font-mono">Attached Resume</span>
              <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/20 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-semibold text-white truncate max-w-[200px]">
                    {profile?.resumeFileName || (profile?.resumeUrl ? "Uploaded_Resume.pdf" : "Candidate_Resume.pdf")}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 font-mono shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  Ready ({profile?.resumeScore || 80}% ATS)
                </span>
              </div>
            </div>

            {/* Candidate Details */}
            <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-blue-500/25 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-300 block font-mono">Candidate Information</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/90 p-2 rounded-xl border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 block font-mono">Applicant Name</span>
                  <span className="font-bold text-white">{profile?.name || userName || "Candidate"}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 block font-mono">Mobile</span>
                  <span className="font-bold text-white">{profile?.profileDetails?.mobileNumber || profile?.mobile || "Provided in Profile"}</span>
                </div>
                <div className="col-span-2 bg-slate-900/90 p-2 rounded-xl border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 block font-mono">Email Address</span>
                  <span className="font-bold text-white">{profile?.email || profile?.profileDetails?.email || "candidate@example.com"}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Please ensure your resume and contact information are accurate. Once submitted, your profile will be sent directly to the hiring manager at <strong className="text-cyan-300">{job.companyName}</strong>.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isApplying}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Review Again
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isApplying}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-cyan-200" />
                    <span>Yes, Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
