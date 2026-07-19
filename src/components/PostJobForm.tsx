import { useState } from "react";
import { 
  Briefcase, Save, X, Calendar, MapPin, DollarSign, ListTodo, Award, Gift, Clock, AlertCircle, Building2, CheckCircle
} from "lucide-react";
import { db, auth } from "../firebase";
import { doc, setDoc, collection, updateDoc } from "firebase/firestore";
import { NotificationService } from "../services/notificationService";

interface PostJobFormProps {
  userId: string;
  userRole: "recruiter" | "consultancy" | "employer" | "admin" | string;
  userName?: string;
  onJobPosted?: (jobId: string) => void;
  onCancel?: () => void;
}

export default function PostJobForm({ userId, userRole, userName, onJobPosted, onCancel }: PostJobFormProps) {
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("Hybrid");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [salary, setSalary] = useState("₹12,00,000 - ₹18,00,000");
  const [experience, setExperience] = useState("Mid-Level");
  const [education, setEducation] = useState("");
  const [openPositions, setOpenPositions] = useState(1);
  const [industry, setIndustry] = useState("Software / IT");
  const [category, setCategory] = useState("Software Engineering");
  const [consultancy, setConsultancy] = useState("");
  const [applyDeadline, setApplyDeadline] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [languages, setLanguages] = useState("English");
  const [benefits, setBenefits] = useState("");
  const [interviewProcess, setInterviewProcess] = useState("Technical Screening, Architecture Round, HR culture fit");
  const [responsibilities, setResponsibilities] = useState("");
  const [requirements, setRequirements] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !companyName.trim() || !location.trim() || !description.trim() || !requiredSkills.trim()) {
      setErrorMsg("Please fill out all required fields marked with *.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const jobId = "job_" + Math.random().toString(36).substr(2, 9);
      const skillsArray = requiredSkills
        .split(",")
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

      // Setup user association based on role
      let finalEmployerId = "";
      let finalConsultancy = consultancy;

      if (userRole === "recruiter" || userRole === "employer") {
        // Recruiter/Employer posted job
        finalEmployerId = userId;
      } else if (userRole === "consultancy") {
        // Consultancy posted job
        finalConsultancy = userName || userId; // Set consultancy field to consultancy agency
        finalEmployerId = "employer_partner_" + Math.random().toString(36).substr(2, 5); // Simulated partner/employer ID
      } else {
        finalEmployerId = userId;
      }

      const newJob = {
        id: jobId,
        title: title.trim(),
        companyName: companyName.trim(),
        location: location.trim(),
        workMode,
        type: employmentType,
        salary,
        experience,
        education: education.trim(),
        openings: openPositions,
        industry,
        category,
        consultancy: finalConsultancy.trim(),
        applyDeadline: applyDeadline || "",
        expiryDate: expiryDate || applyDeadline || "",
        skillsRequired: skillsArray,
        languages: languages.trim(),
        benefits: benefits.trim(),
        interviewProcess: interviewProcess.trim(),
        responsibilities: responsibilities.trim(),
        requirements: requirements.trim(),
        description: description.trim(),
        status: "Draft", // Always defaults to Draft as per prompt instructions
        createdBy: userId,
        employerId: finalEmployerId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "jobs", jobId), newJob);

      // Sync to company_jobs or consultancy_jobs based on active userRole
      try {
        if (userRole === "employer" || userRole === "recruiter" || userRole === "corporate") {
          await setDoc(doc(db, "company_jobs", jobId), {
            id: jobId,
            userId: userId,
            title: title.trim(),
            companyName: companyName.trim(),
            location: location.trim(),
            skillsRequired: skillsArray,
            salary: salary,
            experience: experience,
            status: "Draft",
            createdAt: new Date().toISOString()
          });
        } else if (userRole === "consultancy" || userRole === "agency") {
          await setDoc(doc(db, "consultancy_jobs", jobId), {
            id: jobId,
            title: title.trim(),
            companyName: companyName.trim(),
            skillsRequired: skillsArray,
            salaryMin: parseInt(salary.replace(/[^0-9]/g, "")) || 10,
            salaryMax: parseInt(salary.replace(/[^0-9]/g, "")) || 20,
            location: location.trim(),
            status: "draft",
            createdAt: new Date().toISOString()
          });
        }
      } catch (syncErr) {
        console.warn("Non-blocking role sync error on job draft save:", syncErr);
      }

      // Trigger a notification to current user workspace
      try {
        await NotificationService.triggerEvent({
          userId: userId,
          event: "SYSTEM_BROADCAST",
          title: "💼 Job Vacancy Draft Saved",
          message: `Your job posting "${title}" for ${companyName} has been recorded as a Draft. Send to administrative review to publish.`,
          type: "success",
          link: `jobId=${jobId}`
        });
      } catch (notifErr) {
        console.warn("Notification trigger failed on job draft save:", notifErr);
      }

      setSuccessMsg("🎉 Job vacancy successfully created as a Draft!");
      
      setTimeout(() => {
        if (onJobPosted) {
          onJobPosted(jobId);
        }
      }, 1500);

    } catch (err: any) {
      console.error("Error posting job draft:", err);
      setErrorMsg(`Could not create job posting: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 max-w-4xl mx-auto bg-neutral-950/40 text-gray-200">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Create New Job Vacancy</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Fill out the details below to register a vacancy. Newly posted jobs default to <strong className="text-amber-400">Draft</strong> state.
          </p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="p-1.5 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span className="font-bold">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Core details */}
        <div className="bg-white/[0.02] p-4 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider text-indigo-400 mb-2">Core Specifications</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Job Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Employer / Company Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Tech Solutions"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Location / City *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, India"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Work Mode</label>
              <select
                value={workMode}
                onChange={e => setWorkMode(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Employment Type</label>
              <select
                value={employmentType}
                onChange={e => setEmploymentType(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Compensation / Salary *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  placeholder="e.g. ₹12,00,000 - ₹18,00,000"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Target Segment Industry</label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Job Category</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Requirements and Experience */}
        <div className="bg-white/[0.02] p-4 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider text-indigo-400 mb-2">Requirements & Deadlines</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400">Experience Required</label>
              <select
                value={experience}
                onChange={e => setExperience(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Fresher">Fresher (0 years)</option>
                <option value="Junior">Junior (1-3 years)</option>
                <option value="Mid-Level">Mid-Level (3-5 years)</option>
                <option value="Senior">Senior (5+ years)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Required Education</label>
              <input
                type="text"
                value={education}
                onChange={e => setEducation(e.target.value)}
                placeholder="e.g. B.Tech in Computer Science"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Required Headcount *</label>
              <input
                type="number"
                required
                min="1"
                value={openPositions}
                onChange={e => setOpenPositions(Number(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400">Application Deadline (applyDeadline) *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  required
                  value={applyDeadline}
                  onChange={e => setApplyDeadline(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Post Expiry Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Assigned Recruiter / Consultancy</label>
              <input
                type="text"
                value={consultancy}
                onChange={e => setConsultancy(e.target.value)}
                disabled={userRole === "consultancy"}
                placeholder={userRole === "consultancy" ? userName : "e.g. Apex Recruitment Partners"}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400 font-bold">Required Skills (Comma separated) *</label>
              <div className="relative">
                <ListTodo className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={requiredSkills}
                  onChange={e => setRequiredSkills(e.target.value)}
                  placeholder="e.g. React, TypeScript, Tailwind CSS, Firestore"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Required Languages</label>
              <input
                type="text"
                value={languages}
                onChange={e => setLanguages(e.target.value)}
                placeholder="e.g. English, German"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Detailed descriptive texts */}
        <div className="bg-white/[0.02] p-4 border border-white/5 rounded-2xl space-y-4">
          <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider text-indigo-400 mb-2">Descriptive Fields</h3>

          <div className="space-y-1">
            <label className="block text-gray-400 font-bold">Detailed Job Description & Tech Stack *</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Outline general operations, software stack, developer guidelines, etc."
              className="w-full h-24 bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400">Roles & Responsibilities</label>
              <textarea
                value={responsibilities}
                onChange={e => setResponsibilities(e.target.value)}
                placeholder="Outline day-to-day requirements and core functions..."
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Key Position Requirements</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="Specify preferred credentials, coding milestones, or cloud architecture backgrounds..."
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-gray-400">Benefits Portfolio</label>
              <textarea
                value={benefits}
                onChange={e => setBenefits(e.target.value)}
                placeholder="e.g. Flexible Vacation policies, stock options, health coverage..."
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-gray-400">Interview Evaluation Pipeline Workflow</label>
              <textarea
                value={interviewProcess}
                onChange={e => setInterviewProcess(e.target.value)}
                placeholder="Screening Call, Technical Evaluation, Hiring Manager Discussion..."
                className="w-full h-20 bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Actions buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl font-bold cursor-pointer transition-all"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/15 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Creating Job Draft..." : "Save Job Draft"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
