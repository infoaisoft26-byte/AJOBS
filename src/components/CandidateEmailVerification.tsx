import React, { useEffect, useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AlertCircle, CheckCircle2, ExternalLink, LogOut, Mail, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { auth, db } from "../firebase";
import { UserProfile } from "../types";
import { getOrCreateUserProfile } from "../services/dbInitService";
import { useToast } from "./GlobalToast";

interface CandidateEmailVerificationProps {
  user: UserProfile | null;
  onVerified: (updatedProfile: UserProfile) => void;
  onSignOut?: () => void;
}

export default function CandidateEmailVerification({
  user,
  onVerified,
  onSignOut
}: CandidateEmailVerificationProps) {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const email = auth.currentUser?.email || user?.email || "";

  // 60-second resend cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Periodic polling check when tab regains focus or every 5 seconds
  useEffect(() => {
    const handleFocus = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.reload();
          if (auth.currentUser.emailVerified) {
            await handleCheckVerification();
          }
        } catch (e) {
          console.warn("[CandidateEmailVerification] Auto-check error:", e);
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    const interval = setInterval(handleFocus, 5000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleCheckVerification = async () => {
    setErrorMsg("");
    setChecking(true);
    try {
      if (!auth.currentUser) {
        setErrorMsg("Session expired. Please log in again.");
        return;
      }

      await auth.currentUser.reload();
      const fbUser = auth.currentUser;

      if (fbUser.emailVerified) {
        const uid = fbUser.uid;
        const nowIso = new Date().toISOString();

        // Update Firestore status to verified
        const updateData = {
          verificationStatus: "verified",
          emailVerified: true,
          accountStatus: "active",
          status: "active",
          updatedAt: nowIso
        };

        await Promise.all([
          setDoc(doc(db, "users", uid), updateData, { merge: true }),
          setDoc(doc(db, "candidates", uid), updateData, { merge: true })
        ]).catch(e => console.warn("[CandidateEmailVerification] Firestore update notice:", e));

        const updatedProfile = await getOrCreateUserProfile(fbUser);
        showToast("Email verified successfully! Welcome to your Candidate Dashboard.", "success");
        onVerified(updatedProfile);
      } else {
        setErrorMsg("Your email is not verified yet. Please check your inbox and click the verification link.");
        showToast("Email not verified yet. Please check your inbox.", "warning");
      }
    } catch (err: any) {
      console.error("[Verification Check Error]:", err);
      setErrorMsg("Failed to verify email status. Please try clicking the button again.");
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    if (cooldown > 0 || resending) return;
    setErrorMsg("");
    setResending(true);

    try {
      if (!auth.currentUser) {
        throw new Error("No authenticated user found. Please log in again.");
      }

      await sendEmailVerification(auth.currentUser);
      setCooldown(60);
      showToast("Verification email re-sent! Check your inbox and spam folder.", "success");
    } catch (err: any) {
      console.error("[Resend Verification Email Error]:", err);
      let msg = "Failed to re-send verification email.";
      if (err.code === "auth/too-many-requests") {
        msg = "Too many requests. Please wait a minute before requesting another verification email.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setResending(false);
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
      showToast("Signed out successfully", "info");
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(59,130,246,0.2)] relative overflow-hidden text-center">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold uppercase tracking-wider mb-6">
          <Mail className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>Email Verification Mandatory</span>
        </div>

        {/* Icon Emblem */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center shadow-inner">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          Verify Your Candidate Email
        </h2>

        {/* Description */}
        <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto mb-6">
          A verification link has been dispatched to:
          <br />
          <span className="font-mono text-blue-300 font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg inline-block mt-1.5 text-xs">
            {email || "your registered candidate email"}
          </span>
          <br />
          <span className="text-gray-400 text-[11px] block mt-2">
            Please verify your email address to activate your AIJOBS Candidate account and access your Candidate Dashboard.
          </span>
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          
          {/* 1. Open Email App */}
          <button
            type="button"
            onClick={handleOpenEmailApp}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4 text-blue-200" />
            <span>Open Email Inbox</span>
          </button>

          {/* 2. I've Verified My Email */}
          <button
            type="button"
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-3 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Checking Verification Status...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>I've Verified My Email</span>
              </>
            )}
          </button>

          {/* 3. Resend Verification Email */}
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resending || cooldown > 0}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold text-gray-300 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {resending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
            ) : (
              <Send className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>
              {cooldown > 0
                ? `Resend Verification Email (${cooldown}s)`
                : "Resend Verification Email"}
            </span>
          </button>

        </div>

        {/* Footer / Sign Out & Return */}
        <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>Wrong email or need to register?</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-bold text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer hover:underline"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
