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
  // Filter top matches (>=85% or top shortlisted)
  const aiMatches = applications.filter(a => (a.aiMatchScore || 85) >= 85 || a.status === "shortlisted");

  // Fallback high-compatibility recommendations
  const recommendedCandidates = aiMatches.length > 0 ? aiMatches : [
    {
      id: "ai_short_1",
      jobId: "job_1",
      jobTitle: "Senior React & TypeScript Engineer",
      candidateId: "cand_1",
      candidateName: "Aarav Sharma",
      candidateEmail: "aarav.sharma@example.com",
      candidateExperience: "4.5 Years",
      candidateSkills: ["React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS", "Redux"],
      status: "shortlisted",
      aiMatchScore: 96,
      appliedAt: new Date().toISOString(),
      matchBreakdown: {
        skillsMatch: 98,
        experienceMatch: 95,
        locationMatch: 94,
        cultureFit: 96
      }
    },
    {
      id: "ai_short_2",
      jobId: "job_2",
      jobTitle: "Full Stack Node.js Developer",
      candidateId: "cand_2",
      candidateName: "Pooja Patel",
      candidateEmail: "pooja.patel@example.com",
      candidateExperience: "3.2 Years",
      candidateSkills: ["Node.js", "PostgreSQL", "Express", "Docker", "Redis"],
      status: "new",
      aiMatchScore: 92,
      appliedAt: new Date().toISOString(),
      matchBreakdown: {
        skillsMatch: 92,
        experienceMatch: 90,
        locationMatch: 100,
        cultureFit: 88
      }
    },
    {
      id: "ai_short_3",
      jobId: "job_3",
      jobTitle: "AI Prompt & ML Engineer",
      candidateId: "cand_4",
      candidateName: "Ananya Iyer",
      candidateEmail: "ananya.iyer@example.com",
      candidateExperience: "2.8 Years",
      candidateSkills: ["Python", "PyTorch", "Gemini API", "FastAPI", "Vector DB"],
      status: "reviewed",
      aiMatchScore: 94,
      appliedAt: new Date().toISOString(),
      matchBreakdown: {
        skillsMatch: 96,
        experienceMatch: 91,
        locationMatch: 95,
        cultureFit: 94
      }
    }
  ];

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
          <p className="text-xs text-slate-400">High compatibility score profiles (85%–98%) evaluated across key technical parameters</p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
          {recommendedCandidates.length} Top Matches
        </span>
      </div>

      {/* Grid of AI matches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recommendedCandidates.map((cand) => (
          <div
            key={cand.id}
            className="p-6 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-cyan-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                  {cand.candidateName.charAt(0)}
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  {cand.aiMatchScore}% AI Match
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                  {cand.candidateName}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{cand.jobTitle}</p>
                <span className="text-[11px] text-blue-300 font-mono">{cand.candidateExperience || "3+ Yrs Exp"}</span>
              </div>

              {/* Match breakdown chips */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 text-[9px] uppercase font-mono block">Skills Match</span>
                  <span className="font-bold text-emerald-300">{cand.matchBreakdown?.skillsMatch || 95}%</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-slate-400 text-[9px] uppercase font-mono block">Experience</span>
                  <span className="font-bold text-blue-300">{cand.matchBreakdown?.experienceMatch || 92}%</span>
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
                onClick={() => onOpenLiveChat && onOpenLiveChat(cand.candidateId, cand.candidateName)}
                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all cursor-pointer"
                title="Message"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
