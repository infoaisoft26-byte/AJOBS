import { useState, useEffect } from "react";
import { 
  Building2, TrendingUp, Briefcase, Brain, Users, 
  Calendar, Award, BarChart2, ShieldAlert, ShieldCheck, RefreshCw, LogOut, CreditCard, Bell
} from "lucide-react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import SubscriptionBillingHub from "./SubscriptionBillingHub";
import { NotificationCenterView } from "./NotificationCenter";

// Types
import { 
  CompanyProfile, CompanyJob, CompanyApplication, 
  CompanyInterview, CompanyOffer, CompanyActivityLog 
} from "./employer/EmployerTypes";

// Seeding helper
import { seedEmployerDataIfEmpty } from "./employer/EmployerSeedData";

// Submodules
import CompanyRegistration from "./employer/CompanyRegistration";
import CompanyDashboardOverview from "./employer/CompanyDashboardOverview";
import JobManagement from "./employer/JobManagement";
import AiCandidateDiscovery from "./employer/AiCandidateDiscovery";
import ApplicationPipeline from "./employer/ApplicationPipeline";
import InterviewManagement from "./employer/InterviewManagement";
import OfferManagement from "./employer/OfferManagement";
import ReportsAnalytics from "./employer/ReportsAnalytics";

interface EmployerDashboardProps {
  userId: string;
  userName: string;
}

