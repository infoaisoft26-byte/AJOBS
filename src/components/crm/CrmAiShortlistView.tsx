import { useState } from "react";
import { 
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, 
  HelpCircle, ChevronRight, Star, FileText
} from "lucide-react";
import { ConsultancyJobModel, ConsultancyCandidateModel } from "./CrmTypes";

interface CrmAiShortlistViewProps {
  jobs: ConsultancyJobModel[];
  candidates: ConsultancyCandidateModel[];
  onSelectCandidate: (cand: ConsultancyCandidateModel) => void;
  onNavigateToTab: (tab: "candidates" | "pipeline" | "matching" | "interviews") => void;
}

export default function CrmAiShortlistView({
  jobs,
  candidates,
  onSelectCandidate,
  onNavigateToTab
}: CrmAiShortlistViewProps) {
  const [selectedJob, setSelectedJob] = useState<ConsultancyJobModel | null>(jobs[0] || null);

  const getRankedMatches = (job: ConsultancyJobModel) => {
    return candidates.map(cand => {
      // 1. Tech Skills Compliance (30% weight)
      const jobSkills = job.skillsRequired || [];
      const candSkills = cand.skills || [];
      const matchingSkills = jobSkills.filter(sk => 
        candSkills.some(cs => cs.toLowerCase() === sk.toLowerCase())
      );
      const skillsScore = jobSkills.length > 0 
        ? Math.round((matchingSkills.length / jobSkills.length) * 100) 
        : 70;

      // 2. Experience Alignment (10% weight)
      let expScore = 70;
      const jobExp = job.experience.toLowerCase();
      const candExp = cand.experience.toLowerCase();
      if (candExp.includes("senior") && jobExp.includes("senior")) {
        expScore = 100;
      } else if (candExp.includes("mid") && jobExp.includes("mid")) {
        expScore = 100;
      } else if (candExp.includes("junior") && jobExp.includes("junior")) {
        expScore = 100;
      } else if (candExp.includes("senior") && jobExp.includes("mid")) {
        expScore = 90; // Overqualified is fine
      }

      // 3. Expected Salary Match (10% weight)
      let salaryScore = 100;
      const expectedCTC = parseFloat(cand.expectedSalary) || 20;
      const budgetMax = parseFloat(job.salaryMax) || 30;
      if (expectedCTC > budgetMax) {
        // Expected is higher than max budget
        const excessPercent = ((expectedCTC - budgetMax) / budgetMax) * 100;
        salaryScore = Math.max(0, Math.round(100 - excessPercent * 2));
      }

      const resumeScore = cand.resumeScore || 65;
      const interviewScore = cand.aiInterviewScore || 60;

      // Overall dynamic aggregate score
      const overallScore = Math.round(
        (skillsScore * 0.35) + 
        (interviewScore * 0.30) + 
        (resumeScore * 0.15) + 
        (expScore * 0.10) + 
        (salaryScore * 0.10)
      );

      // Strengths & gaps list
      const strengths: string[] = [];
      const gaps: string[] = [];

      if (skillsScore >= 75) {
        strengths.push("High alignment in tech stack requirements.");
      } else {
        const missing = jobSkills.filter(sk => !candSkills.some(cs => cs.toLowerCase() === sk.toLowerCase()));
        gaps.push(`Missing key: ${missing.slice(0, 2).join(", ")}`);
      }

      if (interviewScore >= 80) {
        strengths.push("Strong AI communication index.");
      }

      if (salaryScore === 100) {
        strengths.push("Expected salary is fully within client budget limits.");
      } else if (salaryScore < 60) {
        gaps.push("Expected salary exceeds client max CTC budget.");
      }

      return {
        candidate: cand,
        overallScore,
        skillsScore,
        interviewScore,
        resumeScore,
        expScore,
        salaryScore,
        strengths,
        gaps
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 10); // Display Top 10 first
  };

  const matches = selectedJob ? getRankedMatches(selectedJob) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-ai-shortlist-view">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>AI Automated Recommender & Shortlist</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Weighted profile alignment checking. Top 10 matches are sorted automatically.</p>
        </div>

        <div>
          <select
            value={selectedJob?.id || ""}
            onChange={(e) => {
              const job = jobs.find(j => j.id === e.target.value);
              if (job) setSelectedJob(job);
            }}
            className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.companyName} - {j.title}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedJob ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-xs text-gray-400 px-1 font-mono uppercase tracking-wider">
              <span>Weighted Matching Candidates</span>
              <span>Sorted Rank</span>
            </div>

            <div className="space-y-3.5">
              {matches.length > 0 ? (
                matches.map(({ candidate, overallScore, skillsScore, interviewScore, resumeScore, strengths, gaps }, idx) => {
                  let badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                  if (overallScore >= 85) {
                    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  } else if (overallScore >= 70) {
                    badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                  } else if (overallScore < 50) {
                    badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                  }

                  return (
                    <div 
                      key={candidate.id}
                      onClick={() => onSelectCandidate(candidate)}
                      className="p-5 glass border border-transparent hover:border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white/5 cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold font-mono bg-white/10 text-gray-300 rounded-full w-5 h-5 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <strong className="text-white text-sm block">{candidate.name}</strong>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
                            {overallScore}% Match
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-gray-400 font-mono">
                          <span>Skills Match: <strong>{skillsScore}%</strong></span>
                          <span>•</span>
                          <span>AI Interview: <strong>{interviewScore}%</strong></span>
                          <span>•</span>
                          <span>Resume ATS: <strong>{resumeScore}%</strong></span>
                        </div>

                        <div className="space-y-1 pt-1.5 border-t border-white/5">
                          {strengths.map((st, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{st}</span>
                            </div>
                          ))}
                          {gaps.map((gp, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{gp}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCandidate(candidate);
                            onNavigateToTab("interviews");
                            alert(`Initiate scheduling interview for ${candidate.name}!`);
                          }}
                          className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                        >
                          Schedule Round
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 italic glass rounded-xl">No candidates scored yet. Record some in the candidate CRM.</div>
              )}
            </div>
          </div>

          {/* Explanation Weights Panel */}
          <div className="space-y-6">
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>AI Ranking Parameters</span>
              </h4>

              <div className="space-y-3.5 text-xs text-gray-300">
                <p className="leading-relaxed text-[11px] text-gray-400">
                  Greenhouse Match Algorithm dynamically computes suitability using weighted index arrays:
                </p>

                <div className="space-y-2.5">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Skills compliance (Tech Stack)</span>
                    <strong className="text-white">35% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>AI Interview Performance Score</span>
                    <strong className="text-white">30% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>ATS Resume Parsing Score</span>
                    <strong className="text-white">15% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Experience tier mapping</span>
                    <strong className="text-white">10% Weight</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span>Budget CTC expected alignment</span>
                    <strong className="text-white">10% Weight</strong>
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-2">
                  <Star className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    Matched results refresh instantly when expected CTC, tags, or skills text change in candidate profiles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-8 text-center text-xs text-gray-500 italic rounded-2xl">No assigned client vacancies to match. Add a job posting first.</div>
      )}
    </div>
  );
}
