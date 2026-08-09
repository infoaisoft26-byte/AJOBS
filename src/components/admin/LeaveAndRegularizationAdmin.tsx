import React, { useEffect, useState } from "react";
import { Check, X, Clock, Calendar, Send, ShieldAlert, FileText, UserCheck } from "lucide-react";
import { AttendanceRegularization, LeaveRequest } from "../../types/employeeTypes";
import { 
  getLeaveRequests, 
  getRegularizationRequests, 
  processLeaveRequest, 
  processRegularizationRequest 
} from "../../services/employeeService";

export default function LeaveAndRegularizationAdmin() {
  const [activeTab, setActiveTab] = useState<"leaves" | "regularization">("leaves");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [lList, rList] = await Promise.all([
        getLeaveRequests(),
        getRegularizationRequests()
      ]);
      setLeaves(lList);
      setRegularizations(rList);
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLeaveDecision = async (leaveId: string, status: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      await processLeaveRequest(leaveId, status, `Decision by Admin Desk on ${new Date().toLocaleDateString()}`);
      await loadData();
    } catch (err) {
      console.error("Leave decision error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegDecision = async (requestId: string, status: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      await processRegularizationRequest(requestId, status, `Approved by Admin Desk on ${new Date().toLocaleDateString()}`);
      await loadData();
    } catch (err) {
      console.error("Regularization decision error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/80 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-400" /> Approvals & Requests Center
          </h2>
          <p className="text-gray-400">Review pending employee leave applications and missed punch regularization requests.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === "leaves" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Leave Requests ({leaves.filter(l => l.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("regularization")}
            className={`px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all ${
              activeTab === "regularization" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            Regularizations ({regularizations.filter(r => r.status === "pending").length})
          </button>
        </div>
      </div>

      {activeTab === "leaves" ? (
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-sm">Employee Leave Applications</h3>
          {leaves.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Leave Type</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Total Days</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {leaves.map((l) => (
                    <tr key={l.leaveId} className="hover:bg-gray-800/40">
                      <td className="p-3 font-bold text-white">
                        {l.employeeName}
                        <span className="block text-[10px] text-gray-500 font-mono">{l.employeeId}</span>
                      </td>
                      <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-indigo-300 font-medium">{l.leaveType}</span></td>
                      <td className="p-3 font-mono">{l.startDate} to {l.endDate}</td>
                      <td className="p-3 font-mono font-bold">{l.totalDays}</td>
                      <td className="p-3 text-gray-400 max-w-xs">{l.reason}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.status === "approved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          l.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                          "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {l.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleLeaveDecision(l.leaveId, "approved")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleLeaveDecision(l.leaveId, "rejected")}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">No leave applications found.</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-sm">Attendance Regularization Requests</h3>
          {regularizations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Requested Timings</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {regularizations.map((r) => (
                    <tr key={r.requestId} className="hover:bg-gray-800/40">
                      <td className="p-3 font-bold text-white">
                        {r.employeeName}
                        <span className="block text-[10px] text-gray-500 font-mono">{r.employeeId}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-300">{r.date}</td>
                      <td className="p-3 uppercase text-gray-300">{r.type.replace("_", " ")}</td>
                      <td className="p-3 font-mono">
                        {r.requestedCheckIn ? new Date(r.requestedCheckIn).toLocaleTimeString() : "-"} - {r.requestedCheckOut ? new Date(r.requestedCheckOut).toLocaleTimeString() : "-"}
                      </td>
                      <td className="p-3 text-gray-400 max-w-xs">{r.reason}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === "approved" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          r.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                          "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleRegDecision(r.requestId, "approved")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleRegDecision(r.requestId, "rejected")}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">No regularization requests found.</p>
          )}
        </div>
      )}
    </div>
  );
}
