import React from "react";
import { UserProfile } from "../types";
import CandidateHomeSection from "./candidate-home/CandidateHomeSection";

interface Props {
  onGetStarted: () => void;
  setActiveView: (view: string) => void;
  onOpenCompanyPage?: (pageType: string) => void;
  onSelectJob?: (jobId: string) => void;
  onOpenAuth?: (mode: "signin" | "signup", role?: "candidate" | "consultancy" | "employer") => void;
  user?: UserProfile | null;
}

export default function PremiumCandidateHomepage({
  onGetStarted,
  setActiveView,
  onOpenCompanyPage,
  onSelectJob,
  onOpenAuth,
  user,
}: Props) {
  return (
    <CandidateHomeSection
      onGetStarted={onGetStarted}
      setActiveView={setActiveView}
      onOpenCompanyPage={onOpenCompanyPage}
      onSelectJob={onSelectJob}
      onOpenAuth={onOpenAuth}
      user={user}
    />
  );
}
