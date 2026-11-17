import React, { Dispatch, FormEvent, useState } from "react";
import { auth } from "../firebase";
import { AlertCircle, Send, Type, X } from "lucide-react";


interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: {
    id: string;
    jobId: string;
    jobTitle: string;
    companyName: string;
    candidateId: string;
    candidateName: string;
    candidateEmail?: string;
  } | null;
  onSuccess?: () => void;
}

export default function RejectionReasonModal({
  isOpen,
  onClose,
  application,
  onSuccess
}: RejectionReasonModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setErrorMsg("Please provide a constructive rejection reason for the candidate.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const nowIso = new Date().toISOString();

    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error("Please sign in again to update this application.");
      const response = await fetch("/api/hire/workspace/applications/" + encodeURIComponent(application.id) + "/status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ status: "rejected", remarks: rejectionReason.trim() })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save rejection feedback.");
      if (application.candidateEmail) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: application.candidateEmail,
            subject: "Update on your application for " + application.jobTitle + " at " + application.companyName,
            body: "Dear " + application.candidateName + ",\n\nYour application for " + application.jobTitle + " at " + application.companyName + " has been updated.\n\nFeedback from the hiring team:\n" + rejectionReason.trim() + "\n\nAIJOBS"
          })
        }).catch(eErr => console.warn("Rejection email dispatch notice:", eErr));
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Rejection recording error:", err);
      setErrorMsg(err.message || "Failed to record rejection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0c101c] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Candidate Rejection Feedback</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1 text-xs">
          <p className="text-gray-300 font-semibold">{application.candidateName}</p>
          <p className="text-gray-400">{application.jobTitle} • {application.companyName}</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirmRejection} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300">
              Rejection Reason & Candidate Feedback <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Candidate's technical experience in distributed systems is below required senior threshold. Salary expectation exceeds budgeted range."
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Processing..." : "Submit Rejection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
