import React, { useState } from "react";
import { Search, MapPin, Briefcase, Filter, ShieldCheck, Heart, Sparkles, AlertCircle } from "lucide-react";
import { JobPosting, JobApplication } from "../types";
import JobCard from "./JobCard";
import JobDetails from "./JobDetails";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";
import { trackJobView, trackJobSearch, trackJobApplyStarted } from "../utils/analytics";

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
  lang = "en"
}: CandidateJobsSectionProps) {
  const t = (key: string) => getTranslation(lang, key);

  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [locationFilter, setLocationFilter] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const savedJobIds = profile?.savedJobIds || [];
  const appliedJobIds = applications.map(a => a.jobId);

  // Filter Jobs
  const filteredJobs = jobs.filter((job) => {
    // Tab filter
    if (activeTab === "saved-jobs" && !savedJobIds.includes(job.id)) {
      return false;
    }

    // Keyword search
    const query = (localSearch || searchQuery).toLowerCase();
    if (query) {
      const matchTitle = job.title?.toLowerCase().includes(query);
      const matchCompany = job.companyName?.toLowerCase().includes(query);
      const matchSkills = job.skillsRequired?.some(s => s.toLowerCase().includes(query));
      if (!matchTitle && !matchCompany && !matchSkills) return false;
    }

    // Location
    if (locationFilter) {
      const jobLoc = (job.location || "").toLowerCase();
      if (!jobLoc.includes(locationFilter.toLowerCase())) return false;
    }

    // Work Type
    if (workTypeFilter !== "all") {
      const mode = (job.workMode || job.type || "").toLowerCase();
      if (workTypeFilter === "remote" && !mode.includes("remote")) return false;
      if (workTypeFilter === "wfh" && !mode.includes("wfh") && !mode.includes("work from home")) return false;
      if (workTypeFilter === "full_time" && !mode.includes("full")) return false;
      if (workTypeFilter === "part_time" && !mode.includes("part")) return false;
    }

    // Quick Pill Tag Filter
    if (activeTag) {
      const mode = (job.workMode || job.type || "").toLowerCase();
      const title = (job.title || "").toLowerCase();
      const exp = (job.experienceRequired || "").toLowerCase();

      if (activeTag === "freshers" && !(exp.includes("0") || exp.includes("fresher") || title.includes("fresher") || exp.includes("entry"))) return false;
      if (activeTag === "remote" && !mode.includes("remote")) return false;
      if (activeTag === "fullTime" && !mode.includes("full")) return false;
      if (activeTag === "wfh" && !(mode.includes("wfh") || mode.includes("work from home"))) return false;
      if (activeTag === "partTime" && !mode.includes("part")) return false;
      if (activeTag === "internship" && !(title.includes("intern") || mode.includes("intern"))) return false;
      if (activeTag === "walkin" && !(title.includes("walk") || mode.includes("walk"))) return false;
    }

    return true;
  });

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Title & Search Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab === "saved-jobs" ? t("savedJobs") : t("findJobs")}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {activeTab === "saved-jobs" 
                ? "Manage positions you have saved for later application."
                : "Explore verified career opportunities across top companies."
              }
            </p>
          </div>

          <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 self-start md:self-auto">
            Showing <span className="text-blue-600 font-bold">{filteredJobs.length}</span> positions
          </div>
        </div>

        {/* Safety Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2 text-blue-900 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{t("safetyNotice")}</span>
        </div>

        {/* Clean, Large Search & Filters Controls */}
        <div className="pt-2 space-y-4">
          <div className="bg-gray-50/90 p-3 sm:p-3.5 rounded-2xl border border-gray-200/90 flex flex-col lg:flex-row items-stretch gap-3 shadow-inner/5">
            {/* Field 1: Job Title or Skill */}
            <div className="relative flex-1 bg-white rounded-xl border border-gray-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-3 flex flex-col justify-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Job Title or Skill</span>
              </label>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder={t("searchPlaceholderTitle")}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>

            {/* Field 2: Location */}
            <div className="relative flex-1 bg-white rounded-xl border border-gray-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-3 flex flex-col justify-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                placeholder={t("searchPlaceholderLocation")}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>

            {/* Work Type Select */}
            <div className="relative bg-white rounded-xl border border-gray-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-3 flex flex-col justify-center min-w-[150px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Work Type</span>
              </label>
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="remote">Remote Only</option>
                <option value="wfh">Work From Home</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                setLocationFilter("");
                setWorkTypeFilter("all");
                setActiveTag(null);
              }}
              className="w-full lg:w-auto px-6 py-3.5 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>Reset Filters</span>
            </button>
          </div>

          {/* Quick Filter Tag Buttons (Pill Style) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              Quick Filters:
            </span>
            {[
              { id: "freshers", label: t("freshers") },
              { id: "remote", label: t("remote") },
              { id: "fullTime", label: t("fullTime") },
              { id: "wfh", label: t("wfh") },
              { id: "partTime", label: t("partTime") },
              { id: "internship", label: "Internship" },
              { id: "walkin", label: "Walk-in Jobs" }
            ].map((tag) => {
              const isSelected = activeTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setActiveTag(isSelected ? null : tag.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs scale-[1.02]"
                      : "bg-gray-50 hover:bg-blue-50/80 text-gray-700 hover:text-blue-700 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              profile={profile}
              applied={appliedJobIds.includes(job.id)}
              isSaved={savedJobIds.includes(job.id)}
              onApply={(j) => {
                try {
                  trackJobApplyStarted(j.id, j.title);
                } catch {}
                onApplyJob(j);
              }}
              onSave={(id, isS) => onSaveJob(id, isS)}
              onSelectDetails={(j) => {
                try {
                  trackJobView(j.id, j.title, j.companyName);
                } catch {}
                setSelectedJob(j);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-3">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-gray-900 text-base">No Matching Jobs Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search keywords, location filters, or reset filters to browse all open positions.
          </p>
        </div>
      )}
    </div>
  );
}
