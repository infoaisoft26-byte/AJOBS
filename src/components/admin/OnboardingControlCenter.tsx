import React, { useEffect, useState } from "react";
import { 
  AlertCircle, Building, Check, CheckCircle2, Clock, Copy, CreditCard, 
  ExternalLink, Eye, FileCheck, FileText, KeyRound, Lock, Mail, MessageSquare, 
  RefreshCw, Search, ShieldAlert, ShieldCheck, UserCheck, UserX, Users, X 
} from "lucide-react";
import { parseJsonResponse } from "../../utils/apiHelper";

export default function OnboardingControlCenter() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [timelineModalUser, setTimelineModalUser] = useState<any | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const fetchOnboardingUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/onboarding-list?status=${statusFilter}&role=${roleFilter}&search=${encodeURIComponent(search)}`);
      const data = await parseJsonResponse(res);
      if (data.success && data.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch onboarding list:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOnboardingUsers();
  }, [statusFilter, roleFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // 1. Send KYC Link
  const handleSendKycLink = async (user: any) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/kyc/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          recipientName: user.displayName,
          generatedBy: "Admin"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        showToast(`KYC submission link sent to ${user.email}. Token generated.`);
        if (data.kycUrl) {
          navigator.clipboard.writeText(data.kycUrl);
          showToast(`KYC link copied to clipboard & email dispatched to ${user.email}!`);
        }
        fetchOnboardingUsers();
      } else {
        alert(data.error || "Failed to send KYC link.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Send Reminder
  const handleSendReminder = async (user: any, type: "kyc" | "agreement") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/kyc/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          recipientName: user.displayName,
          reminderType: type
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        showToast(`Reminder sent to ${user.email} (${data.reminderCount} time(s)).`);
        fetchOnboardingUsers();
      } else {
        alert(data.error || "Failed to send reminder.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Generate Agreement
  const handleGenerateAgreement = async (user: any) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/agreements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          recipientName: user.displayName,
          role: user.role,
          plan: "professional"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        showToast(`Service Agreement ${data.agreement.agreementNumber} generated and emailed to ${user.email}.`);
        fetchOnboardingUsers();
      } else {
        alert(data.error || "Failed to generate agreement.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Verify Payment Manual Override
  const handleVerifyPayment = async (user: any) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/payment/verify-and-transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          amountPaid: 588.82,
          gateway: "Admin Manual Override"
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        showToast(`Payment verified for ${user.displayName}. Account moved to Admin Clearance.`);
        fetchOnboardingUsers();
      } else {
        alert(data.error || "Failed to verify payment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Final Approve Account
  const handleApproveAccount = async (user: any) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/approve-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: user.uid,
          reviewedBy: "Super Admin",
          adminNotes: adminNotes || "All prerequisites verified."
        })
      });
      const data = await parseJsonResponse(res);
      if (data.success) {
        showToast(`🎉 Account ${user.email} ACTIVATED! Workspace access granted.`);
        setSelectedUser(null);
        fetchOnboardingUsers();
      } else {
        alert(data.error || "Failed to approve account.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Timeline
  const handleViewTimeline = async (user: any) => {
    setTimelineModalUser(user);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/onboarding/timeline?userId=${user.uid}`);
      const data = await parseJsonResponse(res);
      if (data.success) {
        setTimelineEvents(data.timeline || []);
      } else {
        setTimelineEvents([]);
      }
    } catch (err) {
      console.error(err);
      setTimelineEvents([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage("")} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Control Header & Filters */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Onboarding & Verification Control Center</span>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-mono font-bold">
                {users.length} Candidates/Partners
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              End-to-End Onboarding Management: KYC → Service Agreement → Payment Verification → Final Admin Clearance.
            </p>
          </div>

          <button
            onClick={fetchOnboardingUsers}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 font-medium transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user ID, name, email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Account Statuses</option>
            <option value="registered">Registered (Verification Pending)</option>
            <option value="kyc_link_sent">KYC Link Sent</option>
            <option value="kyc_submitted">KYC Submitted</option>
            <option value="kyc_approved">KYC Approved</option>
            <option value="agreement_generated">Agreement Generated</option>
            <option value="agreement_accepted">Agreement Accepted</option>
            <option value="payment_pending">Payment Pending</option>
            <option value="admin_approval_pending">Admin Clearance Pending</option>
            <option value="active">Active Accounts</option>
            <option value="suspended">Suspended Accounts</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles (Candidate, Recruiter, Consultancy)</option>
            <option value="recruiter">Recruiters</option>
            <option value="consultancy">Consultancies</option>
            <option value="candidate">Candidates</option>
          </select>
        </div>
      </div>

      {/* Onboarding Queue Table */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-400 font-mono flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loading onboarding control pipeline...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 space-y-2">
            <Users className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No user accounts match the current filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 uppercase text-[10px] font-mono tracking-wider text-gray-400 border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">User & Role</th>
                  <th className="py-3.5 px-4">KYC Status</th>
                  <th className="py-3.5 px-4">Agreement</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Risk Level</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Pipeline Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* User Profile Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{u.displayName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{u.email}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {u.role}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{u.phone}</span>
                      </div>
                    </td>

                    {/* KYC Status */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase ${
                        ["approved", "verified", "kyc_approved"].includes(u.kycStatus)
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : u.kycStatus === "kyc_link_sent"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {u.kycStatus}
                      </span>
                    </td>

                    {/* Agreement Status */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase ${
                        u.agreementStatus === "accepted"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : u.agreementStatus === "agreement_generated"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}>
                        {u.agreementStatus}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase ${
                        ["success", "paid"].includes(u.paymentStatus)
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {u.paymentStatus}
                      </span>
                    </td>

                    {/* Risk Level */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        u.riskLevel === "LOW RISK"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : u.riskLevel === "HIGH RISK"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {u.riskLevel}
                      </span>
                      {u.riskFlags && u.riskFlags.length > 0 && (
                        <p className="text-[9px] text-rose-400 mt-0.5 font-mono">{u.riskFlags[0]}</p>
                      )}
                    </td>

                    {/* Account Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                        u.accountStatus === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : u.accountStatus === "admin_approval_pending"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse"
                          : u.accountStatus === "suspended"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}>
                        {u.accountStatus}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleViewTimeline(u)}
                        title="View Full Onboarding Timeline"
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[11px] font-mono border border-white/10 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span>Timeline</span>
                      </button>

                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/30 font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage & Execute</span>
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action & Onboarding Execution Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0e1a] border border-white/10 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span>Onboarding Control: {selectedUser.displayName} ({selectedUser.email})</span>
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Stage Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-gray-400 text-[10px] block">1. KYC STATUS</span>
                <strong className={["approved", "verified"].includes(selectedUser.kycStatus) ? "text-emerald-400" : "text-amber-400"}>
                  {selectedUser.kycStatus.toUpperCase()}
                </strong>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-gray-400 text-[10px] block">2. AGREEMENT</span>
                <strong className={selectedUser.agreementStatus === "accepted" ? "text-emerald-400" : "text-amber-400"}>
                  {selectedUser.agreementStatus.toUpperCase()}
                </strong>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-gray-400 text-[10px] block">3. PAYMENT</span>
                <strong className={["success", "paid"].includes(selectedUser.paymentStatus) ? "text-emerald-400" : "text-amber-400"}>
                  {selectedUser.paymentStatus.toUpperCase()}
                </strong>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                <span className="text-gray-400 text-[10px] block">4. CLEARANCE</span>
                <strong className={selectedUser.accountStatus === "active" ? "text-emerald-400" : "text-amber-400"}>
                  {selectedUser.accountStatus.toUpperCase()}
                </strong>
              </div>
            </div>

            {/* Quick Action Matrix */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <h4 className="text-xs font-mono font-bold text-gray-300 uppercase">Available Onboarding Actions</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Send KYC Link */}
                <button
                  onClick={() => handleSendKycLink(selectedUser)}
                  disabled={actionLoading}
                  className="p-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span>Send / Copy KYC Submission Link</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">24h Token</span>
                </button>

                {/* Send Reminders */}
                <button
                  onClick={() => handleSendReminder(selectedUser, "kyc")}
                  disabled={actionLoading}
                  className="p-3 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Send KYC Reminder Email</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">Count: {selectedUser.kycReminderCount || 0}</span>
                </button>

                {/* Generate Service Agreement */}
                <button
                  onClick={() => handleGenerateAgreement(selectedUser)}
                  disabled={actionLoading}
                  className="p-3 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Generate & Send Service Agreement</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">GST 18%</span>
                </button>

                {/* Verify Payment Override */}
                <button
                  onClick={() => handleVerifyPayment(selectedUser)}
                  disabled={actionLoading}
                  className="p-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Verify Payment (Admin Override)</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">₹588.82</span>
                </button>

              </div>
            </div>

            {/* Admin Audit Remarks */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
              <label className="text-gray-300 font-medium block">Admin Clearance Audit Remarks</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Log compliance verification notes for audit logs..."
                className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Final Activation Button */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-xs font-medium hover:bg-white/10"
              >
                Close Window
              </button>

              <button
                onClick={() => handleApproveAccount(selectedUser)}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{actionLoading ? "Processing Approval..." : "Final Clearance & Activate Account"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Onboarding Timeline Modal */}
      {timelineModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0e1a] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>Onboarding Audit Timeline: {timelineModalUser.displayName}</span>
              </h3>
              <button onClick={() => setTimelineModalUser(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {timelineLoading ? (
              <p className="text-xs text-gray-400 font-mono py-8 text-center">Loading chronological event log...</p>
            ) : timelineEvents.length === 0 ? (
              <p className="text-xs text-gray-400 font-mono py-8 text-center">No timeline events recorded yet for this user.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {timelineEvents.map((ev, idx) => (
                  <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1">
                    <div className="flex justify-between items-center font-mono">
                      <span className="font-bold text-indigo-300 uppercase">{ev.title}</span>
                      <span className="text-[10px] text-gray-400">{new Date(ev.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-300">{ev.description}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Actor: {ev.actor}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
