import React, { useState, useEffect } from "react";
import { parseJsonResponse } from "../utils/apiHelper";
import {
  Award, Brain, Calendar, CheckCircle2, AlertTriangle, Code, Database, FileText,
  Filter, Grid, Layers, ListFilter, Mail, RefreshCw, Search, Send, Sparkles, Target,
  UserCheck, Users, X, ChevronRight, Edit3, ShieldAlert, Sliders, Play, Lock, Clock, Check, Eye
} from "lucide-react";
import { JobPosting, CandidateProfile } from "../types";
import { useGlobalMarketplace } from "../context/GlobalMarketplaceContext";

interface AiHiringAgentProps {
  jobs?: JobPosting[];
  candidates?: CandidateProfile[];
}

export default function AiHiringAgent({ jobs = [], candidates = [] }: AiHiringAgentProps) {
  const { formatCurrency } = useGlobalMarketplace();

  // Baseline job preset for Senior Full Stack Engineer
  const defaultSeniorJob: JobPosting = {
    id: "preset_senior_fullstack",
    title: "Senior Full Stack Engineer",
    companyName: "TechCorp Solutions",
    location: "Mumbai / Hybrid",
    skillsRequired: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS"],
    experienceRequired: "4–7 Years",
    salary: "₹18,00,000 - ₹26,00,000 CTC",
    description: "Looking for a Senior Full Stack Engineer proficient in React, Node.js, TypeScript, PostgreSQL, and AWS cloud architecture for Mumbai / Hybrid work.",
    status: "Published",
    createdAt: new Date().toISOString()
  };

  const allDisplayJobs = jobs.some(j => j.title.toLowerCase().includes("senior full stack"))
    ? jobs
    : [defaultSeniorJob, ...jobs];

  // Active Stepper Step: 1 -> 8 (or 'funnel' / 'audit')
  const [activeStep, setActiveStep] = useState<number | "funnel" | "audit">(1);

  // Step 1: Input state
  const [selectedJobId, setSelectedJobId] = useState<string>(allDisplayJobs[0]?.id || defaultSeniorJob.id);
  const [inputMode, setInputMode] = useState<"upload" | "paste" | "live">("live");
  const [pastedJdText, setPastedJdText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isParsingJd, setIsParsingJd] = useState<boolean>(false);

  // Step 2 & 3: Parsed JD & Confirmation State
  const [parsedJd, setParsedJd] = useState<any | null>(null);
  const [jdId, setJdId] = useState<string>("");
  const [isConfirmingJd, setIsConfirmingJd] = useState<boolean>(false);

  // Step 4 & 5: Candidate Scan & Matching Engine
  const [isScanningCandidates, setIsScanningCandidates] = useState<boolean>(false);
  const [scannedCandidates, setScannedCandidates] = useState<any[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [aiFallbackActive, setAiFallbackActive] = useState<boolean>(false);
  const [totalScannedCount, setTotalScannedCount] = useState<number>(0);

  // Matching Engine Weights
  const [weights, setWeights] = useState({
    skills: 40,
    experience: 20,
    role: 15,
    location: 10,
    education: 10,
    noticePeriod: 5
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Modals state
  const [explanationCandidate, setExplanationCandidate] = useState<any | null>(null);
  const [shortlistModalOpen, setShortlistModalOpen] = useState<boolean>(false);
  const [shortlistCustomMessage, setShortlistCustomMessage] = useState<string>("");
  const [isShortlisting, setIsShortlisting] = useState<boolean>(false);

  // Screening Questions Modal
  const [questionsModalCandidate, setQuestionsModalCandidate] = useState<any | null>(null);
  const [screeningQuestions, setScreeningQuestions] = useState<any[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState<boolean>(false);

  // Assessment Modal
  const [assessmentModalCandidate, setAssessmentModalCandidate] = useState<any | null>(null);
  const [assessmentTitle, setAssessmentTitle] = useState<string>("Full Stack System Architecture Assessment");
  const [isSendingAssessment, setIsSendingAssessment] = useState<boolean>(false);

  // Schedule Interview Modal
  const [interviewModalCandidate, setInterviewModalCandidate] = useState<any | null>(null);
  const [interviewRound, setInterviewRound] = useState<string>("Round 1: Technical Deep-Dive");
  const [interviewDate, setInterviewDate] = useState<string>(new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]);
  const [interviewTime, setInterviewTime] = useState<string>("11:00 AM IST");
  const [interviewMode, setInterviewMode] = useState<string>("Google Meet Video Call");
  const [interviewerName, setInterviewerName] = useState<string>("Senior Engineering Director");
  const [isSchedulingInterview, setIsSchedulingInterview] = useState<boolean>(false);

  // Final Decision & Offer Modal
  const [finalDecisionCandidate, setFinalDecisionCandidate] = useState<any | null>(null);
  const [decisionType, setDecisionType] = useState<"selected" | "hold" | "rejected">("selected");
  const [decisionReason, setDecisionReason] = useState<string>("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState<boolean>(false);

  // Offer Modal
  const [offerModalCandidate, setOfferModalCandidate] = useState<any | null>(null);
  const [offerSalary, setOfferSalary] = useState<string>("₹22,00,000 CTC");
  const [offerJoiningDate, setOfferJoiningDate] = useState<string>("2026-09-01");
  const [offerDetails, setOfferDetails] = useState<string>("Senior Full Stack Engineer position with stock options and remote flexibility.");
  const [isSendingOffer, setIsSendingOffer] = useState<boolean>(false);

  // Audit Logs & Funnel Metrics
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [funnelStats, setFunnelStats] = useState<any | null>(null);

  // Fetch initial audit logs & funnel stats
  useEffect(() => {
    fetchAuditLogs();
    fetchFunnelStats();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("/api/hiring-agent/audit-logs");
      const data = await parseJsonResponse(res);
      if (data.success) setAuditLogs(data.logs || []);
    } catch (err) {
      console.warn("Audit logs fetch failed:", err);
    }
  };

  const fetchFunnelStats = async () => {
    try {
      const res = await fetch("/api/hiring-agent/funnel-stats");
      const data = await parseJsonResponse(res);
      if (data.success) setFunnelStats(data.funnel || null);
    } catch (err) {
      console.warn("Funnel stats fetch failed:", err);
    }
  };

  // Handle File Upload (Max 10MB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Maximum file size is 10 MB. Please select a smaller file.");
      return;
    }

    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Step 1 -> 2: Parse JD API Call
  const handleParseJd = async () => {
    setIsParsingJd(true);
    try {
      const selectedJob = allDisplayJobs.find(j => j.id === selectedJobId) || defaultSeniorJob;
      const bodyPayload = {
        fileBase64: inputMode === "upload" ? fileBase64 : undefined,
        fileName: uploadedFile?.name,
        fileType: uploadedFile?.type,
        pastedText: inputMode === "paste" ? pastedJdText : undefined,
        jobId: inputMode === "live" ? selectedJob.id : undefined,
        uploadedBy: "Admin / Recruiter"
      };

      const res = await fetch("/api/hiring-agent/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const data = await parseJsonResponse(res);
      if (data.success && data.parsedJd) {
        setParsedJd(data.parsedJd);
        setJdId(data.jdId);
        setActiveStep(2);
        fetchAuditLogs();
      } else {
        alert(data.error || "Failed to parse Job Description.");
      }
    } catch (err: any) {
      alert("Error parsing Job Description: " + (err.message || err));
    } finally {
      setIsParsingJd(false);
    }
  };

  // Step 3: Confirm & Scan Candidates API Call
  const handleConfirmAndScan = async () => {
    setIsConfirmingJd(true);
    setIsScanningCandidates(true);
    setActiveStep(4);

    try {
      // 1. Confirm JD Criteria
      await fetch("/api/hiring-agent/confirm-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdId,
          updatedFields: parsedJd,
          confirmedBy: "Admin / Recruiter"
        })
      });

      // 2. Scan Candidate Database
      const scanRes = await fetch("/api/hiring-agent/scan-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdId,
          customWeights: weights,
          performedBy: "Admin / Recruiter"
        })
      });

      const scanData = await parseJsonResponse(scanRes);
      if (scanData.success) {
        setScannedCandidates(scanData.candidates || []);
        setExecutiveSummary(scanData.executiveSummary || "");
        setAiFallbackActive(!!scanData.aiFallbackActive);
        setTotalScannedCount(scanData.totalScanned || scanData.candidates?.length || 0);
        setActiveStep(5);
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(scanData.error || "Failed to scan candidate pool.");
      }
    } catch (err: any) {
      alert("Error scanning candidate database: " + (err.message || err));
    } finally {
      setIsConfirmingJd(false);
      setIsScanningCandidates(false);
    }
  };

  // Single or Bulk Shortlist Dispatch
  const handleConfirmShortlist = async () => {
    if (selectedCandidateIds.length === 0) return;
    setIsShortlisting(true);
    try {
      const res = await fetch("/api/hiring-agent/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateIds: selectedCandidateIds,
          jobId: jdId || "job_senior_fullstack",
          customMessage: shortlistCustomMessage,
          performedBy: "Admin / Recruiter"
        })
      });

      const data = await parseJsonResponse(res);
      if (data.success) {
        alert(`Successfully shortlisted ${selectedCandidateIds.length} candidate(s) and dispatched shortlist email notifications!`);
        // Update local candidate statuses
        setScannedCandidates(prev => prev.map(c => selectedCandidateIds.includes(c.candidateId) ? { ...c, applicationStatus: "shortlisted" } : c));
        setSelectedCandidateIds([]);
        setShortlistModalOpen(false);
        setActiveStep(6);
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(data.error || "Failed to shortlist candidates.");
      }
    } catch (err: any) {
      alert("Error shortlisting candidates: " + (err.message || err));
    } finally {
      setIsShortlisting(false);
    }
  };

  // Generate Screening Questions
  const handleOpenQuestions = async (cand: any) => {
    setQuestionsModalCandidate(cand);
    setIsGeneratingQuestions(true);
    try {
      const res = await fetch("/api/hiring-agent/screening-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jdId,
          candidateId: cand.candidateId,
          jobTitle: parsedJd?.jobTitle || "Senior Full Stack Engineer",
          candidateSkills: cand.skills
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        setScreeningQuestions(data.questions || []);
      }
    } catch (err) {
      console.warn("Screening questions error:", err);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Dispatch Assessment
  const handleSendAssessment = async () => {
    if (!assessmentModalCandidate) return;
    setIsSendingAssessment(true);
    try {
      const res = await fetch("/api/hiring-agent/send-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: assessmentModalCandidate.candidateId,
          jobId: jdId,
          assessmentTitle,
          performedBy: "Admin / Recruiter"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        alert(`Assessment '${assessmentTitle}' dispatched to ${assessmentModalCandidate.name}. Notification sent.`);
        setScannedCandidates(prev => prev.map(c => c.candidateId === assessmentModalCandidate.candidateId ? { ...c, applicationStatus: "assessment" } : c));
        setAssessmentModalCandidate(null);
        setActiveStep(7);
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(data.error || "Failed to send assessment.");
      }
    } catch (err: any) {
      alert("Error sending assessment: " + (err.message || err));
    } finally {
      setIsSendingAssessment(false);
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async () => {
    if (!interviewModalCandidate) return;
    setIsSchedulingInterview(true);
    try {
      const res = await fetch("/api/hiring-agent/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: interviewModalCandidate.candidateId,
          jobId: jdId,
          round: interviewRound,
          date: interviewDate,
          time: interviewTime,
          mode: interviewMode,
          interviewer: interviewerName,
          performedBy: "Admin / Recruiter"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        alert(`Interview scheduled for ${interviewModalCandidate.name}! Invitation email sent with meeting details.`);
        setScannedCandidates(prev => prev.map(c => c.candidateId === interviewModalCandidate.candidateId ? { ...c, applicationStatus: "interview_scheduled" } : c));
        setInterviewModalCandidate(null);
        setActiveStep(7);
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(data.error || "Failed to schedule interview.");
      }
    } catch (err: any) {
      alert("Error scheduling interview: " + (err.message || err));
    } finally {
      setIsSchedulingInterview(false);
    }
  };

  // Final Decision (Human approval safeguard)
  const handleSubmitFinalDecision = async () => {
    if (!finalDecisionCandidate) return;
    setIsSubmittingDecision(true);
    try {
      const res = await fetch("/api/hiring-agent/final-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: finalDecisionCandidate.candidateId,
          jobId: jdId,
          decision: decisionType,
          reason: decisionReason,
          performedBy: "Admin / Recruiter"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        alert(`Human decision '${decisionType.toUpperCase()}' recorded for ${finalDecisionCandidate.name}.`);
        setScannedCandidates(prev => prev.map(c => c.candidateId === finalDecisionCandidate.candidateId ? { ...c, applicationStatus: data.status, finalDecision: decisionType } : c));
        const currentCand = finalDecisionCandidate;
        setFinalDecisionCandidate(null);

        if (decisionType === "selected") {
          setOfferModalCandidate(currentCand);
        } else {
          setActiveStep(8);
        }
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(data.error || "Failed to record decision.");
      }
    } catch (err: any) {
      alert("Error submitting decision: " + (err.message || err));
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Generate & Send Offer
  const handleSendOffer = async () => {
    if (!offerModalCandidate) return;
    setIsSendingOffer(true);
    try {
      const res = await fetch("/api/hiring-agent/generate-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: offerModalCandidate.candidateId,
          jobId: jdId,
          salary: offerSalary,
          joiningDate: offerJoiningDate,
          offerDetails,
          performedBy: "Admin / Recruiter"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        alert(`Official Offer Letter dispatched to ${offerModalCandidate.name} via email!`);
        setOfferModalCandidate(null);
        setActiveStep(8);
        fetchAuditLogs();
        fetchFunnelStats();
      } else {
        alert(data.error || "Failed to send offer letter.");
      }
    } catch (err: any) {
      alert("Error sending offer: " + (err.message || err));
    } finally {
      setIsSendingOffer(false);
    }
  };

  // Filter candidate pool
  const filteredCandidates = scannedCandidates.filter(c => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.currentTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.skills || []).some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (bucketFilter === "all") return true;
    if (bucketFilter === "highly") return c.bucket === "Highly Matched";
    if (bucketFilter === "potential") return c.bucket === "Potential Match";
    if (bucketFilter === "review") return c.bucket === "Manual Review" || c.manualReviewRequired;
    if (bucketFilter === "not_recommended") return c.bucket === "Not Recommended";
    return true;
  });

  return (
    <div className="space-y-6 text-gray-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/60 to-black border border-blue-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-mono font-bold mb-3">
              <Brain className="w-3.5 h-3.5" />
              <span>AUTOMATIC AI HIRING & CANDIDATE SELECTION WORKFLOW</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Enterprise AI Hiring Agent</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-3xl">
              Parses JDs, performs explainable multi-factor scoring against real candidate profiles, handles screening questions, assessments, interview scheduling, and offer flows with strictly mandatory human decision safeguards.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveStep("funnel")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                activeStep === "funnel"
                  ? "bg-blue-600 text-white border-blue-400 shadow-md"
                  : "bg-neutral-900/80 text-gray-300 border-white/10 hover:border-blue-500/50"
              }`}
            >
              Hiring Funnel Stats
            </button>
            <button
              onClick={() => setActiveStep("audit")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                activeStep === "audit"
                  ? "bg-blue-600 text-white border-blue-400 shadow-md"
                  : "bg-neutral-900/80 text-gray-300 border-white/10 hover:border-blue-500/50"
              }`}
            >
              Audit Log ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* AI Fallback Warning Banner */}
      {aiFallbackActive && (
        <div className="bg-amber-900/40 border border-amber-500/40 rounded-xl p-4 flex items-center space-x-3 text-amber-200 text-xs font-mono">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold">AI temporarily unavailable. Basic matching mode active.</span>
            <span className="ml-1 text-amber-300">Candidates evaluated using deterministic multi-factor skill & experience matrix.</span>
          </div>
        </div>
      )}

      {/* 8-Step Interactive Stepper Header */}
      {typeof activeStep === "number" && (
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[850px] text-xs font-mono">
            {[
              { num: 1, label: "Select / Upload JD" },
              { num: 2, label: "AI Parses JD" },
              { num: 3, label: "Review Criteria" },
              { num: 4, label: "Scan Candidates" },
              { num: 5, label: "Ranked Matches" },
              { num: 6, label: "Shortlist" },
              { num: 7, label: "Assessment/Interview" },
              { num: 8, label: "Final Selection" }
            ].map((s, idx, arr) => {
              const isCurrent = activeStep === s.num;
              const isPassed = activeStep > s.num;

              return (
                <React.Fragment key={s.num}>
                  <button
                    onClick={() => {
                      if (s.num <= 3 || scannedCandidates.length > 0) setActiveStep(s.num);
                    }}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                      isCurrent
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 ring-1 ring-blue-400"
                        : isPassed
                        ? "bg-blue-950/60 text-blue-300 border border-blue-800/40"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent ? "bg-white text-blue-600" : isPassed ? "bg-blue-500 text-black" : "bg-neutral-800 text-gray-400"
                    }`}>
                      {s.num}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: SELECT / UPLOAD JD */}
      {activeStep === 1 && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Step 1: Provide Job Description</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Upload a JD document (PDF, DOCX, TXT up to 10 MB), paste text, or select an existing live job posting.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-mono">
              <button
                onClick={() => setInputMode("live")}
                className={`px-3 py-1.5 rounded-lg transition-all ${inputMode === "live" ? "bg-blue-600 text-white font-bold" : "text-gray-400 hover:text-white"}`}
              >
                Select Live Job
              </button>
              <button
                onClick={() => setInputMode("upload")}
                className={`px-3 py-1.5 rounded-lg transition-all ${inputMode === "upload" ? "bg-blue-600 text-white font-bold" : "text-gray-400 hover:text-white"}`}
              >
                Upload File (PDF/DOCX)
              </button>
              <button
                onClick={() => setInputMode("paste")}
                className={`px-3 py-1.5 rounded-lg transition-all ${inputMode === "paste" ? "bg-blue-600 text-white font-bold" : "text-gray-400 hover:text-white"}`}
              >
                Paste Text
              </button>
            </div>
          </div>

          {/* Mode A: Select Live Job */}
          {inputMode === "live" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">Select Live Job Posting</label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              >
                {allDisplayJobs.map((job) => (
                  <option key={job.id} value={job.id} className="bg-neutral-900 text-white">
                    {job.title} — {job.companyName} ({job.location})
                  </option>
                ))}
              </select>

              {selectedJobId && (
                <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-xs space-y-2 text-gray-300 font-mono">
                  <div className="flex justify-between"><span className="text-gray-500">Target Role:</span> <span className="font-bold text-white">{allDisplayJobs.find(j => j.id === selectedJobId)?.title}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Skills Required:</span> <span className="text-blue-300">{allDisplayJobs.find(j => j.id === selectedJobId)?.skillsRequired?.join(", ")}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Experience Range:</span> <span>{allDisplayJobs.find(j => j.id === selectedJobId)?.experienceRequired || "4-7 Years"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Location:</span> <span>{allDisplayJobs.find(j => j.id === selectedJobId)?.location}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Mode B: Upload File */}
          {inputMode === "upload" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">Upload JD Document (Max 10 MB)</label>
              <div className="border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl p-8 text-center transition-all bg-black/20">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="jd-file-upload"
                />
                <label htmlFor="jd-file-upload" className="cursor-pointer space-y-3 block">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-400/30 flex items-center justify-center mx-auto text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Click to upload JD</span>
                    <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, TXT up to 10 MB</p>
                  </div>
                  {uploadedFile && (
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Mode C: Paste Text */}
          {inputMode === "paste" && (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">Paste Job Description Text</label>
              <textarea
                value={pastedJdText}
                onChange={(e) => setPastedJdText(e.target.value)}
                rows={8}
                placeholder="Paste the complete Job Description here..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleParseJd}
              disabled={isParsingJd}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isParsingJd ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Parsing Job Description...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Parse JD</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: AI PARSED JD DISPLAY */}
      {activeStep === 2 && parsedJd && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>JD PARSED & STRUCTURED</span>
              </div>
              <h3 className="text-xl font-extrabold text-white">{parsedJd.jobTitle}</h3>
              <p className="text-xs text-gray-400 mt-1">Source: {parsedJd.source} | ID: {parsedJd.jdId}</p>
            </div>

            <button
              onClick={() => setActiveStep(3)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>Review Criteria</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Department / Industry:</span>
              <span className="text-white font-bold">{parsedJd.department} ({parsedJd.industry})</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Experience Range:</span>
              <span className="text-amber-300 font-bold">{parsedJd.experienceMin} – {parsedJd.experienceMax} Years</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Location / Work Mode:</span>
              <span className="text-blue-300 font-bold">{parsedJd.location} ({parsedJd.workMode})</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Salary Range:</span>
              <span className="text-emerald-400 font-bold">₹{(parsedJd.salaryMin / 100000).toFixed(1)}L - ₹{(parsedJd.salaryMax / 100000).toFixed(1)}L {parsedJd.currency}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Notice Period:</span>
              <span className="text-white font-bold">{parsedJd.noticePeriod}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-xl p-4">
              <span className="text-gray-500 block mb-1">Qualification:</span>
              <span className="text-white font-bold">{parsedJd.qualification}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Must-Have Skills / Requirements ({parsedJd.mustHaveRequirements?.length || 0})</span>
              </h4>
              <div className="flex flex-wrap gap-2 pt-2">
                {(parsedJd.mustHaveRequirements || parsedJd.requiredSkills || []).map((skill: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-black/40 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Good-To-Have / Preferred Skills ({parsedJd.goodToHaveRequirements?.length || 0})</span>
              </h4>
              <div className="flex flex-wrap gap-2 pt-2">
                {(parsedJd.goodToHaveRequirements || parsedJd.preferredSkills || []).map((skill: string, i: number) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-mono font-bold">
                    + {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & EDIT PARSED CRITERIA BEFORE SCAN */}
      {activeStep === 3 && parsedJd && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-400" />
                <span>Step 3: Review & Edit Parsed Job Criteria</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Recruiter / Admin can correct extracted fields before scanning candidate database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-gray-400 mb-1">Target Job Title</label>
              <input
                type="text"
                value={parsedJd.jobTitle}
                onChange={(e) => setParsedJd({ ...parsedJd, jobTitle: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Location / Work Mode</label>
              <input
                type="text"
                value={parsedJd.location}
                onChange={(e) => setParsedJd({ ...parsedJd, location: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Experience Min (Years)</label>
              <input
                type="number"
                value={parsedJd.experienceMin}
                onChange={(e) => setParsedJd({ ...parsedJd, experienceMin: Number(e.target.value) })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Experience Max (Years)</label>
              <input
                type="number"
                value={parsedJd.experienceMax}
                onChange={(e) => setParsedJd({ ...parsedJd, experienceMax: Number(e.target.value) })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 mb-1">Must-Have Skills (Comma separated)</label>
              <input
                type="text"
                value={(parsedJd.mustHaveRequirements || []).join(", ")}
                onChange={(e) => setParsedJd({ ...parsedJd, mustHaveRequirements: e.target.value.split(",").map(s => s.trim()) })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 mb-1">Preferred / Good-to-Have Skills (Comma separated)</label>
              <input
                type="text"
                value={(parsedJd.goodToHaveRequirements || []).join(", ")}
                onChange={(e) => setParsedJd({ ...parsedJd, goodToHaveRequirements: e.target.value.split(",").map(s => s.trim()) })}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-white/10">
            <span className="text-xs text-amber-300 font-mono">
              ⚡ Candidate scan will strictly use these confirmed criteria.
            </span>

            <button
              onClick={handleConfirmAndScan}
              disabled={isScanningCandidates}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isScanningCandidates ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Scanning Candidates Database...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>Confirm & Scan Candidates</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CANDIDATE SCANNING IN PROGRESS */}
      {activeStep === 4 && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-12 text-center space-y-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
            <Brain className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-white">Scanning Candidate Database & Resumes</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto font-mono">
              Querying real candidate profiles, executing multi-factor matching algorithms (Skills, Experience, Role, Location, Education, Notice Period), and evaluating must-have requirements.
            </p>
          </div>
          <div className="w-64 h-2 bg-neutral-800 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* STEP 5: RANKED CANDIDATES & SHORTLIST BUCKETS */}
      {activeStep === 5 && (
        <div className="space-y-6">
          {/* Executive Briefing Card */}
          <div className="bg-black/60 border border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI Agent Executive Summary</span>
              </span>
              <span className="text-xs text-gray-400">Real Scanned Pool: <strong className="text-white">{totalScannedCount} candidates</strong></span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed bg-blue-950/30 p-3 rounded-xl border border-blue-800/30">
              {executiveSummary}
            </p>
          </div>

          {/* Configurable Weight Sliders Accordion */}
          <details className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4">
            <summary className="cursor-pointer text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Configure Matching Engine Component Weights (%)</span>
            </summary>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 text-xs font-mono">
              <div>
                <label className="text-gray-400">Skills Match ({weights.skills}%)</label>
                <input type="range" min="10" max="60" value={weights.skills} onChange={e => setWeights({ ...weights, skills: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-gray-400">Experience Match ({weights.experience}%)</label>
                <input type="range" min="10" max="40" value={weights.experience} onChange={e => setWeights({ ...weights, experience: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-gray-400">Role Relevance ({weights.role}%)</label>
                <input type="range" min="5" max="30" value={weights.role} onChange={e => setWeights({ ...weights, role: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-gray-400">Location / Work Mode ({weights.location}%)</label>
                <input type="range" min="5" max="20" value={weights.location} onChange={e => setWeights({ ...weights, location: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-gray-400">Education / Certs ({weights.education}%)</label>
                <input type="range" min="5" max="20" value={weights.education} onChange={e => setWeights({ ...weights, education: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
              <div>
                <label className="text-gray-400">Notice Period ({weights.noticePeriod}%)</label>
                <input type="range" min="0" max="15" value={weights.noticePeriod} onChange={e => setWeights({ ...weights, noticePeriod: Number(e.target.value) })} className="w-full accent-blue-500 mt-1" />
              </div>
            </div>
          </details>

          {/* Search, Bucket Filter & Bulk Shortlist Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-neutral-900/80 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search candidate name, skill..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={bucketFilter}
                onChange={e => setBucketFilter(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Buckets</option>
                <option value="highly">Highly Matched (85+)</option>
                <option value="potential">Potential Match (70-84)</option>
                <option value="review">Manual Review (50-69 / missing must-haves)</option>
                <option value="not_recommended">Not Recommended (&lt;50)</option>
              </select>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <span className="text-xs font-mono text-gray-400">
                Selected: <strong className="text-white">{selectedCandidateIds.length} candidates</strong>
              </span>
              <button
                onClick={() => setShortlistModalOpen(true)}
                disabled={selectedCandidateIds.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono disabled:opacity-40 transition-all flex items-center space-x-2 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Bulk Shortlist ({selectedCandidateIds.length})</span>
              </button>
            </div>
          </div>

          {/* Candidate Cards / Table */}
          <div className="space-y-4">
            {filteredCandidates.map((cand, idx) => {
              const isSelected = selectedCandidateIds.includes(cand.candidateId);
              const isHighly = cand.bucket === "Highly Matched";
              const isPotential = cand.bucket === "Potential Match";
              const isManual = cand.bucket === "Manual Review" || cand.manualReviewRequired;

              return (
                <div
                  key={cand.candidateId}
                  className={`bg-neutral-900/90 border rounded-2xl p-5 shadow-lg transition-all ${
                    isHighly ? "border-emerald-500/40 bg-emerald-950/10" : isPotential ? "border-blue-500/40" : isManual ? "border-amber-500/40" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCandidateIds([...selectedCandidateIds, cand.candidateId]);
                          else setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== cand.candidateId));
                        }}
                        className="mt-1.5 rounded border-gray-700 bg-neutral-800 text-blue-500"
                      />

                      <div className="space-y-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-base font-extrabold text-white">{cand.name}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isHighly ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : isPotential ? "bg-blue-500/20 text-blue-300 border border-blue-400/30" : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                          }`}>
                            {cand.bucket}
                          </span>
                          {cand.manualReviewRequired && (
                            <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-mono font-bold flex items-center space-x-1 border border-amber-500/30">
                              <ShieldAlert className="w-3 h-3 text-amber-400" />
                              <span>Manual Review Required</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-300 font-mono flex flex-wrap gap-x-4 gap-y-1">
                          <span>💼 {cand.currentTitle}</span>
                          <span>⏳ {cand.totalExperience} Yrs Exp</span>
                          <span>📍 {cand.location}</span>
                          <span>⌛ Notice: {cand.noticePeriod}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(cand.skills || []).map((sk: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-gray-300">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Match Score & Action Buttons */}
                    <div className="flex flex-col md:items-end space-y-3 shrink-0">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setExplanationCandidate(cand)}
                          className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-blue-400 font-mono hover:border-blue-500 flex items-center space-x-1 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Match Explanation</span>
                        </button>

                        <div className="text-right font-mono">
                          <span className={`text-2xl font-black ${
                            cand.overallScore >= 85 ? "text-emerald-400" : cand.overallScore >= 70 ? "text-blue-400" : "text-amber-400"
                          }`}>
                            {cand.overallScore}%
                          </span>
                          <span className="block text-[10px] text-gray-400 uppercase">AI Match Score</span>
                        </div>
                      </div>

                      {/* Action buttons list */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCandidateIds([cand.candidateId]);
                            setShortlistModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all"
                        >
                          Shortlist
                        </button>

                        <button
                          onClick={() => handleOpenQuestions(cand)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-200 text-xs font-bold font-mono transition-all"
                        >
                          Questions
                        </button>

                        <button
                          onClick={() => setAssessmentModalCandidate(cand)}
                          className="px-3 py-1.5 rounded-lg bg-blue-950 hover:bg-blue-900 border border-blue-700/50 text-blue-200 text-xs font-bold font-mono transition-all"
                        >
                          Assessment
                        </button>

                        <button
                          onClick={() => setInterviewModalCandidate(cand)}
                          className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-xs font-bold font-mono transition-all"
                        >
                          Interview
                        </button>

                        <button
                          onClick={() => setFinalDecisionCandidate(cand)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold font-mono transition-all"
                        >
                          Final Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 6: SHORTLISTED CONFIRMATION SCREEN */}
      {activeStep === 6 && (
        <div className="bg-neutral-900/80 border border-emerald-500/30 rounded-2xl p-8 space-y-6 shadow-lg">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-xl font-extrabold text-white">Candidates Shortlisted & Emailed</h3>
          </div>
          <p className="text-xs text-gray-300 font-mono">
            Candidate statuses updated to 'Shortlisted'. SMTP email invitations and in-app notifications dispatched successfully.
          </p>

          <div className="flex space-x-4 pt-2 font-mono text-xs">
            <button
              onClick={() => setActiveStep(5)}
              className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold"
            >
              Back to Candidate List
            </button>
            <button
              onClick={() => setActiveStep(7)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-2"
            >
              <span>Proceed to Assessment / Interview</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: ASSESSMENT & INTERVIEW MANAGEMENT */}
      {activeStep === 7 && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Step 7: Assessment & Interview Management</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Track assigned candidate assessments, interview round schedules, and screening progress.
              </p>
            </div>
            <button
              onClick={() => setActiveStep(8)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono flex items-center space-x-2"
            >
              <span>Proceed to Final Selection</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3 font-mono text-xs">
              <h4 className="font-bold text-blue-400 uppercase tracking-wider flex items-center space-x-2">
                <Code className="w-4 h-4" />
                <span>Default Interview Stage Plan</span>
              </h4>
              <div className="space-y-2">
                <div className="p-3 bg-neutral-900/80 rounded-lg border border-white/5">
                  <span className="text-white font-bold block">Stage 1: AI Screening & Skill Matrix</span>
                  <span className="text-gray-400">Focus: Core Technical & Skill Verification (20 mins)</span>
                </div>
                <div className="p-3 bg-neutral-900/80 rounded-lg border border-white/5">
                  <span className="text-white font-bold block">Stage 2: Technical Deep-Dive</span>
                  <span className="text-gray-400">Focus: React, Node.js & Database Architecture (45 mins)</span>
                </div>
                <div className="p-3 bg-neutral-900/80 rounded-lg border border-white/5">
                  <span className="text-white font-bold block">Stage 3: System Design & Culture Fit</span>
                  <span className="text-gray-400">Focus: Scalability, Cloud Hosting & Team Alignment (30 mins)</span>
                </div>
                <div className="p-3 bg-neutral-900/80 rounded-lg border border-white/5">
                  <span className="text-white font-bold block">Stage 4: Executive Offer Discussion</span>
                  <span className="text-gray-400">Focus: Compensation, Benefits & Onboarding (20 mins)</span>
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-3 font-mono text-xs">
              <h4 className="font-bold text-purple-400 uppercase tracking-wider flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Quick Actions for Shortlisted Candidates</span>
              </h4>
              <p className="text-gray-400">
                Select a candidate from the ranked list to assign assessments, generate screening questions, or schedule video interview rounds.
              </p>
              <button
                onClick={() => setActiveStep(5)}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all"
              >
                View Candidates List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 8: FINAL SELECTION & OFFER FLOW */}
      {activeStep === 8 && (
        <div className="bg-neutral-900/80 border border-emerald-500/30 rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <span>Step 8: Final Selection & Offer Letter Flow</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Strict human decision safeguard active. Confirm final candidate selection, release official employment offer letter, or hold/reject.
              </p>
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-4 font-mono text-xs">
            <h4 className="font-bold text-emerald-400 uppercase tracking-wider">Human Decision Safeguard Policy</h4>
            <p className="text-gray-300 leading-relaxed">
              AI evaluates candidate scores and summarizes interview feedback, but final employment decisions strictly require human Recruiter/Admin confirmation.
            </p>
            <button
              onClick={() => setActiveStep(5)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
            >
              Select Candidate for Final Offer
            </button>
          </div>
        </div>
      )}

      {/* FUNNEL STATS VIEW */}
      {activeStep === "funnel" && funnelStats && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2 font-mono">
            <Target className="w-5 h-5 text-blue-400" />
            <span>Real Hiring Funnel Statistics</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
              <span className="text-2xl font-extrabold text-white">{funnelStats.candidatesScanned}</span>
              <span className="block text-xs text-gray-400 uppercase mt-1">Candidates Scanned</span>
            </div>
            <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-center">
              <span className="text-2xl font-extrabold text-emerald-400">{funnelStats.highlyMatched}</span>
              <span className="block text-xs text-gray-400 uppercase mt-1">Highly Matched</span>
            </div>
            <div className="bg-black/40 border border-blue-500/20 rounded-xl p-4 text-center">
              <span className="text-2xl font-extrabold text-blue-400">{funnelStats.shortlisted}</span>
              <span className="block text-xs text-gray-400 uppercase mt-1">Shortlisted</span>
            </div>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 text-center">
              <span className="text-2xl font-extrabold text-purple-400">{funnelStats.interviewScheduled}</span>
              <span className="block text-xs text-gray-400 uppercase mt-1">Interview Scheduled</span>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TIMELINE VIEW */}
      {activeStep === "audit" && (
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-6 space-y-6 shadow-lg font-mono">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span>Immutable Hiring Audit Log ({auditLogs.length})</span>
          </h3>

          <div className="space-y-3 text-xs max-h-[500px] overflow-y-auto pr-2">
            {auditLogs.map((log, i) => (
              <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase mr-2">{log.action}</span>
                  <span className="text-white font-bold">{log.details}</span>
                  <span className="block text-gray-500 text-[10px] mt-1">Performed By: {log.performedBy} | Job ID: {log.jobId}</span>
                </div>
                <span className="text-gray-500 text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: MATCH EXPLANATION */}
      {explanationCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Why {explanationCandidate.name} Matched ({explanationCandidate.overallScore}%)</span>
              </h3>
              <button onClick={() => setExplanationCandidate(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-gray-500 block">Skills Score:</span>
                <span className="text-emerald-400 font-bold text-sm">{explanationCandidate.scoresBreakdown?.skillsScore || 90}%</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-gray-500 block">Experience Score:</span>
                <span className="text-blue-400 font-bold text-sm">{explanationCandidate.scoresBreakdown?.experienceScore || 85}%</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                <span className="text-gray-500 block">Role Relevance:</span>
                <span className="text-purple-400 font-bold text-sm">{explanationCandidate.scoresBreakdown?.roleScore || 95}%</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-emerald-400 uppercase tracking-wider">Matched Requirements (✓)</h4>
              <div className="space-y-1">
                {(explanationCandidate.matchedList || []).map((m: string, i: number) => (
                  <div key={i} className="text-emerald-300 bg-emerald-950/20 p-2 rounded-lg border border-emerald-800/30">
                    {m}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">Gaps / Missing Criteria (△)</h4>
              <div className="space-y-1">
                {(explanationCandidate.gapsList || []).length > 0 ? (
                  explanationCandidate.gapsList.map((g: string, i: number) => (
                    <div key={i} className="text-amber-300 bg-amber-950/20 p-2 rounded-lg border border-amber-800/30">
                      {g}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">None — 100% core match.</div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button onClick={() => setExplanationCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHORTLIST CONFIRMATION */}
      {shortlistModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-extrabold text-white">Shortlist Selected Candidates?</h3>
            <p className="text-gray-300">
              Confirm shortlisting <strong className="text-white">{selectedCandidateIds.length} candidate(s)</strong>. Candidate status will update to 'Shortlisted' and email notifications will be dispatched.
            </p>

            <div>
              <label className="block text-gray-400 mb-1">Optional Custom Instructions in Email</label>
              <textarea
                value={shortlistCustomMessage}
                onChange={e => setShortlistCustomMessage(e.target.value)}
                rows={3}
                placeholder="Next step: Please log in to complete your technical assessment..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setShortlistModalOpen(false)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleConfirmShortlist}
                disabled={isShortlisting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isShortlisting ? "Dispatching Shortlist..." : "Confirm & Send Shortlist Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SCREENING QUESTIONS */}
      {questionsModalCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-extrabold text-white">
                AI Screening Questions for {questionsModalCandidate.name}
              </h3>
              <button onClick={() => setQuestionsModalCandidate(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isGeneratingQuestions ? (
              <div className="text-center py-8 space-y-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400" />
                <p>Formulating candidate & JD specific questions...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {screeningQuestions.map((q, i) => (
                  <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold uppercase text-[10px]">
                      {q.category}
                    </span>
                    <p className="text-white text-xs pt-1">{q.question}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setQuestionsModalCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SEND ASSESSMENT */}
      {assessmentModalCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-extrabold text-white">Send Skill Assessment to {assessmentModalCandidate.name}</h3>

            <div>
              <label className="block text-gray-400 mb-1">Assessment Title</label>
              <input
                type="text"
                value={assessmentTitle}
                onChange={e => setAssessmentTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setAssessmentModalCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSendAssessment}
                disabled={isSendingAssessment}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isSendingAssessment ? "Sending..." : "Send Assessment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SCHEDULE INTERVIEW */}
      {interviewModalCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-extrabold text-white">Schedule Interview for {interviewModalCandidate.name}</h3>

            <div>
              <label className="block text-gray-400 mb-1">Interview Round</label>
              <input
                type="text"
                value={interviewRound}
                onChange={e => setInterviewRound(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Time</label>
                <input
                  type="text"
                  value={interviewTime}
                  onChange={e => setInterviewTime(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Mode / Platform</label>
              <input
                type="text"
                value={interviewMode}
                onChange={e => setInterviewMode(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Interviewer Name / Role</label>
              <input
                type="text"
                value={interviewerName}
                onChange={e => setInterviewerName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setInterviewModalCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleScheduleInterview}
                disabled={isSchedulingInterview}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isSchedulingInterview ? "Scheduling..." : "Schedule & Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: FINAL HUMAN SELECTION DECISION */}
      {finalDecisionCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-extrabold text-white">Final Human Decision for {finalDecisionCandidate.name}</h3>

            <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
              <span className="text-gray-400">Match Score: <strong className="text-emerald-400">{finalDecisionCandidate.overallScore}%</strong></span>
              <span className="block text-gray-400">Core Skills: {finalDecisionCandidate.skills?.slice(0, 4).join(", ")}</span>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Human Decision Choice</label>
              <select
                value={decisionType}
                onChange={e => setDecisionType(e.target.value as any)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-bold"
              >
                <option value="selected" className="text-emerald-400 font-bold">SELECT CANDIDATE FOR OFFER</option>
                <option value="hold" className="text-amber-400 font-bold">PUT APPLICATION ON HOLD</option>
                <option value="rejected" className="text-rose-400 font-bold">REJECT CANDIDATE</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Decision Reason / Notes</label>
              <textarea
                value={decisionReason}
                onChange={e => setDecisionReason(e.target.value)}
                rows={3}
                placeholder="Exceeded technical expectations in React & Node.js architecture..."
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setFinalDecisionCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSubmitFinalDecision}
                disabled={isSubmittingDecision}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isSubmittingDecision ? "Recording..." : "Confirm Human Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: OFFER GENERATION & RELEASE */}
      {offerModalCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl font-mono text-xs">
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Generate Official Offer Letter for {offerModalCandidate.name}</span>
            </h3>

            <div>
              <label className="block text-gray-400 mb-1">Annual Compensation (CTC)</label>
              <input
                type="text"
                value={offerSalary}
                onChange={e => setOfferSalary(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Expected Joining Date</label>
              <input
                type="date"
                value={offerJoiningDate}
                onChange={e => setOfferJoiningDate(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Offer Terms & Details</label>
              <textarea
                value={offerDetails}
                onChange={e => setOfferDetails(e.target.value)}
                rows={3}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setOfferModalCandidate(null)} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSendOffer}
                disabled={isSendingOffer}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isSendingOffer ? "Dispatching Offer..." : "Send Official Offer Letter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
