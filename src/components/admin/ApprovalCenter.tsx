import { useState } from "react";
import { 
  ShieldCheck, Clock, FileText, CheckCircle, XCircle, AlertTriangle, 
  Download, Eye, Send, ArrowRight, UserCheck, MessageSquare 
} from "lucide-react";
import { ApprovalRequest } from "./AdminTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface ApprovalCenterProps {
  approvals: ApprovalRequest[];
  onRefresh: () => void;
  userName: string;
}

export default function ApprovalCenter({
  approvals,
  onRefresh,
  userName
}: ApprovalCenterProps) {
  const [selectedAppr, setSelectedAppr] = useState<ApprovalRequest | null>(null);
  const [adminComments, setAdminComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateStatus = async (
    req: ApprovalRequest, 
    nextStatus: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"
  ) => {
    if (!adminComments && nextStatus !== "APPROVED") {
      alert("Please provide commentary justification for changes or rejections.");
      return;
    }
    setIsSubmitting(true);

    try {
      const updatedTimeline = [
        ...req.timeline,
        {
          id: `t_${Math.random().toString(36).substr(2, 9)}`,
          status: nextStatus,
          note: adminComments || `Onboarding request marked as ${nextStatus.toLowerCase()} by administration.`,
          timestamp: new Date().toISOString(),
          by: userName
        }
      ];

      // 1. Update approvals collection
      await setDoc(doc(db, "approvals", req.id), {
        status: nextStatus,
        comments: adminComments,
        reviewedBy: userName,
        reviewedAt: new Date().toISOString(),
        timeline: updatedTimeline
      }, { merge: true });

      // 2. Synchronize to destination collection (make verified if APPROVED)
      if (nextStatus === "APPROVED") {
        if (req.targetType === "employer") {
          // Sync standard companies schema
          await setDoc(doc(db, "companies", req.targetId), {
            isVerified: true
          }, { merge: true });
          
          await setDoc(doc(db, "employers", req.targetId), {
            isVerified: true
          }, { merge: true });
        } else if (req.targetType === "consultancy") {
          await setDoc(doc(db, "consultancies", req.targetId), {
            isVerified: true
          }, { merge: true });
        }
      }

      // 3. Log into system audit trail
      const auditId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", auditId), {
        id: auditId,
        userId: req.targetId,
        userName: req.targetName,
        userEmail: req.email,
        role: "Super Admin",
        action: nextStatus === "APPROVED" ? "APPROVAL" : "REJECTION",
        category: "Approval",
        description: `Company verification request for '${req.targetName}' was set to ${nextStatus}. Justification: ${adminComments || "Verified"}`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`🎉 Verification review updated successfully: ${nextStatus}!`);
      
      // Update local state if active
      if (selectedAppr?.id === req.id) {
        setSelectedAppr({
          ...req,
          status: nextStatus,
          comments: adminComments,
          timeline: updatedTimeline
        });
      }
      setAdminComments("");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to register verification state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="approval-center-vault">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span>Enterprise Verification & Document Center</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Review legal onboarding attachments, corporate GSTIN logs, and industry PAN registers before clearing company accounts for public job posting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Verification lists */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex justify-between items-center">
              <span>Onboarding Queue ({approvals.length})</span>
              <span className="text-[10px] text-gray-400 font-mono">Sync active</span>
            </h4>

            <div className="space-y-3">
              {approvals.length > 0 ? (
                approvals.map((req) => (
                  <div 
                    key={req.id} 
                    className={`p-4 bg-white/5 border rounded-xl space-y-3 hover:border-indigo-500/30 transition-all cursor-pointer ${
                      selectedAppr?.id === req.id ? "border-indigo-500 bg-indigo-500/5" : "border-white/5"
                    }`}
                    onClick={() => {
                      setSelectedAppr(req);
                      setAdminComments(req.comments || "");
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-extrabold text-xs text-white flex items-center gap-1.5">
                          <span>{req.targetName}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded font-mono text-[8px] uppercase">
                            {req.targetType}
                          </span>
                        </h5>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{req.email}</p>
                      </div>

                      <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                        req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                        req.status === "REJECTED" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                        req.status === "CHANGES_REQUESTED" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                        "bg-blue-500/10 text-blue-400 border-blue-500/25 animate-pulse"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-gray-400 pt-2 border-t border-white/5">
                      <div>
                        GSTIN: <strong className="text-white">{req.gstNumber || "N/A"}</strong>
                      </div>
                      <div>
                        PAN: <strong className="text-white">{req.panNumber || "N/A"}</strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
                  Onboarding queue is clean. No pending verifications.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Inspection Desk */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Audit Document Desk</span>
            </h4>

            {selectedAppr ? (
              <div className="space-y-4 text-[11px] leading-relaxed">
                
                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Document File</span>
                  
                  <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="font-bold text-white text-[10px]">{selectedAppr.documentType || "Verification PDF"}</p>
                        <p className="text-[8px] text-gray-500 font-mono">Attachment locked</p>
                      </div>
                    </div>

                    <a 
                      href={selectedAppr.documentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1 bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Timeline display */}
                <div className="space-y-3">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Audit History Timeline</span>
                  
                  <div className="relative border-l border-white/5 pl-4 ml-2 space-y-4 text-[10px]">
                    {selectedAppr.timeline.map((event, idx) => (
                      <div key={event.id || idx} className="relative">
                        {/* Dot indicator */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-[#050508]" />
                        <div className="flex justify-between font-mono text-[8px] text-gray-500 mb-0.5">
                          <span>{event.status}</span>
                          <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-300 font-medium">{event.note}</p>
                        <p className="text-[8px] text-gray-500 font-mono mt-0.5">by {event.by}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Actions */}
                {selectedAppr.status === "PENDING" || selectedAppr.status === "CHANGES_REQUESTED" ? (
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-gray-400 block font-bold">Administrative Commentary Justification</label>
                      <textarea
                        value={adminComments}
                        onChange={(e) => setAdminComments(e.target.value)}
                        placeholder="Add notes for the company's compliance logs..."
                        className="w-full h-20 bg-neutral-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[10px] leading-relaxed resize-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedAppr, "APPROVED")}
                        disabled={isSubmitting}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve License</span>
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedAppr, "CHANGES_REQUESTED")}
                        disabled={isSubmitting}
                        className="p-2 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/20 text-amber-400 hover:text-white disabled:opacity-50 font-bold rounded-lg transition-all cursor-pointer"
                        title="Request Changes/Re-upload"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(selectedAppr, "REJECTED")}
                        disabled={isSubmitting}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white disabled:opacity-50 font-bold rounded-lg transition-all cursor-pointer"
                        title="Reject Onboarding"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-gray-400 text-[10px]">
                    Onboarding evaluation finalized. State: <strong className="text-white uppercase">{selectedAppr.status}</strong>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-24 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose a company onboarding application to check legal licenses and authorize placement operations.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
