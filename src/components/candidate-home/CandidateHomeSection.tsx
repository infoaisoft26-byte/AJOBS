import React, { useState, useEffect } from "react";
import { UserProfile, JobPosting, JobApplication } from "../../types";
import CandidateAnimatedBackground from "./CandidateAnimatedBackground";
import CandidateHero from "./CandidateHero";
import CandidateTrustStrip from "./CandidateTrustStrip";
import CandidateLiveJobs from "./CandidateLiveJobs";
import CandidateHowItWorks from "./CandidateHowItWorks";
import CandidateFinalCTA from "./CandidateFinalCTA";
import EasyApplyModal from "../EasyApplyModal";
import { useToast } from "../GlobalToast";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

interface Props {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

export default function CandidateHomeSection({
  onGetStarted,
  setActiveView,
  onOpenCompanyPage,
  onSelectJob,
  onOpenAuth,
  user,
}: Props) {
  const { showToast } = useToast();
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobPosting | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(user || null);

  useEffect(() => {
    if (!user?.uid) {
      setCandidateProfile(null);
      return;
    }
    getDoc(doc(db, "candidates", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          setCandidateProfile({ ...user, ...snap.data() });
        } else {
          setCandidateProfile(user);
        }
      })
      .catch(() => setCandidateProfile(user));
  }, [user]);

  const handleApplyClick = (job: JobPosting) => {
    if (!user) {
      if (onOpenAuth) {
        onOpenAuth("signin", "candidate");
      } else {
        onGetStarted();
      }
      return;
    }
    setSelectedJobForApply(job);
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-white selection:bg-blue-500 selection:text-white">
      {/* Cinematic Animated Background with Skyline, Particles, and Glows */}
      <CandidateAnimatedBackground />

      {/* 1. HERO SECTION */}
      <CandidateHero
        onGetStarted={onGetStarted}
        setActiveView={setActiveView}
        user={user}
      />

      {/* 2. TRUST STRIP */}
      <CandidateTrustStrip />

      {/* 3. LIVE JOBS & RIGHT-SIDE REGISTRATION CTA */}
      <CandidateLiveJobs
        setActiveView={setActiveView}
        onSelectJob={onSelectJob}
        onApplyJob={handleApplyClick}
        onGetStarted={onGetStarted}
        user={user}
      />

      {/* 4. HOW IT WORKS */}
      <CandidateHowItWorks />

      {/* 5. FINAL BOTTOM CTA BANNER */}
      <CandidateFinalCTA onGetStarted={onGetStarted} />

      {/* Easy Apply Modal if logged in candidate triggers quick apply */}
      {selectedJobForApply && user && (
        <EasyApplyModal
          job={selectedJobForApply}
          userId={user.uid}
          userName={user.name || "Candidate"}
          profile={candidateProfile || user}
          onClose={() => setSelectedJobForApply(null)}
          onAppliedSuccess={(_app: JobApplication) => {
            showToast("Application submitted successfully!", "success");
            setSelectedJobForApply(null);
          }}
          onNavigateToApplications={() => {
            setSelectedJobForApply(null);
            setActiveView("applications");
          }}
          onNavigateToFindJobs={() => {
            setSelectedJobForApply(null);
            setActiveView("public-jobs");
          }}
          onUploadResumeClick={() => {
            setSelectedJobForApply(null);
            setActiveView("resume-onboarding");
          }}
        />
      )}
    </div>
  );
}
