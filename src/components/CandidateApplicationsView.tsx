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
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("myApplications")}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Track all your job applications and recruitment status in real time.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200 self-start md:self-auto">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "active", label: "In Progress", count: counts.active },
              { id: "selected", label: "Offers", count: counts.selected },
              { id: "rejected", label: "Rejected", count: counts.rejected }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  filterStatus === tab.id
                    ? "bg-white text-blue-600 shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.id ? "bg-blue-50 text-blue-700" : "bg-gray-200 text-gray-600"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="applications-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications by job title or company name..."
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 hover:bg-white focus:bg-white text-xs text-gray-900 font-medium rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200/60 transition-all cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium self-end sm:self-center">
            {filteredApps.length === applications.length ? (
              <span>Total Applications: <strong className="text-gray-900">{applications.length}</strong></span>
            ) : (
              <span>Showing <strong className="text-blue-600">{filteredApps.length}</strong> of {applications.length}</span>
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
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5 hover:border-blue-200 transition-all"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{app.jobTitle}</h3>
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>{app.companyName}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                      isRejected 
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : currentStepIdx >= 4
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {isRejected ? t("rejected") : (timelineSteps[currentStepIdx]?.label || app.status)}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-1 flex items-center sm:justify-end gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </p>
                  </div>
                </div>

                {/* Recruiter & Interview Information Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Recruiter Status */}
                  <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                        Recruiter Status
                      </span>
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {app.assignedRecruiterName 
                          ? `Assigned: ${app.assignedRecruiterName}` 
                          : "Assigned: Central Talent Acquisition Team"}
                      </p>
                      <span className="text-[11px] text-gray-500 block">
                        {app.assignedAt ? `Assigned on ${new Date(app.assignedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}` : "Review in progress"}
                      </span>
                    </div>
                  </div>

                  {/* Interview Information */}
                  {app.interviewDate || app.interviewTime || app.status === "interview" ? (
                    <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200/60 flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                          Interview Scheduled
                        </span>
                        <p className="text-xs font-bold text-gray-900">
                          {app.interviewDate || "Date TBD"} {app.interviewTime ? `at ${app.interviewTime}` : ""}
                        </p>
                        <p className="text-[11px] text-gray-600">
                          Mode: <span className="font-semibold text-gray-800">{app.interviewMode || "Online / Platform Room"}</span>
                          {app.interviewerName && ` • With: ${app.interviewerName}`}
                        </p>
                        {app.meetingLink && (
                          <div className="pt-1">
                            <a
                              href={app.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline gap-1"
                            >
                              <span>Join Meeting Link</span>
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-100 flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                          Interview Information
                        </span>
                        <p className="text-xs font-semibold text-gray-700">
                          Pending shortlist evaluation
                        </p>
                        <span className="text-[11px] text-gray-400 block">
                          You will be notified once a slot is scheduled
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                {isRejected ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Application not selected for this position. Keep applying for other vacancies!</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
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
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : isCompleted
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : "bg-gray-50 text-gray-400 border-gray-100"
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
        <div className="bg-white p-10 text-center rounded-2xl border border-gray-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">No Matching Applications</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              No applications matched {searchQuery ? `"${searchQuery}"` : "the selected filter"}. Try modifying your search term or filter.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        /* No applications submitted yet */
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-4">
          <Clock className="w-10 h-10 text-gray-300 mx-auto" />
          <div>
            <h3 className="font-bold text-gray-900 text-base">No Applications Found</h3>
            <p className="text-xs text-gray-500 mt-1">You haven't submitted any job applications yet.</p>
          </div>
          <button
            onClick={onNavigateToFindJobs}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center space-x-2 cursor-pointer"
          >
            <span>{t("findJobs")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

