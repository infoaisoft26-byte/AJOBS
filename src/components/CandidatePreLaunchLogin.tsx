import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  Link,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useState } from "react";

import { UserProfile } from "../types";
import { useToast } from "./GlobalToast";

const googleProvider = new GoogleAuthProvider();

interface CandidatePreLaunchLoginProps {
  onLoginSuccess: (userProfile: UserProfile) => void;
  onNavigateToRegister: () => void;
}

export default function CandidatePreLaunchLogin({
  onLoginSuccess,
  onNavigateToRegister
}: CandidatePreLaunchLoginProps) {
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

  const syncCandidateProfile = async (fbUser: any): Promise<UserProfile> => {
    const userRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const profile: UserProfile = {
        uid: fbUser.uid,
        name: data.name || fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
        email: fbUser.email || "",
        phone: data.phone || "",
        role: "candidate", // Candidates strictly stay as candidate in pre-launch
        isBetaTester: data.isBetaTester ?? false,
        internalAccess: data.internalAccess ?? false,
        accountStatus: data.accountStatus || "active",
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileCompleted: data.profileCompleted ?? false,
        resumeURL: data.resumeURL || "",
      };
      // Update last login timestamp
      await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
      return profile;
    } else {
      // New record fallback
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate",
        email: fbUser.email || "",
        role: "candidate",
        isBetaTester: false,
        internalAccess: false,
        accountStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileCompleted: false,
        resumeURL: ""
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    }
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
      const profile = await syncCandidateProfile(res.user);
      showToast(`Welcome back, ${profile.name}!`, "success");
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error("[Candidate Login Error]:", err);
      let msg = "Invalid login credentials. Please check your email and password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Incorrect email or password. If you haven't registered, click 'Register as Candidate'.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Access temporarily locked due to multiple failed login attempts. Please try again later or reset password.";
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
      const profile = await syncCandidateProfile(res.user);
      showToast(`Google authenticated successfully as ${profile.name}`, "success");
      onLoginSuccess(profile);
    } catch (err: any) {
      console.error("[Candidate Google Auth Error]:", err);
      setErrorMsg("Google Sign-In failed or was cancelled.");
      showToast("Google Authentication cancelled or failed", "warning");
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
      showToast("Password reset link dispatched to your email", "success");
    } catch (err: any) {
      console.error("[Reset Password Error]:", err);
      showToast("Failed to send reset email. Verify your email address.", "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Portal Header */}
        <div className="text-center space-y-3 mb-8 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Candidate Pre-Launch Portal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Candidate Login
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Access your pre-launch candidate profile, upload resumes, and prepare for upcoming AI job matches.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
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
                className="text-xs text-blue-400 hover:underline cursor-pointer"
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
                className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Authenticating Candidate...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-blue-200" />
                <span>Log In as Candidate</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google Sign-In */}
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
          <span>Candidate Sign in with Google</span>
        </button>

        {/* Footer Navigation to Candidate Registration */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-2">
          <p className="text-xs text-gray-400">
            Don't have a candidate account yet?
          </p>
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Register as a Candidate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-gray-950 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Reset Candidate Password</h3>
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
                  Password reset link sent to <span className="text-blue-300 font-mono">{resetEmail}</span>. Check your inbox and follow instructions.
                </p>
                <button
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-xs font-bold text-white rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-3">
                <p className="text-xs text-gray-400">
                  Enter your registered candidate email address and we'll dispatch a secure reset link.
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
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
