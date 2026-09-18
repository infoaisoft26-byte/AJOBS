import React, { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2, KeyRound, Lock, LogIn, Mail, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { auth, db } from "../firebase";
import type { UserProfile } from "../types";
import { isAdminRole, normalizeRole } from "../utils/roleUtils";
import { useToast } from "./GlobalToast";
import AIJobsLogo from "./AIJobsLogo";

interface AdminLoginProps {
  onAdminLoginSuccess: (userProfile: UserProfile) => void;
}

const OFFICIAL_ADMIN_EMAIL = "admin@aijobs1.in";
const OFFICIAL_ADMIN_UID = "Emy6ywuYbRNquBpTOYdnbWPUhtp2";

function authErrorMessage(code?: string) {
  switch (code) {
    case "auth/invalid-credential":
      return "Email or password is incorrect. Please try again.";
    case "auth/user-not-found":
      return "No Firebase Authentication account was found for this email.";
    case "auth/wrong-password":
      return "The password is incorrect. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/user-disabled":
      return "This account is currently disabled. Please contact AIJOBS support.";
    case "auth/network-request-failed":
      return "Network connection failed. Please check your internet connection.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Admin login could not be completed. Please try again.";
  }
}

async function loadAdminProfile(fbUser: any): Promise<UserProfile> {
  let adminSnap: any;
  let userSnap: any;
  try {
    adminSnap = await getDoc(doc(db, "admins", fbUser.uid));
    userSnap = await getDoc(doc(db, "users", fbUser.uid));
  } catch (error) {
    console.error("[AdminLogin] Firestore profile lookup failed:", error);
    throw new Error("ADMIN_PROFILE_LOOKUP_FAILED");
  }

  const adminData = adminSnap.exists() ? adminSnap.data() : null;
  const userData = userSnap.exists() ? userSnap.data() : null;

  if (!adminData && !userData) {
    throw new Error("ADMIN_PROFILE_MISSING");
  }

  const adminAuthorized = isAdminRole(adminData?.role);
  const userAuthorized = isAdminRole(userData?.role);
  if (!adminAuthorized && !userAuthorized) {
    throw new Error("ADMIN_ROLE_MISMATCH");
  }

  const sourceData = adminAuthorized ? adminData : userData;
  const profilePath = adminAuthorized ? `admins/${fbUser.uid}` : `users/${fbUser.uid}`;
  const role = normalizeRole(sourceData.role) === "super_admin" ? "superadmin" : "admin";

  console.info("[AdminLogin] Admin profile authorized.", {
    uid: fbUser.uid,
    email: fbUser.email,
    profilePath,
    role,
  });

  return {
    ...sourceData,
    uid: fbUser.uid,
    email: fbUser.email || sourceData.email || "",
    name: sourceData.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Administrator",
    role,
    createdAt: sourceData.createdAt || new Date().toISOString(),
  } as UserProfile;
}

function isOfficialAdminAccount(fbUser: any) {
  return fbUser?.uid === OFFICIAL_ADMIN_UID && String(fbUser?.email || "").trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL;
}

async function repairOfficialAdminProfile(fbUser: any): Promise<void> {
  if (!isOfficialAdminAccount(fbUser)) {
    throw new Error("OFFICIAL_ADMIN_IDENTITY_MISMATCH");
  }

  const idToken = await fbUser.getIdToken();
  const response = await fetch("/api/bootstrap-superadmin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ name: "AIJOBS Admin" }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.error || "OFFICIAL_ADMIN_PROFILE_REPAIR_FAILED");
  }

  if (payload?.uid && payload.uid !== OFFICIAL_ADMIN_UID) {
    throw new Error("OFFICIAL_ADMIN_UID_MISMATCH");
  }

  await fbUser.getIdToken(true);
}

export default function AdminLogin({ onAdminLoginSuccess }: AdminLoginProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const fail = (message: string) => {
    setErrorMsg(message);
    showToast(message, "error");
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both admin email and password.");
      return;
    }

    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.info("[AdminLogin] Firebase Authentication succeeded.", {
        uid: credential.user.uid,
        email: credential.user.email,
      });

      let profile: UserProfile;
      try {
        profile = await loadAdminProfile(credential.user);
      } catch (profileError: any) {
        const canRepairOfficialAdmin =
          isOfficialAdminAccount(credential.user) &&
          (profileError?.message === "ADMIN_PROFILE_MISSING" || profileError?.message === "ADMIN_ROLE_MISMATCH");

        if (canRepairOfficialAdmin) {
          try {
            console.info("[AdminLogin] Repairing official Admin Firestore profile.");
            await repairOfficialAdminProfile(credential.user);
            profile = await loadAdminProfile(credential.user);
          } catch (repairError) {
            console.error("[AdminLogin] Official Admin profile repair failed:", repairError);
            await signOut(auth);
            fail("Admin authentication succeeded, but the official Admin profile could not be initialized. Please contact the system owner.");
            return;
          }
        } else {
          await signOut(auth);
          if (profileError?.message === "ADMIN_PROFILE_MISSING") {
            fail("Admin account authenticated, but admin profile is missing.");
          } else if (profileError?.message === "ADMIN_ROLE_MISMATCH") {
            fail("This account does not have Admin access.");
          } else {
            console.error("[AdminLogin] Admin profile verification failed:", profileError);
            fail("Admin account authenticated, but the admin profile could not be verified. Please try again.");
          }
          return;
        }
      }

      showToast(`Administrator authenticated successfully: ${profile.name}`, "success");
      onAdminLoginSuccess(profile);
    } catch (err: any) {
      console.error("[AdminLogin] Firebase Authentication failed.", {
        code: err?.code || "unknown",
        message: err?.message || "Unknown Firebase Auth error",
        email: email.trim(),
      });
      fail(authErrorMessage(err?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
      showToast("Password reset link sent to admin email address.", "success");
    } catch (err: any) {
      console.error("[AdminLogin] Password reset failed.", {
        code: err?.code,
        message: err?.message,
        email: resetEmail.trim(),
      });
      fail(authErrorMessage(err?.code));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950 border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] relative overflow-hidden">
        <div className="text-center space-y-3 mb-8 relative">
          <div className="flex justify-center mb-2">
            <AIJobsLogo size="md" variant="compact" />
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>System Administrator Console</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Admin Portal Login</h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Restricted security gateway for platform operations and account governance.</p>
        </div>

        {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2"><ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" /><span>{errorMsg}</span></div>}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Admin Email</label>
            <div className="relative"><Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={OFFICIAL_ADMIN_EMAIL} autoComplete="username" className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500" /></div>
          </div>

          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between"><label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Password</label><button type="button" onClick={() => { setForgotOpen(true); setResetSent(false); setResetEmail(email); }} className="text-xs text-amber-400 hover:underline cursor-pointer">Forgot Password?</button></div>
            <div className="relative"><Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500" /></div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin text-white" /><span>Authenticating Administrator...</span></> : <><LogIn className="w-4 h-4 text-amber-100" /><span>Log In to Admin Desk</span></>}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center"><p className="text-[11px] text-gray-500 font-mono">Protected Console • Unauthorized access attempts logged</p></div>
      </div>

      {forgotOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"><div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-white/10 pb-3"><div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-400" /><h3 className="text-sm font-bold text-white">Reset Admin Password</h3></div><button onClick={() => setForgotOpen(false)} className="text-gray-400 hover:text-white text-xs">✕</button></div>
        {resetSent ? <div className="text-center py-4 space-y-3"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" /><p className="text-xs text-gray-300">Password reset link sent to <span className="text-amber-300 font-mono">{resetEmail}</span>.</p><button onClick={() => setForgotOpen(false)} className="px-4 py-2 bg-amber-600 text-xs font-bold text-white rounded-xl">Close</button></div> : <form onSubmit={handleSendReset} className="space-y-3"><input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder={OFFICIAL_ADMIN_EMAIL} autoComplete="username" className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500" /><button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">{resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Dispatch Reset Link"}</button></form>}
      </div></div>}
    </div>
  );
}
