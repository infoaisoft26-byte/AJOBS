import React, { ReactNode } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { UserProfile } from "../../types";
import { normalizeRole } from "../../utils/roleUtils";
interface InternalAccessGuardProps {
  user: UserProfile | null;
  children: React.ReactNode;
  onCandidateRedirect: () => void;
  onNavigateToInternalLogin: () => void;
}

export default function InternalAccessGuard({
  user,
  children,
  onCandidateRedirect,
  onNavigateToInternalLogin
}: InternalAccessGuardProps) {
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-indigo-400 animate-bounce" />
        <h3 className="text-xl font-bold text-white">Internal Access Authentication Required</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Please log in with authorized internal credentials to access this workspace.
        </p>
        <button
          onClick={onNavigateToInternalLogin}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          Go to Internal Login
        </button>
      </div>
    );
  }

  const normRole = normalizeRole(user.role);
  const hasAccess = user.internalAccess === true || user.isBetaTester === true || normRole === "admin";

  if (!hasAccess && normRole === "candidate") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h3 className="text-xl font-bold text-white">Pre-Launch Candidate Access Notice</h3>
        <p className="text-xs text-gray-300 max-w-md leading-relaxed">
          Your full AIJobs dashboard will be available after the official launch. You can currently access your Pre-Launch Candidate Profile.
        </p>
        <button
          onClick={onCandidateRedirect}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          Open Pre-Launch Candidate Profile
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
