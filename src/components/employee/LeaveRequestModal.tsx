import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, FileText, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { LeaveType, EmployeeProfile } from "../../types/employeeTypes";
import { EmployeeAttendanceService } from "../../services/EmployeeAttendanceService";

interface LeaveRequestModalProps {
  employee: EmployeeProfile;
  currentUid?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const LEAVE_TYPES: { type: LeaveType; label: string; description: string }[] = [
  { type: "Casual Leave", label: "Casual Leave (CL)", description: "For personal matters, unplanned events, or short breaks." },
  { type: "Sick Leave", label: "Sick Leave (SL)", description: "For medical recovery, illness, or doctor appointments." },
  { type: "Paid Leave", label: "Earned / Paid Leave (PL)", description: "Planned vacation or extended annual leaves." },
  { type: "Unpaid Leave", label: "Loss of Pay (LOP / Unpaid)", description: "Leave taken beyond allocated paid leave balances." },
  { type: "Comp Off", label: "Compensatory Off (Comp-Off)", description: "Claim credit for weekend or overtime working hours." },
  { type: "Optional Holiday", label: "Optional / Restricted Holiday", description: "Floating festival or religious holiday entitlement." }
];

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
  employee,
  currentUid,
  onClose,
  onSuccess
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  
  const [leaveType, setLeaveType] = useState<LeaveType>("Casual Leave");
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [halfDaySession, setHalfDaySession] = useState<"first_half" | "second_half">("first_half");
  const [reason, setReason] = useState<string>("");
  const [totalDays, setTotalDays] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Recalculate total days when dates or half-day options change
  useEffect(() => {
    if (isHalfDay) {
      setTotalDays(0.5);
      setEndDate(startDate); // Ensure end date matches start date for half-day
      return;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setTotalDays(0);
      } else {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(diffDays);
      }
    }
  }, [startDate, endDate, isHalfDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Please provide a detailed reason for your leave request.");
      return;
    }

    if (totalDays <= 0) {
      setError("End date cannot be earlier than the start date.");
      return;
    }

    setLoading(true);

    try {
      await EmployeeAttendanceService.submitLeaveRequest({
        employeeId: employee.employeeId,
        employeeName: employee.fullName,
        employeeUid: currentUid || employee.uid,
        leaveType,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        totalDays,
        isHalfDay,
        halfDaySession: isHalfDay ? halfDaySession : undefined,
        reason: reason.trim()
      });

      onSuccess(`Leave request for ${totalDays} day(s) submitted successfully! Pending manager approval.`);
      onClose();
    } catch (err: any) {
      console.error("Error submitting leave request:", err);
      setError(err.message || "Failed to submit leave request. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Apply for Leave</h2>
              <p className="text-xs text-gray-400">Submit a formal leave request for approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Badge info */}
          <div className="p-3.5 bg-gray-950/50 rounded-xl border border-gray-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-400">Applicant: </span>
              <strong className="text-white font-semibold">{employee.fullName}</strong>
              <span className="text-indigo-400 ml-2">({employee.employeeId})</span>
            </div>
            <div className="text-gray-400">
              Department: <span className="text-gray-200">{employee.department}</span>
            </div>
          </div>

          {/* Leave Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Select Leave Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {LEAVE_TYPES.map((lt) => (
                <button
                  type="button"
                  key={lt.type}
                  onClick={() => setLeaveType(lt.type)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    leaveType === lt.type
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                      : "bg-gray-950/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{lt.label}</span>
                    {leaveType === lt.type && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{lt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Half Day Option */}
          <div className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-white">Half Day Leave</p>
                <p className="text-[11px] text-gray-400">Apply for 0.5 day (First or Second Half)</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Session choice if Half Day */}
          {isHalfDay && (
            <div className="grid grid-cols-2 gap-3 pl-2">
              <button
                type="button"
                onClick={() => setHalfDaySession("first_half")}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer text-center ${
                  halfDaySession === "first_half"
                    ? "bg-indigo-600/30 border-indigo-500 text-white"
                    : "bg-gray-950/40 border-gray-800 text-gray-400"
                }`}
              >
                First Half (Morning)
              </button>
              <button
                type="button"
                onClick={() => setHalfDaySession("second_half")}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer text-center ${
                  halfDaySession === "second_half"
                    ? "bg-indigo-600/30 border-indigo-500 text-white"
                    : "bg-gray-950/40 border-gray-800 text-gray-400"
                }`}
              >
                Second Half (Afternoon)
              </button>
            </div>
          )}

          {/* Date Picker Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {isHalfDay ? "End Date (Locked for 0.5 Day)" : "End Date"}
              </label>
              <input
                type="date"
                value={endDate}
                disabled={isHalfDay}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Duration Banner */}
          <div className="flex items-center justify-between p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs">
            <span className="text-indigo-300 font-medium">Calculated Leave Duration:</span>
            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold">
              {totalDays} {totalDays === 1 ? "Day" : "Days"}
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Reason for Leave Request</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide context or explanation for your supervisor..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
              required
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 cursor-pointer transition-all flex items-center gap-2"
            >
              {loading ? (
                <>Submitting Request...</>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
