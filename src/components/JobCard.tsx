import React from "react";
import { 
  Heart, Share2, MapPin, DollarSign, Lock, AlertTriangle, CheckCircle, Briefcase, ExternalLink, Award, Sparkles 
} from "lucide-react";
import { JobPosting } from "../types";

interface JobCardProps {
  job: JobPosting;
  applied: boolean;
  isSaved: boolean;
  abacCheck?: { granted: boolean; reason?: string };
  isAiOnly?: boolean;
  onApply: (job: JobPosting) => void;
  onSave: (jobId: string, currentSavedState: boolean) => void;
  onShare: (job: JobPosting) => void;
  onCheckMatch?: (job: JobPosting) => void;
  onSelectDetails: (job: JobPosting) => void;
}

export default function JobCard({
  job,
  applied,
  isSaved,
  abacCheck = { granted: true },
  isAiOnly = false,
  onApply,
  onSave,
  onShare,
  onCheckMatch,
  onSelectDetails,
}: JobCardProps) {
  const companyLogo = (job as any).companyLogo;
  const jobSalary = job.salary || "Competitive";
  
  return (
    <div 
      className={`glass p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 hover:shadow-lg hover:shadow-indigo-500/5 duration-300 ${
        !abacCheck.granted 
          ? "border-red-500/10 bg-red-950/[0.02]" 
          : "border-white/5 hover:border-indigo-500/25"
      }`}
    >
      <div className="space-y-3 cursor-pointer group" onClick={() => onSelectDetails(job)}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex gap-3 items-start min-w-0">
            {/* Company Logo / Fallback Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt={job.companyName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const fb = document.createElement('span');
                      fb.className = "text-xs font-black text-indigo-400 font-mono";
                      fb.innerText = (job.companyName || "AI").charAt(0).toUpperCase();
                      parent.appendChild(fb);
                    }
                  }}
                />
              ) : (
                <span className="text-xs font-black text-indigo-400 font-mono uppercase">
                  {(job.companyName || "AI").charAt(0)}
                </span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase group-hover:text-indigo-300 transition-colors truncate">
                  {job.companyName}
                </span>
                {isAiOnly && (
                  <span className="bg-indigo-500/15 text-indigo-300 text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-indigo-500/10 shrink-0">
                    <CheckCircle className="w-2.5 h-2.5 text-indigo-400" />
                    <span>AI Verified</span>
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2 group-hover:text-indigo-400 transition-colors">
                {!abacCheck.granted && <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <span>{job.title}</span>
              </h4>
            </div>
          </div>

          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Save Button */}
            <button 
              onClick={() => onSave(job.id, isSaved)}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isSaved 
                  ? "bg-pink-500/10 text-pink-400 hover:bg-pink-500/20" 
                  : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              }`}
              title={isSaved ? "Saved" : "Save Job"}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
            </button>

            {/* Share Button */}
            <button 
              onClick={() => onShare(job)}
              className="p-1.5 rounded-lg transition-all cursor-pointer bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
              title="Share Job Opening"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{job.description}</p>
        
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-gray-400 pt-1">
          <span className="flex items-center gap-1">📍 {job.location || "Bengaluru"}</span>
          <span className={`flex items-center gap-1 ${!abacCheck.granted && jobSalary.includes("30L") ? "text-red-400 font-bold" : ""}`}>
            💰 {jobSalary}
          </span>
          <span className="flex items-center gap-1">🎓 {job.education || "Any Degree"}</span>
          {job.type && <span className="text-indigo-400">💼 {job.type}</span>}
          {job.workMode && <span className="text-purple-400">⚡ {job.workMode}</span>}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
          {job.skillsRequired?.map((sk, k) => (
            <span key={k} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5">{sk}</span>
          ))}
        </div>

        <p className="text-[9px] text-indigo-400/60 font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          ⚡ Click to view full job specifications & apply
        </p>

        {/* ABAC Restriction Warning Banner */}
        {!abacCheck.granted && (
          <div className="mt-3 p-2.5 bg-red-950/25 border border-red-500/15 rounded-xl text-[10px] text-red-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold uppercase tracking-wider font-mono text-[9px] text-red-400">ABAC Policy Restricted</p>
              <p className="leading-relaxed text-gray-300">{abacCheck.reason}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs" onClick={(e) => e.stopPropagation()}>
        {onCheckMatch && (
          <button
            onClick={() => onCheckMatch(job)}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-200 rounded-lg transition-all border border-white/5 cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span>AI Match</span>
          </button>
        )}
        
        {/* Easy Apply Button */}
        <button
          onClick={() => abacCheck.granted && onApply(job)}
          disabled={applied || !abacCheck.granted}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
            applied 
              ? "bg-green-500/25 text-green-400 border border-green-500/30 cursor-not-allowed" 
              : !abacCheck.granted
                ? "bg-red-950/20 text-red-500/40 border border-red-500/10 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
          }`}
        >
          {applied ? "Applied" : !abacCheck.granted ? "Access Restricted" : "Easy Apply"}
        </button>
      </div>
    </div>
  );
}
