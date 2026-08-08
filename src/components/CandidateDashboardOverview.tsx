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

  // Calculate Profile Completion Percentage
  const [profileCompletion, setProfileCompletion] = useState(0);
  useEffect(() => {
    let score = 20;
    if (profile?.name || profile?.profileDetails?.fullName) score += 15;
    if (profile?.profileDetails?.mobileNumber) score += 15;
    if (profile?.resumeText || profile?.resumeUrl) score += 20;
    if (profile?.education && Object.keys(profile.education).length > 0) score += 15;
    if (profile?.skills && (Array.isArray(profile.skills) ? profile.skills.length > 0 : true)) score += 15;
    setProfileCompletion(Math.min(score, 100));
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

  // Job Filtering
  const savedJobIds = profile?.savedJobIds || [];
  const recommendedJobs = jobs.slice(0, 3);
  const latestJobs = jobs.slice(0, 4);
  const recentlyPostedJobs = jobs.slice(0, 4);
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
      {/* Top Banner & Welcome */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {t("welcome")}, <span className="text-blue-600">{userName || "Candidate"}</span> 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Find your dream job, track applications, and manage your career effortlessly.
            </p>
          </div>

          <button
            onClick={() => onSelectTab("profile")}
            className="self-start md:self-center flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Profile {profileCompletion}% Complete</span>
          </button>
        </div>

        {/* Safety Notice Banner */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-3 text-blue-900 text-xs font-medium">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>{t("safetyNotice")}</span>
        </div>

        {/* Large Clean Job Search Bar */}
        <form onSubmit={handleSearch} className="pt-2 space-y-4">
          <div className="bg-gray-50/90 p-3 sm:p-3.5 rounded-2xl border border-gray-200/90 flex flex-col lg:flex-row items-stretch gap-3 shadow-inner/5">
            {/* Field 1: Job Title or Skill */}
            <div className="relative flex-1 bg-white rounded-xl border border-gray-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all p-3 flex flex-col justify-center">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Job Title or Skill</span>
              </label>
              <input
                type="text"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
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
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder={t("searchPlaceholderLocation")}
                className="w-full bg-transparent text-sm sm:text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="w-full lg:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>{t("searchBtn")}</span>
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
                  onClick={() => handleTagClick(tag.id)}
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
        </form>
      </div>

      {/* Quick Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profile Completion */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>{t("profileCompletion")}</span>
            <span className="text-blue-600 font-bold">{profileCompletion}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500" 
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <button 
            onClick={() => onSelectTab("profile")}
            className="text-xs text-blue-600 hover:underline font-semibold block pt-1"
          >
            Update Profile &rarr;
          </button>
        </div>

        {/* Resume Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>{t("resumeStatus")}</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-bold text-gray-900 text-base">
            {profile?.resumeUrl || profile?.resumeText ? "Uploaded & Ready" : "Resume Missing"}
          </p>
          <button 
            onClick={() => onSelectTab("resume")}
            className="text-xs text-blue-600 hover:underline font-semibold block"
          >
            Manage Resume &rarr;
          </button>
        </div>

        {/* Application Status */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>{t("applicationStatus")}</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{totalApplied}</span>
            <span className="text-xs text-gray-500 font-medium">Applied</span>
          </div>
          <p className="text-xs text-gray-500">
            {underReviewCount} Under Review • {shortlistedCount} Shortlisted
          </p>
        </div>

        {/* Upcoming Interview Banner */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>{t("upcomingInterviews")}</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          {upcomingInterviewApp ? (
            <div>
              <p className="font-bold text-gray-900 text-sm truncate">{upcomingInterviewApp.jobTitle}</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">{upcomingInterviewApp.companyName}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic pt-1">No interview scheduled</p>
          )}
          <button 
            onClick={() => onSelectTab("interviews")}
            className="text-xs text-blue-600 hover:underline font-semibold block"
          >
            View Interviews &rarr;
          </button>
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{t("recommendedJobs")}</h2>
          </div>
          <button 
            onClick={() => onSelectTab("explore-jobs")}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All Jobs &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedJobs.length > 0 ? (
            recommendedJobs.map((job) => (
              <div 
                key={job.id} 
                className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xs transition-all bg-white flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{job.title}</h3>
                    {onSaveJob && (
                      <button
                        onClick={() => onSaveJob(job.id, savedJobIds.includes(job.id))}
                        className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                        title={savedJobIds.includes(job.id) ? "Unsave" : "Save"}
                      >
                        <Heart className={`w-4 h-4 ${savedJobIds.includes(job.id) ? "fill-blue-600 text-blue-600" : ""}`} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-blue-700">{job.companyName}</p>
                  <p className="text-xs text-gray-500 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{job.location || "Remote"}</span>
                  </p>
                  {job.salary && (
                    <p className="text-xs font-semibold text-gray-800">
                      ₹{job.salary}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectTab("explore-jobs")}
                    className="text-xs text-gray-600 hover:text-gray-900 font-semibold cursor-pointer"
                  >
                    {t("viewJob")}
                  </button>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-8 text-center text-xs text-gray-500 italic bg-gray-50 rounded-xl">
              No recommended jobs available at this moment.
            </div>
          )}
        </div>
      </div>

      {/* Latest & Saved Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Jobs */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900">{t("latestJobs")}</h2>
            <button 
              onClick={() => onSelectTab("explore-jobs")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              See All &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {latestJobs.length > 0 ? (
              latestJobs.map((job) => (
                <div 
                  key={job.id}
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-200 flex items-center justify-between gap-3 bg-gray-50/50"
                >
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
                    <p className="text-xs text-gray-500">{job.companyName} • {job.location || "Remote"}</p>
                  </div>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-blue-600 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic p-4 text-center">No latest jobs posted.</p>
            )}
          </div>
        </div>

        {/* Saved Jobs */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900">{t("savedJobs")} ({savedJobs.length})</h2>
            <button 
              onClick={() => onSelectTab("saved-jobs")}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Saved ({savedJobs.length}) &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {savedJobs.length > 0 ? (
              savedJobs.slice(0, 4).map((job) => (
                <div 
                  key={job.id}
                  className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-200 flex items-center justify-between gap-3 bg-gray-50/50"
                >
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
                    <p className="text-xs text-gray-500">{job.companyName} • {job.location || "Remote"}</p>
                  </div>
                  {onApplyJob && (
                    <button
                      onClick={() => onApplyJob(job)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0"
                    >
                      {t("applyNow")}
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500 italic p-4 text-center">You haven't saved any jobs yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
