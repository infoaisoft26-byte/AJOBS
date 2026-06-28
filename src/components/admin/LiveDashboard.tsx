import { useState, useEffect } from "react";
import { 
  Users, Building, Briefcase, FileText, Calendar, Award, 
  TrendingUp, IndianRupee, Clock, ShieldAlert, Sparkles, RefreshCw,
  Layers, ArrowUpRight, ShieldCheck, HelpCircle, CheckCircle, Flame
} from "lucide-react";
import { LiveStats, SystemAuditLog } from "./AdminTypes";

interface LiveDashboardProps {
  stats: LiveStats;
  recentLogs: SystemAuditLog[];
  onRefresh: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function LiveDashboard({
  stats,
  recentLogs,
  onRefresh,
  onNavigateToTab
}: LiveDashboardProps) {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

  // Weekly applications count data
  const weeklyTrend = [
    { day: "Mon", count: 42, revenue: 15000 },
    { day: "Tue", count: 58, revenue: 22000 },
    { day: "Wed", count: 89, revenue: 35000 },
    { day: "Thu", count: 74, revenue: 18000 },
    { day: "Fri", count: 96, revenue: 45000 },
    { day: "Sat", count: 50, revenue: 29000 },
    { day: "Sun", count: 65, revenue: 38000 }
  ];

  // Distribution chart constants
  const roleDistribution = [
    { label: "Candidates", value: stats.totalCandidates, color: "stroke-indigo-500", text: "text-indigo-400" },
    { label: "Employers", value: stats.totalEmployers, color: "stroke-pink-500", text: "text-pink-400" },
    { label: "Consultancies", value: stats.totalConsultancies, color: "stroke-purple-500", text: "text-purple-400" },
    { label: "Admins", value: 3, color: "stroke-emerald-500", text: "text-emerald-400" }
  ];
  const totalUsers = stats.totalCandidates + stats.totalEmployers + stats.totalConsultancies + 3;

  // Render SVG Ring helper
  let cumulativePercent = 0;

  // Heat map matrix (Hours 08:00 to 20:00 vs Days Mon-Fri)
  const daysLabel = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hoursLabel = ["09:00", "12:00", "15:00", "18:00", "21:00"];
  const heatValues = [
    [10, 45, 80, 50, 20], // Mon
    [30, 90, 70, 85, 40], // Tue
    [50, 80, 95, 60, 15], // Wed
    [40, 60, 85, 90, 35], // Thu
    [75, 95, 99, 70, 60]  // Fri
  ];

  // Helper formatting INR
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6" id="super-admin-live-dashboard">
      
      {/* Upper Alerts & Platform Insights banner */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-white/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/20 rounded-xl">
            <Flame className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-white uppercase font-mono tracking-wider">REALTIME CORE INTELLIGENCE LIVE</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Platform is performing with optimum throughput. Back backups and system registers are up to date.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-950/40 rounded-full border border-white/5 font-mono text-[10px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>SYSTEM LOAD: <strong className="text-white">12.4%</strong></span>
        </div>
      </div>

      {/* Grid of 15 Multi-Faceted Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Row 1 */}
        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Candidates</span>
            <Users className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.totalCandidates}</div>
          <div className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+18.4% monthly</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Consultancies</span>
            <Building className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.totalConsultancies}</div>
          <div className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+12.1% premium</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Employers</span>
            <Building className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.totalEmployers}</div>
          <div className="text-[9px] text-emerald-400 font-mono mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>+24% enterprise</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Jobs Posted</span>
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.totalJobs}</div>
          <div className="text-[9px] text-indigo-400 font-mono mt-1">
            <span>Platform Sourced</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Active Jobs</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5">{stats.activeJobs}</div>
          <div className="text-[9px] text-indigo-400 font-mono mt-1">
            <span>Open for submission</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Apps Today</span>
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.applicationsToday}</div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Real-time submission</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>AI Interviews Today</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.interviewsToday}</div>
          <div className="text-[9px] text-purple-400 font-mono mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Gemini Streaming</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Resumes Analyzed</span>
            <FileText className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.resumesAnalyzedToday}</div>
          <div className="text-[9px] text-indigo-400 font-mono mt-1">
            <span>ATS parsing logs</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => onNavigateToTab("payments")}>
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Revenue Today</span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5">{formatCurrency(stats.revenueToday)}</div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Secure gateways</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => onNavigateToTab("payments")}>
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Monthly Revenue</span>
            <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{formatCurrency(stats.monthlyRevenue)}</div>
          <div className="text-[9px] text-emerald-400 font-mono mt-1">
            <span>SaaS target: 94%</span>
          </div>
        </div>

        {/* Row 3 */}
        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => onNavigateToTab("payments")}>
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Yearly Revenue</span>
            <IndianRupee className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xl font-black text-white mt-1.5">{formatCurrency(stats.yearlyRevenue)}</div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Recurring contracts</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all cursor-pointer" onClick={() => onNavigateToTab("approvals")}>
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Pending Approvals</span>
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className={`text-2xl font-black mt-1.5 ${stats.pendingApprovals > 0 ? "text-rose-400" : "text-white"}`}>
            {stats.pendingApprovals}
          </div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Needs manual GST/PAN verification</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-pink-500/30 transition-all cursor-pointer" onClick={() => onNavigateToTab("support")}>
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Support Tickets</span>
            <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className={`text-2xl font-black mt-1.5 ${stats.supportTickets > 0 ? "text-amber-400 font-extrabold animate-pulse" : "text-white"}`}>
            {stats.supportTickets}
          </div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Active client issues</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Live Online Users</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-baseline gap-1">
            <span>{stats.liveOnlineUsers}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="text-[9px] text-gray-400 font-mono mt-1">
            <span>Active sessions (5m)</span>
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-center text-gray-400 text-[10px] font-mono uppercase">
            <span>Today's Registers</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5">{stats.registrationsToday}</div>
          <div className="text-[9px] text-emerald-400 font-mono mt-1">
            <span>+32% vs yesterday</span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Trend (Interactive SVG Area Chart) */}
        <div className="lg:col-span-2 glass p-5 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Weekly Sourcing Volume & Billings</span>
              </h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Dual-axis telemetry tracking application submissions vs generated daily platform revenue.</p>
            </div>

            <div className="flex gap-4 font-mono text-[9px]">
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-1.5 bg-indigo-500 rounded"></span> Applications Sourced
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-1.5 bg-emerald-500 rounded"></span> Billings (INR)
              </span>
            </div>
          </div>

          {/* SVG Graph Container */}
          <div className="relative h-[220px] bg-neutral-950/20 rounded-2xl border border-white/5 p-4 flex flex-col justify-end">
            <svg className="w-full h-[140px]" viewBox="0 0 600 140" preserveAspectRatio="none">
              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                </linearGradient>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="35" x2="600" y2="35" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="70" x2="600" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="105" x2="600" y2="105" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

              {/* Area path for applications */}
              <path
                d="M 20 140 L 20 90 L 110 70 L 200 30 L 290 50 L 380 20 L 470 80 L 560 60 L 560 140 Z"
                fill="url(#indigoGrad)"
              />
              {/* Line path for applications */}
              <path
                d="M 20 90 L 110 70 L 200 30 L 290 50 L 380 20 L 470 80 L 560 60"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Area path for billings */}
              <path
                d="M 20 140 L 20 120 L 110 110 L 200 80 L 290 100 L 380 60 L 470 90 L 560 70 L 560 140 Z"
                fill="url(#emeraldGrad)"
              />
              <path
                d="M 20 120 L 110 110 L 200 80 L 290 100 L 380 60 L 470 90 L 560 70"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />

              {/* Points for Applications */}
              {[
                { x: 20, y: 90, val: 42, rev: 15000 },
                { x: 110, y: 70, val: 58, rev: 22000 },
                { x: 200, y: 30, val: 89, rev: 35000 },
                { x: 290, y: 50, val: 74, rev: 18000 },
                { x: 380, y: 20, val: 96, rev: 45000 },
                { x: 470, y: 80, val: 50, rev: 29000 },
                { x: 560, y: 60, val: 65, rev: 38000 }
              ].map((pt, idx) => (
                <g key={idx} className="cursor-pointer group/node" onMouseEnter={() => setActiveChartPoint(idx)} onMouseLeave={() => setActiveChartPoint(null)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={activeChartPoint === idx ? 6 : 4}
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                  {activeChartPoint === idx && (
                    <foreignObject x={pt.x - 50} y={pt.y - 45} width="100" height="40" className="overflow-visible">
                      <div className="bg-neutral-900 border border-white/10 p-1.5 rounded text-center text-[9px] text-white shadow-xl backdrop-blur">
                        <p className="font-extrabold text-indigo-400">{pt.val} Apps</p>
                        <p className="text-emerald-400 font-mono">₹{pt.rev.toLocaleString()}</p>
                      </div>
                    </foreignObject>
                  )}
                </g>
              ))}
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between items-center px-[10px] pt-2 border-t border-white/5 text-[9px] font-mono text-gray-400">
              {weeklyTrend.map((t, idx) => (
                <span key={idx} className="w-[50px] text-center">{t.day}</span>
              ))}
            </div>
          </div>
        </div>

        {/* User Role Distribution (SVG Doughnut Pie Chart) */}
        <div className="glass p-5 rounded-3xl border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Demographic Breakdown</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Platform User Distribution by Role.</p>
          </div>

          <div className="flex justify-center items-center py-2 relative">
            <svg className="w-[120px] h-[120px] transform -rotate-90" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              
              {/* Dynamic Rings */}
              {roleDistribution.map((r, idx) => {
                const percent = (r.value / (totalUsers || 1)) * 100;
                const dashArray = `${percent} ${100 - percent}`;
                const dashOffset = 100 - cumulativePercent + 25; // start from top
                cumulativePercent += percent;

                return (
                  <circle
                    key={idx}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    className={`${r.color} transition-all duration-500`}
                    strokeWidth="3.5"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
            </svg>

            {/* Central Total Indicator */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 font-mono uppercase">Total</span>
              <span className="text-lg font-black text-white">{totalUsers}</span>
            </div>
          </div>

          {/* Legend indicators */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {roleDistribution.map((r, idx) => (
              <div key={idx} className="p-2 bg-neutral-950/20 border border-white/5 rounded-xl flex flex-col justify-between">
                <span className="text-gray-400 font-medium">{r.label}</span>
                <span className={`text-xs font-extrabold mt-1 ${r.text}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Platform activity heatmap & live log feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap (SVG platform peak hours) */}
        <div className="lg:col-span-2 glass p-5 rounded-3xl border border-white/5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Hiring Telemetry Heatmap</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Monitors API payload activity and interview streaming across peak business hours.</p>
          </div>

          <div className="space-y-2">
            {/* Hour labels header */}
            <div className="flex pl-10 text-[9px] font-mono text-gray-500 justify-between">
              {hoursLabel.map(h => <span key={h} className="w-12 text-center">{h}</span>)}
            </div>

            {/* Matrix row for each day */}
            <div className="space-y-1.5">
              {daysLabel.map((day, dIdx) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-8 font-mono text-[10px] text-gray-400">{day}</span>
                  <div className="flex-1 flex justify-between gap-1">
                    {heatValues[dIdx].map((val, hIdx) => {
                      // Color based on active load intensity
                      let bg = "bg-neutral-950/40 border-white/5";
                      if (val > 80) bg = "bg-indigo-600 shadow-sm shadow-indigo-600/30 border-indigo-400/25";
                      else if (val > 50) bg = "bg-indigo-700/60 border-indigo-500/20";
                      else if (val > 25) bg = "bg-indigo-900/30 border-indigo-500/10";

                      return (
                        <div
                          key={hIdx}
                          className={`flex-1 h-8 rounded-lg border transition-all hover:scale-105 duration-100 flex items-center justify-center text-[10px] text-white font-mono font-bold ${bg}`}
                          title={`${day} ${hoursLabel[hIdx]} • Platform active level: ${val}%`}
                        >
                          {val}%
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time System Audit feed */}
        <div className="glass p-5 rounded-3xl border border-white/5 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1">
              <Clock className="w-4 h-4 text-pink-400" />
              <span>Realtime Activity Ticker</span>
            </h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Real-time system events, registrations, and database operations.</p>
          </div>

          <div className="space-y-3 h-[180px] overflow-y-auto pr-1">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-neutral-950/35 border border-white/5 rounded-xl space-y-1 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-center">
                    <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                      log.action === "LOGIN" ? "bg-indigo-500/10 text-indigo-400" :
                      log.action === "APPROVAL" ? "bg-emerald-500/10 text-emerald-400" :
                      log.action === "AI_ACTION" ? "bg-purple-500/10 text-purple-400" :
                      "bg-pink-500/10 text-pink-400"
                    }`}>
                      {log.action}
                    </span>

                    <span className="text-[8px] font-mono text-gray-500">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-300 leading-normal">{log.description}</p>
                  
                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 pt-1 border-t border-white/5">
                    <span>by {log.userName}</span>
                    <span>{log.ipAddress}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-[10px] text-gray-500 italic">No recent system telemetry.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
