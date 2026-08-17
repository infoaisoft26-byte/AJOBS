import React, { useState } from "react";
import AIJobsLogo from "./AIJobsLogo";
import { 
  Search, 
  Bell, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Globe, 
  HelpCircle,
  ShieldCheck,
  Check
} from "lucide-react";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface HeaderProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  toggleSidebar: () => void;
  notifications: any[];
  onMarkAllRead: () => void;
  onClearNotification: (id: string) => void;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
}

export default function CandidateHeader({
  userName,
  userEmail,
  onLogout,
  toggleSidebar,
  notifications,
  onMarkAllRead,
  onClearNotification,
  onSelectTab,
  searchQuery,
  setSearchQuery,
  lang,
  setLang
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = (key: string) => getTranslation(lang, key);
  const unreadCount = notifications.filter(n => !n.read).length;

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी (Hindi)" },
    { code: "mr", label: "मराठी (Marathi)" }
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-[rgba(4,12,35,0.85)] border-b border-[rgba(37,99,235,0.35)] backdrop-blur-2xl py-3 px-4 md:px-6 flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Sidebar Toggle & Quick Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-lg">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border border-blue-500/20"
          id="toggle-candidate-sidebar-btn"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="lg:hidden shrink-0">
          <AIJobsLogo variant="compact" size="sm" />
        </div>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-cyan-400/80" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholderTitle")}
            className="w-full pl-9 pr-10 py-2 text-sm bg-slate-950/70 border border-blue-500/30 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 transition-all placeholder:text-slate-500 shadow-inner"
            id="candidate-search-jobs-input"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-cyan-300 text-xs cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Safety Notice Pill (Desktop) */}
      <div className="hidden xl:flex items-center space-x-2 px-3.5 py-1.5 bg-blue-950/60 border border-cyan-500/40 rounded-full text-xs font-medium text-cyan-300 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
        <span className="truncate max-w-md font-semibold tracking-wide">{t("safetyNotice")}</span>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setShowLangMenu(!showLangMenu);
              setShowNotifications(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-slate-950/70 text-slate-200 hover:text-white hover:border-cyan-400/60 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Select Language"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="uppercase font-mono font-bold tracking-wider">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#040d28]/95 border border-blue-500/40 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Select Language
              </div>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code as SupportedLanguage);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                    lang === l.code ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{l.label}</span>
                  {lang === l.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon & Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowLangMenu(false);
              setShowProfileMenu(false);
            }}
            className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 border border-blue-500/30 bg-slate-950/70 transition-all cursor-pointer relative ${
              showNotifications ? "bg-blue-600/30 text-white border-cyan-400" : ""
            }`}
          >
            <Bell className="w-4.5 h-4.5 text-cyan-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 text-[10px] font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full flex items-center justify-center leading-none shadow-[0_0_10px_#00E5FF]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#040d28]/95 border border-blue-500/40 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden z-50 text-slate-100">
              <div className="p-3.5 border-b border-blue-500/20 bg-slate-950/70 flex items-center justify-between text-xs font-semibold">
                <span className="font-bold text-white tracking-wide">{t("notifications")} ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      onMarkAllRead();
                      setShowNotifications(false);
                    }}
                    className="text-cyan-400 hover:underline cursor-pointer font-medium text-xs"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-blue-500/10">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 text-xs relative group ${n.read ? "opacity-60" : "bg-cyan-500/10"}`}>
                      <button 
                        onClick={() => onClearNotification(n.id)}
                        className="absolute top-2.5 right-2.5 p-0.5 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <p className="font-semibold text-white pr-4">{n.title}</p>
                      <p className="text-slate-300 mt-0.5 text-xs leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-cyan-400/80 font-mono mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    No active notifications.
                  </div>
                )}
              </div>
              <div className="p-2.5 border-t border-blue-500/20 bg-slate-950/70 text-center">
                <button
                  onClick={() => {
                    onSelectTab("notifications");
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-cyan-400 hover:underline"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Help Link */}
        <button
          onClick={() => onSelectTab("help")}
          className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border border-blue-500/30 bg-slate-950/70 rounded-xl transition-all cursor-pointer hidden sm:block"
          title={t("help")}
        >
          <HelpCircle className="w-4.5 h-4.5 text-cyan-400" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowLangMenu(false);
            }}
            className="flex items-center space-x-2 p-1.5 rounded-xl bg-slate-950/70 border border-blue-500/30 hover:border-cyan-400/60 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(0,229,255,0.4)]">
              {userName ? userName.charAt(0).toUpperCase() : "C"}
            </div>
            <span className="text-xs font-semibold text-slate-200 hidden md:inline-block pr-1">
              {userName ? userName.split(" ")[0] : "Candidate"}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#040d28]/95 border border-blue-500/40 rounded-xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-1.5 z-50 text-slate-100 animate-in fade-in duration-150">
              <div className="p-3 border-b border-blue-500/20 bg-slate-950/70 rounded-t-lg">
                <p className="font-bold text-sm text-white">{userName}</p>
                <p className="text-xs text-slate-400 truncate font-mono mt-0.5">{userEmail}</p>
              </div>
              <div className="p-1 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    onSelectTab("profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2 font-medium"
                >
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>{t("profile")}</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab("help");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 flex items-center space-x-2 font-medium"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>{t("help")}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
