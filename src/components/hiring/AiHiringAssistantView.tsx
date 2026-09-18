import React, { useState } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  Send, 
  RefreshCw, 
  FileText, 
  Search, 
  Mail, 
  TrendingUp, 
  HelpCircle,
  ArrowRight,
  Loader2,
  Bot
} from "lucide-react";

interface AiHiringAssistantViewProps {
  onInsertIntoJob?: (text: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export default function AiHiringAssistantView({
  onInsertIntoJob,
  onNavigateTab
}: AiHiringAssistantViewProps) {
  const [activeTask, setActiveTask] = useState<
    "jd" | "search_query" | "outreach" | "campaign" | "screening"
  >("jd");

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const taskConfigs = {
    jd: {
      label: "Generate Job Description",
      icon: FileText,
      placeholder: "e.g. Senior Backend Architect with 5+ yrs in Node.js, Microservices, and Redis for a high-growth fintech startup...",
      systemPrompt: "You are an enterprise technical recruiter and talent advisor for AIJOBS. Draft a comprehensive, modern Job Description with Role Overview, Responsibilities, Technical Requirements, and Benefits in clear Markdown.",
      suggestionChips: [
        "Full Stack React & Node Engineer (3-5 yrs)",
        "AI/ML Research Scientist (PyTorch, Gemini)",
        "VP of Engineering (Scale-up)"
      ]
    },
    search_query: {
      label: "Generate Candidate Search Query",
      icon: Search,
      placeholder: "e.g. Find candidates who know Go and Kubernetes and worked in cloud infrastructure in Bengaluru...",
      systemPrompt: "You are a Boolean sourcing expert. Generate high-precision search keywords, Boolean syntax queries (AND, OR, NOT), and ATS skill synonym lists for recruiters.",
      suggestionChips: [
        "Go + Kubernetes + Cloud Native",
        "React + Design Systems + Next.js",
        "DevOps Engineer (Terraform, AWS, CI/CD)"
      ]
    },
    outreach: {
      label: "Generate Recruiter Outreach Message",
      icon: Mail,
      placeholder: "e.g. Reach out to a passive senior frontend engineer at a tier-1 product firm for a principal engineer role...",
      systemPrompt: "You are a top executive talent partner. Write a high-converting, personalized, respectful LinkedIn/Email recruiter outreach message that highlights company impact, modern tech stack, and clear next steps.",
      suggestionChips: [
        "Direct LinkedIn InMail (Casual & Impactful)",
        "Executive CXO Outreach",
        "Follow-up for Unresponsive Candidate"
      ]
    },
    campaign: {
      label: "Generate Hiring Campaign Summary",
      icon: TrendingUp,
      placeholder: "e.g. Q3 Engineering expansion hiring 15 developers across frontend, backend, and DevOps...",
      systemPrompt: "Generate a strategic hiring campaign summary for leadership, detailing timelines, sourcing channels, expected pipeline volume, and interview stages.",
      suggestionChips: [
        "Campus & Early-Career Drive",
        "Q3 Scale-up: 10 Engineers",
        "Diversity & Inclusion Hiring Plan"
      ]
    },
    screening: {
      label: "Suggest Screening Questions",
      icon: HelpCircle,
      placeholder: "e.g. Core technical and behavioral screening questions for a Lead Cloud Security Engineer...",
      systemPrompt: "Suggest 5 rigorous, practical screening questions (3 technical domain questions and 2 behavioral/cultural alignment questions) with evaluation benchmarks for recruiters.",
      suggestionChips: [
        "Cloud Security & DevSecOps",
        "React Performance & Architecture",
        "Product Manager Prioritization"
      ]
    }
  };

  const currentConfig = taskConfigs[activeTask];

  const handleGenerate = async (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim()) {
      setErrorMsg("Please enter a prompt or pick a suggestion chip.");
      return;
    }
    setErrorMsg("");
    setIsGenerating(true);
    setCopied(false);

    try {
      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: textToRun,
          systemPrompt: currentConfig.systemPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.responseText || data.reply || data.content || "Generated response received.";
        setGeneratedOutput(responseText);
      } else {
        // Fallback generator with tailored template
        setGeneratedOutput(generateFallbackContent(activeTask, textToRun));
      }
    } catch (err: any) {
      setGeneratedOutput(generateFallbackContent(activeTask, textToRun));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFallbackContent = (task: string, query: string) => {
    if (task === "jd") {
      return `### Requisition: ${query}

#### Position Overview
We are looking for an exceptional professional to join AIJOBS partner enterprise team. In this role, you will take ownership of architectural decisions, collaborate closely with cross-functional partners, and build mission-critical products.

#### Core Responsibilities
- Architect, build, and deploy reliable, highly available production features.
- Partner with product management and engineering leadership to translate roadmaps into technical specifications.
- Champion code quality, unit testing, and continuous delivery best practices.

#### Required Qualifications
- Proven track record delivering production systems at scale.
- Deep hands-on experience in modern technology stacks relevant to ${query}.
- Exceptional analytical, problem-solving, and communication skills.

#### Compensation & Benefits
- Competitive market CTC with performance bonus.
- Premium family medical insurance & wellness allowance.
- Flexible hybrid working schedule and professional development budget.`;
    }

    if (task === "outreach") {
      return `Subject: Leadership opportunity: ${query}

Hi [Candidate Name],

I came across your impressive work in modern systems engineering and was thoroughly impressed by your background.

At [Company Name], we are currently assembling a high-caliber team to tackle [Key Engineering Challenge], and your experience aligns remarkably well with what we're building.

We offer:
• Direct architectural autonomy and high engineering density
• Competitive compensation (top-percentile base + equity)
• Flexible hybrid setup

Would you be open to an introductory 15-minute conversation this Thursday or Friday to explore if this might be an exciting career leap for you?

Warm regards,
[Your Name]
AIJOBS Hiring Partner`;
    }

    if (task === "search_query") {
      return `### Sourcing Blueprint for: ${query}

#### Primary Boolean Search String:
\`("React" OR "React.js") AND ("TypeScript" OR "TS") AND ("Next.js" OR "Redux") AND ("Node.js" OR "Backend") AND NOT ("Intern" OR "Fresher")\`

#### Core Keywords & Synonyms:
- **Languages:** TypeScript, JavaScript, ES6+, HTML5, CSS3
- **Frameworks:** React, Next.js, Redux Toolkit, Tailwind CSS
- **Engineering Practices:** Micro-frontends, Webpack, Vite, CI/CD, Jest

#### Target Company Archetypes:
- B2B SaaS Series B-D Startups
- High-Traffic E-commerce & FinTech Engines`;
    }

    return `### Screening Questionnaire for ${query}

1. **Architecture & Design:** Can you walk us through the most technically complex feature you shipped recently, and how you ensured its scalability and latency under load?
2. **Domain Mastery:** What are the key performance bottlenecks you typically watch out for when developing in your primary stack?
3. **Problem Solving:** Describe a situation where a production incident occurred. How did you triage, resolve, and prevent future recurrences?
4. **Collaboration:** How do you approach constructive code reviews and disagreements over architectural choices?
5. **Availability & Alignment:** What is your notice period and what are your primary motivators for your next career move?`;
  };

  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="ai-hiring-assistant-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI HIRING ASSISTANT • POWERED BY GEMINI</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">AI Hiring Assistant</h2>
          <p className="text-xs text-slate-400">Generate enterprise JDs, candidate search queries, outreach letters, and screening questions</p>
        </div>
      </div>

      {/* Mode Selection Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(taskConfigs) as (keyof typeof taskConfigs)[]).map((key) => {
          const cfg = taskConfigs[key];
          const IconComp = cfg.icon;
          const isActive = activeTask === key;

          return (
            <button
              key={key}
              onClick={() => {
                setActiveTask(key);
                setGeneratedOutput("");
                setErrorMsg("");
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? "text-white" : "text-cyan-400"}`} />
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompt Box Container */}
      <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        
        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Suggested Prompts:</span>
          {currentConfig.suggestionChips.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setPrompt(chip);
                handleGenerate(chip);
              }}
              className="text-[11px] px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 border border-white/5 transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={currentConfig.placeholder}
            className="w-full p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 leading-relaxed"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 font-mono">{errorMsg}</p>
        )}

        {/* Generate CTA Button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Press generate to stream synthesized results
          </span>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Synthesizing with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Generate with AI</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Generated Response Card */}
      {generatedOutput && (
        <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-cyan-500/30 backdrop-blur-md shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Gemini Synthesized Output
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              {activeTask === "jd" && onInsertIntoJob && (
                <button
                  onClick={() => {
                    onInsertIntoJob(generatedOutput);
                    onNavigateTab("post-job");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Use in New Job Post →
                </button>
              )}

              <button
                onClick={() => handleGenerate()}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                title="Regenerate"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0e0a14] border border-white/5 text-slate-200 text-xs sm:text-sm font-sans whitespace-pre-wrap leading-relaxed">
            {generatedOutput}
          </div>
        </div>
      )}

    </div>
  );
}
