import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Users, Search, ShieldCheck, Mail, Phone, Calendar, Briefcase, 
  Filter, ArrowUpRight, CheckCircle, AlertCircle, RefreshCw, 
  Trash2, UserCheck, Eye, Building, Award, Sliders
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, doc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";
import ExportActivityCsvButton from "./ExportActivityCsvButton";
import OfflineSyncBadge from "./OfflineSyncBadge";

interface Lead {
  id: string;
  candidateId: string;
  candidateName: string;
  email: string;
  phone: string;
  resume: string;
  jobId: string;
  jobTitle: string;
  company: string;
  recruiter: string; // Recruiter userId or "Direct Employer"
  consultancy: string; // Consultancy userId or "Direct"
  currentStatus: string; // Applied, Shortlisted, Interviewing, Offered, Placed, Rejected
  createdAt: string;
  updatedAt: string;
}

interface LeadManagementProps {
  userId: string;
  userRole: "admin" | "recruiter" | "consultancy" | "employer";
  userName?: string;
}

export default function LeadManagement({ userId, userRole, userName }: LeadManagementProps) {
  const [leads, setLeeds] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Normalize userRole (recruiter vs employer)
  const normalizedRole = userRole === "employer" ? "recruiter" : userRole;

  const [recruiterJobIds, setRecruiterJobIds] = useState<string[]>([]);

  // 1. Fetch job posting IDs for recruiters to filter assigned jobs' leads
  useEffect(() => {
    if (!userId) return;

    const fetchJobs = async () => {
      if (normalizedRole === "recruiter" || userRole === "employer") {
        try {
          const jobsRef = collection(db, "jobs");
          const qJobs = query(jobsRef, where("employerId", "==", userId));
          const jobsSnap = await getDocs(qJobs);
          const ids = jobsSnap.docs.map(doc => doc.id);
          
          // Also check by createdBy as fallback
          const qJobsCreated = query(jobsRef, where("createdBy", "==", userId));
          const jobsCreatedSnap = await getDocs(qJobsCreated);
          jobsCreatedSnap.forEach(docSnap => {
            if (!ids.includes(docSnap.id)) {
              ids.push(docSnap.id);
            }
          });

          setRecruiterJobIds(ids);
        } catch (err) {
          console.error("Error fetching recruiter jobs for lead management:", err);
        }
      }
    };

    fetchJobs();
  }, [userId, normalizedRole, userRole]);

  // 2. Setup real-time listener for leads collection with role-based filtering
  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    const leadsRef = collection(db, "leads");
    const q = query(leadsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Lead[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          ...data
        } as Lead);
      });

      // Filter based on roles
      let filtered: Lead[] = [];
      if (normalizedRole === "admin") {
        filtered = items;
      } else if (normalizedRole === "recruiter" || userRole === "employer") {
        filtered = items.filter(
          (lead) =>
            lead.recruiter === userId ||
            (lead.jobId && recruiterJobIds.includes(lead.jobId))
        );
      } else if (normalizedRole === "consultancy") {
        filtered = items.filter((lead) => lead.consultancy === userId);
      } else {
        filtered = items;
      }

      // Sort by newest first
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLeeds(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to leads collection:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, normalizedRole, userRole, recruiterJobIds]);

  // Handle client-side search and status filters
  useEffect(() => {
    let result = leads;

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.candidateName?.toLowerCase().includes(term) ||
          lead.email?.toLowerCase().includes(term) ||
          lead.jobTitle?.toLowerCase().includes(term) ||
          lead.company?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((lead) => lead.currentStatus === statusFilter);
    }

    setFilteredLeads(result);
  }, [leads, searchTerm, statusFilter]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleUpdateStatus = async (leadId: string, nextStatus: string) => {
    try {
      const leadRef = doc(db, "leads", leadId);
      await updateDoc(leadRef, {
        currentStatus: nextStatus,
        updatedAt: new Date().toISOString()
      });

      // Also trigger a notification in notifications collection to Candidate
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && targetLead.candidateId) {
        const notifId = "notif_" + Math.random().toString(36).substr(2, 9);
        await updateDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: targetLead.candidateId,
          title: `Lead Status Updated: ${nextStatus} 🚀`,
          message: `The recruiting team has moved your profile for "${targetLead.jobTitle}" at ${targetLead.company} to "${nextStatus}".`,
          event: "SHORTLISTED_CANDIDATE",
          read: false,
          type: "info",
          createdAt: new Date().toISOString()
        });
      }

      triggerSuccess(`Lead status advanced to "${nextStatus}" successfully.`);
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, currentStatus: nextStatus } : null);
      }
    } catch (err: any) {
      console.error("Error updating lead status:", err);
      alert(`Could not update lead status: ${err.message || err}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this lead record?")) return;
    try {
      await deleteDoc(doc(db, "leads", leadId));
      triggerSuccess("Lead record deleted successfully.");
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
    } catch (err: any) {
      console.error("Error deleting lead:", err);
      alert(`Could not delete lead: ${err.message || err}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0.85, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="space-y-6 transition-all duration-500" 
      id="lead-management-panel"
    >
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Interactive Lead Sourcing & Management Desk</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {normalizedRole === "admin" && "Administrative Sourcing Control: Displaying all corporate pipeline leads globally."}
            {normalizedRole === "recruiter" && "Recruiter Pipeline: Displaying leads assigned directly to your job vacancies."}
            {normalizedRole === "consultancy" && "Consultancy Dashboard: Displaying specialized agency-sourced leads."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OfflineSyncBadge />
          <ExportActivityCsvButton role="consultancy" variant="compact" label="Export Agency CSV" />
          <span className="text-[10px] font-mono px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20 uppercase font-bold">
            Role: {normalizedRole.toUpperCase()}
          </span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by name, email, target job or company..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 select-none">
          <Filter className="w-4 h-4 text-gray-500 shrink-0" />
          {["All", "Applied", "Shortlisted", "Interviewing", "Offered", "Placed", "Rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Main Table & Details Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Leads Ledger List */}
        <div className="xl:col-span-2 glass border border-white/5 rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Sourcing Leads Pipeline ({filteredLeads.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <span className="text-[10px] text-gray-400 font-mono">Syncing candidates leads database...</span>
              </div>
            ) : filteredLeads.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-mono">
                    <th className="pb-3 pl-2">Lead / Candidate</th>
                    <th className="pb-3">Target Vacancy</th>
                    <th className="pb-3">Sourcing Entity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-all group">
                      <td className="py-3.5 pl-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-xs">{lead.candidateName}</span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">{lead.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-indigo-300">{lead.jobTitle}</span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">{lead.company}</span>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/5 text-purple-300 uppercase border border-white/5">
                          {lead.consultancy && lead.consultancy !== "Direct" ? "AGENCY SOURCE" : "DIRECT SOURCED"}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                          lead.currentStatus === "Placed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 animate-pulse" :
                          lead.currentStatus === "Offered" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" :
                          lead.currentStatus === "Rejected" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                          lead.currentStatus === "Interviewing" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" :
                          lead.currentStatus === "Shortlisted" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                          "bg-gray-500/10 text-gray-400 border-gray-500/25"
                        }`}>
                          {lead.currentStatus || "Applied"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1 bg-white/5 hover:bg-indigo-600/20 text-gray-300 hover:text-white rounded transition-colors cursor-pointer"
                            title="Inspect Lead Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {normalizedRole === "admin" && (
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 bg-white/5 hover:bg-rose-600/25 text-gray-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Expunge Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 italic border border-dashed border-white/5 rounded-2xl">
                No pipeline leads matched search/filter tags.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Lead Details Dossier / Sourcing Controls */}
        <div className="xl:col-span-1">
          {selectedLead ? (
            <div className="glass border border-indigo-500/20 rounded-3xl p-6 space-y-6 bg-gradient-to-b from-indigo-500/[0.03] to-transparent sticky top-[150px]">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-mono uppercase font-black text-indigo-400">Lead Sourcing Dossier</span>
                  <h3 className="text-sm font-black text-white mt-1">{selectedLead.candidateName}</h3>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] font-mono text-gray-400 hover:text-white rounded"
                >
                  Close
                </button>
              </div>

              {/* General Contact Info */}
              <div className="space-y-3 border-t border-b border-white/5 py-4">
                <div className="flex items-center gap-2.5 text-xs">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-mono text-gray-300 select-all">{selectedLead.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="font-mono text-gray-300">{selectedLead.phone || "Not Provided"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-bold text-white">{selectedLead.jobTitle}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedLead.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <Building className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-gray-300 text-[10px]">Sourced via: <strong className="text-purple-300">{selectedLead.consultancy && selectedLead.consultancy !== "Direct" ? "Agency Network" : "Direct Sourcing Channel"}</strong></p>
                  </div>
                </div>
              </div>

              {/* Status transition controller */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-gray-400 font-bold uppercase">Transition Lead Pipeline State</p>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                  {[
                    { id: "Shortlisted", label: "Shortlist Profile" },
                    { id: "Interviewing", label: "Set Interviewing" },
                    { id: "Offered", label: "Release Offer" },
                    { id: "Placed", label: "Mark Placed" },
                    { id: "Rejected", label: "Reject Lead" }
                  ].map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleUpdateStatus(selectedLead.id, act.id)}
                      disabled={selectedLead.currentStatus === act.id}
                      className={`px-2 py-2 rounded-xl font-bold cursor-pointer transition-all ${
                        selectedLead.currentStatus === act.id
                          ? "bg-indigo-600 text-white cursor-not-allowed opacity-50"
                          : "bg-white/5 text-gray-400 hover:text-white hover:bg-indigo-600/20"
                      }`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume/Attachment info */}
              <div className="bg-neutral-950/40 p-4 border border-white/5 rounded-2xl text-[10px] font-mono space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[9px]">Attached Candidate Resume</span>
                <p className="text-gray-300 truncate font-bold">{selectedLead.resume || "No Document Available"}</p>
              </div>

            </div>
          ) : (
            <div className="p-10 border border-white/5 border-dashed rounded-3xl text-center text-gray-500 text-xs space-y-2 sticky top-[150px]">
              <UserCheck className="w-8 h-8 text-gray-600 mx-auto stroke-1" />
              <div>
                <p className="font-bold text-gray-400">No Lead Selected</p>
                <p className="text-[10px] text-gray-500">Select a candidate lead from the active sourcing ledger to inspect contacts, attachments, and advance pipeline states.</p>
              </div>
            </div>
          )}
        </div>

      </div>

    </motion.div>
  );
}
