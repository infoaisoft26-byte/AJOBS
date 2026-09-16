import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building,
  Calendar,
  Clock,
  ExternalLink,
  IndianRupee,
  MapPin,
  Sparkles,
} from "lucide-react";
import { JobPosting, UserProfile } from "../../types";
import { getLiveJobs } from "../../services/jobService";
import CandidateRegistrationCTA from "./CandidateRegistrationCTA";

interface Props {
  setActiveView: (view: string) => void;
  onSelectJob?: (jobId: string) => void;
  onApplyJob?: (job: JobPosting) => void;
  onGetStarted: () => void;
  user?: UserProfile | null;
}

export default function CandidateLiveJobs({
  setActiveView,
  onSelectJob,
  onApplyJob,
  onGetStarted,
  user,
}: Props) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("aijobs_bookmarked_jobs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    async function loadJobs() {
      try {
        setLoading(true);
        const liveList = await getLiveJobs();
        if (isMounted) {
          // Sort newest first
          const sorted = [...liveList].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.datePosted || 0).getTime();
            const dateB = new Date(b.createdAt || b.datePosted || 0).getTime();
            return dateB - dateA;
          });
          setJobs(sorted.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to fetch live jobs for homepage:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleBookmark = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setBookmarkedIds((prev) => {
      const exists = prev.includes(jobId);
      const next = exists ? prev.filter((id) => id !== jobId) : [...prev, jobId];
      try {
        localStorage.setItem("aijobs_bookmarked_jobs", JSON.stringify(next));
      } catch (err) {
        console.warn("Could not save bookmark:", err);
      }
      return next;
    });
  };

  const handleCardClick = (job: JobPosting) => {
    if (onSelectJob) {
      onSelectJob(job.id);
    } else if (onApplyJob) {
      onApplyJob(job);
    } else {
      sessionStorage.setItem("aijobs_view_job_id", job.id);
      setActiveView("public-jobs");
    }
  };

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-cyan-300 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Verified Openings</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Live Job{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Opportunities
            </span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Explore the latest openings from real companies
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveView("public-jobs")}
          className="inline-flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors group cursor-pointer"
        >
          <span>View All Jobs</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Main Grid: Live Jobs on Left / Registration CTA on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Jobs Column (2 cols on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            /* Skeleton State */
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="rounded-2xl bg-white/5 border border-white/10 p-5 animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="w-20 h-5 rounded-full bg-white/10" />
                  </div>
                  <div className="w-3/4 h-5 rounded bg-white/10" />
                  <div className="w-1/2 h-4 rounded bg-white/10" />
                  <div className="flex gap-2 pt-2">
                    <div className="w-16 h-6 rounded-lg bg-white/10" />
                    <div className="w-16 h-6 rounded-lg bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl bg-[#091530]/60 border border-white/10 p-10 text-center backdrop-blur-md">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-cyan-300 flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <Building className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">No live jobs found right now</h3>
              <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
                Check back soon or explore general openings across verified Indian recruiters.
              </p>
              <button
                type="button"
                onClick={() => setActiveView("public-jobs")}
                className="mt-6 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Browse All Openings
              </button>
            </div>
          ) : (
            /* Real Live Jobs List */
            <div className="grid sm:grid-cols-2 gap-4">
              {jobs.map((job) => {
                const isBookmarked = bookmarkedIds.includes(job.id);
                const employmentType =
                  job.employmentType || job.type || "Full Time";
                const displayLocation = job.location || "India (Hybrid / On-site)";

                return (
                  <div
                    key={job.id}
                    onClick={() => handleCardClick(job)}
                    className="group relative rounded-2xl bg-white p-5 shadow-[0_10px_30px_rgba(0,10,30,0.35)] border border-slate-100 hover:shadow-[0_16px_40px_rgba(0,102,255,0.2)] hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Company Icon + Type Badge + Bookmark */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="h-11 w-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                          {job.companyLogo ? (
                            <img
                              src={job.companyLogo}
                              alt={job.companyName}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <Building className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {employmentType}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(e, job.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                            title={isBookmarked ? "Remove Bookmark" : "Save Job"}
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Job Title */}
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {job.title}
                      </h3>

                      {/* Company Name */}
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 line-clamp-1">
                        {job.companyName || "Verified Employer"}
                      </p>

                      {/* Meta Info: Location & Salary */}
                      <div className="mt-3 flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[130px]">{displayLocation}</span>
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{job.salary}</span>
                          </span>
                        )}
                      </div>

                      {/* Skills tags */}
                      {Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {job.skillsRequired.slice(0, 3).map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skillsRequired.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[10px] font-semibold">
                              +{job.skillsRequired.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Quick Apply Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">
                        100% Verified
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        <span>Apply Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Registration Promo Card */}
        <div className="lg:col-span-1">
          <CandidateRegistrationCTA onGetStarted={onGetStarted} />
        </div>
      </div>
    </section>
  );
}
