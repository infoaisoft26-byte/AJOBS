import { useState } from "react";
import { Contact, Database, Home, LayoutDashboard, LogOut, Logs, Menu, Moon, PlusCircle, RotateCcw, Settings, Shield, ShieldCheck, Sun, User, Volume2, VolumeX, X } from "lucide-react";
import { auth } from "../../firebase";

import { UserProfile } from "../../types";
import AIJobsLogo from "../AIJobsLogo";
import { NotificationBellAndDrawer } from "../NotificationCenter";
import { ExportActivityCsvButton } from "../ExportActivityCsvButton";
import { OfflineSyncBadge } from "../OfflineSyncBadge";
import soundSynth from "../../utils/audioSynth";
import ThreeDModeToggle from "../ThreeDModeToggle";
import { BackgroundMode } from "../ThreeDBackground";
import { LanguageSelector } from "../GlobalMarketplaceSelector";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setMobileMenuOpen(false);
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
    <>
      <header className="sticky top-0 z-40 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 px-3 sm:px-4 py-3 md:px-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Brand Logo & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2" id="topbar-logo">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 lg:hidden text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AIJobsLogo
              variant="compact"
              size="sm"
              onClick={() => {
                soundSynth.playClick();
                setActiveView("home");
              }}
            />
          </div>

        {/* ROLE-BASED CENTER NAVIGATION */}
        <nav className="hidden lg:flex items-center space-x-5 text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
          {/* GUEST NAVBAR */}
          {!user && (
            <>
              <button onClick={() => { soundSynth.playClick(); setActiveView("public-jobs"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Jobs</button>
              <button onClick={() => { soundSynth.playClick(); onOpenCompanyPage?.("career-tools"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Career Tools</button>
              <button onClick={() => { soundSynth.playClick(); setActiveView("resume-onboarding"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Resume</button>
              <button onClick={() => { soundSynth.playClick(); onOpenCompanyPage?.("companies"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Companies</button>
              <button onClick={() => { soundSynth.playClick(); onOpenCompanyPage?.("consultancies"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Consultancies</button>
              <button onClick={() => { soundSynth.playClick(); onOpenCompanyPage?.("career-guidance"); }} className="hover:text-blue-400 transition-colors cursor-pointer">Career Guidance</button>
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

          {/* 15-SECOND CINEMATIC BRAND FILM REPLAY BUTTON */}
          {onReplayIntro && (
            <button
              onClick={() => { soundSynth.playClick(); onReplayIntro(); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-blue-500/30 hover:border-blue-400/50 text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              title="Play 15-Second Ultra-Realistic Cinematic Brand Film"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="hidden sm:inline text-[11px] font-bold text-blue-300">Brand Film</span>
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}

          {/* LANGUAGE SELECTOR */}
          <LanguageSelector />

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
                {(user.name || user.email || "U").charAt(0).toUpperCase()}
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
                onClick={() => { soundSynth.playClick(); onOpenCompanyPage?.("employers"); }}
                className="hidden sm:inline-block px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
              >
                For Employers
              </button>
              <button
                onClick={() => { soundSynth.playClick(); onShowAuth("signin"); }}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={() => { soundSynth.playClick(); onShowAuth("signup"); }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-[#050508] border-r border-white/10 flex flex-col h-full overflow-y-auto shadow-2xl transition-transform duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <AIJobsLogo
                variant="compact"
                size="sm"
                onClick={() => {
                  soundSynth.playClick();
                  setActiveView("home");
                  setMobileMenuOpen(false);
                }}
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase block">
                {user ? `${userRole.toUpperCase()} NAVIGATION` : "NAVIGATION"}
              </span>

              <nav className="space-y-1">
                {!user && (
                  <>
                    <button onClick={() => { setMobileMenuOpen(false); setActiveView("home"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Home</button>
                    <button onClick={() => { setMobileMenuOpen(false); setActiveView("public-jobs"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Jobs</button>
                    <button onClick={() => { setMobileMenuOpen(false); onOpenCompanyPage?.("career-tools"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Career Tools</button>
                    <button onClick={() => { setMobileMenuOpen(false); setActiveView("resume-onboarding"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Resume</button>
                    <button onClick={() => { setMobileMenuOpen(false); onOpenCompanyPage?.("companies"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Companies</button>
                    <button onClick={() => { setMobileMenuOpen(false); onOpenCompanyPage?.("consultancies"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Consultancies</button>
                    <button onClick={() => { setMobileMenuOpen(false); onOpenCompanyPage?.("career-guidance"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">Career Guidance</button>
                    <button onClick={() => { setMobileMenuOpen(false); onOpenCompanyPage?.("employers"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">For Employers</button>
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <button onClick={() => { setMobileMenuOpen(false); onShowAuth("signin"); }} className="w-full py-2.5 rounded-xl bg-white/10 text-center text-xs font-bold text-white hover:bg-white/20 cursor-pointer">Login</button>
                      <button onClick={() => { setMobileMenuOpen(false); onShowAuth("signup"); }} className="w-full py-2.5 rounded-xl bg-blue-600 text-center text-xs font-bold text-white shadow-lg shadow-blue-600/30 cursor-pointer">Register</button>
                    </div>
                  </>
                )}

                {user && isCandidate && (
                  <>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-400 bg-blue-500/10 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "jobs" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Find Jobs
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "resume" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Resume & ATS
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "interviews" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      AI Interview Arena
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "profile" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Profile
                    </button>
                  </>
                )}

                {user && (isRecruiter || isConsultancy) && (
                  <>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Recruiter Panel</span>
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "post-job" })); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 cursor-pointer">
                      <PlusCircle className="w-4 h-4" />
                      <span>Post Job</span>
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "candidates" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Candidate Database
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "applications" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Applications
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("recruiter-nav", { detail: "interviews" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Interviews
                    </button>
                  </>
                )}

                {user && isAdmin && (
                  <>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); setMobileMenuOpen(false); }} className="w-full flex items-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 cursor-pointer">
                      <Shield className="w-4 h-4" />
                      <span>Admin Console</span>
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "users" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      User Management
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "jobs" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Jobs Management
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "crm" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      CRM
                    </button>
                    <button onClick={() => { soundSynth.playClick(); setActiveView("dashboard"); window.dispatchEvent(new CustomEvent("admin-nav", { detail: "audit" })); setMobileMenuOpen(false); }} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer">
                      Audit Logs
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Bottom Actions Area: Profile, Settings, Support & Logout */}
            <div className="mt-auto p-4 border-t border-white/10 bg-black/60 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center space-x-3 pb-3 border-b border-white/5">
                    <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-sm font-bold text-blue-300">
                      {(user.name || user.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-bold text-white truncate">{user.name}</span>
                      <span className="text-[10px] text-gray-400 capitalize font-mono truncate">{user.role}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setActiveView("dashboard");
                      if (isCandidate) window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "profile" }));
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setActiveView("dashboard");
                      if (isCandidate) window.dispatchEvent(new CustomEvent("candidate-nav", { detail: "settings" }));
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setMobileMenuOpen(false);
                      onOpenCompanyPage?.("contact");
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
                  >
                    <Contact className="w-4 h-4 text-emerald-400" />
                    <span>Support & Contact</span>
                  </button>

                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all mt-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setMobileMenuOpen(false);
                      setActiveView("candidate-login");
                    }}
                    className="w-full py-2.5 text-xs font-bold text-gray-200 border border-white/10 rounded-xl hover:bg-white/5 cursor-pointer"
                  >
                    Login to Account
                  </button>
                  <button
                    onClick={() => {
                      soundSynth.playClick();
                      setMobileMenuOpen(false);
                      setActiveView("candidate-register");
                    }}
                    className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg cursor-pointer"
                  >
                    Register as Candidate
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