export default function EmployerDashboard({ userId, userName }: EmployerDashboardProps) {
  // Navigation active tab routing
  const [activeTab, setActiveTab] = useState<
    "overview" | "registration" | "jobs" | "discovery" | "pipeline" | "interviews" | "offers" | "reports" | "subscription"
  >("overview");

  // Corporate core data stores
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [jobs, setJobs] = useState<CompanyJob[]>([]);
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [interviews, setInterviews] = useState<CompanyInterview[]>([]);
  const [offers, setOffers] = useState<CompanyOffer[]>([]);
  const [activities, setActivities] = useState<CompanyActivityLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync / loading function
  const synchronizeVault = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    try {
      // 1. Seed demo data if first-time corporate logon
      await seedEmployerDataIfEmpty(userId, userName);

      // 2. Fetch Corporate Registry Profile
      const companySnap = await getDoc(doc(db, "companies", userId));
      if (companySnap.exists()) {
        setCompanyProfile(companySnap.data() as CompanyProfile);
      } else {
        // Fallback checks standard employers profile
        const standardSnap = await getDoc(doc(db, "employers", userId));
        if (standardSnap.exists()) {
          const sd = standardSnap.data();
          setCompanyProfile({
            id: userId,
            userId: userId,
            companyName: sd.companyName || "Corporate Partner",
            industry: sd.industry || "Enterprise",
            companySize: sd.size || "10-50",
            logoUrl: "", website: "", gstNumber: "", email: "", phone: "",
            officeAddress: "", locations: ["Remote"], hrName: userName, hrEmail: "",
            verificationDocs: "", description: "", linkedinUrl: "", isVerified: true,
            createdAt: new Date().toISOString()
          });
        }
      }

      // 3. Fetch Company Jobs (company_jobs)
      const jobsSnap = await getDocs(collection(db, "company_jobs"));
      const jobsList: CompanyJob[] = [];
      jobsSnap.forEach((docSnap) => {
        const jd = docSnap.data() as CompanyJob;
        if (jd.companyId === userId) {
          jobsList.push({ id: docSnap.id, ...jd });
        }
      });
      // Sort jobs by creation date
      setJobs(jobsList.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));

      // 4. Fetch Corporate applications pipeline
      const appsSnap = await getDocs(collection(db, "company_applications"));
      const appsList: CompanyApplication[] = [];
      appsSnap.forEach((docSnap) => {
        const ad = docSnap.data() as CompanyApplication;
        // Verify candidate application corresponds to one of our corporate jobs
        if (jobsList.some(j => j.id === ad.jobId)) {
          appsList.push({ id: docSnap.id, ...ad });
        }
      });
      setApplications(appsList);

      // 5. Fetch Company Interviews (company_interviews)
      const intsSnap = await getDocs(collection(db, "company_interviews"));
      const intsList: CompanyInterview[] = [];
      intsSnap.forEach((docSnap) => {
        const idat = docSnap.data() as CompanyInterview;
        if (jobsList.some(j => j.id === idat.jobId)) {
          intsList.push({ id: docSnap.id, ...idat });
        }
      });
      setInterviews(intsList);

      // 6. Fetch Released Offers (offers)
      const offersSnap = await getDocs(collection(db, "offers"));
      const offersList: CompanyOffer[] = [];
      offersSnap.forEach((docSnap) => {
        const od = docSnap.data() as CompanyOffer;
        if (jobsList.some(j => j.id === od.jobId)) {
          offersList.push({ id: docSnap.id, ...od });
        }
      });
      setOffers(offersList);

      // 7. Fetch Activity logs
      const logsSnap = await getDocs(collection(db, "company_activity_logs"));
      const logsList: CompanyActivityLog[] = [];
      logsSnap.forEach((docSnap) => {
        const ld = docSnap.data() as CompanyActivityLog;
        if (ld.companyId === userId) {
          logsList.push({ id: docSnap.id, ...ld });
        }
      });
      setActivities(logsList.sort((a,b) => b.createdAt.localeCompare(a.createdAt)));

    } catch (err) {
      console.error("Corporate synchronization failed:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    synchronizeVault();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-xs text-gray-400 font-mono animate-pulse">
          Opening Enterprise Corporate Gateway Vault...
        </span>
      </div>
    );
  }

  // Active sub-view parameters
  const companyLogo = companyProfile?.logoUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80";
  const corpName = companyProfile?.companyName || "Corporate Workspace";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 space-y-6" id="corporate-portal-container">
      
      {/* Premium Glassmorphic Header */}
      <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <img
            src={companyLogo}
            alt={corpName}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border border-white/10"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">{corpName}</h2>
              {companyProfile?.isVerified && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-full uppercase font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Verified Corp</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Enterprise Recruitment CRM • Sourcing portal under GSTIN {companyProfile?.gstNumber || "Unregistered"}
            </p>
          </div>
        </div>

        {/* Sync Indicator button */}
        <button
          onClick={() => synchronizeVault(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-300 rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span>Sync Corporate Workspace</span>
        </button>
      </div>

      {/* Navigation and Tab switcher Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 glass p-4 rounded-2xl border border-white/5 h-fit space-y-2 text-xs">
          <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block px-2 pb-2">
            Navigation Suite
          </span>

          {[
            { id: "overview", label: "Dashboard overview", icon: TrendingUp },
            { id: "registration", label: "Company Registry", icon: Building2 },
            { id: "jobs", label: "Job Vacancies", icon: Briefcase },
            { id: "discovery", label: "AI Candidate Discovery", icon: Brain },
            { id: "pipeline", label: "Hiring Pipeline", icon: Users },
            { id: "interviews", label: "Interviews Suite", icon: Calendar },
            { id: "offers", label: "Acceptance & Offers", icon: Award },
            { id: "reports", label: "Metrics & Reports", icon: BarChart2 },
            { id: "subscription", label: "Billing & Payment", icon: CreditCard },
            { id: "notifications", label: "Notification Hub", icon: Bell }
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-left transition-all cursor-pointer ${
                  isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/15" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content routing pane */}
        <div className="lg:col-span-4 min-h-[500px]">
          {activeTab === "overview" && (
            <CompanyDashboardOverview
              jobs={jobs}
              applications={applications}
              interviews={interviews}
              offers={offers}
              activities={activities}
              onRefresh={synchronizeVault}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "registration" && (
            <CompanyRegistration
              userId={userId}
              userName={userName}
              companyProfile={companyProfile}
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "jobs" && (
            <JobManagement
              userId={userId}
              companyName={corpName}
              jobs={jobs}
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "discovery" && (
            <AiCandidateDiscovery
              userId={userId}
              jobs={jobs}
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "pipeline" && (
            <ApplicationPipeline
              userId={userId}
              jobs={jobs}
              applications={applications}
              onRefresh={synchronizeVault}
              onOpenScheduleInterview={(app) => {
                setActiveTab("interviews");
              }}
              onOpenReleaseOffer={(app) => {
                setActiveTab("offers");
              }}
            />
          )}

          {activeTab === "interviews" && (
            <InterviewManagement
              userId={userId}
              jobs={jobs}
              applications={applications}
              interviews={interviews}
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "offers" && (
            <OfferManagement
              userId={userId}
              companyName={corpName}
              applications={applications}
              offers={offers}
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "reports" && (
            <ReportsAnalytics
              jobs={jobs}
              applications={applications}
              interviews={interviews}
              offers={offers}
            />
          )}

          {activeTab === "subscription" && (
            <SubscriptionBillingHub
              userId={userId}
              userName={userName}
              userRole="employer"
              onRefresh={synchronizeVault}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationCenterView userId={userId} userRole="employer" userName={userName} />
          )}
        </div>

      </div>
    </div>
  );
}
