import React, { useState } from "react";
import { MapPin, Briefcase, Calendar, Heart, Eye, CheckCircle2, ShieldCheck, Sparkles, ChevronRight, X, Info } from "lucide-react";
import { JobPosting } from "../types";
import { calculateJobMatchScore, JobMatchResult } from "../services/jobMatchEngine";

interface JobCardProps {
  job: JobPosting;
  applied: boolean;
  isSaved: boolean;
  onApply: (job: JobPosting) => void;
  onSave: (jobId: string, currentSavedState: boolean) => void;
  onSelectDetails: (job: JobPosting) => void;
  profile?: any;
}

export default function JobCard({
  job,
  applied,
  isSaved,
  onApply,
  onSave,
  onSelectDetails,
  profile
}: JobCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const salaryDisplay = job.salary ? `₹${job.salary}` : "Not disclosed";
  const experienceDisplay = job.experience ? `${job.experience} yrs` : "0-2 yrs";
  const workTypeDisplay = job.workMode || job.type || "Full Time";
  const postedDate = job.createdAt 
    ? new Date(job.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : "Recently";

  // Calculate AI match score if profile exists
  const matchResult: JobMatchResult | null = profile ? calculateJobMatchScore(job, profile) : null;

  return (
    <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[18px] p-5 rounded-2xl border border-[rgba(37,99,235,0.35)] hover:border-cyan-400/70 hover:shadow-[0_12px_40px_rgba(0,140,255,0.25)] transition-all duration-300 flex flex-col justify-between space-y-4 relative group">
      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-cyan-400 block tracking-wide">{job.companyName}</span>
              {matchResult && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBreakdown(true);
                  }}
                  className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full border border-cyan-400/50 bg-cyan-500/15 text-cyan-300 flex items-center space-x-1 cursor-pointer transition-transform hover:scale-105 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                  title="Click to see AI Match score breakdown"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
                  <span>{matchResult.totalScore}% Match</span>
                </button>
              )}
            </div>
            <h3 
              onClick={() => onSelectDetails(job)}
              className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors cursor-pointer line-clamp-1 mt-1 tracking-tight"
            >
              {job.title}
            </h3>
          </div>

          <button 
            onClick={() => onSave(job.id, isSaved)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSaved 
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.3)]" 
                : "bg-slate-900/80 border-blue-500/30 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/50"
            }`}
            title={isSaved ? "Saved" : "Save Job"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_#00E5FF]" : ""}`} />
          </button>
        </div>

        {/* Quick Details Chips */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
          <span className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
            <span>{job.location || "Remote"}</span>
          </span>
          <span className="flex items-center space-x-1 font-mono font-medium text-white">
            <span>💰 {salaryDisplay}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Briefcase className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
            <span>{experienceDisplay}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-cyan-300 text-[11px] font-semibold">
            {workTypeDisplay}
          </span>
          <span className="flex items-center space-x-1 text-slate-400 text-[11px] font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>{postedDate}</span>
          </span>
        </div>

        {/* Description snippet */}
        {job.description && (
          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal">
            {job.description}
          </p>
        )}

        {/* Skills Required */}
        {job.skillsRequired && job.skillsRequired.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.skillsRequired.slice(0, 5).map((sk, k) => (
              <span 
                key={k} 
                className="px-2.5 py-0.5 bg-slate-900/90 text-cyan-200 text-xs rounded-md font-medium border border-blue-500/25"
              >
                {sk}
              </span>
            ))}
            {job.skillsRequired.length > 5 && (
              <span className="text-xs text-slate-400 self-center font-mono">
                +{job.skillsRequired.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="pt-3 border-t border-blue-500/20 flex items-center justify-between gap-3">
        <button
          onClick={() => onSelectDetails(job)}
          className="flex-1 py-2 px-3 bg-slate-900/80 hover:bg-slate-800 border border-blue-500/30 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>View Details</span>
        </button>

        {applied ? (
          <span className="flex-1 py-2 px-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold text-center flex items-center justify-center space-x-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Applied</span>
          </span>
        ) : (
          <button
            onClick={() => onApply(job)}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition-all text-center cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]"
          >
            Apply Now
          </button>
        )}
      </div>

      {/* AI Match Breakdown Modal */}
      {showBreakdown && matchResult && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#040d28] rounded-2xl max-w-md w-full p-6 shadow-[0_16px_50px_rgba(0,0,0,0.9)] border border-cyan-500/40 space-y-4 relative animate-in fade-in zoom-in duration-150 text-slate-100">
            <div className="flex items-center justify-between border-b border-blue-500/25 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <h3 className="text-base font-bold text-white tracking-wide">AI Match Neural Breakdown</h3>
              </div>
              <button
                onClick={() => setShowBreakdown(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-3 bg-slate-950/80 rounded-xl border border-blue-500/30">
              <span className="text-3xl font-black font-mono text-cyan-300 drop-shadow-[0_0_12px_#00E5FF]">{matchResult.totalScore}%</span>
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono mt-0.5">{matchResult.matchLevel}</p>
            </div>

            {/* Score Breakdown Bars */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-200 tracking-wide font-mono uppercase text-[11px]">Scoring Model Breakdown</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Skills Alignment (35%)</span>
                    <span className="font-mono font-bold text-cyan-300">{matchResult.breakdown.skillsScore} / 35</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-blue-500/20">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full" style={{ width: `${(matchResult.breakdown.skillsScore / 35) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Role & Title Fit (20%)</span>
                    <span className="font-mono font-bold text-cyan-300">{matchResult.breakdown.titleScore} / 20</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-blue-500/20">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${(matchResult.breakdown.titleScore / 20) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Experience Level (15%)</span>
                    <span className="font-mono font-bold text-purple-300">{matchResult.breakdown.experienceScore} / 15</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-blue-500/20">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${(matchResult.breakdown.experienceScore / 15) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Location & Mode (10%)</span>
                    <span className="font-mono font-bold text-emerald-300">{matchResult.breakdown.locationScore} / 10</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-blue-500/20">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style={{ width: `${(matchResult.breakdown.locationScore / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Reasons list */}
            {matchResult.reasons.length > 0 && (
              <div className="pt-2 space-y-1.5">
                <h4 className="font-bold text-xs text-slate-200 uppercase font-mono tracking-wider">Key Insights</h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {matchResult.reasons.map((r, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-cyan-400 font-bold">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setShowBreakdown(false)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]"
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

