import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";

import { CandidateProfile, JobPosting, JobApplication, NotificationRecord } from "../types";
import { getLiveJobs } from "../services/jobService";
import { useToast } from "./GlobalToast";
import { saveJobToBookmarks, removeJobFromBookmarks } from "../services/savedJobsService";
import { SupportedLanguage } from "../utils/candidateTranslations";

// Simplified Candidate Portal Views
import CandidateHeader from "./CandidateHeader";
import CandidateSidebar from "./CandidateSidebar";
import CandidateDashboardOverview from "./CandidateDashboardOverview";
import CandidateJobsSection from "./CandidateJobsSection";
import CandidateProfileSection from "./CandidateProfileSection";
import CandidateResumeSection from "./CandidateResumeSection";
import CandidateRecruiterInterviews from "./CandidateRecruiterInterviews";
import CandidateApplicationsView from "./CandidateApplicationsView";
import CandidateHelpView from "./CandidateHelpView";
import EasyApplyModal from "./EasyApplyModal";
import CandidateMobileBottomNav from "./CandidateMobileBottomNav";
import { NotificationCenterView } from "./NotificationCenter";

interface CandidateDashboardProps {
  userId: string;
  userName: string;
}

export type CandidateTab = 
  | "overview" 
  | "explore-jobs" 
  | "applied-jobs" 
  | "resume" 
  | "interviews" 
  | "saved-jobs" 
  | "notifications" 
  | "profile" 
  | "help";

