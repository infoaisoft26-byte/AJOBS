import React, { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Clock, History, Send, Type, User, X } from "lucide-react";
import { auth } from "../firebase";

import { ApplicationTimelineEntry, JobApplication } from "../types";

interface ApplicationStatusTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: JobApplication;
  currentUser: any;
  onStatusUpdated?: () => void;
}

const ALLOWED_STATUSES = [
  "Applied",
  "Application Submitted",
  "Resume Under Review",
  "Screening",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Offer Released",
  "On Hold",
  "Joined",
  "Rejected",
  "Withdrawn"
];

export default function ApplicationStatusTimelineModal({
  isOpen,
  onClose,
  application,
  currentUser,
  onStatusUpdated
}: ApplicationStatusTimelineModalProps) {
  const [history, setHistory] = useState<ApplicationTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState(application.status || "Applied");
  const [remarks, setRemarks] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen && application) {
      fetchTimelineHistory();
    }
  }, [isOpen, application]);

  const fetchTimelineHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/timeline?applicationId=${application.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to fetch application history timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newStatus === application.status && !remarks.trim()) {
      setError("Please select a new status or provide updated interview/screening remarks.");
      return;
    }

    setUpdating(true);

    try {
      const res = await fetch("/api/applications/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          newStatus,
          previousStatus: application.status,
          remarks,
          changedBy: currentUser.uid,
          changedByRole: currentUser.role
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update application status.");
      }

      setSuccess(`Application status changed to '${newStatus}'. Email notification dispatched to candidate.`);
      setRemarks("");
      fetchTimelineHistory();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Application Status History & Timeline</h3>
            <p className="text-xs text-gray-400">
              Candidate: <strong className="text-white">{application.candidateName}</strong> — Position: <strong className="text-indigo-300">{application.jobTitle}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Update Status Form */}
        <form onSubmit={handleUpdateStatus} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Update Application Status</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-gray-300 mb-1">New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {ALLOWED_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-gray-300 mb-1">Remarks / Note for Candidate</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Interview scheduled for tomorrow at 3 PM via Google Meet."
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{updating ? "Saving & Sending Notification..." : "Log Status Change & Send Notification"}</span>
          </button>
        </form>

        {/* Audit Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Historical Audit Trail</h4>

          {loading ? (
            <div className="text-center py-6 text-xs text-gray-400 font-mono">Loading status timeline...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">No historical status changes logged yet.</div>
          ) : (
            <div className="space-y-2 border-l-2 border-indigo-500/30 pl-4">
              {history.map((entry) => (
                <div key={entry.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1 relative">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                      <span>{entry.previousStatus || "Initial"}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-emerald-400">{entry.newStatus}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {entry.remarks && (
                    <p className="text-[11px] text-gray-300 bg-black/40 p-2 rounded-lg mt-1 italic">
                      "{entry.remarks}"
                    </p>
                  )}

                  <div className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                    <User className="w-3 h-3 text-gray-500" />
                    <span>Changed by ID {entry.changedBy} ({entry.changedByRole})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
