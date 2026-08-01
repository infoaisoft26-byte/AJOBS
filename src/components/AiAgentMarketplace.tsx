import { Bot, Search, Send, ShieldCheck, Sparkles, Star, ToggleLeft, ToggleRight, X } from "lucide-react";


import { GoogleGenAI } from "@google/genai";

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  description: string;
  category: "candidate" | "recruiter" | "employer" | "admin";
  avatar: string;
  color: string;
  enabled: boolean;
  systemPrompt: string;
  capabilities: string[];
  rating: number;
  usersCount: number;
}

const DEFAULT_AGENTS: AgentDef[] = [
  {
    id: "resume-reviewer",
    name: "Resume Reviewer AI",
    role: "ATS & Formatting Auditor",
    description: "Scans resumes against top ATS rules, identifies formatting defects, keyword voids, and provides instant score improvements.",
    category: "candidate",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    color: "from-blue-600 to-cyan-600",
    enabled: true,
    rating: 4.9,
    usersCount: 14200,
    capabilities: ["ATS Parsing Audit", "Keyword Gap Injection", "Formatting Compliance", "Score Optimization"],
    systemPrompt: "You are the Resume Reviewer AI. Audit candidate resumes, highlight missing keywords, evaluate ATS compliance out of 100, and provide clear actionable rewrites."
  },
  {
    id: "resume-writer",
    name: "Resume Writer AI",
    role: "Executive Resume Architect",
    description: "Generates high-impact professional resume bullet points, professional summaries, and tailored achievement statements.",
    category: "candidate",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    color: "from-indigo-600 to-purple-600",
    enabled: true,
    rating: 4.95,
    usersCount: 18900,
    capabilities: ["Bullet Point Rewriting", "Executive Summaries", "XYZ Achievement Metrics", "Custom Tailoring"],
    systemPrompt: "You are the Resume Writer AI. Draft professional resume content with metric-driven accomplishments using the Google XYZ formula."
  },
  {
    id: "career-coach",
    name: "Career Coach AI",
    role: "Strategic Career Growth Advisor",
    description: "Provides personalized career transition roadmaps, upskilling paths, industry benchmark guidance, and long-term goal setting.",
    category: "candidate",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    color: "from-emerald-600 to-teal-600",
    enabled: true,
    rating: 4.88,
    usersCount: 22400,
    capabilities: ["Career Transition Planning", "Skill Gap Identification", "Milestone Mapping", "Industry Benchmarking"],
    systemPrompt: "You are the Career Coach AI. Guide professionals through high-yield career decisions, promotion strategies, and skill acquisition."
  },
  {
    id: "interview-coach",
    name: "Interview Coach AI",
    role: "STAR Method & System Design Coach",
    description: "Simulates high-pressure interviews, conducts STAR behavioral drills, technical Q&A, and delivers real-time answer critiques.",
    category: "candidate",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    color: "from-amber-600 to-orange-600",
    enabled: true,
    rating: 4.92,
    usersCount: 19800,
    capabilities: ["STAR Method Drills", "Technical System Design", "Live Answer Critique", "Confidence Boosting"],
    systemPrompt: "You are the Interview Coach AI. Drill candidates on STAR format answers, mock questions, and system design logic."
  },
  {
    id: "salary-advisor",
    name: "Salary Advisor AI",
    role: "Compensation & Equity Analyst",
    description: "Analyzes global market CTC benchmarks, equity grants, negotiation strategies, and provides customized counter-offer templates.",
    category: "candidate",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
    color: "from-green-600 to-emerald-600",
    enabled: true,
    rating: 4.87,
    usersCount: 12100,
    capabilities: ["CTC Benchmarking", "Counter-Offer Scripting", "Equity Valuation", "Perks Negotiation"],
    systemPrompt: "You are the Salary Advisor AI. Evaluate compensation offers, provide market percentiles, and generate polite, effective negotiation scripts."
  },
  {
    id: "hiring-assistant",
    name: "Hiring Assistant AI",
    role: "Automated Screening & Shortlisting Agent",
    description: "Scans applicant pools, ranks candidates by multi-factor match algorithms, and generates candidate comparison briefs.",
    category: "recruiter",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80",
    color: "from-purple-600 to-pink-600",
    enabled: true,
    rating: 4.94,
    usersCount: 8900,
    capabilities: ["Multi-Factor Shortlisting", "Match Ratio Calculation", "Candidate Summaries", "Screening Question Generation"],
    systemPrompt: "You are the Hiring Assistant AI. Rank job candidates, analyze skill overlaps, and write concise executive shortlisting briefs."
  },
  {
    id: "recruiter-assistant",
    name: "Recruiter Assistant AI",
    role: "Candidate Outreach & Pipeline Agent",
    description: "Drafts personalized recruiter outreach emails, LinkedIn InMail messages, automated interview scheduling notes, and follow-ups.",
    category: "recruiter",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&q=80",
    color: "from-rose-600 to-red-600",
    enabled: true,
    rating: 4.91,
    usersCount: 9400,
    capabilities: ["InMail Generation", "Cold Outreach Emailing", "Scheduling Messages", "Rejection Feedback Letters"],
    systemPrompt: "You are the Recruiter Assistant AI. Craft compelling candidate outreach messages, response templates, and professional status updates."
  },
  {
    id: "employer-assistant",
    name: "Employer Assistant AI",
    role: "Job Description & Culture Architect",
    description: "Generates inclusive, SEO-optimized job descriptions, interview scorecards, compensation band structures, and employer brand pitch decks.",
    category: "employer",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=150&q=80",
    color: "from-cyan-600 to-blue-700",
    enabled: true,
    rating: 4.96,
    usersCount: 6700,
    capabilities: ["SEO Job Descriptions", "Bias-Free Writing", "Evaluation Rubrics", "Culture Fit Profiling"],
    systemPrompt: "You are the Employer Assistant AI. Draft high-converting, bias-free job descriptions, rubrics, and hiring plans."
  },
  {
    id: "hr-assistant",
    name: "HR Assistant AI",
    role: "Corporate HR Policy & Onboarding Agent",
    description: "Drafts formal offer letters, appointment letters, NDA documents, onboarding checklists, and handles employee policy queries.",
    category: "employer",
    avatar: "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&w=150&q=80",
    color: "from-violet-600 to-indigo-700",
    enabled: true,
    rating: 4.93,
    usersCount: 7800,
    capabilities: ["Offer Letter Drafting", "Onboarding Roadmaps", "HR Policy FAQ Response", "NDAs & Compliance Documents"],
    systemPrompt: "You are the HR Assistant AI. Draft official HR documents, onboarding schedules, and answer corporate policy questions with legal precision."
  }
];

