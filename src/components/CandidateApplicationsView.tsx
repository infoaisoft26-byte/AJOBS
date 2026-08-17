import React, { useState, useMemo } from "react";
import { Clock, Briefcase, CheckCircle2, XCircle, ArrowRight, ShieldCheck, ChevronRight, Search, X, Building2, Calendar, FileText } from "lucide-react";
import { JobApplication } from "../types";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface ApplicationsViewProps {
  applications: JobApplication[];
  onNavigateToFindJobs: () => void;
  lang?: SupportedLanguage;
}

export default function CandidateApplicationsView({
  applications,
  onNavigateToFindJobs,
  lang = "en"
}: ApplicationsViewProps) {
  const t = (key: string) => getTranslation(lang, key);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "selected" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const timelineSteps = [
    { id: "applied", label: t("applied") },
    { id: "under_review", label: t("underReview") },
    { id: "shortlisted", label: t("shortlisted") },
    { id: "interview", label: t("interview") },
    { id: "selected", label: t("selected") },
    { id: "offer", label: t("offer") },
    { id: "joined", label: t("joined") }
  ];

  const getStepIndex = (statusStr: string) => {
    const s = (statusStr || "").toLowerCase();
    if (s.includes("reject")) return -1;
    if (s.includes("join")) return 6;
    if (s.includes("offer")) return 5;
    if (s.includes("select")) return 4;
    if (s.includes("interview")) return 3;
    if (s.includes("shortlist")) return 2;
    if (s.includes("review")) return 1;
    return 0; // Applied
  };

  // Status-based counts
  const counts = useMemo(() => {
    let active = 0;
    let selected = 0;
    let rejected = 0;

    applications.forEach(app => {
      const idx = getStepIndex(app.status);
      if (idx === -1) rejected++;
      else if (idx >= 4) selected++;
      else active++;
    });

    return { all: applications.length, active, selected, rejected };
  }, [applications]);

  // Filtered by status and search query (job title or company name)
  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter(app => {
      // 1. Status Filter
      const stepIdx = getStepIndex(app.status);
      if (filterStatus === "active" && (stepIdx < 0 || stepIdx >= 4)) return false;
      if (filterStatus === "selected" && stepIdx < 4) return false;
      if (filterStatus === "rejected" && stepIdx !== -1) return false;

      // 2. Search Query Filter (by Title or Company Name)
      if (query) {
        const titleMatch = (app.jobTitle || "").toLowerCase().includes(query);
        const companyMatch = (app.companyName || "").toLowerCase().includes(query);
        if (!titleMatch && !companyMatch) {
          return false;
        }
      }

      return true;
    });
  }, [applications, filterStatus, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12" id="candidate-applications-view">
      {/* Header & Controls */}
      <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{t("myApplications")}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Track all your job applications and recruitment status in real time.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-blue-500/30 self-start md:self-auto">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "active", label: "In Progress", count: counts.active },
              { id: "selected", label: "Offers", count: counts.selected },
              { id: "rejected", label: "Rejected", count: counts.rejected }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 border ${
                  filterStatus === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
                    : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/60"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterStatus === tab.id ? "bg-white/20 text-white font-bold" : "bg-slate-800 text-slate-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="pt-2 border-t border-blue-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-cyan-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="applications-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications by job title or company name..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 hover:bg-slate-900 focus:bg-slate-900 text-xs text-white placeholder:text-slate-500 font-medium rounded-xl border border-blue-500/25 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-300 font-medium self-end sm:self-center font-mono">
            {filteredApps.length === applications.length ? (
              <span>Total Applications: <strong className="text-cyan-300 font-bold">{applications.length}</strong></span>
            ) : (
              <span>Showing <strong className="text-cyan-300 font-bold">{filteredApps.length}</strong> of {applications.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length > 0 ? (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const currentStepIdx = getStepIndex(app.status);
            const isRejected = currentStepIdx === -1;

            return (
              <div 
                key={app.id} 
                className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-6 rounded-2xl border border-[rgba(37,99,235,0.35)] shadow-[0_8px_32px_rgba(0,0,0,0.45)] space-y-5 hover:border-cyan-400/50 transition-all"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-500/20 pb-4">
                  <div>
                    <h3 className="font-extrabold text-white text-lg tracking-tight">{app.jobTitle}</h3>
                    <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{app.companyName}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className={`px-3.5 py-1 rounded-full text-xs font-bold inline-block font-mono ${
                      isRejected 
                        ? "bg-red-950/70 text-red-300 border border-red-500/40"
                        : currentStepIdx >= 4
                        ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        : "bg-blue-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                    }`}>
                      {isRejected ? t("rejected") : (timelineSteps[currentStepIdx]?.label || app.status)}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center sm:justify-end gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </p>
                  </div>
                </div>

                {/* Recruiter & Interview Information Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Recruiter Status */}
                  <div className="p-3.5 bg-slate-950/70 rounded-xl border border-blue-500/25 flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-cyan-400/90 uppercase font-mono tracking-wider block">
                        Recruiter Status
                      </span>
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {app.assignedRecruiterName 
                          ? `Assigned: ${app.assignedRecruiterName}` 
                          : "Assigned: Central Talent Acquisition Team"}
                      </p>
                      <span className="text-[11px] text-slate-400 block">
                        {app.assignedAt ? `Assigned on ${new Date(app.assignedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : "Review in progress"}
                      </span>
                    </div>
                  </div>

                  {/* Interview Information */}
                  {app.interviewDate || app.interviewTime || app.status === "interview" ? (
                    <div className="p-3.5 bg-blue-950/60 rounded-xl border border-cyan-400/40 flex items-start space-x-3 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider font-mono block">
                          Interview Scheduled
                        </span>
                        <p className="text-xs font-bold text-white">
                          {app.interviewDate || "Date TBD"} {app.interviewTime ? `at ${app.interviewTime}` : ""}
                        </p>
                        <p className="text-[11px] text-slate-300">
                          Mode: <span className="font-semibold text-cyan-300">{app.interviewMode || "Online / Platform Room"}</span>
                          {app.interviewerName && ` • With: ${app.interviewerName}`}
                        </p>
                        {app.meetingLink && (
                          <div className="pt-1">
                            <a
                              href={app.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline gap-1"
                            >
                              <span>Join Meeting Link</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-950/70 rounded-xl border border-blue-500/25 flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-blue-500/20 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">
                          Interview Information
                        </span>
                        <p className="text-xs font-semibold text-slate-300">
                          Pending shortlist evaluation
                        </p>
                        <span className="text-[11px] text-slate-400 block">
                          You will be notified once a slot is scheduled
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                {isRejected ? (
                  <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Application not selected for this position. Keep applying for other vacancies!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">
                      Application Status Progress
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 pt-1">
                      {timelineSteps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div 
                            key={step.id} 
                            className={`p-2 rounded-xl text-center text-[11px] font-semibold border transition-all ${
                              isCurrent
                                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)] font-bold scale-[1.02]"
                                : isCompleted
                                ? "bg-blue-950/80 text-cyan-300 border-cyan-500/30"
                                : "bg-slate-950/60 text-slate-500 border-blue-500/15"
                            }`}
                          >
                            <span>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : applications.length > 0 ? (
        /* Empty search or filter results */
        <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-10 text-center rounded-2xl border border-[rgba(37,99,235,0.35)] space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-950 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(0,229,255,0.2)]">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">No Matching Applications</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No applications matched {searchQuery ? `"${searchQuery}"` : "the selected filter"}. Try modifying your search term or filter.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-cyan-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* No applications submitted yet */
        <div className="bg-[rgba(4,12,35,0.75)] backdrop-blur-[20px] p-12 text-center rounded-2xl border border-[rgba(37,99,235,0.35)] space-y-4">
          <Clock className="w-10 h-10 text-slate-500 mx-auto" />
          <div>
            <h3 className="font-bold text-white text-base">No Applications Found</h3>
            <p className="text-xs text-slate-400 mt-1">You haven't submitted any job applications yet.</p>
          </div>
          <button
            onClick={onNavigateToFindJobs}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <span>{t("findJobs")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

