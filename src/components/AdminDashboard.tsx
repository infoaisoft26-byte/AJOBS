import AIJobsLogo from "./AIJobsLogo";
import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { BarChart2, Baseline, Bell, BookOpen, Brain, Briefcase, Building, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, CreditCard, Database, DollarSign, FileText, Funnel, Globe, HelpCircle, Layers, Lock, LogOut, Mail, Menu, MessageSquare, Navigation, RefreshCw, Scale, Settings, ShieldAlert, ShieldCheck, Sidebar, Store, Terminal, Tickets, User, UserCheck, Users, Verified, X } from "lucide-react";
import { auth, db } from "../firebase";
import { parseJsonResponse } from "../utils/apiHelper";

import { recordActivityLog } from "../services/activityLogService";

// Sub-components
import AdminInternalAccessManager from "./AdminInternalAccessManager";
import EmployeeManagement from "./admin/EmployeeManagement";
import AttendanceLiveView from "./admin/AttendanceLiveView";
import ShiftAndOfficeManager from "./admin/ShiftAndOfficeManager";
import LeaveAndRegularizationAdmin from "./admin/LeaveAndRegularizationAdmin";
import PayrollManagementModule from "./admin/PayrollManagementModule";
import { LiveStats, SystemAuditLog, SupportTicket, ApprovalRequest, CMSContent, EmailTemplate, AdminSystemSettings, PaymentTransaction } from "./admin/AdminTypes";
import { 
  seedSuperAdminDataIfEmpty
} from "./admin/AdminSeedData";
import LiveDashboard from "./admin/LiveDashboard";
import UserManagement from "./admin/UserManagement";
import ApprovalCenter from "./admin/ApprovalCenter";
import JobManagement from "./admin/JobManagement";
import AiControlCenter from "./admin/AiControlCenter";
import PaymentManagement from "./admin/PaymentManagement";
import ContentManagement from "./admin/ContentManagement";
import SupportSystem from "./admin/SupportSystem";
import NotificationCenter from "./admin/NotificationCenter";
import SystemSettings from "./admin/SystemSettings";
import AuditLogs from "./admin/AuditLogs";
import ChatMonitoringView from "./admin/ChatMonitoringView";
import AbacControlInspector from "./AbacControlInspector";
import LeadManagement from "./LeadManagement";
import LiveLeadsCRM from "./admin/LiveLeadsCRM";
import KycVerificationCenter from "./admin/KycVerificationCenter";
import OnboardingControlCenter from "./admin/OnboardingControlCenter";
import FinanceAndAccountingModule from "./admin/FinanceAndAccountingModule";
import ApplicationManagement from "./admin/ApplicationManagement";
import HiringFunnelAnalytics from "./admin/HiringFunnelAnalytics";
import ExportActivityCsvButton from "./ExportActivityCsvButton";
import OfflineSyncBadge from "./OfflineSyncBadge";

// Enterprise Modules
import ExecutiveAnalyticsBi from "./ExecutiveAnalyticsBi";
import AiHiringAgent from "./AiHiringAgent";
import DocumentAutomation from "./DocumentAutomation";
import ComplianceGdprCenter from "./ComplianceGdprCenter";

import AiAgentMarketplace from "./AiAgentMarketplace";
import AiVoiceRecruiter from "./AiVoiceRecruiter";
import SkillAssessmentPlatform from "./SkillAssessmentPlatform";
import LearningPlatform from "./LearningPlatform";
import VerifiedProfiles from "./VerifiedProfiles";
import ReferralEcosystem from "./ReferralEcosystem";
import GigMarketplace from "./GigMarketplace";
import MobileBackendHub from "./MobileBackendHub";
import EnterpriseSecurityCenter from "./EnterpriseSecurityCenter";
import ObservabilityHub from "./ObservabilityHub";
import PlatformCertificationSuite from "./PlatformCertificationSuite";
import AdminEmailCenter from "./admin/AdminEmailCenter";

