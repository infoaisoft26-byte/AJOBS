import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import HiringPanelLayout from "../hiring/HiringPanelLayout";
import HiringOverview from "../hiring/HiringOverview";
import PostJobMenuModal from "../hiring/PostJobMenuModal";
import CandidateDatabaseView from "../hiring/CandidateDatabaseView";
import AiMatchesView from "../hiring/AiMatchesView";
import AiHiringAssistantView from "../hiring/AiHiringAssistantView";
import AiCallingAgentView from "../hiring/AiCallingAgentView";
import HiringReportsView from "../hiring/HiringReportsView";
import CreditsUsageView from "../hiring/CreditsUsageView";
import PlanPurchaseView from "../hiring/PlanPurchaseView";
import ProfileDetailsView from "../hiring/ProfileDetailsView";
import HelpSupportModal from "../hiring/HelpSupportModal";

import EmployerMyJobs from "./EmployerMyJobs";
import EmployerPostJob from "./EmployerPostJob";
import EmployerApplications from "./EmployerApplications";
import EmployerInterviews from "./EmployerInterviews";
import EmployerMessages from "./EmployerMessages";
import { CompanyJob, CompanyApplication, CompanyInterview, CompanyProfile } from "./EmployerTypes";
import { CreditBalance, CreditUsageLog } from "../hiring/HiringTypes";

interface EmployerDashboardProps {
  userId: string;
  userName?: string;
  companyName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function EmployerDashboard({
  userId,
  userName = "Hiring Leader",
  companyName = "AIJOBS Partner Employer",
  userRole = "employer",
  onLogout
}: EmployerDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [selectedCandidateForDrawer, setSelectedCandidateForDrawer] = useState<CompanyApplication | null>(null);
  const [selectedJobForFilter, setSelectedJobForFilter] = useState<string>("all");
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);

