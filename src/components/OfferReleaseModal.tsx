import {
  Award,
  Send,
  X
} from "lucide-react";
import { FormEvent, useState } from "react";
import {
  doc,
  setDoc
} from "firebase/firestore";
import { NotificationService } from "../services/notificationService";

interface OfferReleaseModalProps {
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
  recruiterName?: string;
  onSuccess?: () => void;
}

export default function OfferReleaseModal({
  isOpen,
  onClose,
  application,
  recruiterName = "Hiring Director",
  onSuccess
}: OfferReleaseModalProps) {
  const [formData, setFormData] = useState({
    designation: application?.jobTitle || "Senior Software Engineer",
    companyName: application?.companyName || "AIJobs Partner Network",
    annualCtc: "$145,000 / annum",
    joiningDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    offerValidUntil: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    location: "Bengaluru, India (Hybrid)",
    probationPeriod: "3 Months",
    specialTerms: "Includes stock options, comprehensive health insurance for family, and yearly learning allowance."
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !application) return null;

  // Generate Official Offer Letter PDF Data URI using jsPDF
  const generateOfferLetterPdfDataUri = (): string => {
    const docPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Outer Navy Border
    docPdf.setDrawColor(15, 23, 42);
    docPdf.setLineWidth(1);
    docPdf.rect(8, 8, 194, 281);

    // Header Background
    docPdf.setFillColor(15, 23, 42);
    docPdf.rect(10, 10, 190, 35, "F");

    // Header Text
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(20);
    docPdf.text(formData.companyName.toUpperCase(), 16, 25);

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9);
    docPdf.setTextColor(129, 140, 248);
    docPdf.text("OFFICIAL EMPLOYMENT OFFER & APPOINTMENT LETTER", 16, 33);

    // Accent line
    docPdf.setFillColor(99, 102, 241);
    docPdf.rect(10, 45, 190, 1.5, "F");

    // Metadata Block
    docPdf.setTextColor(51, 65, 85);
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.text("DATE OF ISSUE:", 16, 56);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 50, 56);

    docPdf.setFont("helvetica", "bold");
    docPdf.text("CANDIDATE:", 16, 62);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(application.candidateName, 50, 62);

    docPdf.setFont("helvetica", "bold");
    docPdf.text("POSITION:", 16, 68);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(formData.designation, 50, 68);

    // Divider
    docPdf.setDrawColor(226, 232, 240);
    docPdf.line(16, 74, 194, 74);

    // Body Text
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(11);
    docPdf.setTextColor(15, 23, 42);
    docPdf.text(`Dear ${application.candidateName},`, 16, 84);

    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(9.5);
    docPdf.setTextColor(51, 65, 85);

    const bodyMsg = `We are pleased to extend this offer of employment for the position of ${formData.designation} at ${formData.companyName}. Following our evaluation process, we were extremely impressed with your skills and background.`;
    const splitBody = docPdf.splitTextToSize(bodyMsg, 175);
    docPdf.text(splitBody, 16, 92);

    // Key Terms Table
    docPdf.setFillColor(248, 250, 252);
    docPdf.roundedRect(16, 110, 178, 55, 2, 2, "F");

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.setTextColor(99, 102, 241);
    docPdf.text("COMPENSATION & POSITION TERMS", 22, 118);

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(9);
    docPdf.setTextColor(15, 23, 42);

    docPdf.text("Annual CTC / Salary Package:", 22, 126);
    docPdf.text("Designated Title:", 22, 133);
    docPdf.text("Joining Date:", 22, 140);
    docPdf.text("Work Location:", 22, 147);
    docPdf.text("Probation Period:", 22, 154);

    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(51, 65, 85);

    docPdf.text(formData.annualCtc, 85, 126);
    docPdf.text(formData.designation, 85, 133);
    docPdf.text(formData.joiningDate, 85, 140);
    docPdf.text(formData.location, 85, 147);
    docPdf.text(formData.probationPeriod, 85, 154);

    // Special Terms
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(15, 23, 42);
    docPdf.text("Additional Benefits & Terms:", 16, 175);

    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(71, 85, 105);
    const splitTerms = docPdf.splitTextToSize(formData.specialTerms, 175);
    docPdf.text(splitTerms, 16, 182);

    // Acceptance clause
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`This offer remains valid until ${formData.offerValidUntil}. Please confirm your acceptance by signing and returning a copy.`, 16, 205);

    // Signatures
    docPdf.setFont("helvetica", "bold");
    docPdf.text("For " + formData.companyName, 16, 235);
    docPdf.text("Candidate Acceptance Signature", 120, 235);

    docPdf.setFont("helvetica", "italic");
    docPdf.text(recruiterName, 16, 250);
    docPdf.text(application.candidateName, 120, 250);

    // Footer
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(7.5);
    docPdf.setTextColor(148, 163, 184);
    docPdf.text("AIJOBS ENTERPRISE PLATFORM GENERATED OFFER • STAMPED & AUTHENTICATED", 16, 275);

    return docPdf.output("datauristring");
  };

  const handleReleaseOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const offerId = `offer_${Math.random().toString(36).substring(2, 11)}`;
      const nowIso = new Date().toISOString();
      const pdfDataUri = generateOfferLetterPdfDataUri();

      const offerRecord = {
        id: offerId,
        applicationId: application.id,
        jobId: application.jobId,
        jobTitle: application.jobTitle,
        candidateId: application.candidateId,
        candidateName: application.candidateName,
        candidateEmail: application.candidateEmail || `${application.candidateId}@aijobs.global`,
        companyName: formData.companyName,
        designation: formData.designation,
        annualCtc: formData.annualCtc,
        joiningDate: formData.joiningDate,
        offerValidUntil: formData.offerValidUntil,
        location: formData.location,
        specialTerms: formData.specialTerms,
        pdfDataUri,
        status: "Released",
        releasedAt: nowIso,
        releasedBy: recruiterName
      };

      if (db) {
        // 1. Save offer record
        await setDoc(doc(db, "offers", offerId), offerRecord);

        // 2. Update application status
        await setDoc(doc(db, "applications", application.id), {
          status: "Offer Released",
          offerId,
          offerDetails: {
            annualCtc: formData.annualCtc,
            joiningDate: formData.joiningDate,
            location: formData.location
          },
          updatedAt: nowIso
        }, { merge: true });

        // 3. Dispatch Candidate Notification
        await NotificationService.createNotification({
          userId: application.candidateId,
          type: "offer",
          title: `🎉 Offer Letter Released: ${application.jobTitle}`,
          message: `Congratulations! ${formData.companyName} has issued your official offer letter for ${formData.designation}. CTC: ${formData.annualCtc}. Click to view and download.`,
          link: "/candidate/dashboard",
          read: false,
          createdAt: nowIso
        });

        // 4. Send email notification
        try {
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: application.candidateEmail || `${application.candidateId}@aijobs.global`,
              subject: `🎉 Official Employment Offer Letter: ${formData.designation} at ${formData.companyName}`,
              body: `Dear ${application.candidateName},\n\nWe are excited to present your official Offer Letter for the position of ${formData.designation} at ${formData.companyName}.\n\nOffer Overview:\n- Annual Package: ${formData.annualCtc}\n- Joining Date: ${formData.joiningDate}\n- Location: ${formData.location}\n\nYou can view, download, and accept your formal offer letter directly in your AIJobs candidate portal.\n\nWarm regards,\n${recruiterName}\n${formData.companyName}`
            })
          });
        } catch (eErr) {
          console.warn("Offer email dispatch notice:", eErr);
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Offer release error:", err);
      setErrorMsg(err.message || "Failed to release offer letter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Award className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Release Candidate Offer Letter</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
          <p className="font-bold text-emerald-300">{application.candidateName}</p>
          <p className="text-gray-300">{application.jobTitle} • {application.companyName}</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleReleaseOffer} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Designated Job Title</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Annual CTC / Salary</label>
              <input
                type="text"
                value={formData.annualCtc}
                onChange={(e) => setFormData({ ...formData, annualCtc: e.target.value })}
                placeholder="E.g. $145,000 / annum"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Offer Valid Until</label>
              <input
                type="date"
                value={formData.offerValidUntil}
                onChange={(e) => setFormData({ ...formData, offerValidUntil: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Work Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-300 font-medium">Probation Period</label>
              <input
                type="text"
                value={formData.probationPeriod}
                onChange={(e) => setFormData({ ...formData, probationPeriod: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-gray-300 font-medium">Special Terms & Benefits</label>
            <textarea
              rows={2}
              value={formData.specialTerms}
              onChange={(e) => setFormData({ ...formData, specialTerms: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Generating PDF..." : "Generate & Release Offer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
