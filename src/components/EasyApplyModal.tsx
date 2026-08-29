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
  const fastApplyKey = `aijobs_fast_apply_${userId}`;
  const [fastApplyEnabled, setFastApplyEnabled] = useState(() => localStorage.getItem(fastApplyKey) === "true");
  const [hasReviewedDetails, setHasReviewedDetails] = useState(() => localStorage.getItem(fastApplyKey) === "true");
  const [rememberForFastApply, setRememberForFastApply] = useState(() => localStorage.getItem(fastApplyKey) === "true");

  const proceedWithApplication = () => {
    if (!hasReviewedDetails) return;
    if (rememberForFastApply) {
      localStorage.setItem(fastApplyKey, "true");
      setFastApplyEnabled(true);
      void handleExecuteApplication();
      return;
    }
    localStorage.removeItem(fastApplyKey);
    setFastApplyEnabled(false);
    setStep("confirm_dialog");
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" id="easy-apply-modal-backdrop">
      <div className="bg-[rgba(4,12,35,0.95)] backdrop-blur-2xl rounded-3xl border border-[rgba(37,99,235,0.45)] shadow-[0_16px_48px_rgba(0,0,0,0.8)] max-w-lg w-full p-6 space-y-5 relative text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Detailed Application Review */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="border-b border-blue-500/20 pb-3 pr-8">
              <span className="text-[11px] font-bold text-cyan-400 font-mono uppercase tracking-wider block">
                {t("confirmApplyTitle")}
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5 tracking-tight">{job.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-300 font-medium">
                <span className="font-bold text-cyan-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  {job.companyName}
                </span>
                {job.location && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {job.location}
                  </span>
                )}
                {job.salary && (
                  <span className="flex items-center gap-1 text-emerald-300 font-semibold font-mono">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    {job.salary}
                  </span>
                )}
              </div>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl text-cyan-300 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            {/* Section 1: Attached Resume Review Card */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-blue-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Attached Resume for Submission
                </span>
                {onUploadResumeClick && (
                  <button
                    onClick={() => {
                      onClose();
                      onUploadResumeClick();
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Change
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/20 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                    PDF
                  </div>
                  <span className="font-semibold text-white truncate max-w-[200px]">{resumeFileName}</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 font-bold text-[10px] border border-emerald-500/40 font-mono shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                  Ready ({resumeScore}% ATS Fit)
                </span>
              </div>
            </div>

            {/* Section 2: Candidate Contact Details Review */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-blue-500/25 space-y-2 text-xs">
              <span className="font-bold text-slate-300 block font-mono">Candidate Contact Information</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block font-mono">Applicant Name</span>
                  <span className="font-bold text-white truncate block mt-0.5">{candidateName}</span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block font-mono">Phone / Mobile</span>
                  <span className="font-bold text-white truncate block mt-0.5">{candidateMobile}</span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-blue-500/20 sm:col-span-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block font-mono">Email Address</span>
                  <span className="font-bold text-white truncate block mt-0.5">{candidateEmail}</span>
                </div>
              </div>
            </div>

            {/* Mandatory Review Checkbox to prevent accidental clicks */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-500/25 bg-slate-950/50 hover:bg-slate-900/60 transition-all cursor-pointer select-none">
              <input
                type="checkbox"
                id="review-details-confirmation-checkbox"
                checked={hasReviewedDetails}
                onChange={(e) => setHasReviewedDetails(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-cyan-500 rounded border-slate-700 bg-slate-900 focus:ring-cyan-400 cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium leading-relaxed">
                I have reviewed my attached resume, experience, and contact details and confirm they are accurate for this application.
              </span>
            </label>

            <label className="flex items-start gap-2.5 px-3 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberForFastApply}
                onChange={(e) => setRememberForFastApply(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900"
              />
              <span>Remember this reviewed profile on this device for faster one-click applications.</span>
            </label>

            {errorMessage && (
              <p className="text-xs text-red-300 font-medium bg-red-950/70 p-3 rounded-xl border border-red-500/40 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithApplication}
                disabled={!hasReviewedDetails || isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{fastApplyEnabled || rememberForFastApply ? (isSubmitting ? "Applying..." : "Fast Apply Now") : "Proceed to Submit"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1.5: Explicit Confirmation Dialog (Accident Prevention) */}
        {step === "confirm_dialog" && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Confirm Job Application</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Are you sure you want to submit your application for <strong className="text-cyan-300">{job.title}</strong> at <strong className="text-white">{job.companyName}</strong>?
              </p>
            </div>

            <div className="p-4 bg-slate-950/70 rounded-2xl border border-blue-500/25 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Resume:</span>
                <span className="font-bold text-white truncate max-w-[200px]">{resumeFileName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Applicant:</span>
                <span className="font-bold text-white">{candidateName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Email:</span>
                <span className="font-bold text-white">{candidateEmail}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-2 border-t border-blue-500/20">
                Once confirmed, your application will be instantly delivered to the hiring recruiter.
              </p>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-300 font-medium bg-red-950/70 p-3 rounded-xl border border-red-500/40">
                {errorMessage}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setStep("review")}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Back to Review
              </button>
              <button
                onClick={handleExecuteApplication}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-cyan-200" />
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
            <div className="w-12 h-12 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight">Resume Required</h2>
              <p className="text-xs text-slate-300 mt-1">{t("missingResumeMsg")}</p>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl text-cyan-300 text-xs flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            <div className="pt-2 flex justify-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all flex items-center space-x-2 cursor-pointer"
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
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">{t("applicationSubmitted")}</h2>
              <p className="text-xs text-slate-300 mt-1">Your profile and resume have been submitted to {job.companyName}.</p>
            </div>

            <div className="p-3 bg-blue-950/60 border border-blue-500/30 rounded-xl text-cyan-300 text-xs flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  onNavigateToApplications();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                {t("viewAppStatus")}
              </button>
              <button
                onClick={() => {
                  onClose();
                  onNavigateToFindJobs();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all cursor-pointer"
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
