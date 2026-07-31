import {
  CheckCircle,
  Cloud,
  Delete,
  Download,
  FileText,
  Phone,
  RefreshCw,
  Search,
  Target,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

export interface AdminApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  status: string;
  appliedAt: string;
  updatedAt?: string;
  resumeUrl?: string;
  resumeScore?: number;
  recruiterId?: string;
}

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
  const [selectedApp, setSelectedApp] = useState<AdminApplicationRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAllApplications = async (showSyncIndicator = false) => {
    if (showSyncIndicator) setRefreshing(true);
    else setLoading(true);

    try {
      const list: AdminApplicationRecord[] = [];

      // 1. Fetch primary 'applications' collection
      try {
        const appsSnap = await getDocs(collection(db, "applications"));
        appsSnap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            jobId: data.jobId || "job_unk",
            jobTitle: data.jobTitle || "Position Title",
            companyName: data.companyName || "Employer Partner",
            candidateId: data.candidateId || "cand_unk",
            candidateName: data.candidateName || "Candidate Name",
            candidateEmail: data.candidateEmail || data.email,
            candidatePhone: data.candidatePhone || data.phone,
            status: data.status || "Applied",
            appliedAt: data.appliedAt || data.createdAt || new Date().toISOString(),
            resumeUrl: data.resumeUrl || data.resumeFileName,
            resumeScore: data.resumeScore || 75,
            recruiterId: data.recruiterId || data.employerId
          });
        });
      } catch (err) {
        console.warn("Admin Applications fetch warning:", err);
      }

      // 2. Fetch 'company_applications' collection
      try {
        const compAppsSnap = await getDocs(collection(db, "company_applications"));
        compAppsSnap.forEach((d) => {
          if (!list.some(a => a.id === d.id)) {
            const data = d.data();
            list.push({
              id: d.id,
              jobId: data.jobId || "job_unk",
              jobTitle: data.jobTitle || "Position Title",
              companyName: data.companyName || "Employer Partner",
              candidateId: data.candidateId || "cand_unk",
              candidateName: data.candidateName || "Candidate Name",
              candidateEmail: data.candidateEmail,
              candidatePhone: data.candidatePhone,
              status: data.status || "Applied",
              appliedAt: data.appliedAt || new Date().toISOString(),
              resumeUrl: data.resumeUrl,
              resumeScore: data.resumeScore || 70,
              recruiterId: data.recruiterId || data.companyId
            });
          }
        });
      } catch (err) {
        console.warn("Company Applications fetch warning:", err);
      }

      // Fallback mock applications if Firestore is clean
      if (list.length === 0) {
        setApplications([
          {
            id: "app_admin_01",
            jobId: "job_dev_01",
            jobTitle: "Senior AI Full Stack Engineer",
            companyName: "Nexus Labs Global",
            candidateId: "cand_01",
            candidateName: "Priya Sharma",
            candidateEmail: "priya.sharma@techcorp.io",
            candidatePhone: "+91 98765 43210",
            status: "Applied",
            appliedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            resumeScore: 92
          },
          {
            id: "app_admin_02",
            jobId: "job_dev_01",
            jobTitle: "Senior AI Full Stack Engineer",
            companyName: "Nexus Labs Global",
            candidateId: "cand_02",
            candidateName: "Arjun Verma",
            candidateEmail: "arjun.v@solutia.com",
            candidatePhone: "+91 98123 88776",
            status: "Shortlisted",
            appliedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            resumeScore: 86
          },
          {
            id: "app_admin_03",
            jobId: "job_arch_02",
            jobTitle: "Cloud Solutions Architect",
            companyName: "Aura Systems",
            candidateId: "cand_03",
            candidateName: "Rohan Mehta",
            candidateEmail: "rohan.mehta@cloudlabs.net",
            candidatePhone: "+91 99001 12233",
            status: "Interview Scheduled",
            appliedAt: new Date(Date.now() - 3600000 * 50).toISOString(),
            resumeScore: 95
          },
          {
            id: "app_admin_04",
            jobId: "job_product_03",
            jobTitle: "Lead Product Designer",
            companyName: "Creative AI Inc",
            candidateId: "cand_04",
            candidateName: "Ananya Deshmukh",
            candidateEmail: "ananya.d@creative.org",
            candidatePhone: "+91 91122 33445",
            status: "Joined",
            appliedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
            resumeScore: 89
          }
        ]);
      } else {
        setApplications(list);
      }
    } catch (err) {
      console.error("Error loading admin applications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllApplications();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter(a => a.status === "Shortlisted").length;
    const interviewing = applications.filter(a => a.status === "Interview Scheduled" || a.status === "HR Round").length;
    const hired = applications.filter(a => a.status === "Joined" || a.status === "Offer").length;
    const rejected = applications.filter(a => a.status === "Rejected").length;

    return { total, shortlisted, interviewing, hired, rejected };
  }, [applications]);

  // Companies dropdown
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    applications.forEach(a => { if (a.companyName) set.add(a.companyName); });
    return Array.from(set);
  }, [applications]);

  // Filtered List
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;
      if (companyFilter !== "ALL" && app.companyName !== companyFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = app.candidateName.toLowerCase().includes(q);
        const mTitle = app.jobTitle.toLowerCase().includes(q);
        const mComp = app.companyName.toLowerCase().includes(q);
        const mEmail = (app.candidateEmail || "").toLowerCase().includes(q);
        if (!mName && !mTitle && !mComp && !mEmail) return false;
      }
      return true;
    });
  }, [applications, statusFilter, companyFilter, searchQuery]);

  // Admin status update override
  const handleAdminStatusOverride = async (appId: string, newStatus: string) => {
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "applications", appId), {
        status: newStatus,
        updatedAt: nowIso
      }).catch(async () => {
        await updateDoc(doc(db, "company_applications", appId), {
          status: newStatus,
          updatedAt: nowIso
        });
      });

      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus, updatedAt: nowIso } : a));
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus, updatedAt: nowIso } : null);
      }
      showToast(`Application status overridden to "${newStatus}".`);
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast("Failed to update status in database.", "error");
    }
  };

  // Delete application record (admin power action)
  const handleDeleteApplication = async (appId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application record from the system?")) return;

    try {
      await deleteDoc(doc(db, "applications", appId)).catch(() => {});
      await deleteDoc(doc(db, "company_applications", appId)).catch(() => {});
      setApplications(prev => prev.filter(a => a.id !== appId));
      if (selectedApp?.id === appId) setSelectedApp(null);
      showToast("Application record deleted.");
      if (onRefresh) onRefresh();
    } catch (e) {
      showToast("Failed to delete application record.", "error");
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ["App ID", "Candidate Name", "Email", "Phone", "Job Title", "Company", "Status", "Resume Score", "Applied At"];
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
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Admin_All_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showToast = (msg: string, _type = "success") => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-indigo-950 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
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
            <h2 className="text-lg font-bold text-white tracking-tight">Global Applications Directory</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Oversee every job application across all corporate clients, consultancies, and hiring recruiters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAllApplications(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Sync Directory"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredApps.length === 0}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1">
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Total Submissions</span>
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
          <span className="text-[10px] text-purple-400 font-mono uppercase tracking-wider">Offers / Hired</span>
          <div className="text-xl font-extrabold text-purple-400">{stats.hired}</div>
        </div>

        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl space-y-1 col-span-2 md:col-span-1">
          <span className="text-[10px] text-rose-400 font-mono uppercase tracking-wider">Rejected</span>
          <div className="text-xl font-extrabold text-rose-400">{stats.rejected}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidate, job, company or email..."
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
            <option value="ALL">All Employers & Companies ({uniqueCompanies.length})</option>
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
            <option value="ALL">All Application Stages</option>
            <option value="Applied">Applied</option>
            <option value="Shortlisted">Shortlisted</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
            <option value="Offer">Offer</option>
            <option value="Joined">Joined</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 font-mono">
            Loading global application database...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            No application records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5">Candidate</th>
                  <th className="p-3.5">Target Job</th>
                  <th className="p-3.5">Employer / Company</th>
                  <th className="p-3.5">Resume Match</th>
                  <th className="p-3.5">Stage</th>
                  <th className="p-3.5">Applied At</th>
                  <th className="p-3.5 text-right">Admin Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{app.candidateName}</div>
                      <span className="text-[10px] text-gray-400 font-mono">{app.candidateEmail || "No email"}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-medium text-gray-200 block truncate max-w-[180px]">{app.jobTitle}</span>
                    </td>
                    <td className="p-3.5 text-gray-300">{app.companyName}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-indigo-400">{app.resumeScore || 0}%</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        app.status === "Shortlisted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        app.status === "Rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        app.status === "Interview Scheduled" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <select
                          value={app.status}
                          onChange={(e) => handleAdminStatusOverride(app.id, e.target.value)}
                          className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-gray-300 outline-none cursor-pointer"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Interview Scheduled">Interview Scheduled</option>
                          <option value="Offer">Offer</option>
                          <option value="Joined">Joined</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          title="Delete Application"
                          className="p-1.5 text-gray-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
