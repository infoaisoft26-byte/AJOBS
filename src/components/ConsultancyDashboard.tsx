import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { Bell, Briefcase, Building, Calendar, CheckCircle2, DollarSign, FileText, Import, LayoutDashboard, List, LogOut, Menu, Plus, RefreshCw, Router, Settings, ShieldAlert, ShieldCheck, Sidebar, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { auth, db } from "../firebase";


import { ConsultancyProfile } from "../types";
import { NotificationCenterView } from "./NotificationCenter";
import AbacControlInspector from "./AbacControlInspector";
import LeadManagement from "./LeadManagement";
import PostJobForm from "./PostJobForm";
import AgreementsView from "./agreements/AgreementsView";

// Import Shared Types
import { 
  ClientModel, ConsultancyJobModel, ConsultancyCandidateModel, 
  PlacementModel, TeamMemberModel, InterviewModel 
} from "./crm/CrmTypes";

// Import Modular Views
import CrmDashboardView from "./crm/CrmDashboardView";
import CrmClientsView from "./crm/CrmClientsView";
import CrmJobsView from "./crm/CrmJobsView";
import CrmCandidatesView from "./crm/CrmCandidatesView";
import CrmAiShortlistView from "./crm/CrmAiShortlistView";
import CrmInterviewsView from "./crm/CrmInterviewsView";
import CrmPlacementsView from "./crm/CrmPlacementsView";
import CrmTeamView from "./crm/CrmTeamView";
import CrmReportsView from "./crm/CrmReportsView";
import CrmOnboardingView from "./crm/CrmOnboardingView";
import SubscriptionBillingHub from "./SubscriptionBillingHub";

interface ConsultancyDashboardProps {
  userId: string;
  userName: string;
}

export default function ConsultancyDashboard({ userId, userName }: ConsultancyDashboardProps) {
  const [profile, setProfile] = useState<ConsultancyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRM Collection States
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [jobs, setJobs] = useState<ConsultancyJobModel[]>([]);
  const [candidates, setCandidates] = useState<ConsultancyCandidateModel[]>([]);
  const [placements, setPlacements] = useState<PlacementModel[]>([]);
  const [team, setTeam] = useState<TeamMemberModel[]>([]);
  const [interviews, setInterviews] = useState<InterviewModel[]>([]);

  // Simulation Role Scope
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Manager" | "Recruiter" | "Viewer">("Admin");

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Sidebar Selection Tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "clients" | "jobs" | "candidates" | "leads" | "matching" | 
    "interviews" | "placements" | "team" | "reports" | "subscription" | "agreements" | "registration" | "notifications" | "abac"
  >("dashboard");

  // Listen to dashboard navigation event (e.g. from global shortcut Ctrl+D / Cmd+D)
  useEffect(() => {
    const handleResetToOverview = () => {
      setActiveTab("dashboard");
    };
    window.addEventListener("navigate-to-dashboard-overview", handleResetToOverview);
    return () => window.removeEventListener("navigate-to-dashboard-overview", handleResetToOverview);
  }, []);

  const [showMainPostForm, setShowMainPostForm] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const fetchCrmData = () => setRefreshKey(value => value + 1);

  // Realtime CRM sync. Primary application collections and legacy CRM collections
  // are merged so existing data remains visible while new registrations appear instantly.
  useEffect(() => {
    setLoading(true);
    setError(null);
    const cache: Record<string, any[]> = {};
    let agencyName = userName || "Consultancy";
    const clean = (value: any, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
    const iso = (value: any) => value?.toDate?.().toISOString?.() || clean(value);

    const rebuild = () => {
      const allJobs = [...(cache.jobs || []), ...(cache.consultancy_jobs || [])];
      const uniqueJobs = Array.from(new Map(allJobs.map(j => [j.id, j])).values());
      const agencyKey = clean(agencyName).toLowerCase();
      const scopedJobs = uniqueJobs.filter(j =>
        j.consultancyId === userId || j.createdBy === userId || j.userId === userId ||
        (!!agencyKey && clean(j.consultancyName || j.consultancy).toLowerCase() === agencyKey)
      );
      setJobs(scopedJobs.map(j => ({
        ...j, title: clean(j.title || j.jobTitle, "Untitled Job"),
        companyName: clean(j.companyName || j.company, "Company not provided"),
        skillsRequired: Array.isArray(j.skillsRequired || j.skills) ? (j.skillsRequired || j.skills) : [],
        status: j.status || "open", createdAt: iso(j.createdAt)
      })) as ConsultancyJobModel[]);

      const jobIds = new Set(scopedJobs.map(j => j.id));
      const applications = (cache.applications || []).filter(a =>
        jobIds.has(a.jobId) || a.consultancyId === userId || a.createdBy === userId ||
        (!!agencyKey && clean(a.consultancyName || a.consultancy).toLowerCase() === agencyKey)
      );
      const relatedApplications = applications;
      const sources = [...(cache.candidates || []), ...(cache.candidateProfiles || []), ...(cache.users || []), ...(cache.consultancy_candidates || [])];
      const merged = new Map<string, any>();
      const allowedCandidateKeys = new Set(relatedApplications.flatMap(a => [a.candidateId, a.userId, a.candidateEmail, a.email].filter(Boolean).map((v: any) => clean(v).toLowerCase())));
      sources.forEach(c => {
        if (c.role && !["candidate", "jobseeker", "job_seeker"].includes(String(c.role).toLowerCase())) return;
        const key = clean(c.uid || c.userId || c.candidateId || c.email || c.id).toLowerCase();
        const emailKey = clean(c.email || c.candidateEmail).toLowerCase();
        if (!key || (!allowedCandidateKeys.has(key) && !allowedCandidateKeys.has(emailKey))) return;
        const old = merged.get(key) || {};
        merged.set(key, { ...old, ...c, id: c.uid || c.userId || c.candidateId || old.id || c.id });
      });
      relatedApplications.forEach(a => {
        const key = clean(a.candidateId || a.userId || a.candidateEmail || a.email || a.id).toLowerCase();
        const old = merged.get(key) || {};
        merged.set(key, { ...a, ...old, id: old.id || a.candidateId || a.userId || a.id });
      });
      const candidateRows: ConsultancyCandidateModel[] = Array.from(merged.values()).map(c => {
        const apps = relatedApplications.filter(a =>
          (a.candidateId && [c.id, c.uid, c.userId, c.candidateId].includes(a.candidateId)) ||
          (clean(a.candidateEmail || a.email).toLowerCase() && clean(a.candidateEmail || a.email).toLowerCase() === clean(c.email || c.candidateEmail).toLowerCase())
        ).sort((a, b) => iso(b.appliedAt || b.createdAt).localeCompare(iso(a.appliedAt || a.createdAt)));
        const latest = apps[0] || {};
        return {
          id: c.id, candidateId: c.id,
          name: clean(c.name || c.fullName || c.displayName || c.candidateName, "Candidate"),
          email: clean(c.email || c.candidateEmail, "Not provided"),
          phone: clean(c.phone || c.mobile || c.mobileNumber || c.phoneNumber || c.personalDetails?.mobile || c.candidatePhone || latest.candidatePhone, "Not provided"),
          skills: Array.isArray(c.skills || c.candidateSkills) ? (c.skills || c.candidateSkills).filter((v: any) => typeof v === "string" && v.trim()) : [],
          experience: clean(c.experience || c.yearsOfExperience || c.candidateExperience, "Not provided"),
          location: clean(c.location || c.city || c.candidateLocation, "Not provided"),
          expectedSalary: clean(c.expectedSalary || c.expectedCTC, "Not provided"),
          notes: clean(c.notes), tags: Array.isArray(c.tags) ? c.tags.filter((v: any) => typeof v === "string" && v.trim()) : [],
          status: c.status === "rejected" || c.status === "shortlisted" || c.status === "saved" ? c.status : "active",
          resumeScore: Number(c.resumeScore || 0), aiInterviewScore: Number(c.aiInterviewScore || c.interviewScore || 0),
          applicationId: latest.id, applicationStatus: clean(latest.status),
          appliedJobId: latest.jobId, appliedJobTitle: clean(latest.jobTitle), companyName: clean(latest.companyName || latest.company),
          appliedAt: iso(latest.appliedAt || latest.createdAt), consultancyId: userId,
          consultancyName: clean(latest.consultancyName || latest.consultancy || c.consultancyName, agencyName),
          source: clean(latest.source || c.source, "AIJobs"), resumeUrl: c.resumeUrl || latest.resumeUrl,
          applications: apps.map(a => ({ id: a.id, jobId: a.jobId || "", jobTitle: clean(a.jobTitle, "Untitled Job"), companyName: clean(a.companyName || a.company, "Company not provided"), status: clean(a.status, "applied"), appliedAt: iso(a.appliedAt || a.createdAt) }))
        };
      });
      setCandidates(candidateRows);
    };

    const unsubs: Unsubscribe[] = [];
    const listen = (name: string, setter?: (rows: any[]) => void) => {
      unsubs.push(onSnapshot(collection(db, name), snapshot => {
        cache[name] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setter?.(cache[name]); rebuild(); setLoading(false);
      }, err => { console.warn(`Realtime ${name} sync failed:`, err.message); setError(`Some ${name} data could not be synchronized.`); setLoading(false); }));
    };
    unsubs.push(onSnapshot(doc(db, "consultancies", userId), snapshot => {
      if (snapshot.exists()) { const value = snapshot.data() as ConsultancyProfile; agencyName = clean(value.agencyName, agencyName); setProfile(value); rebuild(); }
      else setError("Consultancy profile not found. Please contact administrator.");
      setLoading(false);
    }));
    listen("clients", rows => setClients(rows as ClientModel[]));
    listen("jobs"); listen("consultancy_jobs"); listen("applications");
    listen("candidates"); listen("candidateProfiles"); listen("users"); listen("consultancy_candidates");
    listen("placements", rows => setPlacements(rows as PlacementModel[]));
    listen("team_members", rows => setTeam(rows as TeamMemberModel[]));
    listen("interviews_scheduled", rows => setInterviews(rows as InterviewModel[]));
    return () => unsubs.forEach(unsubscribe => unsubscribe());
  }, [userId, userName, refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4" id="consultancy-dashboard-loader">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-xs font-mono text-gray-400 uppercase tracking-widest animate-pulse">
          Synchronizing CRM Systems...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="font-bold text-white">Authorization Required</h3>
        <p className="text-xs text-gray-400">Your profile credentials could not be initialized. Please consult your administrator.</p>
      </div>
    );
  }

  const consultancyTabs = [
    { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard },
    { id: "clients", label: "Clients Directory", icon: Building },
    { id: "jobs", label: "Job Vacancies", icon: Briefcase },
    { id: "candidates", label: "Candidates CRM", icon: Users },
    { id: "leads", label: "Lead Management", icon: Users },
    { id: "matching", label: "AI Match Rankings", icon: Sparkles },
    { id: "interviews", label: "Interviews Scheduler", icon: Calendar },
    { id: "placements", label: "Placement Pipeline", icon: CheckCircle2 },
    { id: "team", label: "Recruitment Team", icon: ShieldCheck },
    { id: "reports", label: "Analytics Reports", icon: TrendingUp },
    { id: "subscription", label: "Billing & Payment", icon: DollarSign },
    { id: "agreements", label: "Legal Agreements", icon: FileText },
    { id: "notifications", label: "Notification Hub", icon: Bell },
    { id: "abac", label: "ABAC Security Guard", icon: ShieldAlert },
    { id: "registration", label: "Agency Registration", icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6" id="consultancy-crm-workspace">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between p-4 glass rounded-2xl border border-white/5">
        <div className="flex items-center gap-3 truncate">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-300 cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="truncate">
            <h2 className="text-sm font-extrabold text-white truncate">{profile.agencyName}</h2>
            <span className="text-[10px] text-gray-400 font-mono capitalize">{activeTab.replace("-", " ")}</span>
          </div>
        </div>
        <button
          onClick={() => setShowMainPostForm(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Post Job</span>
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-[#050508] border-r border-white/10 flex flex-col h-full overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600/20 text-indigo-400 rounded-lg flex items-center justify-center font-black">N</div>
                <span className="font-extrabold text-xs text-white truncate">{profile.agencyName}</span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block pb-2">
                CONSULTANCY CRM NAVIGATION
              </span>
              {consultancyTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                      isActive 
                        ? "bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-600/15" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto p-4 border-t border-white/10 bg-black/60 space-y-2">
              <button
                onClick={() => {
                  setActiveTab("registration" as any);
                  setMobileDrawerOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Agency Settings</span>
              </button>
              <button
                onClick={async () => {
                  setMobileDrawerOpen(false);
                  await auth.signOut();
                  window.location.reload();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start relative">
        {/* LEFT COLUMN: Desktop Unified Sticky Sidebar */}
        <div className="hidden lg:block lg:col-span-1 glass p-5 rounded-2xl border border-white/5 space-y-6 lg:sticky lg:top-24 select-none">
          <div className="border-b border-white/5 pb-4 space-y-1 text-center">
            <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto text-lg font-black tracking-tighter">
              N
            </div>
            <h2 className="text-sm font-extrabold text-white pt-2">{profile.agencyName}</h2>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider block mx-auto w-fit">
              CRM Portal {profile.pricingPlan}
            </span>
          </div>

          {/* Sidebar Tabs List */}
          <nav className="space-y-1.5 text-xs font-medium">
            {consultancyTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all font-semibold cursor-pointer ${
                    isActive 
                      ? "bg-indigo-600 text-white font-extrabold shadow-lg shadow-indigo-600/15" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <IconComponent className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="pt-3 border-t border-white/5">
            <button
              onClick={() => {
                setShowMainPostForm(true);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Global Job Draft</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Module Visual Stage */}
        <div className="lg:col-span-3 space-y-6 w-full min-w-0">

        {showMainPostForm ? (
          <PostJobForm
            userId={userId}
            userRole="consultancy"
            userName={userName || profile?.agencyName || "Agency Partner"}
            onJobPosted={(jobId) => {
              setShowMainPostForm(false);
              fetchCrmData();
            }}
            onCancel={() => setShowMainPostForm(false)}
          />
        ) : (
          <>
            {/* Module Render Routing Router */}
            {activeTab === "dashboard" && (
              <CrmDashboardView
                profile={profile}
                clients={clients}
                jobs={jobs}
                candidates={candidates}
                placements={placements}
                interviews={interviews}
              />
            )}

            {activeTab === "clients" && (
              <CrmClientsView
                clients={clients}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
                profile={profile}
                userId={userId}
              />
            )}

            {activeTab === "jobs" && (
              <CrmJobsView
                jobs={jobs}
                clients={clients}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
                consultancyId={userId}
                consultancyName={profile.agencyName || userName}
              />
            )}

            {activeTab === "candidates" && (
              <CrmCandidatesView
                candidates={candidates}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
                consultancyId={userId}
                consultancyName={profile.agencyName || userName}
              />
            )}

            {activeTab === "leads" && (
              <LeadManagement
                userId={userId}
                userRole="consultancy"
                userName={userName}
              />
            )}

            {activeTab === "matching" && (
              <CrmAiShortlistView
                jobs={jobs}
                candidates={candidates}
                profile={profile}
                userId={userId}
                onSelectCandidate={(cand) => {
                  // Quick mock trigger
                  const c = candidates.find(x => x.id === cand.id);
                  if (c) alert(`Selected Matched Profile: ${cand.name}`);
                }}
                onNavigateToTab={(tb) => {
                  if (tb === "candidates") setActiveTab("candidates");
                  if (tb === "interviews") setActiveTab("interviews");
                }}
              />
            )}

            {activeTab === "interviews" && (
              <CrmInterviewsView
                interviews={interviews}
                jobs={jobs}
                candidates={candidates}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
              />
            )}

            {activeTab === "placements" && (
              <CrmPlacementsView
                placements={placements}
                clients={clients}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
              />
            )}

            {activeTab === "team" && (
              <CrmTeamView
                team={team}
                onRefresh={fetchCrmData}
                currentUserRole={currentUserRole}
                onChangeUserRole={(newRl) => setCurrentUserRole(newRl)}
              />
            )}

            {activeTab === "reports" && (
              <CrmReportsView
                placements={placements}
                clients={clients}
                jobs={jobs}
              />
            )}

            {activeTab === "subscription" && (
              <SubscriptionBillingHub
                userId={userId}
                userName={userName}
                userRole="consultancy"
                onRefresh={fetchCrmData}
              />
            )}

            {activeTab === "agreements" && (
              <AgreementsView
                userId={userId}
                userRole="consultancy"
                userName={userName || profile?.agencyName || "Agency Partner"}
              />
            )}

            {activeTab === "notifications" && (
              <div className="md:col-span-3 lg:col-span-3">
                <NotificationCenterView userId={userId} userRole="consultancy" userName={userName} />
              </div>
            )}

            {activeTab === "abac" && (
              <div className="animate-in fade-in duration-300">
                <AbacControlInspector 
                  userId={userId} 
                  userRole="consultancy" 
                  onAttributeUpdated={fetchCrmData} 
                />
              </div>
            )}

            {activeTab === "registration" && (
              <CrmOnboardingView
                profile={profile}
                onRefresh={fetchCrmData}
              />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
