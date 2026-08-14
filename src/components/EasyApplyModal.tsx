import React, { useState } from "react";
import { X, CheckCircle2, FileText, Upload, ShieldCheck, ArrowRight, AlertCircle, Building2, MapPin, DollarSign, Check, Edit3 } from "lucide-react";
import { JobPosting, JobApplication } from "../types";
import { applyToJob } from "../services/applicationService";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface EasyApplyModalProps {
  job: JobPosting;
  userId: string;
  userName: string;
  profile: any;
  resumeText?: string;
  onClose: () => void;
  onAppliedSuccess: (newApp: JobApplication) => void;
  onNavigateToApplications: () => void;
  onNavigateToFindJobs: () => void;
  lang?: SupportedLanguage;
  onUploadResumeClick?: () => void;
}

export default function EasyApplyModal({
  job,
  userId,
  userName,
  profile,
  resumeText,
  onClose,
  onAppliedSuccess,
  onNavigateToApplications,
  onNavigateToFindJobs,
  lang = "en",
  onUploadResumeClick
}: EasyApplyModalProps) {
  const t = (key: string) => getTranslation(lang, key);

  const [step, setStep] = useState<"review" | "confirm_dialog" | "missing_resume" | "success">(() => {
    const hasResume = Boolean(profile?.resumeUrl || profile?.resumeText || resumeText);
    return hasResume ? "review" : "missing_resume";
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasReviewedDetails, setHasReviewedDetails] = useState(false);

  const resumeFileName = profile?.resumeFileName || (profile?.resumeUrl ? "Uploaded_Resume.pdf" : "Candidate_Resume.pdf");
  const candidateEmail = profile?.email || profile?.profileDetails?.email || "candidate@example.com";
  const candidateMobile = profile?.profileDetails?.mobileNumber || profile?.mobile || "Not provided";
  const candidateName = profile?.name || profile?.fullName || userName || "Candidate";
  const resumeScore = profile?.resumeScore || 85;

  const handleExecuteApplication = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const activeResumeText = resumeText || profile?.resumeText || "Resume Attached";
      const result = await applyToJob(job, userId, profile, activeResumeText);

      if (result.success) {
        const appId = result.applicationId || `app_${Math.random().toString(36).substring(2, 11)}`;
        const newApp: JobApplication = {
          id: appId,
          jobId: job.id,
          candidateId: userId,
          candidateName: candidateName,
          jobTitle: job.title,
          companyName: job.companyName,
          status: "Applied",
          appliedAt: new Date().toISOString(),
          resumeScore: resumeScore
        };
        onAppliedSuccess(newApp);
        setStep("success");
      } else {
        setErrorMessage(result.message || "Failed to submit application. Please try again.");
        setStep("review");
      }
    } catch (err: any) {
      console.error("Apply error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
      setStep("review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" id="easy-apply-modal-backdrop">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative text-gray-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Detailed Application Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3 pr-8">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                {t("confirmApplyTitle")}
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">{job.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-600 font-medium">
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  {job.companyName}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    {job.salary}
                  </span>
                )}
              </div>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            {/* Section 1: Attached Resume Review Card */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Attached Resume for Submission
                </span>
                {onUploadResumeClick && (
                  <button
                    onClick={() => {
                      onClose();
                      onUploadResumeClick();
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Change
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    PDF
                  </div>
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">{resumeFileName}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                  Ready ({resumeScore}% ATS Fit)
                </span>
              </div>
            </div>

            {/* Section 2: Candidate Contact Details Review */}
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <span className="font-bold text-gray-700 block">Candidate Contact Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Applicant Name</span>
                  <span className="font-bold text-gray-900 truncate block mt-0.5">{candidateName}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-200">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Phone / Mobile</span>
                  <span className="font-bold text-gray-900 truncate block mt-0.5">{candidateMobile}</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-200 sm:col-span-2">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">Email Address</span>
                  <span className="font-bold text-gray-900 truncate block mt-0.5">{candidateEmail}</span>
                </div>
              </div>
            </div>

            {/* Mandatory Review Checkbox to prevent accidental clicks */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50/80 transition-all cursor-pointer select-none">
              <input
                type="checkbox"
                id="review-details-confirmation-checkbox"
                checked={hasReviewedDetails}
                onChange={(e) => setHasReviewedDetails(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-gray-700 font-medium leading-relaxed">
                I have reviewed my attached resume, experience, and contact details and confirm they are accurate for this application.
              </span>
            </label>

            {errorMessage && (
              <p className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep("confirm_dialog")}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Proceed to Submit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1.5: Explicit Confirmation Dialog (Accident Prevention) */}
        {step === "confirm_dialog" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Confirm Job Application</h2>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Are you sure you want to submit your application for <strong>{job.title}</strong> at <strong>{job.companyName}</strong>?
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>Resume:</span>
                <span className="font-bold text-gray-900 truncate max-w-[200px]">{resumeFileName}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Applicant:</span>
                <span className="font-bold text-gray-900">{candidateName}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Email:</span>
                <span className="font-bold text-gray-900">{candidateEmail}</span>
              </div>
              <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200">
                Once confirmed, your application will be instantly delivered to the hiring recruiter.
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200">
                {errorMessage}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setStep("review")}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Back to Review
              </button>
              <button
                onClick={handleExecuteApplication}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Yes, Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Missing Resume */}
        {step === "missing_resume" && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">Resume Required</h2>
              <p className="text-xs text-gray-600 mt-1">{t("missingResumeMsg")}</p>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            <div className="pt-2 flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onUploadResumeClick) {
                    onUploadResumeClick();
                  }
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{t("uploadResume")}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === "success" && (
          <div className="space-y-5 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("applicationSubmitted")}</h2>
              <p className="text-xs text-gray-500 mt-1">Your profile and resume have been submitted to {job.companyName}.</p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToApplications();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {t("viewAppStatus")}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToFindJobs();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                {t("findMoreJobs")}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

