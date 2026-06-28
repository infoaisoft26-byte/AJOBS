import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { UserProfile } from "./types";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import LandingPage from "./components/LandingPage";
import CandidateDashboard from "./components/CandidateDashboard";
import ConsultancyDashboard from "./components/ConsultancyDashboard";
import EmployerDashboard from "./components/EmployerDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<string>("home");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [authLoading, setAuthLoading] = useState(true);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setAuthLoading(true);
      if (fbUser) {
        try {
          const userSnap = await getDoc(doc(db, "users", fbUser.uid));
          if (userSnap.exists()) {
            setUser(userSnap.data() as UserProfile);
          } else {
            // Fallback profile
            const fallbackProfile: UserProfile = {
              uid: fbUser.uid,
              email: fbUser.email || "",
              role: "candidate",
              name: fbUser.displayName || "Aryan Sharma",
              createdAt: new Date().toISOString()
            };
            setUser(fallbackProfile);
          }
        } catch (err) {
          console.error("Error loading user snapshot:", err);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
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
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setActiveView("home");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setActiveView("dashboard");
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
          // If returning home, keep it. If dashboard, make sure auth check
          if (view === "dashboard" && !user) {
            setAuthMode("signin");
            setActiveView("home");
          }
        }}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Panel Routing */}
      <main className="flex-1 w-full relative">
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
        ) : (
          <div className="animate-in fade-in duration-300">
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
          </div>
        )}
      </main>

      {/* Auth Overlay Modal */}
      {authMode && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
