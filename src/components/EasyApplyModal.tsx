import React, { useState } from "react";
import { X, CheckCircle2, FileText, Upload, ShieldCheck, ArrowRight } from "lucide-react";
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

  const [step, setStep] = useState<"confirm" | "missing_resume" | "success">(() => {
    const hasResume = Boolean(profile?.resumeUrl || profile?.resumeText || resumeText);
    return hasResume ? "confirm" : "missing_resume";
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resumeFileName = profile?.resumeFileName || "Candidate_Resume.pdf";
  const candidateEmail = profile?.email || profile?.profileDetails?.email || "candidate@example.com";
  const candidateMobile = profile?.profileDetails?.mobileNumber || profile?.mobile || "Not provided";

  const handleConfirmApply = async () => {
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
          candidateName: profile?.name || userName,
          jobTitle: job.title,
          companyName: job.companyName,
          status: "Applied",
          appliedAt: new Date().toISOString(),
          resumeScore: profile?.resumeScore || 80
        };
        onAppliedSuccess(newApp);
        setStep("success");
      } else {
        setErrorMessage(result.message || "Failed to submit application. Please try again.");
      }
    } catch (err: any) {
      console.error("Apply error:", err);
      setErrorMessage(err.message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-lg w-full p-6 space-y-5 relative text-gray-900">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Confirmation */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-3 pr-8">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">
                {t("confirmApplyTitle")}
              </span>
              <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-sm font-semibold text-blue-700 mt-0.5">{job.companyName}</p>
            </div>

            {/* Safety Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{t("safetyNotice")}</span>
            </div>

            {/* Application Summary Details */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{t("resumeBeingUsed")}</span>
                <span className="text-xs font-bold text-gray-900 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate max-w-[180px]">{resumeFileName}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{t("mobileNumber")}</span>
                <span className="text-xs font-semibold text-gray-900">{candidateMobile}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{t("email")}</span>
                <span className="text-xs font-semibold text-gray-900">{candidateEmail}</span>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-200">
                {errorMessage}
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
                onClick={handleConfirmApply}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <span>{t("confirmAndApply")}</span>
                    <ArrowRight className="w-4 h-4" />
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
