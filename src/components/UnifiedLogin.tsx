import React, { FormEvent, useEffect, useRef, useState } from "react";
import { 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Briefcase, 
  Building2, 
  Check, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Globe, 
  HelpCircle, 
  KeyRound, 
  Lock, 
  LogIn, 
  Mail, 
  Phone, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  User, 
  UserPlus, 
  X 
} from "lucide-react";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { UserProfile } from "../types";
import { getOrCreateUserProfile } from "../services/dbInitService";
import { normalizeRole, isAdminRole, getRoleDashboardPath } from "../utils/roleUtils";
import { useToast } from "./GlobalToast";
import AIJobsLogo from "./AIJobsLogo";

interface UnifiedLoginProps {
  onLoginSuccess?: (userProfile: UserProfile, targetRoute?: string) => void;
  onSuccess?: (userProfile: UserProfile, targetRoute?: string) => void;
  onNavigateToRegister?: (rolePreference?: "candidate" | "employer" | "consultancy") => void;
  onSwitchToRegister?: () => void;
  onNavigateHome?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

type LoginTab = "credentials" | "phone_otp";

interface AuthErrorState {
  hasError: boolean;
  message: string;
  field?: "identifier" | "password" | "phone" | "otp" | "general";
  technicalCode?: string;
}

export default function UnifiedLogin({
  onLoginSuccess,
  onSuccess,
  onNavigateToRegister,
  onSwitchToRegister,
  onNavigateHome,
  isModal = false,
  onClose
}: UnifiedLoginProps) {
  const { showToast } = useToast();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<LoginTab>("credentials");

  // Form Inputs
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [phoneStep, setPhoneStep] = useState<"enter_phone" | "enter_code">("enter_phone");
  const [otpCode, setOtpCode] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const recaptchaVerifierRef = useRef<any>(null);

  // Centralized Error and UI State
  const [loading, setLoading] = useState(false);
  const [resolvingIdentifier, setResolvingIdentifier] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorState>({ hasError: false, message: "" });
  const [successMsg, setSuccessMsg] = useState("");

  // Forgot Password Modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const triggerAuthSuccess = (profile: UserProfile, route?: string) => {
    if (onLoginSuccess) onLoginSuccess(profile, route);
    if (onSuccess) onSuccess(profile, route);
  };

  const triggerRegisterNav = (pref?: "candidate" | "employer" | "consultancy") => {
    if (onNavigateToRegister) onNavigateToRegister(pref);
    if (onSwitchToRegister) onSwitchToRegister();
  };

  const clearAuthError = () => {
    setAuthError({ hasError: false, message: "" });
  };

