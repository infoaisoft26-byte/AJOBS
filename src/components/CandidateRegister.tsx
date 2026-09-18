import React from "react";
import CandidateOnboardingWizard from "./CandidateOnboardingWizard";
import { UserProfile } from "../types";

interface CandidateRegisterProps {
  onRegisterSuccess: (userProfile: UserProfile) => void;
  onNavigateToLogin: () => void;
  initialJobId?: string;
  initialStep?: number;
}

export default function CandidateRegister({
  onRegisterSuccess,
  onNavigateToLogin,
  initialJobId,
  initialStep = 1
}: CandidateRegisterProps) {
  return (
    <CandidateOnboardingWizard
      onRegisterSuccess={onRegisterSuccess}
      onNavigateToLogin={onNavigateToLogin}
      initialJobId={initialJobId}
      initialStep={initialStep}
    />
  );
}
