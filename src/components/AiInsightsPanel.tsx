import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { 
  Brain, Sparkles, TrendingUp, Award, UserCheck, RefreshCw, Database, 
  Activity, Flame, ListOrdered, CheckCircle, Info
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, query } from "firebase/firestore";

// Define TypeScript interfaces for AI Insights
interface AiRecommendation {
  id: string;
  candidateName: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  recommendedRole: string;
  fitAnalysis: string;
  skillsMatch: string[];
  timestamp: string;
}

interface InterviewScore {
  id: string;
  candidateName: string;
  candidateId: string;
  jobId: string;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  culturalScore: number;
  averageScore: number;
  evaluator: string;
  date: string;
}

export default function AiInsightsPanel({ userId, userRole }: { userId?: string; userRole?: string }) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [interviewScores, setInterviewScores] = useState<InterviewScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"ranking" | "radar" | "scatter">("ranking");

  // Local Seed Data function for AI Recommendations and Interview Scores
  const seedInsightsDataIfEmpty = async () => {
    try {
      const recsSnap = await getDocs(collection(db, "ai_recommendations"));
      const scoresSnap = await getDocs(collection(db, "interview_scores"));

      const defaultRecs: AiRecommendation[] = [
        {
          id: "rec_1",
          candidateName: "Ananya Iyer",
          candidateId: "demo_candidate_ananya",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          matchScore: 94,
          recommendedRole: "Lead Full Stack Engineer",
          fitAnalysis: "Exceptional depth in React 18, TypeScript micro-services, and concurrent database synchronization processes. Exhibits strong structural reasoning.",
          skillsMatch: ["React", "TypeScript", "Node.js", "Firebase"],
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "rec_2",
          candidateName: "Aryan Sharma",
          candidateId: "demo_candidate_aryan",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          matchScore: 88,
          recommendedRole: "Senior Systems Engineer",
          fitAnalysis: "Solid command over backend systems architecture and cloud hosting pipelines. Highly proficient in offline-first data caching layers.",
          skillsMatch: ["Node.js", "TypeScript", "PostgreSQL", "Firebase"],
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "rec_3",
          candidateName: "Sneha Rao",
          candidateId: "demo_candidate_sneha",
          jobId: "cjob_2",
          jobTitle: "AI Product Designer",
          matchScore: 92,
          recommendedRole: "Lead AI/UX Designer",
          fitAnalysis: "Stellar design system logic and Framer Motion micro-interactions. Strongly recommended for high-fidelity client-side aesthetic platforms.",
          skillsMatch: ["Figma", "Tailwind CSS", "Framer Motion", "UI Design"],
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "rec_4",
          candidateName: "Rahul Verma",
          candidateId: "demo_candidate_rahul",
          jobId: "cjob_2",
          jobTitle: "AI Product Designer",
          matchScore: 78,
          recommendedRole: "Product UI Developer",
          fitAnalysis: "Strong prototyping foundations and clean responsive design execution, with a slight learning curve regarding advanced layout animations.",
          skillsMatch: ["Figma", "Tailwind CSS", "User Research"],
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "rec_5",
          candidateName: "Vikram Malhotra",
          candidateId: "demo_candidate_vikram",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          matchScore: 61,
          recommendedRole: "Associate Full Stack Developer",
          fitAnalysis: "Competent basic JavaScript fundamentals, but lacks adequate scale engineering or system design experience required for the Senior Track.",
          skillsMatch: ["React", "Node.js"],
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const defaultScores: InterviewScore[] = [
        {
          id: "score_1",
          candidateName: "Ananya Iyer",
          candidateId: "demo_candidate_ananya",
          jobId: "cjob_1",
          technicalScore: 95,
          communicationScore: 88,
          problemSolvingScore: 94,
          culturalScore: 92,
          averageScore: 92.25,
          evaluator: "Siddharth Roy (VP Eng)",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        },
        {
          id: "score_2",
          candidateName: "Aryan Sharma",
          candidateId: "demo_candidate_aryan",
          jobId: "cjob_1",
          technicalScore: 92,
          communicationScore: 82,
          problemSolvingScore: 90,
          culturalScore: 88,
          averageScore: 88.0,
          evaluator: "Arun Kumar (VP Engineering)",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        },
        {
          id: "score_3",
          candidateName: "Sneha Rao",
          candidateId: "demo_candidate_sneha",
          jobId: "cjob_2",
          technicalScore: 90,
          communicationScore: 94,
          problemSolvingScore: 86,
          culturalScore: 95,
          averageScore: 91.25,
          evaluator: "Preeti Nair (HR Manager)",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        },
        {
          id: "score_4",
          candidateName: "Rahul Verma",
          candidateId: "demo_candidate_rahul",
          jobId: "cjob_2",
          technicalScore: 78,
          communicationScore: 85,
          problemSolvingScore: 80,
          culturalScore: 82,
          averageScore: 81.25,
          evaluator: "Ananya HR",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        },
        {
          id: "score_5",
          candidateName: "Vikram Malhotra",
          candidateId: "demo_candidate_vikram",
          jobId: "cjob_1",
          technicalScore: 58,
          communicationScore: 65,
          problemSolvingScore: 52,
          culturalScore: 70,
          averageScore: 61.25,
          evaluator: "Arun Kumar (VP Engineering)",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        }
      ];

      // If either collection is empty, seed them
      if (recsSnap.empty) {
        for (const rec of defaultRecs) {
          await setDoc(doc(db, "ai_recommendations", rec.id), rec);
        }
      }
      if (scoresSnap.empty) {
        for (const score of defaultScores) {
          await setDoc(doc(db, "interview_scores", score.id), score);
        }
      }
    } catch (err) {
      console.warn("AI Insights Seeder: Local fallback activated gracefully:", err);
    }
  };

  const loadInsightsData = async () => {
    setLoading(true);
    await seedInsightsDataIfEmpty();
    
    try {
      const recsSnap = await getDocs(collection(db, "ai_recommendations"));
      const scoresSnap = await getDocs(collection(db, "interview_scores"));

      const recsList: AiRecommendation[] = [];
      recsSnap.forEach((docSnap) => {
        recsList.push({ id: docSnap.id, ...docSnap.data() } as AiRecommendation);
      });

      const scoresList: InterviewScore[] = [];
      scoresSnap.forEach((docSnap) => {
        scoresList.push({ id: docSnap.id, ...docSnap.data() } as InterviewScore);
      });

      // Sort recommendations by matchScore descending
      setRecommendations(recsList.sort((a, b) => b.matchScore - a.matchScore));
      setInterviewScores(scoresList);
    } catch (err) {
      console.error("Error loading AI insights data from Firestore:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsightsData();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await loadInsightsData();
    setSyncing(false);
  };

  // Build combined data for Candidate Ranking Charts
  const chartData = recommendations.map(rec => {
    const interview = interviewScores.find(score => score.candidateId === rec.candidateId);
    return {
      name: rec.candidateName,
      "AI Match Score": rec.matchScore,
      "Interview Score": interview ? Math.round(interview.averageScore) : null,
      technicalScore: interview?.technicalScore || 0,
      communicationScore: interview?.communicationScore || 0,
      problemSolvingScore: interview?.problemSolvingScore || 0,
      culturalScore: interview?.culturalScore || 0,
      role: rec.recommendedRole,
      jobTitle: rec.jobTitle
    };
  });

  // Calculate high-level stats derived from actual records
  const totalProcessed = recommendations.length;
  const avgMatchScore = Math.round(recommendations.reduce((sum, r) => sum + r.matchScore, 0) / (totalProcessed || 1));
  const avgInterviewScore = Math.round(interviewScores.reduce((sum, s) => sum + s.averageScore, 0) / (interviewScores.length || 1));

  return (
    <div className="glass p-6 rounded-3xl border border-indigo-500/10 space-y-6 bg-indigo-950/5 relative overflow-hidden" id="ai-insights-panel-component">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/20">
            <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Enterprise AI Insights & Placement Analytics</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </h3>
            <p className="text-[11px] text-gray-400">
              Cross-referencing algorithmic <code className="text-indigo-400">ai_recommendations</code> with vetted <code className="text-pink-400">interview_scores</code>.
            </p>
          </div>
        </div>

        <button
          onClick={handleManualSync}
          disabled={syncing || loading}
          className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics Gateway</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-xs text-gray-400 font-mono animate-pulse uppercase tracking-wider">Syncing Firestore Intelligence Keys...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Key Intelligence Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-500/20 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider font-extrabold">Algorithmic Rank Pool</span>
                <p className="text-2xl font-black text-white">{totalProcessed}</p>
                <p className="text-[9px] text-indigo-400 font-mono">Assessed candidates in pipeline</p>
              </div>
              <ListOrdered className="w-8 h-8 text-indigo-500/30" />
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-purple-500/20 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider font-extrabold">Avg AI Match Rating</span>
                <p className="text-2xl font-black text-indigo-400">{avgMatchScore}%</p>
                <p className="text-[9px] text-gray-400 font-mono">Resume compatibility threshold</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500/30" />
            </div>

            <div className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-pink-500/20 transition-all">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider font-extrabold">Avg Human Interview score</span>
                <p className="text-2xl font-black text-pink-400">{avgInterviewScore}%</p>
                <p className="text-[9px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>High interview accuracy SLA</span>
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-pink-500/30" />
            </div>
          </div>

          {/* Interactive Recharts Tabs */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-[10px] font-mono">
            {[
              { id: "ranking", label: "Comparative Placement Matrix" },
              { id: "radar", label: "Multi-Skill Competency Radar" },
              { id: "scatter", label: "Predictive Sourcing Scatter" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveSubTab(t.id as any)}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  activeSubTab === t.id ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Core Visual Charts Stage */}
          <div className="bg-neutral-950/30 border border-white/5 rounded-2xl p-5 min-h-[300px]">
            {activeSubTab === "ranking" && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono">Candidate Placement Calibration</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Side-by-side view comparing AI matching score with human interviewer assessment scores.</p>
                  </div>
                  <div className="flex gap-3 text-[9px] font-mono">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <span className="w-2.5 h-1.5 bg-indigo-500 rounded-sm"></span> AI Match Rating
                    </span>
                    <span className="flex items-center gap-1 text-pink-400">
                      <span className="w-2.5 h-1.5 bg-pink-500 rounded-sm"></span> Interview Score
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        fontFamily="monospace"
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#09090e", borderColor: "rgba(99,102,241,0.25)" }}
                        itemStyle={{ fontSize: "11px", color: "#e2e8f0" }}
                        labelStyle={{ fontSize: "11px", color: "#818cf8", fontWeight: "bold" }}
                      />
                      <Bar dataKey="AI Match Score" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="Interview Score" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeSubTab === "radar" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono">Competency Radar (Pre-seeded Pool Example)</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Aggregate dimensions comparing high-fit profiles on core software engineering criteria.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-64 w-full flex justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                        { subject: 'Technical skills', A: 95, B: 92, fullMark: 100 },
                        { subject: 'Problem Solving', A: 94, B: 90, fullMark: 100 },
                        { subject: 'Communication', A: 88, B: 82, fullMark: 100 },
                        { subject: 'Cultural Fit', A: 92, B: 88, fullMark: 100 },
                      ]}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 9 }} />
                        <PolarRadiusAxis stroke="rgba(255,255,255,0.2)" angle={30} domain={[0, 100]} />
                        <Radar name="Ananya Iyer" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                        <Radar name="Aryan Sharma" dataKey="B" stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                        <Legend wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-neutral-900/30 border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase">Technical Depth Lead</span>
                      <p className="text-gray-300 font-bold">Ananya Iyer (92.25% Average)</p>
                      <p className="text-[11px] text-gray-400">Peak scores in structural systems, state orchestration, and high-concurrency loops.</p>
                    </div>
                    <div className="p-3 bg-neutral-900/30 border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase">Systems Track Leader</span>
                      <p className="text-gray-300 font-bold">Aryan Sharma (88% Average)</p>
                      <p className="text-[11px] text-gray-400">Top performance indices in offline-first indexing structures and caching layer paradigms.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === "scatter" && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase font-mono">Predictive Sourcing & Fit Dispersion</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">X-Y calibration showing matching accuracy. Upper-right quadrant denotes perfect predictive hiring alignment.</p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis 
                        type="number" 
                        dataKey="AI Match Score" 
                        name="AI Match Score" 
                        unit="%" 
                        domain={[40, 100]}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        fontFamily="monospace"
                      />
                      <YAxis 
                        type="number" 
                        dataKey="Interview Score" 
                        name="Interview Score" 
                        unit="%" 
                        domain={[40, 100]}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        fontFamily="monospace"
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Assessed Candidates" data={chartData} fill="#818cf8">
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry["AI Match Score"] > 80 && entry["Interview Score"] && entry["Interview Score"] > 80 ? '#10b981' : '#6366f1'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Actionable Candidate Leaderboard */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Real-Time High-Fit Placement Recommendations</span>
            </h4>

            <div className="overflow-x-auto bg-neutral-950/20 border border-white/5 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-mono">
                    <th className="p-3">Rank & Name</th>
                    <th className="p-3">Target Openings</th>
                    <th className="p-3">AI Match</th>
                    <th className="p-3">Avg Interview</th>
                    <th className="p-3">Prescribed Role Fit</th>
                    <th className="p-3 text-right">Algorithmic Decision Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {recommendations.map((rec, idx) => {
                    const interview = interviewScores.find(s => s.candidateId === rec.candidateId);
                    const avgScore = interview ? Math.round(interview.averageScore) : null;
                    
                    return (
                      <tr key={rec.id} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center font-mono font-bold text-[10px] text-indigo-400 border border-white/5">
                              #{idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-white">{rec.candidateName}</p>
                              <p className="text-[10px] text-gray-500">{rec.jobTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-gray-400">{rec.jobTitle}</td>
                        <td className="p-3 font-mono font-bold text-indigo-400">{rec.matchScore}%</td>
                        <td className="p-3 font-mono">
                          {avgScore ? (
                            <span className={avgScore >= 85 ? "text-emerald-400 font-extrabold" : "text-amber-400"}>
                              {avgScore}%
                            </span>
                          ) : (
                            <span className="text-gray-500">Pending</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 font-mono text-[9px] font-bold">
                            {rec.recommendedRole}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {rec.matchScore >= 85 && avgScore && avgScore >= 85 ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-mono font-bold uppercase text-[9px] border border-emerald-500/20">
                              Direct Hire (Exceptional)
                            </span>
                          ) : rec.matchScore >= 75 ? (
                            <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg font-mono font-bold uppercase text-[9px] border border-indigo-500/20">
                              Schedule Final Loop
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-neutral-900 text-gray-500 rounded-lg font-mono font-bold uppercase text-[9px] border border-white/5">
                              Reassess Match
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation block */}
          <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-white font-mono uppercase">AI Sourcing Methodology</h5>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Matches are determined dynamically using semantic cross-matching metrics of candidate resume payloads. Final decision paths are verified through technical calibration indices. Keep platform telemetry synced to update these recommendations.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
