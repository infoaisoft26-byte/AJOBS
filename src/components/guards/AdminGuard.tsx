import React from "react";
import { UserProfile } from "../../types";
import { normalizeRole } from "../../utils/roleUtils";
import { ShieldAlert, Lock } from "lucide-react";

interface AdminGuardProps {
  user: UserProfile | null;
  children: React.ReactNode;
  onNavigateToAdminLogin: () => void;
}

export default function AdminGuard({
  user,
  children,
  onNavigateToAdminLogin
}: AdminGuardProps) {
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Lock className="w-12 h-12 text-amber-400 animate-pulse" />
        <h3 className="text-xl font-bold text-white">Administrator Session Required</h3>
        <p className="text-xs text-gray-400 max-w-sm">
          Please authenticate at the System Administrator login portal.
        </p>
        <button
          onClick={onNavigateToAdminLogin}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          Go to Admin Portal Login
        </button>
      </div>
    );
  }

  const normRole = normalizeRole(user.role);

  if (normRole !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h3 className="text-xl font-bold text-white">Access Denied</h3>
        <p className="text-xs text-red-300 max-w-md">
          You do not have Administrator permissions. Your current role is <span className="font-mono uppercase font-bold">{user.role}</span>.
        </p>
        <button
          onClick={onNavigateToAdminLogin}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg"
        >
          Log in with Admin Account
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
