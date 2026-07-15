import { useState, useEffect, lazy, Suspense } from "react";
import { auth, db, isFirebaseConfigured } from "./firebase";
import { AlertTriangle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from "./types";
import { initializeUserCollectionsAndDocs, getOrCreateUserProfile } from "./services/dbInitService";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import LandingPage from "./components/LandingPage";
import SplashScreen from "./components/SplashScreen";
import CinematicBackground from "./components/CinematicBackground";
import { motion, AnimatePresence } from "motion/react";

// Lazy-loaded dashboard components for smaller initial bundle sizes
const CandidateDashboard = lazy(() => import("./components/CandidateDashboard"));
const ConsultancyDashboard = lazy(() => import("./components/ConsultancyDashboard"));
const EmployerDashboard = lazy(() => import("./components/EmployerDashboard"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const NotificationCenterViewLazy = lazy(() =>
  import("./components/NotificationCenter").then((m) => ({ default: m.NotificationCenterView }))
);

// Production infrastructure components
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardSkeleton, GeneralLoading } from "./components/LoadingSkeleton";
import { CookieConsent } from "./components/CookieConsent";
import { ToastProvider, useToast } from "./components/GlobalToast";
import { initGA, trackPageView, trackInteraction } from "./utils/analytics";
import { validateEnvironment } from "./utils/envValidation";

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
  useEffect(() => {
    if (!user) {
      setAuthMode("signin");
      setActiveView(fallbackView);
    } else if (user && !allowedRoles.includes(user.role || "")) {
      setActiveView(fallbackView);
    }
  }, [user, allowedRoles, fallbackView, setActiveView, setAuthMode]);

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

  if (user && !allowedRoles.includes(user.role || "")) {
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
  const [activeView, setActiveView] = useState<string>("home");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const { showToast } = useToast();

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
        try {
          // Highly resilient auto-recovery profile retriever
          const profile = await getOrCreateUserProfile(fbUser);
          setUser(profile);
          trackInteraction("login_success", "auth", profile.role);
        } catch (err) {
          console.error("Error loading user snapshot, triggering resilient client-side fallback:", err);
          showToast("Failed to retrieve profile snapshot, entering fallback workspace mode", "warning");
          
          // Deduce role from email prefixes or default to candidate
          const emailLower = (fbUser.email || "").toLowerCase();
          let deducedRole: "candidate" | "consultancy" | "employer" | "admin" = "candidate";
          if (emailLower.includes("admin")) {
            deducedRole = "admin";
          } else if (emailLower.includes("employer") || emailLower.includes("company") || emailLower.includes("corporate") || emailLower.includes("recruiter")) {
            deducedRole = "employer";
          } else if (emailLower.includes("consultancy") || emailLower.includes("agency") || emailLower.includes("crm")) {
            deducedRole = "consultancy";
          }

          const fallbackProfile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "User Desk",
            email: fbUser.email || "",
            role: deducedRole,
            profileImage: fbUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(fbUser.uid)}`,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            status: "active",
            subscription: deducedRole === "consultancy" ? "Pro Agency" : "Enterprise Access"
          };
          setUser(fallbackProfile);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [showToast]);

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

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "bg-[#020204] text-white" : "bg-gray-100 text-gray-900"
    }`}>
      {/* Global Cinematic 3D Background */}
      {theme === "dark" && <CinematicBackground />}

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
                {activeView === "home" ? (
                  <LandingPage
                    onGetStarted={() => {
                      if (user) {
                        setActiveView("dashboard");
                      } else {
                        setAuthMode("signup");
                      }
                    }}
                    setActiveView={setActiveView}
                  />
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
                  <div>
                    <Suspense fallback={<DashboardSkeleton />}>
                      {user && (user.role === "candidate") && (
                        <ProtectedRoute 
                          user={user} 
                          allowedRoles={["candidate"]} 
                          fallbackView="home" 
                          setActiveView={setActiveView} 
                          setAuthMode={setAuthMode}
                        >
                          <CandidateDashboard userId={user.uid} userName={user.name} />
                        </ProtectedRoute>
                      )}
                      {user && (user.role === "consultancy" || user.role === "agency") && (
                        <ProtectedRoute 
                          user={user} 
                          allowedRoles={["consultancy", "agency"]} 
                          fallbackView="home" 
                          setActiveView={setActiveView} 
                          setAuthMode={setAuthMode}
                        >
                          <ConsultancyDashboard userId={user.uid} userName={user.name} />
                        </ProtectedRoute>
                      )}
                      {user && (user.role === "employer" || user.role === "recruiter" || user.role === "corporate") && (
                        <ProtectedRoute 
                          user={user} 
                          allowedRoles={["employer", "recruiter", "corporate"]} 
                          fallbackView="home" 
                          setActiveView={setActiveView} 
                          setAuthMode={setAuthMode}
                        >
                          <EmployerDashboard userId={user.uid} userName={user.name} userRole={user.role} />
                        </ProtectedRoute>
                      )}
                      {user && (user.role === "admin" || user.role === "superadmin") && (
                        <ProtectedRoute 
                          user={user} 
                          allowedRoles={["admin", "superadmin"]} 
                          fallbackView="home" 
                          setActiveView={setActiveView} 
                          setAuthMode={setAuthMode}
                        >
                          <AdminDashboard userId={user.uid} userName={user.name} />
                        </ProtectedRoute>
                      )}

                      {/* Resilient Fallback - If user exists but role doesn't match any of the above */}
                      {user && !["candidate", "consultancy", "agency", "employer", "recruiter", "corporate", "admin", "superadmin"].includes(user.role || "") && (
                        <div className="p-8 max-w-lg mx-auto text-center space-y-4 glass rounded-2xl border border-white/10 my-12 bg-gray-900/40">
                          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
                          <h3 className="font-bold text-white text-lg">Select Dashboard Workspace</h3>
                          <p className="text-xs text-gray-400">Your profile doesn't have a workspace role designated. Please select your account type to proceed:</p>
                          <div className="grid grid-cols-2 gap-4 pt-4">
                            <button 
                              onClick={() => handleUpdateUserRole("candidate")}
                              className="py-2.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-xs font-bold text-indigo-300 rounded-xl border border-indigo-500/30 transition-all cursor-pointer"
                            >
                              Candidate Workspace
                            </button>
                            <button 
                              onClick={() => handleUpdateUserRole("employer")}
                              className="py-2.5 bg-pink-600/20 hover:bg-pink-600/40 text-xs font-bold text-pink-300 rounded-xl border border-pink-500/30 transition-all cursor-pointer"
                            >
                              Recruiter Workspace
                            </button>
                            <button 
                              onClick={() => handleUpdateUserRole("consultancy")}
                              className="py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-xs font-bold text-emerald-300 rounded-xl border border-emerald-500/30 transition-all cursor-pointer"
                            >
                              Consultancy Agency
                            </button>
                            <button 
                              onClick={() => handleUpdateUserRole("admin")}
                              className="py-2.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-xs font-bold text-yellow-300 rounded-xl border border-yellow-500/30 transition-all cursor-pointer"
                            >
                              Administrator Desk
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback if user is null but activeView is dashboard */}
                      {!user && (
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
                      )}
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
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Premium SplashScreen Overlay */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}
