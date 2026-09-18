import React, { useState } from "react";
import { 
  PlusCircle, 
  FileText, 
  Copy, 
  Sparkles, 
  X, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { CompanyJob } from "../employer/EmployerTypes";

interface PostJobMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (mode: "new" | "template" | "reuse" | "ai", data?: any) => void;
  existingJobs: CompanyJob[];
}

export default function PostJobMenuModal({
  isOpen,
  onClose,
  onSelectOption,
  existingJobs
}: PostJobMenuModalProps) {
  const [selectedMode, setSelectedMode] = useState<"menu" | "templates" | "reuse" | "ai">("menu");

  // AI Generation local state
  const [aiTitle, setAiTitle] = useState("");
  const [aiExp, setAiExp] = useState("3-5 Years");
  const [aiSkills, setAiSkills] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  if (!isOpen) return null;

  const jobTemplates = [
    {
      id: "fullstack_eng",
      title: "Senior Full Stack Engineer (React & Node.js)",
      department: "Engineering",
      employmentType: "Full-time",
      experienceLevel: "3-5 Years",
      location: "Bengaluru (Hybrid)",
      workMode: "Hybrid",
      salaryMin: "18,00,000",
      salaryMax: "26,00,000",
      openings: 2,
      skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
      description: "We are seeking an experienced Full Stack Engineer to build high-scale, reliable cloud features.",
      responsibilities: "• Build scalable frontend and backend APIs\n• Collaborate with designers and product managers\n• Maintain high test coverage and system security",
      benefits: "• Comprehensive Medical Insurance\n• Annual Learning Allowance\n• Flexible Hybrid Schedule"
    },
    {
      id: "ai_engineer",
      title: "AI & Machine Learning Engineer",
      department: "AI & Data Labs",
      employmentType: "Full-time",
      experienceLevel: "3-6 Years",
      location: "Remote (India)",
      workMode: "Remote",
      salaryMin: "20,00,000",
      salaryMax: "32,00,000",
      openings: 1,
      skills: ["Python", "PyTorch", "Gemini API", "Vector Databases", "FastAPI"],
      description: "Help build next-generation autonomous AI agents, semantic search indexing, and LLM orchestration layers.",
      responsibilities: "• Implement generative AI workflows with Gemini models\n• Optimize embedding retrieval and context engineering\n• Deploy scalable microservices on GCP",
      benefits: "• Top-tier Equipment Budget\n• Performance Bonus & ESOPs\n• Remote Work Setup Allowance"
    },
    {
      id: "product_manager",
      title: "Technical Product Manager",
      department: "Product",
      employmentType: "Full-time",
      experienceLevel: "4-7 Years",
      location: "Mumbai / Bengaluru",
      workMode: "Hybrid",
      salaryMin: "22,00,000",
      salaryMax: "30,00,000",
      openings: 1,
      skills: ["Product Strategy", "Agile / Scrum", "Data Analytics", "API Architecture"],
      description: "Lead product discovery, sprint roadmaps, and feature rollout for our high-velocity enterprise platforms.",
      responsibilities: "• Translate business metrics into detailed user epics\n• Coordinate cross-functional releases across engineering and design\n• Drive user feedback loops and core retention metrics",
      benefits: "• Health & Wellness Programs\n• Annual Paid Time Off\n• Executive Mentorship"
    },
    {
      id: "sales_lead",
      title: "Enterprise Account Executive (B2B SaaS)",
      department: "Sales & Growth",
      employmentType: "Full-time",
      experienceLevel: "3-6 Years",
      location: "Delhi NCR / Bengaluru",
      workMode: "On-site",
      salaryMin: "12,00,000",
      salaryMax: "20,00,000",
      openings: 3,
      skills: ["Enterprise Sales", "B2B SaaS", "Pipeline Management", "Contract Negotiation"],
      description: "Drive corporate recruitment subscriptions and enterprise hiring solutions across mid-market accounts.",
      responsibilities: "• Own full-cycle enterprise sales from outreach to close\n• Deliver tailored product demonstrations to HR leaders and CXOs\n• Achieve monthly and quarterly ARR quota benchmarks",
      benefits: "• Uncapped Quarterly Commissions\n• Travel & Client Entertainment Allowance\n• Fast-track Leadership Path"
    }
  ];

  const handleGenerateAi = async () => {
    if (!aiTitle.trim()) {
      setAiError("Please specify a target Job Title");
      return;
    }
    setAiError("");
    setIsGeneratingAi(true);

    try {
      const prompt = `Generate a professional, structured Job Description for:
Job Title: ${aiTitle}
Experience Required: ${aiExp}
Key Skills: ${aiSkills || "Industry standard"}

Return JSON format:
{
  "description": "2-3 sentences overview",
  "responsibilities": "3-4 bullet points starting with •",
  "benefits": "3-4 bullet points starting with •",
  "screeningQuestions": ["Question 1", "Question 2", "Question 3"]
}`;

      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: prompt,
          systemPrompt: "You are an elite enterprise hiring assistant and technical recruiter. Output valid JSON only."
        })
      });

      let genData: any = null;
      if (res.ok) {
        const json = await res.json();
        const text = json.responseText || json.reply || json.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            genData = JSON.parse(jsonMatch[0]);
          } catch (e) {}
        }
      }

      if (!genData) {
        // Fallback robust structure if LLM response couldn't be parsed
        genData = {
          description: `We are looking for an experienced ${aiTitle} to join our high-growth organization. You will take ownership of crucial deliverables and collaborate closely with cross-functional peers.`,
          responsibilities: `• Drive end-to-end execution and system design for ${aiTitle} responsibilities.\n• Ensure high standards of quality, security, and velocity across team milestones.\n• Mentor teammates and contribute to strategic technical and business roadmaps.`,
          benefits: `• Competitive CTC with performance bonus\n• Comprehensive Family Medical Insurance\n• Flexible hybrid working model and professional learning credits.`,
          screeningQuestions: [
            `How many years of relevant experience do you have in ${aiTitle}?`,
            `What is your current notice period and earliest availability?`,
            `Are you comfortable working in our specified work mode and location?`
          ]
        };
      }

      onSelectOption("ai", {
        title: aiTitle,
        experienceLevel: aiExp,
        skills: aiSkills.split(",").map(s => s.trim()).filter(Boolean),
        description: genData.description,
        responsibilities: genData.responsibilities,
        benefits: genData.benefits,
        screeningQuestions: genData.screeningQuestions || []
      });
      onClose();
    } catch (err: any) {
      setAiError(err.message || "Failed to generate JD. Please try again.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl bg-[#17111F] border border-purple-500/30 p-6 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider uppercase block">
              AIJOBS Hiring Suite
            </span>
            <h3 className="text-lg font-black text-white">Post a New Job Opening</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Views */}
        {selectedMode === "menu" && (
          <div className="py-4 space-y-3">
            <p className="text-xs text-slate-300">Choose how you'd like to construct this job requisition:</p>

            {/* Option 1: Clean Blank Form */}
            <button
              onClick={() => {
                onSelectOption("new");
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/40 flex items-start gap-4 text-left transition-all group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">Start with New Post</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Create a customized requisition from scratch with our step-by-step verified workflow.
                </p>
              </div>
            </button>

            {/* Option 2: Use Template */}
            <button
              onClick={() => setSelectedMode("templates")}
              className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-purple-600/10 border border-white/10 hover:border-purple-500/40 flex items-start gap-4 text-left transition-all group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">Use Job Template</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    4 Pre-built
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Choose pre-filled enterprise templates for Engineering, Product, Sales, and AI.
                </p>
              </div>
            </button>

            {/* Option 3: Reuse Previous Job */}
            <button
              onClick={() => setSelectedMode("reuse")}
              className="w-full p-4 rounded-2xl bg-white/[0.03] hover:bg-cyan-600/10 border border-white/10 hover:border-cyan-500/40 flex items-start gap-4 text-left transition-all group cursor-pointer"
            >
              <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <Copy className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">Reuse Previous Job</span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {existingJobs.length} Available
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Clone requirements, screening rules, and salary parameters from an existing job.
                </p>
              </div>
            </button>

            {/* Option 4: AI Assisted Job Description */}
            <button
              onClick={() => setSelectedMode("ai")}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-blue-950/40 hover:from-cyan-900/50 hover:to-purple-900/50 border border-cyan-500/30 flex items-start gap-4 text-left transition-all group cursor-pointer shadow-lg"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white group-hover:scale-110 transition-transform shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-cyan-300">AI Assisted Job Description</span>
                  <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                    GEMINI POWERED
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Provide role and skills; Gemini drafts requirements, responsibilities & screening questions in seconds.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* View: Templates */}
        {selectedMode === "templates" && (
          <div className="py-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Select an Enterprise Job Template:</span>
              <button 
                onClick={() => setSelectedMode("menu")}
                className="text-xs text-cyan-400 hover:underline"
              >
                ← Back
              </button>
            </div>
            {jobTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => {
                  onSelectOption("template", tmpl);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">{tmpl.title}</span>
                  <span className="text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10">
                    {tmpl.department}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1">{tmpl.description}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tmpl.skills.map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View: Reuse Existing Job */}
        {selectedMode === "reuse" && (
          <div className="py-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Select a Job to Clone:</span>
              <button 
                onClick={() => setSelectedMode("menu")}
                className="text-xs text-cyan-400 hover:underline"
              >
                ← Back
              </button>
            </div>
            {existingJobs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <p className="text-sm font-bold text-slate-400">No previous jobs posted yet</p>
                <p className="text-xs text-slate-500">Post your first job to enable quick 1-click requisition cloning.</p>
                <button
                  onClick={() => {
                    onSelectOption("new");
                    onClose();
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Create New Job
                </button>
              </div>
            ) : (
              existingJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => {
                    onSelectOption("reuse", j);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white">{j.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 uppercase">
                      {j.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{j.location} • {j.experience || "3-5 Yrs"}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* View: AI Generator */}
        {selectedMode === "ai" && (
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Job Description Generator</span>
              </span>
              <button 
                onClick={() => setSelectedMode("menu")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>
            </div>

            {aiError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
                {aiError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Job Title *</label>
                <input
                  type="text"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Architect, Growth Marketing Lead..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Experience Level</label>
                  <select
                    value={aiExp}
                    onChange={(e) => setAiExp(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="0-1 Years">0-1 Years (Entry)</option>
                    <option value="1-3 Years">1-3 Years (Junior)</option>
                    <option value="3-5 Years">3-5 Years (Mid-Senior)</option>
                    <option value="5-8 Years">5-8 Years (Lead)</option>
                    <option value="8+ Years">8+ Years (Principal / Director)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Key Tech Skills (comma separated)</label>
                  <input
                    type="text"
                    value={aiSkills}
                    onChange={(e) => setAiSkills(e.target.value)}
                    placeholder="React, AWS, Python, Kubernetes"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateAi}
                disabled={isGeneratingAi}
                className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini is generating requisition...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-cyan-200" />
                    <span>Generate & Autofill Requisition</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
