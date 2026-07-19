import { useState } from "react";
import { 
  Brain, ShieldAlert, Sparkles, CheckCircle, RefreshCw, Key, 
  Settings, Play, HelpCircle, Code, MessageSquare, Sliders, Database, Save
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import AiInsightsPanel from "../AiInsightsPanel";

interface AiControlCenterProps {
  onRefresh: () => void;
}

export default function AiControlCenter({
  onRefresh
}: AiControlCenterProps) {
  const [activeTab, setActiveTab] = useState<"engine" | "prompts" | "questions">("engine");
  const [isSaving, setIsSaving] = useState(false);

  // Model parameters state
  const [modelConfig, setModelConfig] = useState({
    analyzerModel: "gemini-2.5-flash",
    interviewModel: "gemini-2.5-pro",
    analyzerTemp: 0.15,
    coachTemp: 0.7,
    matchThreshold: 75,
    geminiKey: "•••••••••••••••••••••••••••••••••••••"
  });

  // Prompt templates state
  const [prompts, setPrompts] = useState({
    resumeAnalyzer: `You are a professional recruiting ATS resume analyzer. Parse the following curriculum vitae:
- Standardize all technical skill matrices.
- Calculate years of experience contextually.
- Output a JSON structure with standardized fields.`,
    careerCoach: `You are a premium career development mentor. Guide the candidate on learning recommendations, portfolio improvements, and interview strategy. Adopt an encouraging, professional, and insight-driven tone.`,
    jobMatcher: `Calculate a percentage match score (0-100) between the candidate's skills and the job requirement. Standardize synonyms like 'JS' and 'JavaScript' contextually.`
  });

  // Question bank state
  const [questionBank, setQuestionBank] = useState([
    { id: "q_01", tech: "React", question: "Explain the reconciliation algorithm and why keys are necessary in React rendering cycles.", difficulty: "Senior" },
    { id: "q_02", tech: "TypeScript", question: "What is the difference between interface extension and type intersections?", difficulty: "Mid" },
    { id: "q_03", tech: "System Design", question: "How would you design a high-throughput, low-latency resume parsing microservice?", difficulty: "Lead" },
    { id: "q_04", tech: "Node.js", question: "Explain the Node.js event loop phase execution sequence.", difficulty: "Senior" }
  ]);

  const [newQuestion, setNewQuestion] = useState({ tech: "React", question: "", difficulty: "Mid" });

  const handleSaveEngine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Write system settings doc
      await setDoc(doc(db, "system_settings", "global_config"), {
        aiConfig: {
          analyzerModel: modelConfig.analyzerModel,
          interviewModel: modelConfig.interviewModel,
          analyzerTemperature: modelConfig.analyzerTemp,
          matchingThreshold: modelConfig.matchThreshold
        }
      }, { merge: true });

      // Create security audit log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: "Super Admin",
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "AI",
        description: `Upgraded LLM parameters & updated baseline matching threshold to ${modelConfig.matchThreshold}%.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert("🎉 AI Engine baseline parameters updated successfully on Cloud Server.");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error syncing engine settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrompts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Sync templates
      await setDoc(doc(db, "system_settings", "prompt_templates"), prompts);

      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: "Super Admin",
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "AI",
        description: "Re-engineered System Instructions for AI Resume Analyzer & Career Coach prompts.",
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert("🎉 Prompt engineering directives successfully synchronized across platform agents.");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.question.trim()) return;

    const qId = "q_" + Math.random().toString(36).substr(2, 9);
    setQuestionBank([
      ...questionBank,
      { id: qId, ...newQuestion }
    ]);
    setNewQuestion({ tech: "React", question: "", difficulty: "Mid" });
    alert("Question added to local question bank.");
  };

  return (
    <div className="space-y-6" id="ai-control-center-vault">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span>AI Brain, Models & Directives Controller</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Configure system inference thresholds, update prompt directives, and curate mock technical question banks.
          </p>
        </div>

        {/* Tabs switcher */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveTab("engine")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "engine" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Core Engine
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "prompts" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Prompt Templates
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "questions" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Mock Question Bank
          </button>
        </div>
      </div>

      {activeTab === "engine" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main engine configuration form */}
          <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Baseline System Parameters</span>
            </h4>

            <form onSubmit={handleSaveEngine} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Resume Parsing Model</label>
                  <select
                    value={modelConfig.analyzerModel}
                    onChange={e => setModelConfig({ ...modelConfig, analyzerModel: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Research)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Interview Agent Model</label>
                  <select
                    value={modelConfig.interviewModel}
                    onChange={e => setModelConfig({ ...modelConfig, interviewModel: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Complex Reasoning)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-gray-400">
                    <label className="font-mono">ATS Analyzer Temp</label>
                    <span className="font-bold text-white">{modelConfig.analyzerTemp}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={modelConfig.analyzerTemp}
                    onChange={e => setModelConfig({ ...modelConfig, analyzerTemp: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Lower values ensure rigorous deterministic scoring.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-gray-400">
                    <label className="font-mono">Career Mentor Temp</label>
                    <span className="font-bold text-white">{modelConfig.coachTemp}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={modelConfig.coachTemp}
                    onChange={e => setModelConfig({ ...modelConfig, coachTemp: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">Higher values trigger dynamic, creative advisory logs.</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-gray-400">
                  <label className="font-mono">AI Matching Threshold</label>
                  <span className="font-extrabold text-indigo-400 font-mono text-xs">{modelConfig.matchThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={modelConfig.matchThreshold}
                  onChange={e => setModelConfig({ ...modelConfig, matchThreshold: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-[9px] text-gray-500">Candidates must exceed this score during semantic calculations to be flagged as 'Highly Recommended'.</p>
              </div>

              {/* Secure API Config inputs */}
              <div className="space-y-1">
                <label className="text-gray-400 block font-mono flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-pink-400" />
                  <span>Secure Platform API Key (Gemini Core Proxy)</span>
                </label>
                <input
                  type="password"
                  disabled
                  value={modelConfig.geminiKey}
                  className="w-full bg-neutral-950/50 border border-white/5 rounded-lg px-2.5 py-2 text-gray-500 font-mono"
                />
                <p className="text-[9px] text-gray-500">Managed via backend environment variables safely to prevent client-side leaks.</p>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Commit Engine Configuration"}</span>
              </button>

            </form>
          </div>

          {/* Core notice explaining server keys */}
          <div className="space-y-6">
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-pink-400" />
                <span>Security Notice</span>
              </h4>

              <p className="text-[11px] text-gray-300 leading-relaxed">
                Our Gemini API services route requests through secure backend endpoints to shield corporate assets.
              </p>
              <div className="p-3 bg-indigo-500/10 border border-indigo-400/20 rounded-lg text-[10px] text-gray-400 space-y-1 font-mono">
                <strong>Gateway Standards:</strong>
                <p>• API Shielding: Active</p>
                <p>• Response Caching: Active</p>
                <p>• Daily Token Cap: 5,000k</p>
              </div>
            </div>
          </div>

          {/* Real-time Candidate AI Insights & Analytical Ranks panel */}
          <div className="lg:col-span-3">
            <AiInsightsPanel />
          </div>

        </div>
      )}

      {activeTab === "prompts" && (
        <form onSubmit={handleSavePrompts} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Agent Directives & System Prompts</h4>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs text-white font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Syncing..." : "Sync Prompts"}</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">ATS Resume Parsing Instructions</label>
              <textarea
                value={prompts.resumeAnalyzer}
                onChange={e => setPrompts({ ...prompts, resumeAnalyzer: e.target.value })}
                className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-normal resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">AI Career Coach Directives</label>
              <textarea
                value={prompts.careerCoach}
                onChange={e => setPrompts({ ...prompts, careerCoach: e.target.value })}
                className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-normal resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block font-mono">Job Matching Rules Prompt</label>
              <textarea
                value={prompts.jobMatcher}
                onChange={e => setPrompts({ ...prompts, jobMatcher: e.target.value })}
                className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-normal resize-none"
              />
            </div>
          </div>
        </form>
      )}

      {activeTab === "questions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List existing items in matrix */}
          <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Evaluation Bank Matrix</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {questionBank.map((q) => (
                <div key={q.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-mono">
                      <span className="text-indigo-400 font-bold">{q.tech}</span>
                      <span className="px-1.5 py-0.5 bg-neutral-950 rounded text-gray-400 font-bold uppercase">{q.difficulty}</span>
                    </div>
                    <p className="text-gray-300 leading-normal font-medium">{q.question}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add a question */}
          <div>
            <form onSubmit={handleAddQuestion} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
              <h4 className="font-extrabold text-white flex items-center gap-1.5">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>Register SDE Question</span>
              </h4>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Domain / Skill Group</label>
                <select
                  value={newQuestion.tech}
                  onChange={e => setNewQuestion({ ...newQuestion, tech: e.target.value })}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                >
                  <option value="React">React Framework</option>
                  <option value="TypeScript">TypeScript Compilers</option>
                  <option value="Python">Python & AI Sourcing</option>
                  <option value="Node.js">Node.js Framework</option>
                  <option value="System Design">System Architecture</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Difficulty tier</label>
                <select
                  value={newQuestion.difficulty}
                  onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                >
                  <option value="Junior">Junior (Fresher)</option>
                  <option value="Mid">Mid Level</option>
                  <option value="Senior">Senior Lead</option>
                  <option value="Lead">Principal / Solutions</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Question direct string</label>
                <textarea
                  required
                  value={newQuestion.question}
                  onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="e.g. Explain memory leaks in useEffect..."
                  className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[10px] resize-none focus:border-indigo-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <span>Append Question to Bank</span>
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
