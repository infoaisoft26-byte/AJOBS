import {
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useState } from "react";

import { useGlobalMarketplace } from "../context/GlobalMarketplaceContext";

interface AiJobDescriptionGeneratorProps {
  onPostGeneratedJob?: (jobData: any) => void;
}

export default function AiJobDescriptionGenerator({ onPostGeneratedJob }: AiJobDescriptionGeneratorProps) {
  const { formatCurrency } = useGlobalMarketplace();
  const [roleTitle, setRoleTitle] = useState("Lead AI Infrastructure Engineer");
  const [requiredSkills, setRequiredSkills] = useState("Python, PyTorch, CUDA, Kubernetes, Distributed Systems, Ray");
  const [experienceLevel, setExperienceLevel] = useState("Senior (5+ Years)");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [location, setLocation] = useState("San Francisco, CA");
  const [salaryMinUSD, setSalaryMinUSD] = useState(140000);
  const [salaryMaxUSD, setSalaryMaxUSD] = useState(190000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJd, setGeneratedJd] = useState<any | null>(null);

  const handleGenerateJd = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai-generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle,
          requiredSkills: requiredSkills.split(",").map((s) => s.trim()),
          experienceLevel,
          workMode,
          location,
          salaryRange: `${formatCurrency(salaryMinUSD)} - ${formatCurrency(salaryMaxUSD)}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.jobDescription) {
        setGeneratedJd(data.jobDescription);
      } else {
        setGeneratedJd(getFallbackJd());
      }
    } catch (err) {
      console.error("AI JD Generator error:", err);
      setGeneratedJd(getFallbackJd());
    } finally {
      setIsGenerating(false);
    }
  };

  const getFallbackJd = () => ({
    title: roleTitle,
    summary: `We are seeking an exceptional ${roleTitle} to architect, scale, and maintain high-throughput enterprise AI pipelines and distributed GPU infrastructure.`,
    responsibilities: [
      "Design resilient microservices handling high-concurrency model inference and training workflows.",
      "Optimize CUDA acceleration, PyTorch distributed data parallel (DDP) pipelines, and Ray cluster orchestration.",
      "Partner with product and security leads to maintain SOC2 and GDPR compliant AI operations.",
    ],
    qualifications: [
      "5+ years hands-on experience in distributed systems and high-performance cloud infrastructure.",
      "Expertise in Python, Kubernetes, Docker, and GPU cluster monitoring.",
      "Strong background in low-latency API design and automated CI/CD deployment.",
    ],
    benefits: [
      `Competitive Compensation Package (${formatCurrency(salaryMinUSD)} - ${formatCurrency(salaryMaxUSD)})`,
      "Comprehensive Health, Dental, and Equity Grants",
      "Flexible Remote/Hybrid work setup with home office equipment stipend",
    ],
    seoKeywords: [roleTitle, "AI Infrastructure", "PyTorch", "Kubernetes", "Distributed Systems", "GPU Clusters"],
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/50 via-cyan-900/30 to-black border border-cyan-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SEO-OPTIMIZED AI JOB SPECIFICATION ENGINE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Job Description Generator</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Generate structured, high-conversion job descriptions optimized for search engines and top engineering candidate attraction.
            </p>
          </div>

          <button
            onClick={handleGenerateJd}
            disabled={isGenerating}
            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>Generate SEO Job Description</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruiter Input Form */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-white/10 pb-3">
            Role Parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 font-mono mb-1">Target Role Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Key Required Skills (Comma Separated)</label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-mono mb-1">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="Fresher (0-1 Years)">Fresher (0-1 Years)</option>
                <option value="Junior (1-3 Years)">Junior (1-3 Years)</option>
                <option value="Mid-Level (3-5 Years)">Mid-Level (3-5 Years)</option>
                <option value="Senior (5+ Years)">Senior (5+ Years)</option>
                <option value="Executive / Lead">Executive / Lead</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-mono mb-1">Work Mode</label>
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-mono mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 font-mono mb-1">Salary Min (USD)</label>
                <input
                  type="number"
                  value={salaryMinUSD}
                  onChange={(e) => setSalaryMinUSD(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-mono mb-1">Salary Max (USD)</label>
                <input
                  type="number"
                  value={salaryMaxUSD}
                  onChange={(e) => setSalaryMaxUSD(Number(e.target.value))}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Output Generated JD */}
        <div className="lg:col-span-2 bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white font-mono uppercase">
              Generated Job Spec & SEO Tags
            </h3>

            {generatedJd && onPostGeneratedJob && (
              <button
                onClick={() => onPostGeneratedJob(generatedJd)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold font-mono flex items-center space-x-1.5 shadow-lg cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publish to Live Jobs</span>
              </button>
            )}
          </div>

          {generatedJd ? (
            <div className="space-y-4 animate-fade-in text-xs">
              <div className="p-4 bg-black/50 border border-white/10 rounded-xl space-y-2">
                <h4 className="text-base font-bold text-white">{generatedJd.title}</h4>
                <p className="text-gray-300 leading-relaxed">{generatedJd.summary}</p>
              </div>

              {/* Responsibilities */}
              <div className="space-y-2">
                <span className="font-mono font-bold text-cyan-400 uppercase">Core Responsibilities:</span>
                <div className="space-y-1.5">
                  {generatedJd.responsibilities?.map((r: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Qualifications */}
              <div className="space-y-2 pt-2">
                <span className="font-mono font-bold text-indigo-400 uppercase">Required Qualifications:</span>
                <div className="space-y-1.5">
                  {generatedJd.qualifications?.map((q: string, idx: number) => (
                    <div key={idx} className="flex items-start space-x-2 text-gray-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Keywords */}
              {generatedJd.seoKeywords && (
                <div className="pt-2">
                  <span className="font-mono text-[10px] text-gray-400 uppercase">SEO Meta Keywords:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {generatedJd.seoKeywords.map((kw: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-0.5 bg-black border border-white/10 text-gray-300 rounded font-mono text-[10px]">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-gray-500 font-mono">
              Click 'Generate SEO Job Description' to compile a high-converting JD.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
