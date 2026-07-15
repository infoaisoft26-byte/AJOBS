import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { TrendingUp, Users, Award, BarChart2 } from "lucide-react";

// Standard futuristic custom tooltips for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0b0b14]/95 border border-indigo-500/40 backdrop-blur-xl p-3.5 rounded-xl shadow-2xl font-mono text-[11px] text-gray-200 space-y-1">
        <p className="font-bold text-white border-b border-white/5 pb-1 mb-1.5">{label}</p>
        {payload.map((pld: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: pld.color || pld.fill }} 
            />
            <span>{pld.name}:</span>
            <span className="font-black text-indigo-300">{pld.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface AnalyticsProps {
  applications?: any[];
  candidatesCount?: number;
  jobsCount?: number;
}

export default function DashboardAnalyticsCharts({
  applications = [],
  candidatesCount = 42,
  jobsCount = 12,
}: AnalyticsProps) {
  
  // 1. Job Application Trends Data (Monthly counts)
  const trendsData = [
    { name: "Jan", Applications: 24, Interviews: 8, Offers: 2 },
    { name: "Feb", Applications: 38, Interviews: 12, Offers: 4 },
    { name: "Mar", Applications: 65, Interviews: 18, Offers: 7 },
    { name: "Apr", Applications: 52, Interviews: 20, Offers: 6 },
    { name: "May", Applications: 84, Interviews: 32, Offers: 12 },
    { name: "Jun", Applications: 110, Interviews: 45, Offers: 18 },
    { name: "Jul", Applications: 135, Interviews: 58, Offers: 22 },
  ];

  // 2. Conversion Rates per Job Stage Data
  const stageData = [
    { name: "1. Applied", candidates: 150, rate: 100, fill: "rgba(99, 102, 241, 0.7)" },
    { name: "2. Shortlisted", candidates: 98, rate: 65, fill: "rgba(168, 85, 247, 0.7)" },
    { name: "3. Interviewing", candidates: 45, rate: 30, fill: "rgba(236, 72, 153, 0.7)" },
    { name: "4. Offered", candidates: 18, rate: 12, fill: "rgba(16, 185, 129, 0.7)" },
  ];

  // 3. Weekly Candidate Growth Data
  const weeklyGrowthData = [
    { week: "Week 1", Signups: 14, Active: 8 },
    { week: "Week 2", Signups: 22, Active: 15 },
    { week: "Week 3", Signups: 19, Active: 12 },
    { week: "Week 4", Signups: 35, Active: 28 },
    { week: "Week 5", Signups: 42, Active: 36 },
  ];

  return (
    <div className="space-y-6" id="dashboard-recharts-analytics-section">
      <div className="flex items-center space-x-2 border-b border-white/5 pb-2.5">
        <BarChart2 className="w-5 h-5 text-indigo-400" />
        <h4 className="font-display font-bold text-sm text-white tracking-wider uppercase">
          AI Hiring Pipeline Diagnostics & Diagnostics Charts
        </h4>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Job Application Trends */}
        <div className="glass p-5 rounded-2xl border border-white/5 bg-[#07070c]/50 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>Job Application Trends</span>
              </h5>
              <p className="text-[10px] text-gray-400">Monthly breakdown of aggregate candidates, interviews & offers released</p>
            </div>
            <span className="text-[9px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Year-to-Date
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(168, 85, 247)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="rgb(168, 85, 247)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Applications" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorApplications)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Interviews" 
                  stroke="#a855f7" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorInterviews)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Conversion Rates per Stage */}
        <div className="glass p-5 rounded-2xl border border-white/5 bg-[#07070c]/50 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Hiring Funnel Conversion Rates</span>
              </h5>
              <p className="text-[10px] text-gray-400">Diagnostic volume dropoff and conversion rate indexed to Applied stage</p>
            </div>
            <span className="text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Real-Time
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="square"
                  wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}
                />
                <Bar dataKey="candidates" name="Candidate Count" radius={[6, 6, 0, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Bar dataKey="rate" name="Conversion Rate (%)" fill="rgba(255,255,255,0.15)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Weekly Candidate Growth */}
        <div className="glass lg:col-span-2 p-5 rounded-2xl border border-white/5 bg-[#07070c]/50 space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <h5 className="text-xs font-bold text-white flex items-center space-x-1.5 font-mono">
                <Users className="w-4 h-4 text-pink-400" />
                <span>Weekly Registrations & Active Users Growth</span>
              </h5>
              <p className="text-[10px] text-gray-400">Weekly tracker of user signups matched with system platform operations activity</p>
            </div>
            <span className="text-[9px] font-mono bg-pink-500/15 text-pink-300 border border-pink-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Latest 5 Weeks
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyGrowthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="week" 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                  fontFamily="monospace"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={32} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}
                />
                <Bar dataKey="Signups" name="New Accounts Signups" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={35} />
                <Bar dataKey="Active" name="Weekly Engaged Users" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
