import React, { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  ShieldCheck, 
  Sparkles, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  Bookmark, 
  Heart, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";
import { JobPosting, JobApplication } from "../types";
import { calculateProfileCompletion, calculateJobMatchScore, JobMatchResult } from "../services/jobMatchEngine";

interface OverviewProps {
  userName: string;
  profile: any;
  applications: JobApplication[];
  jobsCount: number;
  notifications: any[];
  onSelectTab: (tab: any) => void;
  jobs?: JobPosting[];
  onSaveJob?: (jobId: string, remove: boolean) => Promise<void>;
  onApplyJob?: (job: JobPosting) => void;
  lang?: SupportedLanguage;
  onSearchSubmit?: (title: string, location: string, tag?: string) => void;
}

export default function CandidateDashboardOverview({
  userName,
  profile,
  applications,
  jobsCount,
  notifications,
  onSelectTab,
  jobs = [],
  onSaveJob,
  onApplyJob,
  lang = "en",
  onSearchSubmit
}: OverviewProps) {
  const t = (key: string) => getTranslation(lang, key);

  // Search Bar state
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Calculate Profile Completion Percentage using standardized Engine
  const [profileCompletion, setProfileCompletion] = useState(0);
  useEffect(() => {
    setProfileCompletion(calculateProfileCompletion(profile));
  }, [profile]);

  // Handle Search Submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchTitle, searchLocation, activeTag || undefined);
    }
    onSelectTab("explore-jobs");
  };

  const handleTagClick = (tag: string) => {
    const nextTag = activeTag === tag ? null : tag;
    setActiveTag(nextTag);
    if (onSearchSubmit) {
      onSearchSubmit(searchTitle, searchLocation, nextTag || undefined);
    }
    onSelectTab("explore-jobs");
  };

  // Job Filtering & AI Match Ranking
  const savedJobIds = profile?.savedJobIds || [];
  
  // Sort jobs by candidate AI match score descending for recommendations
  const rankedJobs = [...jobs].map(job => ({
    job,
    match: calculateJobMatchScore(job, profile)
  })).sort((a, b) => b.match.totalScore - a.match.totalScore);

  const recommendedJobs = rankedJobs.slice(0, 3);
  const latestJobs = jobs.slice(0, 4);
  const savedJobs = jobs.filter(j => savedJobIds.includes(j.id));

  // Application Stats
  const totalApplied = applications.length;
  const underReviewCount = applications.filter(a => a.status === "under_review" || a.status === "applied").length;
  const shortlistedCount = applications.filter(a => a.status === "shortlisted" || a.status === "interviewing").length;

  // Upcoming Interview check
  const upcomingInterviewApp = applications.find(
    a => a.status === "interviewing" || a.status === "interview_scheduled" || a.interviewDate
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Welcome Panel */}
      <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 sm:p-8 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-500/20 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t("welcome")}, <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">{userName || "Candidate"}</span> 👋
            </h1>
            <p className="text-sm text-slate-300 mt-1 font-medium">
              Find your dream job, track applications, and manage your career effortlessly with AIJOBS.
            </p>
          </div>

          <button
            onClick={() => onSelectTab("profile")}
            className="self-start md:self-center flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/30 to-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:text-white hover:border-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(0,229,255,0.2)]"
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Profile {profileCompletion}% Complete</span>
          </button>
        </div>

        {/* Safety Notice Banner */}
        <div className="p-3.5 bg-blue-950/70 border border-cyan-500/35 rounded-xl flex items-center space-x-3 text-cyan-300 text-xs font-semibold shadow-xs">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
          <span>{t("safetyNotice")}</span>
        </div>

        {/* Futuristic Job Search Bar */}
        <form onSubmit={handleSearch} className="pt-2 space-y-4">
          <div className="bg-slate-950/80 p-3 sm:p-3.5 rounded-2xl border border-blue-500/30 flex flex-col lg:flex-row items-stretch gap-3 shadow-inner">
            {/* Field 1: Job Title or Skill */}
            <div className="relative flex-1 bg-slate-900/90 rounded-xl border border-blue-500/25 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all p-3 flex flex-col justify-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 font-mono mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Job Title or Skill</span>
              </label>
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                placeholder={t("searchPlaceholderTitle")}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Field 2: Location */}
            <div className="relative flex-1 bg-slate-900/90 rounded-xl border border-blue-500/25 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all p-3 flex flex-col justify-center">
              <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 font-mono mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder={t("searchPlaceholderLocation")}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Search Button with Neon Gradient */}
            <button
              type="submit"
              className="w-full lg:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 hover:from-blue-500 hover:via-cyan-400 hover:to-purple-500 active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>{t("searchBtn")}</span>
            </button>
          </div>

          {/* Quick Filter Tag Buttons (Pill Style) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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
                  onClick={() => handleTagClick(tag.id)}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-[1.02]"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-blue-500/25 hover:border-cyan-400/50"
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {tag.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* 4 Real Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Profile Completion */}
        <div className="bg-[rgba(4,12,35,0.72)] backdrop-blur-[18px] p-5 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-cyan-400/50 transition-all space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{t("profileCompletion")}</span>
            <span className="text-cyan-400 font-mono font-bold">{profileCompletion}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-blue-500/20">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_10px_#00E5FF]" 
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <button 
            onClick={() => onSelectTab("profile")}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 pt-1"
          >
            Update Profile &rarr;
          </button>
        </div>

        {/* 2. Resume Status */}
        <div className="bg-[rgba(4,12,35,0.72)] backdrop-blur-[18px] p-5 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-cyan-400/50 transition-all space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{t("resumeStatus")}</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="font-bold text-white text-base">
            {profile?.resumeUrl || profile?.resumeText ? "Uploaded & Ready" : "Resume Missing"}
          </p>
          <button 
            onClick={() => onSelectTab("resume")}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Manage Resume &rarr;
          </button>
        </div>

        {/* 3. Application Status */}
        <div className="bg-[rgba(4,12,35,0.72)] backdrop-blur-[18px] p-5 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-cyan-400/50 transition-all space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{t("applicationStatus")}</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-white font-mono">{totalApplied}</span>
            <span className="text-xs text-slate-400 font-medium">Applied</span>
          </div>
          <p className="text-xs text-slate-400">
            {underReviewCount} Under Review • {shortlistedCount} Shortlisted
          </p>
        </div>

        {/* 4. Upcoming Interview Banner */}
        <div className="bg-[rgba(4,12,35,0.72)] backdrop-blur-[18px] p-5 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-cyan-400/50 transition-all space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>{t("upcomingInterviews")}</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          {upcomingInterviewApp ? (
            <div>
              <p className="font-bold text-white text-sm truncate">{upcomingInterviewApp.jobTitle}</p>
              <p className="text-xs text-cyan-400 font-semibold mt-0.5">{upcomingInterviewApp.companyName}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic pt-1">No interview scheduled</p>
          )}
          <button 
            onClick={() => onSelectTab("interviews")}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            View Interviews &rarr;
          </button>
        </div>
      </div>

      {/* Recommended Jobs (AI Match) */}
      <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-4">
        <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white tracking-wide">{t("recommendedJobs")}</h2>
          </div>
          <button 
            onClick={() => onSelectTab("explore-jobs")}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            View All Jobs &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedJobs.length > 0 ? (
            recommendedJobs.map(({ job, match }) => (
              <div 
                key={job.id} 
                className="p-4 rounded-xl border border-blue-500/30 hover:border-cyan-400/70 hover:shadow-[0_8px_25px_rgba(0,140,255,0.25)] transition-all bg-slate-950/70 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full border border-cyan-400/50 bg-cyan-500/15 text-cyan-300 font-mono shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                          🔥 {match.totalScore}% Match
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">{job.title}</h3>
                    </div>
                    {onSaveJob && (
                      <button
                        onClick={() => onSaveJob(job.id, savedJobIds.includes(job.id))}
                        className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer"
                        title={savedJobIds.includes(job.id) ? "Unsave" : "Save"}
                      >
                        <Heart className={`w-4 h-4 ${savedJobIds.includes(job.id) ? "fill-cyan-400 text-cyan-400 drop-shadow-[0_0_8px_#00E5FF]" : ""}`} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-cyan-400">{job.companyName}</p>
                  <p className="text-xs text-slate-400 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{job.location || "Remote"}</span>
                  </p>
                  {job.salary && (
                    <p className="text-xs font-semibold text-slate-200 font-mono">
                      ₹{job.salary}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-blue-500/20 mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectTab("explore-jobs")}
                    className="text-xs text-slate-400 hover:text-white font-semibold cursor-pointer"
                  >
                    {t("viewJob")}
                  </button>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center text-xs text-slate-400 italic bg-slate-950/60 rounded-xl border border-blue-500/20">
              No recommended jobs available at this moment. Complete your profile to improve recommendations.
            </div>
          )}
        </div>
      </div>

      {/* Latest & Saved Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Jobs */}
        <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-4">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <h2 className="text-base font-bold text-white tracking-wide">{t("latestJobs")}</h2>
            <button 
              onClick={() => onSelectTab("explore-jobs")}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              See All &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {latestJobs.length > 0 ? (
              latestJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-3.5 rounded-xl border border-blue-500/25 hover:border-cyan-400/50 flex items-center justify-between gap-3 bg-slate-950/70 transition-all"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{job.title}</h4>
                    <p className="text-xs text-slate-400">{job.companyName} • {job.location || "Remote"}</p>
                  </div>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3 py-1.5 bg-blue-600/30 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-4 text-center">No latest jobs posted.</p>
            )}
          </div>
        </div>

        {/* Saved Jobs */}
        <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-4">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
            <h2 className="text-base font-bold text-white tracking-wide">{t("savedJobs")} ({savedJobs.length})</h2>
            <button 
              onClick={() => onSelectTab("saved-jobs")}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              View Saved ({savedJobs.length}) &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {savedJobs.length > 0 ? (
              savedJobs.slice(0, 4).map((job) => (
                <div 
                  key={job.id}
                  className="p-3.5 rounded-xl border border-blue-500/25 hover:border-cyan-400/50 flex items-center justify-between gap-3 bg-slate-950/70 transition-all"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{job.title}</h4>
                    <p className="text-xs text-slate-400">{job.companyName} • {job.location || "Remote"}</p>
                  </div>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-4 text-center">You haven't saved any jobs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
