import React, { useState } from "react";
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
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 py-3 px-4 md:px-6 flex items-center justify-between gap-4 shadow-xs">
      {/* Sidebar Toggle & Quick Search */}
      <div className="flex items-center space-x-3 flex-1 max-w-lg">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          id="toggle-candidate-sidebar-btn"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholderTitle")}
            className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-gray-900 transition-all placeholder:text-gray-400"
            id="candidate-search-jobs-input"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-xs cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Safety Notice Pill (Desktop) */}
      <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-medium text-blue-800">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span className="truncate max-w-md">{t("safetyNotice")}</span>
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
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
            title="Select Language"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="uppercase font-bold">{lang}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in duration-150">
              <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase">
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
                    lang === l.code ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{l.label}</span>
                  {lang === l.code && <Check className="w-3.5 h-3.5 text-blue-600" />}
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
            className={`p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all cursor-pointer relative ${
              showNotifications ? "bg-gray-100 text-gray-900" : ""
            }`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-50 text-gray-900">
              <div className="p-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between text-xs font-semibold">
                <span>{t("notifications")} ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      onMarkAllRead();
                      setShowNotifications(false);
                    }}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 text-xs relative group ${n.read ? "opacity-75" : "bg-blue-50/50"}`}>
                      <button 
                        onClick={() => onClearNotification(n.id)}
                        className="absolute top-2.5 right-2.5 p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <p className="font-semibold text-gray-900 pr-4">{n.title}</p>
                      <p className="text-gray-600 mt-0.5 text-xs">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-500 italic">
                    No active notifications.
                  </div>
                )}
              </div>
              <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center">
                <button
                  onClick={() => {
                    onSelectTab("notifications");
                    setShowNotifications(false);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
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
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer hidden sm:block"
          title={t("help")}
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowLangMenu(false);
            }}
            className="flex items-center space-x-2 p-1 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {userName ? userName.charAt(0).toUpperCase() : "C"}
            </div>
            <span className="text-sm font-semibold text-gray-800 hidden md:inline-block pr-1">
              {userName ? userName.split(" ")[0] : "Candidate"}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-1 z-50 text-gray-900 animate-in fade-in duration-150">
              <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <p className="font-bold text-sm text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <div className="p-1 space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    onSelectTab("profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center space-x-2 font-medium"
                >
                  <User className="w-4 h-4 text-blue-600" />
                  <span>{t("profile")}</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab("help");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center space-x-2 font-medium"
                >
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  <span>{t("help")}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center space-x-2 font-medium"
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
