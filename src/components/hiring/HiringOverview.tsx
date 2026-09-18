import React, { useState } from "react";
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Calendar, 
  Sparkles, 
  PlusCircle, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Eye,
  MoreVertical,
  Globe,
  Share2,
  Copy,
  Trash2,
  Edit3,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Building2,
  Check
} from "lucide-react";
import { CompanyJob, CompanyApplication, CompanyInterview, CompanyProfile } from "../employer/EmployerTypes";
import { CreditBalance } from "./HiringTypes";

interface HiringOverviewProps {
  userName: string;
  companyName: string;
  userRole?: string;
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  credits: CreditBalance;
  companyProfile: CompanyProfile | null;
  onNavigateTab: (tabId: string) => void;
  onOpenPostJobMenu: () => void;
  onSelectJobForFilter: (jobId: string) => void;
  onViewCandidate: (application: CompanyApplication) => void;
  onUpdateJobStatus: (jobId: string, newStatus: string) => void;
  onDeleteJob?: (jobId: string) => void;
  onDuplicateJob?: (job: CompanyJob) => void;
}

export default function HiringOverview({
  userName,
  companyName,
  userRole = "employer",
  jobs,
  applications,
  interviews,
  credits,
  companyProfile,
  onNavigateTab,
  onOpenPostJobMenu,
  onSelectJobForFilter,
  onViewCandidate,
  onUpdateJobStatus,
  onDeleteJob,
  onDuplicateJob
}: HiringOverviewProps) {
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [openActionMenuJobId, setOpenActionMenuJobId] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);

  // 1. Compute Pending Actions
  const pendingActions: { id: string; title: string; desc: string; type: "warning" | "info" | "action"; actionLabel: string; tab: string }[] = [];

  const pendingApprovalJobs = jobs.filter(j => j.status === "pending_approval" || j.status === "pending_review" || (!j.approved && j.status !== "draft" && j.status !== "closed"));
  if (pendingApprovalJobs.length > 0) {
    pendingActions.push({
      id: "pending_approval",
      title: `${pendingApprovalJobs.length} Job${pendingApprovalJobs.length > 1 ? "s" : ""} Awaiting Admin Approval`,
      desc: "Admin verification is active before publishing to Google Jobs index and public board.",
      type: "info",
      actionLabel: "Review Jobs",
      tab: "my-jobs"
    });
  }

  const draftJobs = jobs.filter(j => j.status === "draft");
  if (draftJobs.length > 0) {
    pendingActions.push({
      id: "incomplete_drafts",
      title: `${draftJobs.length} Incomplete Job Draft${draftJobs.length > 1 ? "s" : ""}`,
      desc: "Finish setting compensation & requirements to submit for instant publishing.",
      type: "action",
      actionLabel: "Resume Drafts",
      tab: "my-jobs"
    });
  }

  const newApplications = applications.filter(a => a.status === "new");
  if (newApplications.length > 0) {
    pendingActions.push({
      id: "pending_apps",
      title: `${newApplications.length} New Application${newApplications.length > 1 ? "s" : ""} Awaiting Review`,
      desc: "Candidates are waiting for initial screening feedback.",
      type: "warning",
      actionLabel: "Review Applicants",
      tab: "applications"
    });
  }

  const pendingInterviews = interviews.filter(i => i.status === "scheduled");
  if (pendingInterviews.length > 0) {
    pendingActions.push({
      id: "pending_interviews",
      title: `${pendingInterviews.length} Scheduled Interview${pendingInterviews.length > 1 ? "s" : ""}`,
      desc: "Prepare interview links and assessment feedback cards.",
      type: "info",
      actionLabel: "View Calendar",
      tab: "interviews"
    });
  }

  if (credits.jobCredits <= 1) {
    pendingActions.push({
      id: "low_job_credits",
      title: "Low Job Posting Credits",
      desc: `You have ${credits.jobCredits} job posting credit remaining. Add credits to avoid posting pauses.`,
      type: "warning",
      actionLabel: "Add Credits",
      tab: "billing"
    });
  }

  if (companyProfile && (!companyProfile.gstNumber || !companyProfile.officeAddress)) {
    pendingActions.push({
      id: "profile_incomplete",
      title: "Company Profile Incomplete",
      desc: "Provide GST number and verified office address for faster 1-hour job verification.",
      type: "action",
      actionLabel: "Complete Profile",
      tab: "company-profile"
    });
  }

  // 2. Compute Real Quick Stats
  const totalJobsCount = jobs.length;
  const activeJobsCount = jobs.filter(j => j.status === "active" || j.status === "open").length;
  const pendingJobsCount = pendingApprovalJobs.length;
  const publishedJobsCount = jobs.filter(j => j.approved || j.status === "active" || j.status === "published").length;
  const totalApplicationsCount = applications.length;
  const shortlistedCount = applications.filter(a => a.status === "shortlisted" || a.status === "interview").length;
  const interviewsCount = interviews.length;
  const jobCreditsCount = credits.jobCredits;
  const databaseCreditsCount = credits.databaseCredits;

  // 3. Filtered All Jobs List
  const filteredJobs = jobs.filter((j) => {
    if (jobStatusFilter !== "all") {
      if (jobStatusFilter === "pending" && !(j.status === "pending_approval" || j.status === "pending_review")) return false;
      if (jobStatusFilter === "approved" && !j.approved && j.status !== "active") return false;
      if (jobStatusFilter !== "pending" && jobStatusFilter !== "approved" && j.status?.toLowerCase() !== jobStatusFilter) return false;
    }
    if (jobSearch.trim()) {
      const q = jobSearch.toLowerCase();
      const matchTitle = j.title?.toLowerCase().includes(q);
      const matchLoc = j.location?.toLowerCase().includes(q);
      const matchId = j.id?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchId) return false;
    }
    return true;
  });

  const handleShareJob = (jobId: string) => {
    const url = `${window.location.origin}/jobs?jobId=${jobId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedJobId(jobId);
      setTimeout(() => setCopiedJobId(null), 2000);
    }
  };

  return (
    <div className="space-y-6" id="hiring-overview-dashboard">
      
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#17111F] via-[#1a1426] to-[#120d1c] border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {userRole === "recruiter" ? "RECRUITER WORKSPACE" : "ENTERPRISE HIRING PANEL"}
            </span>
            {companyProfile?.isVerified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Entity</span>
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Welcome back, {userName}
          </h2>
          <p className="text-xs text-slate-400">
            Real-time candidate pipeline, job indexing status, and AI sourcing analytics for {companyName}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateTab("candidate-search")}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Search Database</span>
          </button>
          
          <button
            id="overview-post-job-cta"
            onClick={onOpenPostJobMenu}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>+ Post a New Job</span>
          </button>
        </div>
      </div>

      {/* Pending Actions Section */}
      <div className="p-5 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white">Pending Actions</h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {pendingActions.length === 0 ? "0 pending" : `${pendingActions.length} item${pendingActions.length > 1 ? "s" : ""} require attention`}
          </span>
        </div>

        {pendingActions.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center justify-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-1" />
            <span className="text-sm font-extrabold text-white">You're all caught up.</span>
            <p className="text-xs text-slate-400">
              No pending approvals, overdue candidate reviews, or critical alerts across your hiring pipeline.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingActions.map((act) => (
              <div 
                key={act.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  act.type === "warning"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    : act.type === "info"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-200"
                    : "bg-purple-500/10 border-purple-500/30 text-purple-200"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span>{act.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1">{act.desc}</p>
                </div>
                <button
                  onClick={() => onNavigateTab(act.tab)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-extrabold text-[11px] shrink-0 transition-all cursor-pointer"
                >
                  {act.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Total Jobs */}
        <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase">Total Jobs</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalJobsCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Open requisition pool</div>
        </div>

        {/* Active Jobs */}
        <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase">Active Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{activeJobsCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Accepting applications</div>
        </div>

        {/* Pending Approval */}
        <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{pendingJobsCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Admin review stage</div>
        </div>

        {/* Applications */}
        <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase">Applications</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalApplicationsCount}</div>
          <div className="text-[10px] text-cyan-400 font-mono mt-1">{shortlistedCount} Shortlisted</div>
        </div>

        {/* Interviews */}
        <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase">Interviews</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{interviewsCount}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Rounds scheduled</div>
        </div>

      </div>

      {/* Credit Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-950/30 to-[#17111F] border border-blue-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-blue-300 uppercase block">Job Posting Credits</span>
            <div className="text-xl font-black text-white flex items-center gap-2">
              <span>{jobCreditsCount} Remaining</span>
              <span className="text-xs text-slate-400 font-normal">({credits.jobCreditsUsed} used)</span>
            </div>
            <p className="text-[11px] text-slate-400">Valid until {credits.validityDate}</p>
          </div>
          <button
            onClick={() => onNavigateTab("billing")}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs cursor-pointer"
          >
            Buy Credits
          </button>
        </div>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-950/30 to-[#17111F] border border-cyan-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase block">Database Unlock Credits</span>
            <div className="text-xl font-black text-white flex items-center gap-2">
              <span>{databaseCreditsCount} Unlocks</span>
              <span className="text-xs text-slate-400 font-normal">({credits.databaseCreditsUsed} unlocked)</span>
            </div>
            <p className="text-[11px] text-slate-400">Direct phone & resume access</p>
          </div>
          <button
            onClick={() => onNavigateTab("billing")}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs cursor-pointer"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* ALL JOBS Section */}
      <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>All Jobs Management</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                {jobs.length} Total
              </span>
            </h3>
            <p className="text-xs text-slate-400">Monitor approval status, indexing, and applicant flow per position</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                placeholder="Search jobs..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {["all", "active", "pending", "approved", "draft", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setJobStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    jobStatusFilter === st
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {filteredJobs.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">No jobs found</h4>
            <p className="text-xs text-slate-400">Try changing your search terms or post your next opening.</p>
            <button
              onClick={onOpenPostJobMenu}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              + Post a New Job
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const jobApps = applications.filter(a => a.jobId === job.id);
              const pendingApps = jobApps.filter(a => a.status === "new");
              const shortlistedApps = jobApps.filter(a => a.status === "shortlisted");
              const jobInterviews = interviews.filter(i => i.jobId === job.id);

              const isApproved = job.approved || job.status === "active" || job.status === "published";
              const isPending = job.status === "pending_approval" || job.status === "pending_review";
              const isDraft = job.status === "draft";
              const isClosed = job.status === "closed";

              return (
                <div 
                  key={job.id}
                  className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-purple-500/30 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white hover:text-cyan-400 cursor-pointer" onClick={() => onSelectJobForFilter(job.id)}>
                          {job.title}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isApproved
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : isPending
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : isDraft
                            ? "bg-slate-500/15 text-slate-300 border border-slate-500/30"
                            : isClosed
                            ? "bg-red-500/15 text-red-300 border border-red-500/30"
                            : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                        }`}>
                          {isPending ? "Pending Approval" : job.status || "Active"}
                        </span>

                        {/* Google Jobs Indexing Status */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          <Globe className="w-3 h-3" />
                          <span>{isApproved ? "Google Jobs: Indexed" : "Google Jobs: Pending Approval"}</span>
                        </span>

                        {/* Visibility */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400">
                          {isApproved ? "Public Live" : "Private Draft"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>{job.location}</span>
                        <span>•</span>
                        <span>{job.experience || "3-5 Yrs"}</span>
                        <span>•</span>
                        <span>₹{job.salary || "Competitive"}</span>
                        <span>•</span>
                        <span>Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "Recent"}</span>
                      </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] text-slate-400 font-mono block">Apps</span>
                        <span className="text-xs font-black text-white">{jobApps.length}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] text-amber-400 font-mono block">Pending</span>
                        <span className="text-xs font-black text-amber-300">{pendingApps.length}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] text-cyan-400 font-mono block">Shortlisted</span>
                        <span className="text-xs font-black text-cyan-300">{shortlistedApps.length}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white/5 text-center">
                        <span className="text-[10px] text-purple-400 font-mono block">Interviews</span>
                        <span className="text-xs font-black text-purple-300">{jobInterviews.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectJobForFilter(job.id);
                          onNavigateTab("applications");
                        }}
                        className="px-3 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold border border-blue-500/30 cursor-pointer"
                      >
                        View Applications ({jobApps.length})
                      </button>

                      <button
                        onClick={() => handleShareJob(job.id)}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedJobId === job.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {onDuplicateJob && (
                        <button
                          onClick={() => onDuplicateJob(job)}
                          className="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                          title="Duplicate Job"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isClosed ? (
                        <button
                          onClick={() => onUpdateJobStatus(job.id, "active")}
                          className="px-2.5 py-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 font-bold cursor-pointer"
                        >
                          Repost Job
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateJobStatus(job.id, "closed")}
                          className="px-2.5 py-1 rounded-lg text-amber-400 hover:bg-amber-500/10 font-bold cursor-pointer"
                        >
                          Close Job
                        </button>
                      )}

                      {onDeleteJob && (
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this job requisition?")) {
                              onDeleteJob(job.id);
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                          title="Delete Job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
