import React, { useEffect, useRef, useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  KeyRound, 
  LogOut, 
  Mail, 
  RefreshCw, 
  Send, 
  ShieldCheck, 
  Sparkles 
} from "lucide-react";
import { auth, db } from "../firebase";
import { UserProfile } from "../types";
import { getOrCreateUserProfile } from "../services/dbInitService";
import { initializeCandidateProfileAfterOtpVerification } from "../services/candidateProfileService";
import { useToast } from "./GlobalToast";

interface CandidateEmailVerificationProps {
  user: UserProfile | null;
  candidateName?: string;
  onVerified: (updatedProfile: UserProfile) => void;
  onSignOut?: () => void;
}

export default function CandidateEmailVerification({
  user,
  candidateName,
  onVerified,
  onSignOut
}: CandidateEmailVerificationProps) {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 6-digit OTP inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = auth.currentUser?.email || user?.email || "";
  const nameToDisplay = candidateName || user?.name || "Candidate";

  // 60-second resend cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle individual digit input
  const handleDigitChange = (index: number, value: string) => {
    setErrorMsg("");
    const cleaned = value.replace(/\D/g, "");

    if (cleaned.length === 0) {
      const newDigits = [...otpDigits];
      newDigits[index] = "";
      setOtpDigits(newDigits);
      return;
    }

    if (cleaned.length === 1) {
      const newDigits = [...otpDigits];
      newDigits[index] = cleaned;
      setOtpDigits(newDigits);

      // Advance to next box
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (cleaned.length === 6) {
      // Pasted full 6-digit code
      const pastedDigits = cleaned.split("").slice(0, 6);
      setOtpDigits(pastedDigits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length > 0) {
      const digits = pastedData.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // 1. Verify OTP with Server
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join("");

    if (fullOtp.length !== 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.");
      return;
    }

    setErrorMsg("");
    setIsVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/candidate/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: fullOtp
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Invalid or expired verification code. Please check and try again.");
        showToast(data.message || "Verification failed.", "error");
        return;
      }

      // Initialize candidateProfiles/{uid} document with profileStatus: 'incomplete'
      const uid = auth.currentUser?.uid || user?.uid;
      const nowIso = new Date().toISOString();

      if (uid) {
        await initializeCandidateProfileAfterOtpVerification(uid, {
          email: email.trim(),
          fullName: nameToDisplay
        });
      }

      setSuccessMsg("Email successfully verified!");
      showToast("Email verified! Welcome to AIJOBS Candidate Portal.", "success");

      let updatedProfile: UserProfile;
      if (auth.currentUser) {
        updatedProfile = await getOrCreateUserProfile(auth.currentUser);
      } else {
        updatedProfile = {
          ...(user || {}),
          uid: uid || "candidate_user",
          name: nameToDisplay,
          email: email.trim(),
          role: "candidate",
          emailVerified: true,
          verificationStatus: "verified",
          accountStatus: "active",
          status: "active",
          createdAt: nowIso,
          updatedAt: nowIso,
          profileCompleted: false
        };
      }

      setTimeout(() => {
        onVerified(updatedProfile);
      }, 500);

    } catch (err: any) {
      console.error("[Candidate OTP Verification Error]:", err);
      setErrorMsg("Failed to verify code. Please verify your connection and try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 2. Resend OTP Email
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setErrorMsg("");
    setSuccessMsg("");
    setResending(true);

    try {
      // Trigger OTP endpoint
      const res = await fetch("/api/auth/candidate/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: nameToDisplay
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to dispatch verification code.");
      }

      // Also trigger standard firebase email link as backup
      if (auth.currentUser) {
        sendEmailVerification(auth.currentUser).catch(() => {});
      }

      setCooldown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setSuccessMsg(`New 6-digit verification code sent to ${email}!`);
      showToast("Verification code resent! Please check your inbox.", "success");
    } catch (err: any) {
      console.error("[Resend OTP Error]:", err);
      setErrorMsg(err.message || "Failed to resend verification code.");
      showToast(err.message || "Failed to resend code.", "error");
    } finally {
      setResending(false);
    }
  };

  const handleCheckEmailLink = async () => {
    setErrorMsg("");
    setChecking(true);
    try {
      if (!auth.currentUser) {
        setErrorMsg("Session expired. Please enter the 6-digit OTP code sent to your email.");
        return;
      }

      await auth.currentUser.reload();
      const fbUser = auth.currentUser;

      if (fbUser.emailVerified) {
        const uid = fbUser.uid;
        const nowIso = new Date().toISOString();

        const updateData = {
          verificationStatus: "verified",
          emailVerified: true,
          accountStatus: "active",
          status: "active",
          updatedAt: nowIso
        };

        await Promise.all([
          setDoc(doc(db, "users", uid), updateData, { merge: true }),
          setDoc(doc(db, "candidates", uid), updateData, { merge: true }),
          setDoc(doc(db, "candidateProfiles", uid), {
            uid,
            fullName: fbUser.displayName || nameToDisplay,
            email: fbUser.email || email.trim(),
            role: "candidate",
            emailVerified: true,
            accountStatus: "active",
            profileStatus: "incomplete",
            profileCompletion: 20,
            createdAt: nowIso,
            updatedAt: nowIso
          }, { merge: true })
        ]).catch(e => console.warn("[CandidateEmailVerification] Firestore update notice:", e));

        const updatedProfile = await getOrCreateUserProfile(fbUser);
        showToast("Email verified successfully!", "success");
        onVerified(updatedProfile);
      } else {
        setErrorMsg("Email link not confirmed yet. You can also enter the 6-digit OTP verification code above.");
        showToast("Please enter the 6-digit verification code or click the email link.", "warning");
      }
    } catch (err: any) {
      console.error("[Verification Check Error]:", err);
      setErrorMsg("Failed to verify status. Please enter the 6-digit OTP code.");
    } finally {
      setChecking(false);
    }
  };

  const handleOpenEmailApp = () => {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    let url = "mailto:";

    if (domain.includes("gmail")) {
      url = "https://mail.google.com";
    } else if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) {
      url = "https://outlook.live.com";
    } else if (domain.includes("yahoo")) {
      url = "https://mail.yahoo.com";
    } else if (domain.includes("proton") || domain.includes("protonmail")) {
      url = "https://mail.proton.me";
    } else if (domain.includes("icloud")) {
      url = "https://www.icloud.com/mail";
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      showToast("Registration session cancelled", "info");
      if (onSignOut) {
        onSignOut();
      } else {
        window.location.reload();
      }
    } catch (err) {
      console.error("[Sign Out Error]:", err);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(59,130,246,0.2)] relative overflow-hidden text-center">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider mb-5">
          <KeyRound className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>Email OTP Verification</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
          Verify Your Candidate Email
        </h2>

        {/* Description */}
        <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto mb-5">
          A 6-digit verification code has been sent to:
          <br />
          <span className="font-mono text-blue-300 font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg inline-block mt-1.5 text-xs break-all">
            {email || "your registered email"}
          </span>
        </p>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 6-Digit OTP Form */}
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold block">
              Enter 6-Digit Verification Code
            </label>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-black text-white bg-black/60 border border-blue-500/30 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-all"
                  autoFocus={idx === 0}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isVerifyingOtp || otpDigits.join("").length !== 6}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifyingOtp ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Code...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-200" />
                <span>Verify & Activate Account</span>
              </>
            )}
          </button>
        </form>

        {/* Resend and Secondary Options */}
        <div className="mt-5 space-y-2.5 pt-4 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending || cooldown > 0}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {cooldown > 0
                  ? `Resend Code in ${cooldown}s`
                  : "Resend Verification Code"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenEmailApp}
              className="text-gray-400 hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Email Inbox</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCheckEmailLink}
            disabled={checking}
            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[11px] font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {checking ? (
              <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <span>Clicked Link in Email? Check Status</span>
          </button>
        </div>

        {/* Footer / Return or Sign Out */}
        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>Need to use a different email?</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer hover:underline"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Change Details</span>
          </button>
        </div>

      </div>
    </div>
  );
}

