import React, { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Send, Type, UserCheck, X } from "lucide-react";
interface CandidateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  consultancyId: string;
  onAssigned?: () => void;
}

export default function CandidateAssignmentModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  consultancyId,
  onAssigned
}: CandidateAssignmentModalProps) {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen && consultancyId) {
      fetchConsultancyRecruiters();
    }
  }, [isOpen, consultancyId]);

  const fetchConsultancyRecruiters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultancy/recruiters-list?consultancyId=${consultancyId}`);
      const data = await res.json();
      if (data.success) {
        setRecruiters(data.recruiters);
      }
    } catch (err) {
      console.error("Failed to load agency recruiters:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedRecruiterId) {
      setError("Please select a recruiter to manage this candidate profile.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/candidates/assign-recruiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          recruiterId: selectedRecruiterId,
          consultancyId,
          reassignmentReason
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to assign candidate to recruiter.");
      }

      setSuccess("Candidate profile assigned successfully!");
      setTimeout(() => {
        if (onAssigned) onAssigned();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "An unexpected assignment error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <UserCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Assign Candidate to Recruiter</h3>
            <p className="text-xs text-gray-400">Candidate: <strong className="text-white">{candidateName}</strong></p>
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

        <form onSubmit={handleAssignCandidate} className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-300 mb-1">Select Agency Recruiter</label>
            {loading ? (
              <div className="p-3 bg-black/40 border border-white/10 rounded-xl text-gray-400 font-mono">
                Loading agency recruiters...
              </div>
            ) : (
              <select
                value={selectedRecruiterId}
                onChange={(e) => setSelectedRecruiterId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose Recruiter --</option>
                {recruiters.map((rec) => (
                  <option key={rec.uid} value={rec.uid}>
                    {rec.name || rec.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Reassignment Reason / Assignment Note</label>
            <input
              type="text"
              value={reassignmentReason}
              onChange={(e) => setReassignmentReason(e.target.value)}
              placeholder="e.g. Lead assigned for AI Engineer pipeline screening."
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? "Assigning..." : "Confirm Recruiter Assignment"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
