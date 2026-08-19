import React, { useState } from "react";
import { 
  Briefcase, 
  PlusCircle, 
  MapPin, 
  IndianRupee, 
  Users, 
  Sparkles, 
  MoreVertical, 
  Play, 
  Pause, 
  XCircle, 
  ExternalLink, 
  Calendar, 
  Share2,
  CheckCircle2,
  Clock,
  Eye
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CompanyJob } from "./EmployerTypes";

interface EmployerMyJobsProps {
  jobs: CompanyJob[];
  onNavigateTab: (tabId: string) => void;
  onSelectJobForFilter: (jobId: string) => void;
  onUpdateJobStatus: (jobId: string, newStatus: string) => void;
}

export default function EmployerMyJobs({
  jobs,
  onNavigateTab,
  onSelectJobForFilter,
  onUpdateJobStatus
}: EmployerMyJobsProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredJobs = jobs.filter((job) => {
    if (filterStatus !== "all" && job.status?.toLowerCase() !== filterStatus.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title?.toLowerCase().includes(q);
      const matchLoc = job.location?.toLowerCase().includes(q);
      const matchDept = job.department?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchDept) return false;
    }
    return true;
  });

  const handleShareLink = (jobId: string) => {
    const url = `${window.location.origin}/jobs?jobId=${jobId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(jobId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6" id="employer-my-jobs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span>JOB OPENINGS REPOSITORY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Manage Posted Jobs</h2>
          <p className="text-xs text-slate-400">Track live job status, incoming candidate flow, and edit active job requirements</p>
        </div>

        <button
          onClick={() => onNavigateTab("post-job")}
          className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>Post a Job</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["all", "active", "draft", "paused", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filterStatus === st 
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {st === "all" ? "All Statuses" : st}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="w-full px-3.5 py-2 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#17111F]/80 border border-purple-500/20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No jobs found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You don't have any job postings matching the selected filter.
          </p>
          <button
            onClick={() => onNavigateTab("post-job")}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Post Your First Job Opening
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group"
            >
              {/* Job Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      job.status === "active" || job.status === "open"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : job.status === "draft"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : job.status === "paused"
                        ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                        : "bg-slate-700 text-slate-300"
                    }`}>
                      {job.status || "Active"}
                    </span>
                    <span className="text-[11px] text-slate-400">{job.department || "Engineering"}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                    {job.title}
                  </h3>
                </div>

                <button
                  onClick={() => handleShareLink(job.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer relative"
                  title="Share public job link"
                >
                  <Share2 className="w-4 h-4" />
                  {copiedId === job.id && (
                    <span className="absolute -top-7 right-0 px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold">
                      Copied!
                    </span>
                  )}
                </button>
              </div>

              {/* Job Metadata Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {job.location} ({job.workMode || "Hybrid"})
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold">{job.salary || "Competitive"}</span>
                <span>•</span>
                <span>{job.experience || "3+ Yrs"}</span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {(job.skillsRequired || ["React", "TypeScript"]).map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>

              {/* Footer Controls */}
              <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    onSelectJobForFilter(job.id);
                    onNavigateTab("applications");
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>View Applicants</span>
                </button>

                <div className="flex items-center gap-1">
                  {job.status === "active" ? (
                    <button
                      onClick={() => onUpdateJobStatus(job.id, "paused")}
                      className="px-2.5 py-1 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Pause Job"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateJobStatus(job.id, "active")}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      title="Activate Job"
                    >
                      <Play className="w-3 h-3" />
                      <span>Activate</span>
                    </button>
                  )}

                  <button
                    onClick={() => onUpdateJobStatus(job.id, "closed")}
                    className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition-all cursor-pointer"
                    title="Close Job"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
