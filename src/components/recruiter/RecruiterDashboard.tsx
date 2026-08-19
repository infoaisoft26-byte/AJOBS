import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Briefcase, 
  Users, 
  Search, 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  Share2, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  Bell, 
  Menu, 
  X, 
  ChevronDown, 
  Layers,
  IndianRupee,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import AIJobsLogo from "../AIJobsLogo";
import RecruiterOverview from "./RecruiterOverview";
import RecruiterPipeline from "./RecruiterPipeline";
import RecruiterAssignedJobs from "./RecruiterAssignedJobs";
import RecruiterFindCandidates from "./RecruiterFindCandidates";
import RecruiterLeads from "./RecruiterLeads";
import RecruiterEarnings from "./RecruiterEarnings";
import EmployerInterviews from "../employer/EmployerInterviews";
import EmployerMessages from "../employer/EmployerMessages";
import EmployerAiShortlist from "../employer/EmployerAiShortlist";
import { RecruiterJob, PipelineCandidate } from "./RecruiterTypes";

interface RecruiterDashboardProps {
  userId: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function RecruiterDashboard({
  userId,
  userName = "Pro Recruiter",
  userRole = "recruiter",
  onLogout
}: RecruiterDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatRecipient, setActiveChatRecipient] = useState<{ id: string; name: string } | null>(null);

  // Recruiter Data Stores
  const [assignedJobs, setAssignedJobs] = useState<RecruiterJob[]>([
    {
      id: "mandate_1",
      title: "Lead Full Stack Architect",
      companyName: "HyperCloud SaaS",
      location: "Bengaluru (Hybrid)",
      salary: "₹25 - 32 LPA",
      openings: 2,
      deadline: "Aug 30, 2026",
      skillsRequired: ["React", "TypeScript", "Node.js", "AWS", "System Design"],
      status: "active",
      assignedAt: "Aug 10, 2026",
      payoutPerHire: "₹45,000"
    },
    {
      id: "mandate_2",
      title: "Senior Frontend Engineer (Design Systems)",
      companyName: "FinTech Prime",
      location: "Pune (Remote)",
      salary: "₹18 - 24 LPA",
      openings: 3,
      deadline: "Sep 15, 2026",
      skillsRequired: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      status: "urgent",
      assignedAt: "Aug 12, 2026",
      payoutPerHire: "₹35,000"
    },
    {
      id: "mandate_3",
      title: "AI / ML Solutions Engineer",
      companyName: "Nexus AI Labs",
      location: "Delhi NCR",
      salary: "₹20 - 28 LPA",
      openings: 1,
      deadline: "Aug 28, 2026",
      skillsRequired: ["Python", "PyTorch", "Gemini API", "FastAPI"],
      status: "active",
      assignedAt: "Aug 14, 2026",
      payoutPerHire: "₹50,000"
    }
  ]);

  const [pipelineCandidates, setPipelineCandidates] = useState<PipelineCandidate[]>([
    {
      id: "cand_pipe_1",
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      phone: "+91 98765 43210",
      role: "Lead Full Stack Architect",
      jobId: "mandate_1",
      jobTitle: "Lead Full Stack Architect",
      companyName: "HyperCloud SaaS",
      experience: "6.5 Years",
      location: "Bengaluru",
      skills: ["React", "TypeScript", "Node.js", "System Design"],
      aiScore: 96,
      stage: "interview",
      lastActivity: "Interview Scheduled for Thursday"
    },
    {
      id: "cand_pipe_2",
      name: "Sneha Deshmukh",
      email: "sneha.d@example.com",
      phone: "+91 91234 56789",
      role: "Senior Frontend Engineer",
      jobId: "mandate_2",
      jobTitle: "Senior Frontend Engineer",
      companyName: "FinTech Prime",
      experience: "4.2 Years",
      location: "Pune",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      aiScore: 94,
      stage: "shortlisted",
      lastActivity: "Profile shared with hiring manager"
    },
    {
      id: "cand_pipe_3",
      name: "Vikram Malhotra",
      email: "vikram.m@example.com",
      phone: "+91 99887 76655",
      role: "AI / ML Solutions Engineer",
      jobId: "mandate_3",
      jobTitle: "AI / ML Solutions Engineer",
      companyName: "Nexus AI Labs",
      experience: "3.5 Years",
      location: "Delhi NCR",
      skills: ["Python", "Gemini API", "FastAPI"],
      aiScore: 92,
      stage: "screened",
      lastActivity: "Pre-screen cleared"
    },
    {
      id: "cand_pipe_4",
      name: "Karthik Ranganathan",
      email: "karthik.r@example.com",
      phone: "+91 98450 12345",
      role: "Senior Frontend Engineer",
      jobId: "mandate_2",
      jobTitle: "Senior Frontend Engineer",
      companyName: "FinTech Prime",
      experience: "5.0 Years",
      location: "Chennai",
      skills: ["React", "TypeScript", "UI/UX"],
      aiScore: 89,
      stage: "new_lead",
      lastActivity: "Lead assigned by admin"
    }
  ]);