export default function CandidateDashboard({ userId, userName }: CandidateDashboardProps) {
  const { showToast } = useToast();

  // Navigation State
  const [activeTab, setActiveTab] = useState<CandidateTab>(() => {
    const path = window.location.pathname;
    if (path === "/candidate/profile") return "profile";
    if (path === "/candidate/jobs") return "explore-jobs";
    if (path === "/candidate/applications") return "applied-jobs";
    return "overview";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lang, setLang] = useState<SupportedLanguage>("en");

  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // Apply Modal state
  const [applyModalJob, setApplyModalJob] = useState<JobPosting | null>(null);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);

  // Resume state
  const [resumeText, setResumeText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 1. URL Path Syncing
  useEffect(() => {
    let targetPath = "/candidate/dashboard";
    if (activeTab === "profile") targetPath = "/candidate/profile";
    if (activeTab === "explore-jobs") targetPath = "/candidate/jobs";
    if (activeTab === "applied-jobs") targetPath = "/candidate/applications";

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
  }, [activeTab]);

  // 2. Fetch Data on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch candidate profile
        if (userId) {
          const pDoc = await getDoc(doc(db, "candidates", userId));
          if (pDoc.exists() && isMounted) {
            const data = pDoc.data();
            setProfile({ id: pDoc.id, userId, ...data });
            if (data.resumeText) setResumeText(data.resumeText);
          }
        }

        // Fetch live jobs
        const liveJobs = await getLiveJobs();
        if (isMounted) setJobs(liveJobs);

        // Realtime candidate applications listener
        let unsubApps: (() => void) | null = null;
        if (userId) {
          const appsRef = collection(db, "applications");
          const q = query(appsRef, where("candidateId", "==", userId));
          unsubApps = onSnapshot(q, (snap) => {
            const appList: JobApplication[] = [];
            snap.forEach(d => appList.push({ id: d.id, ...d.data() } as JobApplication));
            appList.sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
            if (isMounted) setApplications(appList);
          }, (err) => console.warn("Applications listener note:", err));
        }

        // Realtime notifications
        let unsubNotifs: (() => void) | null = null;
        if (userId) {
          const nRef = collection(db, "notifications");
          const nQ = query(nRef, where("userId", "==", userId));
          unsubNotifs = onSnapshot(nQ, (snap) => {
            const list: NotificationRecord[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as NotificationRecord));
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            if (isMounted) setNotifications(list);
          }, (err) => console.warn("Notifications listener note:", err));
        }

        return () => {
          if (unsubApps) unsubApps();
          if (unsubNotifs) unsubNotifs();
        };

      } catch (err) {
        console.warn("Candidate dashboard load note:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => { isMounted = false; };
  }, [userId]);

  // Notification Trigger
  const triggerNotification = async (title: string, message: string) => {
    if (!userId) return;
    try {
      const notifId = `notif_${Math.random().toString(36).substr(2, 9)}`;
      const notifData: NotificationRecord = {
        id: notifId,
        userId,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, "notifications", notifId), notifData);
      setNotifications(prev => [notifData, ...prev]);
    } catch (err) {
      console.warn("Notification error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotification = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  // Job Save / Unsave
  const handleSaveJob = async (jobId: string, remove: boolean) => {
    try {
      const currentSaved = profile?.savedJobIds || [];
      let updatedSaved;
      if (remove) {
        updatedSaved = currentSaved.filter((id: string) => id !== jobId);
        await removeJobFromBookmarks(userId, jobId);
      } else {
        if (currentSaved.includes(jobId)) return;
        updatedSaved = [...currentSaved, jobId];
        await saveJobToBookmarks(userId, jobId);
      }

      await updateDoc(doc(db, "candidates", userId), { savedJobIds: updatedSaved });
      setProfile((prev: any) => prev ? { ...prev, savedJobIds: updatedSaved } : null);
      showToast(remove ? "Job unsaved" : "Job saved to bookmarks", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Open Easy Apply Modal
  const handleOpenApplyModal = (job: JobPosting) => {
    const alreadyApplied = applications.some(a => a.jobId === job.id);
    if (alreadyApplied) {
      showToast(`You have already applied for "${job.title}"!`, "warning");
      return;
    }
    setApplyModalJob(job);
  };

  const handleAppliedSuccess = (newApp: JobApplication) => {
    setApplications(prev => [newApp, ...prev]);
    triggerNotification("Application Submitted", `Your application for "${newApp.jobTitle}" at ${newApp.companyName} has been received.`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Loading Candidate Portal...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col" id="candidate-portal-root">
      {/* Top Header */}
      <CandidateHeader
        userName={userName}
        userEmail={auth.currentUser?.email || profile?.email || ""}
        onLogout={handleLogout}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onClearNotification={handleClearNotification}
        onSelectTab={(tab) => setActiveTab(tab as CandidateTab)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        lang={lang}
        setLang={setLang}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto relative pb-16 lg:pb-0">
        {/* Sidebar Navigation */}
        <CandidateSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => setActiveTab(tab as CandidateTab)}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          lang={lang}
        />

        {/* Main Work Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {/* 1. HOME / OVERVIEW */}
          {activeTab === "overview" && (
            <CandidateDashboardOverview
              userName={userName}
              profile={profile}
              applications={applications}
              jobsCount={jobs.length}
              notifications={notifications}
              onSelectTab={(tab) => setActiveTab(tab as CandidateTab)}
              jobs={jobs}
              onSaveJob={handleSaveJob}
              onApplyJob={handleOpenApplyModal}
              lang={lang}
              onSearchSubmit={(title, location) => {
                setSearchQuery(title);
                setActiveTab("explore-jobs");
              }}
            />
          )}

          {/* 2. FIND JOBS & SAVED JOBS */}
          {(activeTab === "explore-jobs" || activeTab === "saved-jobs") && (
            <CandidateJobsSection
              userId={userId}
              profile={profile}
              jobs={jobs}
              applications={applications}
              activeTab={activeTab === "saved-jobs" ? "saved-jobs" : "explore-jobs"}
              onSaveJob={handleSaveJob}
              onApplyJob={handleOpenApplyModal}
              searchQuery={searchQuery}
              lang={lang}
            />
          )}

          {/* 3. MY APPLICATIONS */}
          {activeTab === "applied-jobs" && (
            <CandidateApplicationsView
              applications={applications}
              onNavigateToFindJobs={() => setActiveTab("explore-jobs")}
              lang={lang}
            />
          )}

          {/* 4. RESUME */}
          {activeTab === "resume" && (
            <CandidateResumeSection
              resumeText={resumeText}
              setResumeText={setResumeText}
              isAnalyzing={isAnalyzing}
              handleAnalyzeResume={async () => {}}
              analysisResult={analysisResult}
              profile={profile}
              setProfile={setProfile}
            />
          )}

          {/* 5. INTERVIEWS */}
          {activeTab === "interviews" && (
            <CandidateRecruiterInterviews
              userId={userId}
              userName={userName}
              profile={profile}
              triggerNotification={triggerNotification}
            />
          )}

          {/* 6. NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <NotificationCenterView userId={userId} userRole="candidate" userName={userName} />
            </div>
          )}

          {/* 7. PROFILE */}
          {activeTab === "profile" && (
            <CandidateProfileSection
              userId={userId}
              profile={profile}
              setProfile={setProfile}
              triggerNotification={triggerNotification}
              activeSubTab="profile"
            />
          )}

          {/* 8. HELP */}
          {activeTab === "help" && (
            <CandidateHelpView
              lang={lang}
              onNavigateToJobs={() => setActiveTab("explore-jobs")}
              onNavigateToResume={() => setActiveTab("resume")}
            />
          )}
        </main>
      </div>

      {/* Easy Apply Modal */}
      {applyModalJob && (
        <EasyApplyModal
          job={applyModalJob}
          userId={userId}
          userName={userName}
          profile={profile}
          resumeText={resumeText}
          onClose={() => setApplyModalJob(null)}
          onAppliedSuccess={handleAppliedSuccess}
          onNavigateToApplications={() => setActiveTab("applied-jobs")}
          onNavigateToFindJobs={() => setActiveTab("explore-jobs")}
          lang={lang}
          onUploadResumeClick={() => setActiveTab("resume")}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <CandidateMobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab as CandidateTab)}
        lang={lang}
        unreadCount={unreadCount}
        onOpenMoreMenu={() => setSidebarOpen(true)}
      />
    </div>
  );
}
