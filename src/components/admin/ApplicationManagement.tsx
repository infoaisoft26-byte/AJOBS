import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, updateDoc } from "firebase/firestore";
import { 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download, 
  ExternalLink, 
  Eye, 
  FileText, 
  Filter, 
  Mail, 
  MapPin, 
  Phone, 
  Plus, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  User, 
  UserCheck, 
  Users, 
  Video, 
  X, 
  XCircle 
} from "lucide-react";
import { auth, db } from "../../firebase";
import { 
  assignRecruiterToApplication, 
  scheduleApplicationInterview, 
  updateApplicationStatus, 
  ApplicationPipelineStatus 
} from "../../services/applicationService";

export interface AdminApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  candidateLocation?: string;
  candidateExperience?: string;
  candidateSkills?: string[];
  resumeUrl?: string;
  resumeScore?: number;
  source?: string;
  assignedRecruiterId?: string | null;
  assignedRecruiterName?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  status: string;
  appliedAt: string;
  updatedAt?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewMode?: string;
  interviewLocation?: string;
  meetingLink?: string;
  interviewerName?: string;
  interviewNotes?: string;
}

export interface RecruiterOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

const normalizeApplication = (id: string, data: any): AdminApplicationRecord => ({
  id,
  jobId: String(data.jobId || ""),
  jobTitle: String(data.jobTitle || "Job not provided"),
  companyName: String(data.companyName || data.company || "Company not provided"),
  candidateId: String(data.candidateId || data.userId || ""),
  candidateName: String(data.candidateName || data.name || "Candidate"),
  candidateEmail: String(data.candidateEmail || data.email || ""),
  candidatePhone: String(data.candidatePhone || data.phone || data.mobile || data.mobileNumber || ""),
  candidateLocation: String(data.candidateLocation || data.location || ""),
  candidateExperience: String(data.candidateExperience || data.experience || ""),
  candidateSkills: (Array.isArray(data.candidateSkills) ? data.candidateSkills : Array.isArray(data.skills) ? data.skills : []).filter((v: any) => typeof v === "string"),
  resumeUrl: String(data.resumeUrl || data.resumeFileName || ""),
  resumeScore: Number(data.resumeScore || 0), source: String(data.source || "AIJobs"),
  assignedRecruiterId: data.assignedRecruiterId || null, assignedRecruiterName: data.assignedRecruiterName || null,
  assignedAt: data.assignedAt || null, assignedBy: data.assignedBy || null,
  status: String(data.status || "applied"),
  appliedAt: data.appliedAt?.toDate?.().toISOString?.() || String(data.appliedAt || data.createdAt || ""),
  updatedAt: data.updatedAt, interviewDate: data.interviewDate, interviewTime: data.interviewTime,
  interviewMode: data.interviewMode, interviewLocation: data.interviewLocation,
  meetingLink: data.meetingLink, interviewerName: data.interviewerName, interviewNotes: data.interviewNotes
});

