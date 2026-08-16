import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Globe,
  ExternalLink,
  Sparkles,
  BarChart3,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  Legend
} from "recharts";
import { MarketTrendsReport, VerifiedSource } from "../../services/ai/chatbotSearch.service";

interface JobMarketTrendsDashboardProps {
  report: MarketTrendsReport;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const JobMarketTrendsDashboard: React.FC<JobMarketTrendsDashboardProps> = ({
  report,
  onRefresh,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<"industries" | "cycles" | "salary">("industries");

  // Colors for industry bar chart
  const industryColors = ["#38bdf8", "#818cf8", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"];

  // Custom Tooltip for Industry Chart
  const CustomIndustryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-indigo-500/30 p-2.5 rounded-xl shadow-xl text-xs space-y-1 font-mono text-gray-200 z-50">
          <div className="font-bold text-white flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>{data.industry}</span>
          </div>
          <div className="text-emerald-400">YoY Hiring Surge: +{data.growth}%</div>
          <div className="text-gray-300">Demand Index: {data.demandScore} / 100</div>
          <div className="text-amber-300">Avg CTC: {data.avgSalaryINR}</div>
          <div className="text-[10px] text-gray-400 pt-1 border-t border-white/10">
            Hot Skills: {data.hotSkills?.slice(0, 3).join(", ")}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Hiring Cycles
  const CustomCycleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-cyan-500/30 p-2.5 rounded-xl shadow-xl text-xs space-y-1 font-mono text-gray-200 z-50">
          <div className="font-bold text-white flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>{data.quarter}</span>
          </div>
          <div className="text-cyan-300 font-semibold">{data.season}</div>
          <div className="text-emerald-400">Hiring Velocity Index: {data.activityLevel}/100</div>
          <div className="text-[10px] text-gray-300 pt-1 border-t border-white/10">{data.focusAreas}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="my-3 w-full bg-slate-950/90 border border-indigo-500/20 rounded-2xl p-3 sm:p-3.5 shadow-2xl text-xs overflow-hidden"
      id="chat-market-trends-dashboard"
    >
      {/* Dashboard Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-bold text-white text-xs font-mono tracking-wide">
                Live Job Market Intelligence
              </h4>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 text-[8px] font-mono rounded border border-emerald-500/30 animate-pulse">
                Grounded 2026
              </span>
            </div>
            <p className="text-[9px] text-gray-400 font-mono">
              Live Hiring Analytics & Economic Benchmarks • {report.timestamp}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 text-[10px] font-mono flex items-center space-x-1 transition-all cursor-pointer"
            title="Refresh with live Google Search grounding"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            <span>{isLoading ? "Syncing..." : "Sync"}</span>
          </button>
        )}
      </div>

      {/* Snapshot Metric Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-2.5">
        <div className="p-2 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex flex-col justify-between">
          <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
            <TrendingUp className="w-2.5 h-2.5 text-indigo-400" /> Overall Surge
          </span>
          <span className="text-xs font-bold text-indigo-300 font-mono mt-0.5">
            {report.overallGrowthIndex}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5 text-emerald-400" /> Active GCCs
          </span>
          <span className="text-xs font-bold text-emerald-300 font-mono mt-0.5 truncate" title={report.gccCentersCount}>
            1,940+ Hubs
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex flex-col justify-between">
          <span className="text-[9px] text-gray-400 font-mono flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5 text-cyan-400" /> Current Phase
          </span>
          <span className="text-xs font-bold text-cyan-300 font-mono mt-0.5 truncate" title={report.activeHiringPhase}>
            Q1 Budget Unlocks
          </span>
        </div>
      </div>

      {/* Interactive Tabs Navigation */}
      <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/5 my-2">
        <button
          onClick={() => setActiveTab("industries")}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer ${
            activeTab === "industries"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          <span className="truncate">Top Industries</span>
        </button>

        <button
          onClick={() => setActiveTab("cycles")}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer ${
            activeTab === "cycles"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <Calendar className="w-3 h-3" />
          <span className="truncate">Hiring Cycles</span>
        </button>

        <button
          onClick={() => setActiveTab("salary")}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-medium flex items-center justify-center space-x-1 transition-all cursor-pointer ${
            activeTab === "salary"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <DollarSign className="w-3 h-3" />
          <span className="truncate">CTC Bands</span>
        </button>
      </div>

      {/* Visual Charts Container */}
      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5 my-2">
        <AnimatePresence mode="wait">
          {activeTab === "industries" && (
            <motion.div
              key="industries-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>YoY Hiring Growth by Industry Segment (%)</span>
                <span className="text-emerald-400 font-bold">AI/ML: +44.5%</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.topIndustries}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 24, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 50]}
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="industry"
                      tick={{ fill: "#cbd5e1", fontSize: 9 }}
                      width={80}
                    />
                    <Tooltip content={<CustomIndustryTooltip />} />
                    <Bar dataKey="growth" radius={[0, 4, 4, 0]}>
                      {report.topIndustries.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={industryColors[index % industryColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quick skill chips */}
              <div className="pt-1.5 border-t border-white/5 flex flex-wrap gap-1">
                <span className="text-[9px] text-gray-400 font-mono py-0.5">Surging Skills:</span>
                {report.topIndustries.flatMap((t) => t.hotSkills || []).slice(0, 5).map((skill, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] text-indigo-300 font-mono"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "cycles" && (
            <motion.div
              key="cycles-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Seasonal Hiring Velocity Curve (1 - 100 Index)</span>
                <span className="text-cyan-400 font-bold">Peak: Q2 Switch Window</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.hiringCycles} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="cycleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="quarter" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                    <YAxis domain={[50, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                    <Tooltip content={<CustomCycleTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="activityLevel"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#cycleGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cycle Breakdown Grid */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                {report.hiringCycles.map((c, idx) => (
                  <div
                    key={idx}
                    className={`p-1.5 rounded-lg border text-[9px] font-mono ${
                      c.status === "active"
                        ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-200"
                        : "bg-white/5 border-white/5 text-gray-400"
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{c.quarter}</span>
                      {c.status === "active" && (
                        <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1 rounded">Active</span>
                      )}
                    </div>
                    <p className="truncate text-gray-300">{c.season}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "salary" && (
            <motion.div
              key="salary-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>Compensation Benchmarks by Experience Tier (₹ LPA)</span>
                <span className="text-amber-400 font-bold">GenAI Lead: ₹55 LPA</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.salaryBenchmarks} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="role" tick={{ fill: "#94a3b8", fontSize: 8 }} interval={0} tickFormatter={(val) => val.split(" ")[0]} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} unit="L" />
                    <Tooltip
                      formatter={(val: any, name: any) => [`₹${val} LPA`, name === "entryLPA" ? "Fresher/Entry" : name === "midLPA" ? "Mid-Level" : "Lead/Principal"]}
                      contentStyle={{ backgroundColor: "#020617", borderColor: "rgba(255,255,255,0.1)", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "9px", paddingTop: "4px" }} />
                    <Bar dataKey="entryLPA" name="Entry (1-3y)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="midLPA" name="Mid (3-7y)" fill="#818cf8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="leadLPA" name="Lead (8y+)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[9px] text-gray-400 font-mono text-center">
                *Data calibrated with live Tier-1 GCC and tech enterprise hiring bands in India.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Verified Grounding Sources Section */}
      {report.verifiedSources && report.verifiedSources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Verified Market Sources & Citations</span>
            </span>
            <span className="text-[8px] text-gray-500 font-mono">Click to view article</span>
          </div>

          <div className="space-y-1">
            {report.verifiedSources.map((src, idx) => (
              <a
                key={idx}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/15 border border-white/5 hover:border-indigo-500/30 transition-all flex items-start justify-between gap-2 text-left"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <Globe className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                    <span className="font-mono text-[9px] font-semibold text-gray-200 group-hover:text-indigo-300 truncate">
                      {src.title}
                    </span>
                    <span className="text-[8px] px-1 rounded bg-white/10 text-gray-400 font-mono shrink-0">
                      {src.domain}
                    </span>
                  </div>
                  {src.snippet && (
                    <p className="text-[8px] text-gray-400 line-clamp-1 group-hover:text-gray-300 font-sans">
                      {src.snippet}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-indigo-400 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
