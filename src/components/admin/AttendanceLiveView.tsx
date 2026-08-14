import React, { useEffect, useState } from "react";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  setDoc 
} from "firebase/firestore";
import { db } from "../../firebase";
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Coffee, 
  User, 
  RefreshCw, 
  Filter, 
  Edit3, 
  ShieldAlert,
  Building
} from "lucide-react";
import { AttendanceRecord, EmployeeProfile } from "../../types/employeeTypes";
import { createEmployeeAuditLog, getEmployeeProfiles } from "../../services/employeeService";

export default function AttendanceLiveView() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Modals
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<AttendanceRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    status: "Present" as any,
    reason: ""
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLiveAttendance = async () => {
    setLoading(true);
    try {
      const emps = await getEmployeeProfiles();
      setEmployees(emps);

      const snap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", selectedDate))
      );
      const list: AttendanceRecord[] = [];
      snap.forEach(d => list.push(d.data() as AttendanceRecord));
      setRecords(list);
    } catch (err) {
      console.error("Error fetching live attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAttendance();
  }, [selectedDate]);

  // Computed summary metrics
  const checkedInCount = records.filter(r => r.checkInTime && !r.checkOutTime).length;
  const checkedOutCount = records.filter(r => r.checkOutTime).length;
  const lateCount = records.filter(r => r.isLate).length;
  const wfhCount = records.filter(r => r.workMode === "Work From Home").length;
  const fieldCount = records.filter(r => r.workMode === "Field Work" || r.workMode === "Client Visit").length;
  const flaggedCount = records.filter(r => r.antiFraudFlags && r.antiFraudFlags.length > 0).length;

  const handleManualCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !correctionForm.reason) return;

    setActionLoading(true);
    try {
      await updateDoc(doc(db, "attendance", correctionTarget.attendanceId), {
        status: correctionForm.status,
        managerApprovalStatus: "approved",
        managerNotes: correctionForm.reason,
        updatedAt: new Date().toISOString()
      });

      await createEmployeeAuditLog({
        employeeId: correctionTarget.employeeId,
        employeeName: correctionTarget.employeeName,
        action: "MANUAL_CORRECTION",
        performedBy: "Admin",
        newValue: `Manually updated status for ${correctionTarget.date} to ${correctionForm.status}. Reason: ${correctionForm.reason}`
      });

      setShowCorrectionModal(false);
      await fetchLiveAttendance();
    } catch (err) {
      console.error("Manual correction failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-xs text-gray-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900/80 p-5 rounded-2xl border border-gray-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" /> Live Attendance & Geofence Monitor
          </h2>
          <p className="text-gray-400">Real-time attendance tracking, GPS verification, anti-fraud flags, and admin override.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white font-mono"
          />
          <button
            onClick={fetchLiveAttendance}
            className="p-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">Checked In</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{checkedInCount}</div>
        </div>
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">Checked Out</span>
          <div className="text-2xl font-black text-indigo-400 font-mono">{checkedOutCount}</div>
        </div>
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">Late Today</span>
          <div className="text-2xl font-black text-amber-400 font-mono">{lateCount}</div>
        </div>
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">WFH Active</span>
          <div className="text-2xl font-black text-purple-400 font-mono">{wfhCount}</div>
        </div>
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">Field Duty</span>
          <div className="text-2xl font-black text-cyan-400 font-mono">{fieldCount}</div>
        </div>
        <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1">
          <span className="text-gray-400 block font-medium text-[11px]">Anti-Fraud Flags</span>
          <div className="text-2xl font-black text-rose-400 font-mono">{flaggedCount}</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <h3 className="font-bold text-white text-sm">Real-time Punch Records for {selectedDate}</h3>

        {loading ? (
          <div className="py-12 text-center text-gray-500 font-mono">Loading real-time attendance logs...</div>
        ) : records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase font-mono">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">In / Out Time</th>
                  <th className="p-3">Work Mode</th>
                  <th className="p-3">Geofence Distance</th>
                  <th className="p-3">GPS Location</th>
                  <th className="p-3">Fraud Flags</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {records.map((rec) => (
                  <tr key={rec.attendanceId} className="hover:bg-gray-800/40">
                    <td className="p-3 font-bold text-white">
                      {rec.employeeName}
                      <span className="block text-[10px] text-gray-500 font-mono">{rec.employeeId}</span>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="text-emerald-400">{rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : "-"}</span>
                      {" → "}
                      <span className="text-indigo-400">{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : "Active"}</span>
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">{rec.workMode}</span></td>
                    <td className="p-3 font-mono text-indigo-300">
                      {rec.distanceFromOfficeMeters ? `${rec.distanceFromOfficeMeters}m` : "HQ Area"}
                    </td>
                    <td className="p-3 font-mono text-gray-400">
                      {rec.latitude ? `${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}` : "No GPS"}
                    </td>
                    <td className="p-3">
                      {rec.antiFraudFlags && rec.antiFraudFlags.length > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-bold">
                          <ShieldAlert className="w-3 h-3" /> {rec.antiFraudFlags.length} Flag(s)
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[10px]">Clean</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.status === "Present" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                        rec.status === "Late" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setCorrectionTarget(rec);
                          setCorrectionForm({ status: rec.status, reason: "" });
                          setShowCorrectionModal(true);
                        }}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Override Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-gray-500 py-8 text-center font-mono">No punches recorded for {selectedDate}.</p>
        )}
      </div>

      {/* Manual Correction Modal */}
      {showCorrectionModal && correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md bg-gray-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Manual Status Override</h3>
            <p className="text-xs text-gray-400">Target: <strong className="text-white">{correctionTarget.employeeName}</strong> ({correctionTarget.date})</p>

            <form onSubmit={handleManualCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">New Status</label>
                <select
                  value={correctionForm.status}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, status: e.target.value as any })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                  <option value="Work From Home">Work From Home</option>
                  <option value="Field Duty">Field Duty</option>
                </select>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Audit Justification Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Provide explicit audit reason for override..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
