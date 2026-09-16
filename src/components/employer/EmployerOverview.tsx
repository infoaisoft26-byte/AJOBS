import { Briefcase, Calendar, ChevronRight, PlusCircle, Search, Sparkles, UserCheck, Users } from "lucide-react";
import EmployerStatCard from "./EmployerStatCard";
import { CompanyApplication, CompanyInterview, CompanyJob } from "./EmployerTypes";

interface EmployerOverviewProps {
  userName: string;
  companyName: string;
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  onNavigateTab: (tabId: string) => void;
  onViewCandidate: (application: CompanyApplication) => void;
  onOpenLiveChat?: (recipientId?: string, recipientName?: string) => void;
}

export default function EmployerOverview({
  userName,
  companyName,
  jobs,
  applications,
  interviews,
  onNavigateTab,
  onViewCandidate
}: EmployerOverviewProps) {
  const activeJobs = jobs.filter((job) => ["active", "open", "live", "approved", "published"].includes(String(job.status || "").toLowerCase()));
  const shortlisted = applications.filter((application) => ["shortlisted", "interview", "interview scheduled"].includes(String(application.status || "").toLowerCase()));
  const recentApplications = [...applications]
    .sort((a, b) => new Date((b as any).appliedAt || 0).getTime() - new Date((a as any).appliedAt || 0).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6" id="employer-overview-page">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17111F] via-[#392742]/70 to-[#17111F] border border-purple-500/20 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live employer workspace</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white">Welcome {userName || "Employer"}</h1>
            <p className="mt-1 text-sm text-slate-300">{companyName || "Your company"} · Only live Firestore records are shown here.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigateTab("post-job")} className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Post a Job
            </button>
            <button onClick={() => onNavigateTab("candidate-search")} className="px-5 py-3 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-sm flex items-center gap-2">
              <Search className="w-4 h-4" /> Search Candidates
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <EmployerStatCard title="Active Jobs" value={activeJobs.length} icon={Briefcase} trendText="Real published jobs" trendType="positive" accentColor="blue" onClick={() => onNavigateTab("my-jobs")} />
        <EmployerStatCard title="Applications" value={applications.length} icon={Users} trendText="Real candidate applications" trendType="highlight" accentColor="cyan" onClick={() => onNavigateTab("applications")} />
        <EmployerStatCard title="Shortlisted" value={shortlisted.length} icon={UserCheck} trendText="Current pipeline" trendType="positive" accentColor="purple" onClick={() => onNavigateTab("applications")} />
        <EmployerStatCard title="Interviews" value={interviews.length} icon={Calendar} trendText="Scheduled records" trendType="positive" accentColor="emerald" onClick={() => onNavigateTab("interviews")} />
      </div>

      <div className="rounded-3xl bg-[#17111F]/80 border border-purple-500/20 p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-white">Recent Applications</h2>
            <p className="text-xs text-slate-400">No sample applicants, fake counts, top-match placeholders, or mock trends.</p>
          </div>
          <button onClick={() => onNavigateTab("applications")} className="text-xs font-bold text-cyan-400 flex items-center gap-1">View all <ChevronRight className="w-4 h-4" /></button>
        </div>

        {recentApplications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <Users className="w-9 h-9 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">No real applications received yet.</p>
            <p className="text-xs text-slate-500 mt-1">New candidate applications will appear automatically when they are submitted.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentApplications.map((application) => (
              <button key={application.id} onClick={() => onViewCandidate(application)} className="w-full py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-xl">
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{application.candidateName || "Candidate"}</div>
                  <div className="text-xs text-slate-400 truncate">{application.jobTitle || "Applied job"} · {application.status || "applied"}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