interface AiAgentMarketplaceProps {
  userRole?: string;
  isAdmin?: boolean;
}

export default function AiAgentMarketplace({ userRole = "candidate", isAdmin = false }: AiAgentMarketplaceProps) {
  const [agents, setAgents] = useState<AgentDef[]>(DEFAULT_AGENTS);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAgentModal, setActiveAgentModal] = useState<AgentDef | null>(null);
  
  // Interactive Agent Chat state
  const [messages, setMessages] = useState<Array<{ sender: "user" | "agent"; text: string }>>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleAgentStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAgents(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleOpenAgentChat = (agent: AgentDef) => {
    if (!agent.enabled) return;
    setActiveAgentModal(agent);
    setMessages([
      {
        sender: "agent",
        text: `Hello! I am **${agent.name}** (${agent.role}). How can I assist you with your goals today?`
      }
    ]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeAgentModal) return;
    const userMsg = inputText.trim();
    setInputText("");
    
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-career-coach-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleType: activeAgentModal.id,
          targetRole: activeAgentModal.name,
          userMessage: userMsg,
          skills: [activeAgentModal.role]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data.coachAdvice?.responseText || data.responseText || `I have processed your request regarding **${userMsg}**. Here are my strategic recommendations:\n\n1. Ensure complete alignment with market standards.\n2. Keep metrics quantified.\n3. Leverage automated AI tools on AIJobs for immediate feedback.`;
        setMessages(prev => [...prev, { sender: "agent", text: responseText }]);
      } else {
        throw new Error("Failed to reach agent server endpoint.");
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: "agent",
          text: `Thank you for consulting **${activeAgentModal.name}**. I've analyzed your input: "${userMsg}".\n\n**Actionable Advice:**\n- Ensure quantifiable metrics are included in your inputs.\n- Cross-check with standard platform benchmarks.\n- Re-run ATS audits to maintain competitive scoring.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesCategory = activeCategoryFilter === "all" || agent.category === activeCategoryFilter;
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          agent.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-black border border-blue-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-bold mb-3">
              <Bot className="w-4 h-4 text-blue-400" />
              <span>MODULE 1 — AI AGENT MARKETPLACE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>AI Agent Store & Orchestrator</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Deploy specialized GenAI Agents tailored for candidate career growth, recruiter sourcing pipelines, and employer HR operations.
            </p>
          </div>

          {isAdmin && (
            <div className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-mono font-semibold flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Override Active: Enable/Disable Agents</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 border border-white/10 rounded-xl p-4">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Agents" },
            { id: "candidate", label: "Candidate AI" },
            { id: "recruiter", label: "Recruiter AI" },
            { id: "employer", label: "Employer & HR AI" }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategoryFilter === cat.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search AI agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            onClick={() => handleOpenAgentChat(agent)}
            className={`bg-neutral-900/90 border rounded-2xl p-5 space-y-4 shadow-xl transition-all duration-300 relative group cursor-pointer ${
              agent.enabled
                ? "border-white/10 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                : "border-red-900/30 opacity-60 bg-neutral-950"
            }`}
          >
            {/* Top Bar inside card */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-neutral-900 ${
                    agent.enabled ? "bg-emerald-500 animate-pulse" : "bg-gray-600"
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                    <span>{agent.name}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">{agent.role}</p>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={(e) => handleToggleAgentStatus(agent.id, e)}
                  className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title={agent.enabled ? "Disable Agent" : "Enable Agent"}
                >
                  {agent.enabled ? (
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-600" />
                  )}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
              {agent.description}
            </p>

            {/* Capabilities Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {agent.capabilities.slice(0, 3).map((cap, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 font-mono"
                >
                  {cap}
                </span>
              ))}
              {agent.capabilities.length > 3 && (
                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-400 font-mono">
                  +{agent.capabilities.length - 3}
                </span>
              )}
            </div>

            {/* Footer metrics & CTA */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{agent.rating}</span>
                </span>
                <span>{(agent.usersCount / 1000).toFixed(1)}k uses</span>
              </div>

              <span className={`font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider ${
                agent.enabled
                  ? "bg-blue-600/20 text-blue-300 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white transition-all"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {agent.enabled ? "Launch Chat" : "Disabled"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Chat Modal */}
      {activeAgentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-2xl w-full max-w-2xl h-[600px] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={activeAgentModal.avatar}
                  alt={activeAgentModal.name}
                  className="w-10 h-10 rounded-xl object-cover border border-white/20"
                />
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center space-x-1.5">
                    <span>{activeAgentModal.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono border border-blue-400/30">
                      LIVE AGENT
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">{activeAgentModal.role}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveAgentModal(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar bg-neutral-950">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white font-medium rounded-br-none shadow-lg"
                        : "bg-neutral-800 text-gray-200 border border-white/10 rounded-bl-none shadow-md font-sans"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-800 text-gray-400 p-3 rounded-2xl text-xs font-mono animate-pulse flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Agent processing query...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-white/10 bg-neutral-900 flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Ask ${activeAgentModal.name} anything...`}
                className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/20"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
