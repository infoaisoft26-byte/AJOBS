import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Briefcase, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  Building, 
  MapPin, 
  GraduationCap, 
  Clock, 
  DollarSign, 
  ChevronRight,
  TrendingUp,
  Percent
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser, CandidateMatchResult } from "../../../types/recruitment";
import { rankCandidatesForJob, calculateCandidateJobMatch } from "../../../services/recruitmentService";

interface CandidateRecommendationsTabProps {
  candidates?: RecruitmentCandidate[];
  jobs?: RecruitmentJob[];
  recruiters?: RecruiterUser[];
  initialSelectedJob?: RecruitmentJob | null;
  initialSelectedCandidate?: RecruitmentCandidate | null;
  onOpenCandidateProfile: (candidate: RecruitmentCandidate) => void;
  onOpenAssignModal: (candidate: RecruitmentCandidate, job?: RecruitmentJob | null) => void;
}

export default function CandidateRecommendationsTab({
  candidates = [],
  jobs = [],
  recruiters = [],
  initialSelectedJob,
  initialSelectedCandidate,
  onOpenCandidateProfile,
  onOpenAssignModal
}: CandidateRecommendationsTabProps) {
  const safeCandidates = Array.isArray(candidates) ? candidates : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeRecruiters = Array.isArray(recruiters) ? recruiters : [];

  const [matchMode, setMatchMode] = useState<"JOB_TO_CANDIDATES" | "CANDIDATE_TO_JOBS">(
    initialSelectedCandidate ? "CANDIDATE_TO_JOBS" : "JOB_TO_CANDIDATES"
  );

  const [selectedJobId, setSelectedJobId] = useState<string>(
    initialSelectedJob?.id || safeJobs[0]?.id || ""
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialSelectedCandidate?.id || safeCandidates[0]?.id || ""
  );

  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(40);

  const activeJob = safeJobs.find((j) => j.id === selectedJobId) || safeJobs[0] || null;
  const activeCandidate = safeCandidates.find((c) => c.id === selectedCandidateId) || safeCandidates[0] || null;

  // Job -> Ranked Candidates
  const jobMatches: CandidateMatchResult[] = useMemo(() => {
    if (!activeJob || safeCandidates.length === 0) return [];
    return rankCandidatesForJob(activeJob, safeCandidates, minScoreThreshold);
  }, [activeJob, safeCandidates, minScoreThreshold]);

  // Candidate -> Ranked Jobs
  const candidateMatches: CandidateMatchResult[] = useMemo(() => {
    if (!activeCandidate || safeJobs.length === 0) return [];
    return safeJobs
      .map((j) => calculateCandidateJobMatch(activeCandidate, j))
      .filter((res) => res.overallScore >= minScoreThreshold)
      .sort((a, b) => b.overallScore - a.overallScore);
  }, [activeCandidate, safeJobs, minScoreThreshold]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                RECOMMENDATION & MATCHING ENGINE
              </span>
              <span className="text-xs text-slate-400">Explainable Algorithmic Fit</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Talent Alignment & Job Recommendation Console
            </h2>
            <p className="text-xs text-slate-400">
              Evaluates multi-dimensional suitability across Skills (35%), Experience (20%), Role Alignment (15%), Location (10%), and Qualifications (10%).
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 text-xs">
            <button
              onClick={() => setMatchMode("JOB_TO_CANDIDATES")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                matchMode === "JOB_TO_CANDIDATES"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Match Job → Candidates
            </button>
            <button
              onClick={() => setMatchMode("CANDIDATE_TO_JOBS")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                matchMode === "CANDIDATE_TO_JOBS"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Match Candidate → Jobs
            </button>
          </div>
        </div>

        {/* Target Entity Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          {matchMode === "JOB_TO_CANDIDATES" ? (
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-300">Select Job Vacancy to Match Against:</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {safeJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    [{j.jobId}] {j.title} at {j.companyName} ({j.location}) — Status: {j.status}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-2 space-y-1">
              <label className="font-semibold text-slate-300">Select Candidate to Find Matches For:</label>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {safeCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.candidateId}] {c.fullName} — {c.targetRole} ({c.totalExperienceYears || 0} Yrs Exp)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Minimum Fit Threshold ({minScoreThreshold}%):</label>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={minScoreThreshold}
              onChange={(e) => setMinScoreThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
            />
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-white uppercase tracking-wider font-mono">
          Ranked Matches (
          {matchMode === "JOB_TO_CANDIDATES" ? jobMatches.length : candidateMatches.length} Found)
        </span>
        <span className="text-slate-400">
          Scored by Skills, Experience, Location & Qualifications
        </span>
      </div>

      {/* Match Cards List */}
      <div className="space-y-4">
        {(matchMode === "JOB_TO_CANDIDATES" ? jobMatches : candidateMatches).map((match, idx) => {
          const { candidate, job, overallScore, grade, matchingSkills, missingSkills, reasons } = match;

          const isHighMatch = overallScore >= 80;
          const isMidMatch = overallScore >= 60 && overallScore < 80;

          return (
            <div
              key={idx}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-xl space-y-4 transition-all text-xs"
            >
              {/* Card Top Row: Candidate & Score Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-start sm:items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600/30 to-blue-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold font-mono text-base shrink-0 shadow-md">
                    {candidate.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span 
                        onClick={() => onOpenCandidateProfile(candidate)}
                        className="text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        {candidate.fullName}
                      </span>
                      <span className="font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/30 text-[10px]">
                        {candidate.candidateId}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      Target: <span className="text-slate-300 font-medium">{candidate.targetRole}</span> • {candidate.totalExperienceYears || 0} Yrs Experience • {candidate.location || "India"}
                    </p>
                  </div>
                </div>

                {/* Score & Match Grade */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Overall Alignment</span>
                    <span className={`text-xl font-extrabold font-mono ${
                      isHighMatch ? "text-emerald-400" : isMidMatch ? "text-amber-400" : "text-slate-400"
                    }`}>
                      {overallScore}%
                    </span>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    isHighMatch
                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-md shadow-emerald-500/10"
                      : isMidMatch
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}>
                    {grade}
                  </span>
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Skills Match (35%)</span>
                    <span className="font-mono font-bold text-blue-400">{match.skillsScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${match.skillsScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Experience Fit (20%)</span>
                    <span className="font-mono font-bold text-emerald-400">{match.experienceScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.experienceScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Role Fit (15%)</span>
                    <span className="font-mono font-bold text-indigo-400">{match.roleScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${match.roleScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Location & CTC (10%)</span>
                    <span className="font-mono font-bold text-purple-400">{match.locationScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${match.locationScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Skills Tags: Matching vs Missing */}
              <div className="space-y-2">
                {matchingSkills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-emerald-400 font-mono mr-1">Matching Skills:</span>
                    {matchingSkills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px]">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                )}

                {missingSkills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 font-mono mr-1">Missing / Unlisted:</span>
                    {missingSkills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-md text-[10px]">
                        • {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Explainable "Why Recommended" checklist */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                  Why Recommended:
                </span>
                <ul className="space-y-0.5 text-[11px] text-slate-300 list-disc list-inside">
                  {reasons.map((r, i) => (
                    <li key={i} className="text-slate-300">{r}</li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center justify-end space-x-2.5">
                <button
                  onClick={() => onOpenCandidateProfile(candidate)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium cursor-pointer"
                >
                  View Profile
                </button>

                <button
                  onClick={() => onOpenAssignModal(candidate, job)}
                  className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Match to Recruiter</span>
                </button>
              </div>
            </div>
          );
        })}

        {(matchMode === "JOB_TO_CANDIDATES" ? jobMatches.length : candidateMatches.length) === 0 && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Candidates Met Threshold ({minScoreThreshold}%)</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting the minimum fit slider or select a different job vacancy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
