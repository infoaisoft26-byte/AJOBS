import React from "react";
import { Home, Search, Clock, FileText, User, MoreHorizontal, Calendar, Heart, Bell, HelpCircle } from "lucide-react";
import { SupportedLanguage, getTranslation } from "../utils/candidateTranslations";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  lang: SupportedLanguage;
  unreadCount?: number;
  onOpenMoreMenu: () => void;
}

export default function CandidateMobileBottomNav({
  activeTab,
  setActiveTab,
  lang,
  unreadCount = 0,
  onOpenMoreMenu
}: MobileBottomNavProps) {
  const t = (key: string) => getTranslation(lang, key);

  const primaryItems = [
    { id: "overview", label: t("home"), icon: Home },
    { id: "explore-jobs", label: t("findJobs"), icon: Search },
    { id: "applied-jobs", label: t("myApplications"), icon: Clock },
    { id: "resume", label: t("resume"), icon: FileText },
    { id: "profile", label: t("profile"), icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg lg:hidden px-2 py-1.5 flex items-center justify-around">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[56px] ${
              isActive
                ? "text-blue-600 font-bold bg-blue-50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
            <span className="text-[10px] truncate max-w-[64px] font-medium leading-none">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-gray-500 hover:text-gray-800 transition-all min-w-[56px] relative"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 text-gray-500" />
        <span className="text-[10px] truncate font-medium leading-none">More</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 bg-blue-600 rounded-full"></span>
        )}
      </button>
    </div>
  );
}