export default function ApplicationManagement({
  onRefresh
}: {
  onRefresh?: () => void;
}) {
  const [applications, setApplications] = useState<AdminApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [recruiterFilter, setRecruiterFilter] = useState("ALL");
  
  // Available Recruiters
  const [recruiters, setRecruiters] = useState<RecruiterOption[]>([]);

  // Modals state
  const [selectedAppForProfile, setSelectedAppForProfile] = useState<AdminApplicationRecord | null>(null);
  const [selectedCandidateFullProfile, setSelectedCandidateFullProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [selectedAppForAssign, setSelectedAppForAssign] = useState<AdminApplicationRecord | null>(null);
  const [chosenRecruiterId, setChosenRecruiterId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [selectedAppForInterview, setSelectedAppForInterview] = useState<AdminApplicationRecord | null>(null);
  const [interviewForm, setInterviewForm] = useState({
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "11:00",
    mode: "Online / Google Meet",
    location: "Google Meet",
    meetingLink: "https://meet.google.com/aijobs-interview",
    interviewerName: "Lead Hiring Manager",
    notes: "Candidate evaluated via AIJobs pipeline. Focus on core technical and architectural capabilities."
  });
  const [isScheduling, setIsScheduling] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch applications and recruiters
  const fetchAllData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch Recruiters
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const recList: RecruiterOption[] = [];
        usersSnap.forEach((d) => {
          const u = d.data();
          if (["recruiter", "employer", "corporate", "consultancy", "admin", "superadmin"].includes(u.role)) {
            recList.push({
              id: d.id,
              name: u.name || u.displayName || u.companyName || u.email || "Recruiter",
              email: u.email || "",
              role: u.role
            });
          }
        });
        setRecruiters(recList);
      } catch (recErr) {
        console.warn("Recruiters fetch warning:", recErr);
      }

      // 2. Fetch primary 'applications' collection
      const list: AdminApplicationRecord[] = [];
      try {
        const appsSnap = await getDocs(collection(db, "applications"));
        appsSnap.forEach((d) => {
          const data = d.data();
          list.push(normalizeApplication(d.id, data));
        });
      } catch (err) {
        console.warn("Admin Applications fetch warning:", err);
      }

      // Sort applications by appliedAt descending
      list.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      setApplications(list);
    } catch (err) {
      console.error("Error loading admin applications:", err);
      showToast("Failed to load applications.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const unsubscribe = onSnapshot(collection(db, "applications"), snapshot => {
      const live = snapshot.docs.map(d => normalizeApplication(d.id, d.data()));
      live.sort((a, b) => new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime());
      setApplications(live);
      setLoading(false);
      onRefresh?.();
    }, error => console.warn("Admin realtime applications listener:", error));
    return unsubscribe;
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter(a => (a.status || "").toLowerCase().includes("shortlist")).length;
    const interviewing = applications.filter(a => (a.status || "").toLowerCase().includes("interview")).length;
    const hired = applications.filter(a => (a.status || "").toLowerCase().includes("offer") || (a.status || "").toLowerCase().includes("join") || (a.status || "").toLowerCase().includes("select")).length;
    const rejected = applications.filter(a => (a.status || "").toLowerCase().includes("reject")).length;

    return { total, shortlisted, interviewing, hired, rejected };
  }, [applications]);

  // Unique Companies
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => { if (a.companyName) set.add(a.companyName); });
    return Array.from(set);
  }, [applications]);

  // Filtered Applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const s = (app.status || "").toLowerCase();
      if (statusFilter !== "ALL") {
        const filterVal = statusFilter.toLowerCase();
        if (filterVal === "shortlisted" && !s.includes("shortlist")) return false;
        if (filterVal === "interview" && !s.includes("interview")) return false;
        if (filterVal === "selected" && !s.includes("select") && !s.includes("offer") && !s.includes("join")) return false;
        if (filterVal === "rejected" && !s.includes("reject")) return false;
        if (filterVal === "applied" && (s.includes("shortlist") || s.includes("interview") || s.includes("reject") || s.includes("offer") || s.includes("select"))) return false;
      }

      if (companyFilter !== "ALL" && app.companyName !== companyFilter) return false;

      if (recruiterFilter === "ASSIGNED" && !app.assignedRecruiterId) return false;
      if (recruiterFilter === "UNASSIGNED" && app.assignedRecruiterId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = String(app.candidateName || "").toLowerCase().includes(q);
        const mTitle = String(app.jobTitle || "").toLowerCase().includes(q);
        const mComp = String(app.companyName || "").toLowerCase().includes(q);
        const mEmail = (app.candidateEmail || "").toLowerCase().includes(q);
        const mRecruiter = (app.assignedRecruiterName || "").toLowerCase().includes(q);
        const mSkills = (app.candidateSkills || []).some(k => String(k || "").toLowerCase().includes(q));
        if (!mName && !mTitle && !mComp && !mEmail && !mRecruiter && !mSkills) return false;
      }
      return true;
    });
  }, [applications, statusFilter, companyFilter, recruiterFilter, searchQuery]);

  // View Candidate Full Profile Handler
  const handleOpenProfileModal = async (app: AdminApplicationRecord) => {
    setSelectedAppForProfile(app);
    setLoadingProfile(true);
    try {
      const candSnap = await getDoc(doc(db, "candidates", app.candidateId));
      if (candSnap.exists()) {
        setSelectedCandidateFullProfile(candSnap.data());
      } else {
        const userSnap = await getDoc(doc(db, "users", app.candidateId));
        if (userSnap.exists()) {
          setSelectedCandidateFullProfile(userSnap.data());
        } else {
          setSelectedCandidateFullProfile(null);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch extended candidate profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  // 1-Click Shortlist
  const handleShortlist = async (app: AdminApplicationRecord) => {
    try {
      const res = await updateApplicationStatus(app.id, "shortlisted", {
        actorId: auth.currentUser?.uid || "admin",
        actorName: auth.currentUser?.displayName || "Admin",
        actorRole: "admin",
        remarks: "Candidate shortlisted by Admin."
      });
      if (res.success) {
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "shortlisted" } : a));
        showToast(`Shortlisted ${app.candidateName} for ${app.jobTitle}!`);
        if (onRefresh) onRefresh();
      } else {
        showToast(res.message, "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to shortlist candidate.", "error");
    }
  };

  // 1-Click Reject
  const handleReject = async (app: AdminApplicationRecord) => {
    if (!window.confirm(`Are you sure you want to reject ${app.candidateName}'s application for ${app.jobTitle}?`)) return;
    try {
      const res = await updateApplicationStatus(app.id, "rejected", {
        actorId: auth.currentUser?.uid || "admin",
        actorName: auth.currentUser?.displayName || "Admin",
        actorRole: "admin",
        remarks: "Application rejected by Admin."
      });
      if (res.success) {
        setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "rejected" } : a));
        showToast(`Application marked as rejected.`);
        if (onRefresh) onRefresh();
      } else {
        showToast(res.message, "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to update status.", "error");
    }
  };

  // Submit Recruiter Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForAssign || !chosenRecruiterId) return;

    const chosenRecruiter = recruiters.find(r => r.id === chosenRecruiterId);
    const recName = chosenRecruiter?.name || "Assigned Recruiter";

    setIsAssigning(true);
    try {
      const res = await assignRecruiterToApplication(
        selectedAppForAssign.id,
        chosenRecruiterId,
        recName,
        auth.currentUser?.displayName || "Admin"
      );

      if (res.success) {
        setApplications(prev => prev.map(a => 
          a.id === selectedAppForAssign.id 
            ? { 
                ...a, 
                assignedRecruiterId: chosenRecruiterId, 
                assignedRecruiterName: recName, 
                assignedAt: new Date().toISOString(),
                assignedBy: "Admin" 
              } 
            : a
        ));
        showToast(`Assigned ${selectedAppForAssign.candidateName} to ${recName}!`);
        setSelectedAppForAssign(null);
        setChosenRecruiterId("");
        if (onRefresh) onRefresh();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to assign recruiter.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // Submit Interview Scheduling
  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForInterview) return;

    setIsScheduling(true);
    try {
      const res = await scheduleApplicationInterview(
        selectedAppForInterview.id,
        {
          interviewDate: interviewForm.date,
          interviewTime: interviewForm.time,
          interviewMode: interviewForm.mode,
          interviewLocation: interviewForm.location,
          meetingLink: interviewForm.meetingLink,
          interviewerName: interviewForm.interviewerName,
          notes: interviewForm.notes
        },
        auth.currentUser?.displayName || "Admin"
      );

      if (res.success) {
        setApplications(prev => prev.map(a => 
          a.id === selectedAppForInterview.id 
            ? { 
                ...a, 
                status: "interview",
                interviewDate: interviewForm.date,
                interviewTime: interviewForm.time,
                interviewMode: interviewForm.mode,
                interviewLocation: interviewForm.location,
                meetingLink: interviewForm.meetingLink,
                interviewerName: interviewForm.interviewerName
              } 
            : a
        ));
        showToast(`Interview scheduled for ${selectedAppForInterview.candidateName}!`);
        setSelectedAppForInterview(null);
        if (onRefresh) onRefresh();
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to schedule interview.", "error");
    } finally {
      setIsScheduling(false);
    }
  };

  // Delete Application (Admin power action)
  const handleDeleteApplication = async (appId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application record from the database?")) return;

    try {
      await deleteDoc(doc(db, "applications", appId)).catch(() => {});
      await deleteDoc(doc(db, "company_applications", appId)).catch(() => {});
      setApplications(prev => prev.filter(a => a.id !== appId));
      showToast("Application record deleted.");
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast("Failed to delete application record.", "error");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "App ID", "Candidate Name", "Email", "Mobile", "Location", 
      "Experience", "Skills", "Job Title", "Company", "Source", 
      "Assigned Recruiter", "Status", "Applied At"
    ];
    const rows = filteredApps.map(a => [
      a.id,
      `"${a.candidateName}"`,
      `"${a.candidateEmail || ""}"`,
      `"${a.candidatePhone || ""}"`,
      `"${a.candidateLocation || ""}"`,
      `"${a.candidateExperience || ""}"`,
      `"${(a.candidateSkills || []).join(", ")}"`,
      `"${a.jobTitle}"`,
      `"${a.companyName}"`,
      `"${a.source || "AIJobs"}"`,
      `"${a.assignedRecruiterName || "Unassigned"}"`,
      `"${a.status}"`,
      a.appliedAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `AIJobs_Admin_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="admin-application-pipeline">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
          toastMessage.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200" 
            : "bg-rose-950/90 border-rose-500/40 text-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0a0f] border border-white/10 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Candidate → Admin → Recruiter Pipeline
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Centrally evaluate candidates, inspect resumes, assign authorized recruiters, and schedule interviews with real-time candidate synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync Pipeline"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredApps.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-40 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Total Applications</span>
          <div className="text-xl font-extrabold text-white">{stats.total}</div>
        </div>

        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">Shortlisted</span>
          <div className="text-xl font-extrabold text-emerald-400">{stats.shortlisted}</div>
        </div>

        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider">In Interview</span>
          <div className="text-xl font-extrabold text-indigo-400">{stats.interviewing}</div>
        </div>

        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider">Selected / Offer</span>
          <div className="text-xl font-extrabold text-purple-400">{stats.hired}</div>
        </div>

        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] text-rose-400 font-mono uppercase tracking-wider">Rejected</span>
          <div className="text-xl font-extrabold text-rose-400">{stats.rejected}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate, job, company, skill, recruiter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 outline-none"
          />
        </div>

        <div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Employers ({uniqueCompanies.length})</option>
            {uniqueCompanies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="applied">Applied (Initial)</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview">Interview Scheduled</option>
            <option value="selected">Selected / Offer</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="w-full bg-[#0a0a0f] border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value="ALL">All Recruiter Assignments</option>
            <option value="ASSIGNED">Assigned to Recruiter</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 font-mono">
            Loading real applications pipeline...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            No application records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5">Candidate Details</th>
                  <th className="p-3.5">Contact & Location</th>
                  <th className="p-3.5">Experience & Skills</th>
                  <th className="p-3.5">Applied Job & Company</th>
                  <th className="p-3.5">Resume</th>
                  <th className="p-3.5">Assigned Recruiter</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredApps.map((app) => {
                  const s = (app.status || "").toLowerCase();
                  const isShortlisted = s.includes("shortlist");
                  const isInterview = s.includes("interview");
                  const isRejected = s.includes("reject");
                  const isSelected = s.includes("select") || s.includes("offer") || s.includes("join");

                  return (
                    <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Candidate Name & Source */}
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{app.candidateName}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Source: <strong className="text-gray-400">{app.source || "AIJobs"}</strong>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          Applied: {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Contact & Location */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] text-gray-300">
                          <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="truncate max-w-[150px]">{app.candidateEmail || "No email"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{app.candidatePhone || "No phone"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                          <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{app.candidateLocation || "Remote"}</span>
                        </div>
                      </td>

                      {/* Experience & Skills */}
                      <td className="p-3.5 space-y-1.5">
                        <span className="text-[11px] font-semibold text-gray-200 block">
                          {app.candidateExperience || "Fresher"}
                        </span>
                        {app.candidateSkills && app.candidateSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {app.candidateSkills.slice(0, 3).map((sk, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-300">
                                {sk}
                              </span>
                            ))}
                            {app.candidateSkills.length > 3 && (
                              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-400">
                                +{app.candidateSkills.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-500">General Candidate</span>
                        )}
                      </td>

                      {/* Applied Job & Company */}
                      <td className="p-3.5">
                        <span className="font-semibold text-white block truncate max-w-[170px]">
                          {app.jobTitle}
                        </span>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-gray-500" />
                          <span>{app.companyName}</span>
                        </span>
                      </td>

                      {/* Resume */}
                      <td className="p-3.5">
                        {app.resumeUrl && app.resumeUrl !== "No Resume Attached" ? (
                          <a
                            href={app.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[11px] font-semibold transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Resume</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-500">No Resume</span>
                        )}
                      </td>

                      {/* Assigned Recruiter */}
                      <td className="p-3.5">
                        {app.assignedRecruiterName ? (
                          <div>
                            <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{app.assignedRecruiterName}</span>
                            </span>
                            <span className="text-[10px] text-gray-500 block">
                              {app.assignedAt ? `Assigned ${new Date(app.assignedAt).toLocaleDateString()}` : "Active"}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAppForAssign(app);
                              setChosenRecruiterId(recruiters[0]?.id || "");
                            }}
                            className="px-2 py-1 bg-white/5 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-300 border border-white/10 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            + Assign Recruiter
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isShortlisted ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          isInterview ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          isSelected ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          isRejected ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        }`}>
                          {app.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* View Profile */}
                          <button
                            onClick={() => handleOpenProfileModal(app)}
                            title="View Full Profile"
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Assign Recruiter */}
                          <button
                            onClick={() => {
                              setSelectedAppForAssign(app);
                              setChosenRecruiterId(app.assignedRecruiterId || recruiters[0]?.id || "");
                            }}
                            title="Assign / Reassign Recruiter"
                            className="p-1.5 bg-white/5 hover:bg-indigo-500/20 text-indigo-300 rounded-lg transition-all cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Shortlist */}
                          {!isShortlisted && !isSelected && (
                            <button
                              onClick={() => handleShortlist(app)}
                              title="Shortlist Candidate"
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Shortlist
                            </button>
                          )}

                          {/* Schedule Interview */}
                          <button
                            onClick={() => {
                              setSelectedAppForInterview(app);
                              setInterviewForm(prev => ({
                                ...prev,
                                interviewerName: app.assignedRecruiterName || "Hiring Manager"
                              }));
                            }}
                            title="Schedule Interview"
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            Schedule
                          </button>

                          {/* Reject */}
                          {!isRejected && (
                            <button
                              onClick={() => handleReject(app)}
                              title="Reject Application"
                              className="p-1.5 text-gray-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Application */}
                          <button
                            onClick={() => handleDeleteApplication(app.id)}
                            title="Delete Application"
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL 1: View Candidate Profile */}
      {selectedAppForProfile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f111a] border border-white/15 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setSelectedAppForProfile(null);
                setSelectedCandidateFullProfile(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg">
                {selectedAppForProfile.candidateName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedAppForProfile.candidateName}</h3>
                <p className="text-xs text-gray-400">
                  Applied for <span className="text-indigo-400 font-semibold">{selectedAppForProfile.jobTitle}</span> at {selectedAppForProfile.companyName}
                </p>
              </div>
            </div>

            {loadingProfile ? (
              <div className="py-10 text-center text-xs text-gray-400 font-mono">
                Loading profile details from candidate database...
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Contact & Basics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/5 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Email</span>
                    <p className="font-semibold text-gray-200 truncate">{selectedAppForProfile.candidateEmail || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Phone</span>
                    <p className="font-semibold text-gray-200">{selectedAppForProfile.candidatePhone || "Not provided"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Location</span>
                    <p className="font-semibold text-gray-200">{selectedAppForProfile.candidateLocation || "Remote"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Experience</span>
                    <p className="font-semibold text-gray-200">{selectedAppForProfile.candidateExperience || "Fresher"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Resume Score</span>
                    <p className="font-semibold text-indigo-400">{selectedAppForProfile.resumeScore || 80}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">Source</span>
                    <p className="font-semibold text-gray-200">{selectedAppForProfile.source || "AIJobs"}</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-300 uppercase">Key Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedAppForProfile.candidateSkills || []).length > 0 ? (
                      selectedAppForProfile.candidateSkills?.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No specific skills listed.</span>
                    )}
                  </div>
                </div>

                {/* Extended Profile Summary */}
                {selectedCandidateFullProfile?.summary && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-300 uppercase">Profile Summary</span>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-gray-300 leading-relaxed">
                      {selectedCandidateFullProfile.summary}
                    </div>
                  </div>
                )}

                {/* Action Buttons in Modal */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  {selectedAppForProfile.resumeUrl ? (
                    <a
                      href={selectedAppForProfile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Cloudinary Resume</span>
                    </a>
                  ) : (
                    <span className="text-gray-500">No Resume File</span>
                  )}

                  <button
                    onClick={() => {
                      setSelectedAppForProfile(null);
                      setSelectedAppForAssign(selectedAppForProfile);
                      setChosenRecruiterId(selectedAppForProfile.assignedRecruiterId || recruiters[0]?.id || "");
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold"
                  >
                    Assign Recruiter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Recruiter */}
      {selectedAppForAssign && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f111a] border border-white/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedAppForAssign(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400">
                <UserCheck className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Assign Recruiter</h3>
              </div>
              <p className="text-xs text-gray-400">
                Assign <span className="text-white font-semibold">{selectedAppForAssign.candidateName}</span> for <span className="text-white">{selectedAppForAssign.jobTitle}</span> to an authorized recruiter.
              </p>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Select Recruiter</label>
                <select
                  value={chosenRecruiterId}
                  onChange={(e) => setChosenRecruiterId(e.target.value)}
                  required
                  className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="">-- Select Recruiter --</option>
                  {recruiters.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.role}) - {r.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300">
                The recruiter will automatically receive notification alerts and see this candidate in their assigned application table.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForAssign(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !chosenRecruiterId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isAssigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Schedule Interview */}
      {selectedAppForInterview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0f111a] border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAppForInterview(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-400">
                <Calendar className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Schedule Interview Round</h3>
              </div>
              <p className="text-xs text-gray-400">
                Candidate: <span className="text-white font-semibold">{selectedAppForInterview.candidateName}</span> ({selectedAppForInterview.candidateEmail})
              </p>
            </div>

            <form onSubmit={handleSaveInterview} className="space-y-3.5 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Interview Date</label>
                  <input
                    type="date"
                    required
                    value={interviewForm.date}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Interview Time</label>
                  <input
                    type="time"
                    required
                    value={interviewForm.time}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Interview Mode</label>
                  <select
                    value={interviewForm.mode}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, mode: e.target.value }))}
                    className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                  >
                    <option value="Online / Google Meet">Online / Google Meet</option>
                    <option value="Online / Zoom">Online / Zoom</option>
                    <option value="In-Person / Office">In-Person / Office</option>
                    <option value="Phone Screening">Phone Screening</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold">Interviewer Name / Panel</label>
                  <input
                    type="text"
                    required
                    value={interviewForm.interviewerName}
                    onChange={(e) => setInterviewForm(prev => ({ ...prev, interviewerName: e.target.value }))}
                    className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Meeting URL / Location Details</label>
                <input
                  type="text"
                  required
                  value={interviewForm.meetingLink}
                  onChange={(e) => setInterviewForm(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-300 font-semibold">Instructions for Candidate</label>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-[#0a0a0f] border border-white/15 focus:border-indigo-500 rounded-xl p-3 text-white outline-none resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300">
                Scheduling updates application status to "Interview Scheduled", creates an interview record, and dispatches in-app and email notifications to the candidate.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppForInterview(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScheduling}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isScheduling ? "Scheduling..." : "Schedule & Notify Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
