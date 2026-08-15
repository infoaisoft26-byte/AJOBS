import React from "react";
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, FileText } from "lucide-react";
import CandidateResumeUploader from "./CandidateResumeUploader";
import { useToast } from "./GlobalToast";

interface ResumeOnboardingProps {
  user: any;
  setUser: (user: any) => void;
  setActiveView: (view: string) => void;
}

export default function ResumeOnboarding({ user, setUser, setActiveView }: ResumeOnboardingProps) {
  const { showToast } = useToast();

  const handleResumeUploaded = (updatedProfile: any) => {
    const nextUser = {
      ...user,
      ...updatedProfile,
      profileCompleted: true,
      profileStatus: "complete"
    };
    setUser(nextUser);
    showToast("Profile created! Redirecting to your Candidate Dashboard...", "success");

    setTimeout(() => {
      window.history.pushState({}, "", "/candidate/dashboard");
      setActiveView("dashboard");
    }, 1200);
  };

  return (
    <div className="container mx-auto px-4 max-w-3xl py-12 flex flex-col items-center justify-center min-h-[75vh]" id="resume-onboarding-view">
      {/* Header */}
      <div className="w-full text-center space-y-3 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 mb-1">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
          Upload Your Resume to Complete Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
          Upload your resume in PDF, DOC, or DOCX format. Our AI parser will extract your skills, work experience, and match you with verified employer openings.
        </p>
      </div>

      {/* Shared CandidateResumeUploader Card */}
      <div className="w-full glass border border-white/10 rounded-3xl p-6 sm:p-8 bg-gray-950/60 shadow-2xl space-y-6">
        <CandidateResumeUploader
          userId={user?.uid}
          profile={user}
          currentResumeUrl={user?.resumeUrl || user?.resumeURL}
          currentResumeName={user?.resumeFileName}
          onResumeUploaded={handleResumeUploaded}
        />

        {/* Footer info bar */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 font-mono">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Account Email: <strong className="text-white">{user?.email || "Candidate"}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Cloudinary Document Storage</span>
          </div>
        </div>
      </div>

      {/* Quick Skip or Go to Dashboard */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={() => {
            window.history.pushState({}, "", "/candidate/dashboard");
            setActiveView("dashboard");
          }}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors cursor-pointer py-2 px-4 rounded-xl hover:bg-white/5"
        >
          <span>Continue to Dashboard without Resume</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
