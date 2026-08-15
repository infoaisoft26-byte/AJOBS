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
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-[calc(100vh-64px)] shadow-xs ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="candidate-sidebar"
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-gray-100 bg-gray-50">
          <span className="font-semibold text-sm text-gray-800">Menu</span>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="px-3 py-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                    ? "bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600 shadow-xs" 
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4.5 h-4.5 ${isSel ? "text-blue-600" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety Notice Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 leading-tight flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>{t("safetyNotice")}</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all cursor-pointer"
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
