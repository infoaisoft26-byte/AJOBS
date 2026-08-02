import { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { CheckCircle2, ExternalLink, Eye, File, Inspect, List, Search, Section, ShieldCheck, Table, Type, User, Verified, View } from "lucide-react";
import { auth } from "../../firebase";

import { VerificationRequest, KycDocument } from "../../types";

export default function KycVerificationCenter() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/kyc/admin-pending-list?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to fetch KYC verification requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (decision: "APPROVED" | "REJECTED" | "RESUBMIT") => {
    if (!selectedReq) return;
    if ((decision === "REJECTED" || decision === "RESUBMIT") && !rejectionReason.trim()) {
      alert("Please specify a rejection or resubmission reason for compliance audit trail.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/kyc/review-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedReq.requestId || selectedReq.id,
          userId: selectedReq.userId,
          decision,
          rejectionReason,
          adminNotes: reviewNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setToast(`KYC Verification ${decision} for ${selectedReq.userEmail || selectedReq.userId}`);
        setTimeout(() => setToast(""), 3000);
        setSelectedReq(null);
        setRejectionReason("");
        setReviewNotes("");
        fetchRequests();
      } else {
        alert(data.error || "Review submission failed.");
      }
    } catch (err) {
      console.error("Error submitting KYC decision:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = requests.filter((req) => {
    const term = search.toLowerCase();
    return (
      req.userId.toLowerCase().includes(term) ||
      (req.userEmail && req.userEmail.toLowerCase().includes(term)) ||
      (req.role && req.role.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header & Filters */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>KYC & Corporate Verification Control Center</span>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-mono font-bold">
                {requests.length} Requests
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Verify legal identity documents, GSTIN / PAN records, signed private uploads, and plan approvals.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 font-medium transition-all"
          >
            Refresh Pending List
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user ID, email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="pending">Pending Approval</option>
            <option value="verified">Verified & Active</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400 font-mono">
            Loading KYC verification queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 space-y-2">
            <ShieldCheck className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No verification requests found matching current filter ({statusFilter}).</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase text-[10px] font-mono tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">User & Role</th>
                  <th className="py-3 px-4">Selected Plan</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((req) => (
                  <tr key={req.requestId || req.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{req.userEmail || req.userId}</div>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 mt-1">
                        {req.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold uppercase text-indigo-300">
                      {req.selectedPlan || "Professional"}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        req.riskLevel === "low" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {req.riskLevel || "low"} risk
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-400">
                      {req.submittedAt ? new Date(req.submittedAt).toLocaleString() : "Recently"}
                    </td>

                    <td className="py-3 px-4">
                      <span className="uppercase font-bold text-amber-400 text-[11px]">
                        {req.verificationStatus || "pending"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedReq(req)}
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/30 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Decide</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect & Review Modal */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c101d] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Verification Audit: {selectedReq.userEmail || selectedReq.userId}</span>
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Profile Details Summary */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-400 block text-[10px]">USER ID / EMAIL</span>
                  <strong className="text-white font-mono">{selectedReq.userEmail || selectedReq.userId}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">ROLE & PLAN</span>
                  <strong className="text-indigo-300 uppercase">{selectedReq.role} — {selectedReq.selectedPlan}</strong>
                </div>
              </div>

              {/* Submitted Documents Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-white uppercase font-mono text-[11px]">Submitted KYC Documents</h4>
                <div className="space-y-2">
                  {selectedReq.submittedDocuments && selectedReq.submittedDocuments.map((doc: any, idx: number) => (
                    <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white uppercase text-[11px]">{doc.docType.replace("_", " ")}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{doc.fileName || "Document File"}</p>
                      </div>
                      {doc.secureUrl && (
                        <a
                          href={doc.secureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-[11px] font-semibold border border-indigo-500/30 flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Signed Document</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Notes & Rejection Form */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-gray-300 mb-1">Admin Audit Remarks</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional administrative notes for audit log..."
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1">Rejection / Resubmission Reason (Required if denying)</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. GST Certificate address mismatch with provided office address."
                    className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium"
              >
                Close Window
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleReviewAction("REJECTED")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold rounded-xl text-xs border border-rose-500/30 transition-all"
                >
                  Reject & Block
                </button>
                <button
                  onClick={() => handleReviewAction("APPROVED")}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  {actionLoading ? "Processing Approval..." : "Approve & Activate Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
