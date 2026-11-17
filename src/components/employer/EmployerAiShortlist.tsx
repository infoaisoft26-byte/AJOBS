import React, { useState } from "react";
import { 
  Sparkles, 
  Star, 
  CheckCircle2, 
  UserCheck, 
  MessageSquare, 
  Download, 
  ArrowRight, 
  MapPin, 
  Calendar,
  Briefcase
} from "lucide-react";
import { CompanyApplication } from "./EmployerTypes";

interface EmployerAiShortlistProps {
  applications: CompanyApplication[];
  onOpenCandidateDrawer: (app: CompanyApplication) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function EmployerAiShortlist({
  applications,
  onOpenCandidateDrawer,
  onOpenLiveChat
}: EmployerAiShortlistProps) {
  // Show only real applications with a persisted numeric match evaluation.
  const recommendedCandidates = applications.filter(a => typeof a.aiMatchScore === "number" && a.aiMatchScore >= 85);

  return (
    <div className="space-y-6" id="employer-ai-shortlist-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI MATCH ACCELERATOR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">AI Shortlisted Candidate Recommendations</h2>
          <p className="text-xs text-slate-400">Only real applicants with a saved match evaluation of 85% or higher</p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
          {recommendedCandidates.length} Top Matches
        </span>
      </div>

      {/* Grid of AI matches */}
      {recommendedCandidates.length === 0 ? <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 text-sm text-slate-400">No real applicants have a saved AI match evaluation for the current assigned jobs yet.</div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recommendedCandidates.map((cand) => (
          <div
            key={cand.id}
            className="p-6 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-cyan-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                  {(cand.candidateName || "Candidate").charAt(0)}
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  {cand.aiMatchScore}% AI Match
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  {cand.candidateName || "Candidate"}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{cand.jobTitle}</p>
                <span className="text-[11px] text-blue-300 font-mono">{cand.candidateExperience || "3+ Yrs Exp"}</span>
              </div>

              {/* Match breakdown chips */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 text-[9px] uppercase font-mono block">Skills Match</span>
                  <span className="font-bold text-emerald-300">{typeof cand.matchBreakdown?.skillsMatch === "number" ? cand.matchBreakdown.skillsMatch + "%" : "Not evaluated"}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 text-[9px] uppercase font-mono block">Experience</span>
                  <span className="font-bold text-blue-300">{typeof cand.matchBreakdown?.experienceMatch === "number" ? cand.matchBreakdown.experienceMatch + "%" : "Not evaluated"}</span>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {(cand.candidateSkills || []).slice(0, 4).map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-purple-500/15 flex items-center gap-2">
              <button
                onClick={() => onOpenCandidateDrawer(cand as any)}
                className="flex-1 py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                View Profile
              </button>
              <button
                onClick={() => onOpenLiveChat && onOpenLiveChat(cand.candidateId, cand.candidateName || "Candidate")}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
