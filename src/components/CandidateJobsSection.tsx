import React, { useState, useMemo } from "react";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Filter, 
  ShieldCheck, 
  Heart, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Building2, 
  ChevronRight, 
  X, 
  BadgeCheck, 
  User, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { JobPosting, JobApplication } from "../types";
import JobCard from "./JobCard";
import JobDetails from "./JobDetails";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";
import { trackJobView, trackJobApplyStarted } from "../utils/analytics";

interface CandidateJobsSectionProps {
  userId: string;
  profile: any;
  jobs: JobPosting[];
  applications: JobApplication[];
  activeTab: "explore-jobs" | "saved-jobs";
  onSaveJob: (jobId: string, remove: boolean) => Promise<void>;
  onApplyJob: (job: JobPosting) => void;
  searchQuery?: string;
  lang?: SupportedLanguage;
  onNavigateToProfile?: () => void;
}

export default function CandidateJobsSection({
  userId,
  profile,
  jobs,
  applications,
  activeTab,
  onSaveJob,
  onApplyJob,
  searchQuery = "",
  lang = "en",
  onNavigateToProfile
}: CandidateJobsSectionProps) {
  const t = (key: string) => getTranslation(lang, key);

  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [workModeFilter, setWorkModeFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [datePostedFilter, setDatePostedFilter] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const savedJobIds = profile?.savedJobIds || [];
  const appliedJobIds = applications.map(a => a.jobId);

  // Filter Jobs Logic
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Saved tab filter
      if (activeTab === "saved-jobs" && !savedJobIds.includes(job.id)) {
        return false;
      }

      // Keyword search
      const query = (localSearch || searchQuery).toLowerCase().trim();
      if (query) {
        const matchTitle = job.title?.toLowerCase().includes(query);
        const matchCompany = job.companyName?.toLowerCase().includes(query);
        const matchSkills = job.skillsRequired?.some(s => s.toLowerCase().includes(query));
        const matchDesc = job.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchCompany && !matchSkills && !matchDesc) return false;
      }

      // Location filter
      if (locationFilter && locationFilter !== "all") {
        const jobLoc = (job.location || "").toLowerCase();
        if (!jobLoc.includes(locationFilter.toLowerCase())) return false;
      }

      // Work Mode (In-Office, Hybrid, Remote)
      if (workModeFilter !== "all") {
        const mode = (job.workMode || "").toLowerCase();
        if (workModeFilter === "remote" && !mode.includes("remote") && !mode.includes("wfh")) return false;
        if (workModeFilter === "hybrid" && !mode.includes("hybrid")) return false;
        if (workModeFilter === "in_office" && (mode.includes("remote") || mode.includes("wfh"))) return false;
      }

      // Work Type (Full Time, Part Time, Internship)
      if (workTypeFilter !== "all") {
        const type = (job.type || "").toLowerCase();
        if (workTypeFilter === "full_time" && !type.includes("full")) return false;
        if (workTypeFilter === "part_time" && !type.includes("part")) return false;
        if (workTypeFilter === "internship" && !type.includes("intern")) return false;
      }

      // Experience filter
      if (experienceFilter !== "all") {
        const exp = (job.experience || job.experienceRequired || "").toLowerCase();
        if (experienceFilter === "fresher") {
          const isFresher = exp.includes("fresher") || exp.includes("0-1") || exp.includes("0 - 1") || exp.includes("junior");
          if (!isFresher) return false;
        } else if (experienceFilter === "1-3") {
          if (!exp.includes("1") && !exp.includes("2") && !exp.includes("3")) return false;
        } else if (experienceFilter === "3-5") {
          if (!exp.includes("3") && !exp.includes("4") && !exp.includes("5")) return false;
        } else if (experienceFilter === "5+") {
          if (!exp.includes("5") && !exp.includes("6") && !exp.includes("7") && !exp.includes("8") && !exp.includes("+")) return false;
        }
      }

      // Date Posted filter
      if (datePostedFilter !== "all" && job.createdAt) {
        const jobTime = new Date(job.createdAt).getTime();
        const now = Date.now();
        const diffHours = (now - jobTime) / (1000 * 60 * 60);

        if (datePostedFilter === "24h" && diffHours > 24) return false;
        if (datePostedFilter === "3d" && diffHours > 72) return false;
        if (datePostedFilter === "7d" && diffHours > 168) return false;
        if (datePostedFilter === "14d" && diffHours > 336) return false;
      }

      // Quick Tag pills
      if (activeTag) {
        const mode = (job.workMode || job.type || "").toLowerCase();
        const title = (job.title || "").toLowerCase();
        const exp = (job.experience || job.experienceRequired || "").toLowerCase();

        if (activeTag === "freshers" && !(exp.includes("0") || exp.includes("fresher") || title.includes("fresher") || exp.includes("entry"))) return false;
        if (activeTag === "remote" && !mode.includes("remote") && !mode.includes("wfh")) return false;
        if (activeTag === "fullTime" && !mode.includes("full")) return false;
        if (activeTag === "internship" && !(title.includes("intern") || mode.includes("intern"))) return false;
        if (activeTag === "urgent" && !(job.isFeatured || title.includes("urgent") || (job.description && job.description.toLowerCase().includes("urgent")))) return false;
      }

      return true;
    });
  }, [
    jobs, activeTab, savedJobIds, localSearch, searchQuery, 
    locationFilter, workModeFilter, workTypeFilter, experienceFilter, 
    datePostedFilter, activeTag
  ]);

  const resetAllFilters = () => {
    setLocalSearch("");
    setLocationFilter("");
    setWorkModeFilter("all");
    setWorkTypeFilter("all");
    setSalaryFilter("all");
    setExperienceFilter("all");
    setDatePostedFilter("all");
    setActiveTag(null);
  };

  const hasActiveFilters = localSearch || locationFilter || workModeFilter !== "all" || workTypeFilter !== "all" || experienceFilter !== "all" || datePostedFilter !== "all" || activeTag;

  if (selectedJob) {
    return (
      <div className="space-y-4">
        <JobDetails
          jobId={selectedJob.id}
          userId={userId}
          userName={profile?.name || "Candidate"}
          profile={profile}
          onBack={() => setSelectedJob(null)}
          onSelectSimilarJob={(id) => {
            const found = jobs.find(j => j.id === id);
            if (found) setSelectedJob(found);
          }}
          onAppliedSuccess={() => {
            setSelectedJob(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" id="candidate-jobs-portal">
      
      {/* 1. Header & Quick Search Bar */}
      <div className="bg-[#07152F] p-6 rounded-3xl border border-blue-900/50 shadow-xl space-y-4 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/60 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeTab === "saved-jobs" ? "Saved Job Openings" : "Verified Job Openings"}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Browse real job postings from verified corporate recruiters and direct employers across India.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-300 bg-blue-950/80 px-3 py-1.5 rounded-xl border border-cyan-500/30">
              {filteredJobs.length} Live Openings
            </span>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Safety Seal */}
        <div className="p-3 bg-blue-950/60 border border-cyan-500/30 rounded-xl flex items-center space-x-2 text-cyan-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>AIJOBS Candidate Guarantee: 100% Free for Job Seekers • Never pay for interviews or offers</span>
        </div>

        {/* Main Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by job title, skill (e.g. React, Python), or company..."
              className="w-full bg-slate-900/90 border border-blue-500/30 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="sm:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location (e.g. Bengaluru, Remote)"
              className="w-full bg-slate-900/90 border border-blue-500/30 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Quick Filter Pill Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick:</span>
          {[
            { id: "freshers", label: "Freshers (0 Yrs)" },
            { id: "remote", label: "Remote / WFH" },
            { id: "fullTime", label: "Full Time" },
            { id: "internship", label: "Internships" },
            { id: "urgent", label: "Urgent Hiring" }
          ].map((tag) => {
            const isSelected = activeTag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(isSelected ? null : tag.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-xs"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-blue-500/30"
                }`}
              >
                {tag.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-red-400 hover:text-red-300 font-semibold ml-auto flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. THREE-COLUMN DESKTOP LAYOUT (Filters | Job Cards | Candidate)  */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ------------------------------------------------------------- */}
        {/* LEFT COLUMN: FILTERS PANEL (Desktop Sidebar & Mobile Drawer)  */}
        {/* ------------------------------------------------------------- */}
        <div className={`lg:col-span-3 space-y-4 ${mobileFilterOpen ? "block" : "hidden lg:block"}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filters</span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter 1: Date Posted */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Date Posted</label>
              <select
                value={datePostedFilter}
                onChange={(e) => setDatePostedFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="all">Anytime</option>
                <option value="24h">Past 24 Hours</option>
                <option value="3d">Past 3 Days</option>
                <option value="7d">Past 7 Days</option>
                <option value="14d">Past 14 Days</option>
              </select>
            </div>

            {/* Filter 2: Location / Cities */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Top Cities</label>
              <div className="space-y-1">
                {[
                  { label: "All India", value: "" },
                  { label: "Bengaluru", value: "bengaluru" },
                  { label: "Mumbai", value: "mumbai" },
                  { label: "Delhi NCR", value: "delhi" },
                  { label: "Hyderabad", value: "hyderabad" },
                  { label: "Pune", value: "pune" },
                  { label: "Remote Only", value: "remote" }
                ].map((item) => (
                  <label key={item.label} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 cursor-pointer py-0.5">
                    <input
                      type="radio"
                      name="locationRadio"
                      checked={locationFilter.toLowerCase() === item.value}
                      onChange={() => setLocationFilter(item.value)}
                      className="text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter 3: Work Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Work Mode</label>
              <select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="all">All Modes</option>
                <option value="in_office">In-Office</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote / Work from Home</option>
              </select>
            </div>

            {/* Filter 4: Work Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Employment Type</label>
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            {/* Filter 5: Experience */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Experience Level</label>
              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="all">All Experience Levels</option>
                <option value="fresher">Fresher (0 Years)</option>
                <option value="1-3">1 - 3 Years</option>
                <option value="3-5">3 - 5 Years</option>
                <option value="5+">5+ Years</option>
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CENTER COLUMN: JOB CARDS FEED                                 */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 px-1">
            <span>Showing {filteredJobs.length} verified jobs</span>
            <span>Sorted by: Relevance & Date</span>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  profile={profile}
                  applied={appliedJobIds.includes(job.id)}
                  isSaved={savedJobIds.includes(job.id)}
                  onApply={(j) => {
                    try { trackJobApplyStarted(j.id, j.title); } catch {}
                    onApplyJob(j);
                  }}
                  onSave={(id, isS) => onSaveJob(id, isS)}
                  onSelectDetails={(j) => {
                    try { trackJobView(j.id, j.title, j.companyName); } catch {}
                    setSelectedJob(j);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">No Matching Jobs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No jobs matched your exact combination of search terms and filters. Try clearing some filters to explore more opportunities.
              </p>
              <button
                onClick={resetAllFilters}
                className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT COLUMN: CANDIDATE PROFILE PREFERENCES PANEL             */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-4 sticky top-24">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                {profile?.name ? profile.name.slice(0, 2).toUpperCase() : "CA"}
              </div>
              <div className="truncate">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {profile?.name || "Candidate"}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified Candidate
                </span>
              </div>
            </div>

            {/* Profile Strength */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Profile Strength</span>
                <span className="text-blue-600 font-mono">{profile?.profileCompletion || 85}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${profile?.profileCompletion || 85}%` }}
                />
              </div>
            </div>

            {/* Job Preferences Summary */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                Your Job Preferences
              </p>

              <div>
                <span className="text-slate-500">Target Role: </span>
                <span className="font-semibold text-slate-800">
                  {profile?.targetRole || (profile?.preferredRoles && profile.preferredRoles[0]) || "Software Engineer"}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Preferred Cities: </span>
                <span className="font-semibold text-slate-800">
                  {profile?.preferredLocation || (profile?.preferredCities && profile.preferredCities.join(", ")) || "Bengaluru / India"}
                </span>
              </div>

              <div>
                <span className="text-slate-500">Work Status: </span>
                <span className="font-semibold text-slate-800">
                  {profile?.workStatus === "fresher" ? "Fresher" : (profile?.experience || "Experienced")}
                </span>
              </div>
            </div>

            {/* Applications Quick Tracker */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                <span className="block text-base font-black text-blue-700">{applications.length}</span>
                <span className="text-[10px] text-blue-600 font-semibold">Applied</span>
              </div>

              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="block text-base font-black text-emerald-700">{savedJobIds.length}</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Saved Jobs</span>
              </div>
            </div>

            {/* Edit Profile CTA */}
            {onNavigateToProfile && (
              <button
                onClick={onNavigateToProfile}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Edit Job Preferences</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Trust Seal Banner */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50/40 p-4 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>100% Free for Job Seekers</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              AIJOBS connects you directly with verified recruiters without middleman commissions.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
