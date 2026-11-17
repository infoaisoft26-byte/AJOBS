import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Briefcase, 
  Users, 
  Search, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Share2, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  ChevronDown, 
  Layers,
  IndianRupee,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  WalletCards
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import AIJobsLogo from "../AIJobsLogo";
import RecruiterOverview from "./RecruiterOverview";
import RecruiterPipeline from "./RecruiterPipeline";
import RecruiterAssignedJobs from "./RecruiterAssignedJobs";
import RecruiterFindCandidates from "./RecruiterFindCandidates";
import RecruiterLeads from "./RecruiterLeads";
import RecruiterEarnings from "./RecruiterEarnings";
import RecruiterAccountCenter from "./RecruiterAccountCenter";
import EmployerInterviews from "../employer/EmployerInterviews";
import EmployerMessages from "../employer/EmployerMessages";
import EmployerAiShortlist from "../employer/EmployerAiShortlist";
import JobDetails from "../JobDetails";
import { RecruiterJob, PipelineCandidate } from "./RecruiterTypes";

interface RecruiterDashboardProps {
  userId: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function RecruiterDashboard({
  userId,
  userName = "Pro Recruiter",
  userRole = "recruiter",
  onLogout
}: RecruiterDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedJobDetailsId, setSelectedJobDetailsId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("inactive");
  const [activePlanName, setActivePlanName] = useState<string>("No active plan");
  const [accountCenterData, setAccountCenterData] = useState<any>(null);
  const [accountCenterLoading, setAccountCenterLoading] = useState<boolean>(true);
  const [accountCenterError, setAccountCenterError] = useState<string>("");

  // Recruiter workspace is populated only from persisted job postings and assigned applications.
  const [assignedJobs, setAssignedJobs] = useState<RecruiterJob[]>([]);
  const [pipelineCandidates, setPipelineCandidates] = useState<PipelineCandidate[]>([]);
  const [isLoadingRecruiterData, setIsLoadingRecruiterData] = useState<boolean>(true);
  const loadAccountCenter = async () => {
    if (!userId) return;
    setAccountCenterLoading(true);
    setAccountCenterError("");
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Your login session expired. Please sign in again.");
      const response = await fetch("/api/recruiter/account-center", {
        headers: { Authorization: "Bearer " + token }
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || "Could not load account details.");

      setAccountCenterData(data);
      setKycStatus(data.kyc?.status || "pending");
      setIsApproved(Boolean(data.kyc?.approved || data.profile?.isApproved));
      setSubscriptionStatus(data.subscription?.status || "inactive");
      setActivePlanName(data.subscription?.name || "No active plan");
    } catch (e: any) {
      setAccountCenterError(e?.message || "Could not load account details.");
    } finally {
      setAccountCenterLoading(false);
    }
  };

  // Sync only real applications assigned to this recruiter and their real job postings.
  const loadData = async () => {
    if (!userId) { setAssignedJobs([]); setPipelineCandidates([]); setIsLoadingRecruiterData(false); return; }
    setIsLoadingRecruiterData(true);
    try {
      const [assignedAppsSnap, recruiterJobsSnap, explicitlyAssignedJobsSnap] = await Promise.all([
        getDocs(query(collection(db, "applications"), where("assignedRecruiterId", "==", userId))),
        getDocs(query(collection(db, "jobs"), where("recruiterId", "==", userId))),
        getDocs(query(collection(db, "jobs"), where("assignedRecruiterId", "==", userId)))
      ]);
      const jobDocs = new Map<string, any>();
      [...recruiterJobsSnap.docs, ...explicitlyAssignedJobsSnap.docs].forEach((snap) => jobDocs.set(snap.id, { id: snap.id, ...snap.data() }));
      const appDocs = new Map<string, any>();
      assignedAppsSnap.docs.forEach((snap) => appDocs.set(snap.id, { id: snap.id, ...snap.data() }));
      for (const jobId of Array.from(new Set([...Array.from(jobDocs.keys()), ...Array.from(appDocs.values()).map((app: any) => String(app.jobId || "")).filter(Boolean)]))) {
        if (!jobDocs.has(jobId)) {
          const jobSnap = await getDoc(doc(db, "jobs", jobId));
          if (jobSnap.exists()) jobDocs.set(jobId, { id: jobSnap.id, ...jobSnap.data() });
        }
        const job = jobDocs.get(jobId);
        // Candidate visibility is driven by explicit application assignment; never pull every applicant for a job.
      }
      const jobs = Array.from(jobDocs.values()).filter((job: any) => job && job.id && !["closed", "expired", "rejected", "deleted"].includes(String(job.status || "").toLowerCase()));
      const jobsById = new Map(jobs.map((job: any) => [job.id, job]));
      const applications = Array.from(appDocs.values()).filter((app: any) => {
        const job = jobsById.get(String(app.jobId || ""));
        return app.assignedRecruiterId === userId || (job && (job.recruiterId === userId || job.assignedRecruiterId === userId));
      });
      const mapped: PipelineCandidate[] = await Promise.all(applications.map(async (app: any) => {
        const job: any = jobsById.get(String(app.jobId || "")) || {};
        const candidateId = String(app.candidateId || app.userId || "");
        let profile: any = {};
        if (candidateId) {
          const profileSnaps = await Promise.all([
            getDoc(doc(db, "candidateProfiles", candidateId)).catch(() => null),
            getDoc(doc(db, "candidate_profiles", candidateId)).catch(() => null),
            getDoc(doc(db, "candidates", candidateId)).catch(() => null),
            getDoc(doc(db, "users", candidateId)).catch(() => null)
          ]);
          profile = profileSnaps.reduce((acc: any, snap: any) => snap?.exists() ? { ...acc, ...snap.data() } : acc, {});
        }
        const rawStatus = String(app.status || "applied").toLowerCase();
        const stageMap: Record<string, PipelineCandidate["stage"]> = { applied: "new_lead", new: "new_lead", under_review: "contacted", contacted: "contacted", screened: "screened", shortlisted: "shortlisted", interview: "interview", selected: "selected", offer: "selected", joined: "selected", rejected: "rejected" };
        const experience = app.candidateExperience ?? app.experience ?? profile.experience ?? profile.totalExperience ?? profile.experienceYears ?? "Not provided";
        const skills = app.candidateSkills ?? app.skills ?? profile.skills ?? profile.technicalSkills ?? [];
        const matchScore = app.screeningFitScore ?? app.aiMatchScore ?? null;
        return {
          id: app.id, candidateId, name: app.candidateName || profile.fullName || profile.name || profile.displayName || "Candidate",
          email: app.candidateEmail || profile.email || "", phone: app.candidatePhone || profile.phone || profile.mobileNumber || "",
          role: profile.currentTitle || profile.targetRole || profile.designation || job.title || app.jobTitle || "Candidate",
          jobId: String(app.jobId || ""), jobTitle: job.title || app.jobTitle || "Job posting unavailable",
          companyName: job.companyName || app.companyName || app.company || "Company not provided",
          experience: typeof experience === "number" ? String(experience) + " Years" : String(experience),
          location: app.candidateLocation || profile.location || profile.currentLocation || job.location || "Not provided",
          skills: Array.isArray(skills) ? skills.filter((v: any) => typeof v === "string") : [],
          aiScore: typeof matchScore === "number" ? matchScore : undefined,
          stage: stageMap[rawStatus] || "new_lead", lastActivity: app.updatedAt || app.appliedAt || "Application received",
          resumeUrl: app.resumeUrl || profile.resumeUrl || ""
        } as PipelineCandidate;
      }));
      setAssignedJobs(jobs.map((job: any) => ({
        id: job.id, title: job.title || "Untitled job", companyName: job.companyName || job.company || "Company not provided",
        companyId: job.employerId || job.companyId || "", location: job.location || "Not provided", workMode: job.workMode || "",
        salary: job.salaryRange || job.salary || job.compensation || "Not disclosed",
        openings: Number(job.openings || job.vacancies || job.numberOfOpenings || 1),
        deadline: job.applyDeadline || job.validThrough || job.expiryDate || "",
        candidateCount: applications.filter((app: any) => app.jobId === job.id).length,
        skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired : Array.isArray(job.skills) ? job.skills : [],
        status: job.status || "Published", assignedAt: job.assignedAt || ""
      } as RecruiterJob)));
      setPipelineCandidates(mapped);
    } catch (e) {
      console.error("[RecruiterDashboard] Failed to load assigned real jobs/applications:", e);
      setAssignedJobs([]); setPipelineCandidates([]);
    } finally { setIsLoadingRecruiterData(false); }
  };

  useEffect(() => {
    loadData();
    loadAccountCenter();
  }, [userId]);

  // Handle URL sync and cleanly remove callback query parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "return" || window.location.search.includes("razorpay_") || window.location.search.includes("orderId")) {
        window.history.replaceState({}, document.title, "/recruiter/dashboard");
      } else if (window.location.pathname !== "/recruiter/dashboard") {
        window.history.replaceState({}, document.title, "/recruiter/dashboard");
      }
    }
  }, []);

  const handleUpdateStage = async (applicationId: string, newStage: PipelineCandidate["stage"]) => {
    const statusMap: Record<PipelineCandidate["stage"], any> = { new_lead: "applied", contacted: "under_review", screened: "under_review", shortlisted: "shortlisted", interview: "interview", selected: "selected", rejected: "rejected" };
    try {
      await updateDoc(doc(db, "applications", applicationId), { status: statusMap[newStage], updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, "company_applications", applicationId), { status: statusMap[newStage], updatedAt: new Date().toISOString() }).catch(() => undefined);
      setPipelineCandidates(prev => prev.map(c => c.id === applicationId ? { ...c, stage: newStage } : c));
    } catch (error) { console.error("[RecruiterDashboard] Candidate stage update failed:", error); }
  };

  const handleOpenLiveChat = (recipientId?: string, recipientName?: string) => {
    if (recipientId && recipientName) {
      setActiveChatRecipient({ id: recipientId, name: recipientName });
    }
    setActiveTab("messages");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "assigned-jobs", label: "Assigned Jobs", icon: Briefcase, count: assignedJobs.length },
    { id: "pipeline", label: "Candidate Pipeline", icon: Users, count: pipelineCandidates.length, highlight: true },
    { id: "find-candidates", label: "Find Candidates", icon: Search },
    { id: "ai-matching", label: "AI Matching", icon: Sparkles },
    { id: "interviews", label: "Interviews", icon: Calendar, count: 2 },
    { id: "leads", label: "Admin Leads", icon: Layers, count: 2 },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "earnings", label: "Referral & Earnings", icon: IndianRupee },
    { id: "account", label: "Profile, KYC & Billing", icon: WalletCards },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0e0a14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200" id="recruiter-dashboard-app">
      
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-[#17111F]/90 border-b border-purple-500/20 backdrop-blur-2xl px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AIJobsLogo size="sm" showTagline={false} />
            {/* Distinction between paid/subscription active and KYC verification pending */}
            <div className="hidden sm:flex items-center gap-2">
              {String(subscriptionStatus).toLowerCase() === "active" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>PAID PLAN ACTIVE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/15 border border-slate-500/30 text-slate-300">
                  <WalletCards className="w-3 h-3" />
                  <span>{String(subscriptionStatus || "inactive").toUpperCase()}</span>
                </span>
              )}
              {isApproved || kycStatus === "approved" || kycStatus === "verified" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  <span>VERIFIED RECRUITER</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>KYC IN REVIEW</span>
                </span>
              )}
            </div>
          </div>

          {/* Center: Search Candidates / Mandates */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate profiles, skills, assigned jobs..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Right: Notifications, Primary CTA & Profile Menu */}
          <div className="flex items-center gap-3">
            
            {/* Primary Bright Emerald "Find Candidates" Button */}
            <button
              id="recruiter-topbar-find-candidates"
              onClick={() => setActiveTab("find-candidates")}
              className="px-4 py-2 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105 active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Find Candidates</span>
              <span className="sm:hidden">Find</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#17111F] animate-pulse" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-4 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
                    <span className="text-xs font-bold text-white">Recruiter Alerts</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white text-xs">
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <span className="font-bold text-white block">New Mandate Assigned</span>
                      <span className="text-[11px] text-slate-400">AI / ML Solutions Engineer position assigned to your queue.</span>
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
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                  {(userName || "R").charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{userName}</div>
                  <div className="text-[10px] text-slate-400 truncate">Pro Recruiter</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-2 z-50 animate-in fade-in space-y-1 text-xs">
                  <div className="px-3 py-2 border-b border-purple-500/20">
                    <div className="font-bold text-white truncate">{userName}</div>
                    <div className="text-[10px] text-cyan-300">
                      {isApproved || ["approved", "verified"].includes(String(kycStatus).toLowerCase()) ? "Verified Recruiter Partner" : "Recruiter Partner • KYC Review"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("account");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <WalletCards className="w-4 h-4 text-cyan-400" />
                    <span>Profile, KYC & Billing</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("earnings");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span>My Earnings & Rewards</span>
                  </button>
                  <div className="border-t border-purple-500/20 pt-1">
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        if (onLogout) onLogout();
                        else {
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

      {/* Non-intrusive warning badge for restricted actions until admin approval */}
      {(!isApproved && kycStatus !== "approved" && kycStatus !== "verified") && (
        <div id="recruiter-kyc-pending-warning" className="bg-amber-950/40 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 text-xs text-amber-200 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase">
                Plan Active: {activePlanName}
              </span>
              <span className="text-gray-200">
                <strong>KYC Verification Pending:</strong> Your database plan is active and search is enabled. Direct candidate messaging, contact reveals, and offer releases remain restricted until our compliance team clears your submitted identity documents.
              </span>
            </div>
            <button
              onClick={() => setActiveTab("account")}
              className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-amber-300 hover:text-amber-200"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>View KYC status & documents</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex gap-6">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-4">
          <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block px-3 pb-2">
              RECRUITER WORKSPACE
            </span>

            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : item.highlight
                      ? "text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${item.highlight && !isActive ? "text-cyan-400" : ""}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-black/40 text-slate-400"}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-purple-500/20 mt-2">
              <button
                onClick={async () => {
                  if (onLogout) onLogout();
                  else {
                    await auth.signOut();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Workspace</span>
              </button>
            </div>
          </div>
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
                className="fixed inset-y-0 left-0 w-72 bg-[#17111F] border-r border-purple-500/30 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl z-50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <AIJobsLogo size="sm" />
                    <button
                      onClick={() => setMobileDrawerOpen(false)}
                      className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const IconComp = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                            isActive 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                              : item.highlight
                              ? "text-cyan-400 hover:bg-cyan-500/10"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComp className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.count !== undefined && item.count > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/40 text-slate-400">
                              {item.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-500/20">
                  <button
                    onClick={async () => {
                      setMobileDrawerOpen(false);
                      if (onLogout) onLogout();
                      else {
                        await auth.signOut();
                        window.location.reload();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Center Main Workspace */}
        <main className="flex-1 min-w-0">
          {selectedJobDetailsId ? (
            <JobDetails
              jobId={selectedJobDetailsId}
              userId={userId}
              userName={userName}
              userRole={userRole}
              isRecruiterMode={true}
              onBack={() => setSelectedJobDetailsId(null)}
              onOpenLiveChat={handleOpenLiveChat}
              onUpdateCandidateStage={handleUpdateStage}
            />
          ) : (
            <>
              {activeTab === "overview" && (
                <RecruiterOverview
                  userName={userName}
                  assignedJobs={assignedJobs}
                  pipelineCandidates={pipelineCandidates}
                  onNavigateTab={(t) => setActiveTab(t)}
                  onSelectCandidateForPipeline={(c) => {
                    setActiveTab("pipeline");
                  }}
                  onOpenLiveChat={handleOpenLiveChat}
                />
              )}

              {activeTab === "pipeline" && (
                <RecruiterPipeline
                  candidates={pipelineCandidates}
                  assignedJobs={assignedJobs}
                  onUpdateCandidateStage={handleUpdateStage}
                  onOpenLiveChat={handleOpenLiveChat}
                />
              )}

              {activeTab === "assigned-jobs" && (
                <RecruiterAssignedJobs
                  jobs={assignedJobs}
                  onSelectJobForPipeline={(jobId) => {
                    setActiveTab("pipeline");
                  }}
                  onViewJobDetails={(jobId) => {
                    setSelectedJobDetailsId(jobId);
                  }}
                />
              )}

              {activeTab === "find-candidates" && (
                <RecruiterFindCandidates
                  userId={userId}
                  assignedJobs={assignedJobs}
                  onOpenLiveChat={handleOpenLiveChat}
                />
              )}

              {activeTab === "ai-matching" && (
                <EmployerAiShortlist
                  applications={pipelineCandidates as any}
                  onOpenCandidateDrawer={() => setActiveTab("pipeline")}
                  onOpenLiveChat={handleOpenLiveChat}
                />
              )}

              {activeTab === "interviews" && (
                <EmployerInterviews
                  userId={userId}
                  interviews={[]}
                  jobs={assignedJobs as any}
                  applications={pipelineCandidates as any}
                />
              )}

              {activeTab === "leads" && (
                <RecruiterLeads
                  onOpenLiveChat={handleOpenLiveChat}
                />
              )}

              {activeTab === "messages" && (
                <EmployerMessages
                  initialRecipientId={activeChatRecipient?.id}
                  initialRecipientName={activeChatRecipient?.name}
                />
              )}

              {activeTab === "earnings" && (
                <RecruiterEarnings />
              )}

              {activeTab === "account" && (
                <RecruiterAccountCenter
                  data={accountCenterData}
                  loading={accountCenterLoading}
                  error={accountCenterError}
                  onRefresh={loadAccountCenter}
                />
              )}

              {activeTab === "support" && (
                <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl text-center space-y-4 max-w-lg mx-auto my-12">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Recruiter Partner Support Desk</h3>
                  <p className="text-xs text-slate-400">
                    Contact our agency partnerships team for mandate allocations, commission payout inquiries, or technical support.
                  </p>
                  <div className="p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs space-y-1 font-mono text-left">
                    <div className="text-purple-300 font-bold">Partner Desk</div>
                    <div className="text-slate-300">Email: recruiter-desk@aijobs1.in</div>
                    <div className="text-slate-300">Helpline: +91 80 4567 8901</div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
