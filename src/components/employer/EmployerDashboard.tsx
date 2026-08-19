import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  PlusCircle, 
  Users, 
  Search, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Building2, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  ShieldCheck, 
  ChevronDown, 
  TrendingUp, 
  Layers, 
  FileText,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import AIJobsLogo from "../AIJobsLogo";
import EmployerOverview from "./EmployerOverview";
import EmployerPostJob from "./EmployerPostJob";
import EmployerApplications from "./EmployerApplications";
import EmployerMyJobs from "./EmployerMyJobs";
import EmployerCandidateSearch from "./EmployerCandidateSearch";
import EmployerAiShortlist from "./EmployerAiShortlist";
import EmployerInterviews from "./EmployerInterviews";
import EmployerMessages from "./EmployerMessages";
import EmployerCompanyProfile from "./EmployerCompanyProfile";
import SubscriptionBillingHub from "../SubscriptionBillingHub";
import { CompanyJob, CompanyApplication, CompanyInterview, CompanyProfile } from "./EmployerTypes";
import EmployerSidebar from "./EmployerSidebar";

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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateForDrawer, setSelectedCandidateForDrawer] = useState<CompanyApplication | null>(null);
  const [selectedJobForFilter, setSelectedJobForFilter] = useState<string>("all");
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);

  // Core Data Stores
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Data from Firestore
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Company Profile
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
            companySize: ed.size || "10-50 Employees",
            isVerified: true,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 2. Jobs
      const jobsSnap = await getDocs(collection(db, "jobs"));
      const jobList: CompanyJob[] = [];
      jobsSnap.forEach((d) => {
        const jd = d.data() as CompanyJob;
        if (jd.employerId === userId || jd.userId === userId || jd.companyId === userId) {
          jobList.push({ id: d.id, ...jd });
        }
      });
      setJobs(jobList);

      // 3. Applications
      const appsSnap = await getDocs(collection(db, "company_applications"));
      const appList: CompanyApplication[] = [];
      appsSnap.forEach((d) => {
        const ad = d.data() as CompanyApplication;
        if (jobList.some(j => j.id === ad.jobId) || ad.jobId === userId) {
          appList.push({ id: d.id, ...ad });
        }
      });
      setApplications(appList);

      // 4. Interviews
      const intSnap = await getDocs(collection(db, "company_interviews"));
      const intList: CompanyInterview[] = [];
      intSnap.forEach((d) => {
        const idat = d.data() as CompanyInterview;
        if (jobList.some(j => j.id === idat.jobId) || (idat as any).companyId === userId) {
          intList.push({ id: d.id, ...idat });
        }
      });
      setInterviews(intList);
    } catch (e) {
      console.warn("Employer data loading notice:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Handle URL sync
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/employer/dashboard") {
      window.history.pushState({}, "", "/employer/dashboard");
    }
  }, []);

  const handleUpdateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "company_applications", appId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {}

    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "jobs", jobId), { status: newStatus });
      await updateDoc(doc(db, "company_jobs", jobId), { status: newStatus });
    } catch (e) {}
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
  };

  const handleJobPublished = (newJob: CompanyJob) => {
    setJobs([newJob, ...jobs]);
    setActiveTab("my-jobs");
  };

  const handleOpenLiveChat = (recipientId?: string, recipientName?: string) => {
    if (recipientId && recipientName) {
      setActiveChatRecipient({ id: recipientId, name: recipientName });
    }
    setActiveTab("messages");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "post-job", label: "Post a Job", icon: PlusCircle, highlight: true },
    { id: "my-jobs", label: "My Jobs", icon: Briefcase, count: jobs.length },
    { id: "applications", label: "Applications", icon: Users, count: applications.length },
    { id: "candidate-search", label: "Candidate Search", icon: Search },
    { id: "ai-shortlist", label: "AI Shortlist", icon: Sparkles },
    { id: "interviews", label: "Interviews", icon: Calendar, count: interviews.length },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "company-profile", label: "Company Profile", icon: Building2 },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ];

  const currentCorpName = companyProfile?.companyName || companyName || "AIJOBS Corporate";

  return (
    <div className="min-h-screen bg-[#0e0a14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200" id="employer-dashboard-app">
      
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-[#17111F]/90 border-b border-purple-500/20 backdrop-blur-2xl px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AIJobsLogo size="sm" showTagline={false} />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span>EMPLOYER PORTAL</span>
            </span>
          </div>

          {/* Center: Search Candidates / Jobs */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setActiveTab("candidate-search");
                  }
                }}
                placeholder="Search candidates, skills, active jobs..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Right: Notifications, Post Job Emerald Button & Profile Menu */}
          <div className="flex items-center gap-3">
            
            {/* Primary Bright Green "Post a Job" Button */}
            <button
              id="employer-topbar-post-job"
              onClick={() => setActiveTab("post-job")}
              className="px-4 py-2 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Post a Job</span>
              <span className="sm:hidden">Post</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#17111F] animate-pulse" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-4 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
                    <span className="text-xs font-bold text-white">Notifications</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white text-xs">
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <span className="font-bold text-white block">3 New AI Matched Applicants</span>
                      <span className="text-[11px] text-slate-400">Senior React Engineer has received high scoring candidates.</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="font-bold text-white block">Interview Scheduled</span>
                      <span className="text-[11px] text-slate-400">Technical round confirmed with Aarav Sharma for Thursday.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/20 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                  {currentCorpName.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{currentCorpName}</div>
                  <div className="text-[10px] text-slate-400 truncate">Employer</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-2 z-50 animate-in fade-in space-y-1 text-xs">
                  <div className="px-3 py-2 border-b border-purple-500/20">
                    <div className="font-bold text-white truncate">{currentCorpName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{userName}</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("company-profile");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Company Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("billing");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    <span>Billing & Plans</span>
                  </button>
                  <div className="border-t border-purple-500/20 pt-1">
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        if (onLogout) {
                          onLogout();
                        } else {
                          await auth.signOut();
                          window.location.reload();
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex gap-6">
        
        {/* Left Sidebar (Desktop) */}
        <aside className="hidden lg:block shrink-0">
          <EmployerSidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onLogout={async () => {
              if (onLogout) onLogout();
              else {
                await auth.signOut();
                window.location.reload();
              }
            }}
            counts={{
              jobs: jobs.length,
              applications: applications.length,
              interviews: interviews.length
            }}
            companyName={currentCorpName}
            userName={userName}
          />
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-[#17111F] border-r border-purple-500/30 p-0 z-50 shadow-2xl overflow-y-auto"
              >
                <EmployerSidebar
                  activeTab={activeTab}
                  onSelectTab={setActiveTab}
                  onLogout={async () => {
                    setMobileDrawerOpen(false);
                    if (onLogout) onLogout();
                    else {
                      await auth.signOut();
                      window.location.reload();
                    }
                  }}
                  counts={{
                    jobs: jobs.length,
                    applications: applications.length,
                    interviews: interviews.length
                  }}
                  companyName={currentCorpName}
                  userName={userName}
                  isMobile={true}
                  onCloseMobile={() => setMobileDrawerOpen(false)}
                />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Center Main Workspace Canvas */}
        <main className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <EmployerOverview
              userName={userName}
              companyName={currentCorpName}
              jobs={jobs}
              applications={applications}
              interviews={interviews}
              onNavigateTab={(t) => setActiveTab(t)}
              onViewCandidate={(app) => {
                setSelectedCandidateForDrawer(app);
                setActiveTab("applications");
              }}
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "post-job" && (
            <EmployerPostJob
              userId={userId}
              companyName={currentCorpName}
              onJobPublished={handleJobPublished}
              onCancel={() => setActiveTab("overview")}
            />
          )}

          {activeTab === "my-jobs" && (
            <EmployerMyJobs
              jobs={jobs}
              onNavigateTab={(t) => setActiveTab(t)}
              onSelectJobForFilter={(jobId) => {
                setSelectedJobForFilter(jobId);
                setActiveTab("applications");
              }}
              onUpdateJobStatus={handleUpdateJobStatus}
            />
          )}

          {activeTab === "applications" && (
            <EmployerApplications
              jobs={jobs}
              applications={applications}
              onUpdateApplicationStatus={handleUpdateApplicationStatus}
              onOpenLiveChat={handleOpenLiveChat}
              selectedCandidate={selectedCandidateForDrawer}
              onCloseDrawer={() => setSelectedCandidateForDrawer(null)}
              onSelectCandidate={(c) => setSelectedCandidateForDrawer(c)}
            />
          )}

          {activeTab === "candidate-search" && (
            <EmployerCandidateSearch
              onShortlistCandidate={(c) => {
                alert(`Candidate ${c.name} added to your active shortlist.`);
              }}
              onMessageCandidate={handleOpenLiveChat}
            />
          )}

          {activeTab === "ai-shortlist" && (
            <EmployerAiShortlist
              applications={applications}
              onOpenCandidateDrawer={(app) => {
                setSelectedCandidateForDrawer(app);
                setActiveTab("applications");
              }}
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

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

          {activeTab === "messages" && (
            <EmployerMessages
              initialRecipientId={activeChatRecipient?.id}
              initialRecipientName={activeChatRecipient?.name}
            />
          )}

          {activeTab === "company-profile" && (
            <EmployerCompanyProfile
              userId={userId}
              userName={userName}
              initialProfile={companyProfile}
              onProfileUpdated={(p) => setCompanyProfile(p)}
            />
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
                <h2 className="text-xl font-extrabold text-white">Subscription & Hiring Credits</h2>
                <p className="text-xs text-slate-400">Manage plan limits, candidate resume unlock credits, and billing history</p>
              </div>
              <SubscriptionBillingHub
                userId={userId}
                userName={userName || companyName}
                userRole="employer"
                onRefresh={loadData}
              />
            </div>
          )}

          {activeTab === "support" && (
            <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl text-center space-y-4 max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">AIJOBS Enterprise Support</h3>
              <p className="text-xs text-slate-400">
                Need assistance with custom ATS integrations, job posting guidelines, or hiring manager accounts?
              </p>
              <div className="p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs space-y-1 font-mono text-left">
                <div className="text-blue-300 font-bold">Priority Support Desk</div>
                <div className="text-slate-300">Email: enterprise-support@aijobs.in</div>
                <div className="text-slate-300">Hotline: +91 80 4567 8900 (Mon - Sat, 9am - 7pm IST)</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
