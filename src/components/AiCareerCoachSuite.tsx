import {
  ArrowRight,
  Brain,
  CheckCircle,
  Cloud,
  Compass,
  DollarSign,
  FileText,
  MessageSquare,
  Server,
  Target,
  TrendingUp
} from "lucide-react";
import { useState } from "react";

import { CandidateProfile } from "../types";
import { useGlobalMarketplace } from "../context/GlobalMarketplaceContext";

interface AiCareerCoachSuiteProps {
  candidateProfile?: CandidateProfile;
}

export default function AiCareerCoachSuite({ candidateProfile }: AiCareerCoachSuiteProps) {
  const { formatCurrency } = useGlobalMarketplace();
  const [activeTab, setActiveTab] = useState<"resume" | "interview" | "skills" | "salary" | "roadmap">("resume");
  const [targetRole, setTargetRole] = useState("Senior Full-Stack Engineer");
  const [currentSalaryUSD, setCurrentSalaryUSD] = useState(85000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCoachOutput, setAiCoachOutput] = useState<any | null>(null);

  const handleGenerateCoachAdvice = async (moduleType: string) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai-career-coach-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleType,
          targetRole,
          currentSalaryUSD,
          skills: candidateProfile?.skills || ["React", "TypeScript", "Node.js", "Tailwind CSS"],
          experience: candidateProfile?.experience || "4 years full-stack development",
        }),
      });

      const data = await response.json();
      if (data.success && data.coachAdvice) {
        setAiCoachOutput(data.coachAdvice);
      } else {
        setAiCoachOutput(getFallbackCoachAdvice(moduleType));
      }
    } catch (err) {
      console.error("AI Career Coach error:", err);
      setAiCoachOutput(getFallbackCoachAdvice(moduleType));
    } finally {
      setIsGenerating(false);
    }
  };

  const getFallbackCoachAdvice = (type: string) => {
    switch (type) {
      case "resume":
        return {
          title: "Resume Impact Optimization",
          improvements: [
            "Quantify key achievements (e.g. 'Improved API response time by 42% using Redis caching').",
            "Incorporate high-impact ATS keywords: 'GraphQL', 'Microservices', 'CI/CD Pipeline', 'System Design'.",
            "Reorganize skill matrix into Core Engineering vs Tools/Frameworks.",
            "Add measurable project links and GitHub repo highlights.",
          ],
          scoreImprovement: "+18 ATS Points Expected",
        };
      case "interview":
        return {
          title: "Interview Masterclass Q&A",
          questions: [
            {
              q: "How do you handle state management in large-scale React applications?",
              a: "Explain trade-offs between Context API, Zustand/Redux, and server state managers like React Query. Mention state normalization and performance profiling.",
            },
            {
              q: "Describe a time when you resolved a critical production bottleneck.",
              a: "Use the STAR method (Situation, Task, Action, Result). Highlight diagnostic metrics, memory profiling, and zero-downtime deployment.",
            },
            {
              q: "How do you ensure security in Node.js REST APIs?",
              a: "Discuss JWT validation, CORS configuration, rate limiting, SQL/NoSQL injection prevention, and environment variable secret isolation.",
            },
          ],
        };
      case "skills":
        return {
          title: "High-Demand Skill Roadmap",
          missingSkills: ["System Architecture & AWS Cloud Practitioner", "Docker & Kubernetes Containerization", "Next.js Server Actions"],
          learningPath: [
            { title: "AWS Cloud Practitioner & Serverless", provider: "AWS Training & Certification", priority: "High" },
            { title: "Kubernetes Microservices Architecture", provider: "Cloud Native Computing Foundation", priority: "Medium" },
          ],
        };
      case "salary":
        return {
          title: "Salary Negotiation Strategy",
          marketValueRangeUSD: { min: 110000, max: 145000 },
          negotiationTips: [
            "Leverage competing market offers and AI match score validation.",
            "Focus negotiation on total compensation package: base salary + equity/stock options + performance bonuses + remote work allowance.",
            "Use anchor technique: state market median range ($125k - $135k) early in offer discussions.",
          ],
        };
      case "roadmap":
        return {
          title: "3-Year Executive Career Pathing",
          milestones: [
            { year: "Year 1: Senior Tech Lead", target: "Master Distributed Systems & Lead 4-6 Engineer Teams" },
            { year: "Year 2: Staff Software Engineer", target: "Drive Cross-Functional Architecture & Platform Security" },
            { year: "Year 3: Director of Engineering", target: "Manage Strategic Tech Vision, Hiring Pipelines & Annual Budgeting" },
          ],
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-black border border-indigo-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-mono font-bold mb-3">
              <Compass className="w-3.5 h-3.5" />
              <span>AI CAREER ADVANCEMENT ENGINE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Career Coach & Career Acceleration Suite</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Personalized resume optimization, mock interview Q&A prep, targeted skill gap roadmaps, and salary negotiation strategies powered by Gemini.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-black/60 border border-white/10 rounded-xl p-2">
            <span className="text-xs text-gray-400 font-mono pl-2">Target Role:</span>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Coach Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: "resume", label: "Resume Improvement", icon: FileText },
          { id: "interview", label: "Interview Prep Q&A", icon: MessageSquare },
          { id: "skills", label: "Skill Roadmap", icon: Target },
          { id: "salary", label: "Salary Negotiation", icon: DollarSign },
          { id: "roadmap", label: "Career Pathing", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                handleGenerateCoachAdvice(tab.id);
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                  : "bg-neutral-900/80 text-gray-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Trigger */}
      <div className="flex justify-end">
        <button
          onClick={() => handleGenerateCoachAdvice(activeTab)}
          disabled={isGenerating}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
        >
          <Brain className="w-4 h-4 text-amber-300" />
          <span>{isGenerating ? "Analyzing with AI..." : `Generate AI Advice for ${activeTab.toUpperCase()}`}</span>
        </button>
      </div>

      {/* Display Coach Output */}
      {aiCoachOutput && (
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5 animate-fade-in">
          <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center justify-between">
            <span>{aiCoachOutput.title}</span>
            {aiCoachOutput.scoreImprovement && (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {aiCoachOutput.scoreImprovement}
              </span>
            )}
          </h3>

          {/* Resume Tab Content */}
          {activeTab === "resume" && aiCoachOutput.improvements && (
            <div className="space-y-3">
              <p className="text-xs font-mono text-gray-400">Tailored Resume Action Items for {targetRole}:</p>
              <div className="space-y-2">
                {aiCoachOutput.improvements.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-200">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Q&A Tab Content */}
          {activeTab === "interview" && aiCoachOutput.questions && (
            <div className="space-y-4">
              {aiCoachOutput.questions.map((qObj: any, idx: number) => (
                <div key={idx} className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-indigo-300 flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 font-mono">Q{idx + 1}</span>
                    <span>{qObj.q}</span>
                  </div>
                  <p className="text-xs text-gray-300 pl-8 leading-relaxed border-l-2 border-indigo-500/30">
                    <span className="font-bold text-gray-400">Recommended Talking Points: </span>
                    {qObj.a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Skill Roadmap Tab Content */}
          {activeTab === "skills" && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400 uppercase">Recommended Skills to Master:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiCoachOutput.missingSkills?.map((s: string, idx: number) => (
                    <span key={idx} className="text-xs font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1 rounded-lg">
                      + {s}
                    </span>
                  ))}
                </div>
              </div>

              {aiCoachOutput.learningPath && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-gray-400 uppercase">Curated Learning Courses:</span>
                  {aiCoachOutput.learningPath.map((course: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl text-xs">
                      <div>
                        <div className="font-bold text-white">{course.title}</div>
                        <div className="text-gray-400 text-[10px] font-mono">{course.provider}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                        {course.priority} Priority
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Salary Negotiation Tab Content */}
          {activeTab === "salary" && (
            <div className="space-y-4">
              {aiCoachOutput.marketValueRangeUSD && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-emerald-400">AI Target Market Range</span>
                    <p className="text-xl font-extrabold text-white mt-1">
                      {formatCurrency(aiCoachOutput.marketValueRangeUSD.min)} — {formatCurrency(aiCoachOutput.marketValueRangeUSD.max)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-gray-400">Current Base</span>
                    <p className="text-sm font-bold text-gray-300">{formatCurrency(currentSalaryUSD)}</p>
                  </div>
                </div>
              )}

              {aiCoachOutput.negotiationTips && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-gray-400 uppercase">Negotiation Tactics:</span>
                  {aiCoachOutput.negotiationTips.map((tip: string, idx: number) => (
                    <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-200 flex items-start space-x-2">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Career Pathing Tab Content */}
          {activeTab === "roadmap" && aiCoachOutput.milestones && (
            <div className="space-y-3">
              {aiCoachOutput.milestones.map((m: any, idx: number) => (
                <div key={idx} className="p-4 bg-black/50 border border-white/10 rounded-xl flex items-start space-x-4">
                  <div className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-mono font-bold shrink-0">
                    {m.year}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{m.target}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
