import { useState } from "react";
import { 
  BarChart2, FileSpreadsheet, Download, FileText, Printer, CheckCircle, 
  HelpCircle, Calendar, Briefcase, TrendingUp, Sparkles, Building
} from "lucide-react";
import { CompanyJob, CompanyApplication, CompanyInterview, CompanyOffer } from "./EmployerTypes";

interface ReportsAnalyticsProps {
  jobs: CompanyJob[];
  applications: CompanyApplication[];
  interviews: CompanyInterview[];
  offers: CompanyOffer[];
}

export default function ReportsAnalytics({
  jobs,
  applications,
  interviews,
  offers
}: ReportsAnalyticsProps) {
  const [activeReportTab, setActiveReportTab] = useState<"hiring" | "interview" | "recruiter" | "department">("hiring");

  // Dynamic exports helpers
  const handleExportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeReportTab === "hiring") {
      csvContent += "Candidate Name,Job Title,ATS Score,Pipeline Stage,Applied Date\n";
      applications.forEach(a => {
        csvContent += `"${a.candidateName}","${a.jobTitle}",${a.resumeScore || 0},"${a.status}","${new Date(a.appliedAt).toLocaleDateString()}"\n`;
      });
    } else if (activeReportTab === "interview") {
      csvContent += "Candidate Name,Job Title,Interviewer,Date,Status,Score,Feedback\n";
      interviews.forEach(i => {
        csvContent += `"${i.candidateName}","${i.jobTitle}","${i.interviewer}","${i.date}","${i.status}",${i.score || 0},"${i.feedback?.replace(/"/g, '""') || ""}"\n`;
      });
    } else if (activeReportTab === "recruiter") {
      csvContent += "Recruiter Name,Role,Hiring Stage,Date Logged\n";
      csvContent += `"Ananya S","Lead Recruiter","Corporate Registration","${new Date().toLocaleDateString()}"\n`;
      csvContent += `"Preeti Nair","HR Coordinator","Hiring Process Pipeline","${new Date().toLocaleDateString()}"\n`;
    } else {
      csvContent += "Department Name,Open Roles,Applications,Offers Released\n";
      const depts = ["Technical", "Design", "Product", "HR", "Sales"];
      depts.forEach(d => {
        const dJobs = jobs.filter(j => (j.department || "Technical") === d);
        const jIds = dJobs.map(j => j.id);
        const dApps = applications.filter(a => jIds.includes(a.jobId)).length;
        const dOffs = offers.filter(o => jIds.includes(o.jobId)).length;
        csvContent += `"${d}",${dJobs.length},${dApps},${dOffs}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Acme_Global_CRM_${activeReportTab}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`CSV Excel Report exported successfully for ${activeReportTab}!`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="CRM-reports-view">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <span>Recruiting Metrics & Analytics Reports</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Audit comprehensive hiring reports, interview histories, department statistics, and recruiter action trails.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl text-xs text-gray-300 font-bold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Export CSV Excel</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/15 hover:border-indigo-500/25 text-indigo-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Reports Tabs Row */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
        {[
          { id: "hiring", label: "Hiring Report" },
          { id: "interview", label: "Interview Report" },
          { id: "recruiter", label: "Recruiter Audit" },
          { id: "department", label: "Department Distribution" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveReportTab(t.id as any)}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeReportTab === t.id 
                ? "bg-indigo-600 text-white" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid distribution based on chosen report */}
      <div className="glass p-5 rounded-2xl border border-white/5 space-y-6">
        
        {activeReportTab === "hiring" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-extrabold text-sm text-white">Full Hiring Pipeline Log</h4>
              <span className="text-[10px] text-gray-500 font-mono">Synced • Real-time</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-mono">
                    <th className="pb-3 font-normal">Candidate Name</th>
                    <th className="pb-3 font-normal">Target Job Opening</th>
                    <th className="pb-3 font-normal">ATS Resume Match</th>
                    <th className="pb-3 font-normal">Current Pipeline Stage</th>
                    <th className="pb-3 font-normal">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold text-white">{app.candidateName}</td>
                      <td className="py-3">{app.jobTitle}</td>
                      <td className="py-3 font-mono text-indigo-400">{app.resumeScore || 70}/100</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-mono text-[9px] font-bold">
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{new Date(app.appliedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReportTab === "interview" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-extrabold text-sm text-white">Interviewer Feedback Audit Matrix</h4>
              <span className="text-[10px] text-gray-500 font-mono">Scheduled & Completed Slots</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-mono">
                    <th className="pb-3 font-normal">Candidate</th>
                    <th className="pb-3 font-normal">Position</th>
                    <th className="pb-3 font-normal">Interviewer</th>
                    <th className="pb-3 font-normal">Date</th>
                    <th className="pb-3 font-normal">Status</th>
                    <th className="pb-3 font-normal">Evaluation Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {interviews.map((int) => (
                    <tr key={int.id} className="hover:bg-white/5">
                      <td className="py-3 font-bold text-white">{int.candidateName}</td>
                      <td className="py-3">{int.jobTitle}</td>
                      <td className="py-3">{int.interviewer}</td>
                      <td className="py-3 font-mono">{int.date}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold ${
                          int.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {int.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-extrabold text-pink-400">{int.score ? `${int.score}/100` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReportTab === "recruiter" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-extrabold text-sm text-white">Recruitment Agency Sourcing Trails</h4>
              <span className="text-[10px] text-gray-500 font-mono">Coordinator performance index</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-mono">
                    <th className="pb-3 font-normal">Sourcing Officer</th>
                    <th className="pb-3 font-normal">Title Authority</th>
                    <th className="pb-3 font-normal">Allocated Workspaces</th>
                    <th className="pb-3 font-normal">Action Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  <tr className="hover:bg-white/5">
                    <td className="py-3 font-bold text-white">Preeti Nair</td>
                    <td className="py-3 font-mono">HR Coordinator</td>
                    <td className="py-3">Acme Global Sourcing Unit</td>
                    <td className="py-3 font-mono">{new Date().toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="py-3 font-bold text-white">Ananya HR</td>
                    <td className="py-3 font-mono">Recruitment Manager</td>
                    <td className="py-3">Acme Executive approvals</td>
                    <td className="py-3 font-mono">{new Date().toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeReportTab === "department" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="font-extrabold text-sm text-white">Department Metric Distributions</h4>
              <span className="text-[10px] text-gray-500 font-mono">Vacancy, Sourcing, and Offer breakdown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {["Technical", "Design", "Product", "HR", "Sales"].map((dept) => {
                const deptJobs = jobs.filter(j => (j.department || "Technical") === dept);
                const jobIds = deptJobs.map(j => j.id);
                const deptApps = applications.filter(a => jobIds.includes(a.jobId)).length;
                const deptOffers = offers.filter(o => jobIds.includes(o.jobId)).length;

                return (
                  <div key={dept} className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-extrabold text-sm text-white">{dept}</h5>
                      <Building className="w-4 h-4 text-indigo-400" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] text-gray-400">
                      <div className="bg-neutral-950/45 p-1.5 rounded border border-white/5">
                        <span className="text-white font-bold block text-xs">{deptJobs.length}</span>
                        Roles
                      </div>
                      <div className="bg-neutral-950/45 p-1.5 rounded border border-white/5">
                        <span className="text-indigo-400 font-bold block text-xs">{deptApps}</span>
                        Apps
                      </div>
                      <div className="bg-neutral-950/45 p-1.5 rounded border border-white/5">
                        <span className="text-emerald-400 font-bold block text-xs">{deptOffers}</span>
                        Offers
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
