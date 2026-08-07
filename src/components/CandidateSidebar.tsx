import { Activity, Award, Bell, BookOpen, Bot, Brain, Briefcase, Calendar, CheckCircle2, Clock, CloudLightning, Compass, Container, Database, FileText, Gift, GraduationCap, Heart, LayoutDashboard, LogOut, Menu, MessageSquare, Mic, Navigation, Search, Settings, ShieldCheck, Sidebar, Smartphone, Sparkles, Store, User, Verified, Video, X } from "lucide-react";
interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  unreadCount: number;
  onLogout?: () => void;
}

export default function CandidateSidebar({ activeTab, setActiveTab, isOpen, setIsOpen, unreadCount, onLogout }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "profile", label: "Profile Details", icon: User },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "experience", label: "Work Experience", icon: Briefcase },
    { id: "skills", label: "Skills & AI suggestions", icon: Award },
    { id: "resume", label: "Resume & ATS Audit", icon: FileText },
    { id: "explore-jobs", label: "Explore Jobs", icon: Search },
    { id: "saved-jobs", label: "Saved Jobs", icon: Heart },
    { id: "applied-jobs", label: "Applied Jobs", icon: Clock },
    { id: "interviews", label: "Recruiter Interviews", icon: Calendar },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: "compliance", label: "GDPR & Privacy", icon: ShieldCheck },
    { id: "abac", label: "ABAC Security Guard", icon: ShieldCheck },
    { id: "chat", label: "Secure Chat", icon: MessageSquare },
    { id: "workspace", label: "Google Workspace", icon: CloudLightning },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const aiItems = [
    { id: "agent-store", label: "AI Agent Store", icon: Bot, premium: true },
    { id: "voice-recruiter", label: "AI Voice Recruiter", icon: Mic, premium: true },
    { id: "interview", label: "AI Interview Arena", icon: Brain, premium: true },
    { id: "video-center", label: "Video Interview Center", icon: Video, premium: true },
    { id: "skill-assessments", label: "Skill Assessments", icon: Award, premium: true },
    { id: "learning-center", label: "Learning Center", icon: BookOpen, premium: true },
    { id: "career-coach-suite", label: "AI Career Coach", icon: Compass, premium: true },
    { id: "ai-report", label: "AI Evaluation Report", icon: Award, premium: true },
    { id: "coach", label: "AI Career Assistant", icon: Sparkles, premium: true },
  ];

  const ecosystemItems = [
    { id: "verified-profile", label: "Verified Profile", icon: ShieldCheck },
    { id: "referrals", label: "Referral Ecosystem", icon: Gift },
    { id: "gig-marketplace", label: "Gig & Freelance Jobs", icon: Briefcase },
    { id: "mobile-backend", label: "Mobile Backend Hub", icon: Smartphone },
    { id: "security-center", label: "Enterprise Security", icon: ShieldCheck },
    { id: "observability", label: "System Observability", icon: Activity },
    { id: "platform-cert", label: "Platform Certification", icon: CheckCircle2 },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[85vw] max-w-[320px] lg:w-64 bg-[#050508] border-r border-white/10 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-[calc(100vh-73px)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="candidate-sidebar"
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-white/5 bg-[#030305]">
          <span className="font-display font-extrabold text-sm tracking-wide text-white uppercase">Menu</span>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase px-3 block mb-2">
              Candidate Workspace
            </span>
            <nav className="space-y-1">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      isSel 
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/35 shadow-md shadow-indigo-600/5" 
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isSel ? "text-indigo-400" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-extrabold bg-indigo-500 text-white rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase px-3 block mb-2">
              GenAI Agents
            </span>
            <nav className="space-y-1">
              {aiItems.map((item) => {
                const Icon = item.icon;
                const isSel = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      isSel 
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/35 shadow-md shadow-purple-600/5" 
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isSel ? "text-purple-400" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    <span className="px-1.5 py-0.2 bg-gradient-to-r from-indigo-500 to-purple-500 text-[8px] font-bold uppercase text-white rounded tracking-wider">
                      AI
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-500 uppercase px-3 block mb-2">
              Hiring Ecosystem
            </span>
            <nav className="space-y-1">
              {ecosystemItems.map((item) => {
                const Icon = item.icon;
                const isSel = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer ${
                      isSel 
                        ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/35 shadow-md shadow-emerald-600/5" 
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 ${isSel ? "text-emerald-400" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Quick status & mobile logout footer */}
        <div className="mt-auto p-4 border-t border-white/5 bg-black/40 text-[10px] font-mono text-gray-500 space-y-2 select-none">
          <div className="flex justify-between items-center text-gray-400">
            <span>Node Status: <strong className="text-emerald-400 font-bold">Secure</strong></span>
            <span>Firestore</span>
          </div>
          {onLogout && (
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="lg:hidden w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
