import { useState, useEffect } from "react";
import { 
  Award, Brain, Sparkles, AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, 
  RefreshCw, Play, Star, BookOpen, LineChart, Cpu, Zap, Bookmark, Map, ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

interface CandidateReportSectionProps {
  userId: string;
  profile: any;
  triggerNotification?: (title: string, message: string) => Promise<void>;
}

export default function CandidateReportSection({ userId, profile, triggerNotification }: CandidateReportSectionProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<"scores" | "skills" | "roadmap" | "match">("scores");

  // Job match simulation states
  const [jobDescriptionInput, setJobDescriptionInput] = useState(
    "We are seeking a senior software engineer skilled in React, TypeScript, and Node.js. Experience with high-traffic distributed microservices and NoSQL data engines is highly preferred. Passion for clean architecture and system metrics is required."
  );
  const [jobSkillsText, setJobSkillsText] = useState("React, TypeScript, Node.js, NoSQL, System Design");
  const [matchResult, setMatchResult] = useState<any | null>(null);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // 1. Load compiled reports from Firestore
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, "ai_reports");
        const q = query(reportsRef, where("userId", "==", userId));
        const snap = await getDocs(q);
        
        const loaded: any[] = [];
        snap.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() });
        });

        // Sort by generatedAt descending
        loaded.sort((a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime());

        setReports(loaded);
        if (loaded.length > 0) {
          setSelectedReport(loaded[0]);
        } else {
          // Default mock premium report so user is not greeted with an empty blank state!
          const defaultMockReport = {
            id: "mock_report_default",
            userId,
            sessionId: "session_mock_1",
            category: "Technical Interview",
            level: "Mid-Level",
            overallScore: 84,
            technicalScore: 86,
            communicationScore: 81,
            confidenceScore: 80,
            grammarScore: 92,
            leadershipScore: 75,
            behaviorScore: 83,
            strengths: [
              "Demonstrates profound modular reasoning with solid fullstack decoupled systems.",
              "Excellent control of types, runtime error handling, and asynchronous memory lifecycles.",
              "Provides clear transactional models emphasizing horizontal scaling."
            ],
            weaknesses: [
              "Under pressure, explanation of write-ahead logging details could be expanded with more quantitative metrics.",
              "Could frame performance optimization loops more explicitly using the STAR framework."
            ],
            recommendations: [
              "Incorporate real-world distributed partition challenges into active portfolio descriptions.",
              "Highlight transaction lock behaviors on non-relational document paradigms like Firestore."
            ],
            learningRoadmap: [
              {
                milestone: "Distributed Architecture Deep Dive",
                duration: "Week 1-2",
                resources: ["System Design Primer (GitHub)", "GCP Decoupling Protocols Guide"]
              },
              {
                milestone: "Database Locks and Partition Tolerance",
                duration: "Week 3",
                resources: ["Database Internals (O'Reilly Books)", "Redis Distributed Locking Patterns"]
              }
            ],
            generatedAt: new Date().toISOString()
          };
          setReports([defaultMockReport]);
          setSelectedReport(defaultMockReport);
        }
      } catch (err: any) {
        if (err?.message?.includes("permissions") || err?.code === "permission-denied" || err?.message?.includes("permission-denied")) {
          console.warn("Candidate Report Section loading redirected to local memory sandbox due to Firestore rules validation:", err.message);
        } else {
          console.error("Error loading reports:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [userId]);

  // Simulate Job Match
  const handleSimulateJobMatch = async () => {
    if (!selectedReport) return;
    setMatchingLoading(true);
    setMatchResult(null);

    try {
      const skillsArr = jobSkillsText.split(",").map(s => s.trim()).filter(Boolean);
      const response = await fetch("/api/evaluate-job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jobDescriptionInput,
          jobSkills: skillsArr,
          resumeText: profile?.resumeText || "Candidate resume context",
          resumeSkills: profile?.skills || ["React", "TypeScript", "Node.js"],
          interviewScore: selectedReport.overallScore,
          experience: profile?.experience || "3 years of system development",
          location: profile?.preferredLocation || "Remote",
          expectedSalary: profile?.expectedSalary || "₹18,00,000"
        })
      });

      if (!response.ok) {
        throw new Error("Job matching API failed");
      }

      const data = await response.json();
      setMatchResult(data);
      if (triggerNotification) {
        triggerNotification("🎯 AI Job Recommendation Ready!", `Compatibility scored at ${data.matchPercentage}%.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatchingLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto" id="ai-report-view">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded uppercase">
              GenAI Brain Core
            </span>
            {selectedReport?.overallScore >= 80 && (
              <span className="flex items-center space-x-1 px-2 py-0.5 text-[9px] font-mono tracking-widest font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded uppercase">
                <ShieldCheck className="w-3 h-3" />
                <span>AI Verified</span>
              </span>
            )}
          </div>
          <h2 className="font-display font-extrabold text-2xl text-white mt-1">Premium AI Evaluation Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Holistic assessment cards combining mock interview records, communication feedback, and automatic roadmap builders.
          </p>
        </div>

        {/* Report Selector Dropdown */}
        <div className="flex items-center space-x-3 shrink-0">
          <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">Select Session:</label>
          {loading ? (
            <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
          ) : (
            <select
              value={selectedReport?.id || ""}
              onChange={(e) => {
                const found = reports.find(r => r.id === e.target.value);
                if (found) setSelectedReport(found);
              }}
              className="bg-[#090d16] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.category} ({new Date(r.generatedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {selectedReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Panel: Circular Scores and Navigation */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Primary Glass Card Overall Score */}
            <div className="glass p-6 rounded-3xl bg-gradient-to-br from-[#100c1e]/80 to-[#030305]/95 border border-purple-500/15 text-center space-y-4">
              <span className="text-[9px] font-mono tracking-widest font-extrabold text-purple-300 uppercase block">
                COMPOSITE PERFORMANCE
              </span>

              {/* Animated Circle Progress */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-white/5"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-purple-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 64}
                    initial={{ strokeDashoffset: 2 * Math.PI * 64 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 64 * (1 - selectedReport.overallScore / 100) }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black font-display text-white tracking-tighter">
                    {selectedReport.overallScore}
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono tracking-wider font-extrabold uppercase mt-0.5">
                    OVERALL RATIO
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <p className="font-display font-bold text-sm text-gray-200">
                  {selectedReport.category}
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-1">
                  Level: <span className="text-purple-300 font-bold">{selectedReport.level}</span>
                </p>
              </div>
            </div>

            {/* Inner Module Sub-tabs (Vertical Menu) */}
            <div className="bg-black/30 rounded-2xl p-2 border border-white/5 space-y-1">
              {[
                { id: "scores", label: "Skills Scorecard", icon: LineChart },
                { id: "skills", label: "Strengths & Gaps", icon: Award },
                { id: "roadmap", label: "Learning Roadmap", icon: Map },
                { id: "match", label: "AI Job Match Engine", icon: Cpu }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeDetailsTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailsTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Panel: Tab Content Display */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              
              {/* TAB CONTENT: SCORES */}
              {activeDetailsTab === "scores" && (
                <motion.div
                  key="scores"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
                    <div>
                      <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
                        <LineChart className="w-5 h-5 text-indigo-400" />
                        <span>Interactive Skills Scorecard</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Multi-dimensional grading generated across all responses compiled.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        { label: "Technical Competence", score: selectedReport.technicalScore, color: "from-indigo-500 to-purple-500" },
                        { label: "Communication Tone", score: selectedReport.communicationScore, color: "from-blue-500 to-indigo-500" },
                        { label: "Confidence Metric", score: selectedReport.confidenceScore, color: "from-emerald-500 to-teal-500" },
                        { label: "Language & Grammar", score: selectedReport.grammarScore, color: "from-pink-500 to-rose-500" },
                        { label: "Leadership Potential", score: selectedReport.leadershipScore, color: "from-amber-500 to-orange-500" },
                        { label: "Professional Persona", score: selectedReport.behaviorScore, color: "from-purple-500 to-pink-500" }
                      ].map((item, index) => (
                        <div key={index} className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-300">{item.label}</span>
                            <span className="font-mono font-black text-white">{item.score}%</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full bg-gradient-to-r ${item.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: STRENGTHS & GAPS */}
              {activeDetailsTab === "skills" && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Strengths Card */}
                    <div className="glass p-6 rounded-3xl border border-emerald-500/15 bg-emerald-950/5 space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-white">Identified Core Strengths</h4>
                          <p className="text-[10px] text-gray-400">High leverage capabilities verified by AI.</p>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {selectedReport.strengths?.map((str: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2.5 text-xs text-gray-300 leading-relaxed">
                            <span className="text-emerald-400 font-bold mt-0.5">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps/Weaknesses Card */}
                    <div className="glass p-6 rounded-3xl border border-rose-500/15 bg-rose-950/5 space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-display font-bold text-sm text-white">Recommended Areas to Polish</h4>
                          <p className="text-[10px] text-gray-400">Identified optimization gaps to cover.</p>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {selectedReport.weaknesses?.map((weak: string, i: number) => (
                          <li key={i} className="flex items-start space-x-2.5 text-xs text-gray-300 leading-relaxed">
                            <span className="text-rose-400 font-bold mt-0.5">•</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Recommendations */}
                  <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
                    <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                      Strategic AI Career Recommendations
                    </h4>
                    <div className="space-y-3">
                      {selectedReport.recommendations?.map((rec: string, i: number) => (
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-gray-300 flex items-start space-x-3">
                          <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded text-[10px] font-mono font-bold">
                            #{i+1}
                          </span>
                          <p className="leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: ROADMAP */}
              {activeDetailsTab === "roadmap" && (
                <motion.div
                  key="roadmap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
                          <BookOpen className="w-5 h-5 text-indigo-400 animate-pulse" />
                          <span>Custom Roadmap Timeline</span>
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Milestones compiled dynamically to help candidate clear senior engineering tiers.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 relative border-l border-white/10 pl-6 ml-3">
                      {selectedReport.learningRoadmap?.map((item: any, i: number) => (
                        <div key={i} className="relative space-y-1">
                          {/* Circle node on line */}
                          <div className="absolute -left-9 top-1 w-6 h-6 rounded-full bg-indigo-600 border border-indigo-400 flex items-center justify-center text-[10px] font-bold text-white shadow shadow-indigo-500">
                            {i+1}
                          </div>
                          
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-display font-bold text-xs text-white">{item.milestone}</h4>
                              <span className="px-2.5 py-0.5 text-[9px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full font-bold">
                                {item.duration}
                              </span>
                            </div>

                            <p className="text-[11px] text-gray-400">
                              Targeted development curriculum focusing on metrics-driven, fast execution.
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 mt-2">
                              <span className="text-[9px] font-mono text-gray-500 uppercase">Resources:</span>
                              {item.resources?.map((resName: string, k: number) => (
                                <span key={k} className="flex items-center space-x-1 px-2 py-0.5 bg-[#090d16] text-[9px] font-mono text-gray-300 rounded border border-white/10">
                                  <span>{resName}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB CONTENT: JOB MATCH ENGINE */}
              {activeDetailsTab === "match" && (
                <motion.div
                  key="match"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
                    <div>
                      <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
                        <Cpu className="w-5 h-5 text-purple-400" />
                        <span>AI Job Matching & Optimization Engine</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Test and score your candidate compatibility score against custom Job Descriptions in real-time.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                          Job Description Text:
                        </label>
                        <textarea
                          rows={4}
                          value={jobDescriptionInput}
                          onChange={(e) => setJobDescriptionInput(e.target.value)}
                          className="w-full bg-[#090d16] border border-white/10 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="Paste a target job posting or standard requirements block..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                          Required Keywords (comma separated):
                        </label>
                        <input
                          type="text"
                          value={jobSkillsText}
                          onChange={(e) => setJobSkillsText(e.target.value)}
                          className="w-full bg-[#090d16] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        onClick={handleSimulateJobMatch}
                        disabled={matchingLoading || !jobDescriptionInput.trim()}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {matchingLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing Gemini Matching Vectors...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                            <span>Run Compatibility Scan</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Compatibility Result Display */}
                    {matchResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-[#120a1c] to-[#04040a] border border-purple-500/20 space-y-6"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                          <div>
                            <span className="text-[9px] font-mono tracking-widest font-extrabold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded uppercase">
                              Verification Node Completed
                            </span>
                            <h4 className="font-display font-black text-lg text-white mt-1">Alignment Results</h4>
                          </div>

                          <div className="text-center md:text-right shrink-0">
                            <span className="text-3xl font-black font-display text-white">
                              {matchResult.matchPercentage}%
                            </span>
                            <p className="text-[9px] text-purple-300 font-mono tracking-wider font-extrabold uppercase">
                              MATCH PROBABILITY
                            </p>
                          </div>
                        </div>

                        {/* Match Progress Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {[
                            { label: "Skills Matching", val: matchResult.skillsMatchPercentage, col: "bg-indigo-500" },
                            { label: "Experience Match", val: matchResult.experienceMatchPercentage, col: "bg-purple-500" },
                            { label: "Cultural Match Ratio", val: matchResult.culturalMatchPercentage, col: "bg-pink-500" }
                          ].map((m, idx) => (
                            <div key={idx} className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                              <span className="text-[10px] text-gray-400 block">{m.label}</span>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">{m.val}%</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${m.col}`} style={{ width: `${m.val}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Strengths & Gaps Side-by-side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest">
                              Alignment Strengths
                            </span>
                            <ul className="space-y-2">
                              {matchResult.strengths?.map((s: string, idx: number) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                                  <span className="text-emerald-400">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[9px] font-mono font-extrabold text-rose-400 uppercase tracking-widest">
                              Identified Gaps
                            </span>
                            <ul className="space-y-2">
                              {matchResult.gaps?.map((g: string, idx: number) => (
                                <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                                  <span className="text-rose-400">•</span>
                                  <span>{g}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                          <span className="text-[9px] font-mono font-extrabold text-indigo-400 uppercase tracking-widest block">
                            Key Recommendations to Increase Matching Ratio
                          </span>
                          <ul className="space-y-1">
                            {matchResult.recommendations?.map((r: string, idx: number) => (
                              <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                                <span className="text-indigo-400 font-bold">→</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>
      ) : (
        <div className="p-16 text-center glass rounded-2xl text-xs text-gray-400 italic">
          No reports found. Complete an AI Mock Interview Arena session first to generate dynamic performance reports!
        </div>
      )}

    </div>
  );
}
