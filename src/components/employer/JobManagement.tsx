import { useState } from "react";
import { 
  Plus, Edit, Trash2, Copy, ToggleLeft, ToggleRight, Archive, CheckCircle, 
  Search, X, Briefcase, PlusCircle, Building, Users, Clock, HelpCircle, Save,
  Pause, Play
} from "lucide-react";
import { CompanyJob } from "./EmployerTypes";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useToast } from "../GlobalToast";
import PostJobForm from "../PostJobForm";

interface JobManagementProps {
  userId: string;
  companyName: string;
  jobs: CompanyJob[];
  onRefresh: () => void;
}

export default function JobManagement({
  userId,
  companyName,
  jobs,
  onRefresh
}: JobManagementProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Draft" | "Pending Approval" | "Approved" | "Live" | "Closed" | "Rejected">("All");

  // Form toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CompanyJob | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Technical");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [experience, setExperience] = useState("Mid-Level (2-5 Years)");
  const [education, setEducation] = useState("B.Tech / MCA or similar");
  const [location, setLocation] = useState("Bengaluru (Hybrid)");
  const [salary, setSalary] = useState("₹18,00,000 - ₹24,00,000 PA");
  const [benefits, setBenefits] = useState("Premium Health, Stock ESOPs, Macbook Pro");
  const [interviewProcess, setInterviewProcess] = useState("Technical Screening, Architecture Round, HR culture fit");
  const [openPositions, setOpenPositions] = useState(1);
  const [status, setStatus] = useState<"Draft" | "Pending Approval" | "Approved" | "Live" | "Closed" | "Rejected">("Draft");

  // Extended ATS fields states
  const [consultancy, setConsultancy] = useState("");
  const [industry, setIndustry] = useState("Software / IT");
  const [category, setCategory] = useState("Software Engineering");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [languages, setLanguages] = useState("English");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateForm = () => {
    setEditingJob(null);
    setTitle("");
    setDepartment("Technical");
    setDescription("");
    setRequiredSkills("");
    setExperience("Mid-Level (2-5 Years)");
    setEducation("B.Tech / MCA or similar");
    setLocation("Bengaluru (Hybrid)");
    setSalary("₹18,00,000 - ₹24,00,000 PA");
    setBenefits("Premium Health, Stock ESOPs, Macbook Pro");
    setInterviewProcess("Technical Screening, Architecture Round, HR culture fit");
    setOpenPositions(1);
    setStatus("Draft");
    setConsultancy("");
    setIndustry("Software / IT");
    setCategory("Software Engineering");
    setEmploymentType("Full-time");
    setWorkMode("Hybrid");
    setLanguages("English");
    setResponsibilities("");
    setRequirements("");
    setExpiryDate("");
    setIsFormOpen(true);
  };

  const openEditForm = (job: CompanyJob) => {
    setEditingJob(job);
    setTitle(job.title);
    setDepartment(job.department || "Technical");
    setDescription(job.description);
    setRequiredSkills(job.requiredSkills.join(", "));
    setExperience(job.experience);
    setEducation(job.education);
    setLocation(job.location);
    setSalary(job.salary);
    setBenefits(job.benefits);
    setInterviewProcess(job.interviewProcess.join(", "));
    setOpenPositions(job.openPositions);
    setStatus(job.status);
    setConsultancy(job.consultancy || "");
    setIndustry(job.industry || "Software / IT");
    setCategory(job.category || "Software Engineering");
    setEmploymentType(job.employmentType || "Full-time");
    setWorkMode(job.workMode || "Hybrid");
    setLanguages(job.languages?.join(", ") || "English");
    setResponsibilities(job.responsibilities || "");
    setRequirements(job.requirements || "");
    setExpiryDate(job.expiryDate || "");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Job title cannot be empty.", "warning");
      return;
    }

    // Verify authentication state before writing
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errMsg = "Authentication error: Active user session required to post or update a job vacancy.";
      console.error(errMsg);
      showToast(errMsg, "error");
      return;
    }

    setIsSubmitting(true);
    console.log("[JobManagement] Submitting job vacancy details...", { userId, title });

    try {
      const jobId = editingJob ? editingJob.id : `cjob_${Math.random().toString(36).substr(2, 9)}`;
      const skillsArray = requiredSkills.split(",").map(s => s.trim()).filter(Boolean);
      const processArray = interviewProcess.split(",").map(p => p.trim()).filter(Boolean);
      const languagesArray = languages.split(",").map(l => l.trim()).filter(Boolean);

      const jobObj: CompanyJob = {
        id: jobId,
        companyId: userId,
        companyName: companyName || "My Company",
        title,
        description,
        requiredSkills: skillsArray,
        experience,
        education,
        location,
        salary,
        benefits,
        interviewProcess: processArray,
        openPositions: Number(openPositions) || 1,
        status: status, // allows updating status directly from the select dropdown
        createdAt: editingJob ? editingJob.createdAt : new Date().toISOString(),
        department,
        consultancy,
        industry,
        category,
        employmentType,
        workMode,
        languages: languagesArray,
        responsibilities,
        requirements,
        expiryDate
      };

      // 1. Save to company_jobs
      await setDoc(doc(db, "company_jobs", jobId), jobObj);

      // 2. Sync to standard 'jobs' collection for candidate accessibility
      await setDoc(doc(db, "jobs", jobId), {
        id: jobId,
        employerId: userId,
        companyName: jobObj.companyName,
        title: jobObj.title,
        description: jobObj.description,
        location: jobObj.location,
        type: jobObj.employmentType || "Full-time",
        salary: jobObj.salary,
        skillsRequired: jobObj.requiredSkills,
        status: jobObj.status,
        createdAt: jobObj.createdAt,
        department: jobObj.department,
        experience: jobObj.experience,
        education: jobObj.education,
        benefits: jobObj.benefits,
        openings: jobObj.openPositions,
        // Sync new fields
        consultancy: jobObj.consultancy || "",
        industry: jobObj.industry || "",
        category: jobObj.category || "",
        employmentType: jobObj.employmentType || "Full-time",
        workMode: jobObj.workMode || "Hybrid",
        languages: jobObj.languages || [],
        responsibilities: jobObj.responsibilities || "",
        requirements: jobObj.requirements || "",
        expiryDate: jobObj.expiryDate || ""
      });

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "job",
        description: `Job ${editingJob ? "updated" : "published"}: "${title}" in ${department}.`,
        createdAt: new Date().toISOString()
      });

      showToast(`🎉 Job vacancy "${title}" saved successfully!`, "success");
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      const fbErrorCode = err?.code || "unknown-firestore-error";
      const fbErrorMessage = err?.message || String(err);
      console.error("[JobManagement] Error creating/updating job vacancy:", {
        code: fbErrorCode,
        message: fbErrorMessage,
        fullError: err
      });
      showToast(`Error saving job vacancy (${fbErrorCode}): ${fbErrorMessage}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (jobId: string, jobTitle: string) => {
    if (!confirm(`Are you absolutely sure you want to delete the job vacancy for: "${jobTitle}"? This is irreversible.`)) return;

    // Verify authentication state before writing
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errMsg = "Authentication error: Active user session required to delete a job.";
      console.error(errMsg);
      showToast(errMsg, "error");
      return;
    }

    try {
      console.log("[JobManagement] Initiating job deletion...", { jobId, jobTitle });
      await deleteDoc(doc(db, "company_jobs", jobId));
      await deleteDoc(doc(db, "jobs", jobId));

      // Log activity
      const activityId = "clog_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "company_activity_logs", activityId), {
        id: activityId,
        companyId: userId,
        type: "job",
        description: `Job deleted: "${jobTitle}".`,
        createdAt: new Date().toISOString()
      });

      showToast(`Vacancy "${jobTitle}" has been permanently deleted.`, "success");
      onRefresh();
    } catch (err: any) {
      const fbErrorCode = err?.code || "unknown-firestore-error";
      const fbErrorMessage = err?.message || String(err);
      console.error("[JobManagement] Error deleting job vacancy:", {
        code: fbErrorCode,
        message: fbErrorMessage,
        fullError: err
      });
      showToast(`Error deleting job vacancy (${fbErrorCode}): ${fbErrorMessage}`, "error");
    }
  };

  const handleDuplicate = async (job: CompanyJob) => {
    // Verify authentication state before writing
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errMsg = "Authentication error: Active user session required to duplicate a job.";
      console.error(errMsg);
      showToast(errMsg, "error");
      return;
    }

    try {
      console.log("[JobManagement] Initiating job duplication...", { sourceJobId: job.id });
      const jobId = `cjob_${Math.random().toString(36).substr(2, 9)}`;
      const duplicatedJob: CompanyJob = {
        ...job,
        id: jobId,
        title: `${job.title} (Copy)`,
        createdAt: new Date().toISOString(),
        status: "Draft"
      };

      await setDoc(doc(db, "company_jobs", jobId), duplicatedJob);

      // Sync standard jobs (close copy on seed until published)
      await setDoc(doc(db, "jobs", jobId), {
        id: jobId,
        employerId: userId,
        companyName: duplicatedJob.companyName,
        title: duplicatedJob.title,
        description: duplicatedJob.description,
        location: duplicatedJob.location,
        type: "Full-time",
        salary: duplicatedJob.salary,
        skillsRequired: duplicatedJob.requiredSkills,
        status: "closed",
        createdAt: duplicatedJob.createdAt,
        department: duplicatedJob.department,
        experience: duplicatedJob.experience,
        education: duplicatedJob.education,
        benefits: duplicatedJob.benefits,
        openings: duplicatedJob.openPositions
      });

      showToast(`🎉 Duplicated vacancy as draft: "${duplicatedJob.title}"!`, "success");
      onRefresh();
    } catch (err: any) {
      const fbErrorCode = err?.code || "unknown-firestore-error";
      const fbErrorMessage = err?.message || String(err);
      console.error("[JobManagement] Error duplicating job vacancy:", {
        code: fbErrorCode,
        message: fbErrorMessage,
        fullError: err
      });
      showToast(`Error duplicating job vacancy (${fbErrorCode}): ${fbErrorMessage}`, "error");
    }
  };

  const handleToggleStatus = async (job: CompanyJob, newStatus: "Draft" | "Pending Approval" | "Approved" | "Live" | "Closed" | "Rejected") => {
    // Verify authentication state before writing
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errMsg = "Authentication error: Active user session required to toggle hiring status.";
      console.error(errMsg);
      showToast(errMsg, "error");
      return;
    }

    try {
      console.log("[JobManagement] Initiating status toggle...", { jobId: job.id, newStatus });
      await setDoc(doc(db, "company_jobs", job.id), {
        ...job,
        status: newStatus
      }, { merge: true });

      await setDoc(doc(db, "jobs", job.id), {
        status: newStatus
      }, { merge: true });

      showToast(`Hiring status adjusted to: ${newStatus.toUpperCase()}`, "success");
      onRefresh();
    } catch (err: any) {
      const fbErrorCode = err?.code || "unknown-firestore-error";
      const fbErrorMessage = err?.message || String(err);
      console.error("[JobManagement] Error toggling job status:", {
        code: fbErrorCode,
        message: fbErrorMessage,
        fullError: err
      });
      showToast(`Error toggling job status (${fbErrorCode}): ${fbErrorMessage}`, "error");
    }
  };

  // Filter jobs list
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          job.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "All") return matchesSearch;
    return matchesSearch && job.status === filterStatus;
  });

  return (
    <div className="space-y-6" id="job-management-view">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Job Vacancies Management</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Build premium hiring pipelines, release openings, or archive placements.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          <span>Post a Premium Vacancy</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search vacancies by title, location, or department..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {(["All", "Draft", "Pending Approval", "Approved", "Live", "Closed", "Rejected"] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                filterStatus === st 
                  ? "bg-indigo-600 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Jobs Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredJobs.length > 0 ? (
          filteredJobs.map(job => (
            <div key={job.id} className="glass p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between hover:border-indigo-500/25 transition-all">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono font-bold uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {job.department || "Technical"}
                    </span>
                    <h4 className="font-extrabold text-sm text-white mt-1.5">{job.title}</h4>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{job.location} • {job.salary}</p>
                  </div>

                  <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                    job.status === "Live" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                    job.status === "Pending Approval" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                    job.status === "Draft" ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" :
                    job.status === "Approved" ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" :
                    job.status === "Closed" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                    "bg-gray-500/15 text-gray-400 border border-gray-500/20"
                  }`}>
                    {job.status}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">
                  {job.description}
                </p>

                {/* Requirements info */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-neutral-950/45 p-2.5 rounded-xl border border-white/5 font-mono text-gray-400">
                  <div>
                    Exp: <span className="text-white font-bold">{job.experience}</span>
                  </div>
                  <div>
                    Positions: <span className="text-white font-bold">{job.openPositions} Open</span>
                  </div>
                  <div>
                    Mode: <span className="text-indigo-300 font-bold">{job.workMode || "Hybrid"}</span>
                  </div>
                  <div>
                    Type: <span className="text-indigo-300 font-bold">{job.employmentType || "Full-time"}</span>
                  </div>
                  {job.consultancy && (
                    <div className="col-span-2 truncate">
                      Consultancy: <span className="text-purple-300 font-bold">{job.consultancy}</span>
                    </div>
                  )}
                  {job.expiryDate && (
                    <div className="col-span-2">
                      Expiry: <span className="text-red-300 font-bold">{job.expiryDate}</span>
                    </div>
                  )}
                  <div className="col-span-2 text-ellipsis overflow-hidden whitespace-nowrap">
                    Skills: <span className="text-indigo-300 font-bold">{job.requiredSkills.slice(0, 4).join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 pt-3 border-t border-white/5">
                <button
                  onClick={() => openEditForm(job)}
                  className="p-1.5 bg-white/5 hover:bg-indigo-600 hover:text-white text-gray-400 rounded-lg transition-all cursor-pointer"
                  title="Edit Vacancy"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(job)}
                  className="p-1.5 bg-white/5 hover:bg-purple-600 hover:text-white text-gray-400 rounded-lg transition-all cursor-pointer"
                  title="Duplicate Vacancy"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {job.status === "Draft" && (
                  <button
                    onClick={() => handleToggleStatus(job, "Pending Approval")}
                    className="flex-1 py-1.5 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Submit for Approval</span>
                  </button>
                )}

                {job.status === "Pending Approval" && (
                  <button
                    disabled
                    className="flex-1 py-1.5 bg-white/5 text-gray-500 text-[10px] font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-1 border border-white/5"
                  >
                    <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                    <span>Awaiting Admin Review</span>
                  </button>
                )}

                {job.status === "Approved" && (
                  <button
                    onClick={() => handleToggleStatus(job, "Live")}
                    className="flex-1 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Go Live</span>
                  </button>
                )}

                {job.status === "Live" && (
                  <button
                    onClick={() => handleToggleStatus(job, "Closed")}
                    className="flex-1 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Pause className="w-3 h-3" />
                    <span>Close Position</span>
                  </button>
                )}

                {(job.status === "Closed" || job.status === "Rejected") && (
                  <button
                    onClick={() => handleToggleStatus(job, "Pending Approval")}
                    className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-open Vacancy</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(job.id, job.title)}
                  className="p-1.5 bg-red-950/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer border border-red-900/15"
                  title="Delete permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 text-center py-16 text-xs text-gray-500 italic bg-white/5 rounded-2xl border border-white/5 space-y-2">
            <Briefcase className="w-8 h-8 text-gray-600 mx-auto" />
            <p>No job listings matched your selected criteria.</p>
          </div>
        )}
      </div>

      {/* Interactive Create/Edit Dialog Drawer Overlay */}
      {isFormOpen && !editingJob && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl">
            <PostJobForm
              userId={userId}
              userRole="recruiter"
              userName={companyName}
              onJobPosted={(jobId) => {
                setIsFormOpen(false);
                onRefresh();
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      )}

      {isFormOpen && editingJob && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0a0a0f] border-l border-white/10 p-6 h-full overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span>Edit Job Vacancy Profile</span>
                </h4>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="drawer-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Vacancy Job Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Lead Devops Architect"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Department Segment</label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Design">Design</option>
                      <option value="Product">Product Management</option>
                      <option value="HR">HR Recruitment</option>
                      <option value="Sales">Sales & Business</option>
                      <option value="Marketing">Growth Marketing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Salary Package Bracket *</label>
                    <input
                      type="text"
                      required
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      placeholder="e.g. ₹18L - ₹25L PA"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Geographic Location *</label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Bengaluru (Hybrid)"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Target Experience Tier *</label>
                    <input
                      type="text"
                      required
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      placeholder="e.g. 5-8 Years"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Target Education *</label>
                    <input
                      type="text"
                      required
                      value={education}
                      onChange={e => setEducation(e.target.value)}
                      placeholder="B.Tech, B.E or BSC Computer"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Work Mode *</label>
                    <select
                      value={workMode}
                      onChange={e => setWorkMode(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Employment Type *</label>
                    <select
                      value={employmentType}
                      onChange={e => setEmploymentType(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Industry Segment</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={e => setIndustry(e.target.value)}
                      placeholder="e.g. Fintech, Healthcare"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Job Category</label>
                    <input
                      type="text"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      placeholder="e.g. Backend Dev, Product Design"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Required Headcount Openings *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={openPositions}
                      onChange={e => setOpenPositions(Number(e.target.value) || 1)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Job Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="Live">Live</option>
                      <option value="Closed">Closed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-gray-400">Assigned Recruiter / Consultancy</label>
                    <input
                      type="text"
                      value={consultancy}
                      onChange={e => setConsultancy(e.target.value)}
                      placeholder="e.g. Apex Recruitment Partners"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-gray-400">Application Expiry Date</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Required Skills (Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={requiredSkills}
                    onChange={e => setRequiredSkills(e.target.value)}
                    placeholder="e.g. React, TypeScript, Tailwind, Figma"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Required Languages (Comma separated)</label>
                  <input
                    type="text"
                    value={languages}
                    onChange={e => setLanguages(e.target.value)}
                    placeholder="e.g. English, Hindi, German"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Benefits Portfolio</label>
                  <input
                    type="text"
                    value={benefits}
                    onChange={e => setBenefits(e.target.value)}
                    placeholder="e.g. Flexible PTO, Stock Equity, Health Insurance"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Interview Evaluation Process Flow (Comma separated)</label>
                  <input
                    type="text"
                    value={interviewProcess}
                    onChange={e => setInterviewProcess(e.target.value)}
                    placeholder="Screening Call, Tech Assessment, Executive Panel"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Key Roles & Responsibilities</label>
                  <textarea
                    value={responsibilities}
                    onChange={e => setResponsibilities(e.target.value)}
                    placeholder="Outline day-to-day responsibilities..."
                    className="w-full h-16 bg-neutral-900 border border-white/10 rounded-lg p-2 text-white resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Position Requirements</label>
                  <textarea
                    value={requirements}
                    onChange={e => setRequirements(e.target.value)}
                    placeholder="List required experience, coding knowledge, certifications..."
                    className="w-full h-16 bg-[#12121a] border border-white/10 rounded-lg p-2 text-white resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400">Detailed Job Description & Tech Requirements *</label>
                  <textarea
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Outline day-to-day operations, direct reporting lines, architecture, and framework details..."
                    className="w-full h-20 bg-neutral-900 border border-white/10 rounded-lg p-2 text-white resize-none"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-white/5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="drawer-form"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/15"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Syncing Workspace..." : "Confirm & Save Vacancy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
