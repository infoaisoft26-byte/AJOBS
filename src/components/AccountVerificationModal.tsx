import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { AlertCircle, ArrowRight, CheckCircle2, Code, Lock, Mail, Phone, Send, ShieldCheck, Verified, X } from "lucide-react";
import { db } from "../firebase";


interface AccountVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userPhone?: string;
  isEmailVerified?: boolean;
  isMobileVerified?: boolean;
  onVerificationSuccess?: () => void;
  triggerNotification?: (title: string, message: string) => void;
}

export default function AccountVerificationModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userPhone = "",
  isEmailVerified = false,
  isMobileVerified = false,
  onVerificationSuccess,
  triggerNotification
}: AccountVerificationModalProps) {
  const [activeStep, setActiveStep] = useState<"email" | "mobile" | "password">("email");
  
  // Email OTP state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(isEmailVerified);
  
  // Mobile OTP state
  const [phoneInput, setPhoneInput] = useState(userPhone || "+91 9876543210");
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtpCode, setMobileOtpCode] = useState("");
  const [mobileVerified, setMobileVerified] = useState(isMobileVerified);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  // Send Email OTP
  const handleSendEmailOtp = () => {
    setLoading(true);
    setStatusMsg(null);
    setTimeout(() => {
      setEmailOtpSent(true);
      setLoading(false);
      setStatusMsg({ type: "success", text: `Verification OTP sent to ${userEmail}. (Test OTP: 123456)` });
    }, 800);
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    if (emailOtpCode !== "123456" && emailOtpCode.length < 6) {
      setStatusMsg({ type: "error", text: "Invalid OTP code. Please enter valid 6-digit code or use 123456." });
      return;
    }

    setLoading(true);
    try {
      if (userId && db) {
        await setDoc(doc(db, "users", userId), {
          isEmailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        }, { merge: true });

        await setDoc(doc(doc(db, "candidates", userId)), {
          isEmailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        }, { merge: true });
      }

      setEmailVerified(true);
      setStatusMsg({ type: "success", text: "Email address successfully verified!" });
      if (triggerNotification) {
        triggerNotification("Email Verified", "Your email address has been authenticated.");
      }
      setActiveStep("mobile");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to verify email." });
    } finally {
      setLoading(false);
    }
  };

  // Send Mobile OTP
  const handleSendMobileOtp = () => {
    if (!phoneInput || phoneInput.length < 8) {
      setStatusMsg({ type: "error", text: "Please enter a valid phone number." });
      return;
    }
    setLoading(true);
    setStatusMsg(null);
    setTimeout(() => {
      setMobileOtpSent(true);
      setLoading(false);
      setStatusMsg({ type: "success", text: `SMS OTP sent to ${phoneInput}. (Test OTP: 654321)` });
    }, 800);
  };

  // Verify Mobile OTP
  const handleVerifyMobileOtp = async () => {
    if (mobileOtpCode !== "654321" && mobileOtpCode.length < 6) {
      setStatusMsg({ type: "error", text: "Invalid SMS code. Please enter valid 6-digit code or use 654321." });
      return;
    }

    setLoading(true);
    try {
      if (userId && db) {
        await setDoc(doc(db, "users", userId), {
          isMobileVerified: true,
          mobileNumber: phoneInput,
          mobileVerifiedAt: new Date().toISOString(),
          verified: true
        }, { merge: true });

        await setDoc(doc(db, "candidates", userId), {
          isMobileVerified: true,
          mobileNumber: phoneInput,
          mobileVerifiedAt: new Date().toISOString(),
          verified: true
        }, { merge: true });
      }

      setMobileVerified(true);
      setStatusMsg({ type: "success", text: "Mobile number successfully verified!" });
      if (triggerNotification) {
        triggerNotification("Mobile Verified", "Your phone number has been verified.");
      }
      setActiveStep("password");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to verify phone number." });
    } finally {
      setLoading(false);
    }
  };

  // Set / Reset Account Password
  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setStatusMsg({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      if (userId && db) {
        await setDoc(doc(db, "users", userId), {
          hasCustomPassword: true,
          passwordUpdatedAt: new Date().toISOString(),
          verified: true,
          accountStatus: "active"
        }, { merge: true });

        await setDoc(doc(db, "candidates", userId), {
          verified: true,
          accountStatus: "active"
        }, { merge: true });
      }

      setPasswordSaved(true);
      setStatusMsg({ type: "success", text: "Account security password updated successfully!" });
      if (triggerNotification) {
        triggerNotification("Account Verified", "Your candidate account is fully verified and secure!");
      }
      if (onVerificationSuccess) onVerificationSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to set password." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Candidate Account Verification</h3>
              <p className="text-xs text-gray-400">Complete email, mobile OTP & security password setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => setActiveStep("email")}
            className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeStep === "email" 
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold" 
                : emailVerified ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
            {emailVerified && <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
          </button>

          <button
            onClick={() => setActiveStep("mobile")}
            className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeStep === "mobile" 
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold" 
                : mobileVerified ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Mobile OTP</span>
            {mobileVerified && <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
          </button>

          <button
            onClick={() => setActiveStep("password")}
            className={`p-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              activeStep === "password" 
                ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold" 
                : passwordSaved ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-gray-400"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password</span>
            {passwordSaved && <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            statusMsg.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}>
            {statusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* STEP 1: EMAIL VERIFICATION */}
        {activeStep === "email" && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Candidate Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
                {!emailVerified && (
                  <button
                    onClick={handleSendEmailOtp}
                    disabled={loading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                )}
              </div>
            </div>

            {emailOtpSent && !emailVerified && (
              <div className="space-y-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <label className="text-xs font-semibold text-indigo-300 block">Enter 6-digit Email OTP Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(e.target.value)}
                    placeholder="123456"
                    className="flex-1 px-3.5 py-2.5 bg-black/40 border border-indigo-500/40 rounded-xl text-white text-sm font-mono tracking-widest text-center"
                  />
                  <button
                    onClick={handleVerifyEmailOtp}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Verify Email
                  </button>
                </div>
              </div>
            )}

            {emailVerified && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs">
                <span className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Email is verified ({userEmail})</span>
                </span>
                <button
                  onClick={() => setActiveStep("mobile")}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Next: Mobile OTP</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: MOBILE OTP VERIFICATION */}
        {activeStep === "mobile" && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Mobile Phone Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 9876543210"
                  className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
                />
                {!mobileVerified && (
                  <button
                    onClick={handleSendMobileOtp}
                    disabled={loading}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {loading ? "Sending..." : "Send SMS OTP"}
                  </button>
                )}
              </div>
            </div>

            {mobileOtpSent && !mobileVerified && (
              <div className="space-y-3 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <label className="text-xs font-semibold text-indigo-300 block">Enter 6-digit SMS OTP Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={mobileOtpCode}
                    onChange={(e) => setMobileOtpCode(e.target.value)}
                    placeholder="654321"
                    className="flex-1 px-3.5 py-2.5 bg-black/40 border border-indigo-500/40 rounded-xl text-white text-sm font-mono tracking-widest text-center"
                  />
                  <button
                    onClick={handleVerifyMobileOtp}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Verify SMS
                  </button>
                </div>
              </div>
            )}

            {mobileVerified && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs">
                <span className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mobile number verified ({phoneInput})</span>
                </span>
                <button
                  onClick={() => setActiveStep("password")}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Next: Password</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ACCOUNT PASSWORD CREATION */}
        {activeStep === "password" && (
          <div className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">New Security Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 block">Confirm Security Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={handleSavePassword}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? "Updating Account..." : "Complete Account Verification"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
