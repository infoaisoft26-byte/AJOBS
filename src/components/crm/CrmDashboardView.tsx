import { 
  Users, Briefcase, Calendar, CheckCircle2, DollarSign, 
  TrendingUp, BarChart3, Clock, AlertCircle, Sparkles, TrendingUp as TrendIcon
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { ConsultancyProfile } from "../../types";
import { ClientModel, ConsultancyJobModel, ConsultancyCandidateModel, PlacementModel, InterviewModel } from "./CrmTypes";

interface CrmDashboardViewProps {
  profile: ConsultancyProfile;
  clients: ClientModel[];
  jobs: ConsultancyJobModel[];
  candidates: ConsultancyCandidateModel[];
  placements: PlacementModel[];
  interviews: InterviewModel[];
}

export default function CrmDashboardView({
  profile,
  clients,
  jobs,
  candidates,
  placements,
  interviews
}: CrmDashboardViewProps) {
  
  const activeJobsCount = jobs.filter(j => j.status === "open").length;
  const scheduledInterviewsCount = interviews.filter(i => i.status === "scheduled").length;
  const completedPlacementsCount = placements.filter(p => p.status === "joined").length;
  const totalRevenue = placements.reduce((sum, p) => p.invoiceStatus === "paid" ? sum + p.revenue : sum, 0);

  // Compute average resume score
  const avgResumeScore = candidates.length > 0 
    ? Math.round(candidates.reduce((sum, c) => sum + c.resumeScore, 0) / candidates.length)
    : 0;

  // Dynamic parsing logic for Candidate Salary expectations based on candidates data
  const getSalaryBenchmarkData = () => {
    // Roles category mapping
    const categories: { [key: string]: { totalSalary: number; count: number; benchmark: number } } = {
      "Full Stack Engineer": { totalSalary: 0, count: 0, benchmark: 38 },
      "DevOps / SRE": { totalSalary: 0, count: 0, benchmark: 42 },
      "Product Manager": { totalSalary: 0, count: 0, benchmark: 35 },
      "Backend Engineer": { totalSalary: 0, count: 0, benchmark: 36 },
      "UI/UX Designer": { totalSalary: 0, count: 0, benchmark: 28 },
    };

    candidates.forEach((c) => {
      // Clean expectedSalary to numeric value (e.g. "42" or "18 LPA" -> 42, 18)
      let salNum = parseFloat(c.expectedSalary.replace(/[^0-9.]/g, ""));
      if (isNaN(salNum)) salNum = 30; // fallback default
      if (salNum > 100000) salNum = Math.round(salNum / 100000); // convert PA rupees to LPA standard

      // Categorize candidate based on tags, notes, or skills
      let categorized = false;
      const skillsLower = c.skills.map(s => s.toLowerCase());
      const tagsLower = (c.tags || []).map(t => t.toLowerCase());

      if (skillsLower.includes("react") || skillsLower.includes("typescript") || tagsLower.includes("mern stack")) {
        categories["Full Stack Engineer"].totalSalary += salNum;
        categories["Full Stack Engineer"].count += 1;
        categorized = true;
      }
      if (skillsLower.includes("kubernetes") || skillsLower.includes("aws") || skillsLower.includes("terraform") || tagsLower.includes("devops")) {
        categories["DevOps / SRE"].totalSalary += salNum;
        categories["DevOps / SRE"].count += 1;
        categorized = true;
      }
      if (skillsLower.includes("product roadmap") || skillsLower.includes("agile") || tagsLower.includes("product")) {
        categories["Product Manager"].totalSalary += salNum;
        categories["Product Manager"].count += 1;
        categorized = true;
      }
      if (skillsLower.includes("python") || skillsLower.includes("sql") || skillsLower.includes("mongodb")) {
        categories["Backend Engineer"].totalSalary += salNum;
        categories["Backend Engineer"].count += 1;
        categorized = true;
      }
      
      if (!categorized) {
        // Default to Full Stack SDE
        categories["Full Stack Engineer"].totalSalary += salNum;
        categories["Full Stack Engineer"].count += 1;
      }
    });

    // Form data array for Recharts
    return Object.keys(categories).map((role) => {
      const { totalSalary, count, benchmark } = categories[role];
      const avgExpected = count > 0 ? Math.round(totalSalary / count) : benchmark - 2;
      return {
        role,
        "Average Candidate Expectation (LPA)": avgExpected,
        "Market Benchmark (LPA)": benchmark,
      };
    });
  };

  const chartData = getSalaryBenchmarkData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="crm-dashboard-view">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Jobs & Vacancies */}
        <div className="glass p-5 rounded-2xl relative overflow-hidden border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-gray-400 text-xs font-mono uppercase tracking-wider">
            <span>Active Vacancies</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{activeJobsCount}</span>
            <span className="text-xs text-gray-500">/ {jobs.length} total</span>
          </div>
          <p className="text-[10px] text-gray-400">Open reqs assigned across client pipeline.</p>
        </div>

        {/* Card 2: Candidates registered */}
        <div className="glass p-5 rounded-2xl relative overflow-hidden border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-gray-400 text-xs font-mono uppercase tracking-wider">
            <span>Recruited Pool</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{candidates.length}</span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono">ATS Active</span>
          </div>
          <p className="text-[10px] text-gray-400">Profiles stored with index scores.</p>
        </div>

        {/* Card 3: Interviews Scheduled */}
        <div className="glass p-5 rounded-2xl relative overflow-hidden border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-gray-400 text-xs font-mono uppercase tracking-wider">
            <span>Today's Interviews</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{scheduledInterviewsCount}</span>
            <span className="text-xs text-gray-500">active rounds</span>
          </div>
          <p className="text-[10px] text-gray-400">Calendar slots set for recruiters.</p>
        </div>

        {/* Card 4: Placements & Billing */}
        <div className="glass p-5 rounded-2xl relative overflow-hidden border border-white/5 space-y-3">
          <div className="flex justify-between items-center text-gray-400 text-xs font-mono uppercase tracking-wider">
            <span>Placements & Fees</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-emerald-400">₹{totalRevenue.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 font-mono">({completedPlacementsCount} hired)</span>
          </div>
          <p className="text-[10px] text-gray-400">Revenue acquired via client commission.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Progression Cycle Chart */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Placement Success & Billing Volume Trend</span>
              </h4>
              <p className="text-[11px] text-gray-400">Visualizing billing progress across active fiscal cycle.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
              +14.2% Growth
            </span>
          </div>

          {/* Premium Custom SVG Chart */}
          <div className="h-56 w-full relative pt-4">
            <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revenueChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
              <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
              <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />

              {/* Shaded Area for Placements */}
              <path
                d="M 10 130 Q 100 90, 200 110 T 350 40 T 490 25 L 490 140 L 10 140 Z"
                fill="url(#revenueChartGrad)"
              />

              {/* Stroke Line */}
              <path
                d="M 10 130 Q 100 90, 200 110 T 350 40 T 490 25"
                fill="none"
                stroke="#6366f1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Circles on Key Coordinates */}
              <circle cx="10" cy="130" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="1" />
              <circle cx="150" cy="100" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="1" />
              <circle cx="300" cy="55" r="4" fill="#818cf8" stroke="#ffffff" strokeWidth="1" />
              <circle cx="490" cy="25" r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />

              {/* Labels */}
              <text x="10" y="146" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">Q1 - Start</text>
              <text x="150" y="146" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">Q2 - Mid</text>
              <text x="300" y="146" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">Q3 - High</text>
              <text x="440" y="146" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">Current Peak</text>
            </svg>
          </div>
        </div>

        {/* Recent CRM Activity Logs */}
        <div className="glass p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>CRM Audit & Activity Logs</span>
          </h4>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-300">Aryan Sharma Placed</span>
                <span className="text-[9px] text-gray-500">2 hrs ago</span>
              </div>
              <p className="text-[10px] text-gray-400">Google India finalized placement. Invoice issued for INR 3.5 Lakhs.</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-300">Staff DevOps Open</span>
                <span className="text-[9px] text-gray-500">Yesterday</span>
              </div>
              <p className="text-[10px] text-gray-400">Created Staff DevOps role for Stripe Payment Systems. Recruiter assigned: Kunal.</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-300">Candidate Pool Synced</span>
                <span className="text-[9px] text-gray-500">2 days ago</span>
              </div>
              <p className="text-[10px] text-gray-400">Synchronized resume analytics scores for 4 primary candidate profiles from the ATS master.</p>
            </div>
          </div>
        </div>

        {/* Salary Benchmark Card (Recharts) */}
        <div className="lg:col-span-3 glass p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-3.5 gap-2">
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Candidate Salary Expectation vs Market Benchmarks</span>
              </h4>
              <p className="text-[11px] text-gray-400">Comparing average candidate requested compensation against standardized market benchmark baselines.</p>
            </div>
            <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] text-indigo-300 font-mono">
              <TrendIcon className="w-3.5 h-3.5" />
              <span>Real-Time ATS Input Pools</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="role" 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  unit="L"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#0d0e14", 
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "11px"
                  }} 
                />
                <Legend 
                  wrapperStyle={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", paddingTop: "10px" }}
                  iconSize={10}
                />
                <Bar name="Average Candidate Expectation (LPA)" dataKey="Average Candidate Expectation (LPA)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar name="Market Benchmark (LPA)" dataKey="Market Benchmark (LPA)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Profile Verification Badge Alert */}
      {(!profile.gstNumber || !profile.panNumber) && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-amber-300 block">Complete Consultancy Profile Verification Onboarding</strong>
            <p className="text-gray-300">
              Your registration is incomplete. Please navigate to the <strong>Agency Registration & Settings</strong> tab to record your GSTIN, PAN, and corporate address details for official Greenhouse matching verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
