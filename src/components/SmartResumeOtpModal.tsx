import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, Smartphone, CheckCircle2, AlertCircle, Loader2, 
  Sparkles, RefreshCw, X, FileText, Award, User, Mail, ArrowRight, Edit2
} from "lucide-react";
import { auth } from "../firebase";
import { signInWithCustomToken } from "firebase/auth";

export interface CandidateParsedData {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  experience?: string;
  education?: string;
  city?: string;
  atsScore?: number;
  resumeUrl?: string;
  resumeFileName?: string;
}

interface SmartResumeOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateData: CandidateParsedData | null;
  onSuccessRedirect: () => void;
}

export default function SmartResumeOtpModal({
  isOpen,
  onClose,
  candidateData,
  onSuccessRedirect
}: SmartResumeOtpModalProps) {
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [isPhoneEditable, setIsPhoneEditable] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && candidateData?.phone) {
      setEditedPhone(candidateData.phone);
      setOtpCode("");
      setErrorMsg("");
      setVerifiedSuccess(false);
      setResendTimer(30);
      
      // Auto-focus input after modal transition
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, candidateData]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (!isOpen || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendTimer]);

  if (!isOpen || !candidateData) return null;

  const currentPhone = editedPhone || candidateData.phone || "+919876543210";

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = otpCode.trim();
    
    if (!cleanCode || cleanCode.length < 4) {
      setErrorMsg("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    try {
      console.log(`[SmartResumeOtpModal] Verifying OTP for phone: ${currentPhone}, Code: ${cleanCode}`);
      const res = await fetch("/api/twilio/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentPhone,
          code: cleanCode,
          preferredRole: "candidate"
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Invalid verification code. Please check SMS and try again.");
      }

      setVerifiedSuccess(true);

      // Authenticate with Firebase using Custom Token
      if (data.customToken) {
        console.log("[SmartResumeOtpModal] Signing in with Custom Token via Firebase Auth...");
        await signInWithCustomToken(auth, data.customToken);
      }

      // Dispatch Welcome SMS asynchronously
      fetch("/api/twilio/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentPhone,
          name: candidateData.fullName
        })
      }).catch((err) => console.warn("Welcome SMS error:", err));

      setTimeout(() => {
        onSuccessRedirect();
      }, 1000);

    } catch (err: any) {
      console.error("[SmartResumeOtpModal] OTP Verification failed:", err);
      setErrorMsg(err.message || "Failed to verify code. Please verify your phone number and try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg("");

    try {
      console.log(`[SmartResumeOtpModal] Requesting new OTP for: ${currentPhone}`);
      const res = await fetch("/api/twilio/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentPhone })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to dispatch resend OTP.");
      }

      setResendTimer(45);
      setErrorMsg("");
    } catch (err: any) {
      console.error("[SmartResumeOtpModal] Resend OTP error:", err);
      setErrorMsg(err.message || "Could not resend code. Please try again in a few moments.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left"
        >
          {/* Header Gradient Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-emerald-400 to-indigo-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Header Badge & Title */}
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Candidate Account Auto-Created</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Verify Mobile Identity
              </h2>
              <p className="text-sm text-gray-400">
                We parsed your resume and sent a security verification code via Twilio SMS to activate your candidate dashboard.
              </p>
            </div>

            {/* Extracted Candidate Profile Summary Card */}
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {candidateData.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {candidateData.fullName}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span>{candidateData.email}</span>
                    </div>
                  </div>
                </div>

                {candidateData.atsScore && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block font-semibold">ATS Score</span>
                    <span className="text-xl font-extrabold text-emerald-400">{candidateData.atsScore}%</span>
                  </div>
                )}
              </div>

              {/* Mobile Phone Number Banner & Edit Action */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-300">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  {isPhoneEditable ? (
                    <input
                      type="text"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="bg-black/50 border border-blue-500/50 rounded px-2 py-1 text-white text-xs font-mono focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono font-medium text-blue-300">{currentPhone}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhoneEditable(!isPhoneEditable)}
                  className="text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer text-[11px]"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isPhoneEditable ? "Save" : "Change"}</span>
                </button>
              </div>

              {/* Skills preview chips */}
              {candidateData.skills && candidateData.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {candidateData.skills.slice(0, 5).map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {candidateData.skills.length > 5 && (
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-[10px]">
                      +{candidateData.skills.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Success State */}
            {verifiedSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="text-lg font-bold text-white">Identity Verified Successfully!</h3>
                <p className="text-xs text-emerald-300">
                  Logging you into AIJobs Candidate Dashboard...
                </p>
              </motion.div>
            ) : (
              /* OTP Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Enter 6-Digit SMS Verification Code
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        setOtpCode(e.target.value.replace(/\D/g, ""));
                        setErrorMsg("");
                      }}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.75em] text-2xl font-mono py-3 px-4 bg-black/40 border border-white/15 focus:border-blue-500 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>Didn't receive SMS code?</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isResending}
                    className="text-blue-400 hover:text-blue-300 disabled:text-gray-600 cursor-pointer font-medium flex items-center space-x-1"
                  >
                    {isResending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend OTP"}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || otpCode.length < 4}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2 text-sm"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Verifying Twilio SMS OTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-emerald-300" />
                      <span>Verify & Launch Candidate Dashboard</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
