import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, 
  Briefcase, 
  Building, 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { RecruitmentJob, RecruiterUser } from "../../../types/recruitment";
import { createRecruitmentJob, updateRecruitmentJob } from "../../../services/recruitmentService";

interface CreateJobModalProps {
  jobToEdit?: RecruitmentJob | null;
  recruiters: RecruiterUser[];
  onClose: () => void;
  onSuccess: (job: RecruitmentJob) => void;
  adminUser?: { name: string; email: string };
}

export default function CreateJobModal({
  jobToEdit,
  recruiters,
  onClose,
  onSuccess,
  adminUser
}: CreateJobModalProps) {
  const isEditing = Boolean(jobToEdit);

  const [title, setTitle] = useState(jobToEdit?.title || "");
  const [companyName, setCompanyName] = useState(jobToEdit?.companyName || "AIJobs Partner");
  const [industry, setIndustry] = useState(jobToEdit?.industry || "Information Technology");
  const [department, setDepartment] = useState(jobToEdit?.department || "Software Engineering");
  const [employmentType, setEmploymentType] = useState(jobToEdit?.employmentType || "Full-time");
  const [workMode, setWorkMode] = useState(jobToEdit?.workMode || "Hybrid");
  const [location, setLocation] = useState(jobToEdit?.location || "Bengaluru, Karnataka");
  const [minimumExperience, setMinimumExperience] = useState<number>(jobToEdit?.minimumExperience ?? 2);
  const [maximumExperience, setMaximumExperience] = useState<number>(jobToEdit?.maximumExperience ?? 5);
  const [highestQualification, setHighestQualification] = useState(jobToEdit?.highestQualification || "Bachelor's Degree");
  const [minimumSalary, setMinimumSalary] = useState<number>(jobToEdit?.minimumSalary ?? 800000);
  const [maximumSalary, setMaximumSalary] = useState<number>(jobToEdit?.maximumSalary ?? 1600000);
  const [salaryCurrency, setSalaryCurrency] = useState(jobToEdit?.salaryCurrency || "INR");
  const [salaryPeriod, setSalaryPeriod] = useState(jobToEdit?.salaryPeriod || "Yearly");
  const [openings, setOpenings] = useState<number>(jobToEdit?.openings ?? 1);
  const [skillsInput, setSkillsInput] = useState((jobToEdit?.skillsRequired || []).join(", "));
  const [description, setDescription] = useState(jobToEdit?.description || "");
  const [responsibilities, setResponsibilities] = useState(jobToEdit?.responsibilities || "");
  const [benefits, setBenefits] = useState(jobToEdit?.benefits || "");
  const [applyDeadline, setApplyDeadline] = useState(jobToEdit?.applyDeadline || "");
  const [status, setStatus] = useState<RecruitmentJob["status"]>(jobToEdit?.status || "Published");
  const [assignedRecruiterId, setAssignedRecruiterId] = useState(jobToEdit?.assignedRecruiterIds?.[0] || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Job Title is required.");
      return;
    }
    if (!companyName.trim()) {
      setErrorMessage("Company Name is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Job Description is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const skillsRequired = skillsInput
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const selectedRecruiter = recruiters.find((r) => r.id === assignedRecruiterId);

    try {
      if (isEditing && jobToEdit) {
        const updatePayload: Partial<RecruitmentJob> = {
          title: title.trim(),
          companyName: companyName.trim(),
          industry,
          department,
          employmentType,
          workMode,
          location: location.trim(),
          city: location.split(",")[0]?.trim() || "Bengaluru",
          minimumExperience: Number(minimumExperience),
          maximumExperience: Number(maximumExperience),
          highestQualification,
          minimumSalary: Number(minimumSalary),
          maximumSalary: Number(maximumSalary),
          salaryCurrency,
          salaryPeriod,
          salaryDisplay: minimumSalary && maximumSalary ? `₹${(minimumSalary / 100000).toFixed(1)} - ₹${(maximumSalary / 100000).toFixed(1)} LPA` : "Industry Standard",
          openings: Number(openings),
          skillsRequired,
          description: description.trim(),
          responsibilities: responsibilities.trim(),
          benefits: benefits.trim(),
          applyDeadline,
          status,
          assignedRecruiterIds: selectedRecruiter ? [selectedRecruiter.id] : [],
          assignedRecruiterNames: selectedRecruiter ? [selectedRecruiter.name] : []
        };

        await updateRecruitmentJob(jobToEdit.id, updatePayload, adminUser);
        onSuccess({ ...jobToEdit, ...updatePayload } as RecruitmentJob);
      } else {
        const newJob = await createRecruitmentJob({
          title: title.trim(),
          companyName: companyName.trim(),
          industry,
          department,
          employmentType,
          workMode,
          location: location.trim(),
          city: location.split(",")[0]?.trim() || "Bengaluru",
          minimumExperience: Number(minimumExperience),
          maximumExperience: Number(maximumExperience),
          highestQualification,
          minimumSalary: Number(minimumSalary),
          maximumSalary: Number(maximumSalary),
          salaryCurrency,
          salaryPeriod,
          salaryDisplay: minimumSalary && maximumSalary ? `₹${(minimumSalary / 100000).toFixed(1)} - ₹${(maximumSalary / 100000).toFixed(1)} LPA` : "Industry Standard",
          openings: Number(openings),
          skillsRequired,
          description: description.trim(),
          responsibilities: responsibilities.trim(),
          benefits: benefits.trim(),
          applyDeadline,
          status,
          assignedRecruiterIds: selectedRecruiter ? [selectedRecruiter.id] : [],
          assignedRecruiterNames: selectedRecruiter ? [selectedRecruiter.name] : [],
          createdBy: adminUser?.name || "Super Admin",
          createdByRole: "Admin"
        }, adminUser);

        onSuccess(newJob);
      }
      onClose();
    } catch (err: any) {
      console.error("Job save error:", err);
      setErrorMessage(err.message || "Failed to save job posting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? `Edit Job Posting (${jobToEdit?.jobId})` : "Create New Job Vacancy"}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? "Update live requirements, compensation & status" : "Generates sequential AIJ-JOB ID and syndicates automatically"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Title & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Job Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">
                Company / Client Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Swiggy, Paytm, Infosys"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Industry, Department, Employment Type & Work Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Industry / Domain</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Information Technology">Information Technology</option>
                <option value="Banking & Financial Services">Banking & FinTech</option>
                <option value="Healthcare & Life Sciences">Healthcare</option>
                <option value="E-Commerce & Retail">E-Commerce</option>
                <option value="Manufacturing & Engineering">Manufacturing</option>
                <option value="Consulting & Strategy">Consulting</option>
                <option value="Artificial Intelligence & ML">AI / Data Science</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          {/* Row 3: Location, Experience Range, Openings */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold text-slate-300">Location / City <span className="text-rose-400">*</span></label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, Karnataka or Remote"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Min Exp (Yrs)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={minimumExperience}
                onChange={(e) => setMinimumExperience(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Max Exp (Yrs)</label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.5"
                value={maximumExperience}
                onChange={(e) => setMaximumExperience(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 4: Salary & Openings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Min Annual CTC (INR)</label>
              <input
                type="number"
                step="50000"
                value={minimumSalary}
                onChange={(e) => setMinimumSalary(parseInt(e.target.value) || 0)}
                placeholder="e.g. 800000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Max Annual CTC (INR)</label>
              <input
                type="number"
                step="50000"
                value={maximumSalary}
                onChange={(e) => setMaximumSalary(parseInt(e.target.value) || 0)}
                placeholder="e.g. 1600000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Openings Count</label>
              <input
                type="number"
                min="1"
                max="500"
                value={openings}
                onChange={(e) => setOpenings(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 5: Required Key Skills */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Required Key Skills (Comma-separated) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js, GraphQL, PostgreSQL, Docker"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Row 6: Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Job Description & Overview <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the opportunity, core responsibilities, and team culture..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 resize-none"
            />
          </div>

          {/* Row 7: Responsibilities & Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Key Responsibilities</label>
              <textarea
                rows={3}
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="• Architect reliable scalable web apps&#10;• Lead code reviews..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Perks & Benefits</label>
              <textarea
                rows={3}
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                placeholder="• Comprehensive Health Insurance&#10;• Annual Learning Allowance..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 resize-none"
              />
            </div>
          </div>

          {/* Row 8: Status, Deadline & Assigned Recruiter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Published">🟢 Published / Live</option>
                <option value="Draft">Draft (Hidden)</option>
                <option value="Paused">Paused (Sourcing on hold)</option>
                <option value="Closed">Closed / Filled</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Apply Deadline</label>
              <input
                type="date"
                value={applyDeadline}
                onChange={(e) => setApplyDeadline(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Primary Recruiter</label>
              <select
                value={assignedRecruiterId}
                onChange={(e) => setAssignedRecruiterId(e.target.value)}
                className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">-- No Recruiter Assigned --</option>
                {recruiters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.agencyOrCompany || "Talent Team"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold flex items-center space-x-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : (isEditing ? "Update Job Posting" : "Publish Job Vacancy")}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
