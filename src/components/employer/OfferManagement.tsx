import { useState } from "react";
import { 
  Award, FileText, Send, CheckCircle, XCircle, Clock, 
  DollarSign, Calendar, Plus, Download, ChevronRight, Bookmark
} from "lucide-react";
import { CompanyOffer, CompanyApplication, CompanyJob } from "./EmployerTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { NotificationService } from "../../services/notificationService";

interface OfferManagementProps {
  userId: string;
  companyName: string;
  applications: CompanyApplication[];
  offers: CompanyOffer[];
  onRefresh: () => void;
}

export default function OfferManagement({
  userId,
  companyName,
  applications,
  offers,
  onRefresh
}: OfferManagementProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOfferForViewer, setSelectedOfferForViewer] = useState<CompanyOffer | null>(null);

  // Form states
  const [targetAppId, setTargetAppId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [salaryPackage, setSalaryPackage] = useState("");
  const [offerLetterText, setOfferLetterText] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenForm = () => {
    setTargetAppId("");
    setJoiningDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    setSalaryPackage("₹18,50,000 PA");
    setOfferLetterText("");
    setIsFormOpen(true);
  };

  const handleGenerateTemplate = (appId: string) => {
    const selectedApp = applications.find(a => a.id === appId);
    if (!selectedApp) return;

    const text = `DEAR ${selectedApp.candidateName.toUpperCase()},

ACME GLOBAL TECH is thrilled to offer you the position of "${selectedApp.jobTitle.toUpperCase()}" in our Core Division.

POSITION SPECIFICS:
- Title: ${selectedApp.jobTitle}
- Target Compensation Package: ${salaryPackage} (payable monthly)
- Targeted Date of Joining: ${new Date(joiningDate).toLocaleDateString()}
- Corporate HQ Branch: Bengaluru (Hybrid)

ADDITIONAL COMPLIANCES:
- Direct reporting alignment under Department Senior Leads.
- Complete comprehensive workspace hardware provisioning and medical coverage benefits (Self + Family coverage up to ₹8L).

Please confirm your acceptance of this contract terms on or before ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.

Warm regards,
Director of Recruitment & Sourcing
${companyName}`;

    setOfferLetterText(text);
  };

  const handleReleaseOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAppId || !joiningDate || !salaryPackage || !offerLetterText) {
      alert("Please complete candidate, salary, joining date and letter template.");
      return;
    }
    setIsSubmitting(true);

    try {
      const selectedApp = applications.find(a => a.id === targetAppId);
      if (!selectedApp) return;

      const offerId = `coff_${Math.random().toString(36).substr(2, 9)}`;
      const newOffer: CompanyOffer = {
        id: offerId,
        applicationId: selectedApp.id,
        candidateId: selectedApp.candidateId,
        candidateName: selectedApp.candidateName,
        jobId: selectedApp.jobId,
        jobTitle: selectedApp.jobTitle,
        joiningDate,
        salaryPackage,
        offerStatus: "Released",
        acceptanceStatus: "Released for signature",
        createdAt: new Date().toISOString(),
        offerLetterText
      };

      // 1. Write to offers
      await setDoc(doc(db, "offers", offerId), newOffer);

      // 2. Advance application stage in company_applications to "Offer"
      await setDoc(doc(db, "company_applications", selectedApp.id), {
        status: "Offer"
      }, { merge: true });

      // Sync to standard application
      await setDoc(doc(db, "applications", selectedApp.id), {
        status: "offered"
      }, { merge: true });

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "offer",
        description: `Offer letter generated & released for ${selectedApp.candidateName} (${salaryPackage}).`,
        createdAt: new Date().toISOString()
      });

      // Trigger automatic FCM/Push/In-App notifications for Offer Letter Release
      try {
        await NotificationService.triggerEvent({
          userId: selectedApp.candidateId,
          event: "OFFER_LETTER_RECEIVED",
          title: "Offer Letter Released! 🎉",
          message: `Congratulations! ${companyName || "Employer"} has released your official offer letter for the position of "${selectedApp.jobTitle}". Please review and sign.`,
          type: "success",
          link: `jobId=${selectedApp.jobId}`,
          templateName: "Offer Letter",
          templateVars: {
            userName: selectedApp.candidateName,
            jobTitle: selectedApp.jobTitle,
            companyName: companyName || "Employer",
            offerLink: `jobId=${selectedApp.jobId}`
          }
        });

        // Trigger notification for admin
        await NotificationService.triggerEvent({
          userId: "admin",
          event: "PENDING_APPROVALS",
          title: "Offer Letter Dispatched 🚀",
          message: `Employer "${companyName}" released an offer letter to ${selectedApp.candidateName} for "${selectedApp.jobTitle}" with package ${salaryPackage}.`,
          type: "info"
        });
      } catch (notifErr) {
        console.warn("FCM Notification failed during offer release:", notifErr);
      }

      alert(`🎉 Offer released successfully to ${selectedApp.candidateName}!`);
      setIsFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error generating offer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAcceptance = async (offer: CompanyOffer, status: "Accepted" | "Declined") => {
    try {
      await setDoc(doc(db, "offers", offer.id), {
        offerStatus: status,
        acceptanceStatus: status === "Accepted" ? "Signed & Confirmed" : "Declined by candidate"
      }, { merge: true });

      if (status === "Accepted") {
        // Shift application to Joined
        await setDoc(doc(db, "company_applications", offer.applicationId), {
          status: "Joined"
        }, { merge: true });
      }

      alert(`Offer status adjusted to: ${status.toUpperCase()}`);
      if (selectedOfferForViewer?.id === offer.id) {
        setSelectedOfferForViewer({
          ...offer,
          offerStatus: status,
          acceptanceStatus: status === "Accepted" ? "Signed & Confirmed" : "Declined by candidate"
        });
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6" id="offer-management-portal">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <span>Offer Letters & Acceptance Vault</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Formulate official compensation packages, generate printable letterheads, and track execution signs.
          </p>
        </div>

        <button
          onClick={handleOpenForm}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          <span>Release New Offer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Released Offers grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Active Released Offers ({offers.length})</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.length > 0 ? (
                offers.map((off) => (
                  <div key={off.id} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-extrabold text-xs text-white">{off.candidateName}</h5>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{off.jobTitle}</p>
                        </div>

                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                          off.offerStatus === "Accepted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                          off.offerStatus === "Declined" ? "bg-red-500/10 text-red-400 border border-red-500/25" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                        }`}>
                          {off.offerStatus}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[10px] text-gray-400 bg-neutral-950/30 p-2.5 rounded-lg border border-white/5">
                        <p>Joining: <strong className="text-white">{off.joiningDate}</strong></p>
                        <p>CTC Package: <strong className="text-indigo-400">{off.salaryPackage}</strong></p>
                        <p>Sign state: <span className="text-gray-300 italic">{off.acceptanceStatus}</span></p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-2 border-t border-white/5">
                      <button
                        onClick={() => setSelectedOfferForViewer(off)}
                        className="flex-1 py-1 px-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        View Letterhead
                      </button>

                      {off.offerStatus === "Released" && (
                        <>
                          <button
                            onClick={() => handleUpdateAcceptance(off, "Accepted")}
                            className="p-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer border border-emerald-500/20"
                            title="Candidate Signed & Accepted"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleUpdateAcceptance(off, "Declined")}
                            className="p-1 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer border border-red-500/20"
                            title="Candidate Declined"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-16 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-2xl">
                  No offers released to candidates. Select "Release New Offer" to generate.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* High-fidelity Letterhead visualizer */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Printable Letterhead Viewer</span>
            </h4>

            {selectedOfferForViewer ? (
              <div className="space-y-3">
                <div className="p-4 bg-white text-neutral-900 rounded-xl font-serif text-[10px] leading-relaxed max-h-[300px] overflow-y-auto space-y-3 whitespace-pre-line border border-gray-200">
                  <div className="border-b border-gray-200 pb-2 mb-2 text-center text-[11px] font-sans font-black tracking-widest text-indigo-900 uppercase">
                    OFFICIAL CONTRACT • {companyName.toUpperCase()}
                  </div>
                  {selectedOfferForViewer.offerLetterText}
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-xs text-gray-300 font-bold rounded-lg border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Print Offer Contract</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-20 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose an released contract slot to display official letterhead formatting.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Release Offer Interactive form overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <form onSubmit={handleReleaseOffer} className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-4 text-xs">
            <div className="border-b border-white/5 pb-3 flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-white">Formulate Compensation Contract</h4>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Select Candidate application *</label>
              <select
                required
                value={targetAppId}
                onChange={e => {
                  setTargetAppId(e.target.value);
                  // Trigger template calculation
                  setTimeout(() => handleGenerateTemplate(e.target.value), 50);
                }}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white"
              >
                <option value="">Choose candidate...</option>
                {applications.filter(a => a.status === "Interview Scheduled" || a.status === "Final Round" || a.status === "HR Round" || a.status === "Shortlisted").map(a => (
                  <option key={a.id} value={a.id}>{a.candidateName} — {a.jobTitle}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 block">CTC Package Salary *</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    required
                    value={salaryPackage}
                    onChange={e => setSalaryPackage(e.target.value)}
                    placeholder="₹18,00,000 PA"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block">Date of Joining *</label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={e => setJoiningDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-gray-400">Offer letter content</label>
                <button
                  type="button"
                  onClick={() => handleGenerateTemplate(targetAppId)}
                  className="text-indigo-400 hover:underline font-bold"
                >
                  Regenerate Template
                </button>
              </div>
              <textarea
                required
                value={offerLetterText}
                onChange={e => setOfferLetterText(e.target.value)}
                placeholder="Letterhead text contract template..."
                className="w-full h-44 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono text-[10px] leading-relaxed resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Confirm & Release Contract</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
