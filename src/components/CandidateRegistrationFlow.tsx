import React, { useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { auth, db, googleProvider } from "../firebase";
import type { UserProfile } from "../types";
import { captureAttribution, getIntendedJobId } from "../utils/attribution";
import { trackCandidateRegistrationComplete, trackCandidateRegistrationStarted } from "../utils/analytics";
import AIJobsLogo from "./AIJobsLogo";

interface CandidateRegistrationFlowProps {
  onRegisterSuccess: (userProfile: UserProfile) => void;
  onNavigateToLogin: () => void;
  initialJobId?: string;
}

type RegisterMethod = "email" | "google";

const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, "").trim();

function firebaseMessage(error: any): string {
  const code = String(error?.code || "");
  if (code === "auth/email-already-in-use") return "This email is already registered. Please sign in instead.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/weak-password") return "Password must be at least 6 characters.";
  if (code === "auth/unauthorized-domain") return "This domain is not authorized for Firebase Authentication.";
  if (code === "auth/popup-blocked") return "Google Sign-In popup was blocked. Please allow popups and try again.";
  if (code === "auth/popup-closed-by-user") return "Google Sign-In was cancelled before completion.";
  if (code === "auth/account-exists-with-different-credential") return "An account already exists with this email using another sign-in method.";
  if (code === "auth/network-request-failed") return "Network error. Please check your internet connection and try again.";
  if (code === "permission-denied" || code === "firestore/permission-denied") {
    return "Your login account was created, but the profile could not be synchronized. Please sign in once and retry.";
  }
  return error?.message ? String(error.message).replace(/^Firebase:\s*/i, "") : "Registration could not be completed. Please try again.";
}

