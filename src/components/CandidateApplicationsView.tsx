import React, { useState } from "react";
import { Clock, Briefcase, CheckCircle2, XCircle, ArrowRight, ShieldCheck, ChevronRight } from "lucide-react";
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

  const filteredApps = applications.filter(app => {
    const stepIdx = getStepIndex(app.status);
    if (filterStatus === "active") return stepIdx >= 0 && stepIdx < 4;
    if (filterStatus === "selected") return stepIdx >= 4;
    if (filterStatus === "rejected") return stepIdx === -1;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("myApplications")}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Track all your job applications and recruitment status in real time.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200 self-start md:self-auto">
          {[
            { id: "all", label: "All" },
            { id: "active", label: "In Progress" },
            { id: "selected", label: "Offers" },
            { id: "rejected", label: "Rejected" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-white text-blue-600 shadow-xs border border-gray-200"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                    <p className="text-xs font-semibold text-blue-700">{app.companyName}</p>
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
                    <p className="text-[11px] text-gray-400 mt-1">
                      Applied: {new Date(app.appliedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
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
      ) : (
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
