import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../../firebase";
import { 
  Sparkles, 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Users, 
  HelpCircle, 
  FileText, 
  Calendar, 
  ThumbsUp, 
  Send, 
  UserCheck, 
  Filter, 
  Search,
  Zap,
  Award,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ScreeningQuestionAnswer {
  question: string;
  answer: string;
  category?: string;
}

export interface QuestionEvaluation {
  question: string;
  candidateAnswer: string;
  category: string;
  score: number;
  rating: "Exceeds Expectations" | "Meets Expectations" | "Partially Meets" | "Below Expectations" | string;
  analysis: string;
}

export interface AiScreeningResult {
  fitScore: number;
  fitLevel: "Strong Fit" | "Good Fit" | "Moderate Fit" | "Low Fit" | string;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  questionBreakdown: QuestionEvaluation[];
  modelUsed?: string;
  evaluatedAt?: string;
  applicationId?: string;
  sourceResponsesFingerprint?: string;
}

export interface CandidateScreeningProfile {
  id: string;
  candidateId?: string;
  name: string;
  role: string;
  experience: string;
  skills: string[];
  avatar?: string;
  stage: string;
  responses: ScreeningQuestionAnswer[];
  screeningResult?: AiScreeningResult;
}

interface AiScreeningSummarySectionProps {
  jobId: string;
  recruiterId?: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  requirements?: string;
  skillsRequired?: string[];
  screeningQuestions?: string[];
  onUpdateCandidateStage?: (candidateId: string, newStage: string) => void;
  onOpenLiveChat?: (candidateId: string, candidateName: string) => void;
}

export default function AiScreeningSummarySection({
  jobId,
  recruiterId,
  jobTitle,
  companyName,
  jobDescription = "",
  requirements = "",
  skillsRequired = [],
  screeningQuestions = [],
  onUpdateCandidateStage,
  onOpenLiveChat,
}: AiScreeningSummarySectionProps) {
  const [candidates, setCandidates] = useState<CandidateScreeningProfile[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [isLoadingCandidates, setIsLoadingCandidates] = useState<boolean>(true);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingStep, setParsingStep] = useState<string>("");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "responses">("overview");

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  // Evaluate candidate responses automatically using the Gemini API endpoint
  const parseCandidateScreening = async (candidate: CandidateScreeningProfile, force = false) => {
    if (!candidate) return;
    if (!candidate.responses.some(x => x.question?.trim() && x.answer?.trim())) return;
    if (candidate.screeningResult && !force) return;

    setIsParsing(true);
    setParsingStep("Analyzing saved candidate responses...");

    try {
      const payload = {
        jobId,
        jobTitle,
        companyName,
        jobDescription,
        requirements,
        skillsRequired,
        candidateId: candidate.candidateId || candidate.id,
        candidateName: candidate.name,
        candidateExperience: candidate.experience,
        candidateSkills: candidate.skills,
        responses: candidate.responses,
        forceRefresh: force
      };

      // Screening requires a verified recruiter/admin Firebase identity.
      const authToken = await auth.currentUser?.getIdToken();
      if (!authToken) throw new Error("Please sign in again to run candidate screening.");
      const screeningHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };

      // Try primary recruiter endpoint, falling back to hiring-agent endpoint.
      let response = await fetch("/api/recruiter/screening-summary", {
        method: "POST",
        headers: screeningHeaders,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        response = await fetch("/api/hiring-agent/screening-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await response.json();

      if (data.success && data.screening) {
        setCandidates(prev => prev.map(c => {
          if (c.id === candidate.id) {
            return {
              ...c,
              screeningResult: data.screening
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("[AiScreeningSummarySection] Evaluation error:", err);
    } finally {
      setIsParsing(false);
      setParsingStep("");
    }
  };

  useEffect(() => {
    let active = true;
    const loadApplicants = async () => {
      setIsLoadingCandidates(true);
      try {
        if (!recruiterId) { setCandidates([]); setSelectedCandidateId(""); return; }
        const assignedAppsQuery = query(collection(db, "applications"), where("assignedRecruiterId", "==", recruiterId));
        const screeningQuery = query(collection(db, "candidate_screenings"), where("jobId", "==", jobId));
        const results = await Promise.all([getDocs(assignedAppsQuery), getDocs(screeningQuery).catch(() => null)]);
        const saved = new Map<string, AiScreeningResult>();
        results[1]?.forEach((snap) => { const item = snap.data() as any; if (item.candidateId && typeof item.fitScore === "number") saved.set(item.candidateId, item); });
        const assignedForJob = results[0].docs.filter(snap => String(snap.data().jobId || "") === jobId);
        const real = await Promise.all(assignedForJob.map(async (snap) => {
          const item = snap.data() as any;
          const candidateId = String(item.candidateId || item.userId || "");
          let profile: any = {};
          if (candidateId) {
            const profileSnaps = await Promise.all([
              getDoc(doc(db, "candidateProfiles", candidateId)).catch(() => null),
              getDoc(doc(db, "candidate_profiles", candidateId)).catch(() => null),
              getDoc(doc(db, "candidates", candidateId)).catch(() => null),
              getDoc(doc(db, "users", candidateId)).catch(() => null)
            ]);
            profile = profileSnaps.reduce((acc: any, value: any) => value?.exists() ? { ...acc, ...value.data() } : acc, {});
          }
          const raw = item.screeningResponses || item.screeningAnswers || item.responses || [];
          const responses = Array.isArray(raw) ? raw.filter((x: any) => x && typeof x.question === "string" && typeof x.answer === "string") : [];
          const fingerprint = JSON.stringify(responses.map((value: any) => ({ question: value.question, answer: value.answer, category: value.category || "" })));
          const exp = item.candidateExperience ?? item.experience ?? profile.experience ?? profile.totalExperience ?? "Not provided";
          const skills = item.candidateSkills ?? item.skills ?? profile.skills ?? profile.technicalSkills ?? [];
          const nestedResult = item.screeningResult as AiScreeningResult | undefined;
          const savedResult = saved.get(candidateId);
          const validNested = nestedResult?.applicationId === snap.id && nestedResult?.sourceResponsesFingerprint === fingerprint ? nestedResult : undefined;
          const validSaved = savedResult?.applicationId === snap.id && savedResult?.sourceResponsesFingerprint === fingerprint ? savedResult : undefined;
          return { id: snap.id, candidateId, name: item.candidateName || profile.fullName || profile.name || profile.displayName || "Candidate", role: profile.currentTitle || profile.targetRole || profile.designation || jobTitle, experience: typeof exp === "number" ? String(exp) + " Years" : String(exp), skills: Array.isArray(skills) ? skills.filter((x: any) => typeof x === "string") : [], stage: item.status || "applied", responses, screeningResult: validNested || validSaved } as CandidateScreeningProfile;
        })).filter((x) => x.id);
        if (!active) return;
        setCandidates(real);
        setSelectedCandidateId((current) => real.some(x => x.id === current) ? current : (real[0]?.id || ""));
      } catch (error) { console.error("[AI screening] Real applicant fetch failed:", error); if (active) setCandidates([]); }
      finally { if (active) setIsLoadingCandidates(false); }
    };
    if (jobId) loadApplicants(); else { setCandidates([]); setIsLoadingCandidates(false); }
    return () => { active = false; };
  }, [jobId, jobTitle, recruiterId]);

  useEffect(() => {
    if (selectedCandidate?.responses?.some(x => x.question?.trim() && x.answer?.trim()) && !selectedCandidate.screeningResult) parseCandidateScreening(selectedCandidate, false);
  }, [selectedCandidateId, candidates.length]);

  const handleCopySummary = () => {
    if (!selectedCandidate?.screeningResult) return;
    const textToCopy = `AI SCREENING SUMMARY: ${selectedCandidate.name} for ${jobTitle} (${companyName})
Fit Score: ${selectedCandidate.screeningResult.fitScore}% [${selectedCandidate.screeningResult.fitLevel}]
Recommendation: ${selectedCandidate.screeningResult.recommendation}

Summary:
${selectedCandidate.screeningResult.summary}

Top Strengths:
${selectedCandidate.screeningResult.strengths.map(s => `• ${s}`).join("\n")}

Verification Flags:
${selectedCandidate.screeningResult.concerns.map(c => `• ${c}`).join("\n")}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleCandidateStageUpdate = (newStage: string) => {
    setCandidates(prev => prev.map(c => c.id === selectedCandidateId ? { ...c, stage: newStage } : c));
    if (onUpdateCandidateStage) {
      onUpdateCandidateStage(selectedCandidateId, newStage);
    }
  };

  const result = selectedCandidate?.screeningResult;

  // Fit score badge color styling helper
  const getScoreBadgeStyles = (score: number) => {
    if (score >= 85) {
      return {
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/40",
        text: "text-emerald-400",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.35)]",
        ring: "#10B981",
        label: "Exceptional Fit",
        icon: Award
      };
    } else if (score >= 70) {
      return {
        bg: "bg-cyan-500/15",
        border: "border-cyan-500/40",
        text: "text-cyan-400",
        glow: "shadow-[0_0_20px_rgba(6,182,212,0.3)]",
        ring: "#06B6D4",
        label: "Strong Fit",
        icon: ThumbsUp
      };
    } else if (score >= 50) {
      return {
        bg: "bg-amber-500/15",
        border: "border-amber-500/40",
        text: "text-amber-400",
        glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
        ring: "#F59E0B",
        label: "Moderate Fit",
        icon: AlertTriangle
      };
    } else {
      return {
        bg: "bg-rose-500/15",
        border: "border-rose-500/40",
        text: "text-rose-400",
        glow: "shadow-[0_0_20px_rgba(244,63,94,0.25)]",
        ring: "#F43F5E",
        label: "Low Fit",
        icon: AlertTriangle
      };
    }
  };

  const badgeStyle = getScoreBadgeStyles(result?.fitScore ?? 0);
  const BadgeIcon = badgeStyle.icon;

  if (isLoadingCandidates) return <div className="p-8 text-slate-300">Loading real applicants for this job…</div>;
  if (!selectedCandidate) return <div className="p-8 text-slate-100">No real applications are recorded for this job yet. Demo candidates and placeholder scores are disabled.</div>;

  return (
    <div 
      className="p-6 md:p-8 rounded-3xl bg-[#140e1f]/95 border border-purple-500/30 backdrop-blur-2xl shadow-2xl space-y-6 text-slate-100 relative overflow-hidden"
      id="ai-screening-summary-section"
    >
      {/* Ambient background glow accent */}
      <div className="absolute -right-20 -top-20 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar with live screening controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>AI SCREENING SUMMARY</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>AI screening</span>
            </span>

            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              Screening Questions Assessment Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Candidate Screening & Fit Evaluation
          </h2>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => parseCandidateScreening(selectedCandidate, true)}
            disabled={isParsing || !selectedCandidate.responses.some(item => item.question?.trim() && item.answer?.trim())}
            className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-bold text-purple-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Re-run AI evaluation using saved candidate answers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isParsing ? "animate-spin text-cyan-400" : "text-purple-400"}`} />
            <span>{isParsing ? "Evaluating..." : "Re-Analyze"}</span>
          </button>

          <button
            onClick={handleCopySummary}
            disabled={!result}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/20 text-slate-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5"
            title="Copy screening summary report to clipboard"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-mono">Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Candidate Selector Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 font-bold text-slate-300">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Candidate for Mandate Screening:</span>
          </span>
          <span>{candidates.length} Real Applicants</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {candidates.map((cand) => {
            const isSelected = cand.id === selectedCandidateId;
            const candScore = cand.screeningResult?.fitScore ?? null;
            const candStyle = getScoreBadgeStyles(candScore ?? 0);

            return (
              <button
                key={cand.id}
                onClick={() => setSelectedCandidateId(cand.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500/60 shadow-lg shadow-purple-600/20"
                    : "bg-[#0e0a14]/80 border-purple-500/20 hover:border-purple-500/40 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black" : "bg-white/10 text-slate-300"
                  }`}>
                    {cand.name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-xs text-white truncate">{cand.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{cand.experience} • {cand.role}</p>
                  </div>
                </div>

                {/* Candidate Fit score badge preview */}
                <div className="shrink-0 text-right">
                  <span className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black border ${candStyle.bg} ${candStyle.border} ${candStyle.text}`}>
                    {candScore === null ? "Not evaluated" : String(candScore) + "%"}
                  </span>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">{cand.stage}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State Banner during AI Parsing */}
      <AnimatePresence>
        {isParsing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-3 text-cyan-300 text-xs font-mono animate-pulse"
          >
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
            <div className="flex-1">
              <span className="font-bold block text-white">AI screening in progress</span>
              <span className="text-[11px] text-cyan-400/90">{parsingStep || "Evaluating candidate answers against role benchmark..."}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Screening Assessment Card: Fit Score Badge + Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0e0a14]/90 p-6 rounded-3xl border border-purple-500/25">
        
        {/* Left Col: Prominent Fit Score Badge */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4 p-5 rounded-2xl bg-gradient-to-b from-[#1c1329] to-[#120b1c] border border-purple-500/30">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Overall Assessment
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {result ? "AI EVALUATED" : "NOT EVALUATED"}
              </span>
            </div>

            {/* Visual Circular/Gauge Fit Score Badge */}
            <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center relative overflow-hidden ${badgeStyle.bg} ${badgeStyle.border} ${badgeStyle.glow}`}>
              <div className="relative mb-2">
                <div className="w-24 h-24 rounded-full border-4 border-white/10 flex items-center justify-center relative">
                  <svg className="w-24 h-24 -rotate-90 absolute inset-0">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="transparent"
                      className="text-white/10"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke={badgeStyle.ring}
                      strokeWidth="6"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (result?.fitScore ?? 0)) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-3xl font-black font-mono tracking-tight text-white">
                      {result ? String(result.fitScore) + "%" : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fit Score Badge Label */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
                <BadgeIcon className={`w-3.5 h-3.5 ${badgeStyle.text}`} />
                <span className={`text-xs font-black tracking-wider uppercase ${badgeStyle.text}`}>
                  {result ? result.fitLevel : "Awaiting responses"}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 mt-2 font-mono">
                {result?.recommendation || "No screening decision recorded"}
              </p>
            </div>

            {/* Candidate Metadata snapshot */}
            <div className="space-y-1.5 pt-2 text-xs border-t border-purple-500/20">
              <div className="flex justify-between text-slate-400">
                <span>Applicant:</span>
                <span className="font-bold text-white">{selectedCandidate.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Experience:</span>
                <span className="font-mono text-cyan-300 font-bold">{selectedCandidate.experience}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Current Stage:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedCandidate.stage}</span>
              </div>
            </div>
          </div>

          {/* Quick Recruiter Stage Advancement Actions */}
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Recruiter Action
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCandidateStageUpdate("Shortlisted")}
                className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/25"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Shortlist</span>
              </button>
              <button
                onClick={() => handleCandidateStageUpdate("Interview")}
                className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/25"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Interview</span>
              </button>
            </div>
            {onOpenLiveChat && (
              <button
                onClick={() => onOpenLiveChat(selectedCandidate.candidateId || selectedCandidate.id, selectedCandidate.name)}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-purple-500/30 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>Message Candidate</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Col: Executive AI Summary, Strengths & Interview Flags */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          
          {/* Section View Tabs */}
          <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-purple-500/25 text-white border border-purple-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Synthesis</span>
            </button>
            <button
              onClick={() => setActiveTab("breakdown")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "breakdown"
                  ? "bg-purple-500/25 text-white border border-purple-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Questions Rubric ({selectedCandidate.responses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("responses")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "responses"
                  ? "bg-purple-500/25 text-white border border-purple-500/40"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Raw Q&A Logs</span>
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Executive Summary Paragraph */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider block">
                  AI SCREENING OVERVIEW
                </span>
                <p className="text-xs text-slate-200 leading-relaxed bg-[#17111F]/70 p-4 rounded-2xl border border-purple-500/20">
                  {result?.summary || "No AI summary available until this candidate submits real screening answers."}
                </p>
              </div>

              {/* Strengths & Flags 2-column Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Verified Strengths */}
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/25 space-y-2.5">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Demonstrated Strengths</span>
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {(result?.strengths || []).map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                        <span className="leading-snug">{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Verification Points / Interview Flags */}
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/25 space-y-2.5">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interviewer Probe Points</span>
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {(result?.concerns || []).map((con, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span className="leading-snug">{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Role Skills Matching Bar */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Evaluated against stack:</span>
                <div className="flex flex-wrap gap-1.5">
                  {skillsRequired.map((sk) => (
                    <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] border border-purple-500/30 text-cyan-300 font-mono text-[10px]">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "breakdown" && (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {(result?.questionBreakdown || []).map((qb, idx) => {
                const isExpanded = expandedQuestion === idx;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#17111F]/80 border border-purple-500/20 space-y-2 text-xs"
                  >
                    <div 
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                      className="flex items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                          Q{idx + 1}
                        </span>
                        <span className="font-bold text-white truncate text-xs">{qb.question}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                          {qb.score}/100
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-purple-500/15 space-y-2 animate-in fade-in">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                          <span className="text-[10px] text-slate-400 font-mono block mb-1">Candidate Response:</span>
                          <p className="text-slate-200 text-xs leading-relaxed italic">{qb.candidateAnswer}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-cyan-300 uppercase block font-mono">
                              AI evaluation • {qb.rating}
                            </span>
                            <p className="text-slate-300 text-xs leading-relaxed mt-0.5">{qb.analysis}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "responses" && (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {selectedCandidate.responses.map((resp, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-[#17111F]/80 border border-purple-500/20 space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {resp.category || "General"}
                    </span>
                    <span className="font-bold text-white text-xs">{resp.question}</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed pl-2 border-l-2 border-cyan-400/40 bg-black/20 p-2 rounded-r-xl">
                    {resp.answer}
                  </p>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Footer Model Telemetry & Audit Assurance */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-mono border-t border-purple-500/20 pt-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{result?.modelUsed ? "AI evaluation: " + result.modelUsed : "No AI evaluation recorded."}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>Evaluated: {result?.evaluatedAt ? new Date(result.evaluatedAt).toLocaleDateString() : "Not evaluated"}</span>
          <span>•</span>
          <span className="text-cyan-400 font-bold">AIJOBS Recruiter Suite</span>
        </div>
      </div>

    </div>
  );
}
