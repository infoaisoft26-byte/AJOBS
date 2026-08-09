import React, { FormEvent, useState } from "react";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AlertCircle, CheckCircle2, KeyRound, Link, Lock, LockKeyhole, LogIn, Mail, RefreshCw, Send, User } from "lucide-react";
import { auth, db } from "../firebase";


import { UserProfile } from "../types";
import { useToast } from "./GlobalToast";
import { isAdminRole, normalizeRole } from "../utils/roleUtils";
import { getOrCreateUserProfile } from "../services/dbInitService";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

interface InternalPlatformLoginProps {
  onAuthorizedSuccess: (userProfile: UserProfile, targetInternalRoute: string) => void;
  onCandidateRedirect: () => void;
}

export default function InternalPlatformLogin({
  onAuthorizedSuccess,
  onCandidateRedirect
}: InternalPlatformLoginProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Forgot Password Modal State
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const verifyAndRouteInternalUser = async (fbUser: any) => {
    let profile: UserProfile;
    try {
      profile = await getOrCreateUserProfile(fbUser, undefined, "internal");
    } catch (err) {
      console.error("[Internal Login] Profile resolution failed:", err);
      showToast("Internal user profile authorization failed.", "error");
      return;
    }

    const normRole = normalizeRole(profile.role);
    const hasInternalAccess = profile.internalAccess === true || profile.isBetaTester === true || isAdminRole(profile.role);

    if (!hasInternalAccess && normRole === "candidate") {
      // Un-authorized candidate attempting internal portal login
      showToast("Your full AIJobs dashboard will be available after the official launch. Redirecting to your Pre-Launch Candidate Profile.", "info", 5000);
      onCandidateRedirect();
      return;
    }

    // Determine target internal route based on role
    let targetRoute = "/internal/candidate";
    if (isAdminRole(profile.role)) {
      targetRoute = "/admin/dashboard";
    } else if (normRole === "employer" || normRole === "recruiter") {
      targetRoute = "/internal/employer";
    } else if (normRole === "consultancy") {
      targetRoute = "/internal/consultancy";
    } else if (normRole === "candidate") {
      targetRoute = "/internal/candidate";
    }

    showToast(`Internal Session Authenticated: ${profile.name} (${normRole})`, "success");
    console.log(`[Trace Login] Internal login success - UID: ${profile.uid}, Role: ${profile.role}, Normalized: ${normRole}, TargetRoute: ${targetRoute}`);
    onAuthorizedSuccess(profile, targetRoute);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      await verifyAndRouteInternalUser(res.user);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
        console.warn("[Internal Login]: Invalid credentials provided.", err.code);
      } else {
        console.error("[Internal Login Error]:", err);
      }
      let msg = "Invalid internal login credentials.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Incorrect internal account credentials.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await verifyAndRouteInternalUser(res.user);
    } catch (err: any) {
      console.error("[Internal Google Auth Error]:", err);
      setErrorMsg("Google authentication failed.");
      showToast("Internal Google sign-in failed", "warning");
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
      showToast("Reset password email sent.", "success");
    } catch (err: any) {
      console.error("[Reset Password Error]:", err);
      showToast("Failed to send reset email.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950/85 backdrop-blur-2xl border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.2)] relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-3 mb-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold uppercase tracking-wider">
            <LockKeyhole className="w-3.5 h-3.5 text-indigo-400" />
            <span>Authorized Internal Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Internal Platform Access
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Authorized team members, testers, and recruiters login here to access full workspace features.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
              Authorized Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@aijobs.com"
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setResetSent(false);
                  setResetEmail(email);
                }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Access Claims...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-indigo-200" />
                <span>Enter Internal Platform</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">or authentication</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google Auth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google Internal Sign-In</span>
        </button>

      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Reset Internal Password</h3>
              </div>
              <button
                onClick={() => setForgotOpen(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {resetSent ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-gray-300">
                  Password reset email sent to <span className="text-indigo-300 font-mono">{resetEmail}</span>.
                </p>
                <button
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 bg-indigo-600 text-xs font-bold text-white rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="team@aijobs.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Send Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
