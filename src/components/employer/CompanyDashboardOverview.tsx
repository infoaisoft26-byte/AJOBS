import { useState } from "react";
import { 
  TrendingUp, Briefcase, Users, CheckCircle, Calendar, 
  Send, Award, Bell, Clock, RefreshCw, BarChart2, Star
} from "lucide-react";
import { CompanyJob, CompanyApplication, CompanyInterview, CompanyOffer, CompanyActivityLog } from "./EmployerTypes";
import HolographicCard from "../HolographicCard";
import DashboardAnalyticsCharts from "../DashboardAnalyticsCharts";

interface CompanyDashboardOverviewProps {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  offers: CompanyOffer[];
  activities: CompanyActivityLog[];
  onRefresh: () => void;
  onNavigateToTab: (tab: any) => void;
}

export default function CompanyDashboardOverview({
  jobs,
  applications,
  interviews,
  offers,
  activities,
  onRefresh,
  onNavigateToTab
}: CompanyDashboardOverviewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      onRefresh();
      setIsRefreshing(false);
    }, 1000);
  };

  // Metrics calculations
  const activeJobs = jobs.filter(j => j.status === "Published").length;
  const totalApplications = applications.length;
  const aiMatchCount = applications.filter(a => a.resumeScore >= 80).length;
  const shortlistedCount = applications.filter(a => a.status === "Shortlisted").length;
  
  // Interviews today
  const todayStr = new Date().toISOString().split("T")[0];
  const interviewsToday = interviews.filter(i => i.date === todayStr).length;

  const offersReleased = offers.length;
  const hiresThisMonth = applications.filter(a => a.status === "Joined").length + offers.filter(o => o.offerStatus === "Accepted").length;

  // Let's create an interactive widget showing hire pipeline percentages
  const pipelineStages = [
    { name: "Applied", count: applications.filter(a => a.status === "Applied").length, color: "bg-blue-500" },
    { name: "Screening", count: applications.filter(a => a.status === "Screening").length, color: "bg-indigo-500" },
    { name: "Shortlisted", count: shortlistedCount, color: "bg-purple-500" },
    { name: "Interviews", count: applications.filter(a => ["Interview Scheduled", "HR Round", "Final Round"].includes(a.status)).length, color: "bg-pink-500" },
    { name: "Offers", count: offersReleased, color: "bg-emerald-500" }
  ];

  const maxPipelineCount = Math.max(...pipelineStages.map(s => s.count), 1);

  return (
    <div className="space-y-6" id="employer-dashboard-overview">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Enterprise Dashboard Overview</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Dynamic statistics, real-time recruiting indices, and upcoming events workspace.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-gray-300 rounded-lg transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
          <span>{isRefreshing ? "Syncing..." : "Sync Systems"}</span>
        </button>
      </div>

      {/* Stats Cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HolographicCard 
          glowColor="rgba(99, 102, 241, 0.25)"
          onClick={() => onNavigateToTab("jobs")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Active Jobs</span>
            <Briefcase className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{activeJobs}</div>
          <p className="text-[9px] text-gray-500">Live vacancies accepting resumes</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(168, 85, 247, 0.25)"
          onClick={() => onNavigateToTab("pipeline")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Applications</span>
            <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{totalApplications}</div>
          <p className="text-[9px] text-gray-500">Total applications registered</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(236, 72, 153, 0.25)"
          onClick={() => onNavigateToTab("discovery")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>AI Top Matches</span>
            <Star className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{aiMatchCount}</div>
          <p className="text-[9px] text-gray-500">ATS Match percentage &ge; 80%</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(16, 185, 129, 0.25)"
          onClick={() => onNavigateToTab("interviews")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Interviews Today</span>
            <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{interviewsToday}</div>
          <p className="text-[9px] text-gray-500">Scheduled interviews for today</p>
        </HolographicCard>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HolographicCard 
          glowColor="rgba(59, 130, 246, 0.25)"
          onClick={() => onNavigateToTab("pipeline")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Shortlisted</span>
            <CheckCircle className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{shortlistedCount}</div>
          <p className="text-[9px] text-gray-500">Hiring managers shortlisted</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(16, 185, 129, 0.25)"
          onClick={() => onNavigateToTab("offers")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Offers Released</span>
            <Send className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{offersReleased}</div>
          <p className="text-[9px] text-gray-500">Pending candidate signatures</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(234, 179, 8, 0.25)"
          onClick={() => onNavigateToTab("offers")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Hires This Month</span>
            <Award className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-white">{hiresThisMonth}</div>
          <p className="text-[9px] text-gray-500">Hires onboarded and signed</p>
        </HolographicCard>

        <HolographicCard 
          glowColor="rgba(99, 102, 241, 0.25)"
          onClick={() => onNavigateToTab("reports")}
          className="p-4 space-y-2 cursor-pointer group"
        >
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-gray-400">
            <span>Success Rate</span>
            <BarChart2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-all" />
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {totalApplications > 0 ? Math.round(((shortlistedCount + offersReleased) / totalApplications) * 100) : 0}%
          </div>
          <p className="text-[9px] text-gray-500">Application pipeline advancement index</p>
        </HolographicCard>
      </div>

      {/* Interactive Recharts Analytics Block */}
      <DashboardAnalyticsCharts 
        applications={applications} 
        candidatesCount={shortlistedCount} 
        jobsCount={jobs.length} 
      />

      {/* Two Column details split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution Analytics */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Hiring Pipeline Analytics</h4>
            <button
              onClick={() => onNavigateToTab("performance")}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>View Recharts Performance &rarr;</span>
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {pipelineStages.map((stage, sidx) => {
              const pct = Math.round((stage.count / maxPipelineCount) * 100);
              return (
                <div key={sidx} className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-semibold text-gray-200">{stage.name}</span>
                    <span className="font-mono text-gray-400 font-bold">{stage.count} Candidates</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${stage.count > 0 ? pct : 0}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed border-t border-white/5 pt-3">
            * This dynamic funnel highlights screening drops, bottlenecks, active technical reviews, and placement outcomes.
          </p>
        </div>

        {/* Recent Activities feed */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Recent Activities</span>
            </h4>
            <span className="text-[9px] text-gray-400 font-mono">Log</span>
          </div>

          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
            {activities.length > 0 ? (
              activities.map((act) => {
                const dateText = new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={act.id} className="p-2.5 bg-white/5 border border-white/5 rounded-xl space-y-1 text-[11px] hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-center text-gray-400">
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                        act.type === "job" ? "bg-indigo-500/15 text-indigo-400" :
                        act.type === "application" ? "bg-purple-500/15 text-purple-400" :
                        act.type === "interview" ? "bg-pink-500/15 text-pink-400" :
                        act.type === "offer" ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-500/15 text-gray-400"
                      }`}>
                        {act.type}
                      </span>
                      <span className="font-mono text-[9px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" />
                        {dateText}
                      </span>
                    </div>
                    <p className="text-white font-medium leading-relaxed">{act.description}</p>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs text-gray-500 italic">No activity registered yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
