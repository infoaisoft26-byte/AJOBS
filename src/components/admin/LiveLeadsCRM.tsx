import {
  CheckCircle2,
  Edit3,
  Mail,
  Phone,
  Search,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";

import { CrmLead } from "../../types";

export default function LiveLeadsCRM() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFollowUp, setEditFollowUp] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads/list");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Failed to load CRM leads:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLeadModal = (lead: CrmLead) => {
    setSelectedLead(lead);
    setEditStatus(lead.status);
    setEditNotes(lead.adminNotes || "");
    setEditFollowUp(lead.nextFollowUpAt || "");
    setAssigneeId(lead.assignedTo || "");
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/leads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: selectedLead.leadId,
          status: editStatus,
          assignedTo: assigneeId,
          nextFollowUpAt: editFollowUp,
          adminNotes: editNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setToastMsg("Lead record updated successfully!");
        setTimeout(() => setToastMsg(""), 3000);
        setSelectedLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error("Failed to update lead:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.mobile.includes(searchQuery);

    const matchesSource = filterSource === "all" || lead.source.toLowerCase() === filterSource.toLowerCase();
    const matchesStatus = filterStatus === "all" || lead.status === filterStatus;
    const matchesRole = filterRole === "all" || lead.role === filterRole;

    return matchesSearch && matchesSource && matchesStatus && matchesRole;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* CRM Filter Controls Header */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Live Lead & Registration CRM</span>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-mono font-bold">
                {filteredLeads.length} Total
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Track multi-channel registrations, UTM attribution sources, KYC statuses, and follow-up assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 font-medium transition-all"
            >
              Refresh Leads
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white"
            />
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Traffic Sources</option>
            <option value="Google Ads / Organic">Google Ads / Organic</option>
            <option value="Facebook">Facebook</option>

            <option value="Instagram">Instagram</option>
            <option value="Direct">Direct Traffic</option>
            <option value="Referral">Referral Program</option>
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="candidate">Candidates</option>
            <option value="consultancy">Consultancies</option>
            <option value="recruiter">Recruiters</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Lead Statuses</option>
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="documents_pending">KYC Pending</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="converted">Converted / Active</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400 font-mono">
            Loading live CRM leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 space-y-2">
            <Users className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No leads match the specified search or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase text-[10px] font-mono tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Lead Name & Role</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Source & Campaign</th>
                  <th className="py-3 px-4">KYC / Resume</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr key={lead.leadId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{lead.fullName}</div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mt-1">
                        {lead.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <span>{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400 font-mono">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <span>{lead.mobile || "N/A"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{lead.source}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{lead.campaign}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        lead.kycStatus === "verified" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {lead.kycStatus || "pending"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="capitalize font-semibold text-indigo-300">
                        {lead.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                      {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : "None"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenLeadModal(lead)}
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/30 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Lead Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c101d] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Manage Lead: {selectedLead.fullName}</span>
              </h3>
              <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Update Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="documents_pending">KYC Pending</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="selected">Selected</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="no_response">No Response</option>
                  <option value="converted">Converted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={editFollowUp}
                  onChange={(e) => setEditFollowUp(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Admin Notes & Remarks</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record interaction history or special requirements..."
                  className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLead}
                disabled={updating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs"
              >
                {updating ? "Saving Changes..." : "Save Lead Updates"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
