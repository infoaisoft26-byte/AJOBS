import {
  ArrowUpRight,
  Award,
  BarChart3,
  DollarSign,
  PieChart,
  Target,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { useGlobalMarketplace } from "../context/GlobalMarketplaceContext";

export default function ExecutiveAnalyticsBi() {
  const { formatCurrency } = useGlobalMarketplace();

  const funnelData = [
    { stage: "Applied Candidates", count: 1420, percent: "100%", color: "bg-blue-500" },
    { stage: "AI Screened & Verified", count: 850, percent: "59.8%", color: "bg-cyan-500" },
    { stage: "Interviewed", count: 320, percent: "22.5%", color: "bg-indigo-500" },
    { stage: "Offers Released", count: 95, percent: "6.6%", color: "bg-purple-500" },
    { stage: "Joined & Placed", count: 82, percent: "5.7%", color: "bg-emerald-500" },
  ];

  const sourceEffectiveness = [
    { source: "Direct AIJobs Platform", conversion: "18.4%", placements: 42, qualityScore: 94 },
    { source: "Partner Consultancies", conversion: "14.2%", placements: 24, qualityScore: 89 },
    { source: "Employee Referrals", conversion: "26.1%", placements: 12, qualityScore: 96 },
    { source: "External Job Boards", conversion: "8.5%", placements: 4, qualityScore: 78 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900/50 via-indigo-900/30 to-black border border-purple-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold mb-3">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>EXECUTIVE RECRUITMENT BI & REVENUE ANALYTICS</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Executive Analytics & Business Intelligence</h2>
            <p className="text-gray-300 text-sm mt-1 max-w-2xl">
              Real-time telemetry tracking candidate throughput, recruiter conversion velocity, sourcing channel ROI, and enterprise placement MRR.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-right">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Quarterly Placement Revenue</span>
              <p className="text-xl font-extrabold text-emerald-400">{formatCurrency(348000)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Avg Time-to-Hire</span>
            <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> -42% YoY</span>
          </div>
          <p className="text-2xl font-extrabold text-white">12.4 Days</p>
          <p className="text-[10px] text-gray-400">Industry Avg: 34 Days</p>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Offer Acceptance Rate</span>
            <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3 h-3" /> 86.3%</span>
          </div>
          <p className="text-2xl font-extrabold text-white">86.3%</p>
          <p className="text-[10px] text-gray-400">+12% over last quarter</p>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Recruiter Productivity</span>
            <span className="text-indigo-400 font-bold">18 Placements/Mo</span>
          </div>
          <p className="text-2xl font-extrabold text-indigo-300">3.4x Velocity</p>
          <p className="text-[10px] text-gray-400">Powered by AI Candidate Matching</p>
        </div>

        <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-400 font-mono">
            <span>Platform Billing MRR</span>
            <span className="text-emerald-400 font-bold">+28% MoM</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(116000)}</p>
          <p className="text-[10px] text-gray-400">Enterprise subscriptions & success fees</p>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate Conversion Funnel */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>Candidate Conversion Funnel</span>
          </h3>

          <div className="space-y-3">
            {funnelData.map((f, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-300 font-mono">
                  <span>{f.stage}</span>
                  <span className="font-bold text-white">{f.count} ({f.percent})</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div className={`h-full ${f.color} transition-all duration-500`} style={{ width: f.percent }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Effectiveness & Channel Quality */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
            <PieChart className="w-4 h-4 text-amber-400" />
            <span>Channel ROI & Source Quality Index</span>
          </h3>

          <div className="space-y-3">
            {sourceEffectiveness.map((s, idx) => (
              <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="font-bold text-white">{s.source}</div>
                  <div className="text-gray-400 text-[10px]">Conversion Rate: {s.conversion}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">{s.placements} Placements</div>
                  <div className="text-amber-300 text-[10px]">Quality Index: {s.qualityScore}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
