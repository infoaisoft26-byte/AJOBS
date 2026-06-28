import { useState, useEffect, useRef } from "react";
import { 
  X, User, Shield, Briefcase, Mail, Lock, UserPlus, Sparkles, 
  Building2, Phone, Key, ArrowLeft, Send, CheckCircle2, AlertCircle,
  HelpCircle, Eye, EyeOff, ShieldCheck
} from "lucide-react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { UserProfile } from "../types";

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: "signin" | "signup";
}

type AuthMode = "signin" | "signup" | "phone-otp" | "forgot-password" | "complete-profile";

export default function AuthModal({ onClose, onAuthSuccess, initialMode = "signin" }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode === "signup" ? "signup" : "signin");
  const [role, setRole] = useState<"candidate" | "consultancy" | "employer" | "admin">("candidate");
  
  // Inputs
  const [name, setName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone OTP
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<any>(null);

  // States
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Temp user for complete-profile flow
  const [tempFbUser, setTempFbUser] = useState<any>(null);

  // Cleanup Recaptcha
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error("reCAPTCHA cleanup error:", e);
        }
      }
    };
  }, []);

  // Post-authentication logic (checks Firestore profile and roles)
  const handlePostAuth = async (fbUser: any) => {
    try {
      const userSnap = await getDoc(doc(db, "users", fbUser.uid));
      if (userSnap.exists()) {
        const userProfile = userSnap.data() as UserProfile;
        onAuthSuccess(userProfile);
        onClose();
      } else {
        // User authenticated but profile does not exist (e.g., brand-new Google or Phone sign-in)
        // Transition to complete-profile step inside the modal
        setTempFbUser(fbUser);
        setName(fbUser.displayName || "");
        setEmail(fbUser.email || "");
        setMode("complete-profile");
      }
    } catch (err: any) {
      console.error("Firestore loading error:", err);
      setError("Successfully signed in, but failed to load database profile.");
    }
  };

  // Google Login
  const handleGoogleLogin = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Setup customized parameters
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      setSuccess("Authenticated with Google successfully!");
      await handlePostAuth(result.user);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Google Sign-In failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP - Send Code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Please enter a valid phone number with country code.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Clear previous verifier
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error(e);
        }
        recaptchaVerifierRef.current = null;
      }

      // Initialize invisible recaptcha verifier
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {
          // reCAPTCHA solved
        },
        "expired-callback": () => {
          setError("reCAPTCHA verification expired. Please try sending OTP again.");
        }
      });
      recaptchaVerifierRef.current = verifier;

      const confirmation = await signInWithPhoneNumber(auth, phoneNumber.trim(), verifier);
      setConfirmationResult(confirmation);
      setPhoneStep("code");
      setSuccess("SMS verification code sent successfully!");
    } catch (err: any) {
      console.error("Phone send code error:", err);
      setError(err.message || "Failed to send SMS code. Check your phone number format (e.g. +14155552671).");
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error(e);
        }
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // Phone OTP - Verify Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await confirmationResult.confirm(otpCode.trim());
      setSuccess("Phone number verified!");
      await handlePostAuth(result.user);
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address to receive reset link.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess("A password reset link has been dispatched to your email address!");
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send reset link. Verify email is correct.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Standard Email Auth (Sign In or Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Form Validation
        const displayName = role === "candidate" ? name : role === "consultancy" ? agencyName : role === "employer" ? companyName : name;
        if (!displayName.trim()) {
          throw new Error(`Please specify your ${role === "candidate" ? "Full Name" : role === "consultancy" ? "Agency Name" : role === "employer" ? "Company Name" : "Admin Name"}`);
        }

        // Firebase Auth: Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;

        // Set Auth Display Name
        await updateProfile(fbUser, { displayName });

        // Save User document in Firestore
        const userProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || email.trim(),
          role,
          name: displayName,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "users", fbUser.uid), userProfile);

        // Seed corresponding schemas dynamically
        if (role === "candidate") {
          await setDoc(doc(db, "candidates", fbUser.uid), {
            userId: fbUser.uid,
            resumeUrl: "",
            resumeFileName: "",
            resumeScore: 0,
            skills: [],
            experience: "",
            aiInterviewScore: 0,
            resumeText: "",
            summary: "",
            careerCoachChat: [],
          });
        } else if (role === "consultancy") {
          await setDoc(doc(db, "consultancies", fbUser.uid), {
            userId: fbUser.uid,
            agencyName: displayName,
            subscriptionStatus: "inactive",
            pricingPlan: "Free",
            clientsCount: 0,
            revenue: 0,
          });
        } else if (role === "employer") {
          await setDoc(doc(db, "employers", fbUser.uid), {
            userId: fbUser.uid,
            companyName: displayName,
            industry: "",
            size: "1-10",
          });
        }

        setSuccess("Account provisioned successfully!");
        onAuthSuccess(userProfile);
        onClose();
      } else {
        // Email login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;
        setSuccess("Sign-In successful!");
        await handlePostAuth(fbUser);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      setError(err.message || "Failed to complete authentication process.");
    } finally {
      setLoading(false);
    }
  };

  // Complete Profile (Social & Phone sign-in fallback)
  const handleCompleteProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempFbUser) return;

    setError("");
    setSuccess("");

    const displayName = role === "candidate" ? name : role === "consultancy" ? agencyName : role === "employer" ? companyName : name;
    if (!displayName.trim()) {
      setError(`Please enter your ${role === "candidate" ? "Name" : role === "consultancy" ? "Agency Name" : role === "employer" ? "Company Name" : "Admin Name"}`);
      return;
    }

    setLoading(true);
    try {
      await updateProfile(tempFbUser, { displayName });

      const userProfile: UserProfile = {
        uid: tempFbUser.uid,
        email: tempFbUser.email || tempFbUser.phoneNumber || `${role}_user@aijobs.com`,
        role,
        name: displayName,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", tempFbUser.uid), userProfile);

      // Seed correct corresponding detail collection
      if (role === "candidate") {
        await setDoc(doc(db, "candidates", tempFbUser.uid), {
          userId: tempFbUser.uid,
          resumeUrl: "",
          resumeFileName: "",
          resumeScore: 0,
          skills: [],
          experience: "",
          aiInterviewScore: 0,
          resumeText: "",
          summary: "",
          careerCoachChat: [],
        });
      } else if (role === "consultancy") {
        await setDoc(doc(db, "consultancies", tempFbUser.uid), {
          userId: tempFbUser.uid,
          agencyName: displayName,
          subscriptionStatus: "inactive",
          pricingPlan: "Free",
          clientsCount: 0,
          revenue: 0,
        });
      } else if (role === "employer") {
        await setDoc(doc(db, "employers", tempFbUser.uid), {
          userId: tempFbUser.uid,
          companyName: displayName,
          industry: "",
          size: "1-10",
        });
      }

      setSuccess("Profile settings saved! Welcome aboard.");
      onAuthSuccess(userProfile);
      onClose();
    } catch (err: any) {
      console.error("Complete profile save error:", err);
      setError(err.message || "Failed to finalize profile.");
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Portal Logins
  const handleQuickDemoLogin = async (selectedRole: "candidate" | "consultancy" | "employer" | "admin") => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const mockUid = `demo_${selectedRole}_${Math.random().toString(36).substring(2, 7)}`;
      const mockNames = {
        candidate: "Aryan Sharma",
        consultancy: "Nexus Talent Partners",
        employer: "Google AI Labs",
        admin: "Super System Admin",
      };

      const userProfile: UserProfile = {
        uid: mockUid,
        email: `${selectedRole}@aijobs.demo`,
        role: selectedRole,
        name: mockNames[selectedRole],
        createdAt: new Date().toISOString(),
      };

      // Store in firestore
      await setDoc(doc(db, "users", mockUid), userProfile);

      if (selectedRole === "candidate") {
        await setDoc(doc(db, "candidates", mockUid), {
          userId: mockUid,
          resumeUrl: "https://demo.pdf",
          resumeFileName: "Aryan_Sharma_Resume.pdf",
          resumeScore: 78,
          skills: ["React", "TypeScript", "Tailwind CSS", "Node.js", "Firebase", "Git"],
          experience: "2+ Years Software Developer",
          aiInterviewScore: 84,
          resumeText: "Aryan Sharma\nWeb Engineer\nReact Developer with experience building responsive cloud web applications.",
          summary: "Highly skilled React Developer focused on performance-driven frontend design, component reusability, and clean software architecture.",
          careerCoachChat: [
            { id: "1", sender: "ai", text: "Welcome to AIJobs Aryan! I am your AI Career Coach. How can I help you accelerate your technical job search today?", timestamp: new Date().toISOString() }
          ],
        });
      } else if (selectedRole === "consultancy") {
        await setDoc(doc(db, "consultancies", mockUid), {
          userId: mockUid,
          agencyName: mockNames[selectedRole],
          subscriptionStatus: "active",
          pricingPlan: "Starter",
          clientsCount: 14,
          revenue: 12500,
        });
      } else if (selectedRole === "employer") {
        await setDoc(doc(db, "employers", mockUid), {
          userId: mockUid,
          companyName: mockNames[selectedRole],
          industry: "Artificial Intelligence",
          size: "501-1000",
        });

        // Seed some starter jobs
        const starterJobs = [
          {
            id: `job_demo_${Math.random().toString(36).substring(2, 6)}`,
            employerId: mockUid,
            companyName: "Google AI Labs",
            title: "Senior React Engineer",
            description: "Join our core team building tomorrow's search interfaces. High autonomy, deep tech stack involving high scale vector workflows.",
            location: "Bengaluru, India (Hybrid)",
            type: "Full-time",
            salary: "₹24,00,000 - ₹32,00,000 PA",
            skillsRequired: ["React", "TypeScript", "Tailwind CSS", "State Management"],
            status: "open",
            createdAt: new Date().toISOString()
          },
          {
            id: `job_demo_${Math.random().toString(36).substring(2, 6)}`,
            employerId: mockUid,
            companyName: "Google AI Labs",
            title: "Generative AI Developer",
            description: "Build products integrated with Gemini SDKs. Focus on full-stack typescript integrations, streaming endpoints, and scalable cloud architectures.",
            location: "Remote (India)",
            type: "Contract",
            salary: "₹18,0,000 - ₹26,0,000 PA",
            skillsRequired: ["Node.js", "Gemini API", "Python", "TypeScript"],
            status: "open",
            createdAt: new Date().toISOString()
          }
        ];

        for (const job of starterJobs) {
          await setDoc(doc(db, "jobs", job.id), job);
        }
      }

      setSuccess("Demo Login initialized!");
      onAuthSuccess(userProfile);
      onClose();
    } catch (err: any) {
      console.error("Demo login error:", err);
      setError("Failed to create mock login: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Hidden reCAPTCHA anchor */}
      <div id="recaptcha-container" className="hidden"></div>

      <div 
        className="relative w-full max-w-lg bg-gray-950/90 rounded-2xl overflow-hidden border border-white/10 shadow-2xl glow-indigo flex flex-col max-h-[92vh] text-white"
        id="auth-modal-container"
      >
        {/* Background Gradients */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px]"></div>
        </div>

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="font-display font-extrabold text-lg tracking-tight">
              {mode === "signin" && "Welcome back to AIJobs"}
              {mode === "signup" && "Create your Workspace"}
              {mode === "phone-otp" && "SMS OTP Authentication"}
              {mode === "forgot-password" && "Dispatch Reset Email"}
              {mode === "complete-profile" && "Complete onboarding Profile"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            id="close-auth-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="relative z-10 overflow-y-auto p-6 space-y-5 flex-1">
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start space-x-2 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start space-x-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Views */}
          {mode === "complete-profile" ? (
            /* ===================================== */
            /* COMPLETE ONBOARDING PROFILE VIEW      */
            /* ===================================== */
            <form onSubmit={handleCompleteProfileSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                🚀 Authenticated successfully! Please choose your preferred account role and set your display name to complete onboarding.
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Register Profile As:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: "candidate", title: "Candidate", icon: User, desc: "Search jobs & AI prep", color: "hover:border-indigo-500 hover:text-indigo-300" },
                    { id: "consultancy", title: "Consultancy", icon: Shield, desc: "Staffing & agency tools", color: "hover:border-purple-500 hover:text-purple-300" },
                    { id: "employer", title: "Employer", icon: Briefcase, desc: "Corporate recruiter dashboard", color: "hover:border-pink-500 hover:text-pink-300" },
                    { id: "admin", title: "Admin Portal", icon: ShieldCheck, desc: "System stats & seed database", color: "hover:border-emerald-500 hover:text-emerald-300" }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSel = role === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setRole(item.id as any)}
                        className={`p-3 rounded-xl flex flex-col items-left text-left border text-xs gap-1.5 transition-all duration-300 cursor-pointer ${
                          isSel
                            ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/80 shadow-md"
                            : "bg-white/5 text-gray-400 border-white/5 " + item.color
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <Icon className={`w-4 h-4 ${isSel ? "text-indigo-400" : "text-gray-500"}`} />
                          {isSel && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>}
                        </div>
                        <div>
                          <p className="font-bold text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inputs based on role */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {role === "candidate" ? "Your Full Name" : role === "consultancy" ? "Agency / Consultancy Name" : role === "employer" ? "Company Name" : "Admin Display Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={role === "candidate" ? name : role === "consultancy" ? agencyName : role === "employer" ? companyName : name}
                      onChange={(e) => {
                        if (role === "candidate" || role === "admin") setName(e.target.value);
                        else if (role === "consultancy") setAgencyName(e.target.value);
                        else setCompanyName(e.target.value);
                      }}
                      required
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all"
                      placeholder={role === "candidate" ? "e.g. Aryan Sharma" : role === "consultancy" ? "e.g. Nexus Talent Partners" : "e.g. Google AI Labs"}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2 text-white shadow-lg cursor-pointer"
              >
                <span>{loading ? "Finalizing Workspace..." : "Access My Workspace"}</span>
              </button>
            </form>
          ) : mode === "forgot-password" ? (
            /* ===================================== */
            /* FORGOT PASSWORD VIEW                 */
            /* ===================================== */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-xs text-gray-400 mb-2 leading-relaxed">
                Provide your account email address and we will dispatch a secure link to reset your workspace credentials.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1 text-white shadow-md cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>{loading ? "Dispatching..." : "Send Reset Link"}</span>
                </button>
              </div>
            </form>
          ) : mode === "phone-otp" ? (
            /* ===================================== */
            /* PHONE OTP VIEW                        */
            /* ===================================== */
            <div className="space-y-4">
              {phoneStep === "phone" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="text-xs text-gray-400 leading-relaxed">
                    Access your account instantly via a one-time SMS verification code. Input your full mobile number starting with your country code (e.g. <span className="text-indigo-400">+1</span> or <span className="text-indigo-400">+91</span>).
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Mobile Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white font-mono transition-all"
                        placeholder="+919876543210"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Email Sign In</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 text-white shadow-md cursor-pointer"
                    >
                      <span>{loading ? "Authenticating..." : "Send SMS Code"}</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-indigo-950/40 border border-indigo-900/30 rounded-xl flex items-start space-x-2 text-xs text-indigo-200">
                    <Phone className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p>SMS verification code successfully routed to <span className="font-bold text-white">{phoneNumber}</span>. Enter code below.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">6-Digit Verification Code</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                        required
                        className="w-full pl-9 pr-4 py-2.5 text-center text-lg font-mono tracking-[0.5em] bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white focus:ring-1 focus:ring-indigo-500"
                        placeholder="000000"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setPhoneStep("phone")}
                      className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Number</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2 px-5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50 text-white shadow-md cursor-pointer"
                    >
                      <span>{loading ? "Verifying..." : "Confirm OTP & Sign In"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ===================================== */
            /* EMAIL SIGN IN & SIGN UP VIEWS         */
            /* ===================================== */
            <div className="space-y-4">
              {/* Selector Tabs */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === "signin" ? "bg-white/10 text-white shadow-sm border border-white/5" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    mode === "signup" ? "bg-white/10 text-white shadow-sm border border-white/5" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Registration Role Selection Card Array */}
              {mode === "signup" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                    I Want To Register As:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "candidate", title: "Candidate", icon: User, desc: "Search jobs & AI prep", color: "hover:border-indigo-500 hover:text-indigo-300" },
                      { id: "consultancy", title: "Consultancy", icon: Shield, desc: "Staffing & agency tools", color: "hover:border-purple-500 hover:text-purple-300" },
                      { id: "employer", title: "Employer", icon: Briefcase, desc: "Corporate recruiter", color: "hover:border-pink-500 hover:text-pink-300" },
                      { id: "admin", title: "Admin Portal", icon: ShieldCheck, desc: "Access DB controls", color: "hover:border-emerald-500 hover:text-emerald-300" }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSel = role === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRole(item.id as any)}
                          className={`p-3 rounded-xl flex flex-col items-left text-left border text-xs gap-1.5 transition-all duration-300 cursor-pointer ${
                            isSel
                              ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/80 shadow-md"
                              : "bg-white/5 text-gray-400 border-white/5 " + item.color
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Icon className={`w-4 h-4 ${isSel ? "text-indigo-400" : "text-gray-500"}`} />
                            {isSel && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>}
                          </div>
                          <div>
                            <p className="font-bold text-white">{item.title}</p>
                            <p className="text-[10px] text-gray-400 font-normal leading-tight mt-0.5">{item.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standard Inputs */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === "signup" && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      {role === "candidate" ? "Full Name" : role === "consultancy" ? "Consultancy Name" : role === "employer" ? "Company Name" : "Admin Display Name"}
                    </label>
                    <div className="relative">
                      {role === "candidate" && <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}
                      {role === "consultancy" && <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}
                      {role === "employer" && <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}
                      {role === "admin" && <ShieldCheck className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />}
                      <input
                        type="text"
                        value={role === "candidate" || role === "admin" ? name : role === "consultancy" ? agencyName : companyName}
                        onChange={(e) => {
                          if (role === "candidate" || role === "admin") setName(e.target.value);
                          else if (role === "consultancy") setAgencyName(e.target.value);
                          else setCompanyName(e.target.value);
                        }}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all"
                        placeholder={role === "candidate" ? "e.g. Aryan Sharma" : role === "consultancy" ? "e.g. Nexus Talent" : "e.g. Google Labs"}
                        id="auth-name-input"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all"
                      placeholder="you@example.com"
                      id="auth-email-input"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">Password</label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot-password")}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        id="auth-forgot-pwd"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-10 py-2 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all"
                      placeholder="••••••••"
                      id="auth-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-500 hover:text-white transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-2.5 px-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-sm font-semibold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 text-white cursor-pointer"
                  id="auth-submit-btn"
                >
                  {mode === "signup" ? <UserPlus className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span>{loading ? "Authenticating..." : mode === "signup" ? "Create Secure Account" : "Access Workspace"}</span>
                </button>
              </form>

              {/* Alternative Auth Dividers */}
              <div className="relative flex items-center justify-center py-2">
                <span className="absolute px-3 bg-[#050508] text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                  Or Social Access
                </span>
                <div className="w-full h-[1px] bg-white/10"></div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="py-2 px-3 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer text-white disabled:opacity-50"
                  id="google-login-btn"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.564-4.437 10.564-10.715 0-.724-.078-1.282-.172-1.71h-10.392z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  onClick={() => {
                    setPhoneStep("phone");
                    setMode("phone-otp");
                  }}
                  disabled={loading}
                  className="py-2 px-3 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer text-white disabled:opacity-50"
                  id="phone-login-btn"
                >
                  <Phone className="w-4 h-4 text-indigo-400" />
                  <span>Phone OTP</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Logins Banner */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-center space-y-3 relative z-10">
            <h4 className="text-[10px] font-bold tracking-wider text-indigo-300 uppercase font-mono flex items-center justify-center gap-1">
              <span>✨ Rapid-Access Developer Portals</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => handleQuickDemoLogin("candidate")}
                className="py-1.5 px-1 bg-indigo-600/30 hover:bg-indigo-600/50 rounded-lg text-[10px] font-bold border border-indigo-500/30 transition-all cursor-pointer text-white"
                id="quick-candidate-login"
              >
                Candidate (Free)
              </button>
              <button
                onClick={() => handleQuickDemoLogin("consultancy")}
                className="py-1.5 px-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-[10px] font-bold border border-purple-500/30 transition-all cursor-pointer text-white"
                id="quick-consultancy-login"
              >
                Consultancy
              </button>
              <button
                onClick={() => handleQuickDemoLogin("employer")}
                className="py-1.5 px-1 bg-pink-600/30 hover:bg-pink-600/50 rounded-lg text-[10px] font-bold border border-pink-500/30 transition-all cursor-pointer text-white"
                id="quick-employer-login"
              >
                Employer
              </button>
              <button
                onClick={() => handleQuickDemoLogin("admin")}
                className="py-1.5 px-1 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all cursor-pointer text-white"
                id="quick-admin-login"
              >
                Super Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
