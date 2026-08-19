import React, { useState } from "react";
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  UserCheck, 
  MessageSquare, 
  Star, 
  Filter, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2,
  FileText
} from "lucide-react";

interface CandidateResult {
  id: string;
  name: string;
  role: string;
  skills: string[];
  experience: string;
  location: string;
  expectedCtc: string;
  noticePeriod: string;
  aiScore: number;
  education: string;
  summary: string;
}

interface EmployerCandidateSearchProps {
  onShortlistCandidate?: (candidate: CandidateResult) => void;
  onMessageCandidate?: (candidateId: string, candidateName: string) => void;
}

export default function EmployerCandidateSearch({
  onShortlistCandidate,
  onMessageCandidate
}: EmployerCandidateSearchProps) {
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [minExp, setMinExp] = useState("all");
  const [noticeFilter, setNoticeFilter] = useState("all");
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);

  // Verified candidate talent pool
  const talentPool: CandidateResult[] = [
    {
      id: "cand_pool_1",
      name: "Rohan Mukherjee",
      role: "Lead Full Stack Architect",
      skills: ["React", "TypeScript", "Node.js", "System Design", "AWS", "Kafka"],
      experience: "6.5 Years",
      location: "Bengaluru",
      expectedCtc: "₹28,00,000",
      noticePeriod: "15 Days",
      aiScore: 97,
      education: "B.Tech Computer Science (NIT Surathkal)",
      summary: "Architected micro-frontend systems serving 1M+ daily active users. Expert in high-throughput React/Node.js pipelines."
    },
    {
      id: "cand_pool_2",
      name: "Sneha Deshmukh",
      role: "Senior Frontend Engineer",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Design Systems"],
      experience: "4.2 Years",
      location: "Pune (Open to Remote)",
      expectedCtc: "₹18,00,000",
      noticePeriod: "Immediate",
      aiScore: 94,
      education: "B.E Information Technology (COEP)",
      summary: "Specializes in design systems, web performance optimization, and responsive mobile-first SaaS interfaces."
    },
    {
      id: "cand_pool_3",
      name: "Aditya Verma",
      role: "Backend & Cloud Engineer",
      skills: ["Node.js", "Golang", "Kubernetes", "PostgreSQL", "Docker", "Redis"],
      experience: "3.5 Years",
      location: "Hyderabad",
      expectedCtc: "₹16,50,000",
      noticePeriod: "30 Days",
      aiScore: 91,
      education: "B.Tech Electrical & CS (IIT Hyderabad)",
      summary: "Built scalable payment orchestration and distributed caching layers with sub-20ms latency."
    },
    {
      id: "cand_pool_4",
      name: "Tanvi Saxena",
      role: "AI / ML Solutions Engineer",
      skills: ["Python", "PyTorch", "Gemini API", "Vector Databases", "LangChain", "FastAPI"],
      experience: "3.0 Years",
      location: "Delhi NCR",
      expectedCtc: "₹20,00,000",
      noticePeriod: "15 Days",
      aiScore: 95,
      education: "M.Tech Data Science (DTU)",
      summary: "Developed autonomous agent workflows, RAG systems, and semantic document parsers with Gemini & Claude models."
    },
    {
      id: "cand_pool_5",
      name: "Karthik Ranganathan",
      role: "Senior Product Designer & UI Engineer",
      skills: ["Figma", "UI/UX", "React", "Design Systems", "Prototyping"],
      experience: "5.0 Years",
      location: "Chennai",
      expectedCtc: "₹22,00,000",
      noticePeriod: "Immediate",
      aiScore: 89,
      education: "B.Des (NID Ahmedabad)",
      summary: "End-to-end product designer who codes in React and builds cohesive, high-conversion B2B SaaS design libraries."
    }
  ];

  const filteredPool = talentPool.filter((c) => {
    if (locationFilter !== "all" && !c.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    if (noticeFilter !== "all" && !c.noticePeriod.toLowerCase().includes(noticeFilter.toLowerCase())) {
      return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchRole = c.role.toLowerCase().includes(q);
      const matchSkills = c.skills.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchRole && !matchSkills) return false;
    }
    return true;
  });

  const handleShortlist = (cand: CandidateResult) => {
    if (!shortlistedIds.includes(cand.id)) {
      setShortlistedIds([...shortlistedIds, cand.id]);
      if (onShortlistCandidate) onShortlistCandidate(cand);
    }
  };

  return (
    <div className="space-y-6" id="employer-candidate-search-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI TALENT SOURCING DISCOVERY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Search Verified Candidate Pool</h2>
          <p className="text-xs text-slate-400">Discover pre-screened technical and domain professionals across India</p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
          {filteredPool.length} Candidates Available
        </span>
      </div>

      {/* Filter Bar */}
      <div className="p-5 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keywords, technical skills (e.g. React, Golang, PyTorch)..."
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Locations</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Pune">Pune</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Delhi">Delhi NCR</option>
            <option value="Chennai">Chennai</option>
          </select>
        </div>

        <div>
          <select
            value={noticeFilter}
            onChange={(e) => setNoticeFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Notice Periods</option>
            <option value="Immediate">Immediate Joiners</option>
            <option value="15 Days">15 Days Notice</option>
            <option value="30 Days">30 Days Notice</option>
          </select>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPool.map((c) => {
          const isShortlisted = shortlistedIds.includes(c.id);
          return (
            <div
              key={c.id}
              className="p-6 rounded-3xl bg-[#17111F]/80 hover:bg-[#17111F] border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-md shadow-xl transition-all space-y-4 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-lg">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-300 font-medium">{c.role}</p>
                    <span className="text-[10px] text-slate-500 font-mono">{c.education}</span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold shrink-0">
                  {c.aiScore}% Match
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                {c.summary}
              </p>

              {/* Meta Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {c.location}
                </span>
                <span>•</span>
                <span>{c.experience}</span>
                <span>•</span>
                <span className="text-emerald-400 font-mono font-bold">{c.expectedCtc}</span>
                <span>•</span>
                <span className="text-blue-300 font-mono">{c.noticePeriod}</span>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1">
                {c.skills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#0e0a14] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-purple-500/15 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleShortlist(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isShortlisted
                      ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                      : "bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isShortlisted ? "Shortlisted" : "Shortlist Profile"}</span>
                </button>

                <button
                  onClick={() => onMessageCandidate && onMessageCandidate(c.id, c.name)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Direct Message</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
