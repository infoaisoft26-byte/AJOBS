import React, { useState } from "react";
import { 
  Sparkles, LogOut, Sun, Moon, LayoutDashboard, Volume2, VolumeX, RotateCcw,
  Briefcase, FileText, User, Bell, Users, BarChart3, Database, Shield, MessageSquare,
  Search, PlusCircle, RefreshCw
} from "lucide-react";
import { UserProfile } from "../../types";
import logoImg from "../../assets/images/aijobs_logo_1783014982325.jpg";
import { NotificationBellAndDrawer } from "../NotificationCenter";
import { ExportActivityCsvButton } from "../ExportActivityCsvButton";
import { OfflineSyncBadge } from "../OfflineSyncBadge";
import soundSynth from "../../utils/audioSynth";
import ThreeDModeToggle from "../ThreeDModeToggle";
import { BackgroundMode } from "../ThreeDBackground";

export interface RoleBasedTopbarProps {
  user: UserProfile | null;
  onLogout: () => void;
  onShowAuth: (mode?: "signin" | "signup") => void;
  activeView: string;
  setActiveView: (view: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onReplayIntro?: () => void;
  threeDMode?: BackgroundMode;
  onThreeDModeChange?: (mode: BackgroundMode) => void;
  onOpenCompanyPage?: (page: string) => void;
}

export default function RoleBasedTopbar({
  user,
  onLogout,
  onShowAuth,
  activeView,
  setActiveView,
  theme,
  toggleTheme,
  onReplayIntro,
  threeDMode = "neural",
  onThreeDModeChange,
  onOpenCompanyPage
}: RoleBasedTopbarProps) {
  const [isMuted, setIsMuted] = useState(soundSynth.getMuted());

  const userRole = (user?.role || "guest").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin" || userRole === "super_admin";
  const isRecruiter = userRole === "employer" || userRole === "recruiter" || userRole === "corporate";
  const isCandidate = userRole === "candidate";
  const isConsultancy = userRole === "consultancy" || userRole === "agency";

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundSynth.setMuted(nextMute);
    if (!nextMute) {
      soundSynth.playToggle();
    }
  };

