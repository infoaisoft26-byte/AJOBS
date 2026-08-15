import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Award, 
  FileText, 
  Calendar, 
  Building, 
  DollarSign, 
  Clock, 
  Send, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserCheck
} from "lucide-react";
import { RecruitmentCandidate } from "../../../types/recruitment";
import { addCandidateAdminNote, updateCandidate } from "../../../services/recruitmentService";

interface CandidateProfileModalProps {
  candidate: RecruitmentCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignToRecruiter?: (candidate: RecruitmentCandidate) => void;
  onCandidateUpdated?: () => void;
  adminUser?: { name: string; email: string };
}

export default function CandidateProfileModal({
  candidate,
  isOpen,
  onClose,
  onAssignToRecruiter,
  onCandidateUpdated,
  adminUser
}: CandidateProfileModalProps) {
  if (!isOpen || !candidate) return null;

  const [newNote, setNewNote] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [notesList, setNotesList] = useState(candidate.notesHistory || []);
  const [accountStatus, setAccountStatus] = useState(candidate.accountStatus || "active");
  const [verificationStatus, setVerificationStatus] = useState(candidate.verificationStatus || "verified");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (candidate) {
      setNotesList(candidate.notesHistory || []);
      setAccountStatus(candidate.accountStatus || "active");
      setVerificationStatus(candidate.verificationStatus || "verified");
      setNewNote("");
      setStatusMessage("");
    }
  }, [candidate]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !candidate) return;

    setIsSubmittingNote(true);
    try {
      await addCandidateAdminNote(candidate.id, newNote.trim(), adminUser?.name || "Super Admin");
      const noteObj = {
        note: newNote.trim(),
        author: adminUser?.name || "Super Admin",
        createdAt: new Date().toISOString()
      };
      setNotesList([noteObj, ...notesList]);
      setNewNote("");
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!candidate) return;
    setIsSavingStatus(true);
    try {
      await updateCandidate(candidate.id, {
        accountStatus: accountStatus as any,
        verificationStatus: verificationStatus as any,
        emailVerified: verificationStatus === "verified"
      }, adminUser);

      setStatusMessage("Candidate statuses updated successfully.");
      setTimeout(() => setStatusMessage(""), 3500);
      if (onCandidateUpdated) onCandidateUpdated();
    } catch (err) {
      console.error("Error updating candidate statuses:", err);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const skills = candidate.keySkills && candidate.keySkills.length > 0 
    ? candidate.keySkills 
    : (candidate.skills || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8 flex flex-col max-h-[90vh]"
      >
        {/* Modal Top Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500/40 text-white flex items-center justify-center font-bold text-xl font-mono shadow-lg">
              {candidate.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white tracking-tight">{candidate.fullName}</h2>
                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/30 text-xs">
                  {candidate.candidateId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  candidate.emailVerified || candidate.verificationStatus === "verified"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}>
                  {candidate.emailVerified ? "✓ Verified" : "Pending Verification"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {candidate.targetRole || "Software Professional"} • Registered on {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString("en-IN") : "Recent"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onAssignToRecruiter && (
              <button
                onClick={() => {
                  onClose();
                  onAssignToRecruiter(candidate);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Assign Recruiter</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {statusMessage && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Contact Email</span>
              <p className="font-semibold text-slate-200 mt-0.5 truncate">{candidate.email}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Phone Number</span>
              <p className="font-semibold text-slate-200 mt-0.5">{candidate.phone || "Not provided"}</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Total Experience</span>
              <p className="font-semibold text-slate-200 mt-0.5">{candidate.totalExperienceYears || 0} Years</p>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">Location</span>
              <p className="font-semibold text-slate-200 mt-0.5">{candidate.location || candidate.city || "India"}</p>
            </div>
          </div>

          {/* Compensation & Company Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Current Company</span>
              <p className="font-bold text-white text-sm mt-0.5">{candidate.currentCompany || "Not specified"}</p>
            </div>
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Current CTC</span>
              <p className="font-bold text-white text-sm mt-0.5">{candidate.currentCtc || "Confidential"}</p>
            </div>
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono uppercase">Expected CTC</span>
              <p className="font-bold text-emerald-400 text-sm mt-0.5">{candidate.expectedCtc || "Market Standard"}</p>
            </div>
          </div>

          {/* Key Skills */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider font-mono">Skills & Competencies</h4>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-800 text-blue-300 border border-slate-700 rounded-lg text-xs font-medium">
                  {skill}
                </span>
              ))}
              {skills.length === 0 && (
                <p className="text-slate-500 italic">No skills listed in profile.</p>
              )}
            </div>
          </div>

          {/* Resume & Portfolio Attachment */}
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-blue-400" />
              <div>
                <span className="font-bold text-white block">Resume Document</span>
                <span className="text-slate-400 text-[11px]">{candidate.resumeFileName || (candidate.resumeUrl ? "Candidate_Resume.pdf" : "No resume uploaded")}</span>
              </div>
            </div>
            {candidate.resumeUrl ? (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>View Resume</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            ) : (
              <span className="text-slate-500 italic">Unavailable</span>
            )}
          </div>

          {/* Status Controls */}
          <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider font-mono">Profile & Account Status Controls</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Account Lifecycle</label>
                <select
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="placed">Placed (Hired)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Verification Status</label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isSavingStatus}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
                >
                  {isSavingStatus ? "Saving..." : "Update Statuses"}
                </button>
              </div>
            </div>
          </div>

          {/* Internal Notes & History */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-300 text-xs uppercase tracking-wider font-mono">Internal Admin Notes & Log</h4>
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add confidential admin note, interview comments, or feedback..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingNote || !newNote.trim()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingNote ? "Adding..." : "Add Admin Note"}</span>
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notesList.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[10px]">
                    <span className="font-bold text-blue-400">{item.author}</span>
                    <span>{new Date(item.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-slate-300">{item.note}</p>
                </div>
              ))}
              {notesList.length === 0 && (
                <p className="text-slate-500 italic py-2">No internal notes recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
