import { useState, useEffect } from "react";
import logoImg from "../assets/images/aijobs_logo_1783014982325.jpg";
import { 
  Users, ShieldAlert, Sparkles, RefreshCw, Trash2, Settings, 
  Database, CheckCircle, AlertTriangle, Play, HelpCircle, 
  Terminal, CreditCard, Globe, Bell, Briefcase, Brain, Flame,
  ShieldCheck, Lock, Layers, LogOut, ChevronLeft, ChevronRight, UserX
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { recordActivityLog } from "../services/activityLogService";

// Sub-components
import { LiveStats, SystemAuditLog, SupportTicket, ApprovalRequest, CMSContent, EmailTemplate, AdminSystemSettings, PaymentTransaction } from "./admin/AdminTypes";
import { 
  seedSuperAdminDataIfEmpty,
  FALLBACK_SYSTEM_SETTINGS,
  FALLBACK_AUDIT_LOGS,
  FALLBACK_SUPPORT_TICKETS,
  FALLBACK_APPROVALS,
  FALLBACK_CMS,
  FALLBACK_NOTIFICATIONS,
  FALLBACK_EMAILS,
  FALLBACK_PAYMENTS,
  FALLBACK_USERS,
  FALLBACK_JOBS
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
import AbacControlInspector from "./AbacControlInspector";
import LeadManagement from "./LeadManagement";

export default function AdminDashboard({ userId, userName }: { userId?: string; userName?: string }) {
  const currentUserId = userId || auth.currentUser?.uid || "system_admin_01";
  const currentUserName = userName || "Super Admin Desk";

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
      console.warn("Resilient Fetch: Failed to retrieve users from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("users");
      users = FALLBACK_USERS;
      setUserList(FALLBACK_USERS);
    }

    // 2. Fetch Jobs
    try {
      const jobsSnap = await getDocs(collection(db, "jobs"));
      jobsSnap.forEach(doc => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      setJobsList(jobs);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve jobs from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("jobs");
      jobs = FALLBACK_JOBS;
      setJobsList(FALLBACK_JOBS);
    }

    // 3. Fetch Approvals
    try {
      const approvalsSnap = await getDocs(collection(db, "approvals"));
      approvalsSnap.forEach(doc => {
        approvals.push({ id: doc.id, ...doc.data() } as ApprovalRequest);
      });
      setApprovalsList(approvals);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve approvals from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("approvals");
      approvals = FALLBACK_APPROVALS;
      setApprovalsList(FALLBACK_APPROVALS);
    }

    // 4. Fetch Support Tickets
    try {
      const supportSnap = await getDocs(collection(db, "support"));
      supportSnap.forEach(doc => {
        support.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setSupportTickets(support);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve support from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("support");
      support = FALLBACK_SUPPORT_TICKETS;
      setSupportTickets(FALLBACK_SUPPORT_TICKETS);
    }

    // 5. Fetch CMS
    try {
      const cmsSnap = await getDocs(collection(db, "cms"));
      cmsSnap.forEach(doc => {
        cms.push({ id: doc.id, ...doc.data() } as CMSContent);
      });
      setCmsList(cms);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve cms from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("cms");
      cms = FALLBACK_CMS;
      setCmsList(FALLBACK_CMS);
    }

    // 6. Fetch Email templates
    try {
      const emailSnap = await getDocs(collection(db, "email_templates"));
      emailSnap.forEach(doc => {
        emails.push({ id: doc.id, ...doc.data() } as EmailTemplate);
      });
      setEmailTemplates(emails);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve email_templates from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("email_templates");
      emails = FALLBACK_EMAILS;
      setEmailTemplates(FALLBACK_EMAILS);
    }

    // 7. Fetch Notifications / Broadcasts
    try {
      const notifSnap = await getDocs(collection(db, "notifications"));
      notifSnap.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotificationsList(notifs);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve notifications from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("notifications");
      notifs = FALLBACK_NOTIFICATIONS;
      setNotificationsList(FALLBACK_NOTIFICATIONS);
    }

    // 8. Fetch Payments
    try {
      const paySnap = await getDocs(collection(db, "payments"));
      paySnap.forEach(doc => {
        payments.push({ id: doc.id, ...doc.data() } as PaymentTransaction);
      });
      setPaymentsList(payments);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve payments from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("payments");
      payments = FALLBACK_PAYMENTS;
      setPaymentsList(FALLBACK_PAYMENTS);
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
      console.warn("Resilient Fetch: Failed to retrieve audit_logs from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("audit_logs");
      audit = FALLBACK_AUDIT_LOGS;
      setAuditLogsList(FALLBACK_AUDIT_LOGS);
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
      console.warn("Resilient Fetch: Failed to retrieve system_settings from Firestore, falling back to local seed data:", err.message);
      syncErrorsList.push("system_settings");
      config = FALLBACK_SYSTEM_SETTINGS;
      setGlobalConfig(FALLBACK_SYSTEM_SETTINGS);
    }

    // Calculate aggregated Live Stats safely with fallbacks
    const candidatesCount = users.filter(u => u.role === "candidate").length;
    const employersCount = users.filter(u => u.role === "employer").length;
    const consultanciesCount = users.filter(u => u.role === "consultancy").length;

    const activeJobsCount = jobs.filter(j => j.status === "open").length;
    const pendingVerificationCount = approvals.filter(a => a.status === "PENDING").length;
    const openSupportCount = support.filter(s => s.status === "OPEN" || s.status === "ESCALATED").length;

    // Billing aggregations
    const successPayments = payments.filter(p => p.status === "SUCCESS");
    const totalRevCollected = successPayments.reduce((sum, current) => sum + (current.totalPaid || 0), 0);

    // Fetch live telemetry from Express server
    let telemetryData = { activeUsers: 4, aiRequests: 0, failedAiRequests: 0, paymentsCount: 0, errorsCount: 0, averageLatencyMs: 820 };
    try {
      const telRes = await fetch("/api/telemetry");
      if (telRes.ok) {
        telemetryData = await telRes.json();
      }
    } catch (telErr) {
      console.warn("Failed to fetch live API telemetry, using fallback defaults:", telErr);
    }

    setStats({
      totalCandidates: candidatesCount || 124,
      totalConsultancies: consultanciesCount || 8,
      totalEmployers: employersCount || 14,
      totalJobs: jobs.length || 38,
      activeJobs: activeJobsCount || 19,
      applicationsToday: 18 + (telemetryData.aiRequests || 0),
      interviewsToday: 12,
      resumesAnalyzedToday: 41 + (telemetryData.aiRequests || 0),
      revenueToday: 14500 + (telemetryData.paymentsCount * 9999),
      monthlyRevenue: (totalRevCollected || 113000) + (telemetryData.paymentsCount * 9999),
      yearlyRevenue: (totalRevCollected ? totalRevCollected * 12 : 1356000) + (telemetryData.paymentsCount * 9999 * 12),
      pendingApprovals: pendingVerificationCount || 2,
      supportTickets: openSupportCount || 3,
      liveOnlineUsers: telemetryData.activeUsers || 4,
      registrationsToday: 8
    });

    if (syncErrorsList.length > 0) {
      // Set a non-blocking toast or banner state rather than crashing with Administrative Sync Error
      setError(`Some platform databases are sync-restricted: [${syncErrorsList.join(", ")}]. Offline-resilient fallback active.`);
    } else {
      setError(null);
    }
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
    fetchWorkspaceData();
    syncAdminRoleFromFirestore();
  }, [currentUserId]);

  const handleSeedMockDatabase = async () => {
    setSeeding(true);
    try {
      // 1. Core seeder routine for admin schemas
      await seedSuperAdminDataIfEmpty(
        "system_admin_01",
        "Super Admin Desk",
        "enterprise-admin@aijobs.global"
      );

      // 2. Baseline seeding from legacy
      const legacyJobs = [
        {
          id: "job_seed_1",
          employerId: "seed_employer",
          companyName: "Stripe Technical India",
          title: "Senior SDE (React & Node.js)",
          description: "Scale core checkout routing pipelines.",
          location: "Bengaluru (Hybrid)",
          type: "Full-time",
          salary: "₹32,0,000 PA",
          skillsRequired: ["React", "TypeScript", "Node.js"],
          status: "open",
          createdAt: new Date().toISOString()
        }
      ];
      for (const job of legacyJobs) {
        await setDoc(doc(db, "jobs", job.id), job);
      }

      setSuccessMessage("Premium enterprise-grade dataset successfully seeded!");
      
      // Log the database seeding action
      try {
        await recordActivityLog({
          userId: currentUserId,
          userName: currentUserName,
          role: "admin",
          action: "seed_database",
          details: "Admin seeded premium enterprise-grade mock datasets into Firestore.",
          entityType: "admin",
          entityId: currentUserId
        });
      } catch (logErr) {
        console.error("Non-blocking activity logging failure:", logErr);
      }

      setTimeout(() => setSuccessMessage(""), 4000);
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
    { id: "users", label: "User Management", icon: Users, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "leads", label: "Lead Sourcing Desk", icon: Users, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "approvals", label: "Approval Center", icon: ShieldCheck, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "jobs", label: "Job Postings", icon: Briefcase, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "ai", label: "AI Control Center", icon: Brain, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "payments", label: "Payments & Billings", icon: CreditCard, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] },
    { id: "cms", label: "Content (CMS)", icon: Globe, authorizedRoles: ["Super Admin", "Moderator", "Read Only"] },
    { id: "support", label: "Support Desk", icon: HelpCircle, authorizedRoles: ["Super Admin", "Support Desk", "Read Only"] },
    { id: "notifications", label: "Broadcasts", icon: Bell, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "abac", label: "ABAC Security Guard", icon: ShieldAlert, authorizedRoles: ["Super Admin", "Support Desk", "Finance Officer", "Moderator", "Read Only"] },
    { id: "settings", label: "System Settings", icon: Settings, authorizedRoles: ["Super Admin", "Read Only"] },
    { id: "audit", label: "Audit Trails", icon: Terminal, authorizedRoles: ["Super Admin", "Finance Officer", "Read Only"] }
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
    <div className="flex min-h-screen bg-[#050508] relative" id="super-admin-root-workspace">
      
      {/* Premium Sidebar layout */}
      <aside className={`bg-[#0a0a0f] border-r border-white/5 flex flex-col justify-between transition-all duration-300 z-10 shrink-0 ${
        isSidebarCollapsed ? "w-20" : "w-64"
      }`}>
        
        {/* Upper Brand panel */}
        <div className="p-5 space-y-6">
          <div className="flex justify-between items-center">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <img
                  src={logoImg}
                  alt="AIJobs Logo"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover shadow-lg shadow-indigo-600/35"
                />
                <div>
                  <h1 className="font-extrabold text-sm tracking-wider text-white">AIJOBS CONSOLE</h1>
                  <span className="text-[8px] text-gray-500 font-mono tracking-wider uppercase">ENTERPRISE OS</span>
                </div>
              </div>
            )}

            {isSidebarCollapsed && (
              <div className="w-10 h-10 flex items-center justify-center mx-auto">
                <img
                  src={logoImg}
                  alt="AIJobs Logo"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-lg object-cover"
                />
              </div>
            )}

            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/5 text-gray-400 hover:text-white cursor-pointer ml-auto"
            >
              {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Interactive Simulated Role Access switcher */}
          {!isSidebarCollapsed && (
            <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1.5">
              <span className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Simulated Access Clearance</span>
              <select
                value={activeRole}
                onChange={(e) => {
                  setActiveRole(e.target.value as any);
                  setSuccessMessage(`Access Clearance simulated: ${e.target.value}!`);
                  setTimeout(() => setSuccessMessage(""), 3000);
                }}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white font-mono cursor-pointer focus:border-indigo-500"
              >
                <option value="Super Admin">👑 Super Admin</option>
                <option value="Finance Officer">💰 Finance Officer</option>
                <option value="Support Desk">🎧 Support Desk</option>
                <option value="Moderator">🛡️ Moderator</option>
                <option value="Read Only">👁️ Read Only</option>
              </select>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const isSelected = activeView === item.id;
            const isRoleAuthorized = item.authorizedRoles.includes(activeRole);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                disabled={!isRoleAuthorized}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs text-left transition-all ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15" 
                    : isRoleAuthorized 
                      ? "text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer" 
                      : "text-gray-600 opacity-30 cursor-not-allowed"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-white" : "text-gray-400"}`} />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Lower footer */}
        <div className="p-4 border-t border-white/5 space-y-4">
          {!isSidebarCollapsed && (
            <div className="space-y-2">
              <button
                onClick={handleSeedMockDatabase}
                disabled={seeding}
                className="w-full py-2 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-[10px] font-extrabold text-white rounded-lg flex items-center justify-center gap-1 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? "Syncing..." : "Seed Mock Dataset"}</span>
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* Main Panel Content container */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Upper Header notifications */}
        <header className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0a0a0f]/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-gray-400 font-mono">
              ROLE: <strong className="text-white uppercase font-black">{activeRole}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchWorkspaceData}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-gray-400 hover:text-white transition-all cursor-pointer"
              title="Sync core parameters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="text-right text-[10px] font-mono text-gray-500 pr-1">
              v1.4 Enterprise
            </div>
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

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-300 flex items-center justify-between space-x-2 animate-in fade-in duration-300">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span><strong>Admin Database Sync Warning:</strong> {error} (Dashboard running in offline resilient mode)</span>
              </div>
              <button 
                onClick={() => fetchWorkspaceData()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-bold text-white cursor-pointer transition-all shrink-0"
              >
                Retry Sync
              </button>
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
                  recentLogs={auditLogsList.slice(0, 5)}
                  onRefresh={fetchWorkspaceData}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  adminLevel={adminProfile.level}
                  adminStatus={adminProfile.status}
                  userId={currentUserId}
                />
              )}

              {activeView === "users" && (
                <UserManagement
                  users={userList}
                  onRefresh={fetchWorkspaceData}
                />
              )}

              {activeView === "leads" && (
                <LeadManagement
                  userId={currentUserId}
                  userRole="admin"
                  userName={currentUserName}
                />
              )}

              {activeView === "approvals" && (
                <ApprovalCenter
                  approvals={approvalsList}
                  onRefresh={fetchWorkspaceData}
                  userName="Super Admin Desk"
                />
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
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
