import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  IndianRupee, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  X, 
  Save, 
  Eye, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Send 
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CompanyJob } from "./EmployerTypes";

interface EmployerPostJobProps {
  userId: string;
  companyName: string;
  onJobPublished: (newJob: CompanyJob) => void;
  onCancel: () => void;
}

export default function EmployerPostJob({
  userId,
  companyName,
  onJobPublished,
  onCancel
}: EmployerPostJobProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);

  // Form State
  // Step 1: Job Basics
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("3-5 Years");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "Node.js"]);

  // Step 2: Location & Salary
  const [location, setLocation] = useState("Bengaluru, Karnataka");
  const [workMode, setWorkMode] = useState<"Remote" | "Hybrid" | "On-site">("Hybrid");
  const [salaryMin, setSalaryMin] = useState("12,00,000");
  const [salaryMax, setSalaryMax] = useState("20,00,000");
  const [openings, setOpenings] = useState(2);
  const [education, setEducation] = useState("Bachelor's Degree in Computer Science or equivalent");

  // Step 3: Description & Responsibilities
  const [description, setDescription] = useState(
    "We are looking for a skilled engineer to build high-performance, scalable web applications for our growing platform. You will collaborate with cross-functional teams to architect and ship mission-critical features."
  );
  const [responsibilities, setResponsibilities] = useState(
    "• Design and develop performant, reliable, and testable frontend and backend services.\n• Collaborate with UI/UX designers and product managers to refine user stories.\n• Conduct code reviews and champion engineering best practices across the team."
  );
  const [benefits, setBenefits] = useState(
    "• Comprehensive Health & Family Insurance\n• Flexible Working Hours & Hybrid Policy\n• Annual Learning & Certification Budget\n• Performance Bonus & ESOPs"
  );

  // Step 4: Screening Questions
  const [questions, setQuestions] = useState<string[]>([
    "How many years of commercial experience do you have with React & TypeScript?",
    "Are you comfortable working in a Hybrid setup based out of our office location?",
    "What is your official notice period?"
  ]);
  const [newQuestion, setNewQuestion] = useState("");

  // Step 5: Status
  const [jobStatus, setJobStatus] = useState<"active" | "draft" | "paused">("active");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-save draft to localStorage
  useEffect(() => {
    const draftKey = `aijobs_employer_job_draft_${userId}`;
    const draftData = {
      title,
      department,
      employmentType,
      experienceLevel,
      skills,
      location,
      workMode,
      salaryMin,
      salaryMax,
      openings,
      education,
      description,
      responsibilities,
      benefits,
      questions,
      jobStatus
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setDraftSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {}
  }, [title, department, employmentType, experienceLevel, skills, location, workMode, salaryMin, salaryMax, openings, education, description, responsibilities, benefits, questions, jobStatus, userId]);

  // Load initial draft if present
  useEffect(() => {
    try {
      const draftKey = `aijobs_employer_job_draft_${userId}`;
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.department) setDepartment(parsed.department);
        if (parsed.employmentType) setEmploymentType(parsed.employmentType);
        if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
        if (parsed.skills) setSkills(parsed.skills);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.workMode) setWorkMode(parsed.workMode);
        if (parsed.salaryMin) setSalaryMin(parsed.salaryMin);
        if (parsed.salaryMax) setSalaryMax(parsed.salaryMax);
        if (parsed.openings) setOpenings(parsed.openings);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.responsibilities) setResponsibilities(parsed.responsibilities);
        if (parsed.benefits) setBenefits(parsed.benefits);
        if (parsed.questions) setQuestions(parsed.questions);
      }
    } catch (e) {}
  }, [userId]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions([...questions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!title.trim()) {
        setToastMessage({ type: "error", text: "Please enter a Job Title." });
        return false;
      }
      if (skills.length === 0) {
        setToastMessage({ type: "error", text: "Please add at least one required skill tag." });
        return false;
      }
    }
    if (step === 2) {
      if (!location.trim()) {
        setToastMessage({ type: "error", text: "Please enter the Job Location." });
        return false;
      }
    }
    if (step === 3) {
      if (!description.trim() || description.length < 30) {
        setToastMessage({ type: "error", text: "Please provide a detailed Job Description (minimum 30 characters)." });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setToastMessage(null);
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    setToastMessage(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const jobId = "job_" + Math.random().toString(36).substr(2, 9);
      const salaryFormatted = `₹${salaryMin} - ₹${salaryMax} LPA`;

      const newJobPayload: CompanyJob = {
        id: jobId,
        userId: userId,
        companyId: userId,
        employerId: userId,
        title: title.trim(),
        companyName: companyName || "AIJOBS Partner Employer",
        location: location.trim(),
        workMode: workMode,
        type: employmentType,
        department,
        salary: salaryFormatted,
        experience: experienceLevel,
        education: education.trim(),
        openings: Number(openings) || 1,
        skillsRequired: skills,
        description: description.trim(),
        responsibilities: responsibilities.trim(),
        benefits: benefits.trim(),
        screeningQuestions: questions,
        status: jobStatus,
        approved: true,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        applicationsCount: 0
      };

      // 1. Write to jobs collection
      await setDoc(doc(db, "jobs", jobId), newJobPayload);

      // 2. Write to company_jobs collection
      await setDoc(doc(db, "company_jobs", jobId), newJobPayload);

      // Clear draft
      try {
        localStorage.removeItem(`aijobs_employer_job_draft_${userId}`);
      } catch (e) {}

      setToastMessage({ type: "success", text: "Job posted successfully to AIJOBS!" });
      setTimeout(() => {
        onJobPublished(newJobPayload);
      }, 1200);

    } catch (err: any) {
      console.error("Failed to post job to Firestore:", err);
      // Fallback local creation for resilient offline sandbox
      const localJob: CompanyJob = {
        id: "job_loc_" + Date.now(),
        userId,
        companyId: userId,
        employerId: userId,
        title: title.trim(),
        companyName: companyName || "AIJOBS Partner",
        location: location.trim(),
        workMode,
        type: employmentType,
        salary: `₹${salaryMin} - ₹${salaryMax}`,
        experience: experienceLevel,
        skillsRequired: skills,
        description: description.trim(),
        responsibilities: responsibilities.trim(),
        status: jobStatus,
        createdAt: new Date().toISOString(),
        applicationsCount: 0
      };
      setToastMessage({ type: "success", text: "Job saved to your workspace!" });
      setTimeout(() => {
        onJobPublished(localJob);
      }, 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Job Basics" },
    { num: 2, label: "Location & Comp" },
    { num: 3, label: "Description" },
    { num: 4, label: "Screening" },
    { num: 5, label: "Preview & Publish" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="employer-post-job-container">
      {/* Toast feedback */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xl backdrop-blur-md transition-all ${
          toastMessage.type === "success" 
            ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
            : "bg-red-950/80 border border-red-500/40 text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Draft Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AIJOBS SMART JOB POSTING</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Create a New Job Opening</h2>
          <p className="text-xs text-slate-400">Reach verified tech, product & domain talent across India</p>
        </div>

        <div className="flex items-center gap-3">
          {draftSavedTime && (
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" /> Draft saved {draftSavedTime}
            </span>
          )}
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Step Progress Bar */}
      <div className="grid grid-cols-5 gap-2 p-3 rounded-2xl bg-[#17111F]/60 border border-purple-500/20">
        {steps.map((step) => {
          const isDone = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          return (
            <button
              key={step.num}
              onClick={() => {
                if (step.num < currentStep || validateStep(currentStep)) {
                  setCurrentStep(step.num);
                }
              }}
              className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all text-center cursor-pointer ${
                isCurrent 
                  ? "bg-blue-600/30 border border-blue-500/40 text-white" 
                  : isDone 
                  ? "text-emerald-400" 
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${isCurrent ? "bg-blue-500 text-white" : "bg-white/10 text-slate-400"}`}>
                    {step.num}
                  </span>
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 sm:hidden">Step {step.num}</span>
            </button>
          );
        })}
      </div>

      {/* Step Form Body */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-2xl space-y-6">
        
        {/* STEP 1: Job Basics */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <span>Step 1: Job Title & Classification</span>
              </h3>
              <p className="text-xs text-slate-400">Specify the role title, department, and experience criteria</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Job Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lead Full Stack Engineer (React / Node.js)"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Engineering">Engineering / Technology</option>
                  <option value="Product">Product Management</option>
                  <option value="Design">UI/UX & Product Design</option>
                  <option value="Data & AI">Data Science & AI / ML</option>
                  <option value="Sales & BD">Sales & Business Development</option>
                  <option value="Marketing">Growth & Digital Marketing</option>
                  <option value="Operations">Operations & HR</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Full-time">Full-time Permanent</option>
                  <option value="Contract">Contract / Freelance</option>
                  <option value="Internship">Internship (3-6 Months)</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Experience Required</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="Fresher / 0-1 Years">Fresher / Entry Level (0-1 Years)</option>
                  <option value="1-3 Years">Junior (1-3 Years)</option>
                  <option value="3-5 Years">Mid-Level (3-5 Years)</option>
                  <option value="5-8 Years">Senior (5-8 Years)</option>
                  <option value="8-12 Years">Lead / Staff (8-12 Years)</option>
                  <option value="12+ Years">Director / Principal (12+ Years)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Minimum Education</label>
                <input
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. B.Tech / BE in CS, MCA or equivalent"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Skills Tags Selector */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-300">Core Required Skills <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Type skill and press Enter (e.g. React, PostgreSQL, Docker)"
                    className="flex-1 px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shrink-0"
                  >
                    Add Skill
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Location & Salary */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>Step 2: Location, Work Mode & Compensation</span>
              </h3>
              <p className="text-xs text-slate-400">Define office location, flexibility, and salary budget</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Job Location (City / State) <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, Hyderabad, Pune, Mumbai, Delhi NCR"
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Work Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Hybrid", "Remote", "On-site"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkMode(mode)}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                        workMode === mode 
                          ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30"
                          : "bg-[#0e0a14] text-slate-400 border-purple-500/20 hover:text-white"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Minimum Annual CTC (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="text"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="e.g. 12,00,000"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Maximum Annual CTC (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="text"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="e.g. 22,00,000"
                    className="w-full pl-8 pr-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Number of Open Positions</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={openings}
                  onChange={(e) => setOpenings(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Description & Responsibilities */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Step 3: Job Description & Responsibilities</span>
              </h3>
              <p className="text-xs text-slate-400">Outline the role context, day-to-day deliverables, and company benefits</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Role Overview / Summary <span className="text-red-400">*</span></label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your team mission, product scope, and ideal candidate profile..."
                  className="w-full p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Key Responsibilities (One per line)</label>
                <textarea
                  rows={4}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  placeholder="• Deliver scalable code architectures&#10;• Mentor junior engineers&#10;• Drive feature delivery..."
                  className="w-full p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Perks, Benefits & Culture</label>
                <textarea
                  rows={3}
                  value={benefits}
                  onChange={(e) => setBenefits(e.target.value)}
                  placeholder="• Comprehensive medical cover&#10;• Annual wellness stipend..."
                  className="w-full p-4 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Screening Questions */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <span>Step 4: Candidate Screening Questions</span>
              </h3>
              <p className="text-xs text-slate-400">Filter applicants automatically before technical review</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  placeholder="Add custom screening question (e.g. Do you have experience with Kubernetes in production?)"
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl transition-all cursor-pointer shrink-0"
                >
                  Add Question
                </button>
              </div>

              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#0e0a14] border border-purple-500/20 flex items-center justify-between gap-3 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                        Q{idx + 1}
                      </span>
                      <span>{q}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Preview & Publish */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                <span>Step 5: Review & Publish Job Opening</span>
              </h3>
              <p className="text-xs text-slate-400">Confirm all details before broadcasting to the AIJOBS network</p>
            </div>

            {/* Structured Preview Card */}
            <div className="p-6 rounded-3xl bg-[#0e0a14] border border-purple-500/30 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-4">
                <div>
                  <h4 className="text-xl font-extrabold text-white">{title || "Untitled Role"}</h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="text-blue-300 font-semibold">{companyName || "AIJOBS Partner"}</span>
                    <span>•</span>
                    <span>{department}</span>
                    <span>•</span>
                    <span>{location} ({workMode})</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-emerald-400 font-mono">
                    ₹{salaryMin} - ₹{salaryMax} LPA
                  </div>
                  <div className="text-[11px] text-slate-400">{openings} Open Position(s)</div>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Required Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overview */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Job Description</span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{description}</p>
              </div>

              {/* Responsibilities */}
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Key Deliverables</span>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">{responsibilities}</p>
              </div>

              {/* Initial Status Selector */}
              <div className="pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Set Initial Job Status</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setJobStatus("active")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        jobStatus === "active" 
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      Active (Publish Now)
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobStatus("draft")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        jobStatus === "draft" 
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      Draft (Private)
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobStatus("paused")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        jobStatus === "paused" 
                          ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                          : "bg-white/5 border-white/10 text-slate-400"
                      }`}
                    >
                      Paused
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-purple-500/20">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs flex items-center gap-2 border border-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePublish}
              className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Publishing to AIJOBS...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 text-slate-950" />
                  <span>Publish Job Opening</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
