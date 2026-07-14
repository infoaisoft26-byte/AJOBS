import { 
  LayoutDashboard, User, GraduationCap, Briefcase, Award, 
  FileText, Heart, Clock, Bell, Settings, Brain, Sparkles, X, Menu, Search,
  MessageSquare, ShieldCheck, Calendar
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  unreadCount: number;
}

export default function CandidateSidebar({ activeTab, setActiveTab, isOpen, setIsOpen, unreadCount }: SidebarProps) {
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
    { id: "abac", label: "ABAC Security Guard", icon: ShieldCheck },
    { id: "chat", label: "Secure Chat", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const aiItems = [
    { id: "interview", label: "AI Interview Arena", icon: Brain, premium: true },
    { id: "ai-report", label: "AI Evaluation Report", icon: Award, premium: true },
    { id: "coach", label: "AI Career Center", icon: Sparkles, premium: true },
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#050508]/95 border-r border-white/5 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-[calc(100vh-73px)] ${
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
        </div>

        {/* Quick status footer */}
        <div className="p-4 border-t border-white/5 bg-black/20 text-[10px] font-mono text-gray-500 space-y-1 select-none">
          <p>Local node status: <span className="text-emerald-400">Secure</span></p>
          <p>Database: <span className="text-indigo-400">Firestore</span></p>
        </div>
      </aside>
    </>
  );
}
