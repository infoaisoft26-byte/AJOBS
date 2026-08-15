import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  Briefcase, 
  Calendar, 
  Mail, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob } from "../../../types/recruitment";
import { logRecruitmentAudit } from "../../../services/recruitmentService";

interface ApplicationsPipelineTabProps {
  candidates: RecruitmentCandidate[];
  jobs: RecruitmentJob[];
  adminUser?: { name: string; email: string };
}

export default function ApplicationsPipelineTab({
  candidates,
  jobs,
  adminUser
}: ApplicationsPipelineTabProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notice, setNotice] = useState("");

  const loadApplications = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "applications"));
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setApplications(list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (err) {
      console.warn("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleUpdateStatus = async (appId: string, candidateName: string, jobTitle: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "applications", appId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      await logRecruitmentAudit({
        action: "APPLICATION_STATUS_CHANGED",
        entityType: "APPLICATION",
        entityId: appId,
        entityName: `${candidateName} - ${jobTitle}`,
        details: `Application status updated to ${newStatus.toUpperCase()}`,
        performedBy: adminUser?.name || "Super Admin",
        performedByRole: "Admin",
        performedByEmail: adminUser?.email || "admin@aijobs.global"
      });

      setNotice(`Application status updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setNotice(""), 3500);
      loadApplications();
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  const filtered = applications.filter((app) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !term ||
      (app.candidateName && app.candidateName.toLowerCase().includes(term)) ||
      (app.jobTitle && app.jobTitle.toLowerCase().includes(term)) ||
      (app.email && app.email.toLowerCase().includes(term));

    const matchesStatus = statusFilter === "ALL" || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                APPLICATION & INTERVIEW PIPELINE
              </span>
              <span className="text-xs text-slate-400">Multi-Stage Candidate Progress</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Live Job Applications & Hiring Stages
            </h2>
            <p className="text-xs text-slate-400">
              Track candidate submissions, update interview progress, and record placement outcomes with full audit logs.
            </p>
          </div>

          <button
            onClick={loadApplications}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            Refresh Pipeline
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Matrix */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search candidate name, email, job title..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Application Stages</option>
            <option value="submitted">Submitted / Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="selected">Selected</option>
            <option value="offered">Offer Released</option>
            <option value="joined">Joined</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Applications Table with Responsive Grid-to-Card Transformation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3.5">Candidate</th>
                <th className="p-3.5">Applied Job</th>
                <th className="p-3.5">Application Date</th>
                <th className="p-3.5">Current Status</th>
                <th className="p-3.5">Action Status Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-950/40">
                  <td className="p-3.5">
                    <span className="font-bold text-white block">{app.candidateName || app.name || "Candidate"}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{app.candidateEmail || app.email || "-"}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-semibold text-slate-200 block">{app.jobTitle || "Job Position"}</span>
                    <span className="text-slate-500 text-[10px]">{app.companyName || "AIJobs Partner"}</span>
                  </td>

                  <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "Recent"}
                  </td>

                  <td className="p-3.5">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30">
                      {app.status || "submitted"}
                    </span>
                  </td>

                  <td className="p-3.5">
                    <select
                      value={app.status || "submitted"}
                      onChange={(e) => handleUpdateStatus(app.id, app.candidateName || "Candidate", app.jobTitle || "Job", e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="submitted">Under Review</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview_scheduled">Interview Scheduled</option>
                      <option value="selected">Selected</option>
                      <option value="offered">Offer Released</option>
                      <option value="joined">Joined (Hired)</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card-based View (< md screens: 320px - 767px) */}
        <div className="block md:hidden divide-y divide-slate-800">
          {filtered.map((app) => (
            <div key={app.id} className="p-4 space-y-3 hover:bg-slate-950/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-white text-xs block">{app.candidateName || app.name || "Candidate"}</span>
                  <span className="font-mono text-slate-400 text-[10px]">{app.candidateEmail || app.email || "-"}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0">
                  {app.status || "submitted"}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 font-mono text-[10px]">Position:</span>
                  <span className="font-medium text-slate-200 truncate max-w-[180px]">{app.jobTitle || "Job Position"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-slate-500 font-mono text-[10px]">Company:</span>
                  <span>{app.companyName || "AIJobs Partner"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-slate-500 font-mono text-[10px]">Applied:</span>
                  <span className="font-mono text-[10px]">{app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "Recent"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Update Status:</span>
                <select
                  value={app.status || "submitted"}
                  onChange={(e) => handleUpdateStatus(app.id, app.candidateName || "Candidate", app.jobTitle || "Job", e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer min-h-[36px]"
                >
                  <option value="submitted">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="selected">Selected</option>
                  <option value="offered">Offer Released</option>
                  <option value="joined">Joined (Hired)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500 italic">
            No candidate job applications found in database.
          </div>
        )}
      </div>
    </div>
  );
}
