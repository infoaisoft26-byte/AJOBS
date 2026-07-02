import { Sparkles, LogOut, Sun, Moon, Briefcase, LayoutDashboard } from "lucide-react";
import { UserProfile } from "../types";
import logoImg from "../assets/images/aijobs_logo_1783014982325.jpg";
import { NotificationBellAndDrawer } from "./NotificationCenter";

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onShowAuth: (mode?: "signin" | "signup") => void;
  activeView: string;
  setActiveView: (view: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function Header({
  user,
  onLogout,
  onShowAuth,
  activeView,
  setActiveView,
  theme,
  toggleTheme,
}: HeaderProps) {
  const scrollToSection = (id: string) => {
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
    <header className="sticky top-0 z-50 w-full bg-black/60 backdrop-blur-md border-b border-white/5 px-4 py-3.5 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => setActiveView("home")} 
          className="flex items-center space-x-2.5 cursor-pointer group animate-in fade-in duration-300"
          id="header-logo"
        >
          <img
            src={logoImg}
            alt="AIJobs Logo"
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-display font-extrabold text-xl tracking-[0.05em] text-white">
            AI<span className="text-blue-400">JOBS</span>
          </span>
        </div>

        {/* Desktop Centered Links */}
        <nav className="hidden lg:flex items-center space-x-5 text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
          <button onClick={() => scrollToSection("hero-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Home</button>
          <button onClick={() => scrollToSection("how-it-works-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Find Jobs</button>
          <button onClick={() => scrollToSection("ai-features-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">AI Interview</button>
          <button onClick={() => scrollToSection("why-aijobs-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Companies</button>
          <button onClick={() => scrollToSection("why-aijobs-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Consultancies</button>
          <button onClick={() => scrollToSection("pricing-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Pricing</button>
          <button onClick={() => scrollToSection("testimonials-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">About</button>
          <button onClick={() => scrollToSection("footer-section")} className="hover:text-indigo-400 transition-colors cursor-pointer">Contact</button>
        </nav>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-3">
          {user && (
            <button
              onClick={() => setActiveView("dashboard")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === "dashboard"
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-gray-300 hover:bg-white/5"
              }`}
              id="header-dashboard-btn"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          {/* Notification Bell and Drawer */}
          {user && (
            <NotificationBellAndDrawer 
              userId={user.uid} 
              userRole={user.role} 
              onSelectTab={(tab) => {
                setActiveView(tab);
              }}
            />
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            id="theme-toggle-btn"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* User Section / Auth buttons */}
          {user ? (
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-100">{user.name}</span>
                <span className="text-[9px] text-gray-400 capitalize font-mono">{user.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-indigo-300">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                id="logout-btn"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onShowAuth("signin")}
                className="hidden sm:inline-block px-3 py-1.5 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
                id="header-login-btn"
              >
                Login
              </button>
              <button
                onClick={() => onShowAuth("signup")}
                className="hidden sm:inline-block px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-bold text-gray-200 hover:bg-white/5 transition-all cursor-pointer"
                id="header-register-btn"
              >
                Register
              </button>
              <button
                onClick={() => onShowAuth("signup")}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:opacity-95 text-xs font-bold active:scale-95 transition-all shadow-md shadow-indigo-500/15 cursor-pointer"
                id="header-get-started-btn"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