  // Modals
  const [showPostJobMenu, setShowPostJobMenu] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);

  // Post Job prefilled state from Template or AI
  const [postJobPrefill, setPostJobPrefill] = useState<any>(null);

  // Core Data Stores
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Credits Balance
  const [credits, setCredits] = useState<CreditBalance>({
    jobCredits: 6,
    jobCreditsUsed: 4,
    databaseCredits: 125,
    databaseCreditsUsed: 48,
    aiCredits: 500,
    aiCreditsUsed: 110,
    callingCredits: 180,
    callingCreditsUsed: 45,
    validityDate: "Dec 31, 2026"
  });

  const [usageHistory, setUsageHistory] = useState<CreditUsageLog[]>([
    {
      id: "tx_101",
      date: new Date(Date.now() - 3600000 * 2).toLocaleDateString() + " " + new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: "Candidate Contact & Resume Unlock",
      item: "Aarav Sharma",
      quantity: 1,
      creditsUsed: 1,
      recruiter: userName,
      refId: "CAND_9872"
    },
    {
      id: "tx_102",
      date: new Date(Date.now() - 86400000).toLocaleDateString() + " " + new Date(Date.now() - 86400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: "Job Requisition Published & Indexed",
      item: "Senior React & TypeScript Architect",
      quantity: 1,
      creditsUsed: 1,
      recruiter: userName,
      refId: "JOB_4421"
    },
    {
      id: "tx_103",
      date: new Date(Date.now() - 86400000 * 2).toLocaleDateString() + " " + new Date(Date.now() - 86400000 * 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: "AI Voice Telephony Screening (4 mins)",
      item: "Sneha Deshmukh",
      quantity: 4,
      creditsUsed: 4,
      recruiter: userName,
      refId: "CALL_1109"
    }
  ]);

  // Load real Firestore data
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Company Profile
      if (userId) {
        const compSnap = await getDoc(doc(db, "companies", userId));
        if (compSnap.exists()) {
          setCompanyProfile(compSnap.data() as CompanyProfile);
        } else {
          const empSnap = await getDoc(doc(db, "employers", userId));
          if (empSnap.exists()) {
            const ed = empSnap.data();
            setCompanyProfile({
              id: userId,
              userId,
              companyName: ed.companyName || companyName,
              industry: ed.industry || "Software & Technology",
              companySize: ed.size || "51-200 Employees",
              isVerified: true,
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      // 2. Jobs
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const jobList: CompanyJob[] = [];
      jobsSnap.forEach((d) => {
        const jd = d.data() as CompanyJob;
        if (!userId || jd.employerId === userId || jd.userId === userId || jd.companyId === userId || !jd.employerId) {
          jobList.push({ id: d.id, ...jd });
        }
      });

      // If user has no jobs yet, provide default verified template job
      if (jobList.length === 0) {
        jobList.push({
          id: "job_sample_1",
          employerId: userId,
          title: "Senior Full Stack Engineer (React & Node.js)",
          companyName: companyName,
          location: "Bengaluru, Karnataka (Hybrid)",
          department: "Engineering",
          employmentType: "Full-time",
          experience: "3-5 Years",
          salary: "18,00,000 - 26,00,000",
          openings: 2,
          skillsRequired: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
          status: "active",
          approved: true,
          createdAt: new Date().toISOString()
        });
      }
      setJobs(jobList);

      // 3. Applications
      const appsSnap = await getDocs(collection(db, "company_applications"));
      const appList: CompanyApplication[] = [];
      appsSnap.forEach((d) => {
        const ad = d.data() as CompanyApplication;
        if (jobList.some(j => j.id === ad.jobId) || ad.jobId === userId || !ad.jobId) {
          appList.push({ id: d.id, ...ad });
        }
      });

      if (appList.length === 0) {
        appList.push(
          {
            id: "app_sample_1",
            jobId: jobList[0]?.id || "job_sample_1",
            jobTitle: jobList[0]?.title || "Senior Full Stack Engineer",
            candidateId: "cand_aarav",
            candidateName: "Aarav Sharma",
            candidateEmail: "aarav.sharma@domain.in",
            candidatePhone: "+91 98765 43210",
            location: "Bengaluru, Karnataka",
            experience: "5.5 Years",
            status: "new",
            aiScore: 96,
            skills: ["React", "TypeScript", "Node.js", "AWS"],
            appliedAt: new Date(Date.now() - 3600000 * 3).toISOString()
          },
          {
            id: "app_sample_2",
            jobId: jobList[0]?.id || "job_sample_1",
            jobTitle: jobList[0]?.title || "Senior Full Stack Engineer",
            candidateId: "cand_sneha",
            candidateName: "Sneha Deshmukh",
            candidateEmail: "sneha.d@domain.in",
            candidatePhone: "+91 98123 45678",
            location: "Pune, Maharashtra",
            experience: "4.2 Years",
            status: "shortlisted",
            aiScore: 94,
            skills: ["React", "Next.js", "Tailwind CSS"],
            appliedAt: new Date(Date.now() - 86400000).toISOString()
          }
        );
      }
      setApplications(appList);

      // 4. Interviews
      const intSnap = await getDocs(collection(db, "company_interviews"));
      const intList: CompanyInterview[] = [];
      intSnap.forEach((d) => {
        const idat = d.data() as CompanyInterview;
        intList.push({ id: d.id, ...idat });
      });

      if (intList.length === 0) {
        intList.push({
          id: "int_sample_1",
          jobId: jobList[0]?.id || "job_sample_1",
          jobTitle: jobList[0]?.title || "Senior Full Stack Engineer",
          candidateId: "cand_aarav",
          candidateName: "Aarav Sharma",
          candidateEmail: "aarav.sharma@domain.in",
          dateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
          roundName: "Technical Deep Dive & Architecture",
          interviewer: "Hiring Manager",
          meetLink: "https://meet.google.com/aij-interview-01",
          status: "scheduled"
        });
      }
      setInterviews(intList);

    } catch (err) {
      console.warn("Error loading employer Firestore data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Credit Deduction handler
  const handleDeductCredit = (amount: number, activity: string, targetName: string) => {
    setCredits(prev => ({
      ...prev,
      databaseCredits: Math.max(0, prev.databaseCredits - amount),
      databaseCreditsUsed: prev.databaseCreditsUsed + amount
    }));

    const newLog: CreditUsageLog = {
      id: "tx_" + Date.now(),
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: activity,
      item: targetName,
      quantity: amount,
      creditsUsed: amount,
      recruiter: userName,
      refId: "TX_" + Math.floor(1000 + Math.random() * 9000)
    };
    setUsageHistory(prev => [newLog, ...prev]);
  };

  // Add Credits handler
  const handleAddCredits = (jobCreds: number, dbCreds: number, planName: string, amount: number) => {
    setCredits(prev => ({
      ...prev,
      jobCredits: prev.jobCredits + jobCreds,
      databaseCredits: prev.databaseCredits + dbCreds
    }));

    const newLog: CreditUsageLog = {
      id: "tx_" + Date.now(),
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      activity: `Subscription Order: ${planName}`,
      item: `₹${amount.toLocaleString()}`,
      quantity: 1,
      creditsUsed: 0,
      recruiter: userName,
      refId: "INV_" + Math.floor(1000 + Math.random() * 9000)
    };
    setUsageHistory(prev => [newLog, ...prev]);
  };

  // Job status update
  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), { status: newStatus });
    } catch (e) {}
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
  };

  // Delete Job
  const handleDeleteJob = async (jobId: string) => {
    try {
      await deleteDoc(doc(db, "jobs", jobId));
    } catch (e) {}
    setJobs(jobs.filter(j => j.id !== jobId));
  };

  // Duplicate Job
  const handleDuplicateJob = async (job: CompanyJob) => {
    const clone = {
      ...job,
      id: "job_clone_" + Date.now(),
      title: `${job.title} (Copy)`,
      status: "draft",
      approved: false,
      createdAt: new Date().toISOString()
    };
    setJobs([clone, ...jobs]);
  };

  // Application status update
  const handleUpdateApplicationStatus = async (appId: string, newStatus: string, note?: string) => {
    try {
      await updateDoc(doc(db, "company_applications", appId), {
        status: newStatus,
        ...(note ? { notes: note } : {})
      });
    } catch (e) {}
    setApplications(applications.map(a => a.id === appId ? { ...a, status: newStatus, ...(note ? { notes: note } : {}) } : a));
  };

  // Select Option from Post Job Menu
  const handleSelectPostJobOption = (mode: "new" | "template" | "reuse" | "ai", data?: any) => {
    if (mode === "new") {
      setPostJobPrefill(null);
    } else {
      setPostJobPrefill(data);
    }
    setActiveTab("post-job");
  };

  const handleOpenLiveChat = (recipientId: string, recipientName: string) => {
    setActiveChatRecipient({ id: recipientId, name: recipientName });
    setActiveTab("messages");
  };

  const pendingAppsCount = applications.filter(a => a.status === "new").length;

  return (
    <HiringPanelLayout
      currentTab={activeTab}
      onNavigateTab={(tab) => {
        if (tab === "post-job") {
          setPostJobPrefill(null);
        }
        setActiveTab(tab);
      }}
      userName={userName}
      userEmail={companyProfile?.contactEmail || "employer@aijobs1.in"}
      companyName={companyProfile?.companyName || companyName}
      userRole={userRole}
      credits={credits}
      onOpenPostJobMenu={() => setShowPostJobMenu(true)}
      onOpenHelpSupport={() => setShowHelpSupport(true)}
      onLogout={onLogout || (() => { window.location.href = "/"; })}
      pendingCount={pendingAppsCount}
    >
      {/* 1. Dashboard Overview Tab */}
      {activeTab === "dashboard" && (
        <HiringOverview
          userName={userName}
          companyName={companyProfile?.companyName || companyName}
          userRole={userRole}
          jobs={jobs}
          applications={applications}
          interviews={interviews}
          credits={credits}
          companyProfile={companyProfile}
          onNavigateTab={setActiveTab}
          onOpenPostJobMenu={() => setShowPostJobMenu(true)}
          onSelectJobForFilter={(jobId) => {
            setSelectedJobForFilter(jobId);
            setActiveTab("applications");
          }}
          onViewCandidate={(app) => {
            setSelectedCandidateForDrawer(app);
            setActiveTab("applications");
          }}
          onUpdateJobStatus={handleUpdateJobStatus}
          onDeleteJob={handleDeleteJob}
          onDuplicateJob={handleDuplicateJob}
        />
      )}

      {/* 2. All Jobs Tab */}
      {activeTab === "my-jobs" && (
        <EmployerMyJobs
          jobs={jobs}
          onNavigateTab={setActiveTab}
          onSelectJobForFilter={(jobId) => {
            setSelectedJobForFilter(jobId);
            setActiveTab("applications");
          }}
          onUpdateJobStatus={handleUpdateJobStatus}
        />
      )}

      {/* 3. Post Job Wizard Tab */}
      {activeTab === "post-job" && (
        <EmployerPostJob
          userId={userId}
          companyName={companyProfile?.companyName || companyName}
          onJobPublished={(newJob) => {
            setJobs([newJob, ...jobs]);
            setActiveTab("my-jobs");
          }}
          onCancel={() => setActiveTab("dashboard")}
        />
      )}

      {/* 4. Applications Pipeline Tab */}
      {activeTab === "applications" && (
        <EmployerApplications
          jobs={jobs}
          applications={applications}
          onUpdateApplicationStatus={handleUpdateApplicationStatus}
          onOpenLiveChat={handleOpenLiveChat}
          selectedCandidate={selectedCandidateForDrawer}
          onCloseDrawer={() => setSelectedCandidateForDrawer(null)}
          onSelectCandidate={setSelectedCandidateForDrawer}
        />
      )}

      {/* 5. Candidate Database Tab */}
      {(activeTab === "candidate-search" || activeTab === "saved-searches" || activeTab === "unlocked-candidates") && (
        <CandidateDatabaseView
          userId={userId}
          credits={credits}
          jobs={jobs}
          onDeductCredit={handleDeductCredit}
          onOpenLiveChat={handleOpenLiveChat}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 6. AI Matches Tab */}
      {activeTab === "ai-matches" && (
        <AiMatchesView
          jobs={jobs}
          applications={applications}
          onShortlistCandidate={(candId) => {}}
          onScheduleInterview={(candId, candName, jobTitle) => {
            setActiveTab("interviews");
          }}
          onOpenLiveChat={handleOpenLiveChat}
        />
      )}

      {/* 7. AI Hiring Assistant Tab */}
      {activeTab === "ai-assistant" && (
        <AiHiringAssistantView
          onInsertIntoJob={(jdText) => {
            setActiveTab("post-job");
          }}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 8. AI Calling Agent Tab */}
      {activeTab === "ai-calling" && (
        <AiCallingAgentView
          jobs={jobs}
          onOpenLiveChat={handleOpenLiveChat}
        />
      )}

      {/* 9. Interviews Tab */}
      {activeTab === "interviews" && (
        <EmployerInterviews
          userId={userId}
          interviews={interviews}
          jobs={jobs}
          applications={applications}
          onInterviewScheduled={(newInt) => {
            setInterviews([newInt, ...interviews]);
          }}
        />
      )}

      {/* 10. Reports Tab */}
      {activeTab === "reports" && (
        <HiringReportsView
          jobs={jobs}
          applications={applications}
          interviews={interviews}
        />
      )}

      {/* 11. Credits & Usage Tab */}
      {activeTab === "credits-usage" && (
        <CreditsUsageView
          credits={credits}
          usageHistory={usageHistory}
          onNavigateTab={setActiveTab}
        />
      )}

      {/* 12. Plans & Billing Tab */}
      {activeTab === "billing" && (
        <PlanPurchaseView
          userId={userId}
          userEmail={companyProfile?.contactEmail || "employer@aijobs1.in"}
          userName={userName}
          credits={credits}
          onAddCredits={handleAddCredits}
        />
      )}

      {/* 13. Company & Profile Tab */}
      {activeTab === "company-profile" && (
        <ProfileDetailsView
          userId={userId}
          userRole={userRole}
          initialProfile={companyProfile}
          userEmail={companyProfile?.contactEmail || "employer@aijobs1.in"}
          userName={userName}
          onProfileUpdated={(updated) => setCompanyProfile(updated)}
        />
      )}

      {/* 14. Messages Tab */}
      {activeTab === "messages" && (
        <EmployerMessages
          userId={userId}
          companyName={companyProfile?.companyName || companyName}
          initialRecipient={activeChatRecipient}
        />
      )}

      {/* Post Job Structured Menu Modal */}
      <PostJobMenuModal
        isOpen={showPostJobMenu}
        onClose={() => setShowPostJobMenu(false)}
        onSelectOption={handleSelectPostJobOption}
        existingJobs={jobs}
      />

      {/* Help & Support Modal */}
      <HelpSupportModal
        isOpen={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
        userId={userId}
        userEmail={companyProfile?.contactEmail || "employer@aijobs1.in"}
        userName={userName}
      />

    </HiringPanelLayout>
  );
}
