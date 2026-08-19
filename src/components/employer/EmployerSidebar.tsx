import React from "react";
import { 
  TrendingUp, 
  PlusCircle, 
  Briefcase, 
  Users, 
  Search, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Building2, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import AIJobsLogo from "../AIJobsLogo";

export interface EmployerSidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onLogout?: () => void;
  counts?: {
    jobs?: number;
    applications?: number;
    interviews?: number;
    messages?: number;
  };
  companyName?: string;
  userName?: string;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function EmployerSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  counts = {},
  companyName = "Verified Employer",
  userName = "Hiring Leader",
  isMobile = false,
  onCloseMobile
}: EmployerSidebarProps) {
  const mainNavItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "post-job", label: "Post a Job", icon: PlusCircle, isCta: true },
    { id: "my-jobs", label: "My Jobs", icon: Briefcase, count: counts.jobs },
    { id: "applications", label: "Applications", icon: Users, count: counts.applications },
    { id: "candidate-search", label: "Candidate Search", icon: Search },
    { id: "ai-shortlist", label: "AI Shortlist", icon: Sparkles, badge: "AI" },
    { id: "interviews", label: "Interviews", icon: Calendar, count: counts.interviews },
    { id: "messages", label: "Messages", icon: MessageSquare, count: counts.messages },
  ];

  const secondaryNavItems = [
    { id: "company-profile", label: "Company Profile", icon: Building2 },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ];

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#17111F] text-slate-200 border-r border-purple-500/20 select-none ${isMobile ? "w-full p-4" : "w-64 p-4 rounded-3xl backdrop-blur-xl shadow-2xl border"}`}>
      
      {/* Brand Header (shown in mobile drawer or standalone) */}
      {isMobile && (
        <div className="pb-4 mb-3 border-b border-purple-500/20 flex items-center justify-between">
          <AIJobsLogo size="sm" showTagline={false} />
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
            EMPLOYER
          </span>
        </div>
      )}

      {/* Workspace Header Info */}
      <div className="px-3 py-2.5 mb-2 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
          {companyName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-white truncate">{companyName}</p>
          <p className="text-[10px] text-slate-400 font-mono truncate">{userName}</p>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1 custom-scrollbar">
        
        {/* Main Section */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block px-3 pb-1">
            Recruitment Suite
          </span>
          
          {mainNavItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            
            if (item.isCta) {
              return (
                <button
                  key={item.id}
                  id={`employer-nav-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full my-1.5 flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-black text-xs text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-emerald-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] font-extrabold font-mono uppercase bg-emerald-950/40 text-emerald-300 px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                id={`employer-nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-black/40 text-slate-400 border border-white/5"
                    }`}>
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Account & Administration */}
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block px-3 pb-1">
            Account & Settings
          </span>

          {secondaryNavItems.map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`employer-nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-slate-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout / Footer Action */}
      <div className="pt-3 mt-2 border-t border-purple-500/20">
        <button
          id="employer-sidebar-logout"
          onClick={() => {
            if (onLogout) onLogout();
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
