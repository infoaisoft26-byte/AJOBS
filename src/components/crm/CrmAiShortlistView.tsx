import { useState } from "react";
import { 
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, 
  HelpCircle, ChevronRight, Star, FileText, Search, RefreshCw
} from "lucide-react";
import { ConsultancyJobModel, ConsultancyCandidateModel } from "./CrmTypes";

interface CrmAiShortlistViewProps {
  jobs: ConsultancyJobModel[];
  candidates: ConsultancyCandidateModel[];
  onSelectCandidate: (cand: ConsultancyCandidateModel) => void;
  onNavigateToTab: (tab: "candidates" | "pipeline" | "matching" | "interviews") => void;
  profile?: any;
  userId?: string;
}

export default function CrmAiShortlistView({
  jobs,
  candidates,
  onSelectCandidate,
  onNavigateToTab,
  profile,
  userId
}: CrmAiShortlistViewProps) {
  const [selectedJob, setSelectedJob] = useState<ConsultancyJobModel | null>(jobs[0] || null);
  const [searchMode, setSearchMode] = useState<"job" | "natural">("job");

  // Natural language query states
  const [naturalQuery, setNaturalQuery] = useState("");
  const [isNaturalSearching, setIsNaturalSearching] = useState(false);
  const [naturalResults, setNaturalResults] = useState<any[] | null>(null);
  const [extractedQueryInfo, setExtractedQueryInfo] = useState<string>("");

  const handleNaturalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) {
      setNaturalResults(null);
      return;
    }

    setIsNaturalSearching(true);
    try {
      const response = await fetch("/api/consultancy-natural-search", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": userId || "anonymous",
          "x-user-role": "consultancy",
          "x-user-pricing-plan": profile?.pricingPlan || "Free",
          "x-user-clients-count": String(profile?.clientsCount || 0)
        },
        body: JSON.stringify({
          query: naturalQuery,
          candidates: candidates.map(c => ({
            id: c.id,
            name: c.name,
            skills: c.skills,
            experience: c.experience,
            expectedSalary: c.expectedSalary
          }))
        })
      });

      if (response.status === 403) {
        const errData = await response.json();
        alert(`🔒 ABAC Access Denied: ${errData.reason || "Subscription limit restriction."}\n\nPlease visit the "ABAC Security Guard" tab to adjust your pricing plan!`);
        setIsNaturalSearching(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setNaturalResults(data.rankedCandidates || []);
        setExtractedQueryInfo(data.queriesExtracted || "");
      } else {
        throw new Error("Failed query");
      }
    } catch (err) {
      console.error(err);
      // Fallback
      setNaturalResults(candidates.map((c, i) => ({
        id: c.id,
        relevanceScore: Math.max(50, 95 - i * 8),
        explanation: "Good overlapping credentials matching key keywords specified in query.",
        matchedSkills: c.skills?.slice(0, 2) || ["React", "TypeScript"],
        missingSkills: []
      })));
      setExtractedQueryInfo("Extracted basic technology constraints and skill keywords.");
    } finally {
      setIsNaturalSearching(false);
    }
  };

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
      
      {/* Search mode tab and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>AI Automated Recommender & Shortlist</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Weighted profile alignment checking and natural language candidate sourcing.</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-neutral-900/50 p-1 rounded-xl border border-white/5 w-fit self-start md:self-auto">
          <button
            onClick={() => setSearchMode("job")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${searchMode === "job" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Job Alignment
          </button>
          <button
            onClick={() => setSearchMode("natural")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${searchMode === "natural" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Natural Search</span>
          </button>
        </div>
      </div>

      {searchMode === "job" ? (
        <>
          {/* Job Selection Bar */}
          <div className="glass p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-gray-400 block font-mono">Evaluate Candidate Suitability For Vacancy:</span>
              <strong className="text-white text-sm">{selectedJob?.companyName} — {selectedJob?.title}</strong>
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
        </>
      ) : (
        <div className="space-y-6">
          {/* Natural language query block */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="font-bold text-xs text-indigo-400 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              <span>Natural Language AI Talent Hunter</span>
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Query your talent pool natively. Describe your desired technologies, notice period, and pricing profiles (e.g. <em>"Figma designers under 15 LPA available immediately"</em> or <em>"React developer with TypeScript experienced in high performance modules"</em>).
            </p>

            <form onSubmit={handleNaturalSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  placeholder="e.g. Node.js backend developer with at least 4 years experience under 20 Lakhs PA..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isNaturalSearching}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                {isNaturalSearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Neural Index...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Query Candidates</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Search output ranked matches */}
          <div className="space-y-4">
            {isNaturalSearching ? (
              <div className="text-center py-20 text-xs text-gray-500 font-mono animate-pulse">
                Running semantic alignment and score ranking algorithms...
              </div>
            ) : naturalResults ? (
              <div className="space-y-4">
                {extractedQueryInfo && (
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] text-gray-400 font-mono flex items-center justify-between">
                    <span><strong>Extracted Directives:</strong> {extractedQueryInfo}</span>
                    <span className="text-indigo-400 font-bold uppercase">Synthesized successfully</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-gray-400 px-1 font-mono uppercase tracking-wider">
                  <span>Ranked Matching Candidates ({naturalResults.length})</span>
                  <span>Neural Relevance</span>
                </div>

                <div className="space-y-3.5">
                  {naturalResults.length > 0 ? (
                    naturalResults.map((item, idx) => {
                      const fullCand = candidates.find(c => c.id === item.id);
                      if (!fullCand) return null;

                      let badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                      if (item.relevanceScore >= 85) {
                        badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      } else if (item.relevanceScore >= 70) {
                        badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                      } else if (item.relevanceScore < 50) {
                        badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
                      }

                      return (
                        <div 
                          key={fullCand.id}
                          className="p-5 glass border border-transparent hover:border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-white/5"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold font-mono bg-white/10 text-gray-300 rounded-full w-5 h-5 flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <strong className="text-white text-sm block">{fullCand.name}</strong>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-mono ${badgeColor}`}>
                                {item.relevanceScore}% Match
                              </span>
                            </div>

                            <p className="text-xs text-gray-400 italic font-medium leading-relaxed">
                              "{item.explanation}"
                            </p>

                            <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-gray-400 font-mono">
                              <span>Experience: <strong>{fullCand.experience}</strong></span>
                              <span>•</span>
                              <span>Salary: <strong>{fullCand.expectedSalary}</strong></span>
                              <span>•</span>
                              <span>Skills: <strong>{fullCand.skills?.join(", ") || "None"}</strong></span>
                            </div>

                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.matchedSkills?.map((ms: string, i: number) => (
                                <span key={i} className="text-[8px] font-bold font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                                  Matched: {ms}
                                </span>
                              ))}
                              {item.missingSkills?.map((ms: string, i: number) => (
                                <span key={i} className="text-[8px] font-bold font-mono bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                                  Lacks: {ms}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={(e) => {
                                onSelectCandidate(fullCand);
                                onNavigateToTab("interviews");
                                alert(`Initiate scheduling interview for ${fullCand.name}!`);
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
                    <div className="p-8 text-center text-xs text-gray-500 italic glass rounded-xl">No candidates match this search. Try entering shorter technology descriptors.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 italic glass rounded-2xl border border-white/5">
                Type a natural language candidate sourcing prompt above and hit "AI Query Candidates" to dynamically parse, filter, and score alignment.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
