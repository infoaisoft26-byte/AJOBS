import React, { FormEvent, useEffect, useState } from "react";
import { collection, doc, getDocs } from "firebase/firestore";
import { AlertCircle, CheckCircle, Contact, Download, Eye, EyeOff, Info, Key, Pause, PauseCircle, Phone, Plus, RefreshCw, Table, Trash2, Type, User, View } from "lucide-react";
import { db } from "../../firebase";


export interface ResumeAccessGrant {
  id: string;
  candidateId: string;
  grantedToUserId: string;
  grantedToName?: string;
  consultancyId?: string;
  grantedByAdminId: string;
  planId?: string;
  status: "active" | "paused" | "expired" | "revoked";
  contactVisibility: boolean;
  viewLimit: number;
  viewsUsed: number;
  downloadLimit: number;
  downloadsUsed: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaidResumeAccessManager({ adminUserId }: { adminUserId: string }) {
  const [grants, setGrants] = useState<ResumeAccessGrant[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // Form inputs
  const [targetUserId, setTargetUserId] = useState("");
  const [viewLimit, setViewLimit] = useState(100);
  const [downloadLimit, setDownloadLimit] = useState(50);
  const [contactVisibility, setContactVisibility] = useState(true);
  const [expiryDays, setExpiryDays] = useState(30);

  const fetchGrantsAndUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users (consultancies and recruiters)
      const usersSnap = await getDocs(collection(db, "users"));
      const userList: any[] = [];
      usersSnap.forEach((doc) => {
        const d = doc.data();
        if (d.role === "consultancy" || d.role === "recruiter" || d.role === "employer") {
          userList.push({ uid: doc.id, ...d });
        }
      });
      setUsers(userList);

      // Fetch active resume access grants from server
      const res = await fetch(`/api/resumes/grants?adminId=${encodeURIComponent(adminUserId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.grants) {
          setGrants(data.grants);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch resume access grants:", err);
      setError("Failed to retrieve grant records. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrantsAndUsers();
  }, [adminUserId]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setError("Please select a target Consultancy or Recruiter.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const selectedUser = users.find((u) => u.uid === targetUserId);
    const expiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString();

    try {
      const res = await fetch("/api/resumes/grant-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantedByAdminId: adminUserId,
          grantedToUserId: targetUserId,
          grantedToName: selectedUser?.name || selectedUser?.displayName || selectedUser?.email || "User",
          consultancyId: selectedUser?.consultancyId || (selectedUser?.role === "consultancy" ? targetUserId : ""),
          candidateId: "ALL", // Access pool to candidate resumes
          viewLimit: Number(viewLimit),
          downloadLimit: Number(downloadLimit),
          contactVisibility,
          expiresAt
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to grant resume access.");
      }

      setSuccess(`Resume access credits allocated successfully to ${selectedUser?.name || targetUserId}!`);
      setShowGrantModal(false);
      fetchGrantsAndUsers();
    } catch (err: any) {
      setError(err.message || "Failed to grant resume access.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGrantStatus = async (grantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/resumes/grant-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, status: nextStatus, adminId: adminUserId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Grant ${grantId} status updated to ${nextStatus}.`);
        fetchGrantsAndUsers();
      } else {
        throw new Error(data.error || "Failed to update grant status.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeGrant = async (grantId: string) => {
    if (!confirm("Are you sure you want to permanently revoke this resume access grant?")) return;
    try {
      const res = await fetch("/api/resumes/grant-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId, status: "revoked", adminId: adminUserId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Grant ${grantId} revoked.`);
        fetchGrantsAndUsers();
      } else {
        throw new Error(data.error || "Failed to revoke grant.");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6 glass p-6 rounded-2xl border border-white/10 text-white" id="paid-resume-access-manager">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <span>Paid Resume Access & Quota Allocation</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Allocate paid candidate resume views/downloads to Consultancies and Recruiters, control contact visibility, set view limits and expiry.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setSuccess(null);
            setShowGrantModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-bold text-black rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Allocate Resume Access Grant</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Access Grants Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 space-x-2 text-xs text-gray-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>Loading Paid Access Grants...</span>
        </div>
      ) : grants.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <Key className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-300">No Resume Access Grants Allocated</p>
          <p className="text-xs text-gray-500 mt-1">Allocate resume credits to consultancies or recruiters to grant view access.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 border-b border-white/10 font-mono text-[10px] uppercase">
                <th className="p-3">Recipient</th>
                <th className="p-3">View Usage</th>
                <th className="p-3">Download Usage</th>
                <th className="p-3">Contact Info</th>
                <th className="p-3">Status</th>
                <th className="p-3">Expires At</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {grants.map((grant) => (
                <tr key={grant.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-semibold text-white">
                    {grant.grantedToName || grant.grantedToUserId}
                    <span className="block text-[10px] font-mono text-gray-400">{grant.grantedToUserId}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span>{grant.viewsUsed} / {grant.viewLimit}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>{grant.downloadsUsed} / {grant.downloadLimit}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    {grant.contactVisibility ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        <Eye className="w-3 h-3" /> Unmasked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full font-bold">
                        <EyeOff className="w-3 h-3" /> Masked
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                      grant.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      grant.status === "paused" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {grant.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-gray-300">
                    {new Date(grant.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => handleToggleGrantStatus(grant.id, grant.status)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs cursor-pointer"
                      title={grant.status === "active" ? "Pause Grant" : "Activate Grant"}
                    >
                      <PauseCircle className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      onClick={() => handleRevokeGrant(grant.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs cursor-pointer"
                      title="Revoke Grant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grant Allocation Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-gray-950 border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h4 className="text-base font-bold flex items-center gap-2 text-white">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Allocate Paid Resume Access</span>
            </h4>

            <form onSubmit={handleGrantAccess} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Select Consultancy or Recruiter</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="" className="bg-gray-950 text-gray-400">-- Choose Account --</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid} className="bg-gray-950 text-white">
                      {u.name || u.displayName || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">View Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={viewLimit}
                    onChange={(e) => setViewLimit(Number(e.target.value))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Download Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={downloadLimit}
                    onChange={(e) => setDownloadLimit(Number(e.target.value))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Expiry (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Contact Details Visibility</label>
                  <button
                    type="button"
                    onClick={() => setContactVisibility(!contactVisibility)}
                    className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      contactVisibility
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                    }`}
                  >
                    {contactVisibility ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{contactVisibility ? "Unmasked Phone/Email" : "Masked Info"}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  {saving ? "Granting..." : "Confirm Access Grant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
