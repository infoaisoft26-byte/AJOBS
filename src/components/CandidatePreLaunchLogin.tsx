import React, { useState } from "react";
import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Lock, LogIn, Mail, RefreshCw, Sparkles } from "lucide-react";
import { auth, db } from "../firebase";
import { UserProfile } from "../types";
import { useToast } from "./GlobalToast";
import CandidateEmailVerification from "./CandidateEmailVerification";
import { trackLogin } from "../utils/analytics";
import { normalizeRole } from "../utils/roleUtils";
import AIJobsLogo from "./AIJobsLogo";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

interface CandidatePreLaunchLoginProps {
  onLoginSuccess: (userProfile: UserProfile) => void;
  onNavigateToRegister: () => void;
}

export default function CandidatePreLaunchLogin({ onLoginSuccess, onNavigateToRegister }: CandidatePreLaunchLoginProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [unverifiedProfile, setUnverifiedProfile] = useState<UserProfile | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const rolePortalLabel = (role: string) => {
    switch (normalizeRole(role)) {
      case "recruiter": return "Recruiter Login";
      case "consultancy": return "Consultancy Login";
      case "employer": return "Employer Login";
      case "admin":
      case "super_admin": return "Admin Login";
      default: return "the correct AIJOBS login portal";
    }
  };

  const syncCandidateProfile = async (fbUser: any): Promise<UserProfile> => {
    const userRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const storedRole = normalizeRole(data.role);
      if (storedRole !== "candidate") {
        const error: any = new Error(`This account is registered as ${storedRole}. Please use ${rolePortalLabel(data.role)}.`);
        error.code = "role/not-candidate";
        throw error;
      }

      const isEmailVerified = fbUser.emailVerified === true || data.emailVerified === true || data.verificationStatus === "verified";
      const profile: UserProfile = {
        uid: fbUser.uid,
        name: data.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
        email: fbUser.email || data.email || "",
        phone: data.phone || "",
        role: data.role || "candidate",
        isBetaTester: data.isBetaTester ?? false,
        internalAccess: data.internalAccess ?? false,
        verificationStatus: isEmailVerified ? "verified" : (data.verificationStatus || "pending"),
        emailVerified: isEmailVerified,
        accountStatus: isEmailVerified ? "active" : (data.accountStatus || "pending_verification"),
        status: isEmailVerified ? "active" : (data.status || "pending_verification"),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileCompleted: data.profileCompleted ?? false,
        resumeURL: data.resumeURL || data.resumeUrl || "",
      };

      await setDoc(userRef, {
        lastLogin: new Date().toISOString(),
        emailVerified: isEmailVerified,
        verificationStatus: isEmailVerified ? "verified" : (data.verificationStatus || "pending"),
        accountStatus: isEmailVerified ? "active" : (data.accountStatus || "pending_verification"),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return profile;
    }

    const isEmailVerified = fbUser.emailVerified === true;
    const newProfile: UserProfile = {
      uid: fbUser.uid,
      name: fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
      email: fbUser.email || "",
      role: "candidate",
      isBetaTester: false,
      internalAccess: false,
      verificationStatus: isEmailVerified ? "verified" : "pending",
      emailVerified: isEmailVerified,
      accountStatus: isEmailVerified ? "active" : "pending_verification",
      status: isEmailVerified ? "active" : "pending_verification",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileCompleted: false,
      resumeURL: "",
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  };

  const completeCandidateLogin = async (fbUser: any, method: "email" | "google") => {
    if (method === "email") await fbUser.reload();
    const resolvedUser = auth.currentUser || fbUser;
    const profile = await syncCandidateProfile(resolvedUser);

    if (!resolvedUser.emailVerified && !profile.emailVerified) {
      setUnverifiedProfile(profile);
      setShowVerificationScreen(true);
      showToast("Please verify your email to access the Candidate Dashboard.", "warning");
      return;
    }

    trackLogin(method, "candidate");
    showToast(`Welcome back, ${profile.name}!`, "success");
    onLoginSuccess(profile);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email address and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), password);
      await completeCandidateLogin(res.user, "email");
    } catch (err: any) {
      if (err.code === "role/not-candidate") {
        await auth.signOut().catch(() => undefined);
        setErrorMsg(err.message);
        showToast(err.message, "error");
      } else {
        const msg = ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(err.code)
          ? "Incorrect email or password. If you are new, register as a Candidate."
          : err.code === "auth/invalid-email"
            ? "Please enter a valid email address."
            : err.code === "auth/too-many-requests"
              ? "Too many failed attempts. Please try again later or reset your password."
              : "Unable to sign in right now. Please try again.";
        setErrorMsg(msg);
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await completeCandidateLogin(res.user, "google");
    } catch (err: any) {
      if (err.code === "role/not-candidate") {
        await auth.signOut().catch(() => undefined);
        setErrorMsg(err.message);
        showToast(err.message, "error");
      } else if (err.code !== "auth/popup-closed-by-user") {
        const msg = "Google sign-in failed. Please try again or use email and password.";
        setErrorMsg(msg);
        showToast(msg, "warning");
      }
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
      showToast("Password reset email sent.", "success");
    } catch (err) {
      console.error("[Candidate Reset Password Error]:", err);
      showToast("We could not send the reset email. Please verify the address and try again.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  if (showVerificationScreen) {
    return (
      <CandidateEmailVerification
        user={unverifiedProfile}
        onVerified={onLoginSuccess}
        onSignOut={() => {
          setShowVerificationScreen(false);
          setUnverifiedProfile(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center space-y-3 mb-8 relative">
          <div className="flex justify-center mb-2">
            <AIJobsLogo size="md" variant="compact" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Candidate Workspace</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Candidate Login</h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">Access jobs, applications, your profile and resume tools with your registered Candidate account.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="candidate@example.com" autoComplete="email" className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">Password</label>
              <button type="button" onClick={() => { setForgotOpen(true); setResetSent(false); setResetEmail(email); }} className="text-xs text-blue-400 hover:underline">Forgot Password?</button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /><span>Signing In...</span></> : <><LogIn className="w-4 h-4" /><span>Log In as Candidate</span></>}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3"><div className="flex-1 h-px bg-white/10" /><span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">or continue with</span><div className="flex-1 h-px bg-white/10" /></div>

        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
          <span>Continue with Google</span>
        </button>

        <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-2">
          <p className="text-xs text-gray-400">Don't have a candidate account yet?</p>
          <button type="button" onClick={onNavigateToRegister} className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 hover:underline">
            <span>Register as a Candidate</span><ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-blue-400" /><h3 className="text-sm font-bold text-white">Reset Candidate Password</h3></div>
              <button onClick={() => setForgotOpen(false)} className="text-gray-400 hover:text-white text-xs">✕</button>
            </div>
            {resetSent ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-xs text-gray-300">Password reset email sent to <span className="text-blue-300 font-mono">{resetEmail}</span>.</p>
                <button onClick={() => setForgotOpen(false)} className="px-4 py-2 bg-blue-600 text-xs font-bold text-white rounded-xl">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-3">
                <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="candidate@example.com" autoComplete="email" className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
                <button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2">
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
