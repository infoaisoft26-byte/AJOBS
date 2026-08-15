import React, { useState, useEffect } from "react";
import { 
  Layers, 
  Users, 
  Briefcase, 
  FileSpreadsheet, 
  Sparkles, 
  UserCheck, 
  GitPullRequest, 
  History,
  RefreshCw,
  Plus
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser, RecruiterAssignment } from "../../../types/recruitment";
import { 
  fetchRecruitmentCandidates, 
  fetchRecruitmentJobs, 
  fetchRecruiters, 
  fetchRecruiterAssignments 
} from "../../../services/recruitmentService";

import RecruitmentDashboardTab from "./RecruitmentDashboardTab";
import JobManagementTab from "./JobManagementTab";
import CandidateDatabaseTab from "./CandidateDatabaseTab";
import ExcelImportCenterTab from "./ExcelImportCenterTab";
import CandidateRecommendationsTab from "./CandidateRecommendationsTab";
import RecruiterAssignmentTab from "./RecruiterAssignmentTab";
import ApplicationsPipelineTab from "./ApplicationsPipelineTab";
import ImportHistoryTab from "./ImportHistoryTab";

import CandidateProfileModal from "./CandidateProfileModal";
import AssignRecruiterModal from "./AssignRecruiterModal";
import CreateJobModal from "./CreateJobModal";

interface RecruitmentOperationsHubProps {
  initialSubTab?: string;
  adminUser?: { name: string; email: string };
  onNavigateTab?: (tab: string) => void;
}

