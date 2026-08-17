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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[rgba(4,12,35,0.92)] backdrop-blur-2xl border-t border-[rgba(37,99,235,0.35)] shadow-[0_-4px_30px_rgba(0,0,0,0.7)] lg:hidden px-2 py-1.5 flex items-center justify-around">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all min-w-[56px] relative ${
              isActive
                ? "text-cyan-300 font-bold bg-cyan-500/15 border border-cyan-400/40 shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-cyan-400 drop-shadow-[0_0_6px_#00E5FF]" : "text-slate-400"}`} />
            <span className="text-[10px] truncate max-w-[64px] font-medium leading-none">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        onClick={onOpenMoreMenu}
        className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition-all min-w-[56px] relative"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5 text-slate-400" />
        <span className="text-[10px] truncate font-medium leading-none">More</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_#00E5FF]"></span>
        )}
      </button>
    </div>
  );
}