export default function CandidateRegistrationFlow({
  onRegisterSuccess,
  onNavigateToLogin,
  initialJobId,
}: CandidateRegistrationFlowProps) {
  const attribution = useMemo(() => captureAttribution(), []);
  const intendedJobId = initialJobId || getIntendedJobId() || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    trackCandidateRegistrationStarted(attribution.gclid ? "google_ads" : "candidate_register");
  }, [attribution.gclid]);

  const persistCandidate = async (fbUser: FirebaseUser, displayName: string, method: RegisterMethod) => {
    const normalizedName = displayName.trim() || fbUser.displayName || fbUser.email?.split("@")[0] || "Candidate";
    const normalizedEmail = (fbUser.email || email).trim().toLowerCase();
    const normalizedMobile = normalizePhone(phone || fbUser.phoneNumber || "");
    const now = new Date().toISOString();

    // Do not silently overwrite an existing non-candidate account when the same Google
    // identity is used from the candidate registration screen.
    const existingUser = await getDoc(doc(db, "users", fbUser.uid)).catch(() => null);
    const existingRole = existingUser?.exists() ? String(existingUser.data()?.role || "").toLowerCase() : "";
    if (existingRole && !["candidate", "jobseeker", "job_seeker"].includes(existingRole)) {
      await signOut(auth).catch(() => {});
      throw new Error(`This email is already linked to an AIJOBS ${existingRole} account. Please use the correct login portal.`);
    }

    const candidateId = existingUser?.exists() && existingUser.data()?.candidateId
      ? String(existingUser.data()?.candidateId)
      : `AIJ-CAN-${fbUser.uid.slice(0, 8).toUpperCase()}`;

    const userData = {
      uid: fbUser.uid,
      candidateId,
      name: normalizedName,
      fullName: normalizedName,
      email: normalizedEmail,
      phone: normalizedMobile,
      phoneNumber: normalizedMobile,
      mobileNumber: normalizedMobile,
      role: "candidate",
      emailVerified: fbUser.emailVerified === true,
      verificationStatus: fbUser.emailVerified ? "verified" : "pending",
      status: "active",
      accountStatus: "active",
      isActive: true,
      isApproved: true,
      profileCompleted: false,
      profileStatus: "incomplete",
      profileCompletion: normalizedMobile ? 30 : 20,
      onboardingStep: "account_created",
      resumeURL: existingUser?.exists() ? existingUser.data()?.resumeURL || null : null,
      intendedJobId: intendedJobId || null,
      gclid: attribution.gclid || null,
      utm_source: attribution.utm_source || null,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
      utm_term: attribution.utm_term || null,
      acquisitionSource: attribution.gclid ? "google_ads" : attribution.utm_source || "organic",
      registrationMethod: method,
      createdAt: existingUser?.exists() ? existingUser.data()?.createdAt || now : now,
      updatedAt: now,
      lastLogin: now,
    };

    const candidateData = {
      ...userData,
      userId: fbUser.uid,
      resumeUrl: existingUser?.exists() ? existingUser.data()?.resumeURL || null : null,
      resumeFileName: null,
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      preferredLocations: [],
      savedJobIds: [],
    };

    // Write canonical profile documents together. Merge keeps any existing real profile data.
    await Promise.all([
      setDoc(doc(db, "users", fbUser.uid), userData, { merge: true }),
      setDoc(doc(db, "candidates", fbUser.uid), candidateData, { merge: true }),
      setDoc(doc(db, "candidateProfiles", fbUser.uid), candidateData, { merge: true }),
    ]);

    const profile: UserProfile = {
      uid: fbUser.uid,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedMobile,
      role: "candidate",
      createdAt: String(userData.createdAt),
      lastLogin: now,
      status: "active",
      accountStatus: "active",
      isActive: true,
      isApproved: true,
      profileCompleted: false,
      resumeURL: userData.resumeURL || "",
      profileImage: fbUser.photoURL || undefined,
      photoURL: fbUser.photoURL || undefined,
    };

    trackCandidateRegistrationComplete({
      method,
      gclid: attribution.gclid,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      intendedJobId: intendedJobId || undefined,
    });

    // First-party marketing event is non-blocking. Registration success must never
    // depend on analytics, email, resume or optional integrations.
    try {
      const token = await fbUser.getIdToken();
      await fetch("/api/hire/event", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventName: "candidate_registration_completed",
          role: "candidate",
          visitorId: attribution.gclid || fbUser.uid,
          dedupeKey: `candidate_registration_completed:${fbUser.uid}`,
          marketingAttribution: {
            source: attribution.utm_source || (attribution.gclid ? "google" : "direct"),
            medium: attribution.utm_medium || (attribution.gclid ? "cpc" : "none"),
            campaign: attribution.utm_campaign || "",
            gclid: attribution.gclid || "",
          },
        }),
      });
    } catch (eventError) {
      console.debug("[CandidateRegistration] marketing event notice:", eventError);
    }

    return profile;
  };

  const finish = (profile: UserProfile) => {
    setSuccess("Registration successful. Opening your candidate dashboard…");
    onRegisterSuccess(profile);
    // Hard navigation guarantees a clean authenticated dashboard state and avoids
    // legacy pre-launch verification/profile routing from intercepting new users.
    window.setTimeout(() => window.location.assign("/candidate/dashboard"), 250);
  };

  const handleEmailRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!accepted) return setError("Please accept the Terms of Service and Privacy Policy.");

    setBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await updateProfile(credential.user, { displayName: name.trim() }).catch(() => {});

      const profile = await persistCandidate(credential.user, name.trim(), "email");

      // Verification is encouraged but never blocks account creation or dashboard access.
      sendEmailVerification(credential.user).catch((verificationError) => {
        console.debug("[CandidateRegistration] verification email notice:", verificationError);
      });
      fetch("/api/auth/candidate/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credential.user.email, name: name.trim(), role: "candidate" }),
      }).catch(() => {});

      finish(profile);
    } catch (registerError: any) {
      console.error("[CandidateRegistration] email registration error:", registerError);
      setError(firebaseMessage(registerError));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setSuccess("");
    if (!accepted) {
      setError("Please accept the Terms of Service and Privacy Policy before continuing with Google.");
      return;
    }

    setBusy(true);
    try {
      const provider = googleProvider || new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const displayName = result.user.displayName || result.user.email?.split("@")[0] || "Candidate";
      const profile = await persistCandidate(result.user, displayName, "google");
      finish(profile);
    } catch (registerError: any) {
      console.error("[CandidateRegistration] Google registration error:", registerError);
      setError(firebaseMessage(registerError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-[#07152F] p-7 text-white sm:p-10">
            <AIJobsLogo className="h-12 w-auto" />
            <div className="mt-10 max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Candidate Registration</p>
              <h1 className="mt-3 text-3xl font-black leading-tight">Create your AIJOBS account and start applying.</h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">Registration is free for candidates. Complete your basic account now; resume and profile details can be added later from your dashboard.</p>
            </div>
            <div className="mt-8 space-y-3 text-sm text-slate-200">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Free candidate account</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Apply directly from the candidate dashboard</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> AIJOBS does not charge candidates for jobs</div>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mx-auto max-w-xl">
              <h2 className="text-2xl font-black">Register as Candidate</h2>
              <p className="mt-1 text-sm text-slate-500">Use Google for the fastest signup, or create an account with email.</p>

              {error && (
                <div className="mt-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mt-5 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                )}
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200"/><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">or</span><div className="h-px flex-1 bg-slate-200"/></div>

              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Full Name *<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600" placeholder="Rahul Sharma" /></label>
                  <label className="text-xs font-bold text-slate-700">Mobile Number <span className="font-normal text-slate-400">(optional)</span><input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600" placeholder="+91 98765 43210" /></label>
                </div>
                <label className="block text-xs font-bold text-slate-700">Email Address *<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600" placeholder="you@example.com" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">Password *<div className="relative mt-1.5"><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-sm outline-none focus:border-blue-600" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button></div></label>
                  <label className="text-xs font-bold text-slate-700">Confirm Password *<input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-600" /></label>
                </div>

                <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300"/><span>I agree to the <a href="/terms" target="_blank" className="font-bold text-blue-600">Terms of Service</a> and <a href="/privacy-policy" target="_blank" className="font-bold text-blue-600">Privacy Policy</a>.</span></label>

                <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin"/>}{busy ? "Creating account…" : "Create Free Candidate Account"}</button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500">Already registered? <button type="button" onClick={() => { onNavigateToLogin(); window.location.assign("/login"); }} className="font-bold text-blue-600 hover:underline">Sign in</button></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
