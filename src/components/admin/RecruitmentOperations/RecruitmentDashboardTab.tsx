import React from "react";
import { 
  Users, 
  Briefcase, 
  UserCheck, 
  FileSpreadsheet, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight,
  ShieldCheck,
  Send,
  Building2,
  Layers
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser, RecruiterAssignment } from "../../../types/recruitment";

interface RecruitmentDashboardTabProps {
  candidates: RecruitmentCandidate[];
  jobs: RecruitmentJob[];
  recruiters: RecruiterUser[];
  assignments: RecruiterAssignment[];
  onNavigateTab: (tab: string) => void;
  onOpenCreateJob: () => void;
  onRefresh: () => void;
}

export default function RecruitmentDashboardTab({
  candidates,
  jobs,
  recruiters,
  assignments,
  onNavigateTab,
  onOpenCreateJob,
  onRefresh
}: RecruitmentDashboardTabProps) {
  // Compute live calculations from real Firestore arrays
  const totalCandidates = candidates.length;
  const verifiedCandidates = candidates.filter((c) => c.emailVerified || c.verificationStatus === "verified").length;
  const withResumes = candidates.filter((c) => Boolean(c.resumeUrl)).length;
  
  const today = new Date().toDateString();
  const candidatesToday = candidates.filter((c) => c.createdAt && new Date(c.createdAt).toDateString() === today).length;

  const totalJobs = jobs.length;
  const publishedJobs = jobs.filter((j) => j.status === "Published" || j.status === "Live").length;
  const draftJobs = jobs.filter((j) => j.status === "Draft").length;
  const pausedOrClosedJobs = jobs.filter((j) => j.status === "Paused" || j.status === "Closed").length;
  const totalOpenings = jobs.reduce((sum, j) => sum + (j.openings || 1), 0);

  const activeRecruiters = recruiters.filter((r) => r.status !== "inactive").length;
  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter((a) => a.status === "Assigned" || a.status === "In-Progress" || a.status === "Screening").length;
  const completedPlacements = assignments.filter((a) => a.status === "Joined" || a.status === "Offered").length;

  // Source breakdown
  const sourceCounts: Record<string, number> = {};
  candidates.forEach((c) => {
    const s = c.source || "Email Registration";
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Operations Header Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full">
              LIVE OPERATIONS CONSOLE
            </span>
            <span className="flex items-center text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
              Real-time Firestore Sync
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            AIJobs Recruitment & Sourcing Engine
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Centralized talent database, automated sequential ID assignment (<span className="text-blue-400 font-mono">AIJ-JOB</span> & <span className="text-blue-400 font-mono">AIJ-CAN</span>), algorithmic match scoring, and recruiter dispatch operations.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenCreateJob}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>Post New Job</span>
          </button>
          <button
            onClick={() => onNavigateTab("excel_import")}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Excel Import</span>
          </button>
          <button
            onClick={() => onNavigateTab("recommendations")}
            className="px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-500/20 border border-indigo-400/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Match Candidates</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Candidate Stats */}
        <div 
          onClick={() => onNavigateTab("candidates")}
          className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl transition-all cursor-pointer shadow-lg group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Registered Candidates</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">{totalCandidates}</span>
            <span className="text-xs text-emerald-400 font-medium">+{candidatesToday} today</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Verified: <span className="text-emerald-400 font-semibold">{verifiedCandidates}</span></span>
            <span>Resumes: <span className="text-blue-400 font-semibold">{withResumes}</span></span>
          </div>
        </div>

        {/* Live Jobs Stats */}
        <div 
          onClick={() => onNavigateTab("jobs")}
          className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Job Vacancies</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">{publishedJobs}</span>
            <span className="text-xs text-slate-400 font-medium">/ {totalJobs} total</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Openings: <span className="text-emerald-400 font-semibold">{totalOpenings}</span></span>
            <span>Drafts: <span className="text-amber-400 font-semibold">{draftJobs}</span></span>
          </div>
        </div>

        {/* Recruiter Pool */}
        <div 
          onClick={() => onNavigateTab("recruiter_assignment")}
          className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Recruiters & Agencies</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">{activeRecruiters}</span>
            <span className="text-xs text-indigo-400 font-medium">Talent Partners</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Assigned: <span className="text-indigo-300 font-semibold">{activeAssignments}</span></span>
            <span>Placements: <span className="text-emerald-400 font-semibold">{completedPlacements}</span></span>
          </div>
        </div>

        {/* Excel Import Hub */}
        <div 
          onClick={() => onNavigateTab("excel_import")}
          className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Bulk Database Ingestion</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-white font-mono">XLSX / CSV</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pre-validation: <span className="text-emerald-400 font-semibold">Active</span></span>
            <span>Dedup Engine: <span className="text-blue-400 font-semibold">Auto</span></span>
          </div>
        </div>
      </div>

      {/* Middle Operations Split: Recent Candidates & Live Job Openings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Candidates */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Recently Registered Candidates</h3>
            </div>
            <button
              onClick={() => onNavigateTab("candidates")}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({candidates.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {candidates.slice(0, 5).map((cand) => (
              <div
                key={cand.id}
                onClick={() => onNavigateTab("candidates")}
                className="p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between transition-all cursor-pointer text-xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center justify-center font-bold font-mono shrink-0">
                    {cand.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white truncate">{cand.fullName}</span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/30 shrink-0">
                        {cand.candidateId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cand.targetRole || "Software Engineer"} • {cand.location || "India"}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 block">
                    {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                  </span>
                  <span className={`text-[10px] font-medium ${cand.assignedRecruiterName ? "text-indigo-400" : "text-slate-400"}`}>
                    {cand.assignedRecruiterName ? `Assigned: ${cand.assignedRecruiterName.split(" ")[0]}` : "Unassigned"}
                  </span>
                </div>
              </div>
            ))}

            {candidates.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">No candidate records found in Firestore database.</p>
            )}
          </div>
        </div>

        {/* Live Job Openings */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Active Job Requirements</h3>
            </div>
            <button
              onClick={() => onNavigateTab("jobs")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>Manage Jobs ({jobs.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                onClick={() => onNavigateTab("jobs")}
                className="p-3 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between transition-all cursor-pointer text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white truncate">{job.title}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30 shrink-0">
                      {job.jobId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {job.companyName} • {job.location} • {job.workMode}
                  </p>
                </div>

                <div className="text-right shrink-0 space-y-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {job.status}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {job.openings} Opening{job.openings > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-6">No jobs created yet. Click 'Post New Job' or import via Excel.</p>
            )}
          </div>
        </div>
      </div>

      {/* Candidate Registration Sources Distribution */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Candidate Sourcing Channel Breakdown</h3>
          </div>
          <span className="text-xs text-slate-500">Live Registration Distribution</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(sourceCounts).map(([sourceName, count]) => (
            <div key={sourceName} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-center">
              <span className="text-lg font-bold text-white font-mono">{count}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sourceName}</p>
            </div>
          ))}
          {Object.keys(sourceCounts).length === 0 && (
            <p className="text-xs text-slate-500 col-span-6 text-center py-2">No sourcing metrics available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
