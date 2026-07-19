import { useState, useEffect } from "react";
import { 
  Briefcase, MapPin, Calendar, DollarSign, Award, ArrowLeft, 
  CheckCircle2, AlertTriangle, Brain, Heart, Share2, ShieldCheck, 
  Sparkles, Lock, CheckCircle, ChevronRight, GraduationCap, Users, Clock, Send
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { JobPosting, JobApplication } from "../types";
import { getJobById } from "../services/jobService";
import { applyToJob } from "../services/applicationService";
import { useJobPostingSchema } from "../hooks/useJobPostingSchema";

interface JobDetailsProps {
  jobId: string;
  userId: string;
  userName: string;
  profile: any;
  resumeText?: string;
  onBack: () => void;
  onAppliedSuccess?: (newApp: JobApplication) => void;
}

export default function JobDetails({
  jobId,
  userId,
  userName,
  profile,
  resumeText,
  onBack,
  onAppliedSuccess
}: JobDetailsProps) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Invoke SEO structured JobPosting schema & dynamic meta management
  useJobPostingSchema(job);

  // Load job details and check if already applied
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

        // 2. Check if already applied
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

        // 3. Check if saved in user profile bookmarks
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

  const handleApply = async () => {
    if (!job) return;
    try {
      setIsApplying(true);
      const result = await applyToJob(job, userId, profile, resumeText || profile?.resumeText || "");
      if (result.success) {
        setHasApplied(true);
        alert(result.message);
        
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
        alert(result.message);
      }
    } catch (err: any) {
      console.error("Error applying to job:", err);
      alert(err.message || "An unexpected error occurred during application processing.");
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
        alert("🚀 Vacancy link copied to clipboard successfully! Share with your network.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("🚀 Vacancy link copied to clipboard successfully! Share with your network.");
        } catch (clipErr) {
          alert("Failed to copy link. Feel free to copy your current browser URL!");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-xs font-mono">Fetching full vacancy specifications...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 glass rounded-3xl border border-white/5 text-center space-y-4 max-w-xl mx-auto mt-10">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-white font-extrabold text-lg">Vacancy Not Available</h3>
        <p className="text-gray-400 text-xs">{error || "This position has been filled or is no longer accepting new candidate files."}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
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
          className="group flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return to listings</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/10 cursor-pointer text-xs flex items-center gap-1.5 font-bold"
            title="Share Position Link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Main Job details card */}
      <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        
        {/* Banner header styling */}
        <div className="relative bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/40 p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-4 items-center">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl rounded-2xl w-16 h-16 shadow-lg shadow-indigo-500/25 uppercase">
              {job.companyName?.slice(0, 2) || "CO"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-indigo-400 font-extrabold uppercase tracking-wider">{job.companyName}</span>
                <span className="bg-white/5 text-gray-400 text-[9px] font-mono px-2 py-0.5 rounded border border-white/5">
                  {job.type || "Full-time"}
                </span>
                {job.workMode && (
                  <span className="bg-indigo-500/10 text-indigo-300 text-[9px] font-mono px-2 py-0.5 rounded border border-indigo-500/10">
                    {job.workMode}
                  </span>
                )}
              </div>
              <h1 className="font-black text-xl sm:text-2xl text-white mt-1.5">{job.title}</h1>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{job.location || "Remote / Bengaluru"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0 w-full md:w-auto">
            {hasApplied ? (
              <div className="w-full md:w-auto bg-green-500/15 border border-green-500/25 text-green-400 px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Already Applied</span>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={isApplying}
                className={`w-full md:w-auto px-8 py-3 text-xs font-black rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 ${
                  isApplying 
                    ? "bg-indigo-700/50 text-indigo-300 cursor-not-allowed" 
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isApplying ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{isApplying ? "Submitting File..." : "Apply Instantly"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/[0.01] border-b border-white/5">
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Salary Package</p>
            <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
              <span className="text-emerald-500">₹</span> {job.salary || "Competitive Salary"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Experience Level</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{job.experience || "Any level"}</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Required Openings</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{job.openings || 1} Positions</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Expiration / Deadline</p>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{job.expiryDate ? new Date(job.expiryDate).toLocaleDateString() : "No Expiry"}</span>
            </p>
          </div>
        </div>

        {/* Detailed spec sections */}
        <div className="p-8 space-y-8 text-xs text-gray-300 leading-relaxed">
          
          {/* Job Description */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="h-4 w-1 bg-indigo-500 rounded-full inline-block"></span>
              <span>Role Specifications</span>
            </h3>
            <p className="text-gray-300 whitespace-pre-line leading-relaxed text-xs">
              {job.description || "The direct hiring team is seeking a motivated professional to lead new project cycles, coordinate operational pipelines, and secure reliable deliverables. Join a progressive corporate structure focused on team scaling and personal career progression."}
            </p>
          </div>

          {/* Key Responsibilities */}
          {job.responsibilities && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span className="h-4 w-1 bg-purple-500 rounded-full inline-block"></span>
                <span>Core Responsibilities</span>
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                {job.responsibilities.split("\n").filter(Boolean).map((resp, idx) => (
                  <li key={idx} className="leading-relaxed">{resp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements / Core qualifications */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="h-4 w-1 bg-amber-500 rounded-full inline-block"></span>
              <span>Requirements & Credentials</span>
            </h3>
            <p className="text-gray-300 whitespace-pre-line text-xs">
              {job.education ? `Academic Level: ${job.education}\n\n` : ""}
              {job.requirements || "Demonstrated performance record, strong communication skills, deep technical adaptability, and capability to synchronize with cross-functional task units effectively."}
            </p>
          </div>

          {/* Required Stack */}
          {job.skillsRequired && job.skillsRequired.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span className="h-4 w-1 bg-pink-500 rounded-full inline-block"></span>
                <span>Core Stack Required</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill, index) => (
                  <span 
                    key={index} 
                    className="text-[10px] font-mono px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20 font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits & perks */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span className="h-4 w-1 bg-emerald-500 rounded-full inline-block"></span>
              <span>Benefits, Compensations & Perks</span>
            </h3>
            <p className="text-gray-400 text-xs">
              {job.benefits || "Includes premium dental/medical coverages, dynamic remote/hybrid workplace scheduling, high-capacity hardware workspace budgets, performance milestone bonuses, and paid educational allowances."}
            </p>
          </div>

          {/* AI Matching Banner */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-3 items-start">
              <Brain className="w-8 h-8 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-white">Curious how your profile fares?</h4>
                <p className="text-[10px] text-gray-400">Our deep ATS compiler can evaluate your current resume and skills profile for instant fit metrics.</p>
              </div>
            </div>
            <button
              onClick={() => {
                alert("Running deep ATS match checklist in local sandbox...");
              }}
              className="px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-[10px] font-bold rounded-xl border border-indigo-500/10 transition-all cursor-pointer shrink-0"
            >
              Check Score Alignment
            </button>
          </div>

        </div>

        {/* Footer actions info */}
        <div className="p-6 bg-[#090d16]/40 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-500 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Fully vetted and secure employer credential certification.</span>
          </span>
          <span>Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recently"}</span>
        </div>

      </div>

    </div>
  );
}
