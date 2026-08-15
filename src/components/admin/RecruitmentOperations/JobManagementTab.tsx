import React, { useState, useMemo } from "react";
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  PauseCircle, 
  XCircle, 
  Download, 
  MapPin, 
  Building, 
  Users, 
  Clock, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { RecruitmentJob, RecruiterUser } from "../../../types/recruitment";
import { setJobStatus, exportJobsToExcel, createRecruitmentJob } from "../../../services/recruitmentService";

interface JobManagementTabProps {
  jobs: RecruitmentJob[];
  recruiters: RecruiterUser[];
  onOpenCreateJob: () => void;
  onOpenEditJob: (job: RecruitmentJob) => void;
  onFindMatchesForJob: (job: RecruitmentJob) => void;
  onRefresh: () => void;
  adminUser?: { name: string; email: string };
}

export default function JobManagementTab({
  jobs,
  recruiters,
  onOpenCreateJob,
  onOpenEditJob,
  onFindMatchesForJob,
  onRefresh,
  adminUser
}: JobManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [workModeFilter, setWorkModeFilter] = useState("ALL");
  const [industryFilter, setIndustryFilter] = useState("ALL");
  const [actionNotice, setActionNotice] = useState("");

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !term ||
        job.jobId.toLowerCase().includes(term) ||
        job.title.toLowerCase().includes(term) ||
        job.companyName.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term) ||
        job.skillsRequired.some((s) => s.toLowerCase().includes(term));

      const matchesStatus = 
        statusFilter === "ALL" || 
        (statusFilter === "Published" && (job.status === "Published" || job.status === "Live")) ||
        job.status === statusFilter;

      const matchesWorkMode = 
        workModeFilter === "ALL" || 
        job.workMode === workModeFilter;

      const matchesIndustry = 
        industryFilter === "ALL" || 
        job.industry === industryFilter;

      return matchesSearch && matchesStatus && matchesWorkMode && matchesIndustry;
    });
  }, [jobs, searchTerm, statusFilter, workModeFilter, industryFilter]);

  // Status toggle handler
  const handleToggleStatus = async (job: RecruitmentJob, newStatus: "Draft" | "Published" | "Paused" | "Closed") => {
    try {
      await setJobStatus(job.id, job.title, newStatus, adminUser);
      setActionNotice(`Status updated to ${newStatus.toUpperCase()} for ${job.jobId}`);
      setTimeout(() => setActionNotice(""), 3500);
      onRefresh();
    } catch (err) {
      console.error("Error setting job status:", err);
    }
  };

  // Duplicate Job
  const handleDuplicateJob = async (job: RecruitmentJob) => {
    try {
      await createRecruitmentJob({
        title: `${job.title} (Copy)`,
        companyName: job.companyName,
        industry: job.industry,
        department: job.department,
        employmentType: job.employmentType,
        workMode: job.workMode,
        location: job.location,
        city: job.city,
        minimumExperience: job.minimumExperience,
        maximumExperience: job.maximumExperience,
        highestQualification: job.highestQualification,
        minimumSalary: job.minimumSalary,
        maximumSalary: job.maximumSalary,
        salaryCurrency: job.salaryCurrency,
        salaryPeriod: job.salaryPeriod,
        salaryDisplay: job.salaryDisplay,
        openings: job.openings,
        skillsRequired: job.skillsRequired,
        description: job.description,
        responsibilities: job.responsibilities,
        benefits: job.benefits,
        status: "Draft",
        createdBy: adminUser?.name || "Super Admin",
        createdByRole: "Admin"
      }, adminUser);

      setActionNotice(`Duplicated job as draft. Generated new unique sequential Job ID.`);
      setTimeout(() => setActionNotice(""), 3500);
      onRefresh();
    } catch (err) {
      console.error("Error duplicating job:", err);
    }
  };

  const industriesList = Array.from(new Set(jobs.map((j) => j.industry).filter(Boolean)));

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Job Vacancies & Sourcing Pipeline</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                {filteredJobs.length} of {jobs.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Manage manual posts, automated sequential IDs, status lifecycles, and candidate matching.</p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => exportJobsToExcel(filteredJobs)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ({filteredJobs.length})</span>
          </button>

          <button
            onClick={onOpenCreateJob}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter & Search Matrix */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Job ID, title, company, skill..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Publication Statuses</option>
            <option value="Published">🟢 Published / Live</option>
            <option value="Draft">Draft</option>
            <option value="Paused">Paused</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Work Mode Filter */}
        <div>
          <select
            value={workModeFilter}
            onChange={(e) => setWorkModeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Work Modes</option>
            <option value="On-site">On-site</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Remote">Remote</option>
          </select>
        </div>

        {/* Industry Filter */}
        <div>
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Industries / Domains</option>
            {industriesList.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs List / Cards View */}
      <div className="space-y-3">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="p-5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg transition-all space-y-4 text-xs"
          >
            {/* Top Row: Job Title, ID, Status, Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-sm font-bold text-white tracking-tight">{job.title}</h3>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 text-[11px]">
                    {job.jobId}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    job.status === "Published" || job.status === "Live"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : job.status === "Paused"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}>
                    {job.status}
                  </span>
                </div>
                <p className="text-slate-400 flex items-center space-x-3">
                  <span className="font-medium text-slate-300 flex items-center"><Building className="w-3.5 h-3.5 mr-1 text-slate-500" /> {job.companyName}</span>
                  <span>•</span>
                  <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> {job.location} ({job.workMode})</span>
                  <span>•</span>
                  <span>{job.industry}</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onFindMatchesForJob(job)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-medium flex items-center space-x-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                  title="Find best matching candidates in database"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Match Candidates</span>
                </button>

                <button
                  onClick={() => onOpenEditJob(job)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                  title="Edit Job Posting"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDuplicateJob(job)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                  title="Duplicate as new draft job"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Status Switcher Dropdown */}
                <select
                  value={job.status}
                  onChange={(e) => handleToggleStatus(job, e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 focus:outline-none cursor-pointer text-[11px]"
                >
                  <option value="Published">Publish</option>
                  <option value="Paused">Pause</option>
                  <option value="Closed">Close</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>

            {/* Middle Grid: Metrics & Requirements */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Experience Range</span>
                <p className="text-slate-200 font-medium mt-0.5">{job.minimumExperience} - {job.maximumExperience} Years</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Compensation</span>
                <p className="text-slate-200 font-medium mt-0.5">{job.salaryDisplay || "Standard CTC"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Openings</span>
                <p className="text-slate-200 font-medium mt-0.5">{job.openings} Position{job.openings > 1 ? "s" : ""}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Assigned Recruiter</span>
                <p className="text-slate-200 font-medium mt-0.5 truncate">
                  {(job.assignedRecruiterNames && job.assignedRecruiterNames.length > 0) ? job.assignedRecruiterNames.join(", ") : "None Assigned"}
                </p>
              </div>
            </div>

            {/* Bottom Skills Pills & Description Snippet */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(job.skillsRequired || []).map((skill, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-800/90 text-blue-300 border border-slate-700/80 rounded-md text-[11px]">
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-slate-400 line-clamp-2 text-[11px]">{job.description}</p>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Job Vacancies Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No jobs matched your filter criteria. Try clearing search filters or click 'Post New Job'.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
