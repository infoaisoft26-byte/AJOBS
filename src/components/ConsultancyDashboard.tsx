import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Building, Briefcase, Users, Sparkles, Layers, 
  Calendar, CheckCircle2, ShieldCheck, TrendingUp, DollarSign, 
  Settings, LogOut, ShieldAlert, Sparkle, RefreshCw, Bell, Plus
} from "lucide-react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { ConsultancyProfile } from "../types";
import { NotificationCenterView } from "./NotificationCenter";
import AbacControlInspector from "./AbacControlInspector";
import LeadManagement from "./LeadManagement";
import PostJobForm from "./PostJobForm";
import { createRecruiterByConsultancy } from "../services/recruiter";
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

  // Sidebar Selection Tab
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "clients" | "jobs" | "candidates" | "leads" | "matching" | 
    "interviews" | "placements" | "team" | "reports" | "subscription" | "registration" | "notifications" | "abac"
  >("dashboard");

  const [showMainPostForm, setShowMainPostForm] = useState(false);
const [showRecruiterModal, setShowRecruiterModal] = useState(false);

const [recruiterForm, setRecruiterForm] = useState({
  fullName: '',
  email: '',
  phone: '',
  designation: '',
  temporaryPassword: '',
});
  // Fetch and Sync CRM Data
  const fetchCrmData = async () => {
    setLoading(true);
    setError(null);
    let syncErrorsList: string[] = [];

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
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve or initialize consultancy profile:", err.message);
      syncErrorsList.push("profile");
    }

    // 3. Retrieve clients
    try {
      const clientsSnap = await getDocs(collection(db, "clients"));
      const clList: ClientModel[] = [];
      clientsSnap.forEach(d => clList.push({ id: d.id, ...d.data() } as ClientModel));
      setClients(clList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve clients:", err.message);
      syncErrorsList.push("clients");
      setClients([]);
    }

    // 4. Retrieve jobs
    try {
      const jobsSnap = await getDocs(collection(db, "consultancy_jobs"));
      const jList: ConsultancyJobModel[] = [];
      jobsSnap.forEach(d => jList.push({ id: d.id, ...d.data() } as ConsultancyJobModel));
      setJobs(jList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve consultancy_jobs:", err.message);
      syncErrorsList.push("consultancy_jobs");
      setJobs([]);
    }

    // 5. Retrieve candidates
    try {
      const candSnap = await getDocs(collection(db, "consultancy_candidates"));
      const cList: ConsultancyCandidateModel[] = [];
      candSnap.forEach(d => cList.push({ id: d.id, ...d.data() } as ConsultancyCandidateModel));
      setCandidates(cList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve consultancy_candidates:", err.message);
      syncErrorsList.push("consultancy_candidates");
      setCandidates([]);
    }

    // 6. Retrieve placements
    try {
      const placeSnap = await getDocs(collection(db, "placements"));
      const pList: PlacementModel[] = [];
      placeSnap.forEach(d => pList.push({ id: d.id, ...d.data() } as PlacementModel));
      setPlacements(pList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve placements:", err.message);
      syncErrorsList.push("placements");
      setPlacements([]);
    }

    // 7. Retrieve team members
    try {
      const teamSnap = await getDocs(collection(db, "team_members"));
      const tList: TeamMemberModel[] = [];
      teamSnap.forEach(d => tList.push({ id: d.id, ...d.data() } as TeamMemberModel));
      setTeam(tList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve team_members:", err.message);
      syncErrorsList.push("team_members");
      setTeam([]);
    }

    // 8. Retrieve interviews scheduled
    try {
      const intSnap = await getDocs(collection(db, "interviews_scheduled"));
      const iList: InterviewModel[] = [];
      intSnap.forEach(d => iList.push({ id: d.id, ...d.data() } as InterviewModel));
      setInterviews(iList);
    } catch (err: any) {
      console.warn("Resilient Fetch: Failed to retrieve interviews_scheduled:", err.message);
      syncErrorsList.push("interviews_scheduled");
      setInterviews([]);
    }

    setLoading(false);
  };
const handleCreateRecruiter = async () => {
  try {
    await createRecruiterByConsultancy(userId, {
      fullName: recruiterForm.fullName,
      email: recruiterForm.email,
      phone: recruiterForm.phone,
      designation: recruiterForm.designation,
      temporaryPassword: recruiterForm.temporaryPassword,
    });

    alert('Recruiter created successfully');

    setShowRecruiterModal(false);

    setRecruiterForm({
      fullName: '',
      email: '',
      phone: '',
      designation: '',
      temporaryPassword: '',
    });

    fetchCrmData();
  } catch (error) {
    console.error(error);
    alert('Failed to create recruiter');
  }
};
  useEffect(() => {
    fetchCrmData();
  }, [userId]);

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
            { id: "leads", label: "Lead Management", icon: Users },
            { id: "matching", label: "AI Match Rankings", icon: Sparkles },
            { id: "interviews", label: "Interviews Scheduler", icon: Calendar },
            { id: "placements", label: "Placement Pipeline", icon: CheckCircle2 },
            { id: "team", label: "Recruitment Team", icon: ShieldCheck },
            { id: "reports", label: "Analytics Reports", icon: TrendingUp },
            { id: "subscription", label: "Billing & Payment", icon: DollarSign },
            { id: "notifications", label: "Notification Hub", icon: Bell },
            { id: "abac", label: "ABAC Security Guard", icon: ShieldAlert },
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
        </nav><button
  onClick={() => setShowRecruiterModal(true)}
  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 mb-3"
>
  <Plus className="w-3.5 h-3.5" />
  <span>Add Recruiter</span>
</button>
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
      <div className="md:col-span-3 space-y-6">


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
              />
            )}

            {activeTab === "candidates" && (
              <CrmCandidatesView
                candidates={candidates}
                onRefresh={fetchCrmData}
                userRole={currentUserRole}
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
      {showRecruiterModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-[#0B1120] border border-cyan-500 rounded-xl p-6 w-full max-w-md">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">
        Add Recruiter
      </h2>

      <input
        type="text"
        placeholder="Full Name"
        value={recruiterForm.fullName}
        onChange={(e) =>
          setRecruiterForm({ ...recruiterForm, fullName: e.target.value })
        }
        className="w-full mb-3 p-3 rounded bg-gray-900 border border-gray-700 text-white"
      />

      <input
        type="email"
        placeholder="Email"
        value={recruiterForm.email}
        onChange={(e) =>
          setRecruiterForm({ ...recruiterForm, email: e.target.value })
        }
        className="w-full mb-3 p-3 rounded bg-gray-900 border border-gray-700 text-white"
      />

      <input
        type="text"
        placeholder="Phone"
        value={recruiterForm.phone}
        onChange={(e) =>
          setRecruiterForm({ ...recruiterForm, phone: e.target.value })
        }
        className="w-full mb-3 p-3 rounded bg-gray-900 border border-gray-700 text-white"
      />

      <input
        type="text"
        placeholder="Designation"
        value={recruiterForm.designation}
        onChange={(e) =>
          setRecruiterForm({ ...recruiterForm, designation: e.target.value })
        }
        className="w-full mb-3 p-3 rounded bg-gray-900 border border-gray-700 text-white"
      />

      <input
        type="password"
        placeholder="Temporary Password"
        value={recruiterForm.temporaryPassword}
        onChange={(e) =>
          setRecruiterForm({
            ...recruiterForm,
            temporaryPassword: e.target.value,
          })
        }
        className="w-full mb-4 p-3 rounded bg-gray-900 border border-gray-700 text-white"
      />

      <div className="flex gap-3">
        <button
          onClick={handleCreateRecruiter}
          className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-3 rounded-lg"
        >
          Create Recruiter
        </button>

        <button
          onClick={() => setShowRecruiterModal(false)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