  const setCentralizedError = (msg: string, field: AuthErrorState["field"] = "general", techError?: any) => {
    if (techError) {
      console.warn(`[UnifiedLogin Centralized Error] Field: ${field}, Tech Code: ${techError?.code || "N/A"}, Tech Msg: ${techError?.message || techError}`);
    }
    setAuthError({
      hasError: true,
      message: msg,
      field,
      technicalCode: techError?.code || undefined
    });
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  // Check for Google redirect result on mount
  useEffect(() => {
    const checkRedirect = async () => {
      if (!isFirebaseConfigured) return;
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await processAuthenticatedUser(result.user);
        }
      } catch (err: any) {
        console.error("[UnifiedLogin] Redirect auth error:", err);
        setCentralizedError(mapAuthError(err), "general", err);
      }
    };
    checkRedirect();
  }, []);

  // Translate Firebase & system auth errors into user-friendly messages
  const mapAuthError = (err: any): string => {
    if (!err) return "Incorrect login details. Please check and try again.";
    const code = err.code || "";
    const msg = typeof err.message === "string" ? err.message : "";

    if (
      code === "auth/user-not-found" || 
      code === "auth/invalid-credential" || 
      code === "auth/wrong-password" ||
      code === "auth/invalid-login-credentials"
    ) {
      return "Incorrect login details. Please verify your credentials and try again.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many failed attempts. For security, please wait a few minutes or reset your password.";
    }
    if (code === "auth/user-disabled") {
      return "Your account is currently unavailable. Please contact AIJobs support.";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }
    if (code === "auth/invalid-verification-code" || code === "auth/code-expired") {
      return "Invalid or expired verification code. Please check and try again.";
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return "Google sign-in was cancelled.";
    }
    if (code === "auth/network-request-failed") {
      return "Network connection problem. Please check your internet connection.";
    }
    if (msg.includes("ACCOUNT_NOT_FOUND") || msg.includes("No AIJobs account")) {
      return "No AIJobs account found with these details. Please register to create an account.";
    }
    if (msg.includes("ACCOUNT_PENDING") || msg.includes("pending verification")) {
      return "Your account is pending verification by the AIJobs compliance team.";
    }
    if (msg.includes("ACCOUNT_LOCKED") || msg.includes("locked")) {
      return "Your account is locked due to excessive failed attempts. Please contact support.";
    }
    return "Incorrect login details. Please check your information and try again.";
  };

  /**
   * Process authenticated Firebase user:
   * 1. Read Firestore user record from admins/{uid} or users/{uid}
   * 2. Normalize and verify role
   * 3. Validate account status (active, pending, locked, disabled)
   * 4. Route securely to the authorized dashboard
   */
  const processAuthenticatedUser = async (fbUser: any) => {
    clearAuthError();
    setSuccessMsg("Verifying account permissions...");

    try {
      const userProfile = await getOrCreateUserProfile(fbUser);
      const rawRole = userProfile?.role || "";
      const normRole = normalizeRole(rawRole);

      console.log(`[UnifiedLogin] Authenticated: UID=${fbUser.uid}, RawRole=${rawRole}, NormalizedRole=${normRole}`);

      // Check account status
      const accStatus = userProfile.accountStatus || userProfile.status || "active";
      if (accStatus === "disabled" || accStatus === "suspended" || accStatus === "locked" || (userProfile as any).isLocked) {
        await auth.signOut();
        const disabledMsg = "Your account is currently unavailable. Please contact AIJobs support.";
        setCentralizedError(disabledMsg, "general");
        showToast(disabledMsg, "error");
        setLoading(false);
        return;
      }

      if (accStatus === "pending") {
        showToast("Your account is pending verification by the AIJobs compliance team.", "info", 6000);
      }

      // Check unconfigured role
      if (normRole === "unknown") {
        const unconfigMsg = "Your account is being configured. Directing to candidate portal.";
        showToast(unconfigMsg, "info");
        triggerAuthSuccess(userProfile, "/candidate/dashboard");
        return;
      }

      // Compute target dashboard path
      const targetPath = getRoleDashboardPath(normRole);
      
      showToast(`Welcome back, ${userProfile.name || "User"}!`, "success");
      triggerAuthSuccess(userProfile, targetPath);
    } catch (err: any) {
      console.error("[UnifiedLogin] Profile processing error:", err);
      setCentralizedError("Failed to verify account permissions. Please try again.", "general", err);
      showToast("Profile verification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Resolve identifier (Email, Mobile, or User ID)
  const resolveIdentifierToEmail = async (rawIdentifier: string): Promise<string> => {
    const trimmed = rawIdentifier.trim();
    if (trimmed.includes("@")) {
      return trimmed.toLowerCase();
    }

    setResolvingIdentifier(true);
    try {
      const response = await fetch("/api/auth/resolve-identifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 404 || errData.error === "ACCOUNT_NOT_FOUND") {
          throw new Error("No AIJobs account was found with these details.");
        }
        throw new Error(errData.message || "Failed to resolve login identifier.");
      }

      const data = await response.json();
      if (data.success && data.email) {
        return data.email;
      }
      throw new Error("No registered email found for this identifier.");
    } finally {
      setResolvingIdentifier(false);
    }
  };

  // Main Email / Identifier Login Handler
  const handleCredentialLogin = async (e: FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSuccessMsg("");

    const trimmedId = identifier.trim();
    const trimmedPwd = password.trim();

    if (!trimmedId) {
      setCentralizedError("Please enter your email, mobile number, or User ID.", "identifier");
      return;
    }
    if (!trimmedPwd) {
      setCentralizedError("Please enter your password.", "password");
      return;
    }

    setLoading(true);

    try {
      // 1. Resolve Identifier to Email
      let loginEmail = trimmedId;
      if (!trimmedId.includes("@")) {
        try {
          loginEmail = await resolveIdentifierToEmail(trimmedId);
        } catch (resolveErr: any) {
          setCentralizedError("No registered AIJobs account found with these details.", "identifier", resolveErr);
          setLoading(false);
          return;
        }
      }

      // 2. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, trimmedPwd);
      await processAuthenticatedUser(userCredential.user);
    } catch (err: any) {
      const friendlyError = mapAuthError(err);
      setCentralizedError(friendlyError, "general", err);
      showToast(friendlyError, "error");
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleLogin = async () => {
    clearAuthError();
    setSuccessMsg("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      try {
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          await processAuthenticatedUser(result.user);
        }
      } catch (popupErr: any) {
        if (
          popupErr.code === "auth/popup-blocked" || 
          popupErr.code === "auth/iframe-auth-html-error" ||
          popupErr.message?.includes("popup")
        ) {
          console.log("[UnifiedLogin] Popup blocked; redirecting to Google auth...");
          await signInWithRedirect(auth, provider);
        } else {
          throw popupErr;
        }
      }
    } catch (err: any) {
      const friendly = mapAuthError(err);
      setCentralizedError(friendly, "general", err);
      showToast(friendly, "error");
      setLoading(false);
    }
  };

  // Phone OTP - Step 1: Send OTP
  const handleSendPhoneOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSuccessMsg("");

    const cleanNumber = phoneNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      setCentralizedError("Please enter a valid 10-digit mobile number.", "phone");
      return;
    }

    const fullPhone = `${phoneCountryCode}${cleanNumber.slice(-10)}`;
    setLoading(true);

    try {
      // Initialize reCAPTCHA verifier if not already created
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "phone-recaptcha-container", {
          size: "invisible",
          callback: () => {}
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setPhoneStep("enter_code");
      setResendCountdown(60);
      setSuccessMsg(`Verification code sent to ${fullPhone}`);
      showToast(`Verification code sent to ${fullPhone}`, "success");
    } catch (err: any) {
      const friendly = mapAuthError(err);
      setCentralizedError(friendly, "phone", err);
      showToast(friendly, "error");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP - Step 2: Verify OTP
  const handleVerifyPhoneOtp = async (e: FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setSuccessMsg("");

    const fullOtp = otpDigits.join("").trim() || otpCode.trim();
    if (fullOtp.length !== 6) {
      setCentralizedError("Please enter the complete 6-digit verification code.", "otp");
      return;
    }

    if (!confirmationResult) {
      setCentralizedError("Verification session expired. Please request a new code.", "otp");
      setPhoneStep("enter_phone");
      return;
    }

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(fullOtp);
      if (result?.user) {
        await processAuthenticatedUser(result.user);
      }
    } catch (err: any) {
      setCentralizedError("Invalid verification code. Please check and try again.", "otp", err);
      showToast("Invalid verification code.", "error");
      setLoading(false);
    }
  };

  // OTP Digit Box Change Handler
  const handleDigitInput = (index: number, val: string) => {
    if (/^[0-9]$/.test(val) || val === "") {
      const next = [...otpDigits];
      next[index] = val;
      setOtpDigits(next);
      setOtpCode(next.join(""));
      if (val !== "" && index < 5) {
        const nextInput = document.getElementById(`unified-otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  // Forgot Password Request Handler
  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setResetSuccess(false);

    const targetId = resetIdentifier.trim();
    if (!targetId) {
      showToast("Please enter your registered email address.", "warning");
      return;
    }

    setResetLoading(true);
    try {
      let resetEmail = targetId;
      if (!targetId.includes("@")) {
        resetEmail = await resolveIdentifierToEmail(targetId);
      }

      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
      showToast(`Password reset link sent to ${resetEmail}`, "success");
    } catch (err: any) {
      const friendly = mapAuthError(err);
      showToast(friendly, "error");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={`w-full ${isModal ? "p-0" : "min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6"}`}>
      {/* Invisible reCAPTCHA container */}
      <div id="phone-recaptcha-container"></div>

      <div className={`w-full ${isModal ? "max-w-md mx-auto" : "max-w-lg mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-200/50"} p-6 sm:p-8 relative overflow-hidden`}>
        {/* Top bar buttons if standalone or modal */}
        <div className="flex items-center justify-between mb-6">
          {onNavigateHome && !isModal ? (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
          ) : (
            <div></div>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto cursor-pointer"
              aria-label="Close login dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Brand & Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="flex justify-center mb-2">
            <AIJobsLogo className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to AIJobs
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Sign in to continue to your workspace.
          </p>
        </div>

        {/* Error / Success Notifications */}
        {authError.hasError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 text-xs font-medium animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">{authError.message}</div>
            <button onClick={clearAuthError} className="text-rose-400 hover:text-rose-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3 text-emerald-800 text-xs font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Auth Method Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab("credentials"); clearAuthError(); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "credentials"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Email / ID & Password
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("phone_otp"); clearAuthError(); }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "phone_otp"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mobile OTP
          </button>
        </div>

        {/* Method 1: Email / Mobile / User ID + Password */}
        {activeTab === "credentials" && (
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email, Mobile or User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="unified-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email, mobile or user ID"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetIdentifier(identifier);
                    setForgotOpen(true);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="unified-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="unified-submit-button"
              type="submit"
              disabled={loading || resolvingIdentifier}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading || resolvingIdentifier ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{resolvingIdentifier ? "Resolving Account..." : "Signing In..."}</span>
                </>
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Method 2: Mobile Phone OTP */}
        {activeTab === "phone_otp" && (
          <div>
            {phoneStep === "enter_phone" ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="w-28 py-3 px-3 bg-white border border-slate-300 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+65">🇸🇬 +65</option>
                    </select>
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    We will send a 6-digit verification code to this number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setPhoneStep("enter_phone")}
                      className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Change Number
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        id={`unified-otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitInput(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            const prev = document.getElementById(`unified-otp-${index - 1}`);
                            prev?.focus();
                          }
                        }}
                        className="w-full h-12 text-center text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        disabled={loading}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                    <span>Didn't receive code?</span>
                    {resendCountdown > 0 ? (
                      <span className="font-semibold text-slate-400">Resend in {resendCountdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
              Or
            </span>
          </div>
        </div>

        {/* Alternative: Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          <span>Continue with Google</span>
        </button>

        {/* Safety & Trust Note */}
        <div className="mt-6 p-3 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-2.5 text-blue-900 text-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>AIJobs guarantees secure role detection based on authenticated account records.</span>
        </div>

        {/* Registration Links */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2 text-xs">
          <div>
            <span className="text-slate-500">New to AIJobs? </span>
            <button
              type="button"
              onClick={() => triggerRegisterNav("candidate")}
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Create Candidate Account
            </button>
          </div>
          <div>
            <span className="text-slate-500">Hiring organization? </span>
            <button
              type="button"
              onClick={() => triggerRegisterNav("employer")}
              className="font-semibold text-slate-700 hover:text-blue-600 hover:underline cursor-pointer"
            >
              Employer / Consultancy Registration
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              </div>
              <button
                onClick={() => setForgotOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Reset Link Sent</h4>
                <p className="text-xs text-slate-600">
                  We've sent a password reset link to your registered email address. Please follow the link in your email to choose a new password.
                </p>
                <button
                  type="button"
                  onClick={() => { setForgotOpen(false); setResetSuccess(false); }}
                  className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-500">
                  Enter your registered email address, mobile number, or User ID. We will send a secure link to reset your password.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email / Mobile / User ID
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="Enter your registered email or ID"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {resetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Send Reset Link</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
