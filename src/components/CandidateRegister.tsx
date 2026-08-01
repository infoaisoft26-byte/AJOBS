import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  User,
  UserPlus
} from "lucide-react";
import { FormEvent, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import {
  doc,
  setDoc
} from "firebase/firestore";

import { UserProfile } from "../types";
import { useToast } from "./GlobalToast";

const googleProvider = new GoogleAuthProvider();

interface CandidateRegisterProps {
  onRegisterSuccess: (userProfile: UserProfile) => void;
  onNavigateToLogin: () => void;
}

export default function CandidateRegister({
  onRegisterSuccess,
  onNavigateToLogin
}: CandidateRegisterProps) {
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [location, setLocation] = useState("");
  const [emailConsent, setEmailConsent] = useState(false); // Unchecked by default
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const saveCandidateToFirestore = async (uid: string, userEmail: string, nameToSave: string): Promise<UserProfile> => {
    const isoDate = new Date().toISOString();

    // 1. Core user profile document
    const userProfile: UserProfile = {
      uid,
      name: nameToSave,
      email: userEmail,
      phone: phone.trim(),
      role: "candidate", // Strictly candidate role
      isBetaTester: false, // Default false
      internalAccess: false, // Default false
      accountStatus: "active",
      createdAt: isoDate,
      updatedAt: isoDate,
      profileCompleted: false,
      resumeURL: ""
    };

    // Save to 'users' collection
    await setDoc(doc(db, "users", uid), userProfile, { merge: true });

    // 2. Pre-launch Candidate metadata document in 'candidates' collection
    const candidateData = {
      userId: uid,
      uid,
      name: nameToSave,
      email: userEmail,
      phone: phone.trim(),
      targetRole: targetRole.trim() || "Software Engineer",
      location: location.trim() || "Remote / India",
      status: "pre_registered",
      skills: [],
      experience: "Entry / Mid Level",
      emailMarketingConsent: emailConsent,
      emailMarketingConsentAt: isoDate,
      emailMarketingConsentSource: "registration_form",
      createdAt: isoDate,
      updatedAt: isoDate
    };

    await setDoc(doc(db, "candidates", uid), candidateData, { merge: true });

    // 3. Save Email Preferences
    try {
      await fetch(`/api/email/preferences/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobAlerts: emailConsent,
          promotionalEmails: emailConsent,
          weeklyDigest: emailConsent,
          preferredJobRoles: targetRole ? [targetRole.trim()] : [],
          preferredLocations: location ? [location.trim()] : []
        })
      });

      // Dispatch Candidate Welcome Email
      await fetch("/api/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,
          templateName: "candidate-registration",
          data: { candidateName: nameToSave }
        })
      });
    } catch (e) {
      console.warn("Notice: Candidate registration email preferences sync handled gracefully", e);
    }

    return userProfile;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter passwords.");
      return;
    }

    setLoading(true);
    try {
      // Create auth user
      const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(res.user, { displayName: fullName.trim() });

      // Save Firestore user record with candidate role
      const profile = await saveCandidateToFirestore(res.user.uid, res.user.email || email.trim(), fullName.trim());

      showToast(`Registration Successful! Welcome to AIJobs, ${profile.name}!`, "success");
      onRegisterSuccess(profile);
    } catch (err: any) {
      console.error("[Candidate Registration Error]:", err);
      let msg = "Failed to complete candidate registration. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please log in instead or use a different email.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please provide a valid email address.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Choose at least 6 characters.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const displayName = res.user.displayName || fullName.trim() || res.user.email?.split("@")[0] || "Candidate";
      
      const profile = await saveCandidateToFirestore(res.user.uid, res.user.email || "", displayName);

      showToast(`Pre-Registered via Google as ${profile.name}`, "success");
      onRegisterSuccess(profile);
    } catch (err: any) {
      console.error("[Candidate Google Sign Up Error]:", err);
      setErrorMsg("Google Sign-Up failed or was cancelled.");
      showToast("Google Authentication cancelled", "warning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-lg bg-gray-950/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Portal Header */}
        <div className="text-center space-y-3 mb-6 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Candidate Registration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Join AIJobs Pre-Launch
          </h2>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Pre-register your candidate profile today. Gain priority access when our full AI recruitment matchmaking engine launches.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="candidate@gmail.com"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Target Role */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Target Role
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Full Stack Developer"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 chars"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

          </div>

          {/* Email Marketing Consent Checkbox (Optional, Unchecked by default) */}
          <div className="pt-2 text-left">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-300 hover:text-white transition-colors group">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500/40 cursor-pointer"
              />
              <span className="leading-snug text-[11px]">
                Send me relevant job alerts, tailored weekly career recommendations, and AIJobs platform updates by email.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-4"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Pre-Registering Profile...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-blue-200" />
                <span>Register as a Candidate</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">or sign up with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google Sign-Up */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-gray-200 transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
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
          <span>Sign up with Google</span>
        </button>

        {/* Footer Link */}
        <div className="mt-6 pt-5 border-t border-white/5 text-center space-y-1">
          <p className="text-xs text-gray-400">
            Already registered as a candidate?
          </p>
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Already Registered? Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
