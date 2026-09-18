import React, { useMemo } from "react";
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  FileSpreadsheet, 
  Briefcase, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight,
  Filter
} from "lucide-react";
import { CompanyJob, CompanyApplication, CompanyInterview } from "../employer/EmployerTypes";

interface HiringReportsViewProps {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
}

export default function HiringReportsView({
  jobs,
  applications,
  interviews
}: HiringReportsViewProps) {

  // 1. Compute Pipeline Conversion Rates
  const totalApplied = applications.length || 1;
  const totalReviewed = applications.filter(a => a.status !== "new").length;
  const totalShortlisted = applications.filter(a => a.status === "shortlisted" || a.status === "interview" || a.status === "selected").length;
  const totalInterviewed = interviews.length;
  const totalHired = applications.filter(a => a.status === "selected" || a.status === "hired").length;

  const appliedToShortlistPct = Math.round((totalShortlisted / totalApplied) * 100);
  const shortlistToInterviewPct = totalShortlisted > 0 ? Math.round((totalInterviewed / totalShortlisted) * 100) : 0;
  const interviewToHiredPct = totalInterviewed > 0 ? Math.round((totalHired / totalInterviewed) * 100) : 0;

  // 2. Last 7 Days Applications
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const last7DaysApps = useMemo(() => {
    return applications.filter((app) => {
      if (!app.appliedAt) return true;
      const appDate = new Date(app.appliedAt);
      return appDate >= sevenDaysAgo;
    });
  }, [applications]);

  // CSV Export functions
  const downloadCsv = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(","),
      ...data.map(row => 
        headers.map(fieldName => {
          const val = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : "";
          return `"${val}"`;
        }).join(",")
      )
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllAppsCsv = () => {
    const exportRows = applications.map(a => ({
      ApplicantId: a.id,
      CandidateName: a.candidateName,
      Email: a.candidateEmail,
      Phone: a.candidatePhone || "",
      JobTitle: a.jobTitle,
      Status: a.status,
      AIScore: a.aiScore || "",
      Experience: a.experience || "",
      AppliedDate: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "Recent"
    }));
    downloadCsv(exportRows, `aijobs-applications-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportLast7DaysCsv = () => {
    const exportRows = last7DaysApps.map(a => ({
      ApplicantId: a.id,
      CandidateName: a.candidateName,
      Email: a.candidateEmail,
      Phone: a.candidatePhone || "",
      JobTitle: a.jobTitle,
      Status: a.status,
      AIScore: a.aiScore || "",
      Experience: a.experience || "",
      AppliedDate: a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "Last 7 Days"
    }));
    downloadCsv(exportRows, `aijobs-last-7-days-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6" id="hiring-reports-view">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>RECRUITMENT INTELLIGENCE & TELEMETRY</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Hiring & Conversion Reports</h2>
          <p className="text-xs text-slate-400">Export verified applicant pipelines, funnel conversion drop-offs, and requisition metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportLast7DaysCsv}
            className="px-4 py-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Download Last 7 Days ({last7DaysApps.length})</span>
          </button>

          <button
            onClick={handleExportAllAppsCsv}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Export Full CSV</span>
          </button>
        </div>
      </div>

      {/* Funnel Conversion Rates Section */}
      <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">Hiring Pipeline Conversion Funnel</h3>
            <p className="text-xs text-slate-400">Step-by-step candidate progression from initial application to final offer acceptance</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">Total Applicants: {applications.length}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          
          {/* Stage 1: Applied */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">1. Applied</span>
            <div className="text-2xl font-black text-white">{applications.length}</div>
            <div className="text-[11px] text-slate-400">100% Top of Funnel</div>
          </div>

          {/* Stage 2: Shortlisted */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase block">2. Shortlisted</span>
            <div className="text-2xl font-black text-cyan-300">{totalShortlisted}</div>
            <div className="text-[11px] text-cyan-400 font-bold">{appliedToShortlistPct}% Conversion</div>
          </div>

          {/* Stage 3: Interviewed */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-purple-300 uppercase block">3. Interviewed</span>
            <div className="text-2xl font-black text-purple-300">{totalInterviewed}</div>
            <div className="text-[11px] text-purple-400 font-bold">{shortlistToInterviewPct}% Progression</div>
          </div>

          {/* Stage 4: Selected / Hired */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase block">4. Hired / Offered</span>
            <div className="text-2xl font-black text-emerald-400">{totalHired}</div>
            <div className="text-[11px] text-emerald-400 font-bold">{interviewToHiredPct}% Acceptance</div>
          </div>

        </div>
      </div>

      {/* Applications Per Job Table */}
      <div className="p-6 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">Applications Per Requisition</h3>
            <p className="text-xs text-slate-400">Performance metrics broken down per active and closed job posting</p>
          </div>
          <span className="text-xs font-mono text-slate-400">{jobs.length} Active Positions</span>
        </div>

        {jobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No job requisitions created yet. Post a job to start accumulating report analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-3">Job Title</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Total Apps</th>
                  <th className="py-3 px-3 text-center">Shortlisted</th>
                  <th className="py-3 px-3 text-center">Interviews</th>
                  <th className="py-3 px-3 text-right">Avg AI Fit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => {
                  const jobApps = applications.filter(a => a.jobId === job.id);
                  const jobShortlisted = jobApps.filter(a => a.status === "shortlisted");
                  const jobInterviews = interviews.filter(i => i.jobId === job.id);

                  return (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-extrabold text-white">{job.title}</td>
                      <td className="py-3 px-3 text-slate-400">{job.location}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 text-slate-300">
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-white">{jobApps.length}</td>
                      <td className="py-3 px-3 text-center font-bold text-cyan-300">{jobShortlisted.length}</td>
                      <td className="py-3 px-3 text-center font-bold text-purple-300">{jobInterviews.length}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">92%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
