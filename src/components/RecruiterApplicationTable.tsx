import {
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Link,
  List,
  Mail,
  Map,
  MessageSquare,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Users,
  XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { db, auth } from "../firebase";
import { 
  collection, getDocs, doc, setDoc, updateDoc, 
  query, where, addDoc 
} from "firebase/firestore";
import { NotificationService } from "../services/notificationService";
import OfferReleaseModal from "./OfferReleaseModal";
import RejectionReasonModal from "./RejectionReasonModal";

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  status: "Applied" | "Screening" | "Shortlisted" | "Interview Scheduled" | "Interview Completed" | "HR Round" | "Final Round" | "Selected" | "Offer" | "Joined" | "Rejected";
  appliedAt: string;
  updatedAt?: string;
  resumeUrl?: string;
  resumeScore?: number;
  interviewScore?: number;
  aiMatchReasoning?: string;
  notesCount?: number;
  recruiterId?: string;
}

export interface RecruiterApplicationTableProps {
  recruiterId?: string;
  recruiterName?: string;
  jobId?: string;
  onRefresh?: () => void;
  className?: string;
}

export default function RecruiterApplicationTable({
  recruiterId,
  recruiterName,
  jobId,
  onRefresh,
  className = ""
}: RecruiterApplicationTableProps) {
  const currentUserId = recruiterId || auth.currentUser?.uid || "recruiter_default";
  const currentUserName = recruiterName || auth.currentUser?.displayName || "Recruiter Desk";

  // Data state
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [jobFilter, setJobFilter] = useState<string>(jobId || "ALL");
  const [sortBy, setSortBy] = useState<"appliedAt" | "resumeScore" | "candidateName">("appliedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection for bulk actions
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);

  // Drawer / Modals state
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [appToSchedule, setAppToSchedule] = useState<ApplicationRecord | null>(null);

  // Offer & Rejection Modals state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [appToOffer, setAppToOffer] = useState<ApplicationRecord | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [appToReject, setAppToReject] = useState<ApplicationRecord | null>(null);

  // Interview Schedule Form State
  const [interviewForm, setInterviewForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "10:00",
    duration: "45 mins",
    type: "Technical Interview" as "Technical Interview" | "HR Screening" | "AI Evaluation" | "Executive Round",
    location: "Google Meet",
    meetingUrl: "https://meet.google.com/aijobs-recruiter-session",
    interviewerName: currentUserName,
    notes: "Please bring your recent project architecture portfolio and be prepared for live coding discussion."
  });
  const [isScheduling, setIsScheduling] = useState(false);

  // Quick Notes modal in detail drawer
  const [recruiterNote, setRecruiterNote] = useState("");
  const [notesList, setNotesList] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch applications from Firestore
  const fetchApplications = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const appsList: ApplicationRecord[] = [];

      // 1. Fetch from 'applications' primary collection
      try {
        const appsSnap = await getDocs(collection(db, "applications"));
        appsSnap.forEach((d) => {
          const data = d.data();
          appsList.push({
            id: d.id,
            jobId: data.jobId || "job_unk",
            jobTitle: data.jobTitle || "Job Position",
            companyName: data.companyName || "Company Partner",
            candidateId: data.candidateId || "cand_unk",
            candidateName: data.candidateName || "Candidate",
            candidateEmail: data.candidateEmail || data.email,
            candidatePhone: data.candidatePhone || data.phone,
            status: data.status || "Applied",
            appliedAt: data.appliedAt || data.createdAt || new Date().toISOString(),
            resumeUrl: data.resumeUrl || data.resumeFileName,
            resumeScore: data.resumeScore || 75,
            interviewScore: data.interviewScore || 0,
            recruiterId: data.recruiterId || data.employerId
          });
        });
      } catch (err: any) {
        console.warn("RecruiterApplicationTable: Primary applications fetch warning:", err.message);
      }

      // 2. Fetch from 'company_applications' if additional records exist
      try {
        const compAppsSnap = await getDocs(collection(db, "company_applications"));
        compAppsSnap.forEach((d) => {
          if (!appsList.some(a => a.id === d.id)) {
            const data = d.data();
            appsList.push({
              id: d.id,
              jobId: data.jobId || "job_unk",
              jobTitle: data.jobTitle || "Job Position",
              companyName: data.companyName || "Company Partner",
              candidateId: data.candidateId || "cand_unk",
              candidateName: data.candidateName || "Candidate Name",
              candidateEmail: data.candidateEmail,
              candidatePhone: data.candidatePhone,
              status: data.status || "Applied",
              appliedAt: data.appliedAt || new Date().toISOString(),
              resumeUrl: data.resumeUrl,
              resumeScore: data.resumeScore || 70,
              interviewScore: data.interviewScore || 0,
              recruiterId: data.recruiterId || data.companyId
            });
          }
        });
      } catch (err: any) {
        console.warn("RecruiterApplicationTable: Company applications fetch warning:", err.message);
      }

      // Fallback mock data if Firestore has no records yet
      if (appsList.length === 0) {
        const mockRecords: ApplicationRecord[] = [
          {
            id: "app_demo_101",
            jobId: "job_dev_01",
            jobTitle: "Senior AI Full Stack Engineer",
            companyName: "Nexus Labs Global",
            candidateId: "cand_priya_01",
            candidateName: "Priya Sharma",
            candidateEmail: "priya.sharma@techcorp.io",
            candidatePhone: "+91 98765 43210",
            status: "Applied",
            appliedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            resumeScore: 92,
            interviewScore: 88,
            aiMatchReasoning: "Strong match in React 18, TypeScript, and Generative AI SDKs with 5+ years building full-stack platforms."
          },
          {
            id: "app_demo_102",
            jobId: "job_dev_01",
            jobTitle: "Senior AI Full Stack Engineer",
            companyName: "Nexus Labs Global",
            candidateId: "cand_arjun_02",
            candidateName: "Arjun Verma",
            candidateEmail: "arjun.v@solutia.com",
            candidatePhone: "+91 98123 88776",
            status: "Shortlisted",
            appliedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
            resumeScore: 86,
            interviewScore: 78,
            aiMatchReasoning: "Solid experience in Node.js microservices and Cloud Run deployment pipelines."
          },
          {
            id: "app_demo_103",
            jobId: "job_lead_02",
            jobTitle: "Lead DevOps & Cloud Architect",
            companyName: "Nexus Labs Global",
            candidateId: "cand_rohan_03",
            candidateName: "Rohan Mehta",
            candidateEmail: "rohan.mehta@cloudlabs.net",
            candidatePhone: "+91 99001 12233",
            status: "Interview Scheduled",
            appliedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
            resumeScore: 94,
            interviewScore: 91,
            aiMatchReasoning: "Expertise in Terraform, Kubernetes, and GCP Security Architecture."
          },
          {
            id: "app_demo_104",
            jobId: "job_dev_01",
            jobTitle: "Senior AI Full Stack Engineer",
            companyName: "Nexus Labs Global",
            candidateId: "cand_sneha_04",
            candidateName: "Sneha Reddy",
            candidateEmail: "sneha.reddy@innovate.co",
            candidatePhone: "+91 97788 55443",
            status: "Rejected",
            appliedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
            resumeScore: 62,
            interviewScore: 55,
            aiMatchReasoning: "Missing required TypeScript full-stack experience and vector database knowledge."
          }
        ];
        setApplications(mockRecords);
      } else {
        setApplications(appsList);
      }
    } catch (err: any) {
      console.error("Error loading recruiter applications:", err);
      setError("Failed to load applicants. Please verify Firestore connectivity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [recruiterId, jobId]);

  // Derived Jobs options for filter dropdown
  const uniqueJobs = useMemo(() => {
    const map = new Map<string, string>();
    applications.forEach(a => {
      if (a.jobId && a.jobTitle) {
        map.set(a.jobId, a.jobTitle);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  // Filtered & Sorted applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      // Filter by specific job if passed as prop or dropdown
      if (jobId && app.jobId !== jobId) return false;
      if (jobFilter !== "ALL" && app.jobId !== jobFilter) return false;

      // Filter by status
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.candidateName.toLowerCase().includes(q);
        const matchTitle = app.jobTitle.toLowerCase().includes(q);
        const matchEmail = (app.candidateEmail || "").toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchEmail) return false;
      }

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === "appliedAt") {
        valA = new Date(a.appliedAt).getTime();
        valB = new Date(b.appliedAt).getTime();
      } else if (sortBy === "resumeScore") {
        valA = a.resumeScore || 0;
        valB = b.resumeScore || 0;
      } else if (sortBy === "candidateName") {
        valA = a.candidateName.toLowerCase();
        valB = b.candidateName.toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [applications, jobId, jobFilter, statusFilter, searchQuery, sortBy, sortOrder]);

  // Action: Single Application Status Update (Shortlist / Reject)
  const handleUpdateStatus = async (app: ApplicationRecord, newStatus: ApplicationRecord["status"]) => {
    if (newStatus === "Offer" || newStatus === "Selected") {
      setAppToOffer(app);
      setShowOfferModal(true);
      return;
    }
    if (newStatus === "Rejected") {
      setAppToReject(app);
      setShowRejectModal(true);
      return;
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Send Notification to candidate FIRST (always create notification before update)
      try {
        await NotificationService.createNotification({
          userId: app.candidateId,
          type: newStatus === "Shortlisted" ? "shortlist" : newStatus === "Rejected" ? "rejection" : "application_update",
          title: `Application Update: ${app.jobTitle}`,
          message: `Your application for "${app.jobTitle}" at ${app.companyName} has been updated to "${newStatus}".`,
          link: "/candidate/dashboard",
          read: false,
          createdAt: nowIso
        });
      } catch (nErr) {
        console.warn("Notification dispatch notice:", nErr);
      }

      // 2. Update in 'applications'
      try {
        await updateDoc(doc(db, "applications", app.id), {
          status: newStatus,
          updatedAt: nowIso
        });
      } catch (e) {
        await setDoc(doc(db, "applications", app.id), {
          ...app,
          status: newStatus,
          updatedAt: nowIso
        }, { merge: true });
      }

      // 3. Update in 'company_applications'
      try {
        await updateDoc(doc(db, "company_applications", app.id), {
          status: newStatus,
          updatedAt: nowIso
        });
      } catch (e) {
        // non-blocking
      }

      // 4. Update matching lead in 'leads'
      try {
        const leadsSnap = await getDocs(
          query(
            collection(db, "leads"),
            where("jobId", "==", app.jobId),
            where("candidateId", "==", app.candidateId)
          )
        );
        leadsSnap.forEach(async (lDoc) => {
          await updateDoc(doc(db, "leads", lDoc.id), {
            currentStatus: newStatus,
            updatedAt: nowIso
          });
        });
      } catch (e) {
        // non-blocking
      }

      // Update local state
      setApplications(prev =>
        prev.map(item => item.id === app.id ? { ...item, status: newStatus, updatedAt: nowIso } : item)
      );

      if (selectedApp?.id === app.id) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus, updatedAt: nowIso } : null);
      }

      showToast(`Candidate ${app.candidateName} status updated to "${newStatus}".`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Status update error:", err);
      showToast("Failed to update status. Please try again.", "error");
    }
  };

  // Action: Open Schedule Interview Modal
  const handleOpenSchedule = (app: ApplicationRecord) => {
    setAppToSchedule(app);
    setShowScheduleModal(true);
  };

  // Action: Submit Interview Schedule
  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appToSchedule) return;

    setIsScheduling(true);
    try {
      const interviewId = `int_${Math.random().toString(36).substring(2, 11)}`;
      const scheduledDateTime = `${interviewForm.date}T${interviewForm.time}:00`;
      const nowIso = new Date().toISOString();

      const interviewRecord = {
        id: interviewId,
        jobId: appToSchedule.jobId,
        jobTitle: appToSchedule.jobTitle,
        candidateId: appToSchedule.candidateId,
        candidateName: appToSchedule.candidateName,
        candidateEmail: appToSchedule.candidateEmail || "candidate@aijobs.global",
        companyName: appToSchedule.companyName,
        recruiterName: interviewForm.interviewerName,
        scheduledAt: scheduledDateTime,
        duration: interviewForm.duration,
        type: interviewForm.type,
        location: interviewForm.location,
        meetingUrl: interviewForm.meetingUrl,
        notes: interviewForm.notes,
        status: "Scheduled",
        createdAt: nowIso
      };

      // Save to company_interviews & interviews collections
      await setDoc(doc(db, "company_interviews", interviewId), interviewRecord);
      await setDoc(doc(db, "interviews", interviewId), interviewRecord);

      // Update application status to 'Interview Scheduled'
      await handleUpdateStatus(appToSchedule, "Interview Scheduled");

      // Attempt SMS Dispatch via Twilio API endpoint
      if (appToSchedule.candidatePhone) {
        fetch("/api/twilio/interview-scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidatePhone: appToSchedule.candidatePhone,
            candidateName: appToSchedule.candidateName,
            jobTitle: appToSchedule.jobTitle,
            companyName: appToSchedule.companyName,
            interviewDate: `${interviewForm.date} at ${interviewForm.time}`,
            meetingUrl: interviewForm.meetingUrl
          })
        }).catch(err => console.warn("SMS trigger notice:", err));
      }

      setShowScheduleModal(false);
      setAppToSchedule(null);
      showToast(`Interview successfully scheduled with ${appToSchedule.candidateName}!`);
    } catch (err: any) {
      console.error("Error scheduling interview:", err);
      showToast("Failed to schedule interview. Please try again.", "error");
    } finally {
      setIsScheduling(false);
    }
  };

  // Fetch candidate recruiter notes
  const fetchNotes = async (appId: string) => {
    setLoadingNotes(true);
    try {
      const snap = await getDocs(collection(db, "company_applications", appId, "notes"));
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setNotesList(list);
    } catch (e) {
      console.warn("Notes fetch warning:", e);
      setNotesList([]);
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAddRecruiterNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !recruiterNote.trim()) return;

    try {
      const noteObj = {
        text: recruiterNote.trim(),
        authorName: currentUserName,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(
        collection(db, "company_applications", selectedApp.id, "notes"),
        noteObj
      );

      setNotesList(prev => [...prev, { id: docRef.id, ...noteObj }]);
      setRecruiterNote("");
      showToast("Recruiter note added successfully.");
    } catch (e) {
      showToast("Failed to add note.", "error");
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedAppIds.length === filteredApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(filteredApps.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedAppIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (newStatus: ApplicationRecord["status"]) => {
    if (selectedAppIds.length === 0) return;
    const targetApps = applications.filter(a => selectedAppIds.includes(a.id));
    
    for (const app of targetApps) {
      await handleUpdateStatus(app, newStatus);
    }

    setSelectedAppIds([]);
    showToast(`Updated ${targetApps.length} applicants to "${newStatus}".`);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ["Application ID", "Candidate Name", "Email", "Phone", "Job Title", "Company", "Status", "Resume Score", "Applied At"];
    const rows = filteredApps.map(a => [
      a.id,
      `"${a.candidateName}"`,
      `"${a.candidateEmail || ""}"`,
      `"${a.candidatePhone || ""}"`,
      `"${a.jobTitle}"`,
      `"${a.companyName}"`,
      a.status,
      a.resumeScore || 0,
      a.appliedAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Recruiter_Applicants_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showToast = (msg: string, _type: "success" | "error" = "success") => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Status Badge Helper
  const getStatusBadge = (status: ApplicationRecord["status"]) => {
    switch (status) {
      case "Shortlisted":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" /> Shortlisted
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case "Interview Scheduled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-3.5 h-3.5" /> Interview Scheduled
          </span>
        );
      case "Offer":
      case "Joined":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <UserCheck className="w-3.5 h-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div id="recruiter-application-table-root" className={`space-y-6 ${className}`}>
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-medium flex items-center justify-between shadow-xl backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0f] border border-white/10 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Recruiter Applicant Workspace</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Manage candidates across your assigned job vacancies. Shortlist talent, issue rejections, or schedule live interviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchApplications(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Sync latest applicants from Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync List"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredApps.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV ({filteredApps.length})</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by candidate name, email, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all"
          />
        </div>

        {/* Job Filter */}
        <div className="relative">
          <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="ALL">All Assigned Jobs ({uniqueJobs.length})</option>
            {uniqueJobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="ALL">All Application Stages</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="HR Round">HR Round</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort By */}
        <div className="relative">
          <ArrowUpDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-") as [any, any];
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="appliedAt-desc">Applied Date (Newest First)</option>
            <option value="appliedAt-asc">Applied Date (Oldest First)</option>
            <option value="resumeScore-desc">Resume Score (Highest First)</option>
            <option value="candidateName-asc">Candidate Name (A-Z)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedAppIds.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-xl flex items-center justify-between text-xs text-indigo-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">{selectedAppIds.length} candidate(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus("Shortlisted")}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Batch Shortlist
            </button>
            <button
              onClick={() => handleBulkStatus("Rejected")}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Batch Reject
            </button>
            <button
              onClick={() => setSelectedAppIds([])}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Applicants Table */}
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-xs text-gray-400 font-mono">Loading recruiter applicants from database...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">No applicants found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              No applicant records match your current filters or search query. Try broadening your criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedAppIds.length === filteredApps.length && filteredApps.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-black/40 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Candidate</th>
                  <th className="p-3.5">Job Vacancy</th>
                  <th className="p-3.5">Match Score</th>
                  <th className="p-3.5">Current Stage</th>
                  <th className="p-3.5">Applied Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredApps.map((app) => {
                  const isSelected = selectedAppIds.includes(app.id);

                  return (
                    <tr 
                      key={app.id} 
                      className={`hover:bg-white/[0.02] transition-colors ${isSelected ? "bg-indigo-500/5" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          className="rounded bg-black/40 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Candidate info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow">
                            {app.candidateName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                fetchNotes(app.id);
                              }}
                              className="font-bold text-white hover:text-indigo-400 transition-colors text-left cursor-pointer flex items-center gap-1"
                            >
                              <span>{app.candidateName}</span>
                              <Eye className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100" />
                            </button>
                            <span className="text-[10px] text-gray-400 block font-mono">{app.candidateEmail || "No email"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="p-3.5">
                        <span className="font-medium text-gray-200 block truncate max-w-[200px]" title={app.jobTitle}>
                          {app.jobTitle}
                        </span>
                        <span className="text-[10px] text-gray-400">{app.companyName}</span>
                      </td>

                      {/* Match Score */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (app.resumeScore || 0) >= 80 ? "bg-emerald-400" : (app.resumeScore || 0) >= 60 ? "bg-amber-400" : "bg-rose-400"
                              }`}
                              style={{ width: `${Math.min(100, app.resumeScore || 0)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-gray-200">{app.resumeScore || 0}%</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        {getStatusBadge(app.status)}
                      </td>

                      {/* Applied Date */}
                      <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                        {new Date(app.appliedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Shortlist Button */}
                          <button
                            onClick={() => handleUpdateStatus(app, "Shortlisted")}
                            disabled={app.status === "Shortlisted"}
                            title="Shortlist Candidate"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              app.status === "Shortlisted"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 cursor-default"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Schedule Interview Button */}
                          <button
                            onClick={() => handleOpenSchedule(app)}
                            title="Schedule Interview"
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-all cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Reject Button */}
                          <button
                            onClick={() => handleUpdateStatus(app, "Rejected")}
                            disabled={app.status === "Rejected"}
                            title="Reject Applicant"
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              app.status === "Rejected"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 cursor-default"
                                : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* View Details */}
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              fetchNotes(app.id);
                            }}
                            title="Inspect Profile & Notes"
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Interview Modal */}
      <AnimatePresence>
        {showScheduleModal && appToSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f0f17] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Schedule Interview</h3>
                    <p className="text-xs text-gray-400">Target candidate: {appToSchedule.candidateName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmSchedule} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Interview Date</label>
                    <input
                      type="date"
                      required
                      value={interviewForm.date}
                      onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                      className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Start Time</label>
                    <input
                      type="time"
                      required
                      value={interviewForm.time}
                      onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })}
                      className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Interview Round Type</label>
                    <select
                      value={interviewForm.type}
                      onChange={(e) => setInterviewForm({ ...interviewForm, type: e.target.value as any })}
                      className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Technical Interview">Technical Interview</option>
                      <option value="HR Screening">HR Screening</option>
                      <option value="AI Evaluation">AI Evaluation</option>
                      <option value="Executive Round">Executive Round</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Duration</label>
                    <select
                      value={interviewForm.duration}
                      onChange={(e) => setInterviewForm({ ...interviewForm, duration: e.target.value })}
                      className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    >
                      <option value="30 mins">30 minutes</option>
                      <option value="45 mins">45 minutes</option>
                      <option value="60 mins">60 minutes</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Meeting Link or Office Location</label>
                  <input
                    type="text"
                    required
                    value={interviewForm.meetingUrl}
                    onChange={(e) => setInterviewForm({ ...interviewForm, meetingUrl: e.target.value })}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    placeholder="https://meet.google.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Notes for Candidate</label>
                  <textarea
                    rows={3}
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isScheduling}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isScheduling ? "Dispatching Invite..." : "Confirm & Send Invite"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Profile Drawer */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-[#0c0c14] border-l border-white/10 h-full overflow-y-auto p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {selectedApp.candidateName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedApp.candidateName}</h3>
                    <p className="text-xs text-gray-400">{selectedApp.jobTitle}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Status and Action bar */}
              <div className="bg-[#050508] border border-white/10 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Current Hiring Stage:</span>
                  {getStatusBadge(selectedApp.status)}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Shortlisted")}
                    className="py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Shortlist
                  </button>
                  <button
                    onClick={() => handleOpenSchedule(selectedApp)}
                    className="py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule Interview
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Interview Completed")}
                    className="py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> Interview Done
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Selected")}
                    className="py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Select Candidate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Offer")}
                    className="py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Release Offer
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Joined")}
                    className="py-2 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Mark Joined
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedApp, "Rejected")}
                    className="col-span-2 sm:col-span-1 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</h4>
                <div className="bg-[#050508] border border-white/10 rounded-xl p-3.5 space-y-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedApp.candidateEmail || "Not specified"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedApp.candidatePhone || "Not specified"}</span>
                  </div>
                  {selectedApp.resumeUrl && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <a
                        href={selectedApp.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>View Candidate Resume</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Match Reasoning */}
              {selectedApp.aiMatchReasoning && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Resume Match Analysis ({selectedApp.resumeScore}%)</span>
                  </div>
                  <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-200 leading-relaxed">
                    {selectedApp.aiMatchReasoning}
                  </div>
                </div>
              )}

              {/* Recruiter Collaboration Notes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Recruiter Notes ({notesList.length})</span>
                </h4>

                <form onSubmit={handleAddRecruiterNote} className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Add internal evaluation note or interview feedback..."
                    value={recruiterNote}
                    onChange={(e) => setRecruiterNote(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 focus:border-indigo-500 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!recruiterNote.trim()}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-40"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadingNotes ? (
                    <p className="text-xs text-gray-500 font-mono">Loading notes...</p>
                  ) : notesList.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No notes logged for this applicant yet.</p>
                  ) : (
                    notesList.map((n) => (
                      <div key={n.id} className="bg-[#050508] border border-white/10 rounded-xl p-3 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span className="font-bold text-gray-300">{n.authorName}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-300 leading-relaxed">{n.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offer Release Modal */}
      <OfferReleaseModal
        isOpen={showOfferModal}
        onClose={() => {
          setShowOfferModal(false);
          setAppToOffer(null);
        }}
        application={appToOffer}
        recruiterName={currentUserName}
        onSuccess={() => {
          fetchApplications(true);
          showToast("Offer letter generated and released to candidate.");
        }}
      />

      {/* Rejection Feedback Modal */}
      <RejectionReasonModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setAppToReject(null);
        }}
        application={appToReject}
        onSuccess={() => {
          fetchApplications(true);
          showToast("Rejection reason saved and notification sent.");
        }}
      />
    </div>
  );
}
