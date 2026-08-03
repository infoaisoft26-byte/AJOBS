import React, { KeyboardEvent, ReactNode, Suspense, lazy, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Bot, Cookie, Route, Type, User, UserCheck } from "lucide-react";
import { auth, isFirebaseConfigured } from "./firebase";

// Lazy-loaded dashboard and view components for minimal initial bundle size
const CandidateDashboard = lazy(() => import("@/components/CandidateDashboard"));
const ConsultancyDashboard = lazy(() => import("@/components/ConsultancyDashboard"));
const EmployerDashboard = lazy(() => import("@/components/EmployerDashboard"));
const AdminDashboard = lazy(() => {
  console.log("[Trace Lazy] AdminDashboard lazy import starting...");
  return import("@/components/AdminDashboard")
    .then((m) => {
      console.log("[Trace Lazy] AdminDashboard lazy import success");
      return m;
    })
    .catch((err) => {
      console.error("[Trace Lazy] AdminDashboard lazy import failed:", err);
      return {
        default: () => (
          <div className="p-8 max-w-md mx-auto text-center space-y-4 bg-gray-900 border border-red-500/30 rounded-2xl my-12 text-white">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="font-bold text-lg">Failed to Load Admin Dashboard Module</h3>
            <p className="text-xs text-gray-400">A network or chunk error occurred while loading the Admin Dashboard component.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold text-white rounded-xl cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        )
      };
    });
});
const VerificationOnboardingView = lazy(() => import("@/components/VerificationOnboardingView"));
const JobDetailsLazy = lazy(() => import("@/components/JobDetails"));
const NotificationCenterViewLazy = lazy(() =>
  import("@/components/NotificationCenter").then((m) => ({ default: m.NotificationCenterView }))
);

// Lazy-loaded secondary pages & modals
const CandidatePreLaunchLoginLazy = lazy(() => import("@/components/CandidatePreLaunchLogin"));
const CandidateRegisterLazy = lazy(() => import("@/components/CandidateRegister"));
const CandidatePreLaunchProfileLazy = lazy(() => import("@/components/CandidatePreLaunchProfile"));
const InternalPlatformLoginLazy = lazy(() => import("@/components/InternalPlatformLogin"));
const AdminLoginLazy = lazy(() => import("@/components/AdminLogin"));
const UnsubscribeViewLazy = lazy(() => import("@/components/UnsubscribeView"));
const ResumeOnboardingLazy = lazy(() => import("@/components/ResumeOnboarding"));
const AuthModalLazy = lazy(() => import("@/components/AuthModal"));
const CompanySectionLazy = lazy(() => import("@/components/CompanySection"));
const AIJobs3DIntroLazy = lazy(() => import("@/components/AIJobs3DIntro"));
const ThreeDBackgroundLazy = lazy(() => import("@/components/ThreeDBackground"));
const GlobalChatbotLazy = lazy(() =>
  import("@/components/GlobalChatbot").then((m) => ({ default: m.GlobalChatbot }))
);

// Production infrastructure components
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DashboardSkeleton, GeneralLoading } from "@/components/LoadingSkeleton";
import { CookieConsent } from "@/components/CookieConsent";
import { CustomCursor } from "@/components/CustomCursor";
import { ToastProvider, useToast } from "@/components/GlobalToast";
import Header from "@/components/Header";
import LandingPage from "@/components/LandingPage";
import { type BackgroundMode } from "@/components/ThreeDBackground";
import { LanguageProvider } from "@/context/LanguageContext";
import { GlobalMarketplaceProvider } from "@/context/GlobalMarketplaceContext";
import { initGA, trackPageView, trackInteraction } from "@/utils/analytics";
import { validateEnvironment } from "@/utils/envValidation";
import { getOrCreateUserProfile } from "@/services/dbInitService";
import { isAdminRole, normalizeRole } from "@/utils/roleUtils";

// Route Guards
import CandidatePreLaunchGuard from "@/components/guards/CandidatePreLaunchGuard";
import InternalAccessGuard from "@/components/guards/InternalAccessGuard";
import AdminGuard from "@/components/guards/AdminGuard";

