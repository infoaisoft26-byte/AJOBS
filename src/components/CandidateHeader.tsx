import { useState } from "react";
import { 
  Search, Bell, MessageSquare, Sun, Moon, Menu, ShieldCheck, 
  CheckCircle, LogOut, ExternalLink, X, Settings
} from "lucide-react";
import { NotificationRecord } from "../types";
import { motion, AnimatePresence } from "motion/react";

const SAMPLE_SUGGESTIONS = [
  "React Developer",
  "Fullstack Engineer (Node.js)",
  "AI & ML Research Specialist",
  "Cloud Solutions Architect",
  "DevOps Engineer (Kubernetes)",
  "Python Backend Developer",
  "Data Scientist",
  "UI/UX Design Lead"
];

interface HeaderProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  toggleSidebar: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  notifications: NotificationRecord[];
  onMarkAllRead: () => void;
  onClearNotification: (id: string) => void;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function CandidateHeader({
  userName,
  userEmail,
  onLogout,
  toggleSidebar,
  theme,
  toggleTheme,
  notifications,
  onMarkAllRead,
  onClearNotification,
  onSelectTab,
  searchQuery,
  setSearchQuery
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const filteredSuggestions = SAMPLE_SUGGESTIONS.filter(item => 
    searchQuery && item.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 4);

  return (
    <div className="sticky top-[73px] z-30 w-full bg-[#030305]/85 backdrop-blur-md border-b border-white/5 py-3.5 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Search Bar / Menu Toggler */}
      <div className="flex items-center space-x-3 flex-1 max-w-md">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
          id="toggle-candidate-sidebar-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-sm hidden sm:block">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 250)}
            placeholder="Search open positions or technology stack..."
            className="w-full pl-9 pr-12 py-2 text-xs bg-[#11111a]/80 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-white transition-all font-mono"
            id="candidate-search-jobs-input"
            autoComplete="off"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-white text-xs cursor-pointer"
            >
              Clear
            </button>
          )}

          {/* Holographic suggestions dropdown with upward-floating particle animation */}
          <AnimatePresence>
            {inputFocused && filteredSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="absolute top-12 left-0 w-full bg-zinc-950/95 border border-indigo-500/40 backdrop-blur-3xl rounded-2xl p-3.5 z-50 shadow-[0_15px_40px_rgba(59,130,246,0.25),0_0_20px_rgba(99,102,241,0.15)] space-y-2 overflow-hidden"
              >
                {/* Background Rising Matrix Particles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 90, opacity: 0, scale: 0.6 }}
                      animate={{ y: -15, opacity: [0, 0.7, 0], scale: [0.6, 1.2, 0.6] }}
                      transition={{
                        duration: 2.2 + i * 0.4,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                      className="absolute bg-indigo-500/30 rounded-full"
                      style={{
                        width: Math.random() * 5 + 3,
                        height: Math.random() * 5 + 3,
                        left: `${15 + i * 18}%`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-[9px] uppercase font-mono text-indigo-400 tracking-widest mb-1.5 flex justify-between items-center relative z-10">
                  <span>HOLOGRAPHIC INDEX MATCHES</span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                </div>

                <div className="space-y-1.5 relative z-10">
                  {filteredSuggestions.map((suggestion, idx) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.04 }}
                      onMouseDown={() => {
                        setSearchQuery(suggestion);
                        setInputFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/15 text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <span className="truncate font-mono">{suggestion}</span>
                      <span className="text-[9px] font-mono opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">
                        QUERY &rarr;
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* Messages / AI Coach Shortcuts */}
        <button
          onClick={() => onSelectTab("coach")}
          className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer relative"
          title="AI Career Coach Session"
          id="messages-shortcut-btn"
        >
          <MessageSquare className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
        </button>

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer relative ${
              showNotifications ? "bg-white/5 text-white" : ""
            }`}
            id="notifications-dropdown-btn"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[14px] text-[8px] font-mono font-extrabold bg-indigo-500 text-white rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3.5 w-80 bg-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in duration-200">
              <div className="p-3.5 border-b border-white/5 bg-black/40 flex items-center justify-between text-xs">
                <span className="font-bold">Notifications ({unreadCount} new)</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={() => {
                      onMarkAllRead();
                      setShowNotifications(false);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-white/5 scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-3 text-[11px] leading-relaxed relative group ${n.read ? "opacity-70" : "bg-white/5"}`}>
                      <button 
                        onClick={() => onClearNotification(n.id)}
                        className="absolute top-2.5 right-2.5 p-0.5 rounded text-gray-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <p className="font-bold text-gray-200 pr-4">{n.title}</p>
                      <p className="text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-1">
                        {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-gray-500 italic">
                    No active notification alerts.
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-white/5 bg-black/20 text-center">
                <button
                  onClick={() => {
                    onSelectTab("notifications");
                    setShowNotifications(false);
                  }}
                  className="text-[10px] text-gray-400 hover:text-white font-mono uppercase tracking-wider font-bold"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer hover:bg-white/5"
          id="header-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* User Account / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 p-1 rounded-xl hover:bg-white/5 transition-all text-left cursor-pointer"
            id="profile-dropdown-btn"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs shadow shadow-indigo-500/20">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-gray-300 hidden md:inline-block pr-1">
              {userName.split(" ")[0]}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-52 bg-gray-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 text-white animate-in fade-in duration-200">
              <div className="p-3 border-b border-white/5 bg-black/40 text-xs">
                <p className="font-bold text-gray-200 leading-none">{userName}</p>
                <p className="text-[10px] text-gray-500 mt-1 truncate">{userEmail}</p>
              </div>
              <div className="p-1 text-xs">
                <button
                  onClick={() => {
                    onSelectTab("profile");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab("settings");
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
