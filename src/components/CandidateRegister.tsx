import React from "react";
import CandidateRegistrationFlow from "./CandidateRegistrationFlow";
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
  initialJobId
}: CandidateRegisterProps) {
  return (
    <CandidateRegistrationFlow
      onRegisterSuccess={onRegisterSuccess}
      onNavigateToLogin={onNavigateToLogin}
      initialJobId={initialJobId}
    />
  );
}
