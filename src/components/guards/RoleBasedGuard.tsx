import React, { useEffect, useState, ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { AlertCircle, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { db, auth } from "../../firebase";
import { UserProfile } from "../../types";
import { normalizeRole, isAdminRole } from "../../utils/roleUtils";
import { useToast } from "../GlobalToast";

interface RoleBasedGuardProps {
  user: UserProfile | null;
  allowedRoles: string[]; // e.g. ["candidate"], ["employer", "recruiter"], ["admin", "super_admin"]
  children: ReactNode;
  fallbackView?: string;
  setActiveView: (view: string) => void;
  onUnauthorized?: () => void;
}

export default function RoleBasedGuard({
  user,
  allowedRoles,
  children,
  fallbackView = "home",
  setActiveView,
  onUnauthorized
}: RoleBasedGuardProps) {
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [denialReason, setDenialReason] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyDatabasePermissions() {
      // 1. If not authenticated at all
      if (!user?.uid || !auth.currentUser) {
        if (isMounted) {
          setIsAuthorized(false);
          setDenialReason("unauthenticated");
          setVerifying(false);
        }
        return;
      }

      try {
        setVerifying(true);
        const uid = auth.currentUser.uid;

        // 2. Query Firestore directly (not trusting localStorage or client-side mutability)
        let verifiedRole = "candidate";
        let isSuspended = false;

        // Check admins collection
        const adminDoc = await getDoc(doc(db, "admins", uid));
        if (adminDoc.exists()) {
          const admData = adminDoc.data();
          verifiedRole = admData.role || "admin";
          if (admData.status === "disabled" || admData.isLocked) {
            isSuspended = true;
          }
        } else {
          // Check users collection
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            verifiedRole = uData.role || "candidate";
            if (uData.status === "disabled" || uData.isLocked || uData.accountStatus === "suspended") {
              isSuspended = true;
            }
          } else {
            // Check candidates collection
            const candDoc = await getDoc(doc(db, "candidates", uid));
            if (candDoc.exists()) {
              verifiedRole = "candidate";
            }
          }
        }

        if (isSuspended) {
          if (isMounted) {
            setIsAuthorized(false);
            setDenialReason("suspended");
            setVerifying(false);
            showToast("Your account is currently suspended. Please contact support.", "error");
          }
          return;
        }

        const normalizedVerifiedRole = normalizeRole(verifiedRole);
        const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));

        // Super Admin has access to all admin routes
        const hasPermission = 
          normalizedAllowedRoles.includes(normalizedVerifiedRole) ||
          (isAdminRole(normalizedVerifiedRole) && normalizedAllowedRoles.some(r => isAdminRole(r)));

        if (isMounted) {
          if (hasPermission) {
            setIsAuthorized(true);
            setDenialReason(null);
          } else {
            setIsAuthorized(false);
            setDenialReason(`Role '${normalizedVerifiedRole}' is not permitted for this workspace.`);
            showToast("Unauthorized workspace access attempt prevented.", "error");
          }
          setVerifying(false);
        }
      } catch (err) {
        console.error("[RoleBasedGuard] Database permission verification error:", err);
        if (isMounted) {
          // Fallback check against in-memory user if offline or network error
          const memoryNormRole = normalizeRole(user.role);
          const hasMemoryPermission = allowedRoles.map(r => normalizeRole(r)).includes(memoryNormRole);
          setIsAuthorized(hasMemoryPermission);
          setDenialReason(hasMemoryPermission ? null : "Database authorization check failed.");
          setVerifying(false);
        }
      }
    }

    verifyDatabasePermissions();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, user?.role, allowedRoles]);

  // Loading state while verifying against live database
  if (verifying) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
          <ShieldCheck className="w-6 h-6 text-blue-500" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">Verifying Workspace Authorization</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Querying security credentials...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (denialReason === "unauthenticated" || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-lg border border-blue-100">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Authentication Required</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Please sign in to access this designated workspace portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onUnauthorized) onUnauthorized();
              setActiveView("unified-login");
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Go to Unified Login
          </button>
          <button
            onClick={() => {
              setActiveView(fallbackView);
              if (typeof window !== "undefined") window.history.pushState({}, "", "/");
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Unauthorized role
  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-lg border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Access Denied</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Your verified account role does not have authorization to access this portal.
          </p>
          {denialReason && (
            <p className="text-[11px] font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-900/50">
              {denialReason}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            if (onUnauthorized) onUnauthorized();
            setActiveView("home");
            if (typeof window !== "undefined") window.history.pushState({}, "", "/");
          }}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-lg transition-all cursor-pointer"
        >
          Return to Homepage
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
