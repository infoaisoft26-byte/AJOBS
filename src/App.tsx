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
          console.error("Error loading user snapshot:", err);
          showToast("Failed to retrieve profile snapshot", "error");
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

  return (
    <div className={`min-h-screen flex flex-col font-sans relative overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "bg-[#050508] text-white" : "bg-gray-100 text-gray-900"
    }`}>
      {/* Background Atmosphere */}
      {theme === "dark" && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 opacity-10 bg-immersive-grid"></div>
        </div>
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
      />

      {!isFirebaseConfigured && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-xs text-yellow-300 flex items-center justify-center gap-2 z-20">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span>Firebase connection is inactive (empty or placeholder keys). Please update configuration under settings. Standard authentication is run in sandbox demo mode.</span>
        </div>
      )}

      {/* Main Panel Routing with Lazy Loading & Skeletons */}
      <main className="flex-1 w-full relative">
        <ErrorBoundary>
          {authLoading ? (
            <div className="flex items-center justify-center h-96">
              <span className="text-sm text-gray-400 font-mono animate-pulse">Establishing Secure Workspace Connect...</span>
            </div>
          ) : activeView === "home" ? (
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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
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
            <div className="animate-in fade-in duration-300">
              <Suspense fallback={<DashboardSkeleton />}>
                {user?.role === "candidate" && (
                  <CandidateDashboard userId={user.uid} userName={user.name} />
                )}
                {user?.role === "consultancy" && (
                  <ConsultancyDashboard userId={user.uid} userName={user.name} />
                )}
                {user?.role === "employer" && (
                  <EmployerDashboard userId={user.uid} userName={user.name} />
                )}
                {user?.role === "admin" && (
                  <AdminDashboard />
                )}
              </Suspense>
            </div>
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
