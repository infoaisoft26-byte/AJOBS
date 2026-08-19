import React, { useState } from "react";
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Briefcase, 
  UserCheck, 
  MessageSquare, 
  Lock, 
  Unlock, 
  Star,
  FileText,
  CheckCircle2
} from "lucide-react";
import { PipelineCandidate } from "./RecruiterTypes";

interface RecruiterFindCandidatesProps {
  onAddCandidateToPipeline?: (cand: any) => void;
  onOpenLiveChat?: (id: string, name: string) => void;
}

export default function RecruiterFindCandidates({
  onAddCandidateToPipeline,
  onOpenLiveChat
}: RecruiterFindCandidatesProps) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  const talentDatabase = [
    {
      id: "cand_src_1",
      name: "Rohan Mukherjee",
      role: "Lead Full Stack Architect",
      skills: ["React", "TypeScript", "Node.js", "System Design", "AWS"],
      experience: "6.5 Years",
      location: "Bengaluru",
      expectedCtc: "₹28 LPA",
      noticePeriod: "15 Days",
      aiScore: 97,
      summary: "Architected micro-frontend systems serving 1M+ daily active users. Expert in high-throughput pipelines."
    },
    {
      id: "cand_src_2",
      name: "Sneha Deshmukh",
      role: "Senior Frontend Engineer",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      experience: "4.2 Years",
      location: "Pune",
      expectedCtc: "₹18 LPA",
      noticePeriod: "Immediate",
      aiScore: 94,
      summary: "Specializes in design systems, web performance optimization, and responsive mobile-first SaaS interfaces."
    },
    {
      id: "cand_src_3",
      name: "Aditya Verma",
      role: "Backend & Cloud Engineer",
      skills: ["Node.js", "Golang", "Kubernetes", "PostgreSQL", "Docker"],
      experience: "3.5 Years",
      location: "Hyderabad",
      expectedCtc: "₹16.5 LPA",
      noticePeriod: "30 Days",
      aiScore: 91,
      summary: "Built scalable payment orchestration and distributed caching layers with sub-20ms latency."
    }
  ];

  const handleUnlockResume = (id: string) => {
    if (!unlockedIds.includes(id)) {
      setUnlockedIds([...unlockedIds, id]);
      alert("Resume contact details unlocked using recruiter credit.");
    }
  };

  return (
    <div className="space-y-6" id="recruiter-find-candidates-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI RECRUITER TALENT SCOUT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Find Sourced Candidates</h2>
          <p className="text-xs text-slate-400">Search 100,000+ verified professionals across tech, product, and business roles</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by skill keywords (e.g. React, Golang, PyTorch)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Locations</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Pune">Pune</option>
            <option value="Hyderabad">Hyderabad</option>
          </select>
        </div>
      </div>

      {/* Talent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {talentDatabase.map((cand) => {
          const isUnlocked = unlockedIds.includes(cand.id);
          return (
            <div
              key={cand.id}
              className="p-6 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-cyan-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-lg">
                    {cand.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                      {cand.name}
                    </h3>
                    <p className="text-xs text-slate-300">{cand.role}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{cand.experience} • {cand.location}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                  {cand.aiScore}% Match
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {cand.summary}
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {cand.skills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleUnlockResume(cand.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isUnlocked 
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300"
                  }`}
                >
                  {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isUnlocked ? "Resume Unlocked" : "Unlock Contact (1 Credit)"}</span>
                </button>

                <button
                  onClick={() => onOpenLiveChat && onOpenLiveChat(cand.id, cand.name)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Outreach</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
