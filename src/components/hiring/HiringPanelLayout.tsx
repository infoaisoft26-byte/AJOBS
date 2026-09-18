import React, { useState } from "react";
import { 
  Briefcase, 
  Users, 
  FileText, 
  Sparkles, 
  PhoneCall, 
  Calendar, 
  BarChart3, 
  CreditCard, 
  Building2, 
  MessageSquare, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X, 
  PlusCircle, 
  Search, 
  Bell, 
  ShieldCheck, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import AIJobsLogo from "../AIJobsLogo";
import { CreditBalance } from "./HiringTypes";

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | number;
  subItems?: { id: string; label: string }[];
}

interface HiringPanelLayoutProps {
  currentTab: string;
  onNavigateTab: (tabId: string) => void;
  userName: string;
  userEmail: string;
  companyName: string;
  userRole?: string;
  credits: CreditBalance;
  onOpenPostJobMenu: () => void;
  onOpenHelpSupport: () => void;
  onLogout: () => void;
  pendingCount?: number;
  children: React.ReactNode;
}

export default function HiringPanelLayout({
  currentTab,
  onNavigateTab,
  userName,
  userEmail,
  companyName,
  userRole = "employer",
  credits,
  onOpenPostJobMenu,
  onOpenHelpSupport,
  onLogout,
  pendingCount = 0,
  children
}: HiringPanelLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [candidateDbExpanded, setCandidateDbExpanded] = useState(true);

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "my-jobs", label: "Jobs", icon: Briefcase },
    { id: "applications", label: "Applications", icon: FileText, badge: pendingCount > 0 ? pendingCount : undefined },
    { 
      id: "candidate-search", 
      label: "Candidate Database", 
      icon: Users,
      subItems: [
        { id: "candidate-search", label: "Search Candidates" },
        { id: "saved-searches", label: "Saved Searches" },
        { id: "unlocked-candidates", label: "Unlocked Candidates" }
      ]
    },
    { id: "ai-matches", label: "AI Matches", icon: Sparkles },
    { id: "ai-assistant", label: "AI Assistant", icon: Sparkles },
    { id: "ai-calling", label: "AI Calling Agent", icon: PhoneCall },
    { id: "interviews", label: "Interviews", icon: Calendar },
    { id: "reports", label: "Reports", icon: TrendingUp },
    { id: "credits-usage", label: "Credits & Usage", icon: CreditCard },
    { id: "billing", label: "Plans & Subscription", icon: ShieldCheck },
    { id: "company-profile", label: "Profile & Company", icon: Building2 },
    { id: "messages", label: "Messages", icon: MessageSquare }
  ];

  const handleNavClick = (tabId: string) => {
    onNavigateTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#07050d] text-slate-100 flex flex-col font-sans overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 w-full bg-[#120b1e]/90 backdrop-blur-md border-b border-purple-500/20 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Mobile Drawer Trigger & Logo & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="cursor-pointer" onClick={() => handleNavClick("dashboard")}>
              <AIJobsLogo size="sm" />
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pl-3 border-l border-white/10">
              <span className="font-mono text-cyan-400">{userRole === "recruiter" ? "Recruiter" : "Employer"}</span>
              <span>/</span>
              <span className="text-white font-bold capitalize">{currentTab.replace("-", " ")}</span>
            </div>
          </div>

          {/* Right: Quick Credits, Support, Post Job CTA, Profile Avatar */}
          <div className="flex items-center gap-3">
            
            {/* Credits Status Pill */}
            <div 
              onClick={() => handleNavClick("credits-usage")}
              className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-black/40 border border-purple-500/30 text-xs cursor-pointer hover:border-cyan-400/50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-blue-300 font-mono font-bold">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>{credits.jobCredits} Jobs</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5 text-cyan-300 font-mono font-bold">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{credits.databaseCredits} DB</span>
              </div>
            </div>

            {/* Help & Support Button */}
            <button
              onClick={onOpenHelpSupport}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold hidden sm:flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Help</span>
            </button>

            {/* Post Job CTA Header */}
            <button
              id="header-post-job-cta"
              onClick={onOpenPostJobMenu}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>+ Post a New Job</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-slate-950 font-black text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-2 text-xs space-y-1 z-50 animate-in fade-in">
                  <div className="p-2 border-b border-purple-500/20">
                    <div className="font-extrabold text-white truncate">{userName}</div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">{userEmail}</div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{companyName}</div>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNavClick("company-profile");
                    }}
                    className="w-full p-2 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer text-left"
                  >
                    <Building2 className="w-4 h-4 text-cyan-400" />
                    <span>Company & Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleNavClick("billing");
                    }}
                    className="w-full p-2 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer text-left"
                  >
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Plans & Billing</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onOpenHelpSupport();
                    }}
                    className="w-full p-2 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 cursor-pointer text-left"
                  >
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>Support & Tickets</span>
                  </button>

                  <div className="border-t border-purple-500/20 pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full p-2 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer text-left font-bold"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex max-w-full">
        
        {/* Desktop Fixed Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-[#0d0718] border-r border-purple-500/20 p-4 space-y-4 min-h-[calc(100vh-60px)]">
          
          {/* Company / Recruiter Card */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                {userRole === "recruiter" ? "Recruiter Portal" : "Employer Portal"}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified</span>
              </span>
            </div>
            <div className="text-sm font-black text-white truncate">{companyName}</div>
            <p className="text-[11px] text-slate-400 truncate">{userName}</p>
          </div>

          {/* Quick Post Job Button in Sidebar */}
          <button
            onClick={onOpenPostJobMenu}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4 text-slate-950" />
            <span>Post a Job</span>
          </button>

          {/* Nav Items List */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = currentTab === item.id || (item.subItems && item.subItems.some(s => s.id === currentTab));

              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border border-blue-500/40 shadow-sm"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                        {item.badge}
                      </span>
                    )}

                    {item.subItems && (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {/* Submenu for Candidate Database */}
                  {item.subItems && isActive && (
                    <div className="pl-7 space-y-1 py-1">
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleNavClick(sub.id)}
                          className={`w-full text-left py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                            currentTab === sub.id ? "text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          • {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="pt-3 border-t border-purple-500/20 text-[11px] space-y-2 text-slate-400">
            <button
              onClick={onOpenHelpSupport}
              className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/5 text-slate-300 flex items-center gap-2 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Help & Support</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full p-2 rounded-xl hover:bg-red-500/10 text-red-400 flex items-center gap-2 cursor-pointer font-bold"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>

        </aside>

        {/* Mobile Drawer Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85vw] bg-[#0d0718] border-r border-purple-500/30 p-5 flex flex-col space-y-4 z-10 overflow-y-auto">
              
              <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
                <AIJobsLogo size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Profile & Credit summary */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="text-xs font-bold text-white truncate">{companyName}</div>
                <div className="text-[11px] text-cyan-400 font-mono">{userName}</div>
                <div className="text-[10px] text-slate-400 font-mono pt-1">
                  Credits: {credits.jobCredits} Jobs • {credits.databaseCredits} DB Unlocks
                </div>
              </div>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPostJobMenu();
                }}
                className="w-full py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>+ Post a New Job</span>
              </button>

              <nav className="space-y-1 flex-1">
                {navItems.map((item) => {
                  const IconComp = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? "bg-blue-600/30 text-white border border-blue-500/40"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <IconComp className="w-4 h-4 text-cyan-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 border-t border-purple-500/20 space-y-2 text-xs">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenHelpSupport();
                  }}
                  className="w-full py-2 text-left text-slate-300 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-purple-400" />
                  <span>Help & Support</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full py-2 text-left text-red-400 flex items-center gap-2 font-bold"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Log Out</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24 lg:pb-8">
          {children}
        </main>

      </div>

      {/* Sticky Bottom Actions Bar on Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0d0718]/95 backdrop-blur-md border-t border-purple-500/20 p-3 flex items-center justify-between gap-3 shadow-2xl">
        <button
          onClick={() => handleNavClick("candidate-search")}
          className="flex-1 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
        >
          <Search className="w-4 h-4 text-cyan-400" />
          <span>Candidate DB</span>
        </button>

        <button
          onClick={onOpenPostJobMenu}
          className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>+ Post a Job</span>
        </button>
      </div>

    </div>
  );
}
