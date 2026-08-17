import React from "react";
import { 
  Home, 
  Search, 
  Clock, 
  FileText, 
  Calendar, 
  Heart, 
  Bell, 
  User, 
  HelpCircle, 
  LogOut, 
  X,
  ShieldCheck
} from "lucide-react";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  unreadCount: number;
  onLogout?: () => void;
  lang?: SupportedLanguage;
}

export default function CandidateSidebar({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  unreadCount,
  onLogout,
  lang = "en"
}: SidebarProps) {
  const t = (key: string) => getTranslation(lang, key);

  const menuItems = [
    { id: "overview", label: t("home"), icon: Home },
    { id: "explore-jobs", label: t("findJobs"), icon: Search },
    { id: "applied-jobs", label: t("myApplications"), icon: Clock },
    { id: "resume", label: t("resume"), icon: FileText },
    { id: "interviews", label: t("interviews"), icon: Calendar },
    { id: "saved-jobs", label: t("savedJobs"), icon: Heart },
    { 
      id: "notifications", 
      label: t("notifications"), 
      icon: Bell, 
      badge: unreadCount > 0 ? unreadCount : undefined 
    },
    { id: "profile", label: t("profile"), icon: User },
    { id: "help", label: t("help"), icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[rgba(4,12,35,0.92)] border-r border-[rgba(37,99,235,0.35)] backdrop-blur-2xl transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-[calc(100vh-64px)] shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="candidate-sidebar"
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-blue-500/20 bg-slate-950/70">
          <span className="font-bold text-sm text-white font-mono tracking-wider">PORTAL NAVIGATION</span>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
          <div className="px-3 py-2 mb-1 text-[11px] font-bold text-cyan-400/90 uppercase tracking-widest font-mono">
            Candidate Portal
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSel = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isSel 
                    ? "bg-gradient-to-r from-blue-600/30 to-cyan-500/15 text-cyan-300 font-semibold border border-cyan-400/50 shadow-[0_0_20px_rgba(0,229,255,0.2)]" 
                    : "text-slate-400 hover:text-white hover:bg-white/5 hover:translate-x-1"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4.5 h-4.5 transition-colors ${isSel ? "text-cyan-400 drop-shadow-[0_0_8px_#00E5FF]" : "text-slate-500"}`} />
                  <span className="tracking-wide">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full shadow-[0_0_10px_#00E5FF]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety Notice Footer */}
        <div className="p-4 border-t border-blue-500/20 bg-slate-950/80 space-y-3">
          <div className="p-2.5 rounded-xl bg-blue-950/70 border border-cyan-500/30 text-[11px] text-cyan-300 leading-tight flex items-start space-x-2 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="font-medium">{t("safetyNotice")}</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>{t("logout")}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
