import { auth, db } from "../firebase";
import React, { Dispatch, FormEvent, useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc } from "firebase/firestore";
import { Badge, Check, CheckCircle2, KeyRound, Link, Lock, LogIn, Mail, RefreshCw, Shield, ShieldAlert, ShieldCheck, User } from "lucide-react";
import { UserProfile } from "../types";
import { useToast } from "./GlobalToast";
import { isAdminRole, normalizeRole } from "../utils/roleUtils";
import { getOrCreateUserProfile } from "../services/dbInitService";

interface AdminLoginProps {
  onAdminLoginSuccess: (userProfile: UserProfile) => void;
}

export default function AdminLogin({
  onAdminLoginSuccess
}: AdminLoginProps) {
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

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both admin email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Resolve user profile using strict admin login source
      const profile = await getOrCreateUserProfile(res.user, "admin", "admin");

      if (!isAdminRole(profile.role)) {
        // Sign out non-admin and block access
        await auth.signOut();
        const accessDeniedMsg = "This account does not have Admin access.";
        setErrorMsg(accessDeniedMsg);
        showToast(accessDeniedMsg, "error");
        return;
      }

      showToast(`Administrator authenticated successfully: ${profile.name}`, "success");
      console.log(`[Trace Login] Admin login success - UID: ${profile.uid}, Role: ${profile.role}, Normalized: ${normalizeRole(profile.role)}`);
      onAdminLoginSuccess(profile);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
        console.warn("[Admin Login]: Invalid credentials provided.", err.code);
      } else {
        console.error("[Admin Login Error]:", err);
      }
      let msg = "Invalid Administrator credentials. Please verify your email and password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Incorrect Administrator credentials.";
      } else if (err.message === "Authorized role profile not found" || err.message?.includes("Admin access")) {
        msg = "This account does not have Admin access.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
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
      console.error("[Admin Reset Error]:", err);
      showToast("Failed to send reset link. Ensure email is correct.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-2xl border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(245,158,11,0.15)] relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Admin Shield Badge */}
        <div className="text-center space-y-3 mb-8 relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
            <span>System Administrator Console</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Admin Portal Login
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Restricted security gateway for platform operations, candidate pre-registrations, and internal access governance.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aijobs.com"
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
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
                className="text-xs text-amber-400 hover:underline cursor-pointer"
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
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating Administrator...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-amber-100" />
                <span>Log In to Admin Desk</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-[11px] text-gray-500 font-mono">
            Protected Console • Un-authorized access attempts logged
          </p>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Reset Admin Password</h3>
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
                  Password reset link sent to <span className="text-amber-300 font-mono">{resetEmail}</span>.
                </p>
                <button
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 bg-amber-600 text-xs font-bold text-white rounded-xl"
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
                  placeholder="admin@aijobs.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Dispatch Reset Link"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
