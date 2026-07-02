import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Building, Briefcase, Users, Sparkles, Layers, 
  Calendar, CheckCircle2, ShieldCheck, TrendingUp, DollarSign, 
  Settings, LogOut, ShieldAlert, Sparkle, RefreshCw, Bell
} from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { ConsultancyProfile } from "../types";
import { NotificationCenterView } from "./NotificationCenter";

// Import Shared Types
import { 
  ClientModel, ConsultancyJobModel, ConsultancyCandidateModel, 
  PlacementModel, TeamMemberModel, InterviewModel 
} from "./crm/CrmTypes";

// Import Seeding Utility
import { seedCrmCollectionsIfEmpty } from "./crm/CrmSeedData";

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

  // CRM Collection States
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [jobs, setJobs] = useState<ConsultancyJobModel[]>([]);
  const [candidates, setCandidates] = useState<ConsultancyCandidateModel[]>([]);
  const [placements, setPlacements] = useState<PlacementModel[]>([]);
  const [team, setTeam] = useState<TeamMemberModel[]>([]);
  const [interviews, setInterviews] = useState<InterviewModel[]>([]);

  // Simulation Role Scope
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Manager" | "Recruiter" | "Viewer">("Admin");

  // Sidebar Selection Tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "clients" | "jobs" | "candidates" | "matching" | 
    "interviews" | "placements" | "team" | "reports" | "subscription" | "registration" | "notifications"
  >("dashboard");

  // Fetch and Sync CRM Data
  const fetchCrmData = async () => {
    try {
      // 1. Fetch/Initialize profile
      const profRef = doc(db, "consultancies", userId);
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        setProfile(profSnap.data() as ConsultancyProfile);
      } else {
        // Create initial default profile
        const newProfile: ConsultancyProfile = {
          userId,
          agencyName: "Nexus Talent Partners",
          subscriptionStatus: "active",
          pricingPlan: "Professional",
          clientsCount: 3,
          revenue: 350000
        };
        await setDoc(profRef, newProfile);
        setProfile(newProfile);
      }

      // 2. Auto seed empty collections with high quality examples
      await seedCrmCollectionsIfEmpty();

      // 3. Retrieve clients
      const clientsSnap = await getDocs(collection(db, "clients"));
      const clList: ClientModel[] = [];
      clientsSnap.forEach(d => clList.push({ id: d.id, ...d.data() } as ClientModel));
      setClients(clList);

      // 4. Retrieve jobs
      const jobsSnap = await getDocs(collection(db, "consultancy_jobs"));
      const jList: ConsultancyJobModel[] = [];
      jobsSnap.forEach(d => jList.push({ id: d.id, ...d.data() } as ConsultancyJobModel));
      setJobs(jList);

      // 5. Retrieve candidates
      const candSnap = await getDocs(collection(db, "consultancy_candidates"));
      const cList: ConsultancyCandidateModel[] = [];
      candSnap.forEach(d => cList.push({ id: d.id, ...d.data() } as ConsultancyCandidateModel));
      setCandidates(cList);

      // 6. Retrieve placements
      const placeSnap = await getDocs(collection(db, "placements"));
      const pList: PlacementModel[] = [];
      placeSnap.forEach(d => pList.push({ id: d.id, ...d.data() } as PlacementModel));
      setPlacements(pList);

      // 7. Retrieve team members
      const teamSnap = await getDocs(collection(db, "team_members"));
      const tList: TeamMemberModel[] = [];
      teamSnap.forEach(d => tList.push({ id: d.id, ...d.data() } as TeamMemberModel));
      setTeam(tList);

      // 8. Retrieve interviews scheduled
      const intSnap = await getDocs(collection(db, "interviews_scheduled"));
      const iList: InterviewModel[] = [];
      intSnap.forEach(d => iList.push({ id: d.id, ...d.data() } as InterviewModel));
      setInterviews(iList);

    } catch (err) {
      console.error("CRM State Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrmData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto items-start relative px-4 sm:px-6 py-6" id="consultancy-crm-workspace">
      {/* LEFT COLUMN: Premium Unified Sticky Sidebar */}
      <div className="md:col-span-1 glass p-5 rounded-2xl border border-white/5 space-y-6 md:sticky md:top-24 select-none">
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
          {[
            { id: "dashboard", label: "Dashboard Overview", icon: LayoutDashboard },
            { id: "clients", label: "Clients Directory", icon: Building },
            { id: "jobs", label: "Job Vacancies", icon: Briefcase },
            { id: "candidates", label: "Candidates CRM", icon: Users },
            { id: "matching", label: "AI Match Rankings", icon: Sparkles },
            { id: "interviews", label: "Interviews Scheduler", icon: Calendar },
            { id: "placements", label: "Placement Pipeline", icon: CheckCircle2 },
            { id: "team", label: "Recruitment Team", icon: ShieldCheck },
            { id: "reports", label: "Analytics Reports", icon: TrendingUp },
            { id: "subscription", label: "Billing & Payment", icon: DollarSign },
            { id: "notifications", label: "Notification Hub", icon: Bell },
            { id: "registration", label: "Agency Registration", icon: Settings }
          ].map((tab) => {
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
      </div>

      {/* RIGHT COLUMN: Active Module Visual Stage */}
      <div className="md:col-span-3 space-y-6">
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
          />
        )}

        {activeTab === "jobs" && (
          <CrmJobsView
            jobs={jobs}
            clients={clients}
            onRefresh={fetchCrmData}
            userRole={currentUserRole}
          />
        )}

        {activeTab === "candidates" && (
          <CrmCandidatesView
            candidates={candidates}
            onRefresh={fetchCrmData}
            userRole={currentUserRole}
          />
        )}

        {activeTab === "matching" && (
          <CrmAiShortlistView
            jobs={jobs}
            candidates={candidates}
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

        {activeTab === "notifications" && (
          <div className="md:col-span-3 lg:col-span-3">
            <NotificationCenterView userId={userId} userRole="consultancy" userName={userName} />
          </div>
        )}

        {activeTab === "registration" && (
          <CrmOnboardingView
            profile={profile}
            onRefresh={fetchCrmData}
          />
        )}
      </div>
    </div>
  );
}
