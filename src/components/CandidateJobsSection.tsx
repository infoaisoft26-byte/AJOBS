import { useState } from "react";
import { motion } from "motion/react";
import { 
  Heart, Briefcase, Brain, Star, CheckCircle2, Search, ArrowRight, 
  Trash2, ShieldCheck, HelpCircle, Clock, Calendar, Check, X, Award, ChevronRight,
  SlidersHorizontal, Sparkles, Filter, CheckCircle, Lock, AlertTriangle
} from "lucide-react";
import { JobPosting, JobApplication } from "../types";
import { deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { evaluateAbacPolicy, mapUserToAbacSubject } from "../services/abacService";

interface JobsSectionProps {
  userId: string;
  profile: any;
  jobs: JobPosting[];
  applications: JobApplication[];
  activeTab: "explore-jobs" | "saved-jobs" | "applied-jobs";
  onSaveJob: (jobId: string, remove: boolean) => Promise<void>;
  onOneClickApply: (job: JobPosting) => Promise<void>;
  onStartInterview: (job: JobPosting) => void;
  onCheckMatch: (job: JobPosting) => Promise<void>;
  selectedJobForMatch: JobPosting | null;
  isMatching: boolean;
  matchResult: any;
  searchQuery: string;
}

export default function CandidateJobsSection({
  userId,
  profile,
  jobs,
  applications,
  activeTab,
  onSaveJob,
  onOneClickApply,
  onStartInterview,
  onCheckMatch,
  selectedJobForMatch,
  isMatching,
  matchResult,
  searchQuery
}: JobsSectionProps) {
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  // Advanced search filters state
  const [filterLocation, setFilterLocation] = useState("");
  const [filterSalary, setFilterSalary] = useState("Any");
  const [filterExperience, setFilterExperience] = useState("Any");
  const [filterIndustry, setFilterIndustry] = useState("Any");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterAiVerifiedOnly, setFilterAiVerifiedOnly] = useState(false);
  const [filterRecentlyPosted, setFilterRecentlyPosted] = useState(false);
  const [filterRemoteOnly, setFilterRemoteOnly] = useState(false);
  const [showAiRecommendedOnly, setShowAiRecommendedOnly] = useState(false);

  const savedJobIds = profile?.savedJobIds || [];

  // Withdraw an application
  const handleWithdrawApplication = async (appId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to withdraw your application for "${jobTitle}"? This is irreversible.`)) return;
    try {
      await deleteDoc(doc(db, "applications", appId));
      alert(`Successfully withdrawn application for ${jobTitle}.`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error retracting application.");
    }
  };

  // Filter jobs based on advanced search queries, tab, and status
  const getFilteredJobs = () => {
    let list = [...jobs];

    // Filter by Active Tab
    if (activeTab === "saved-jobs") {
      list = list.filter(j => savedJobIds.includes(j.id));
    }

    // Only Live jobs are visible to candidates
    list = list.filter(j => j.status === "Live");

    // Standard Query Search (title, company, description, skills)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(j => 
        j.title?.toLowerCase().includes(q) || 
        j.companyName?.toLowerCase().includes(q) || 
        j.skillsRequired?.some(sk => sk.toLowerCase().includes(q)) ||
        j.description?.toLowerCase().includes(q)
      );
    }

    // Geographic Location Search
    if (filterLocation.trim()) {
      const loc = filterLocation.toLowerCase();
      list = list.filter(j => j.location?.toLowerCase().includes(loc));
    }

    // Company Filter
    if (filterCompany.trim()) {
      const comp = filterCompany.toLowerCase();
      list = list.filter(j => j.companyName?.toLowerCase().includes(comp));
    }

    // Salary Range Filter
    if (filterSalary !== "Any") {
      list = list.filter(j => {
        const salText = (j.salary || "").toLowerCase();
        if (filterSalary === "10L+") {
          return salText.includes("10,00,000") || salText.includes("12,") || salText.includes("15,") || salText.includes("18,") || salText.includes("20,") || salText.includes("24,") || salText.includes("18l") || salText.includes("20l") || salText.includes("24l") || salText.includes("30l");
        }
        if (filterSalary === "20L+") {
          return salText.includes("20,00,000") || salText.includes("24,") || salText.includes("30,") || salText.includes("20l") || salText.includes("24l") || salText.includes("30l");
        }
        if (filterSalary === "30L+") {
          return salText.includes("30,00,000") || salText.includes("30l") || salText.includes("35l") || salText.includes("40l");
        }
        return true;
      });
    }

    // Experience Tier Filter
    if (filterExperience !== "Any") {
      const exp = filterExperience.toLowerCase();
      list = list.filter(j => (j.experience || "").toLowerCase().includes(exp));
    }

    // Industry Filter
    if (filterIndustry !== "Any") {
      const ind = filterIndustry.toLowerCase();
      list = list.filter(j => (j.industry || "").toLowerCase().includes(ind));
    }

    // AI Verified Jobs
    if (filterAiVerifiedOnly) {
      list = list.filter(j => j.id.charCodeAt(0) % 2 === 0 || (j.skillsRequired && j.skillsRequired.length > 2));
    }

    // Recently Posted (last 7 days)
    if (filterRecentlyPosted) {
      list = list.filter(j => {
        const date = j.createdAt ? new Date(j.createdAt) : new Date();
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });
    }

    // Remote Jobs Only
    if (filterRemoteOnly) {
      list = list.filter(j => 
        (j.workMode || "").toLowerCase().includes("remote") || 
        (j.location || "").toLowerCase().includes("remote") ||
        (j.type || "").toLowerCase().includes("remote")
      );
    }

    // AI Recommended Jobs (matches user's skills and ATS profiles!)
    if (showAiRecommendedOnly) {
      const candidateSkills = profile?.skills || [];
      if (candidateSkills.length > 0) {
        list = list.filter(j => {
          const matchedCount = (j.skillsRequired || []).filter(sk => 
            candidateSkills.some((cs: string) => cs.toLowerCase().includes(sk.toLowerCase()))
          ).length;
          return matchedCount >= 1;
        });
      }
    }

    return list;
  };

  const filteredList = getFilteredJobs();

  // Handle application status index
  const getStatusIndex = (status: string) => {
    const stages = ["applied", "under_review", "interviewing", "selected", "rejected", "offered"];
    const idx = stages.indexOf(status.toLowerCase().replace(" ", "_"));
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="candidate-jobs-viewport">
      
      {/* 0. EXPLORE JOBS BOARD */}
      {activeTab === "explore-jobs" && (
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-black text-xl text-white flex items-center space-x-2">
                <Search className="w-5 h-5 text-indigo-400" />
                <span>Search & Discover AI Openings</span>
              </h3>
              <p className="text-xs text-gray-400">Apply to matching global tech opportunities verified with direct AI interview channels.</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAiRecommendedOnly(!showAiRecommendedOnly)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showAiRecommendedOnly 
                    ? "bg-purple-600/20 text-purple-300 border-purple-500/35" 
                    : "bg-white/5 text-gray-400 border-white/5 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Recommended Only</span>
              </button>
            </div>
          </div>

          {/* Advanced Filtering Sub-Panel */}
          <div className="glass p-4 rounded-2xl border border-white/5 bg-[#0a0a0f] space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-300 font-bold">
              <Filter className="w-4 h-4 text-indigo-400" />
              <span>ATS Advanced Filter Metrics</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 text-[10px] block">Location search</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, Remote"
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[10px] block">Company search</label>
                <input
                  type="text"
                  placeholder="e.g. Microsoft, Google"
                  value={filterCompany}
                  onChange={e => setFilterCompany(e.target.value)}
                  className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[10px] block">Min Salary</label>
                <select
                  value={filterSalary}
                  onChange={e => setFilterSalary(e.target.value)}
                  className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Any">Any CTC package</option>
                  <option value="10L+">₹10L+ PA</option>
                  <option value="20L+">₹20L+ PA</option>
                  <option value="30L+">₹30L+ PA</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-[10px] block">Experience Tier</label>
                <select
                  value={filterExperience}
                  onChange={e => setFilterExperience(e.target.value)}
                  className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Any">Any Experience</option>
                  <option value="Entry">Entry-level (0-2 years)</option>
                  <option value="Mid">Mid-level (2-5 years)</option>
                  <option value="Senior">Senior (5+ years)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1.5 text-xs border-t border-white/5">
              <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={filterRemoteOnly}
                  onChange={e => setFilterRemoteOnly(e.target.checked)}
                  className="rounded border-white/10 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Remote Roles Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={filterAiVerifiedOnly}
                  onChange={e => setFilterAiVerifiedOnly(e.target.checked)}
                  className="rounded border-white/10 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>AI Pre-Screened Jobs</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={filterRecentlyPosted}
                  onChange={e => setFilterRecentlyPosted(e.target.checked)}
                  className="rounded border-white/10 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Recently Posted (Past 7 days)</span>
              </label>

              <button
                onClick={() => {
                  setFilterLocation("");
                  setFilterSalary("Any");
                  setFilterExperience("Any");
                  setFilterCompany("");
                  setFilterRemoteOnly(false);
                  setFilterAiVerifiedOnly(false);
                  setFilterRecentlyPosted(false);
                  setShowAiRecommendedOnly(false);
                }}
                className="ml-auto text-[10px] text-gray-400 hover:text-indigo-400 font-semibold underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Jobs Listing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((job) => {
              const applied = applications.some(a => a.jobId === job.id);
              const isSaved = savedJobIds.includes(job.id);
              
              // ABAC Evaluation for Job Application
              const getSalaryAmount = (salText: string): number => {
                const cleaned = salText.replace(/,/g, "");
                const match = cleaned.match(/(\d+)/g);
                if (!match) return 0;
                const numbers = match.map(n => parseInt(n, 10));
                const max = Math.max(...numbers);
                if (max < 100) return max * 100000;
                return max;
              };

              const jobSalary = getSalaryAmount(job.salary || "");
              const expMatch = (job.experience || "").match(/(\d+)/);
              const expRequired = expMatch ? parseInt(expMatch[1], 10) : 0;
              const isAiOnly = job.id.charCodeAt(0) % 2 === 0 || (job.skillsRequired && job.skillsRequired.length > 2);

              const abacSubject = mapUserToAbacSubject(userId, profile, profile);
              const abacResource = {
                id: job.id,
                type: "job" as const,
                salary: jobSalary,
                experienceRequired: expRequired,
                isAiVerifiedOnly: isAiOnly
              };

              const abacCheck = evaluateAbacPolicy(abacSubject, abacResource, "apply");

              return (
                <div key={job.id} className={`glass p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  !abacCheck.granted 
                    ? "border-red-500/10 bg-red-950/[0.02]" 
                    : "border-white/5 hover:border-indigo-500/25"
                }`}>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase">{job.companyName}</span>
                        {isAiOnly && (
                          <span className="bg-indigo-500/15 text-indigo-300 text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-indigo-500/10">
                            <CheckCircle className="w-2.5 h-2.5 text-indigo-400" />
                            <span>AI Verified</span>
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => onSaveJob(job.id, isSaved)}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          isSaved 
                            ? "bg-pink-500/10 text-pink-400 hover:bg-pink-500/20" 
                            : "bg-white/5 text-gray-400 hover:bg-white/15 hover:text-white"
                        }`}
                        title={isSaved ? "Saved" : "Save Job"}
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      {!abacCheck.granted && <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      <span>{job.title}</span>
                    </h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-gray-400 pt-1">
                      <span>📍 {job.location || "Bengaluru"}</span>
                      <span className={!abacCheck.granted && jobSalary >= 2500000 ? "text-red-400 font-bold" : ""}>
                        💰 {job.salary || "Competitive"}
                      </span>
                      <span>🎓 {job.education || "Any Education"}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skillsRequired?.map((sk, k) => (
                        <span key={k} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5">{sk}</span>
                      ))}
                    </div>

                    {/* ABAC Restriction Warning Banner */}
                    {!abacCheck.granted && (
                      <div className="mt-3 p-2.5 bg-red-950/25 border border-red-500/15 rounded-xl text-[10px] text-red-300 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold uppercase tracking-wider font-mono text-[9px] text-red-400">ABAC Policy Restricted</p>
                          <p className="leading-relaxed text-gray-300">{abacCheck.reason}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs">
                    <button
                      onClick={() => onCheckMatch(job)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-200 rounded-lg transition-all border border-white/5 cursor-pointer"
                    >
                      AI Match
                    </button>
                    <button
                      onClick={() => abacCheck.granted && onOneClickApply(job)}
                      disabled={applied || !abacCheck.granted}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        applied 
                          ? "bg-green-500/25 text-green-400 border border-green-500/30 cursor-not-allowed" 
                          : !abacCheck.granted
                            ? "bg-red-950/20 text-red-500/40 border border-red-500/10 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                      }`}
                    >
                      {applied ? "Applied" : !abacCheck.granted ? "Access Restricted" : "1-Click Apply"}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="col-span-2 text-center py-16 glass rounded-2xl text-xs text-gray-500 italic border border-white/5">
                No job openings match your current filter metrics. Try resetting filters or choosing broader keywords.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. SAVED JOBS BOARD */}
      {activeTab === "saved-jobs" && (
        <div className="space-y-4">
          <div className="border-b border-white/5 pb-3">
            <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <span>Bookmarked Career Openings</span>
            </h3>
            <p className="text-xs text-gray-400">Manage bookmarks, track active matches, and trigger standard 1-Click submissions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((job) => {
              const applied = applications.some(a => a.jobId === job.id);
              return (
                <div key={job.id} className="glass p-5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-indigo-400 font-extrabold uppercase">{job.companyName}</span>
                      <button 
                        onClick={() => onSaveJob(job.id, true)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                        title="Remove Bookmark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-white">{job.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{job.description}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skillsRequired?.map((sk, k) => (
                        <span key={k} className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5">{sk}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs">
                    <button
                      onClick={() => onCheckMatch(job)}
                      className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-200 rounded-lg transition-all border border-white/5"
                    >
                      AI Match
                    </button>
                    <button
                      onClick={() => onOneClickApply(job)}
                      disabled={applied}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        applied 
                          ? "bg-green-500/25 text-green-400 border border-green-500/30 cursor-not-allowed" 
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                      }`}
                    >
                      {applied ? "Applied" : "1-Click Apply"}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="col-span-2 text-center py-12 glass rounded-2xl text-xs text-gray-500 italic">
                No bookmarked career openings. Use the Search or Dashboard to save job listings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. APPLIED JOBS STATUS TRACKING */}
      {activeTab === "applied-jobs" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of Applied Jobs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="font-display font-bold text-lg text-white flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <span>Job Application Registry</span>
              </h3>
              <p className="text-xs text-gray-400">Track standard progress pipelines for currently submitted portfolios.</p>
            </div>

            <div className="space-y-3.5">
              {applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div 
                    key={app.id} 
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 rounded-2xl transition-all flex items-center justify-between border cursor-pointer ${
                      isSelected 
                        ? "bg-indigo-600/15 border-indigo-500/40 shadow shadow-indigo-500/10" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-extrabold text-indigo-400 uppercase">{app.companyName}</span>
                      <h4 className="font-bold text-xs text-white">{app.jobTitle}</h4>
                      <p className="text-[10px] text-gray-500">Submitted: {new Date(app.appliedAt).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono border ${
                        app.status === "applied" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        app.status === "interviewing" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        app.status === "offered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        app.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-white/5 text-gray-300"
                      }`}>
                        {app.status}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                );
              })}

              {applications.length === 0 && (
                <div className="text-center py-12 glass rounded-2xl text-xs text-gray-500 italic">
                  You haven't applied to any roles. View job matches to trigger applications.
                </div>
              )}
            </div>
          </div>

          {/* Application Status Timeline View */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs font-mono tracking-widest text-purple-400 uppercase">Application Progress</h4>
            {selectedApp ? (
              <div className="glass p-5 rounded-2xl space-y-5 animate-in fade-in duration-300">
                <div className="border-b border-white/5 pb-3">
                  <span className="text-[9px] font-mono text-purple-400 font-extrabold uppercase">{selectedApp.companyName}</span>
                  <h3 className="font-bold text-sm text-white">{selectedApp.jobTitle}</h3>
                  <span className="text-[10px] text-gray-400">Resume score during submit: {selectedApp.resumeScore || 70}%</span>
                </div>

                {/* Timeline graph */}
                <div className="space-y-4 relative pl-4 border-l border-white/5">
                  {[
                    {
                      label: "Application Received",
                      desc: "Resume profile logged successfully into ATS filters.",
                      active: getStatusIndex(selectedApp.status) >= 0,
                      color: "border-indigo-400 bg-indigo-400"
                    },
                    {
                      label: "Portfolio Under Review",
                      desc: "Agency partners reviewing skill stacks and timeline matching.",
                      active: getStatusIndex(selectedApp.status) >= 1,
                      color: "border-indigo-400 bg-indigo-400"
                    },
                    {
                      label: "Interview Scheduled",
                      desc: "Direct technical evaluations or simulator challenge initialized.",
                      active: getStatusIndex(selectedApp.status) >= 2,
                      color: "border-purple-400 bg-purple-400 animate-pulse"
                    },
                    {
                      label: "Evaluation Selected",
                      desc: "Completed cycles verified with positive feedback markers.",
                      active: getStatusIndex(selectedApp.status) >= 3,
                      color: "border-emerald-400 bg-emerald-400"
                    },
                    {
                      label: "Offer Handover",
                      desc: "Official offer letter dispatched. Check your inbox.",
                      active: selectedApp.status === "offered",
                      color: "border-emerald-500 bg-emerald-500 scale-110"
                    }
                  ].map((step, idx) => (
                    <motion.div 
                      key={idx} 
                      className="relative"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                    >
                      <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border transition-all duration-300 ${
                        step.active ? step.color : "bg-black border-white/10"
                      }`}></div>
                      <div className="space-y-0.5 pl-2">
                        <p className={`text-[11px] font-bold transition-colors duration-300 ${step.active ? "text-white" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        <p className="text-[9px] text-gray-500 leading-normal">{step.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Withdraw application button */}
                <div className="pt-4 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => handleWithdrawApplication(selectedApp.id, selectedApp.jobTitle)}
                    className="px-3 py-1.5 bg-red-950/20 hover:bg-red-900/35 text-red-400 text-[10px] font-bold rounded-lg border border-red-900/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Withdraw Application</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass p-6 text-center text-xs text-gray-500 italic rounded-2xl">
                Click any application card on the left to reveal the dynamic status timeline.
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. AI COMPATIBILITY MODAL PORTION (renders inline if job matched) */}
      {selectedJobForMatch && (
        <div className="glass p-5 rounded-2xl border border-indigo-500/20 bg-[#090d16]/30 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <span className="text-[9px] font-mono uppercase text-indigo-400">AI Compatibility Meter</span>
              <h4 className="font-bold text-xs text-white">{selectedJobForMatch.title}</h4>
            </div>
            {isMatching ? (
              <span className="text-xs text-indigo-400 animate-pulse font-bold">Executing Match...</span>
            ) : (
              <span className="text-xl font-black font-display text-indigo-400">{matchResult?.matchPercentage || 0}% Match</span>
            )}
          </div>

          {!isMatching && matchResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-bold text-gray-300">Analysis Summary</p>
                <p className="text-gray-400 leading-relaxed text-[11px]">{matchResult.compatibilitySummary}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-gray-300">Suggested Skill Focus</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {matchResult.missingSkills?.map((sk: string, k: number) => (
                    <span key={k} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] border border-red-500/20">{sk}</span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                <p className="font-bold text-indigo-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>AI Preparation Tip</span>
                </p>
                <p className="text-[11px] text-gray-300 leading-normal">{matchResult.interviewTip}</p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