function PageTransitionParticles({ triggerKey }: { triggerKey: string }) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; top: number; size: number; delay: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 45 }).map((_, i) => ({
      id: i + Math.random(),
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 6 + 3,
      delay: Math.random() * 0.25,
    }));
    setParticles(newParticles);
  }, [triggerKey]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0, y: 40 }}
            animate={{ 
              opacity: [0, 0.75, 0], 
              scale: [0, 1.4, 0], 
              y: -100, 
              x: (Math.random() - 0.5) * 60,
            }}
            transition={{ 
              duration: 1.1, 
              delay: p.delay,
              ease: "easeOut" 
            }}
            className="absolute rounded bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ProtectedRouteProps {
  user: UserProfile | null;
  allowedRoles: string[];
  fallbackView: string;
  setActiveView: (view: string) => void;
  setAuthMode: (mode: "signin" | "signup" | null) => void;
  children: React.ReactNode;
}

function ProtectedRoute({ 
  user, 
  allowedRoles, 
  fallbackView, 
  setActiveView, 
  setAuthMode, 
  children 
}: ProtectedRouteProps) {
  const normRole = normalizeRole(user?.role);
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  useEffect(() => {
    if (!user) {
      setAuthMode("signin");
      setActiveView(fallbackView);
    } else if (user && !normalizedAllowed.includes(normRole) && !allowedRoles.includes(user.role || "")) {
      setActiveView(fallbackView);
    }
  }, [user, allowedRoles, fallbackView, setActiveView, setAuthMode, normRole, normalizedAllowed]);

  if (!user) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 glass rounded-2xl border border-white/10 my-12 bg-gray-900/40">
        <AlertTriangle className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
        <h3 className="font-bold text-white text-lg">Dashboard Access Locked</h3>
        <p className="text-xs text-gray-400">Please login or register to access the intelligence portals.</p>
        <button 
          onClick={() => setAuthMode("signin")}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  if (user && !normalizedAllowed.includes(normRole) && !allowedRoles.includes(user.role || "")) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4 glass rounded-2xl border border-white/10 my-12 bg-gray-900/40">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="font-bold text-white text-lg">Access Denied</h3>
        <p className="text-xs text-gray-400">Your current role profile ("{user.role}") does not possess authorized clearance to access this department workspace.</p>
        <button 
          onClick={() => setActiveView("home")}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function MainAppContent() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/unsubscribe") {
      return "unsubscribe";
    }
    return "home";
  });
  const [activeCompanyPage, setActiveCompanyPage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [authRole, setAuthRole] = useState<"candidate" | "consultancy" | "employer" | "recruiter" | undefined>(undefined);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === "reload" || (performance.navigation && performance.navigation.type === 1);
    if (isReload) {
      return true;
    }
    const viewedInSession = sessionStorage.getItem("aijobs_3d_intro_played");
    if (viewedInSession === "true") {
      return false;
    }
    return true;
  });
  const [threeDMode, setThreeDMode] = useState<BackgroundMode>(() => {
    if (typeof localStorage !== "undefined") {
      return (localStorage.getItem("aijobs_3d_mode") as BackgroundMode) || "neural";
    }
    return "neural";
  });
  const { showToast } = useToast();

  const handleThreeDModeChange = (newMode: BackgroundMode) => {
    setThreeDMode(newMode);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("aijobs_3d_mode", newMode);
    }
  };

  // On client startup: initialize telemetry, service worker, and env validation
  useEffect(() => {
    // Register PWA Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA Service Worker] Connected to offline scope:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA Service Worker] Failed to register:", err);
          });
      });
    }

    // Initialize Analytics
    initGA();

    // Client-side environment validations
    const validation = validateEnvironment();
    if (!validation.isValid) {
      validation.errors.forEach((err) => console.error("[Production Env Error]:", err));
    }
    validation.warnings.forEach((warn) => console.warn("[Production Env Warning]:", warn));
  }, []);

  // Global keyboard shortcut listeners (Cmd+D or Ctrl+D) to navigate to the dashboard
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "d")) {
        e.preventDefault();
        console.log("[Shortcut] Navigating to dashboard...");
        setActiveView("dashboard");
        window.dispatchEvent(new CustomEvent("navigate-to-dashboard-overview"));
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // SEO: Dynamic meta tags, Open Graph, and Structured Data (JSON-LD)
  useEffect(() => {
    const metaMap: Record<string, { title: string; desc: string }> = {
      home: {
        title: "AIJobs | Premium AI-Powered Recruitment Platform & Talent Matchmaker",
        desc: "Connect instantly with top global recruiters using deep semantic matching, AI-driven evaluation models, and automated interview management pipelines."
      },
      dashboard: {
        title: "Recruitment Workspace Dashboard | AIJobs",
        desc: "Manage candidate evaluation stages, resumes, active matches, and live communications seamlessly on your private dashboard."
      },
      notifications: {
        title: "Secure Communication Gateways | AIJobs",
        desc: "Access instant updates from system endpoints and automated email notifications dispatch logs."
      }
    };

    const currentMeta = metaMap[activeView] || metaMap.home;
    document.title = currentMeta.title;

    // Track dynamic page view
    trackPageView(window.location.pathname + "#" + activeView, currentMeta.title);

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", currentMeta.desc);

    // Inject/Update structured JSON-LD data dynamically
    const schemaId = "aijobs-structured-schema";
    let schemaScript = document.getElementById(schemaId);
    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.setAttribute("id", schemaId);
      schemaScript.setAttribute("type", "application/ld+json");
      document.head.appendChild(schemaScript);
    }
    
    schemaScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "AIJobs",
      "alternateName": "AIJobs Recruitment",
      "url": window.location.origin,
      "description": currentMeta.desc,
      "applicationCategory": "BusinessApplication, Recruitment",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR"
      }
    });
  }, [activeView]);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setAuthLoading(true);
      if (fbUser) {
        let profile: UserProfile | null = null;
        try {
          // Attempt 1: Fetch or auto-create profile snapshot
          profile = await getOrCreateUserProfile(fbUser);
        } catch (err) {
          console.error("[Auth] Error fetching user profile snapshot, retrying once...", err);
          try {
            // Attempt 2: Retry loading profile once before fallback
            await new Promise((res) => setTimeout(res, 300));
            profile = await getOrCreateUserProfile(fbUser);
          } catch (retryErr) {
            console.error("[Auth] Retry fetch for user profile snapshot failed:", retryErr);
          }
        }

        if (profile) {
          setUser(profile);
          const normRole = normalizeRole(profile.role);
          console.log(`[Trace Auth] Authenticated UID: ${fbUser.uid}, Resolved Role: ${profile.role}, Normalized Role: ${normRole}`);
          trackInteraction("login_success", "auth", profile.role);

          if (isAdminRole(profile.role)) {
            console.log(`[Trace Auth] Admin role detected. ActiveView: ${activeView}`);
            if (activeView === "admin-login" || activeView === "home" || activeView === "internal-login") {
              console.log("[Trace Auth] Routing admin to 'admin-dashboard'");
              setActiveView("admin-dashboard");
            }
          } else if (profile.role === "candidate" && !profile.profileCompleted) {
            window.history.pushState({}, "", "/resume/onboarding");
            setActiveView("resume-onboarding");
          }
        } else {
          // Default fallback for missing profile - MUST default to candidate
          const defaultProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "User Desk",
            email: fbUser.email || "",
            role: "candidate",
            profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            status: "active",
            subscription: "Enterprise Access"
          };
          setUser(defaultProfile);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle URL Routing & Popstate
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const searchJobId = searchParams.get("jobId");

    const routePath = (p: string) => {
      if (searchJobId) {
        setActiveView(`job-details-${searchJobId}`);
      } else if (p.startsWith("/jobs/")) {
        const parts = p.split("-");
        const jId = parts[parts.length - 1];
        if (jId) setActiveView(`job-details-${jId}`);
      } else if (p === "/candidate-login") {
        setActiveView("candidate-login");
      } else if (p === "/candidate-register") {
        setActiveView("candidate-register");
      } else if (p === "/candidate/pre-launch-profile") {
        setActiveView("pre-launch-profile");
      } else if (p === "/internal-login") {
        setActiveView("internal-login");
      } else if (p === "/admin-login") {
        setActiveView("admin-login");
      } else if (p === "/admin/dashboard" || p.startsWith("/admin")) {
        setActiveView("admin-dashboard");
      } else if (p === "/internal/candidate") {
        setActiveView("internal-candidate");
      } else if (p === "/internal/employer") {
        setActiveView("internal-employer");
      } else if (p === "/internal/consultancy") {
        setActiveView("internal-consultancy");
      } else if (p === "/resume/onboarding") {
        setActiveView("resume-onboarding");
      } else if (p === "/candidate/profile" || p === "/candidate/dashboard") {
        setActiveView("dashboard");
      } else if (p.startsWith("/recruiter/") || p.startsWith("/employer/") || p === "/recruiter" || p === "/employer") {
        setActiveView("dashboard");
      } else if (p === "/") {
        setActiveView("home");
      }
    };

    routePath(path);

    const handlePopState = () => {
      routePath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Theme support
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      document.body.style.backgroundColor = "#f3f4f6";
      document.body.style.color = "#111827";
    } else {
      document.documentElement.classList.remove("light");
      document.body.style.backgroundColor = "#030712";
      document.body.style.color = "#f9fafb";
    }
    showToast(`Interface switched to ${nextTheme} mode`, "info", 1500);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setActiveView("home");
      showToast("Workspace session terminated successfully", "success");
      trackInteraction("logout", "auth");
    } catch (err) {
      console.error(err);
      showToast("Failed to terminate workspace session", "error");
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setActiveView("dashboard");
    showToast(`Authenticated as: ${profile.name}`, "success");
  };

  const handleUpdateUserRole = async (selectedRole: "candidate" | "consultancy" | "employer" | "admin") => {
    if (!user) return;
    setAuthLoading(true);
    try {
      // 1. Initialize Firestore collections and docs
      const updatedProfile = await initializeUserCollectionsAndDocs(
        { uid: user.uid, email: user.email, displayName: user.name },
        selectedRole,
        user.name
      );
      
      // 2. Set user state
      setUser(updatedProfile);
      showToast(`Workspace configured successfully: ${selectedRole}`, "success");
    } catch (err) {
      console.error("Error setting user role:", err);
      showToast("Failed to initialize selected workspace", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const renderDashboardByRole = () => {
    if (!user) {
      return (
        <div id="dashboard-locked-fallback" className="p-8 max-w-md mx-auto text-center space-y-4 glass rounded-2xl border border-white/10 my-12 bg-gray-900/40">
          <AlertTriangle className="w-12 h-12 text-indigo-400 mx-auto animate-bounce" />
          <h3 className="font-bold text-white text-lg">Dashboard Access Locked</h3>
          <p className="text-xs text-gray-400">Please login or register to access the intelligence portals.</p>
          <button 
            id="btn-signin-fallback"
            onClick={() => setAuthMode("signin")}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      );
    }

    const normRole = normalizeRole(user.role);

    switch (normRole) {
      case "candidate":
        return (
          <ProtectedRoute 
            user={user} 
            allowedRoles={["candidate", "admin", "super_admin"]} 
            fallbackView="home" 
            setActiveView={setActiveView} 
            setAuthMode={setAuthMode}
          >
            <CandidateDashboard userId={user.uid} userName={user.name} />
          </ProtectedRoute>
        );
      case "consultancy":
        {
          const isVerified = user.isApproved === true && user.status === "active" && user.kycStatus === "verified";
          if (!isVerified || user.accountStatus === "pending_verification" || user.accountStatus === "suspended_for_review" || user.accountStatus === "resubmission_required") {
            return (
              <VerificationOnboardingView 
                user={user} 
                onLogout={handleLogout} 
                onStatusUpdate={() => {
                  auth.currentUser && getOrCreateUserProfile(auth.currentUser).then(setUser);
                }} 
              />
            );
          }
          return (
            <ProtectedRoute 
              user={user} 
              allowedRoles={["consultancy", "admin", "super_admin"]} 
              fallbackView="home" 
              setActiveView={setActiveView} 
              setAuthMode={setAuthMode}
            >
              <ConsultancyDashboard userId={user.uid} userName={user.name} />
            </ProtectedRoute>
          );
        }
      case "employer":
      case "recruiter":
        {
          const isVerified = user.isApproved === true && user.status === "active" && user.kycStatus === "verified";
          if (!isVerified || user.accountStatus === "pending_verification" || user.accountStatus === "suspended_for_review" || user.accountStatus === "resubmission_required") {
            return (
              <VerificationOnboardingView 
                user={user} 
                onLogout={handleLogout} 
                onStatusUpdate={() => {
                  auth.currentUser && getOrCreateUserProfile(auth.currentUser).then(setUser);
                }} 
              />
            );
          }
          return (
            <ProtectedRoute 
              user={user} 
              allowedRoles={["employer", "recruiter", "admin", "super_admin"]} 
              fallbackView="home" 
              setActiveView={setActiveView} 
              setAuthMode={setAuthMode}
            >
              <EmployerDashboard userId={user.uid} userName={user.name} userRole={user.role} />
            </ProtectedRoute>
          );
        }
      case "admin":
      case "superadmin":
      case "super_admin":
        console.log(`[Trace Route] Selected route for admin role '${normRole}' (raw: ${user.role}, UID: ${user.uid}): AdminDashboard`);
        return (
          <ProtectedRoute 
            user={user} 
            allowedRoles={["admin", "superadmin", "super_admin"]} 
            fallbackView="home" 
            setActiveView={setActiveView} 
            setAuthMode={setAuthMode}
          >
            <ErrorBoundary componentName="AdminDashboard" onLogout={handleLogout}>
              <Suspense fallback={<DashboardSkeleton />}>
                <AdminDashboard userId={user.uid} userName={user.name} />
              </Suspense>
            </ErrorBoundary>
          </ProtectedRoute>
        );
      default:
        return (
          <div id="dashboard-role-selector" className="p-8 max-w-lg mx-auto text-center space-y-4 glass rounded-2xl border border-red-500/30 my-12 bg-gray-900/60 shadow-2xl backdrop-blur-md">
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 uppercase tracking-wider shadow-sm">
                <UserCheck className="w-3.5 h-3.5 text-red-400" /> Access Configuration Error
              </span>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="font-bold text-white text-lg">Unassigned Role Configuration</h3>
            <p className="text-xs text-gray-300">
              Your profile role ("{user.role || "unknown"}") is not recognized or assigned to a designated workspace. Please select your workspace account type below:
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <button 
                id="btn-select-candidate"
                onClick={() => handleUpdateUserRole("candidate")}
                className="py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/40 text-xs font-bold text-indigo-300 rounded-xl border border-indigo-500/30 hover:border-indigo-400 transition-all duration-200 cursor-pointer"
              >
                Candidate Workspace
              </button>
              <button 
                id="btn-select-employer"
                onClick={() => handleUpdateUserRole("employer")}
                className="py-2.5 px-3 bg-pink-600/20 hover:bg-pink-600/40 text-xs font-bold text-pink-300 rounded-xl border border-pink-500/30 hover:border-pink-400 transition-all duration-200 cursor-pointer"
              >
                Recruiter Workspace
              </button>
              <button 
                id="btn-select-consultancy"
                onClick={() => handleUpdateUserRole("consultancy")}
                className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-xs font-bold text-emerald-300 rounded-xl border border-emerald-500/30 hover:border-emerald-400 transition-all duration-200 cursor-pointer"
              >
                Consultancy Agency
              </button>
              <button 
                id="btn-select-admin"
                onClick={() => handleUpdateUserRole("admin")}
                className="py-2.5 px-3 bg-yellow-600/20 hover:bg-yellow-600/40 text-xs font-bold text-yellow-300 rounded-xl border border-yellow-500/30 hover:border-yellow-400 transition-all duration-200 cursor-pointer"
              >
                Administrator Desk
              </button>
            </div>
          </div>
        );
    }
  };

  // Deferred 3D background mounting so DOM paint completes first
  const [mount3D, setMount3D] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMount3D(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "bg-[#020204] text-white" : "bg-gray-100 text-gray-900"
    }`}>
      {/* Interactive 5D Custom Cursor */}
      <CustomCursor />

      {/* Global 3D Interactive React Three Fiber Canvas Background (Deferred) */}
      {theme === "dark" && mount3D && (
        <Suspense fallback={null}>
          <ThreeDBackgroundLazy mode={threeDMode} />
        </Suspense>
      )}

      {/* Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onShowAuth={(mode) => setAuthMode(mode || "signin")}
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view === "dashboard" && !user) {
            setAuthMode("signin");
            setActiveView("home");
            showToast("Please authenticate to access recruitment dashboard", "warning");
          }
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        onReplayIntro={() => setShowSplash(true)}
        threeDMode={threeDMode}
        onThreeDModeChange={handleThreeDModeChange}
      />

      {!isFirebaseConfigured && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-xs text-yellow-300 flex items-center justify-center gap-2 z-20">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span>Firebase connection is inactive (empty or placeholder keys). Please update configuration under settings. Standard authentication is run in sandbox demo mode.</span>
        </div>
      )}

      {/* Main Panel Routing with Lazy Loading & Skeletons */}
      <main className="flex-1 w-full relative">
        <PageTransitionParticles triggerKey={activeView} />
        <ErrorBoundary>
          {authLoading ? (
            <div className="flex items-center justify-center h-96">
              <span className="text-sm text-gray-400 font-mono animate-pulse">Establishing Secure Workspace Connect...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 15, scale: 0.98, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -15, scale: 1.02, filter: "blur(12px)" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full min-h-full"
              >
                {activeView === "unsubscribe" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <UnsubscribeViewLazy />
                  </Suspense>
                ) : activeView === "home" ? (
                  <LandingPage
                    onGetStarted={() => {
                      if (user) {
                        setActiveView("pre-launch-profile");
                      } else {
                        setActiveView("candidate-register");
                      }
                    }}
                    setActiveView={setActiveView}
                    onOpenCompanyPage={(page) => setActiveCompanyPage(page)}
                    onSelectJob={(jobId) => setActiveView(`job-details-${jobId}`)}
                    onOpenAuth={(mode, role) => {
                      setAuthRole(role);
                      setAuthMode(mode);
                    }}
                    user={user}
                  />
                ) : activeView === "candidate-login" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <CandidatePreLaunchLoginLazy
                      onLoginSuccess={(profile) => {
                        setUser(profile);
                        setActiveView("pre-launch-profile");
                      }}
                      onNavigateToRegister={() => setActiveView("candidate-register")}
                    />
                  </Suspense>
                ) : activeView === "candidate-register" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <CandidateRegisterLazy
                      onRegisterSuccess={(profile) => {
                        setUser(profile);
                        setActiveView("pre-launch-profile");
                      }}
                      onNavigateToLogin={() => setActiveView("candidate-login")}
                    />
                  </Suspense>
                ) : activeView === "pre-launch-profile" ? (
                  <CandidatePreLaunchGuard
                    user={user}
                    onNavigateToLogin={() => setActiveView("candidate-login")}
                  >
                    <Suspense fallback={<GeneralLoading />}>
                      <CandidatePreLaunchProfileLazy
                        user={user}
                        onEditProfile={() => setActiveView("resume-onboarding")}
                      />
                    </Suspense>
                  </CandidatePreLaunchGuard>
                ) : activeView === "internal-login" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <InternalPlatformLoginLazy
                      onAuthorizedSuccess={(profile, targetRoute) => {
                        setUser(profile);
                        if (targetRoute === "/admin/dashboard") setActiveView("admin-dashboard");
                        else if (targetRoute === "/internal/employer") setActiveView("internal-employer");
                        else if (targetRoute === "/internal/consultancy") setActiveView("internal-consultancy");
                        else setActiveView("internal-candidate");
                      }}
                      onCandidateRedirect={() => setActiveView("pre-launch-profile")}
                    />
                  </Suspense>
                ) : activeView === "admin-login" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <AdminLoginLazy
                      onAdminLoginSuccess={(profile) => {
                        setUser(profile);
                        setActiveView("admin-dashboard");
                      }}
                    />
                  </Suspense>
                ) : activeView === "admin-dashboard" ? (
                  <AdminGuard
                    user={user}
                    onNavigateToAdminLogin={() => setActiveView("admin-login")}
                  >
                    <ErrorBoundary componentName="AdminDashboard" onLogout={handleLogout}>
                      <Suspense fallback={<DashboardSkeleton />}>
                        <AdminDashboard
                          userId={user?.uid}
                          userName={user?.name}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  </AdminGuard>
                ) : activeView === "internal-candidate" ? (
                  <InternalAccessGuard
                    user={user}
                    onCandidateRedirect={() => setActiveView("pre-launch-profile")}
                    onNavigateToInternalLogin={() => setActiveView("internal-login")}
                  >
                    <Suspense fallback={<DashboardSkeleton />}>
                      <CandidateDashboard
                        userId={user?.uid || ""}
                        userName={user?.name || "Candidate"}
                        userEmail={user?.email}
                        onResumeUploadSuccess={() => {}}
                        onFindJobsClick={() => setActiveView("home")}
                        onNavigateToOnboarding={() => setActiveView("resume-onboarding")}
                      />
                    </Suspense>
                  </InternalAccessGuard>
                ) : activeView === "internal-employer" ? (
                  <InternalAccessGuard
                    user={user}
                    onCandidateRedirect={() => setActiveView("pre-launch-profile")}
                    onNavigateToInternalLogin={() => setActiveView("internal-login")}
                  >
                    <Suspense fallback={<DashboardSkeleton />}>
                      <EmployerDashboard
                        userId={user?.uid || ""}
                        companyName={user?.name || "Company"}
                      />
                    </Suspense>
                  </InternalAccessGuard>
                ) : activeView === "internal-consultancy" ? (
                  <InternalAccessGuard
                    user={user}
                    onCandidateRedirect={() => setActiveView("pre-launch-profile")}
                    onNavigateToInternalLogin={() => setActiveView("internal-login")}
                  >
                    <Suspense fallback={<DashboardSkeleton />}>
                      <ConsultancyDashboard
                        userId={user?.uid || ""}
                        consultancyName={user?.name || "Consultancy"}
                      />
                    </Suspense>
                  </InternalAccessGuard>
                ) : activeView.startsWith("job-details-") ? (
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Suspense fallback={<GeneralLoading />}>
                      <JobDetailsLazy
                        jobId={activeView.replace("job-details-", "")}
                        userId={user?.uid || ""}
                        userName={user?.name || "Guest Candidate"}
                        profile={user}
                        onBack={() => setActiveView("home")}
                        onSelectSimilarJob={(simId) => setActiveView(`job-details-${simId}`)}
                      />
                    </Suspense>
                  </div>
                ) : activeView === "resume-onboarding" ? (
                  <Suspense fallback={<GeneralLoading />}>
                    <ResumeOnboardingLazy
                      user={user}
                      setUser={setUser}
                      setActiveView={setActiveView}
                    />
                  </Suspense>
                ) : activeView === "notifications" ? (
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {user ? (
                      <Suspense fallback={<GeneralLoading />}>
                        <NotificationCenterViewLazy 
                          userId={user.uid} 
                          userRole={user.role} 
                          userName={user.name} 
                        />
                      </Suspense>
                    ) : (
                      <div className="text-center text-gray-400 py-12 font-mono">Please log in to configure communication endpoints.</div>
                    )}
                  </div>
                ) : (
                  <div id="dashboard-render-container">
                    <Suspense fallback={<DashboardSkeleton />}>
                      {renderDashboardByRole()}
                    </Suspense>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </ErrorBoundary>
      </main>

      {/* Auth Overlay Modal */}
      {authMode && (
        <Suspense fallback={null}>
          <AuthModalLazy
            initialMode={authMode}
            initialRole={authRole}
            onClose={() => {
              setAuthMode(null);
              setAuthRole(undefined);
            }}
            onAuthSuccess={handleAuthSuccess}
          />
        </Suspense>
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {activeCompanyPage && (
        <Suspense fallback={null}>
          <CompanySectionLazy
            pageType={activeCompanyPage}
            onClose={() => setActiveCompanyPage(null)}
          />
        </Suspense>
      )}

      {/* Premium 3D Opening Animation Intro Overlay */}
      {showSplash && (
        <Suspense fallback={null}>
          <AIJobs3DIntroLazy onComplete={() => {
            setShowSplash(false);
            try {
              sessionStorage.setItem("aijobs_3d_intro_played", "true");
            } catch (e) {
              // ignore
            }
          }} />
        </Suspense>
      )}

      {/* Globally Floating AI Career Assistant - Deferred load on user click */}
      {showChatbot ? (
        <Suspense fallback={null}>
          <GlobalChatbotLazy user={user} />
        </Suspense>
      ) : (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 z-50 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/30 font-medium text-xs shadow-indigo-500/25"
          title="Open AI Career Assistant"
        >
          <Bot className="w-5 h-5 text-indigo-200 animate-pulse" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <GlobalMarketplaceProvider>
        <ToastProvider>
          <MainAppContent />
        </ToastProvider>
      </GlobalMarketplaceProvider>
    </LanguageProvider>
  );
}
