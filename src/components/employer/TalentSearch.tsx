import { useState, useEffect } from "react";
import { 
  Search, SlidersHorizontal, MapPin, Briefcase, Award, MessageSquare, 
  UserCheck, RefreshCw, X, ShieldCheck, Mail, CreditCard, ChevronRight,
  TrendingUp, Star, Filter, Code2, ArrowUpRight
} from "lucide-react";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  title: string;
  skills: string[];
  experience: string;
  resumeScore: number;
  interviewScore: number;
  expectedSalary: string;
  location: string;
  availability: string;
  isAiVerified: boolean;
  avatarUrl: string;
}

export default function TalentSearch() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateProfile[]>([]);

  // Filter States
  const [skillQuery, setSkillQuery] = useState("");
  const [expFilter, setExpFilter] = useState("All");
  const [locationQuery, setLocationQuery] = useState("");
  const [minResumeScore, setMinResumeScore] = useState<number>(60);
  const [onlyVerified, setOnlyVerified] = useState(false);

  // Detail side drawer
  const [selectedCand, setSelectedCand] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "candidates"));
      const list: CandidateProfile[] = [];
      
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || "Aryan Sharma",
          email: data.email || `${data.name?.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
          title: data.title || "Full Stack SDE",
          skills: Array.isArray(data.skills) ? data.skills : (data.skills?.technical || ["React", "TypeScript", "Node.js"]),
          experience: data.experience || "Mid-Level (4 Years)",
          resumeScore: data.resumeScore || data.resumeScoreLocal || 85,
          interviewScore: data.aiInterviewScore || 80,
          expectedSalary: data.expectedSalary || "₹18,00,000 PA",
          location: data.preferredLocation || data.location || "Bengaluru",
          availability: data.availability || "Immediate",
          isAiVerified: (data.aiInterviewScore || 80) >= 80,
          avatarUrl: `https://images.unsplash.com/photo-${docSnap.id === "demo_candidate_ananya" ? "1494790108377-be9c29b29330" : "1535713875002-d1d0cf377fde"}?auto=format&fit=crop&w=80&q=80`
        });
      });

      // Seed high fidelity mock talent search profiles if Firestore collection is empty
      if (list.length === 0) {
        const seedPool: CandidateProfile[] = [
          {
            id: "ts_cand_1",
            name: "Ananya Iyer",
            email: "ananya.iyer@outlook.com",
            title: "Senior React Systems Architect",
            skills: ["React", "TypeScript", "Tailwind CSS", "Redux", "Figma", "Node.js"],
            experience: "Senior",
            resumeScore: 94,
            interviewScore: 91,
            expectedSalary: "₹24,00,000 PA",
            location: "Bengaluru",
            availability: "Immediate",
            isAiVerified: true,
            avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
          },
          {
            id: "ts_cand_2",
            name: "Aryan Sharma",
            email: "aryan.sharma@gmail.com",
            title: "Full Stack Engineer",
            skills: ["React", "TypeScript", "Node.js", "Firebase", "PostgreSQL", "Next.js"],
            experience: "Mid-Level",
            resumeScore: 88,
            interviewScore: 84,
            expectedSalary: "₹19,00,000 PA",
            location: "Noida (Hybrid)",
            availability: "15 Days Notice",
            isAiVerified: true,
            avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"
          },
          {
            id: "ts_cand_3",
            name: "Sneha Rao",
            email: "sneha.rao@design.io",
            title: "Lead Product Interaction Designer",
            skills: ["Figma", "UI Design", "Framer Motion", "Tailwind CSS", "User Sprints"],
            experience: "Mid-Level",
            resumeScore: 91,
            interviewScore: 78,
            expectedSalary: "₹16,50,000 PA",
            location: "Pune (Remote)",
            availability: "Immediate",
            isAiVerified: false,
            avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80"
          },
          {
            id: "ts_cand_4",
            name: "Vikram Malhotra",
            email: "vikram.m@cloudlabs.dev",
            title: "DevOps & SRE Systems Lead",
            skills: ["AWS", "Kubernetes", "Terraform", "Docker", "Python", "CI/CD"],
            experience: "Senior",
            resumeScore: 95,
            interviewScore: 93,
            expectedSalary: "₹28,50,000 PA",
            location: "Mumbai",
            availability: "Immediate",
            isAiVerified: true,
            avatarUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=80&q=80"
          },
          {
            id: "ts_cand_5",
            name: "Kabir Mehta",
            email: "kabir.m@datascience.in",
            title: "Junior Data SDE",
            skills: ["Python", "SQL", "Pandas", "PyTorch", "Tableau"],
            experience: "Junior",
            resumeScore: 72,
            interviewScore: 75,
            expectedSalary: "₹8,00,000 PA",
            location: "Remote",
            availability: "30 Days Notice",
            isAiVerified: false,
            avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
          }
        ];

        // Seed to Firestore candidates collection
        for (const item of seedPool) {
          await setDoc(doc(db, "candidates", item.id), item);
          list.push(item);
        }
      }

      setCandidates(list);
      setFilteredCandidates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter application pipeline trigger
  useEffect(() => {
    let result = candidates;

    // 1. Skill Query
    if (skillQuery.trim()) {
      const q = skillQuery.toLowerCase();
      result = result.filter(c => 
        c.skills.some(s => s.toLowerCase().includes(q)) ||
        c.title.toLowerCase().includes(q)
      );
    }

    // 2. Experience Level Dropdown
    if (expFilter !== "All") {
      result = result.filter(c => 
        c.experience.toLowerCase().includes(expFilter.toLowerCase())
      );
    }

    // 3. Location Query
    if (locationQuery.trim()) {
      const loc = locationQuery.toLowerCase();
      result = result.filter(c => 
        c.location.toLowerCase().includes(loc)
      );
    }

    // 4. Resume Score Filter
    result = result.filter(c => c.resumeScore >= minResumeScore);

    // 5. Verification status
    if (onlyVerified) {
      result = result.filter(c => c.isAiVerified);
    }

    setFilteredCandidates(result);
  }, [skillQuery, expFilter, locationQuery, minResumeScore, onlyVerified, candidates]);

  const handleShortlistCandidate = (cand: CandidateProfile) => {
    alert(`Success! Candidate "${cand.name}" has been added to your shortlist queue. An automated interview invite has been queued.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="corporate-talent-search-view">
      
      {/* Header Banner */}
      <div className="glass p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-950/10 to-black/40 space-y-1">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-indigo-400" />
          <span>Talent Search & Sourcing Engine</span>
        </h3>
        <p className="text-xs text-gray-400">
          Source top technical talent using filters. Match exact skill keywords, experience level, and geographic preferences directly from the Firestore verified index.
        </p>
      </div>

      {/* Interactive Sourcing Filters Control Panel */}
      <div className="glass p-5 rounded-2xl border border-white/5 bg-[#090d16]/30 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        
        {/* Filter 1: Skills Search */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-bold block flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Search Skill Stack</span>
          </label>
          <input
            type="text"
            placeholder="e.g. React, Python, Cloud..."
            value={skillQuery}
            onChange={e => setSkillQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
          />
        </div>

        {/* Filter 2: Experience Level Dropdown */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-bold block flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span>Experience Level</span>
          </label>
          <select
            value={expFilter}
            onChange={e => setExpFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
          >
            <option value="All">All Experience Ranges</option>
            <option value="Senior">Senior Lead (5+ Years)</option>
            <option value="Mid-Level">Mid-Level (2-5 Years)</option>
            <option value="Junior">Junior Associate (0-2 Years)</option>
          </select>
        </div>

        {/* Filter 3: Location Search */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-bold block flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>Location / Remote</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Bengaluru, Remote, Pune..."
            value={locationQuery}
            onChange={e => setLocationQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
          />
        </div>

        {/* Filter 4: Quality Sliders & Checks */}
        <div className="space-y-2.5 flex flex-col justify-end">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
            <span>Min ATS Resume Score:</span>
            <span className="text-indigo-400 font-mono">{minResumeScore}</span>
          </div>
          <input
            type="range"
            min="50"
            max="95"
            value={minResumeScore}
            onChange={e => setMinResumeScore(parseInt(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-full appearance-none"
          />
        </div>

        {/* Checkbox row */}
        <div className="md:col-span-4 pt-1 flex items-center justify-between border-t border-white/5 mt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold select-none">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={e => setOnlyVerified(e.target.checked)}
              className="accent-indigo-500 rounded border-white/10"
            />
            <span>Only display AI-Verified Candidates (Interview Arena Rating &ge; 80%)</span>
          </label>

          <span className="text-[10px] text-gray-500 font-mono">
            Discovered Match Count: <strong className="text-indigo-400">{filteredCandidates.length}</strong>
          </span>
        </div>

      </div>

      {/* Matching Profiles Sourced */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs font-mono text-gray-500">Querying Firestore Indices...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((cand) => (
            <div key={cand.id} className="glass p-5 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-4 bg-gradient-to-br from-[#090d16]/20 to-black/40">
              
              {/* Profile Card Header */}
              <div className="flex items-start gap-3">
                <img 
                  src={cand.avatarUrl} 
                  alt={cand.name} 
                  className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-sm text-white truncate">{cand.name}</h4>
                    {cand.isAiVerified && (
                      <span title="AI Verified Hire Verified Rating >= 80%">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-500/10 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-300 font-semibold truncate leading-none">{cand.title}</p>
                  <p className="text-[10px] text-gray-500 font-mono leading-none flex items-center gap-1 pt-1">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>{cand.location}</span>
                  </p>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1">
                {cand.skills.slice(0, 5).map((sk) => (
                  <span 
                    key={sk} 
                    className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-mono font-bold text-gray-300"
                  >
                    {sk}
                  </span>
                ))}
                {cand.skills.length > 5 && (
                  <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-gray-500 font-mono font-bold">
                    +{cand.skills.length - 5} more
                  </span>
                )}
              </div>

              {/* Quality Indicators metrics */}
              <div className="grid grid-cols-2 gap-2 bg-[#090d16]/40 p-2.5 rounded-xl border border-white/5 text-xs text-center font-mono">
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">ATS Score</p>
                  <p className="font-extrabold text-sm text-indigo-400">{cand.resumeScore}/100</p>
                </div>
                <div className="border-l border-white/5">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider">Interview</p>
                  <p className="font-extrabold text-sm text-pink-400">
                    {cand.interviewScore ? `${cand.interviewScore}/100` : "Not challenged"}
                  </p>
                </div>
              </div>

              {/* Salary expectation details */}
              <div className="flex items-center justify-between text-[11px] font-mono border-t border-white/5 pt-3">
                <div>
                  <p className="text-gray-500 text-[9px]">Requested Salary</p>
                  <p className="text-white font-bold">{cand.expectedSalary}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-[9px]">Hiring Availability</p>
                  <p className="text-emerald-400 font-bold">{cand.availability}</p>
                </div>
              </div>

              {/* Action Handlers */}
              <div className="flex gap-2.5 pt-1 text-center">
                <button
                  onClick={() => setSelectedCand(cand)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 rounded-xl border border-white/5 cursor-pointer text-center"
                >
                  View Full CV
                </button>
                <button
                  onClick={() => handleShortlistCandidate(cand)}
                  className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-[10px] font-bold text-white rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Shortlist</span>
                </button>
              </div>

            </div>
          ))}

          {filteredCandidates.length === 0 && (
            <div className="col-span-1 md:col-span-3 text-center py-20 glass rounded-2xl text-gray-500 text-xs italic border border-dashed border-white/10">
              No matching profiles found in the talent pool database. Try widening your skill, score range, or location filters.
            </div>
          )}
        </div>
      )}

      {/* Side Details Drawer Overlay */}
      {selectedCand && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-end animate-in slide-in-from-right duration-300">
          <div className="w-full max-w-md h-full bg-[#0a0a0f] border-l border-white/10 p-6 space-y-6 flex flex-col justify-between overflow-y-auto">
            
            <div className="space-y-6">
              {/* Close row */}
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="font-extrabold text-base text-white">Detailed Talent Evaluation</h4>
                <button 
                  onClick={() => setSelectedCand(null)}
                  className="text-gray-400 hover:text-white bg-white/5 p-1 rounded-lg border border-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Identity details */}
              <div className="flex items-center gap-4">
                <img 
                  src={selectedCand.avatarUrl} 
                  alt={selectedCand.name} 
                  className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg"
                />
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-lg text-white">{selectedCand.name}</h3>
                  <p className="text-xs text-indigo-300 font-mono">{selectedCand.title}</p>
                  <p className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{selectedCand.email}</span>
                  </p>
                </div>
              </div>

              {/* Bio details stats */}
              <div className="grid grid-cols-2 gap-3 bg-neutral-900 border border-white/5 p-4 rounded-xl font-mono text-xs">
                <div>
                  <span className="text-gray-500 text-[9px] block">EXPERIENCE RANGE</span>
                  <span className="text-white block font-bold">{selectedCand.experience}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[9px] block">COMMITTED LOCATION</span>
                  <span className="text-white block font-bold">{selectedCand.location}</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 text-[9px] block">EXPECTED SALARY</span>
                  <span className="text-white block font-bold">{selectedCand.expectedSalary}</span>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 text-[9px] block">AVAILABILITY WINDOW</span>
                  <span className="text-white block font-bold">{selectedCand.availability}</span>
                </div>
              </div>

              {/* Skills Inventory */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Expert Skills Inventory</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCand.skills.map((sk) => (
                    <span 
                      key={sk}
                      className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 rounded-lg text-xs font-mono font-bold"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Verified Scores breakdown */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Verified Performance Evaluation</p>
                
                <div className="space-y-3 bg-[#090d16]/30 border border-white/5 p-4 rounded-xl">
                  {/* ATS */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-400">ATS Resume Quality Check</span>
                      <span className="text-indigo-400 font-bold">{selectedCand.resumeScore}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${selectedCand.resumeScore}%` }}></div>
                    </div>
                  </div>

                  {/* AI Interview */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-400">AI Simulator Arena Rating</span>
                      <span className="text-pink-400 font-bold">{selectedCand.interviewScore}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500" style={{ width: `${selectedCand.interviewScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-white/5 flex gap-3 text-center">
              <button
                onClick={() => setSelectedCand(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 rounded-xl border border-white/5 cursor-pointer text-center"
              >
                Close Drawer
              </button>
              <button
                onClick={() => {
                  handleShortlistCandidate(selectedCand);
                  setSelectedCand(null);
                }}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1 shadow-md shadow-indigo-500/10"
              >
                <UserCheck className="w-4 h-4" />
                <span>Shortlist Profile</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