export default function RecruitmentOperationsHub({
  initialSubTab = "recruitment_dashboard",
  adminUser = { name: "Super Admin Desk", email: "admin@aijobs.global" },
  onNavigateTab
}: RecruitmentOperationsHubProps) {
  const [activeTab, setActiveTab] = useState<string>(initialSubTab);

  // Core datasets
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [recruiters, setRecruiters] = useState<RecruiterUser[]>([]);
  const [assignments, setAssignments] = useState<RecruiterAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal triggers
  const [selectedCandidateForProfile, setSelectedCandidateForProfile] = useState<RecruitmentCandidate | null>(null);
  const [candidatesForAssignment, setCandidatesForAssignment] = useState<RecruitmentCandidate[]>([]);
  const [preselectedJobForAssignment, setPreselectedJobForAssignment] = useState<RecruitmentJob | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<RecruitmentJob | null>(null);

  // Recommendations context
  const [recommendationTargetJob, setRecommendationTargetJob] = useState<RecruitmentJob | null>(null);
  const [recommendationTargetCandidate, setRecommendationTargetCandidate] = useState<RecruitmentCandidate | null>(null);

  // Live data loading
  const loadRecruitmentData = async () => {
    setLoading(true);
    try {
      const [candList, jobsList, recList, assignList] = await Promise.all([
        fetchRecruitmentCandidates(),
        fetchRecruitmentJobs(),
        fetchRecruiters(),
        fetchRecruiterAssignments()
      ]);

      setCandidates(candList);
      setJobs(jobsList);
      setRecruiters(recList);
      setAssignments(assignList);
    } catch (err) {
      console.error("Error loading recruitment operations dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecruitmentData();
  }, []);

  // Modal Handlers
  const handleOpenCandidateProfile = (candidate: RecruitmentCandidate) => {
    setSelectedCandidateForProfile(candidate);
  };

  const handleOpenAssignModal = (cands: RecruitmentCandidate[], job?: RecruitmentJob | null) => {
    setCandidatesForAssignment(cands);
    setPreselectedJobForAssignment(job || null);
    setIsAssignModalOpen(true);
  };

  const handleOpenCreateJob = () => {
    setJobToEdit(null);
    setIsCreateJobModalOpen(true);
  };

  const handleOpenEditJob = (job: RecruitmentJob) => {
    setJobToEdit(job);
    setIsCreateJobModalOpen(true);
  };

  const handleFindMatchesForJob = (job: RecruitmentJob) => {
    setRecommendationTargetJob(job);
    setRecommendationTargetCandidate(null);
    setActiveTab("recommendations");
  };

  const handleFindMatchesForCandidate = (cand: RecruitmentCandidate) => {
    setRecommendationTargetCandidate(cand);
    setRecommendationTargetJob(null);
    setActiveTab("recommendations");
  };

  const tabsConfig = [
    { id: "recruitment_dashboard", label: "Operations Overview", icon: Layers },
    { id: "candidates", label: "Candidate Database", icon: Users, badge: candidates.length },
    { id: "jobs", label: "Job Postings", icon: Briefcase, badge: jobs.length },
    { id: "excel_import", label: "Excel Bulk Import", icon: FileSpreadsheet },
    { id: "recommendations", label: "Match & Recommendations", icon: Sparkles },
    { id: "recruiter_assignment", label: "Recruiter Assignment", icon: UserCheck, badge: assignments.length },
    { id: "applications_pipeline", label: "Applications Pipeline", icon: GitPullRequest },
    { id: "import_history", label: "Import & Audit History", icon: History }
  ];

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Operations Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="flex items-center justify-between overflow-x-auto gap-1 scrollbar-none pb-1 md:pb-0">
          <div className="flex items-center space-x-1 min-w-max">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {typeof tab.badge === "number" && (
                    <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 shrink-0 pl-2">
            <button
              onClick={loadRecruitmentData}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs flex items-center space-x-1 cursor-pointer transition-all"
              title="Refresh All Collections"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>

            <button
              onClick={handleOpenCreateJob}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Job</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Render */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Loading Real-Time Recruitment Collections...
            </span>
          </div>
        ) : (
          <>
            {activeTab === "recruitment_dashboard" && (
              <RecruitmentDashboardTab
                candidates={candidates}
                jobs={jobs}
                recruiters={recruiters}
                assignments={assignments}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCreateJob={handleOpenCreateJob}
                onRefresh={loadRecruitmentData}
              />
            )}

            {activeTab === "candidates" && (
              <CandidateDatabaseTab
                candidates={candidates}
                recruiters={recruiters}
                jobs={jobs}
                onOpenCandidateProfile={handleOpenCandidateProfile}
                onOpenAssignModal={(cList) => handleOpenAssignModal(cList)}
                onFindMatchesForCandidate={handleFindMatchesForCandidate}
                onRefresh={loadRecruitmentData}
                adminUser={adminUser}
              />
            )}

            {activeTab === "jobs" && (
              <JobManagementTab
                jobs={jobs}
                recruiters={recruiters}
                onOpenCreateJob={handleOpenCreateJob}
                onOpenEditJob={handleOpenEditJob}
                onFindMatchesForJob={handleFindMatchesForJob}
                onRefresh={loadRecruitmentData}
                adminUser={adminUser}
              />
            )}

            {activeTab === "excel_import" && (
              <ExcelImportCenterTab
                candidates={candidates}
                jobs={jobs}
                onImportCompleted={loadRecruitmentData}
                adminUser={adminUser}
              />
            )}

            {activeTab === "recommendations" && (
              <CandidateRecommendationsTab
                candidates={candidates}
                jobs={jobs}
                recruiters={recruiters}
                initialSelectedJob={recommendationTargetJob}
                initialSelectedCandidate={recommendationTargetCandidate}
                onOpenCandidateProfile={handleOpenCandidateProfile}
                onOpenAssignModal={(cand, job) => handleOpenAssignModal([cand], job)}
              />
            )}

            {activeTab === "recruiter_assignment" && (
              <RecruiterAssignmentTab
                candidates={candidates}
                jobs={jobs}
                recruiters={recruiters}
                assignments={assignments}
                onOpenAssignModal={(cList, job) => handleOpenAssignModal(cList, job)}
                onRefresh={loadRecruitmentData}
                adminUser={adminUser}
              />
            )}

            {activeTab === "applications_pipeline" && (
              <ApplicationsPipelineTab
                candidates={candidates}
                jobs={jobs}
                adminUser={adminUser}
              />
            )}

            {activeTab === "import_history" && (
              <ImportHistoryTab />
            )}
          </>
        )}
      </div>

      {/* Shared Modals */}
      <CandidateProfileModal
        candidate={selectedCandidateForProfile}
        isOpen={Boolean(selectedCandidateForProfile)}
        onClose={() => setSelectedCandidateForProfile(null)}
        onAssignToRecruiter={(cand) => handleOpenAssignModal([cand])}
        onCandidateUpdated={loadRecruitmentData}
        adminUser={adminUser}
      />

      <AssignRecruiterModal
        candidates={candidatesForAssignment}
        preselectedJob={preselectedJobForAssignment}
        recruiters={recruiters}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssigned={loadRecruitmentData}
        adminUser={adminUser}
      />

      <CreateJobModal
        isOpen={isCreateJobModalOpen}
        onClose={() => {
          setIsCreateJobModalOpen(false);
          setJobToEdit(null);
        }}
        onJobCreated={loadRecruitmentData}
        jobToEdit={jobToEdit}
        adminUser={adminUser}
      />
    </div>
  );
}
