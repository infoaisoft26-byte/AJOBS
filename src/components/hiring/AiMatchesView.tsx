import React, { useState } from "react";
import { 
  Sparkles, 
  Briefcase, 
  MapPin, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  UserCheck, 
  ArrowRight,
  TrendingUp,
  Award,
  ChevronDown
} from "lucide-react";
import { CompanyJob, CompanyApplication } from "../employer/EmployerTypes";

interface AiMatchesViewProps {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  onShortlistCandidate?: (candidateId: string) => void;
  onScheduleInterview?: (candidateId: string, candidateName: string, jobTitle: string) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function AiMatchesView({
  jobs,
  applications,
  onShortlistCandidate,
  onScheduleInterview,
  onOpenLiveChat
}: AiMatchesViewProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || "job_1");
  const [shortlistedMap, setShortlistedMap] = useState<Record<string, boolean>>({});

  const activeJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  // AI matched candidates based on skills & role requirements
  const matchedCandidates = [
    {
      id: "match_c1",
      name: "Rohan Mukherjee",
      role: "Lead Full Stack Architect",
      experience: "6.2 Years",
      location: "Bengaluru (Hybrid)",
      score: 97,
      fitReason: "Direct mastery in React, TypeScript, and AWS cloud architecture with 6+ years hands-on micro-frontend production scaling.",
      matchingSkills: ["React", "TypeScript", "Node.js", "AWS", "System Design"],
      expectedSalary: "₹28,00,000",
      noticePeriod: "15 Days"
    },
    {
      id: "match_c2",
      name: "Sneha Deshmukh",
      role: "Senior Frontend Engineer",
      experience: "4.5 Years",
      location: "Pune / Remote",
      score: 94,
      fitReason: "Outstanding design systems experience with React, Next.js, and Tailwind CSS. Top 5% performance benchmark score.",
      matchingSkills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      expectedSalary: "₹18,00,000",
      noticePeriod: "Immediate"
    },
    {
      id: "match_c3",
      name: "Aditya Verma",
      role: "Backend & Cloud Engineer",
      experience: "4.0 Years",
      location: "Hyderabad",
      score: 91,
      fitReason: "Strong distributed systems background with Node.js, PostgreSQL, and high-concurrency payment APIs.",
      matchingSkills: ["Node.js", "PostgreSQL", "Docker", "RESTful APIs"],
      expectedSalary: "₹17,00,000",
      noticePeriod: "30 Days"
    },
    {
      id: "match_c4",
      name: "Tanvi Saxena",
      role: "AI / ML Solutions Engineer",
      experience: "3.5 Years",
      location: "Delhi NCR",
      score: 95,
      fitReason: "Hands-on implementation of Google Gemini models, agentic workflows, and semantic RAG indexing.",
      matchingSkills: ["Python", "FastAPI", "Gemini API", "Vector Databases"],
      expectedSalary: "₹20,00,000",
      noticePeriod: "15 Days"
    }
  ];

  return (
    <div className="space-y-6" id="ai-matches-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>GEMINI INTELLIGENT MATCHING</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">AI Candidate Matches</h2>
          <p className="text-xs text-slate-400">Algorithmic talent recommendations evaluated against job criteria & competencies</p>
        </div>

        {/* Job Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Target Requisition:</span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-4 py-2.5 rounded-2xl bg-[#0e0a14] border border-cyan-500/40 text-xs font-bold text-white focus:outline-none focus:border-cyan-300 cursor-pointer shadow-lg"
          >
            {jobs.length === 0 ? (
              <option value="default_job">Senior React & TypeScript Engineer</option>
            ) : (
              jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.location})</option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Target Job Info Card */}
      {activeJob && (
        <div className="p-4 rounded-3xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono font-bold text-blue-300 uppercase">Evaluating Requirements for:</span>
            <div className="font-extrabold text-white text-sm">{activeJob.title}</div>
            <div className="text-slate-400">{activeJob.location} • {activeJob.experience || "3-5 Years"} • ₹{activeJob.salary || "Competitive"}</div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(activeJob.skillsRequired || ["React", "TypeScript", "Node.js"]).slice(0, 4).map(sk => (
              <span key={sk} className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 font-mono text-[10px] border border-blue-500/20">
                {sk}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Match Cards List */}
      <div className="space-y-4">
        {matchedCandidates.map((cand, idx) => {
          const isShortlisted = shortlistedMap[cand.id];

          return (
            <div 
              key={cand.id}
              className="p-5 rounded-3xl bg-[#17111F]/80 hover:bg-[#1a1426] border border-purple-500/20 hover:border-cyan-500/30 transition-all shadow-lg space-y-4"
            >
              {/* Top Row: Candidate info and Score */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white">{cand.name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950">
                      ★ #{idx + 1} RECOMMENDATION
                    </span>
                  </div>

                  <p className="text-xs font-bold text-cyan-300">{cand.role}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cand.location}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                      <span>{cand.experience}</span>
                    </span>
                    <span>•</span>
                    <span>Notice: <strong className="text-slate-200">{cand.noticePeriod}</strong></span>
                  </div>
                </div>

                {/* Score Pill */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center">
                    <div className="text-xl font-black text-cyan-300">{cand.score}%</div>
                    <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Fit Score</span>
                  </div>
                </div>
              </div>

              {/* AI Fit Explanation */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Why Gemini Ranked This Candidate</span>
                </span>
                <p className="text-slate-300 leading-relaxed">{cand.fitReason}</p>
              </div>

              {/* Matching Skills */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1.5">
                  Direct Skill Overlap
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cand.matchingSkills.map(sk => (
                    <span key={sk} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>{sk}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-purple-500/15 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShortlistedMap(prev => ({ ...prev, [cand.id]: true }));
                      if (onShortlistCandidate) onShortlistCandidate(cand.id);
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                      isShortlisted
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20"
                    }`}
                  >
                    {isShortlisted ? "✓ Shortlisted" : "Shortlist Candidate"}
                  </button>

                  <button
                    onClick={() => {
                      if (onScheduleInterview) {
                        onScheduleInterview(cand.id, cand.name, activeJob?.title || "Target Role");
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Schedule Interview</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (onOpenLiveChat) {
                      onOpenLiveChat(cand.id, cand.name);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
