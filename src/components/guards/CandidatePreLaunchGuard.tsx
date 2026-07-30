import React from "react";
import { UserProfile } from "../../types";

interface CandidatePreLaunchGuardProps {
  user: UserProfile | null;
  children: React.ReactNode;
  onNavigateToLogin: () => void;
}

export default function CandidatePreLaunchGuard({
  user,
  children,
  onNavigateToLogin
}: CandidatePreLaunchGuardProps) {
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Candidate Authentication Required</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Please log in with your candidate credentials to view your pre-launch profile.
        </p>
        <button
          onClick={onNavigateToLogin}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          Go to Candidate Login
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
