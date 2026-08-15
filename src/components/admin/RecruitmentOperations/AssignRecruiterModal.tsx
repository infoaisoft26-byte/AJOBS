import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, 
  UserCheck, 
  Briefcase, 
  Calendar, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  ShieldCheck,
  Building,
  Mail,
  Clock
} from "lucide-react";
import { RecruitmentCandidate, RecruitmentJob, RecruiterUser } from "../../../types/recruitment";
import { assignCandidatesToRecruiter } from "../../../services/recruitmentService";

interface AssignRecruiterModalProps {
  candidates: RecruitmentCandidate[];
  allCandidates: RecruitmentCandidate[];
  recruiters: RecruiterUser[];
  jobs: RecruitmentJob[];
  selectedJob?: RecruitmentJob | null;
  onClose: () => void;
  onSuccess: () => void;
  adminUser?: { name: string; email: string };
}

export default function AssignRecruiterModal({
  candidates,
  allCandidates,
  recruiters,
  jobs,
  selectedJob: initialSelectedJob,
  onClose,
  onSuccess,
  adminUser
}: AssignRecruiterModalProps) {
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>(recruiters[0]?.id || "");
  const [selectedJobId, setSelectedJobId] = useState<string>(initialSelectedJob?.id || "");
  const [priority, setPriority] = useState<"Urgent" | "High" | "Medium" | "Low">("High");
  const [deadlineDate, setDeadlineDate] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const selectedRecruiter = recruiters.find((r) => r.id === selectedRecruiterId) || recruiters[0];
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || initialSelectedJob || null;

  // Check if any candidate is already assigned to this recruiter
  const alreadyAssigned = candidates.filter((c) => c.assignedRecruiterId === selectedRecruiterId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruiter) {
      setErrorMessage("Please select an active recruiter.");
      return;
    }
    if (candidates.length === 0) {
      setErrorMessage("No candidates selected for assignment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await assignCandidatesToRecruiter({
        candidateIds: candidates.map((c) => c.id),
        candidates: allCandidates,
        recruiter: selectedRecruiter,
        job: selectedJob,
        priority,
        deadlineDate,
        adminNotes,
        adminUser
      });

      setSuccessMessage(`Successfully assigned ${result.successCount} candidate(s) to ${selectedRecruiter.name}!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Assignment failure:", err);
      setErrorMessage(err.message || "Failed to complete candidate assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Assign Candidate(s) to Recruiter</h2>
              <p className="text-xs text-slate-400">Route selected profiles directly to recruiter pipelines with SLA & tracking.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Selected Candidates Summary */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Target Candidates ({candidates.length})
              </span>
              <span className="text-[11px] text-blue-400 font-mono">
                {candidates.map((c) => c.candidateId).slice(0, 3).join(", ")}{candidates.length > 3 ? ` +${candidates.length - 3} more` : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {candidates.map((c) => (
                <div key={c.id} className="px-2.5 py-1 bg-slate-800/90 rounded-lg text-slate-200 border border-slate-700/80 flex items-center space-x-1.5">
                  <span className="font-semibold text-white">{c.fullName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({c.candidateId})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recruiter Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Recruiter / Talent Partner <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedRecruiterId}
              onChange={(e) => setSelectedRecruiterId(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {recruiters.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.name} ({rec.recruiterId}) — {rec.agencyOrCompany || "Talent Operations"} ({rec.email})
                </option>
              ))}
            </select>
          </div>

          {/* Target Job Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Assign to Job Vacancy (Optional)
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- General Recruitment Pipeline (No Specific Job) --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  [{j.jobId}] {j.title} at {j.companyName} ({j.location}) — Status: {j.status}
                </option>
              ))}
            </select>
          </div>

          {/* Priority and Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Assignment Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Urgent">🔥 Urgent (24hr SLA)</option>
                <option value="High">⚡ High Priority</option>
                <option value="Medium">Standard / Medium</option>
                <option value="Low">Low / Talent Pool</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Sourcing / Follow-up Deadline
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Admin Instructions / Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Admin Sourcing Notes & Instructions
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g., Notice period is negotiable. Candidate specifically requested hybrid roles in Bengaluru. Please check salary expectations."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Reassignment Warning */}
          {alreadyAssigned.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <span>
                Note: {alreadyAssigned.length} candidate(s) ({alreadyAssigned.map((c) => c.fullName).join(", ")}) are already assigned to this recruiter. Submitting will update their assignment details and refresh timestamps.
              </span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold flex items-center space-x-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Assigning..." : `Confirm Assignment (${candidates.length})`}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