  // Sync Data
  const loadData = async () => {
    try {
      const appsSnap = await getDocs(collection(db, "company_applications"));
      const loaded: PipelineCandidate[] = [];
      appsSnap.forEach((d) => {
        const ad = d.data();
        loaded.push({
          id: d.id,
          name: ad.candidateName || "Candidate",
          email: ad.candidateEmail,
          phone: ad.candidatePhone,
          role: ad.jobTitle || "Engineer",
          jobId: ad.jobId || "mandate_1",
          jobTitle: ad.jobTitle || "Engineer",
          companyName: ad.companyName || "AIJOBS Partner",
          experience: ad.candidateExperience || "3+ Yrs",
          location: ad.candidateLocation || "India",
          skills: ad.candidateSkills || ["React", "TypeScript"],
          aiScore: ad.aiMatchScore || 88,
          stage: (ad.status as any) || "shortlisted",
          lastActivity: "Application updated"
        });
      });
      if (loaded.length > 0) {
        setPipelineCandidates(loaded);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Handle URL sync
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname !== "/recruiter/dashboard") {
      window.history.pushState({}, "", "/recruiter/dashboard");
    }
  }, []);

  const handleUpdateStage = (candidateId: string, newStage: PipelineCandidate["stage"]) => {
    setPipelineCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: newStage } : c));
  };

  const handleOpenLiveChat = (recipientId?: string, recipientName?: string) => {
    if (recipientId && recipientName) {
      setActiveChatRecipient({ id: recipientId, name: recipientName });
    }
    setActiveTab("messages");
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "assigned-jobs", label: "Assigned Jobs", icon: Briefcase, count: assignedJobs.length },
    { id: "pipeline", label: "Candidate Pipeline", icon: Users, count: pipelineCandidates.length, highlight: true },
    { id: "find-candidates", label: "Find Candidates", icon: Search },
    { id: "ai-matching", label: "AI Matching", icon: Sparkles },
    { id: "interviews", label: "Interviews", icon: Calendar, count: 2 },
    { id: "leads", label: "Admin Leads", icon: Layers, count: 2 },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "earnings", label: "Referral & Earnings", icon: IndianRupee },
    { id: "support", label: "Help & Support", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0e0a14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200" id="recruiter-dashboard-app">
      
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 w-full bg-[#17111F]/90 border-b border-purple-500/20 backdrop-blur-2xl px-4 sm:px-6 py-3 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <AIJobsLogo size="sm" showTagline={false} />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>VERIFIED RECRUITER</span>
            </span>
          </div>

          {/* Center: Search Candidates / Mandates */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate profiles, skills, assigned jobs..."
                className="w-full pl-9 pr-4 py-2 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Right: Notifications, Primary CTA & Profile Menu */}
          <div className="flex items-center gap-3">
            
            {/* Primary Bright Emerald "Find Candidates" Button */}
            <button
              id="recruiter-topbar-find-candidates"
              onClick={() => setActiveTab("find-candidates")}
              className="px-4 py-2 rounded-2xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105 active:scale-95 shrink-0"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Find Candidates</span>
              <span className="sm:hidden">Find</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#17111F] animate-pulse" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-4 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-2 mb-3">
                    <span className="text-xs font-bold text-white">Recruiter Alerts</span>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white text-xs">
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <span className="font-bold text-white block">New Mandate Assigned</span>
                      <span className="text-[11px] text-slate-400">AI / ML Solutions Engineer position assigned to your queue.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/20 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                  {userName.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{userName}</div>
                  <div className="text-[10px] text-slate-400 truncate">Pro Recruiter</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-3xl bg-[#17111F] border border-purple-500/30 shadow-2xl p-2 z-50 animate-in fade-in space-y-1 text-xs">
                  <div className="px-3 py-2 border-b border-purple-500/20">
                    <div className="font-bold text-white truncate">{userName}</div>
                    <div className="text-[10px] text-cyan-300">Verified Recruiter Partner</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("earnings");
                      setShowProfileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    <span>My Earnings & Rewards</span>
                  </button>
                  <div className="border-t border-purple-500/20 pt-1">
                    <button
                      onClick={async () => {
                        setShowProfileMenu(false);
                        if (onLogout) onLogout();
                        else {
                          await auth.signOut();
                          window.location.reload();
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 flex gap-6">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 space-y-4">
          <div className="p-4 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block px-3 pb-2">
              RECRUITER WORKSPACE
            </span>

            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : item.highlight
                      ? "text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp className={`w-4 h-4 ${item.highlight && !isActive ? "text-cyan-400" : ""}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.count !== undefined && item.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${isActive ? "bg-white/20 text-white" : "bg-black/40 text-slate-400"}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-purple-500/20 mt-2">
              <button
                onClick={async () => {
                  if (onLogout) onLogout();
                  else {
                    await auth.signOut();
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Workspace</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-[#17111F] border-r border-purple-500/30 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl z-50"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                    <AIJobsLogo size="sm" />
                    <button
                      onClick={() => setMobileDrawerOpen(false)}
                      className="p-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {navItems.map((item) => {
                      const IconComp = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileDrawerOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-left transition-all cursor-pointer ${
                            isActive 
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                              : item.highlight
                              ? "text-cyan-400 hover:bg-cyan-500/10"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComp className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.count !== undefined && item.count > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/40 text-slate-400">
                              {item.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-purple-500/20">
                  <button
                    onClick={async () => {
                      setMobileDrawerOpen(false);
                      if (onLogout) onLogout();
                      else {
                        await auth.signOut();
                        window.location.reload();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Center Main Workspace */}
        <main className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <RecruiterOverview
              userName={userName}
              assignedJobs={assignedJobs}
              pipelineCandidates={pipelineCandidates}
              onNavigateTab={(t) => setActiveTab(t)}
              onSelectCandidateForPipeline={(c) => {
                setActiveTab("pipeline");
              }}
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "pipeline" && (
            <RecruiterPipeline
              candidates={pipelineCandidates}
              assignedJobs={assignedJobs}
              onUpdateCandidateStage={handleUpdateStage}
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "assigned-jobs" && (
            <RecruiterAssignedJobs
              jobs={assignedJobs}
              onSelectJobForPipeline={(jobId) => {
                setActiveTab("pipeline");
              }}
            />
          )}

          {activeTab === "find-candidates" && (
            <RecruiterFindCandidates
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "ai-matching" && (
            <EmployerAiShortlist
              applications={pipelineCandidates as any}
              onOpenCandidateDrawer={() => setActiveTab("pipeline")}
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "interviews" && (
            <EmployerInterviews
              userId={userId}
              interviews={[]}
              jobs={assignedJobs as any}
              applications={pipelineCandidates as any}
            />
          )}

          {activeTab === "leads" && (
            <RecruiterLeads
              onOpenLiveChat={handleOpenLiveChat}
            />
          )}

          {activeTab === "messages" && (
            <EmployerMessages
              initialRecipientId={activeChatRecipient?.id}
              initialRecipientName={activeChatRecipient?.name}
            />
          )}

          {activeTab === "earnings" && (
            <RecruiterEarnings />
          )}

          {activeTab === "support" && (
            <div className="p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl text-center space-y-4 max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Recruiter Partner Support Desk</h3>
              <p className="text-xs text-slate-400">
                Contact our agency partnerships team for mandate allocations, commission payout inquiries, or technical support.
              </p>
              <div className="p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-xs space-y-1 font-mono text-left">
                <div className="text-purple-300 font-bold">Partner Desk</div>
                <div className="text-slate-300">Email: recruiter-desk@aijobs.in</div>
                <div className="text-slate-300">Helpline: +91 80 4567 8901</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