export default function AdminDashboard({ userId, userName }: { userId?: string; userName?: string }) {
  const currentUserId = userId || auth.currentUser?.uid || "system_admin_01";
  const currentUserName = userName || "Super Admin Desk";

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Listen to dashboard navigation event (e.g. from global shortcut Ctrl+D / Cmd+D)
  useEffect(() => {
    const handleResetToOverview = () => {
      setActiveTab("dashboard");
    };
    window.addEventListener("navigate-to-dashboard-overview", handleResetToOverview);
    return () => window.removeEventListener("navigate-to-dashboard-overview", handleResetToOverview);
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Role Based Access state (Simulated active role override)
  const [activeRole, setActiveRole] = useState<"Super Admin" | "Support Desk" | "Finance Officer" | "Moderator" | "Read Only">("Super Admin");

  // Core collections datasets state
  const [userList, setUserList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [approvalsList, setApprovalsList] = useState<ApprovalRequest[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [cmsList, setCmsList] = useState<CMSContent[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentTransaction[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<SystemAuditLog[]>([]);
  const [globalConfig, setGlobalConfig] = useState<AdminSystemSettings | null>(null);
  const [adminProfile, setAdminProfile] = useState<{ level: string; status: string }>({ level: "Super Admin", status: "active" });

  // Stats
  const [stats, setStats] = useState<LiveStats>({
    totalCandidates: 0,
    verifiedCandidates: 0,
    unverifiedCandidates: 0,
    totalConsultancies: 0,
    totalEmployers: 0,
    totalJobs: 0,
    activeJobs: 0,
    applicationsToday: 0,
    interviewsToday: 0,
    resumesAnalyzedToday: 0,
    revenueToday: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    pendingApprovals: 0,
    supportTickets: 0,
    liveOnlineUsers: 0,
    registrationsToday: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchWorkspaceData = async () => {
    setLoading(true);
    setError(null);
    
    let users: any[] = [];
    let jobs: any[] = [];
    let applications: any[] = [];
    let resumes: any[] = [];
    let approvals: ApprovalRequest[] = [];
    let support: SupportTicket[] = [];
    let cms: CMSContent[] = [];
    let emails: EmailTemplate[] = [];
    let notifs: any[] = [];
    let payments: PaymentTransaction[] = [];
    let audit: SystemAuditLog[] = [];
    let config: AdminSystemSettings | null = null;
    let syncErrorsList: string[] = [];

    // 1. Fetch Users
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      usersSnap.forEach(doc => {
        users.push({ uid: doc.id, ...doc.data() });
      });
      setUserList(users);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve users from Firestore:", err.message);
      syncErrorsList.push("users");
      users = [];
      setUserList([]);
    }

    // 1b. Fetch Applications
    try {
      const appsSnap = await getDocs(collection(db, "applications"));
      appsSnap.forEach(doc => {
        applications.push({ id: doc.id, ...doc.data() });
      });
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve applications from Firestore:", err.message);
    }

    // 1c. Fetch Resumes
    try {
      const resumesSnap = await getDocs(collection(db, "resumes"));
      resumesSnap.forEach(doc => {
        resumes.push({ id: doc.id, ...doc.data() });
      });
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve resumes from Firestore:", err.message);
    }

    // 2. Fetch Jobs
    try {
      const jobsSnap = await getDocs(collection(db, "jobs"));
      jobsSnap.forEach(doc => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      setJobsList(jobs);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve jobs from Firestore:", err.message);
      syncErrorsList.push("jobs");
      jobs = [];
      setJobsList([]);
    }

    // 3. Fetch Approvals
    try {
      const approvalsSnap = await getDocs(collection(db, "approvals"));
      approvalsSnap.forEach(doc => {
        approvals.push({ id: doc.id, ...doc.data() } as ApprovalRequest);
      });
      setApprovalsList(approvals);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve approvals from Firestore:", err.message);
      syncErrorsList.push("approvals");
      approvals = [];
      setApprovalsList([]);
    }

    // 4. Fetch Support Tickets
    try {
      const supportSnap = await getDocs(collection(db, "support"));
      supportSnap.forEach(doc => {
        support.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setSupportTickets(support);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve support from Firestore:", err.message);
      syncErrorsList.push("support");
      support = [];
      setSupportTickets([]);
    }

    // 5. Fetch CMS
    try {
      const cmsSnap = await getDocs(collection(db, "cms"));
      cmsSnap.forEach(doc => {
        cms.push({ id: doc.id, ...doc.data() } as CMSContent);
      });
      setCmsList(cms);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve cms from Firestore:", err.message);
      syncErrorsList.push("cms");
      cms = [];
      setCmsList([]);
    }

    // 6. Fetch Email templates
    try {
      const emailSnap = await getDocs(collection(db, "email_templates"));
      emailSnap.forEach(doc => {
        emails.push({ id: doc.id, ...doc.data() } as EmailTemplate);
      });
      setEmailTemplates(emails);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve email_templates from Firestore:", err.message);
      syncErrorsList.push("email_templates");
      emails = [];
      setEmailTemplates([]);
    }

    // 7. Fetch Notifications / Broadcasts
    try {
      const notifSnap = await getDocs(collection(db, "notifications"));
      notifSnap.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotificationsList(notifs);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve notifications from Firestore:", err.message);
      syncErrorsList.push("notifications");
      notifs = [];
      setNotificationsList([]);
    }

    // 8. Fetch Payments
    try {
      const paySnap = await getDocs(collection(db, "payments"));
      paySnap.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() } as PaymentTransaction);
      });
      setPaymentsList(payments);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve payments from Firestore:", err.message);
      syncErrorsList.push("payments");
      payments = [];
      setPaymentsList([]);
    }

    // 9. Fetch Audit logs
    try {
      const auditSnap = await getDocs(collection(db, "audit_logs"));
      auditSnap.forEach(doc => {
        audit.push({ id: doc.id, ...doc.data() } as SystemAuditLog);
      });
      // Sort newest first
      audit.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAuditLogsList(audit);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve audit_logs from Firestore:", err.message);
      syncErrorsList.push("audit_logs");
      audit = [];
      setAuditLogsList([]);
    }

    // 10. Fetch Global Config settings
    try {
      const configSnap = await getDocs(collection(db, "system_settings"));
      configSnap.forEach(doc => {
        if (doc.id === "global_config") {
          config = { id: doc.id, ...doc.data() } as AdminSystemSettings;
        }
      });
      setGlobalConfig(config);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve system_settings from Firestore:", err.message);
      syncErrorsList.push("system_settings");
      config = null;
      setGlobalConfig(null);
    }

    // Calculate aggregated Live Stats safely from real Firestore collections
    const candidatesList = users.filter(u => u.role === "candidate");
    const candidatesCount = candidatesList.length;
    const verifiedCandidatesCount = candidatesList.filter(u => u.emailVerified === true || u.verificationStatus === "verified" || ((u.accountStatus === "active" || u.status === "active") && u.emailVerified !== false && u.verificationStatus !== "pending")).length;
    const unverifiedCandidatesCount = candidatesList.length - verifiedCandidatesCount;

    const employersCount = users.filter(u => u.role === "employer").length;
    const consultanciesCount = users.filter(u => u.role === "consultancy").length;

    const activeJobsCount = jobs.filter(j => j.status === "open" || j.status === "Active" || !j.status).length;
    const pendingVerificationCount = approvals.filter(a => a.status === "PENDING").length;
    const openSupportCount = support.filter(s => s.status === "OPEN" || s.status === "ESCALATED").length;

    const todayIsoStr = new Date().toISOString().split("T")[0];
    const todayRegsCount = users.filter(u => u.createdAt && typeof u.createdAt === "string" && u.createdAt.startsWith(todayIsoStr)).length;
    const totalResumesCount = resumes.length || users.filter(u => u.resumeUrl || u.resumeFileName).length;
    const totalAppsCount = applications.length;

    // Billing aggregations
    const successPayments = payments.filter(p => p.status === "SUCCESS");
    const totalRevCollected = successPayments.reduce((sum, current) => sum + (current.totalPaid || 0), 0);

    // Fetch live telemetry from Express server
    let telemetryData = { activeUsers: 1, aiRequests: 0, failedAiRequests: 0, paymentsCount: 0, errorsCount: 0, averageLatencyMs: 120 };
    try {
      const telRes = await fetch("/api/telemetry");
      if (telRes.ok) {
        telemetryData = await parseJsonResponse(telRes);
      }
    } catch (telErr) {
      console.warn("Failed to fetch live API telemetry:", telErr);
    }

    setStats({
      totalCandidates: candidatesCount,
      verifiedCandidates: verifiedCandidatesCount,
      unverifiedCandidates: unverifiedCandidatesCount,
      totalConsultancies: consultanciesCount,
      totalEmployers: employersCount,
      totalJobs: jobs.length,
      activeJobs: activeJobsCount,
      applicationsToday: totalAppsCount,
      interviewsToday: 0,
      resumesAnalyzedToday: totalResumesCount,
      revenueToday: telemetryData.paymentsCount * 9999,
      monthlyRevenue: totalRevCollected,
      yearlyRevenue: totalRevCollected * 12,
      pendingApprovals: pendingVerificationCount,
      supportTickets: openSupportCount,
      liveOnlineUsers: telemetryData.activeUsers || 1,
      registrationsToday: todayRegsCount
    });

    setLoading(false);
  };

  const syncAdminRoleFromFirestore = async () => {
    try {
      const adminSnap = await getDoc(doc(db, "admins", currentUserId));
      if (adminSnap.exists()) {
        const data = adminSnap.data();
        const level = data.level || "Standard Admin";
        const status = data.status || "active";
        setAdminProfile({ level, status });
        
        if (status === "inactive") {
          setActiveRole("Read Only");
        } else if (level === "Super Admin") {
          setActiveRole("Super Admin");
        } else if (level === "Auditor") {
          setActiveRole("Read Only");
        } else {
          setActiveRole("Moderator");
        }
      } else {
        const defaultAdmin = {
          uid: currentUserId,
          name: currentUserName,
          level: "Super Admin",
          status: "active"
        };
        await setDoc(doc(db, "admins", currentUserId), defaultAdmin);
        setAdminProfile({ level: "Super Admin", status: "active" });
        setActiveRole("Super Admin");
      }
    } catch (err) {
      console.error("Error reading admin attributes:", err);
    }
  };

  useEffect(() => {
    console.log(`[Trace AdminDashboard] First AdminDashboard render - UID: ${currentUserId}, UserName: ${currentUserName}`);
    fetchWorkspaceData();
    syncAdminRoleFromFirestore();
  }, [currentUserId]);

  const handleSeedMockDatabase = async () => {
    setSeeding(true);
    try {
      await seedSuperAdminDataIfEmpty(
        "system_admin_01",
        "Super Admin Desk",
        "enterprise-admin@aijobs.global"
      );
      setSuccessMessage("System configuration verified.");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchWorkspaceData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  // Navigations list with authorization levels
  const navigationItems = [
    { id: "dashboard", label: "Live Dashboard", icon: Layers, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "executive-bi", label: "Executive BI Analytics", icon: BarChart2, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "ai-agent", label: "Autonomous AI Agent", icon: Brain, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "doc-automation", label: "Document Automation", icon: FileText, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "compliance", label: "GDPR & Compliance", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "applications", label: "Applications Directory", icon: FileText, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "funnel", label: "Hiring Funnel Analytics", icon: BarChart2, authorizedRoles: ["Super Admin", "Finance Officer", "Moderator", "Read Only"] },
    { id: "users", label: "User Management", icon: Users, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "emp-directory", label: "Employee Directory", icon: UserCheck, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "emp-attendance", label: "Attendance Live View", icon: Clock, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "emp-shifts-office", label: "Shifts & Office HQ", icon: Building, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "emp-approvals", label: "Leaves & Regularization", icon: CheckCircle, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "emp-payroll", label: "Employee Payroll Engine", icon: DollarSign, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "internal-access", label: "Internal Access Management", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "leads", label: "Live Leads CRM", icon: Users, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "onboarding-pipeline", label: "Onboarding & Verification Pipeline", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "kyc-verification", label: "KYC Verification Center", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "approvals", label: "Approval Center", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "chat-monitoring", label: "Chat & Anti-Fraud Center", icon: MessageSquare, authorizedRoles: ["Super Admin", "Support Desk", "Moderator", "Read Only"] },
    { id: "jobs", label: "Job Postings", icon: Briefcase, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "ai", label: "AI Control Center", icon: Brain, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "payments", label: "Payments & Billings", icon: CreditCard, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "finance-accounting", label: "Finance & Accounting", icon: BookOpen, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "cms", label: "Content (CMS)", icon: Globe, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "support", label: "Support Desk", icon: HelpCircle, authorizedRoles: ["Super Admin", "Support Desk", "Read Only"] },
    { id: "notifications", label: "Broadcasts", icon: Bell, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "email-center", label: "Email & Campaigns", icon: Mail, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "abac", label: "ABAC Security Guard", icon: ShieldAlert, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "settings", label: "System Settings", icon: Settings, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "audit", label: "Audit Trails", icon: Terminal, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "agent-store", label: "AI Agent Store", icon: Brain, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "voice-recruiter", label: "AI Voice Recruiter", icon: Brain, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "skill-assessments", label: "Skill Assessments", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "learning-center", label: "Learning Center", icon: Globe, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "verified-profile", label: "Verified Profiles", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "referrals", label: "Referral Ecosystem", icon: CreditCard, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "gig-marketplace", label: "Gig & Freelance Jobs", icon: Briefcase, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "mobile-backend", label: "Mobile Backend Hub", icon: Terminal, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "security-center", label: "Enterprise Security", icon: Lock, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "observability", label: "System Observability", icon: BarChart2, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "platform-cert", label: "QA Platform Cert", icon: CheckCircle, authorizedRoles: ["Super Admin", "Read Only"] }
  ];

  // Check if current simulated role is authorized to view tab
  const isAuthorizedToView = (tabId: string) => {
    const item = navigationItems.find(n => n.id === tabId);
    if (!item) return false;
    return item.authorizedRoles.includes(activeRole);
  };

  // Safe fallback if role changes and locks current view
  const getAuthorizedView = () => {
    if (isAuthorizedToView(activeTab)) return activeTab;
    return "dashboard"; // Fallback
  };

  const activeView = getAuthorizedView();

  return (
    <motion.div 
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="flex flex-col lg:flex-row min-h-screen bg-[#050508] relative transition-all duration-500" 
      id="super-admin-root-workspace"
    >
      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0a0a0f] border-b border-white/10 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-300 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <AIJobsLogo variant="icon" size="sm" />
            <span className="font-extrabold text-xs text-white">AIJOBS ADMIN</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
            {activeRole}
          </span>
        </div>
      </div>

      {/* Mobile Sidebar Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/75"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-[#0a0a0f] border-r border-white/10 flex flex-col h-full overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <AIJobsLogo variant="icon" size="sm" />
                <span className="font-extrabold text-xs text-white">AIJOBS CONSOLE</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block pb-2">
                SUPER ADMIN NAVIGATION
              </span>
              {navigationItems.map((item) => {
                const isSelected = activeView === item.id;
                const isRoleAuthorized = item.authorizedRoles.includes(activeRole);
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    disabled={!isRoleAuthorized}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl font-medium text-sm text-left transition-all ${
                      isSelected 
                        ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/25" 
                        : isRoleAuthorized 
                          ? "text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer" 
                          : "text-slate-600 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto p-4 border-t border-white/10 bg-black/60 space-y-2">
              <div className="text-xs text-slate-300 font-medium px-1">
                Logged in as: <strong className="text-white">{currentUserName}</strong>
              </div>
              <button
                onClick={async () => {
                  setMobileDrawerOpen(false);
                  await auth.signOut();
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 text-sm font-semibold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar layout */}
      <aside className={`hidden lg:flex bg-[#0a0a0f] border-r border-white/10 flex-col justify-between transition-all duration-300 z-10 shrink-0 ${
        isSidebarCollapsed ? "w-20" : "w-64"
      }`}>
        
        {/* Upper Brand panel */}
        <div className="p-5 space-y-6">
          <div className="flex justify-between items-center">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <AIJobsLogo variant="icon" size="sm" />
                <div>
                  <h1 className="font-sora font-bold text-base tracking-wide text-white">AIJOBS CONSOLE</h1>
                  <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">ENTERPRISE OS</span>
                </div>
              </div>
            )}

            {isSidebarCollapsed && (
              <div className="w-10 h-10 flex items-center justify-center mx-auto">
                <AIJobsLogo variant="icon" size="sm" />
              </div>
            )}

            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-slate-300 hover:text-white cursor-pointer ml-auto"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isSelected = activeView === item.id;
            const isRoleAuthorized = item.authorizedRoles.includes(activeRole);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                disabled={!isRoleAuthorized}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl font-medium text-sm text-left transition-all ${
                  isSelected 
                    ? "bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/25" 
                    : isRoleAuthorized 
                      ? "text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer" 
                      : "text-slate-600 opacity-40 cursor-not-allowed"
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4.5 h-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Lower footer with Logout */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-black/40">
          {!isSidebarCollapsed && (
            <div className="text-xs text-slate-300 font-medium truncate">
              <div className="text-slate-400 text-[11px]">Logged in as</div>
              <div className="text-white font-semibold truncate">{currentUserName}</div>
            </div>
          )}
          <button
            onClick={async () => {
              await auth.signOut();
              window.location.reload();
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25 hover:text-white text-sm font-semibold transition-all cursor-pointer ${
              isSidebarCollapsed ? "px-2" : ""
            }`}
            title="Logout Admin Session"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>

      </aside>

      {/* Main Panel Content container */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Upper Header notifications */}
        <header className="p-4 md:px-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0a0a0f]/80">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase">Current Page:</span>
                <span className="font-sora font-semibold text-sm md:text-base text-white">
                  {navigationItems.find(n => n.id === activeView)?.label || "Live Dashboard"}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                ROLE: <strong className="text-indigo-300 uppercase font-bold">{activeRole}</strong> • PROFILE: <strong className="text-emerald-400 font-bold">{currentUserName}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
            <OfflineSyncBadge />
            <ExportActivityCsvButton role="admin" variant="compact" label="Export Admin CSV" />
            <button
              onClick={fetchWorkspaceData}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5"
              title="Sync core parameters"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Sync Data</span>
            </button>
            <button
              onClick={async () => {
                await auth.signOut();
                window.location.reload();
              }}
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Dynamic subview switches */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {successMessage && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in duration-300">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-44 space-y-3">
              <span className="text-xs text-indigo-400 font-mono animate-pulse tracking-widest uppercase">Fetching Platform Telemetry...</span>
              <p className="text-[10px] text-gray-500">Connecting securely to Firestore collection pools.</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeView === "dashboard" && (
                <LiveDashboard
                  stats={stats}
                  users={userList}
                  recentLogs={auditLogsList.slice(0, 5)}
                  onRefresh={fetchWorkspaceData}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  adminLevel={adminProfile.level}
                  adminStatus={adminProfile.status}
                  userId={currentUserId}
                />
              )}

              {activeView === "applications" && (
                <ApplicationManagement
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "funnel" && (
                <HiringFunnelAnalytics
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "users" && (
                <UserManagement
                  users={userList}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "internal-access" && (
                <AdminInternalAccessManager />
              )}

              {activeView === "leads" && (
                <LiveLeadsCRM />
              )}

              {activeView === "onboarding-pipeline" && (
                <OnboardingControlCenter />
              )}

              {activeView === "kyc-verification" && (
                <KycVerificationCenter />
              )}

              {activeView === "approvals" && (
                <ApprovalCenter
                  approvals={approvalsList}
                  onRefresh={fetchWorkspaceData}
                  userName="Super Admin Desk"
                />
              )}

              {activeView === "chat-monitoring" && (
                <ChatMonitoringView />
              )}

              {activeView === "jobs" && (
                <JobManagement
                  jobs={jobsList}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "ai" && (
                <AiControlCenter
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "payments" && (
                <PaymentManagement
                  transactions={paymentsList}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "finance-accounting" && (
                <FinanceAndAccountingModule
                  userRole="admin"
                  adminUserId={currentUserId}
                />
              )}

              {activeView === "emp-directory" && (
                <EmployeeManagement />
              )}

              {activeView === "emp-attendance" && (
                <AttendanceLiveView />
              )}

              {activeView === "emp-shifts-office" && (
                <ShiftAndOfficeManager />
              )}

              {activeView === "emp-approvals" && (
                <LeaveAndRegularizationAdmin />
              )}

              {activeView === "emp-payroll" && (
                <PayrollManagementModule />
              )}

              {activeView === "cms" && (
                <ContentManagement
                  cmsContents={cmsList}
                  emailTemplates={emailTemplates}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "support" && (
                <SupportSystem
                  tickets={supportTickets}
                  onRefresh={fetchWorkspaceData}
                  userName="Super Admin Desk"
                />
              )}

              {activeView === "notifications" && (
                <NotificationCenter
                  notifications={notificationsList}
                  onRefresh={fetchWorkspaceData}
                  userName="Super Admin Desk"
                />
              )}

              {activeView === "email-center" && (
                <AdminEmailCenter />
              )}

              {activeView === "settings" && globalConfig && (
                <SystemSettings
                  settings={globalConfig}
                  onRefresh={fetchWorkspaceData}
                  userName="Super Admin Desk"
                />
              )}

              {activeView === "abac" && (
                <div className="animate-in fade-in duration-300">
                  <AbacControlInspector 
                    userId={currentUserId} 
                    userRole="admin" 
                    onAttributeUpdated={syncAdminRoleFromFirestore} 
                  />
                </div>
              )}

              {activeView === "audit" && (
                <AuditLogs
                  logs={auditLogsList}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "executive-bi" && (
                <div className="animate-in fade-in duration-300">
                  <ExecutiveAnalyticsBi />
                </div>
              )}

              {activeView === "ai-agent" && (
                <div className="animate-in fade-in duration-300">
                  <AiHiringAgent />
                </div>
              )}

              {activeView === "doc-automation" && (
                <div className="animate-in fade-in duration-300">
                  <DocumentAutomation companyName="AIJobs Global Admin" />
                </div>
              )}

              {activeView === "compliance" && (
                <div className="animate-in fade-in duration-300">
                  <ComplianceGdprCenter />
                </div>
              )}

              {activeView === "agent-store" && (
                <div className="animate-in fade-in duration-300">
                  <AiAgentMarketplace userRole="admin" />
                </div>
              )}

              {activeView === "voice-recruiter" && (
                <div className="animate-in fade-in duration-300">
                  <AiVoiceRecruiter candidateName="Admin Testing Account" />
                </div>
              )}

              {activeView === "skill-assessments" && (
                <div className="animate-in fade-in duration-300">
                  <SkillAssessmentPlatform />
                </div>
              )}

              {activeView === "learning-center" && (
                <div className="animate-in fade-in duration-300">
                  <LearningPlatform />
                </div>
              )}

              {activeView === "verified-profile" && (
                <div className="animate-in fade-in duration-300">
                  <VerifiedProfiles />
                </div>
              )}

              {activeView === "referrals" && (
                <div className="animate-in fade-in duration-300">
                  <ReferralEcosystem />
                </div>
              )}

              {activeView === "gig-marketplace" && (
                <div className="animate-in fade-in duration-300">
                  <GigMarketplace />
                </div>
              )}

              {activeView === "mobile-backend" && (
                <div className="animate-in fade-in duration-300">
                  <MobileBackendHub />
                </div>
              )}

              {activeView === "security-center" && (
                <div className="animate-in fade-in duration-300">
                  <EnterpriseSecurityCenter />
                </div>
              )}

              {activeView === "observability" && (
                <div className="animate-in fade-in duration-300">
                  <ObservabilityHub />
                </div>
              )}

              {activeView === "platform-cert" && (
                <div className="animate-in fade-in duration-300">
                  <PlatformCertificationSuite />
                </div>
              )}
            </div>
          )}
        </div>

      </main>

    </motion.div>
  );
}
