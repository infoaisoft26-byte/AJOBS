import { useState, useEffect } from "react";
import { 
  Bell, X, Check, Trash2, Archive, Search, Sliders, Mail, Smartphone, MessageSquare, 
  Settings, CheckSquare, RefreshCw, AlertTriangle, FileText, CheckCircle2, Volume2, Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { 
  NotificationService, NotificationItem, NotificationMedium, NotificationEvent, 
  CandidateEvent, ConsultancyEvent, EmployerEvent, AdminEvent, MessageLog, DEFAULT_EMAIL_TEMPLATES 
} from "../services/notificationService";

interface NotificationBellProps {
  userId: string;
  userRole: "candidate" | "consultancy" | "employer" | "admin";
  onSelectTab?: (tab: string) => void;
}

/**
 * Premium Animated Bell and Slide-out Notification Drawer
 */
export function NotificationBellAndDrawer({ userId, userRole, onSelectTab }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ringing, setRinging] = useState(false);

  // Real-time listener for user's active notifications
  useEffect(() => {
    if (!userId) return;

    // Ensure email templates are seeded once (only for admin)
    if (userRole === "admin") {
      NotificationService.ensureEmailTemplates(true);
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("archived", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: NotificationItem[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as NotificationItem);
      });
      
      const newUnread = items.filter(n => !n.read).length;
      if (newUnread > unreadCount) {
        setRinging(true);
        setTimeout(() => setRinging(false), 1200);
      }
      
      setNotifications(items);
      setUnreadCount(newUnread);
    }, (error) => {
      console.error("Firestore sync error in drawer bell:", error);
    });

    return () => unsubscribe();
  }, [userId, unreadCount]);

  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.read);
      const promises = unreadList.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
      await Promise.all(promises);
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { archived: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Animated Bell trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-white rounded-xl transition-all relative cursor-pointer hover:bg-white/5 active:scale-95"
        id="animated-bell-trigger"
        aria-label="Notifications"
      >
        <motion.div
          animate={ringing ? {
            rotate: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0],
            scale: [1, 1.15, 1.15, 1, 1.05, 1]
          } : {}}
          transition={{ duration: 1 }}
          className="relative"
        >
          <Bell className="w-5 h-5 text-indigo-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#050508] animate-pulse">
              {unreadCount}
            </span>
          )}
        </motion.div>
      </button>

      {/* Slide-out Notification Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />

            {/* Slide-out drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0f] border-l border-white/5 shadow-2xl z-50 flex flex-col h-screen text-white text-xs font-sans"
              id="notification-drawer"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 bg-black/30 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-white">Live Workspace Activity</h2>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{unreadCount} UNREAD ALERTS</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all"
                    >
                      Clear Unread
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar divide-y divide-white/5">
                {notifications.length > 0 ? (
                  notifications.map((n, idx) => (
                    <div 
                      key={n.id} 
                      className={`pt-3.5 first:pt-0 group relative flex items-start space-x-3.5 transition-all ${
                        n.read ? "opacity-60" : "bg-indigo-500/[0.02]"
                      }`}
                    >
                      {/* Event indicator dot */}
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        n.read ? "bg-gray-700" : n.type === "alert" ? "bg-rose-500 animate-ping" : "bg-indigo-500"
                      }`} />

                      {/* Content block */}
                      <div className="flex-1 space-y-1 pr-12">
                        <p className={`font-bold text-gray-100 leading-snug ${n.read ? "font-semibold" : "text-white"}`}>{n.title}</p>
                        <p className="text-gray-400 leading-normal text-[11px] font-medium">{n.message}</p>
                        
                        <div className="flex items-center space-x-3 font-mono text-[9px] text-gray-500 pt-1">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-bold text-[8px] uppercase">{n.event.replace(/_/g, " ")}</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Floating actions */}
                      <div className="absolute right-0 top-3 border border-white/5 bg-neutral-900 rounded-lg p-0.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="p-1 hover:bg-indigo-600 hover:text-white rounded text-gray-400"
                            title="Mark as Read"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleArchive(n.id)}
                          className="p-1 hover:bg-amber-600 hover:text-white rounded text-gray-400"
                          title="Archive"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1 hover:bg-rose-600 hover:text-white rounded text-gray-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-28 text-center text-gray-500 space-y-3 border border-dashed border-white/5 rounded-2xl">
                    <Bell className="w-8 h-8 text-gray-600 stroke-1" />
                    <div>
                      <p className="font-bold text-gray-400">All caught up!</p>
                      <p className="text-[10px] text-gray-500">Your notifications tray is empty.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Drawer Control Section */}
              <div className="p-4 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    if (onSelectTab) {
                      onSelectTab("notifications");
                    } else {
                      window.location.hash = "#notifications";
                    }
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold font-mono text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/15 text-center cursor-pointer"
                >
                  Manage Hub Configuration
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

interface NotificationCenterViewProps {
  userId: string;
  userRole: "candidate" | "consultancy" | "employer" | "admin";
  userName: string;
}

/**
 * Dedicated Centralized Notification Center Screen View
 */
export function NotificationCenterView({ userId, userRole, userName }: NotificationCenterViewProps) {
  const [activeTab, setActiveTab] = useState<"inbox" | "preferences" | "logs" | "templates">("inbox");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences["preferences"]>({});
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  // Search, filter, page parameters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "archived" | "announcements" | "alerts">("all");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Setup template editor
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const refreshData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user notifications
      const notifQuery = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const notifsSnap = await getDocs(notifQuery);
      const notifs: NotificationItem[] = [];
      notifsSnap.forEach((doc) => notifs.push(doc.data() as NotificationItem));
      setNotifications(notifs);

      // 2. Fetch User preferences
      const prefRecord = await NotificationService.getUserPreferences(userId);
      setPreferences(prefRecord.preferences);

      // 3. Fetch Message logs (Admins see all, users see their own)
      const logsRef = collection(db, "message_logs");
      let logsQuery;
      if (userRole === "admin") {
        logsQuery = query(logsRef, orderBy("createdAt", "desc"));
      } else {
        logsQuery = query(logsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
      }
      const logsSnap = await getDocs(logsQuery);
      const logs: MessageLog[] = [];
      logsSnap.forEach((doc) => logs.push(doc.data() as MessageLog));
      setMessageLogs(logs);

      // 4. Fetch email templates
      const templatesSnap = await getDocs(collection(db, "email_templates"));
      const tmpls: any[] = [];
      templatesSnap.forEach((doc) => tmpls.push(doc.data()));
      setEmailTemplates(tmpls);

    } catch (err) {
      console.error("Telemetry fetch issues in Notification Center:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [userId, userRole]);

  // Handle Mark Read, Mark All Read, Delete, Archive
  const handleMarkRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unreadList = notifications.filter(n => !n.read);
      const promises = unreadList.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
      await Promise.all(promises);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      triggerAlert("All notification events checked off as read!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { archived: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const triggerAlert = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // Toggle Preferences
  const handleTogglePreference = async (event: NotificationEvent, channel: NotificationMedium) => {
    const currentEventPref = preferences[event] || {
      inApp: true,
      email: true,
      push: true,
      sms: false,
      whatsapp: false,
    };

    const updatedEventPref = {
      ...currentEventPref,
      [channel]: !currentEventPref[channel]
    };

    const nextPrefs = {
      ...preferences,
      [event]: updatedEventPref
    };

    setPreferences(nextPrefs);
    try {
      await NotificationService.saveUserPreferences(userId, nextPrefs);
      triggerAlert(`Channels for event: '${event}' updated successfully.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Edit and Save Custom Email Template
  const handleSelectTemplate = (tmpl: any) => {
    setSelectedTemplate(tmpl);
    setTemplateSubject(tmpl.subject);
    setTemplateBody(tmpl.body);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      await updateDoc(doc(db, "email_templates", selectedTemplate.id), {
        subject: templateSubject,
        body: templateBody,
      });
      setEmailTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? { ...t, subject: templateSubject, body: templateBody } : t));
      triggerAlert(`Email Template '${selectedTemplate.name}' updated successfully in cloud cache.`);
      setSelectedTemplate(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Get active roles configuration categories
  const roleEventConfigs: { category: string; events: Array<{ id: NotificationEvent; label: string }> }[] = [
    {
      category: "Candidate Career Actions",
      events: [
        { id: "REGISTRATION_SUCCESSFUL", label: "Registration Successful" },
        { id: "RESUME_UPLOADED", label: "Resume Scanned & Uploaded" },
        { id: "RESUME_ANALYSIS_COMPLETED", label: "Resume ATS Score Completed" },
        { id: "AI_INTERVIEW_SCHEDULED", label: "AI Interview Arena Scheduled" },
        { id: "AI_INTERVIEW_COMPLETED", label: "AI Interview Completed & Scored" },
        { id: "NEW_JOB_MATCH", label: "New AI Job Match Recommendation" },
        { id: "APPLICATION_SUBMITTED", label: "Job Application Filed Confirmation" },
        { id: "INTERVIEW_INVITATION", label: "Employer Interview Invitation" },
        { id: "OFFER_LETTER_RECEIVED", label: "Offer Letter Received" },
        { id: "PROFILE_INCOMPLETE_REMINDER", label: "Incomplete profile warning alert" },
      ],
    },
    {
      category: "Consultancy CRM & Team Actions",
      events: [
        { id: "NEW_CANDIDATE_MATCH", label: "New Sourced Candidate matching job" },
        { id: "JOB_APPLICATION_RECEIVED", label: "New Job Application Received" },
        { id: "INTERVIEW_REMINDER", label: "Interview Event Reminder Scheduled" },
        { id: "SUBSCRIPTION_EXPIRY", label: "Enterprise Subscription Expiration Alert" },
        { id: "PLAN_UPGRADED", label: "Subscription Plan Upgraded Receipt" },
        { id: "PAYMENT_SUCCESSFUL", label: "Payment Transaction Log Success" },
        { id: "PLACEMENT_COMPLETED", label: "Placement Pipeline Completed Log" },
      ],
    },
    {
      category: "Employer Sourcing & Pipeline Actions",
      events: [
        { id: "NEW_APPLICATION", label: "New Job Application Received" },
        { id: "SHORTLISTED_CANDIDATE", label: "Candidate Shortlisted by Hiring team" },
        { id: "INTERVIEW_REMINDER", label: "Technical Interview event Reminder" },
        { id: "OFFER_ACCEPTED", label: "Released Job Offer Accepted" },
        { id: "SUBSCRIPTION_ALERTS", label: "Corporate Billing Subscription Alerts" },
      ],
    },
    {
      category: "Super-Admin Security & System Alerts",
      events: [
        { id: "PENDING_APPROVALS", label: "Pending agency verification request" },
        { id: "PAYMENT_FAILURES", label: "Razorpay/Stripe Payment Failure Alerts" },
        { id: "SUPPORT_TICKETS", label: "New Support Ticket escalated" },
        { id: "SYSTEM_ALERTS", label: "Server Node downtime warning alerts" },
        { id: "SECURITY_ALERTS", label: "Suspicious login IP blacklist alerts" },
      ],
    },
  ];

  // Filtering list logic
  const filteredNotifications = notifications.filter((n) => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.event.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === "unread") matchesFilter = !n.read && !n.archived;
    else if (filterType === "archived") matchesFilter = n.archived;
    else if (filterType === "announcements") matchesFilter = n.event === "SYSTEM_BROADCAST";
    else if (filterType === "alerts") matchesFilter = n.type === "alert";
    else matchesFilter = !n.archived; // default all hides archived
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="notification-hub-workspace">
      
      {/* Alert Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-indigo-400" />
            <span>Central Communication & Notification Hub</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Toggle preference channels, search communication audit logs, customize automated transactional templates, and manage alerts.
          </p>
        </div>

        <button
          onClick={refreshData}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded-xl transition-all cursor-pointer font-bold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Hub State</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* Tabs configuration */}
      <div className="flex border-b border-white/5 space-x-6 text-xs select-none">
        <button
          onClick={() => setActiveTab("inbox")}
          className={`pb-2.5 font-bold transition-colors cursor-pointer uppercase font-mono tracking-wider relative ${
            activeTab === "inbox" ? "text-indigo-400" : "text-gray-400 hover:text-white"
          }`}
        >
          Inbox Workspace
          {activeTab === "inbox" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`pb-2.5 font-bold transition-colors cursor-pointer uppercase font-mono tracking-wider relative ${
            activeTab === "preferences" ? "text-indigo-400" : "text-gray-400 hover:text-white"
          }`}
        >
          Channel Preferences
          {activeTab === "preferences" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-2.5 font-bold transition-colors cursor-pointer uppercase font-mono tracking-wider relative ${
            activeTab === "logs" ? "text-indigo-400" : "text-gray-400 hover:text-white"
          }`}
        >
          Dispatch Logs
          {activeTab === "logs" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        {userRole === "admin" && (
          <button
            onClick={() => setActiveTab("templates")}
            className={`pb-2.5 font-bold transition-colors cursor-pointer uppercase font-mono tracking-wider relative ${
              activeTab === "templates" ? "text-indigo-400" : "text-gray-400 hover:text-white"
            }`}
          >
            Email Templates Editor
            {activeTab === "templates" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-xs text-gray-500 font-mono uppercase tracking-widest animate-pulse">Syncing Communication Hub...</p>
        </div>
      ) : (
        <div className="text-xs text-gray-300">
          
          {/* TAB 1: INBOX WORKSPACE */}
          {activeTab === "inbox" && (
            <div className="space-y-4">
              
              {/* Filter controls panel */}
              <div className="flex flex-col md:flex-row gap-3.5 justify-between items-start md:items-center">
                <div className="flex items-center space-x-2 w-full max-w-sm relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search titles, events, descriptions..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap select-none">
                  {[
                    { id: "all", label: "All Alerts" },
                    { id: "unread", label: "Unread" },
                    { id: "archived", label: "Archived" },
                    { id: "announcements", label: "Broadcasts" },
                    { id: "alerts", label: "Critical" },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setFilterType(btn.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        filterType === btn.id
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}

                  {notifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold rounded-xl transition-all ml-2"
                    >
                      Mark All Read
                    </button>
                  )}
                </div>
              </div>

              {/* Grid or List list */}
              <div className="space-y-3">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-2xl border transition-all relative group flex items-start gap-4 ${
                        n.read ? "bg-black/30 border-white/5 opacity-60" : "bg-white/5 border-white/10 shadow-lg"
                      }`}
                    >
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        n.type === "alert" ? "bg-rose-500/15 text-rose-400" : "bg-indigo-500/15 text-indigo-400"
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>

                      <div className="flex-1 space-y-1.5 pr-12">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                            n.type === "alert" ? "bg-rose-500/10 text-rose-400 border-rose-500/25 animate-pulse" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                          }`}>
                            {n.type || "INFO"}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">Event: <strong>{n.event}</strong></span>
                        </div>
                        
                        <h4 className="font-extrabold text-sm text-white">{n.title}</h4>
                        <p className="text-gray-400 leading-relaxed text-[11px]">{n.message}</p>
                        
                        <div className="text-[10px] text-gray-500 font-mono">
                          Dispatched: {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="absolute right-4 top-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Mark as Read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!n.archived && (
                          <button
                            onClick={() => handleArchive(n.id)}
                            className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Archive Notification"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center text-xs text-gray-500 italic bg-white/5 border border-white/5 border-dashed rounded-2xl">
                    No active inbox messages aligned with search/filter parameters.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: CHANNEL PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-3">
                <h3 className="font-extrabold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Configure Multi-Channel Delivery preferences</span>
                </h3>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Toggle customized endpoints for each event type. When a career or CRM milestone occurs, system orchestrates payloads dynamically across enabled channels. Note: SMS and WhatsApp are abstraction mock providers.
                </p>
              </div>

              {/* Grouped Accordions by Role Events */}
              <div className="space-y-6">
                {roleEventConfigs.map((group, gIdx) => (
                  <div key={gIdx} className="glass border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 bg-black/40 border-b border-white/5">
                      <h4 className="font-extrabold text-xs text-indigo-400 uppercase tracking-wider font-mono">
                        {group.category}
                      </h4>
                    </div>

                    <div className="divide-y divide-white/5">
                      {group.events.map((evt) => {
                        const eventPref = preferences[evt.id] || {
                          inApp: true,
                          email: true,
                          push: true,
                          sms: false,
                          whatsapp: false,
                        };

                        return (
                          <div key={evt.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.01] transition-colors">
                            <div>
                              <p className="font-bold text-white text-xs">{evt.label}</p>
                              <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">{evt.id}</span>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center gap-3.5 flex-wrap">
                              {/* In App Toggle */}
                              <button
                                onClick={() => handleTogglePreference(evt.id, "inApp")}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-all ${
                                  eventPref.inApp 
                                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30" 
                                    : "bg-white/5 text-gray-500 border-transparent hover:text-white"
                                }`}
                              >
                                <CheckSquare className="w-3 h-3" />
                                <span>IN-APP</span>
                              </button>

                              {/* Email Toggle */}
                              <button
                                onClick={() => handleTogglePreference(evt.id, "email")}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-all ${
                                  eventPref.email 
                                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30" 
                                    : "bg-white/5 text-gray-500 border-transparent hover:text-white"
                                }`}
                              >
                                <Mail className="w-3 h-3" />
                                <span>EMAIL</span>
                              </button>

                              {/* Push Toggle */}
                              <button
                                onClick={() => handleTogglePreference(evt.id, "push")}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-all ${
                                  eventPref.push 
                                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30" 
                                    : "bg-white/5 text-gray-500 border-transparent hover:text-white"
                                }`}
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>PUSH</span>
                              </button>

                              {/* SMS Toggle */}
                              <button
                                onClick={() => handleTogglePreference(evt.id, "sms")}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-all ${
                                  eventPref.sms 
                                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30" 
                                    : "bg-white/5 text-gray-500 border-transparent hover:text-white"
                                }`}
                              >
                                <Smartphone className="w-3 h-3" />
                                <span>SMS</span>
                              </button>

                              {/* WhatsApp Toggle */}
                              <button
                                onClick={() => handleTogglePreference(evt.id, "whatsapp")}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold font-mono text-[9px] flex items-center gap-1 cursor-pointer transition-all ${
                                  eventPref.whatsapp 
                                    ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30" 
                                    : "bg-white/5 text-gray-500 border-transparent hover:text-white"
                                }`}
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WHATSAPP</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: MESSAGE COMMUNICATIONS LOG */}
          {activeTab === "logs" && (
            <div className="space-y-4">
              
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                <h4 className="font-extrabold text-white">Communications System Audit Logs</h4>
                <p className="text-[11px] text-gray-400 mt-1">
                  Full transaction traces of dispatched alerts, SMS, emails, and push payloads mapped to endpoints.
                </p>
              </div>

              <div className="space-y-2.5">
                {messageLogs.length > 0 ? (
                  messageLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 font-mono text-[10px]">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded font-black text-[8px] border ${
                            log.status === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-indigo-400 uppercase font-black">[{log.medium}]</span>
                          <span className="text-gray-400">{log.event}</span>
                        </div>
                        <span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>

                      <div className="text-gray-300 text-[11px] leading-relaxed break-all bg-black/30 p-2.5 rounded border border-white/5">
                        <p className="text-gray-500 text-[9px] pb-1 border-b border-white/5 mb-1">To: <strong>{log.recipient}</strong> {log.subject ? `• Subject: ${log.subject}` : ""}</p>
                        <p className="whitespace-pre-wrap">{log.body}</p>
                        {log.error && <p className="text-rose-400 font-bold mt-1.5 border-t border-rose-500/15 pt-1">Error: {log.error}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-16 text-center text-xs text-gray-500 bg-white/5 rounded-2xl border border-white/5 border-dashed italic">
                    No active message dispatch logs triggered in the current session.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: EMAIL TEMPLATES BUILDER (ADMIN ONLY) */}
          {activeTab === "templates" && userRole === "admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Templates menu list */}
              <div className="lg:col-span-1 space-y-2.5">
                <h4 className="font-extrabold text-white uppercase font-mono tracking-wider mb-2">Seeded Transactional Templates</h4>
                
                {emailTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`w-full p-4 rounded-2xl border text-left cursor-pointer transition-all block ${
                      selectedTemplate?.id === tmpl.id
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <p className="font-bold text-xs text-gray-100">{tmpl.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-1">Category: <strong className="text-gray-300">{tmpl.category}</strong></p>
                    <div className="flex items-center gap-1.5 font-mono text-[8px] text-gray-500 mt-2 flex-wrap">
                      {tmpl.variables?.map((v: string) => (
                        <span key={v} className="bg-black/30 px-1 py-0.2 rounded border border-white/5 text-indigo-400 font-bold">{"{{" + v + "}}"}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Template Editor stage */}
              <div className="lg:col-span-2">
                {selectedTemplate ? (
                  <div className="glass p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3 shrink-0">
                      <div>
                        <h4 className="font-extrabold text-white">Edit Template: {selectedTemplate.name}</h4>
                        <p className="text-[10px] text-gray-400">Modify mail titles or body copy templates securely.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 font-bold rounded-lg cursor-pointer text-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveTemplate}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 block font-mono text-[10px]">Email Subject header template *</label>
                      <input
                        type="text"
                        required
                        value={templateSubject}
                        onChange={(e) => setTemplateSubject(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 block font-mono text-[10px]">Body layout template (Markdown compliant) *</label>
                      <textarea
                        required
                        value={templateBody}
                        onChange={(e) => setTemplateBody(e.target.value)}
                        className="w-full h-80 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-relaxed"
                      />
                    </div>

                    <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1 text-[10px] leading-relaxed">
                      <span className="font-bold text-indigo-400">Guideline:</span>
                      <p className="text-gray-400">
                        Always preserve variables inside double curly brackets like <code className="text-indigo-400 font-bold">{"{{userName}}"}</code>. If omitted, matching properties will fail to interpolate into dispatched SMTP outputs.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-20 text-center text-xs text-gray-500 italic bg-[#08080c] rounded-2xl border border-dashed border-white/5">
                    Select a seeded transactional email template from the catalog rail on the left side to load the content editor.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