  const scrollToSection = (id: string) => {
    soundSynth.playClick();
    if (activeView !== "home") {
      setActiveView("home");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 md:px-8 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => {
            soundSynth.playClick();
            setActiveView("home");
          }} 
          className="flex items-center space-x-2.5 cursor-pointer group"
          id="topbar-logo"
        >
          <img
            src={logoImg}
            alt="AIJobs Logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shadow-md shadow-blue-500/25 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-display font-extrabold text-xl tracking-[0.05em] text-white">
            AI<span className="text-blue-400">JOBS</span>
          </span>
        </div>

        {/* ROLE-BASED CENTER NAVIGATION */}
        <nav className="hidden lg:flex items-center space-x-4 text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
          {/* GUEST NAVBAR */}
          {!user && (
            <>
              <button onClick={() => scrollToSection("hero-section")} className="hover:text-blue-400 transition-colors cursor-pointer">Home</button>
              <button onClick={() => scrollToSection("how-it-works-section")} className="hover:text-blue-400 transition-colors cursor-pointer">Find Jobs</button>
              <button onClick={() => scrollToSection("ai-features-section")} className="hover:text-blue-400 transition-colors cursor-pointer">AI Interview</button>
              <button onClick={() => scrollToSection("why-aijobs-section")} className="hover:text-blue-400 transition-colors cursor-pointer">Companies</button>
              <button onClick={() => onOpenCompanyPage?.("consultancies")} className="hover:text-blue-400 transition-colors cursor-pointer">Consultancies</button>
              <button onClick={() => scrollToSection("pricing-section")} className="hover:text-blue-400 transition-colors cursor-pointer">Pricing</button>
              <button onClick={() => onOpenCompanyPage?.("about")} className="hover:text-blue-400 transition-colors cursor-pointer">About</button>
              <button onClick={() => onOpenCompanyPage?.("contact")} className="hover:text-blue-400 transition-colors cursor-pointer">Contact</button>
            </>
          )}

          {/* CANDIDATE NAVBAR */}
          {user && isCandidate && (
            <>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); }} 
                className={`hover:text-blue-400 transition-colors cursor-pointer flex items-center space-x-1 ${activeView === "dashboard" ? "text-blue-400 font-extrabold" : ""}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "jobs" })); }} 
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Find Jobs
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "resume" })); }} 
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Resume
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "interviews" })); }} 
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                AI Interview
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "profile" })); }} 
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Profile
              </button>
            </>
          )}

          {/* RECRUITER / EMPLOYER NAVBAR */}
          {user && (isRecruiter || isConsultancy) && (
            <>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); }} 
                className={`hover:text-indigo-400 transition-colors cursor-pointer flex items-center space-x-1 ${activeView === "dashboard" ? "text-indigo-400 font-extrabold" : ""}`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Recruiter Panel</span>
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "post-job" })); }} 
                className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center space-x-1 text-emerald-400"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Post Job</span>
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "candidates" })); }} 
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Candidate Database
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "applications" })); }} 
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Applications
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "interviews" })); }} 
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Interviews
              </button>
            </>
          )}

          {/* ADMIN / SUPER ADMIN NAVBAR */}
          {user && isAdmin && (
            <>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); }} 
                className={`hover:text-amber-400 transition-colors cursor-pointer flex items-center space-x-1 ${activeView === "dashboard" ? "text-amber-400 font-extrabold" : ""}`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "users" })); }} 
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                User Management
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "jobs" })); }} 
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                Jobs
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "crm" })); }} 
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                CRM
              </button>
              <button 
                onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "audit" })); }} 
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                Audit Logs
              </button>
            </>
          )}
        </nav>

        {/* RIGHT SIDE ACTIONS & UTILITIES */}
        <div className="flex items-center space-x-2 md:space-x-3">
          
          {/* ADMIN-ONLY UTILITIES */}
          {user && isAdmin && (
            <>
              <div className="hidden sm:block">
                <OfflineSyncBadge />
              </div>
              <div className="hidden md:block">
                <ExportActivityCsvButton role={user.role} variant="compact" label="Export CSV" />
              </div>
              {onThreeDModeChange && (
                <ThreeDModeToggle currentMode={threeDMode} onModeChange={onThreeDModeChange} />
              )}
              {onReplayIntro && (
                <button
                  onClick={() => { soundSynth.playClick(); onReplayIntro(); }}
                  className="p-1.5 text-gray-400 hover:text-amber-300 rounded-lg hover:bg-white/5 transition-all cursor-pointer hidden sm:block"
                  title="Refresh / Replay Intro"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                </button>
              )}
              <button
                onClick={handleToggleMute}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                title={isMuted ? "Unmute Sound FX" : "Mute Sound FX"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </>
          )}

          {/* RECRUITER-ONLY CSV EXPORT BUTTON */}
          {user && (isRecruiter || isConsultancy) && (
            <div className="hidden md:block">
              <ExportActivityCsvButton role={user.role} variant="compact" label="Export CSV" />
            </div>
          )}

          {/* NOTIFICATION BELL FOR SIGNED IN USERS */}
          {user && (
            <NotificationBellAndDrawer 
              userId={user.uid} 
              userRole={user.role} 
              onSelectTab={(tab) => {
                soundSynth.playClick();
                setActiveView(tab);
              }}
            />
          )}

          {/* THEME TOGGLE */}
          <button
            onClick={() => { soundSynth.playToggle(); toggleTheme(); }}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* USER PROFILE OR AUTH BUTTONS */}
          {user ? (
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-100">{user.name}</span>
                <span className="text-[9px] text-gray-400 capitalize font-mono">{user.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-blue-300 shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => { soundSynth.playClick(); onLogout(); }}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => { soundSynth.playClick(); onShowAuth("signin"); }}
                className="px-3.5 py-1.5 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => { soundSynth.playClick(); onShowAuth("signup"); }}
                className="px-4 py-1.5 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:scale-105 transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
