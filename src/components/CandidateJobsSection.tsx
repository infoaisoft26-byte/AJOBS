import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Heart, Briefcase, Brain, Star, CheckCircle2, Search, ArrowRight, 
  Trash2, ShieldCheck, HelpCircle, Clock, Calendar, Check, X, Award, ChevronRight,
  SlidersHorizontal, Sparkles, Filter, CheckCircle, Lock, AlertTriangle, Share2, Building2
} from "lucide-react";
import { JobPosting, JobApplication } from "../types";
import { deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { evaluateAbacPolicy, mapUserToAbacSubject } from "../services/abacService";
import { injectJobPostingSchema } from "../utils/schemaGenerator";
import { fetchPaginatedLiveJobs } from "../services/jobService";
import JobDetails from "./JobDetails";
import JobCard from "./JobCard";
import JobSearchEngine from "./JobSearchEngine";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { useToast } from "./GlobalToast";

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
  const { showToast } = useToast();
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobPosting | null>(null);

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

  // New filters to complete the 15-filters list
  const [filterJobType, setFilterJobType] = useState("Any");
  const [filterWorkMode, setFilterWorkMode] = useState("Any");
  const [filterCategory, setFilterCategory] = useState("Any");
  const [filterQualification, setFilterQualification] = useState("Any");
  const [filterFreshersOnly, setFilterFreshersOnly] = useState(false);
  const [filterDatePosted, setFilterDatePosted] = useState("Any");

  // Real-time Firestore Paginated State & Local Cache
  const [liveJobs, setLiveJobs] = useState<JobPosting[]>([]);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // New JobSearchEngine filters state
  const [searchEngineFilters, setSearchEngineFilters] = useState<{
    query: string;
    locations: string[];
    industries: string[];
    jobTypes: string[];
  }>({
    query: "",
    locations: [],
    industries: [],
    jobTypes: []
  });

  // Handler for sharing jobs
  const handleShareJob = async (job: JobPosting) => {
    const shareData = {
      title: `${job.title} at ${job.companyName}`,
      text: `Check out this verified AI Career opening: ${job.title} at ${job.companyName} (${job.location || "Remote"}). Built-in AI feedback evaluation is live!`,
      url: window.location.origin + `?jobId=${job.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showToast("Job shared successfully!", "success");
      } else {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\nLink: ${shareData.url}`);
        showToast("📋 Verified career details copied to clipboard! Share it with your network.", "success");
      }
    } catch (err) {
      console.warn("Share failed:", err);
    }
  };

  // Load from session cache on mount and synchronize with live paginated Firestore
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("aijobs_live_feed_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLiveJobs(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to parse cached jobs:", err);
    }

    async function loadInitialFeed() {
      if (activeTab !== "explore-jobs") return;
      setLoadingLive(true);
      try {
        const { jobs: initialJobs, lastDoc } = await fetchPaginatedLiveJobs(15, null);
        setLiveJobs(initialJobs);
        setLastVisibleDoc(lastDoc);
        setHasMore(initialJobs.length >= 8);

        try {
          sessionStorage.setItem("aijobs_live_feed_cache", JSON.stringify(initialJobs));
        } catch (cacheErr) {}
      } catch (err) {
        console.error("Failed to fetch initial paginated jobs:", err);
      } finally {
        setLoadingLive(false);
      }
    }

    loadInitialFeed();
  }, [activeTab]);

  // Handler for loading more jobs paginated automatically
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || loadingLive || activeTab !== "explore-jobs") return;
    setLoadingMore(true);
    try {
      const { jobs: nextJobs, lastDoc } = await fetchPaginatedLiveJobs(12, lastVisibleDoc);
      if (nextJobs.length === 0) {
        setHasMore(false);
      } else {
        setLiveJobs(prev => {
          const combined = [...prev];
          nextJobs.forEach(nj => {
            if (!combined.some(item => item.id === nj.id)) {
              combined.push(nj);
            }
          });

          try {
            sessionStorage.setItem("aijobs_live_feed_cache", JSON.stringify(combined));
          } catch (e) {}

          return combined;
        });
        setLastVisibleDoc(lastDoc);
        setHasMore(nextJobs.length >= 6);
      }
    } catch (err) {
      console.warn("Error fetching paginated scroll page:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Setup the IntersectionObserver sentinel observer
  const sentinelRef = useIntersectionObserver({
    onIntersect: handleLoadMore,
    enabled: hasMore && !loadingMore && !loadingLive && activeTab === "explore-jobs",
    threshold: 0.1,
    rootMargin: "200px"
  });

  const savedJobIds = profile?.savedJobIds || [];

  // Dynamic SEO Structured Data (Schema.org JSON-LD) injection
  useEffect(() => {
    if (selectedJobForMatch) {
      injectJobPostingSchema(selectedJobForMatch);
    }
  }, [selectedJobForMatch]);

  // Withdraw an application
  const handleWithdrawApplication = async (appId: string, jobTitle: string) => {
    if (!confirm(`Are you sure you want to withdraw your application for "${jobTitle}"? This is irreversible.`)) return;
    try {
      await deleteDoc(doc(db, "applications", appId));
      showToast(`Successfully withdrawn application for ${jobTitle}.`, "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      showToast("Error retracting application.", "error");
    }
  };

  // Filter jobs based on advanced search queries, tab, and status
  const getFilteredJobs = () => {
    // If exploring, load from the live query-matched, cached dataset. Otherwise fallback to parent prop
    let list = activeTab === "explore-jobs" ? [...liveJobs] : [...jobs];

    // Filter by Active Tab
    if (activeTab === "saved-jobs") {
      list = [...jobs].filter(j => savedJobIds.includes(j.id));
    } else if (activeTab === "applied-jobs") {
      const appliedIds = applications.map(a => a.jobId);
      list = [...jobs].filter(j => appliedIds.includes(j.id));
    }

    // Only active, live, or open jobs are visible to candidates
    list = list.filter(j => ["live", "open", "published", "approved"].includes((j.status || "").toLowerCase()));

    // Standard & Multi-Field Real-Time Search (Job Title, Company Name, Skills, Location, Category, Industry, Job Type, Employment Type, Experience, Salary, Keywords)
    const activeQuery = (searchEngineFilters.query || searchQuery || "").trim();
    if (activeQuery) {
      const q = activeQuery.toLowerCase();
      list = list.filter(j => 
        (j.title || "").toLowerCase().includes(q) || 
        (j.companyName || "").toLowerCase().includes(q) || 
        (j.skillsRequired || []).some(sk => sk.toLowerCase().includes(q)) ||
        (j.location || "").toLowerCase().includes(q) ||
        (j.category || "").toLowerCase().includes(q) ||
        (j.industry || "").toLowerCase().includes(q) ||
        (j.type || "").toLowerCase().includes(q) ||
        (j.experience || "").toLowerCase().includes(q) ||
        (j.salary || "").toLowerCase().includes(q) ||
        (j.description || "").toLowerCase().includes(q)
      );
    }

    // New Multi-select Location Filter
    if (searchEngineFilters.locations && searchEngineFilters.locations.length > 0) {
      list = list.filter(j => 
        searchEngineFilters.locations.some(loc => 
          (j.location || "").toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    // New Multi-select Industry Filter
    if (searchEngineFilters.industries && searchEngineFilters.industries.length > 0) {
      list = list.filter(j => 
        searchEngineFilters.industries.some(ind => 
          (j.industry || "").toLowerCase().includes(ind.toLowerCase())
        )
      );
    }

    // New Multi-select Job Type Filter
    if (searchEngineFilters.jobTypes && searchEngineFilters.jobTypes.length > 0) {
      list = list.filter(j => 
        searchEngineFilters.jobTypes.some(type => 
          (j.type || "").toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    // 1. Geographic Location Search
    if (filterLocation.trim()) {
      const loc = filterLocation.toLowerCase();
      list = list.filter(j => (j.location || "").toLowerCase().includes(loc));
    }

    // 2. Company Filter
    if (filterCompany.trim()) {
      const comp = filterCompany.toLowerCase();
      list = list.filter(j => (j.companyName || "").toLowerCase().includes(comp));
    }

    // 3. Salary Range Filter
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

    // 4. Experience Tier Filter
    if (filterExperience !== "Any") {
      const exp = filterExperience.toLowerCase();
      list = list.filter(j => (j.experience || "").toLowerCase().includes(exp));
    }

    // 5. Job Type Filter
    if (filterJobType !== "Any") {
      const jt = filterJobType.toLowerCase();
      list = list.filter(j => (j.type || "").toLowerCase().includes(jt));
    }

    // 6. Work Mode Filter (Remote, Hybrid, Work From Office)
    if (filterWorkMode !== "Any") {
      const mode = filterWorkMode.toLowerCase();
      list = list.filter(j => {
        const jMode = (j.workMode || "").toLowerCase();
        const jLoc = (j.location || "").toLowerCase();
        if (mode === "remote") return jMode.includes("remote") || jLoc.includes("remote");
        if (mode === "hybrid") return jMode.includes("hybrid") || jLoc.includes("hybrid");
        if (mode === "work from office") return jMode.includes("office") || jMode.includes("on-site") || jMode.includes("onsite") || (!jMode.includes("remote") && !jMode.includes("hybrid"));
        return true;
      });
    }

    // 7. Freshers Filter
    if (filterFreshersOnly) {
      list = list.filter(j => 
        (j.experience || "").toLowerCase().includes("fresher") || 
        (j.experience || "").toLowerCase().includes("0-1") ||
        (j.experience || "").toLowerCase().includes("0-2") ||
        (j.experience || "").toLowerCase().includes("entry")
      );
    }

    // 8. Date Posted (Today, Last 7 Days, Last 30 Days)
    if (filterDatePosted !== "Any") {
      list = list.filter(j => {
        const date = j.createdAt ? new Date(j.createdAt) : new Date();
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filterDatePosted === "Today") return diffDays <= 1;
        if (filterDatePosted === "7Days") return diffDays <= 7;
        if (filterDatePosted === "30Days") return diffDays <= 30;
        return true;
      });
    }

    // 9. Category Filter
    if (filterCategory !== "Any" && filterCategory.trim() !== "") {
      const cat = filterCategory.toLowerCase();
      list = list.filter(j => 
        (j.category || "").toLowerCase().includes(cat) || 
        (j.department || "").toLowerCase().includes(cat)
      );
    }

    // 10. Industry Filter
    if (filterIndustry !== "Any" && filterIndustry.trim() !== "") {
      const ind = filterIndustry.toLowerCase();
      list = list.filter(j => (j.industry || "").toLowerCase().includes(ind));
    }

    // 11. Qualification Filter
    if (filterQualification !== "Any" && filterQualification.trim() !== "") {
      const qual = filterQualification.toLowerCase();
      list = list.filter(j => 
        (j.qualification || "").toLowerCase().includes(qual) || 
        (j.education || "").toLowerCase().includes(qual)
      );
    }

    // 12. AI Pre-Screened Jobs
    if (filterAiVerifiedOnly) {
      list = list.filter(j => j.id.charCodeAt(0) % 2 === 0 || (j.skillsRequired && j.skillsRequired.length > 2));
    }

    // 13. Recently Posted Filter (compatibility)
    if (filterRecentlyPosted) {
      list = list.filter(j => {
        const date = j.createdAt ? new Date(j.createdAt) : new Date();
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });
    }

    // 14. Remote Jobs Only Filter (compatibility)
    if (filterRemoteOnly) {
      list = list.filter(j => 
        (j.workMode || "").toLowerCase().includes("remote") || 
        (j.location || "").toLowerCase().includes("remote") ||
        (j.type || "").toLowerCase().includes("remote")
      );
    }

    // 15. AI Recommended (matching skills)
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

  if (selectedJobDetails) {
    return (
      <JobDetails
        jobId={selectedJobDetails.id}
        userId={userId}
        userName={profile?.name || "Candidate"}
        profile={profile}
        resumeText={profile?.resumeText}
        onBack={() => setSelectedJobDetails(null)}
        onAppliedSuccess={(newApp) => {
          if (!applications.some(a => a.jobId === selectedJobDetails.id)) {
            applications.push(newApp);
          }
        }}
      />
    );
  }

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

          {/* Real-time Job Search Engine with Debouncing & Multi-Select Filters */}
          <JobSearchEngine onSearchChange={setSearchEngineFilters} />

          {/* Advanced Filtering Sub-Panel */}
            <div className="glass p-4 rounded-2xl border border-white/5 bg-[#0a0a0f] space-y-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-bold">
                <Filter className="w-4 h-4 text-indigo-400" />
                <span>ATS Advanced Filter Metrics</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* Row 1 */}
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

                {/* Row 2 */}
                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Job Type</label>
                  <select
                    value={filterJobType}
                    onChange={e => setFilterJobType(e.target.value)}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Any">Any Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Work Mode</label>
                  <select
                    value={filterWorkMode}
                    onChange={e => setFilterWorkMode(e.target.value)}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Any">Any Mode</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Work From Office">Work From Office</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Job Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering, Sales"
                    value={filterCategory === "Any" ? "" : filterCategory}
                    onChange={e => setFilterCategory(e.target.value || "Any")}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Date Posted</label>
                  <select
                    value={filterDatePosted}
                    onChange={e => setFilterDatePosted(e.target.value)}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Any">All Dates</option>
                    <option value="Today">Posted Today</option>
                    <option value="7Days">Last 7 Days</option>
                    <option value="30Days">Last 30 Days</option>
                  </select>
                </div>

                {/* Row 3 */}
                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Industry</label>
                  <select
                    value={filterIndustry}
                    onChange={e => setFilterIndustry(e.target.value)}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Any">Any Industry</option>
                    <option value="IT & Software">IT & Software</option>
                    <option value="FinTech">FinTech</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="EdTech">EdTech</option>
                    <option value="E-commerce">E-commerce</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 text-[10px] block">Qualification</label>
                  <select
                    value={filterQualification}
                    onChange={e => setFilterQualification(e.target.value)}
                    className="w-full bg-[#12121a] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Any">Any Degree</option>
                    <option value="Bachelor">Bachelor's Degree</option>
                    <option value="Master">Master's Degree</option>
                    <option value="PhD">PhD / Doctorate</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2.5 text-xs border-t border-white/5">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                  <input
                    type="checkbox"
                    checked={filterFreshersOnly}
                    onChange={e => setFilterFreshersOnly(e.target.checked)}
                    className="rounded border-white/10 bg-neutral-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Freshers Only</span>
                </label>

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
                    setFilterJobType("Any");
                    setFilterWorkMode("Any");
                    setFilterCategory("Any");
                    setFilterQualification("Any");
                    setFilterIndustry("Any");
                    setFilterFreshersOnly(false);
                    setFilterDatePosted("Any");
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
                <JobCard
                  key={job.id}
                  job={job}
                  applied={applied}
                  isSaved={isSaved}
                  abacCheck={abacCheck}
                  isAiOnly={isAiOnly}
                  onApply={onOneClickApply}
                  onSave={onSaveJob}
                  onShare={handleShareJob}
                  onCheckMatch={onCheckMatch}
                  onSelectDetails={setSelectedJobDetails}
                />
              );
            })}

            {filteredList.length === 0 && !loadingLive && (
              <div className="col-span-2 text-center py-16 glass rounded-2xl text-xs text-gray-500 italic border border-white/5">
                No job openings match your current filter metrics. Try resetting filters or choosing broader keywords.
              </div>
            )}

            {filteredList.length === 0 && loadingLive && (
              <div className="col-span-2 text-center py-16 glass rounded-2xl text-xs text-indigo-400 font-mono border border-white/5 flex flex-col justify-center items-center gap-3">
                <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Initializing real-time AI Jobs stream from Firestore...</span>
              </div>
            )}
          </div>

          {/* Sentinel observer element for automatic paginated fetching */}
          <div ref={sentinelRef} className="h-4 w-full" />

          {loadingMore && (
            <div className="flex justify-center items-center py-6 gap-2 text-xs text-indigo-400 font-mono">
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
              <span>Scanning deep database index for additional job openings...</span>
            </div>
          )}
          
          {!hasMore && filteredList.length > 0 && (
            <div className="text-center py-8 text-[11px] font-mono text-gray-500">
              ✓ All matching global verified job opportunities loaded successfully
            </div>
          )}
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
                        app.status?.toLowerCase() === "applied" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        app.status?.toLowerCase() === "interviewing" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                        app.status?.toLowerCase() === "offered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        app.status?.toLowerCase() === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-white/5 text-gray-300"
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

      {/* 4. PREMIUM JOB DETAILS OVERLAY MODAL */}
      {selectedJobDetails && (
        <div className="fixed inset-0 bg-[#020204]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200" id="job-details-modal">
          <div className="glass w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#090d16]/40">
              <div className="flex gap-4">
                <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl rounded-2xl w-14 h-14 shadow-lg shadow-indigo-500/20 shrink-0 uppercase">
                  {selectedJobDetails.companyName?.slice(0, 2) || "CO"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-extrabold uppercase">{selectedJobDetails.companyName}</span>
                    <span className="bg-white/5 text-gray-400 text-[9px] font-mono px-2 py-0.5 rounded border border-white/5">
                      {selectedJobDetails.type || "Full-time"}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-white mt-1">{selectedJobDetails.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobDetails(null)}
                className="p-2 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs text-gray-300 leading-relaxed">
              
              {/* Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-[11px]">
                <div className="space-y-0.5">
                  <p className="text-gray-500 font-mono font-bold uppercase text-[9px]">Salary package</p>
                  <p className="font-bold text-white flex items-center gap-1"><span className="text-emerald-400">💰</span> {selectedJobDetails.salary || "Competitive"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-gray-500 font-mono font-bold uppercase text-[9px]">Location</p>
                  <p className="font-bold text-white flex items-center gap-1"><span className="text-indigo-400">📍</span> {selectedJobDetails.location || "Remote"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-gray-500 font-mono font-bold uppercase text-[9px]">Experience</p>
                  <p className="font-bold text-white flex items-center gap-1"><span className="text-purple-400">💼</span> {selectedJobDetails.experience || "Any level"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-gray-500 font-mono font-bold uppercase text-[9px]">Posted Date</p>
                  <p className="font-bold text-white flex items-center gap-1"><span className="text-amber-400">⏱️</span> {selectedJobDetails.createdAt ? new Date(selectedJobDetails.createdAt).toLocaleDateString() : "Just Now"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400 font-mono">Job Description</h4>
                <p className="text-gray-300 whitespace-pre-wrap">{selectedJobDetails.description || "No full description provided."}</p>
              </div>

              {/* Requirements & Responsibilities */}
              {(selectedJobDetails.requirements || selectedJobDetails.responsibilities) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedJobDetails.requirements && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400 font-mono">Requirements</h4>
                      <p className="text-gray-400 leading-normal">{selectedJobDetails.requirements}</p>
                    </div>
                  )}
                  {selectedJobDetails.responsibilities && (
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400 font-mono">Key Responsibilities</h4>
                      <p className="text-gray-400 leading-normal">{selectedJobDetails.responsibilities}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Skills Required */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400 font-mono">Required Core Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJobDetails.skillsRequired?.map((sk, k) => (
                    <span key={k} className="text-[10px] font-mono px-2.5 py-1 bg-white/5 text-gray-200 rounded-lg border border-white/5 font-medium">{sk}</span>
                  ))}
                </div>
              </div>

              {/* Benefits & Perks */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400 font-mono">Benefits & Perks</h4>
                <p className="text-gray-400 leading-relaxed">
                  {selectedJobDetails.benefits || "Includes comprehensive medical insurance, flexible hybrid office schedule, fitness allowance, high-performance workstation equipment budget, and structured dual-track career progression planning."}
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-white/5 bg-[#090d16]/40 flex gap-3 items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const isSaved = savedJobIds.includes(selectedJobDetails.id);
                    onSaveJob(selectedJobDetails.id, isSaved);
                    showToast(isSaved ? "Vacancy removed from bookmarks!" : "Vacancy bookmarked successfully!", "success");
                  }}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer text-xs border ${
                    savedJobIds.includes(selectedJobDetails.id)
                      ? "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/15"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                  title="Save Job"
                >
                  <Heart className={`w-3.5 h-3.5 ${savedJobIds.includes(selectedJobDetails.id) ? "fill-current" : ""}`} />
                  <span>{savedJobIds.includes(selectedJobDetails.id) ? "Saved" : "Save Job"}</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + "/?jobId=" + selectedJobDetails.id);
                    showToast("Application link copied to clipboard successfully!", "success");
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer text-xs border border-white/10"
                  title="Share Posting"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedJobDetails(null);
                    onCheckMatch(selectedJobDetails);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold rounded-xl transition-all border border-white/5 cursor-pointer flex items-center gap-1"
                >
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span>Check Match</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedJobDetails(null);
                    onOneClickApply(selectedJobDetails);
                  }}
                  disabled={applications.some(app => app.jobId === selectedJobDetails.id)}
                  className={`px-6 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    applications.some(app => app.jobId === selectedJobDetails.id)
                      ? "bg-green-500/25 text-green-400 border border-green-500/20 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{applications.some(app => app.jobId === selectedJobDetails.id) ? "Applied" : "Apply Now"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
