import React, { useState } from "react";
import { 
  Briefcase, 
  MapPin, 
  IndianRupee, 
  Users, 
  Sparkles, 
  Clock, 
  Building2, 
  CheckCircle2, 
  Calendar,
  ArrowRight
} from "lucide-react";
import { RecruiterJob } from "./RecruiterTypes";

interface RecruiterAssignedJobsProps {
  jobs: RecruiterJob[];
  onSelectJobForPipeline: (jobId: string) => void;
}

export default function RecruiterAssignedJobs({
  jobs,
  onSelectJobForPipeline
}: RecruiterAssignedJobsProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredJobs = jobs.filter((j) => {
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.companyName.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6" id="recruiter-assigned-jobs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            <span>ASSIGNED MANDATE PORTFOLIO</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Assigned Hiring Positions</h2>
          <p className="text-xs text-slate-400">Exclusive recruitment mandates assigned by client companies and partner enterprises</p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
          {filteredJobs.length} Active Positions
        </span>
      </div>

      {/* Grid of Assigned Jobs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="p-6 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-blue-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {job.status}
                    </span>
                    <span className="text-xs text-slate-400">{job.companyName}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {job.title}
                  </h3>
                </div>

                {job.payoutPerHire && (
                  <div className="px-3 py-1 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold shrink-0">
                    {job.payoutPerHire} / Hire
                  </div>
                )}
              </div>

              {/* Meta Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {job.location}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold">{job.salary}</span>
                <span>•</span>
                <span className="text-blue-300 font-bold">{job.openings} Open Positions</span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {(job.skillsRequired || ["React", "TypeScript", "Node.js"]).map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Assigned {job.assignedAt || "Recently"}
              </span>

              <button
                onClick={() => onSelectJobForPipeline(job.id)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <span>Sourced Candidates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
