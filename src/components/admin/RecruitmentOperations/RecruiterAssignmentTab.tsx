import React, { useState, useMemo } from "react";
import { 
  UserCheck, 
  Briefcase, 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Send, 
  Calendar, 
  Mail, 
  Phone, 
  Building, 
  ChevronRight,
  TrendingUp,
  History
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser, RecruiterAssignment } from "../../../types/recruitment";
import { assignCandidatesToRecruiter } from "../../../services/recruitmentService";

interface RecruiterAssignmentTabProps {
  candidates: RecruitmentCandidate[];
  jobs: RecruitmentJob[];
  recruiters: RecruiterUser[];
  assignments: RecruiterAssignment[];
  onOpenAssignModal: (candidates: RecruitmentCandidate[], job?: RecruitmentJob | null) => void;
  onRefresh: () => void;
  adminUser?: { name: string; email: string };
}

export default function RecruiterAssignmentTab({
  candidates,
  jobs,
  recruiters,
  assignments,
  onOpenAssignModal,
  onRefresh,
  adminUser
}: RecruiterAssignmentTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ACTIVE_ROSTER" | "ASSIGNMENT_HISTORY">("ACTIVE_ROSTER");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRecruiterId, setSelectedRecruiterId] = useState("ALL");

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        a.candidateName.toLowerCase().includes(term) ||
        a.candidateEmail.toLowerCase().includes(term) ||
        a.recruiterName.toLowerCase().includes(term) ||
        (a.jobTitle && a.jobTitle.toLowerCase().includes(term)) ||
        (a.candidateSequentialId && a.candidateSequentialId.toLowerCase().includes(term));

      const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
      const matchesRecruiter = selectedRecruiterId === "ALL" || a.recruiterId === selectedRecruiterId;

      return matchesSearch && matchesStatus && matchesRecruiter;
    });
  }, [assignments, searchTerm, statusFilter, selectedRecruiterId]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                RECRUITER WORKFLOW ENGINE
              </span>
              <span className="text-xs text-slate-400">Talent Distribution & Pipeline SLA</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Recruiter Management & Candidate Assignment Tracking
            </h2>
            <p className="text-xs text-slate-400">
              Manage internal recruiters, assign shortlisted candidates with priority & SLA deadlines, and audit real-time recruiter pipeline progress.
            </p>
          </div>

          <button
            onClick={() => onOpenAssignModal(candidates.slice(0, 1))}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <UserCheck className="w-4 h-4" />
            <span>New Candidate Assignment</span>
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-800 pt-2">
          <button
            onClick={() => setActiveSubTab("ACTIVE_ROSTER")}
            className={`pb-3 px-4 font-semibold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "ACTIVE_ROSTER"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Recruiter Roster ({recruiters.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("ASSIGNMENT_HISTORY")}
            className={`pb-3 px-4 font-semibold text-xs flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeSubTab === "ASSIGNMENT_HISTORY"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Assignment History & Timeline ({assignments.length})</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: ACTIVE RECRUITER ROSTER */}
      {activeSubTab === "ACTIVE_ROSTER" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recruiters.map((rec) => {
            const recruiterAssignments = assignments.filter((a) => a.recruiterId === rec.id);
            const activeCount = recruiterAssignments.filter((a) => a.status === "Assigned" || a.status === "Contacted" || a.status === "Screening").length;
            const placedCount = recruiterAssignments.filter((a) => a.status === "Joined" || a.status === "Offered").length;

            return (
              <div
                key={rec.id}
                className="p-5 bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl shadow-xl space-y-4 transition-all text-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold font-mono text-sm">
                      {rec.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{rec.name}</h3>
                      <span className="font-mono text-indigo-400 text-[10px] bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/30">
                        {rec.recruiterId}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    rec.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-400"
                  }`}>
                    {rec.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1 text-slate-400 text-[11px]">
                  <p className="flex items-center"><Building className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {rec.agencyOrCompany || "Talent Team"}</p>
                  <p className="flex items-center font-mono"><Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {rec.email}</p>
                  {rec.phone && <p className="flex items-center font-mono"><Phone className="w-3.5 h-3.5 mr-1.5 text-slate-500" /> {rec.phone}</p>}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Active Pipeline</span>
                    <p className="text-base font-bold text-indigo-400 font-mono">{activeCount}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Placements</span>
                    <p className="text-base font-bold text-emerald-400 font-mono">{placedCount}</p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenAssignModal(candidates.slice(0, 1))}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl font-medium flex items-center justify-center space-x-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Candidates to {rec.name.split(" ")[0]}</span>
                </button>
              </div>
            );
          })}

          {recruiters.length === 0 && (
            <div className="col-span-3 p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-300">No Recruiters Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No recruiter profiles found. User accounts registered with recruiter roles will appear here automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ASSIGNMENT HISTORY & PIPELINE AUDIT */}
      {activeSubTab === "ASSIGNMENT_HISTORY" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidate name, ID, recruiter..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Assignment Statuses</option>
                <option value="Assigned">Assigned</option>
                <option value="Contacted">Contacted</option>
                <option value="Screening">Screening</option>
                <option value="Interview Scheduled">Interview Scheduled</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Offered">Offered</option>
                <option value="Joined">Joined (Hired)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Assigned Recruiters</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.recruiterId})</option>
                ))}
              </select>
            </div>
          </div>

          {/* History Table with Responsive Grid-to-Card Transformation */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Candidate Name & ID</th>
                    <th className="p-3.5">Assigned Recruiter</th>
                    <th className="p-3.5">Target Job</th>
                    <th className="p-3.5">Priority & SLA</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Assigned Date</th>
                    <th className="p-3.5">Admin Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAssignments.map((assign) => (
                    <tr key={assign.id} className="hover:bg-slate-950/40">
                      <td className="p-3.5">
                        <span className="font-bold text-white block">{assign.candidateName}</span>
                        <span className="font-mono text-blue-400 text-[10px]">{assign.candidateSequentialId}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200 block">{assign.recruiterName}</span>
                        <span className="font-mono text-slate-500 text-[10px]">{assign.recruiterEmail}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-300 font-medium block">{assign.jobTitle || "Direct Pipeline"}</span>
                        {assign.jobSequentialId && <span className="font-mono text-emerald-400 text-[10px]">{assign.jobSequentialId}</span>}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          assign.priority === "Urgent"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : assign.priority === "High"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        }`}>
                          {assign.priority}
                        </span>
                        {assign.deadlineDate && (
                          <span className="block text-[10px] text-slate-500 mt-0.5">Due: {assign.deadlineDate}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          {assign.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(assign.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>

                      <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                        {assign.adminNotes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-based View (< md screens: 320px - 767px) */}
            <div className="block md:hidden divide-y divide-slate-800">
              {filteredAssignments.map((assign) => (
                <div key={assign.id} className="p-4 space-y-2.5 hover:bg-slate-950/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-white text-xs block">{assign.candidateName}</span>
                      <span className="font-mono text-blue-400 text-[10px]">{assign.candidateSequentialId}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        assign.priority === "Urgent"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          : assign.priority === "High"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      }`}>
                        {assign.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {assign.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-mono text-[10px]">Recruiter:</span>
                      <span className="font-medium text-slate-200">{assign.recruiterName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-500 font-mono text-[10px]">Target Job:</span>
                      <span className="text-emerald-400 font-medium truncate max-w-[180px]">{assign.jobTitle || "Direct Pipeline"}</span>
                    </div>
                    {assign.deadlineDate && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-slate-500 font-mono text-[10px]">SLA Due:</span>
                        <span className="text-amber-400 font-mono text-[10px]">{assign.deadlineDate}</span>
                      </div>
                    )}
                  </div>

                  {assign.adminNotes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/30 p-2 rounded-lg border border-slate-800/60">
                      "{assign.adminNotes}"
                    </p>
                  )}

                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    Assigned: {new Date(assign.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
              ))}
            </div>

            {filteredAssignments.length === 0 && (
              <div className="p-10 text-center text-slate-500 italic">
                No recruiter assignments found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
