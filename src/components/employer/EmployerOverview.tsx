import React, { useState } from "react";
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Calendar, 
  Sparkles, 
  PlusCircle, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  Eye, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  ShieldCheck, 
  ChevronRight, 
  UserPlus, 
  Share2, 
  FileText,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import EmployerStatCard from "./EmployerStatCard";
import { CompanyJob, CompanyApplication, CompanyInterview } from "./EmployerTypes";

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
  onViewCandidate,
  onOpenLiveChat
}: EmployerOverviewProps) {
  const [showSampleData, setShowSampleData] = useState(false);

  // Compute live stats
  const activeJobsCount = jobs.filter(j => j.status === "active" || j.status === "open").length || (jobs.length > 0 ? jobs.length : 0);
  const totalAppsCount = applications.length;
  const shortlistedCount = applications.filter(a => a.status === "shortlisted" || a.status === "interview").length;
  const interviewsThisWeekCount = interviews.length;

  // Realistic sample data if database is fresh
  const sampleApplications: CompanyApplication[] = [
    {
      id: "samp_app_1",
      jobId: "job_1",
      jobTitle: "Senior React & TypeScript Engineer",
      candidateId: "cand_1",
      candidateName: "Aarav Sharma",
      candidateEmail: "aarav.sharma@example.com",
      candidatePhone: "+91 98765 43210",
      candidateExperience: "4.5 Years",
      candidateSkills: ["React", "TypeScript", "Next.js", "Node.js", "Tailwind CSS"],
      status: "shortlisted",
      aiMatchScore: 96,
      appliedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      matchBreakdown: {
        skillsMatch: 98,
        experienceMatch: 95,
        locationMatch: 94,
        cultureFit: 96
      }
    },
    {
      id: "samp_app_2",
      jobId: "job_2",
      jobTitle: "Full Stack Node.js Developer",
      candidateId: "cand_2",
      candidateName: "Pooja Patel",
      candidateEmail: "pooja.patel@example.com",
      candidatePhone: "+91 91234 56789",
      candidateExperience: "3.2 Years",
      candidateSkills: ["Node.js", "PostgreSQL", "Express", "Docker", "Redis"],
      status: "new",
      aiMatchScore: 92,
      appliedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      matchBreakdown: {
        skillsMatch: 92,
        experienceMatch: 90,
        locationMatch: 100,
        cultureFit: 88
      }
    },
    {
      id: "samp_app_3",
      jobId: "job_1",
      jobTitle: "Senior React & TypeScript Engineer",
      candidateId: "cand_3",
      candidateName: "Vikram Malhotra",
      candidateEmail: "vikram.m@example.com",
      candidatePhone: "+91 99887 76655",
      candidateExperience: "5.0 Years",
      candidateSkills: ["React Native", "TypeScript", "Redux", "GraphQL"],
      status: "interview",
      aiMatchScore: 89,
      appliedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      matchBreakdown: {
        skillsMatch: 88,
        experienceMatch: 92,
        locationMatch: 85,
        cultureFit: 90
      }
    },
    {
      id: "samp_app_4",
      jobId: "job_3",
      jobTitle: "AI Prompt & ML Engineer",
      candidateId: "cand_4",
      candidateName: "Ananya Iyer",
      candidateEmail: "ananya.iyer@example.com",
      candidatePhone: "+91 97766 55443",
      candidateExperience: "2.8 Years",
      candidateSkills: ["Python", "PyTorch", "Gemini API", "FastAPI", "Vector DB"],
      status: "reviewed",
      aiMatchScore: 94,
      appliedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      matchBreakdown: {
        skillsMatch: 96,
        experienceMatch: 91,
        locationMatch: 95,
        cultureFit: 94
      }
    }
  ];

  const displayApplications = applications.length > 0 ? applications : (showSampleData ? sampleApplications : []);
  const topAiMatches = [
    {
      id: "top_match_1",
      name: "Rohan Mukherjee",
      role: "Lead Full Stack Architect",
      skills: ["React", "TypeScript", "System Design", "AWS", "Kafka"],
      score: 97,
      exp: "6+ Years",
      location: "Bengaluru (Hybrid)",
      availableIn: "15 Days"
    },
    {
      id: "top_match_2",
      name: "Sneha Deshmukh",
      role: "Senior Frontend Engineer",
      skills: ["React", "Next.js", "Tailwind", "Design Systems"],
      score: 93,
      exp: "4 Years",
      location: "Pune / Remote",
      availableIn: "Immediate"
    },
    {
      id: "top_match_3",
      name: "Aditya Verma",
      role: "Backend & Cloud Engineer",
      skills: ["Node.js", "Golang", "Kubernetes", "PostgreSQL"],
      score: 89,
      exp: "3.5 Years",
      location: "Hyderabad",
      availableIn: "30 Days"
    }
  ];

  // 7-day trend mock data
  const trendDays = [
    { day: "Mon", count: 12, height: "45%" },
    { day: "Tue", count: 19, height: "70%" },
    { day: "Wed", count: 15, height: "55%" },
    { day: "Thu", count: 26, height: "92%" },
    { day: "Fri", count: 22, height: "80%" },
    { day: "Sat", count: 8, height: "30%" },
    { day: "Sun", count: 14, height: "50%" },
  ];

  return (
    <div className="space-y-6" id="employer-overview-page">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#17111F] via-[#392742]/70 to-[#17111F] border border-purple-500/20 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AIJOBS ENTERPRISE SUITE • {companyName || "Verified Employer"}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Hire top talent faster with <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">AIJOBS</span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Post jobs, discover AI-matched candidates and manage hiring from one place.
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              id="employer-hero-post-job"
              onClick={() => onNavigateTab("post-job")}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>Post a Job</span>
            </button>
            <button
              id="employer-hero-search-candidates"
              onClick={() => onNavigateTab("candidate-search")}
              className="px-5 py-3 rounded-2xl bg-[#2563EB]/20 hover:bg-[#2563EB]/30 border border-[#2563EB]/40 text-blue-300 font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md"
            >
              <Search className="w-4 h-4 text-blue-400" />
              <span>Search Candidates</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Statistics Cards using reusable EmployerStatCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="employer-overview-stat-cards">
        <EmployerStatCard
          id="stat-card-active-jobs"
          title="Active Jobs"
          value={activeJobsCount}
          icon={Briefcase}
          trendText="Live on AIJOBS portal"
          trendType="positive"
          accentColor="blue"
          onClick={() => onNavigateTab("my-jobs")}
        />

        <EmployerStatCard
          id="stat-card-total-apps"
          title="Total Applications"
          value={totalAppsCount || (showSampleData ? 24 : 0)}
          icon={Users}
          trendText="AI Scored & Filtered"
          trendType="highlight"
          accentColor="cyan"
          onClick={() => onNavigateTab("applications")}
        />

        <EmployerStatCard
          id="stat-card-shortlisted"
          title="Shortlisted Candidates"
          value={shortlistedCount || (showSampleData ? 8 : 0)}
          icon={UserCheck}
          trendText="85%+ AI Match Score"
          trendType="positive"
          accentColor="purple"
          onClick={() => onNavigateTab("applications")}
        />

        <EmployerStatCard
          id="stat-card-interviews"
          title="Interviews This Week"
          value={interviewsThisWeekCount || (showSampleData ? 5 : 0)}
          icon={Calendar}
          trendText="Scheduled rounds"
          trendType="positive"
          accentColor="emerald"
          onClick={() => onNavigateTab("interviews")}
        />
      </div>

      {/* Main Grid: Application Trend & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 7-Day Application Trend Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Application Velocity & Sourcing Trend</span>
              </h3>
              <p className="text-xs text-slate-400">Incoming candidate applications over the last 7 days</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-mono text-blue-300">
              <span>+34% vs last week</span>
            </div>
          </div>

          {/* Visual 7-day Bar Trend */}
          <div className="h-44 pt-4 flex items-end justify-between gap-3 px-2 border-b border-purple-500/10">
            {trendDays.map((item) => (
              <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.count}
                </div>
                <div className="w-full max-w-[44px] bg-gradient-to-t from-blue-600/40 via-cyan-500/60 to-cyan-400 rounded-t-xl group-hover:to-emerald-400 transition-all duration-300 relative overflow-hidden"
                  style={{ height: item.height }}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-xs font-semibold text-slate-400">{item.day}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Direct Applications
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> AI Matched Sourcing
            </span>
            <button 
              onClick={() => onNavigateTab("applications")}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View detailed pipeline</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Actions & Team Card (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Quick Actions</span>
          </h3>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigateTab("post-job")}
              className="w-full p-3 rounded-2xl bg-[#392742]/40 hover:bg-[#392742]/70 border border-purple-500/30 text-left flex items-center justify-between gap-3 group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Post a New Job</h4>
                  <p className="text-[11px] text-slate-400">Multi-step structured posting</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigateTab("candidate-search")}
              className="w-full p-3 rounded-2xl bg-[#392742]/40 hover:bg-[#392742]/70 border border-purple-500/30 text-left flex items-center justify-between gap-3 group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">Search Candidate Pool</h4>
                  <p className="text-[11px] text-slate-400">Filtered by verified skills</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={() => onNavigateTab("interviews")}
              className="w-full p-3 rounded-2xl bg-[#392742]/40 hover:bg-[#392742]/70 border border-purple-500/30 text-left flex items-center justify-between gap-3 group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Schedule Interview</h4>
                  <p className="text-[11px] text-slate-400">Send invite with meet link</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="pt-2 border-t border-purple-500/15 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Hiring Team: 1 Admin</span>
            <button 
              onClick={() => onNavigateTab("company-profile")}
              className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
            >
              Manage Profile
            </button>
          </div>
        </div>
      </div>

      {/* Top AI Matches Card (85%–98% Score) */}
      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Top AI Recommended Candidates (85%–98% Compatibility)</span>
            </h3>
            <p className="text-xs text-slate-400">Pre-screened against your active job technical requirements</p>
          </div>
          <button 
            onClick={() => onNavigateTab("ai-shortlist")}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View all AI recommendations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topAiMatches.map((cand) => (
            <div 
              key={cand.id}
              className="p-4 rounded-2xl bg-[#392742]/30 hover:bg-[#392742]/60 border border-purple-500/30 transition-all space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                    {cand.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{cand.name}</h4>
                    <p className="text-[11px] text-slate-400">{cand.role}</p>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold shrink-0">
                  {cand.score}% AI Match
                </div>
              </div>

              {/* Candidate Info Chips */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/5">{cand.exp}</span>
                <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/5">{cand.location}</span>
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">{cand.availableIn}</span>
              </div>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1">
                {cand.skills.map((sk) => (
                  <span key={sk} className="px-2 py-0.5 rounded-md bg-[#17111F] text-slate-300 text-[10px] font-mono border border-purple-500/20">
                    {sk}
                  </span>
                ))}
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 border-t border-purple-500/15 flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab("candidate-search")}
                  className="flex-1 py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  View Profile
                </button>
                <button
                  onClick={() => onNavigateTab("applications")}
                  className="py-1.5 px-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Shortlist
                </button>
                <button
                  onClick={() => onOpenLiveChat && onOpenLiveChat(cand.id, cand.name)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all cursor-pointer"
                  title="Message candidate"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Recent Candidate Applications</span>
            </h3>
            <p className="text-xs text-slate-400">Direct applicant feed for your open positions</p>
          </div>

          <div className="flex items-center gap-2">
            {applications.length === 0 && (
              <button
                onClick={() => setShowSampleData(!showSampleData)}
                className="text-xs px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold cursor-pointer hover:bg-purple-500/20 transition-all"
              >
                {showSampleData ? "Hide Sample Data" : "Preview Sample Applicants"}
              </button>
            )}
            <button 
              onClick={() => onNavigateTab("applications")}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View all applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {displayApplications.length === 0 ? (
          /* Clean Premium Empty State */
          <div className="p-10 text-center rounded-2xl bg-[#392742]/20 border border-dashed border-purple-500/30 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">No applications received yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Post your job openings to start receiving AI-matched applicants from across India.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => onNavigateTab("post-job")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Post Your First Job
              </button>
              <button
                onClick={() => setShowSampleData(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                Preview Sample Data
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-purple-500/20 text-[11px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="pb-3 font-semibold">Candidate</th>
                  <th className="pb-3 font-semibold">Applied Role</th>
                  <th className="pb-3 font-semibold">Experience</th>
                  <th className="pb-3 font-semibold">AI Match Score</th>
                  <th className="pb-3 font-semibold">Applied Date</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/10">
                {displayApplications.slice(0, 6).map((app) => (
                  <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          {app.candidateName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-300 transition-colors">
                            {app.candidateName}
                          </div>
                          <div className="text-[11px] text-slate-400">{app.candidateEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-slate-200">
                      {app.jobTitle}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-slate-300">
                      {app.candidateExperience || "3+ Yrs"}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                        (app.aiMatchScore || 85) >= 90 
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                          : "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        {app.aiMatchScore || 85}%
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-slate-400 font-mono text-[11px]">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                        app.status === "shortlisted" 
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : app.status === "interview"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : app.status === "reviewed"
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : app.status === "rejected"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}>
                        {app.status || "New"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onViewCandidate(app)}
                        className="px-3 py-1 bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-500/40 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
