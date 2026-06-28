import { useState } from "react";
import { 
  Briefcase, Plus, Edit, Trash2, Copy, Save, X, 
  MapPin, DollarSign, Calendar, Clock, CheckCircle
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ConsultancyJobModel, ClientModel } from "./CrmTypes";

interface CrmJobsViewProps {
  jobs: ConsultancyJobModel[];
  clients: ClientModel[];
  onRefresh: () => void;
  userRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
}

export default function CrmJobsView({
  jobs,
  clients,
  onRefresh,
  userRole
}: CrmJobsViewProps) {
  const [selectedJob, setSelectedJob] = useState<ConsultancyJobModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedRecruiter, setAssignedRecruiter] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [skillsRequiredText, setSkillsRequiredText] = useState("");
  const [timeline, setTimeline] = useState("");
  const [status, setStatus] = useState<"open" | "closed" | "draft" | "onhold">("open");

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot create job postings.");
      return;
    }
    setTitle("");
    setCompanyName(clients[0]?.companyName || "Google India");
    setDepartment("");
    setAssignedRecruiter("Amit Roy");
    setExperience("Mid-Level (5+ Years)");
    setLocation("Bengaluru, Karnataka");
    setSalaryMin("15");
    setSalaryMax("25");
    setSkillsRequiredText("React, TypeScript, Node.js");
    setTimeline("30 Days");
    setStatus("open");
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (job: ConsultancyJobModel) => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot edit job details.");
      return;
    }
    setTitle(job.title);
    setCompanyName(job.companyName);
    setDepartment(job.department);
    setAssignedRecruiter(job.assignedRecruiter);
    setExperience(job.experience);
    setLocation(job.location);
    setSalaryMin(job.salaryMin);
    setSalaryMax(job.salaryMax);
    setSkillsRequiredText(job.skillsRequired.join(", "));
    setTimeline(job.timeline);
    setStatus(job.status);
    setSelectedJob(job);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const jobId = isEditing && selectedJob 
        ? selectedJob.id 
        : "cjob_" + Math.random().toString(36).substr(2, 9);

      const skills = skillsRequiredText
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const jobObj: ConsultancyJobModel = {
        id: jobId,
        title,
        companyName,
        department,
        assignedRecruiter,
        experience,
        location,
        salaryMin,
        salaryMax,
        skillsRequired: skills,
        timeline,
        status,
        createdAt: isEditing && selectedJob ? selectedJob.createdAt : new Date().toISOString()
      };

      await setDoc(doc(db, "consultancy_jobs", jobId), jobObj);
      alert(isEditing ? "Job requirements updated in Firestore!" : "New job posted successfully and sync'd to database!");
      setIsAdding(false);
      setIsEditing(false);
      setSelectedJob(null);
      onRefresh();
    } catch (err) {
      console.error("Save job error:", err);
    }
  };

  const handleDuplicateJob = async (job: ConsultancyJobModel) => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot duplicate job postings.");
      return;
    }
    try {
      const newId = "cjob_dup_" + Math.random().toString(36).substr(2, 9);
      const duplicatedObj: ConsultancyJobModel = {
        ...job,
        id: newId,
        title: job.title + " (Copy)",
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "consultancy_jobs", newId), duplicatedObj);
      alert("Job posting duplicated! Saved in database.");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (userRole !== "Admin" && userRole !== "Manager") {
      alert("Role Permission Restriction: Only Administrators or Managers can delete vacancy records.");
      return;
    }
    if (!confirm("Are you sure you want to delete this job vacancy? All matched pipelines will disconnect.")) return;

    try {
      await deleteDoc(doc(db, "consultancy_jobs", id));
      alert("Vacancy record deleted from Firestore.");
      if (selectedJob?.id === id) {
        setSelectedJob(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-jobs-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Job Vacancies Directory</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Configure client hiring positions, specify recruiter roles, and CTC structures.</p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Vacancy</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Jobs List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.length > 0 ? (
              jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => { setSelectedJob(job); setIsAdding(false); setIsEditing(false); }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-4 ${
                    selectedJob?.id === job.id 
                      ? "bg-indigo-600/10 border-indigo-500/50" 
                      : "glass border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 font-bold block w-fit">
                        {job.companyName}
                      </span>
                      <h4 className="font-extrabold text-sm text-white pt-1">{job.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">ID: {job.id.toUpperCase()}</p>
                    </div>

                    <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                      job.status === "open" ? "bg-emerald-500/10 text-emerald-400" :
                      job.status === "closed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {job.skillsRequired.slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5">{sk}</span>
                    ))}
                    {job.skillsRequired.length > 3 && (
                      <span className="text-[9px] px-1.5 py-0.5 text-indigo-400 bg-indigo-500/10 font-bold rounded">+{job.skillsRequired.length - 3}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 border-t border-white/5 pt-3 font-mono">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-indigo-400" /> {job.location.split(",")[0]}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-emerald-400" /> ₹{job.salaryMin}L - ₹{job.salaryMax}L</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-xs text-gray-500 italic glass rounded-xl">No active vacancies configured. Create a position.</div>
            )}
          </div>
        </div>

        {/* Detailed Form or Sidebar */}
        <div>
          {isAdding || isEditing ? (
            <form onSubmit={handleSaveJob} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">{isEditing ? "Modify Position" : "Post Vacancy Requirements"}</h4>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setIsEditing(false); }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1">Job Designation Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Senior Fullstack Architect"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Corporate Client *</label>
                    <select
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.companyName}>{c.companyName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Target Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="e.g. Engineering Development"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Assigned Lead Recruiter</label>
                    <input
                      type="text"
                      value={assignedRecruiter}
                      onChange={e => setAssignedRecruiter(e.target.value)}
                      placeholder="e.g. Amit Roy"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Experience Tier</label>
                    <input
                      type="text"
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      placeholder="e.g. Senior (8+ Years)"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Work Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="e.g. Remote, India"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Vacancy Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                      <option value="onhold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">CTC Budget Min (LPA)</label>
                    <input
                      type="number"
                      value={salaryMin}
                      onChange={e => setSalaryMin(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">CTC Budget Max (LPA)</label>
                    <input
                      type="number"
                      value={salaryMax}
                      onChange={e => setSalaryMax(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Required Skills (Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={skillsRequiredText}
                    onChange={e => setSkillsRequiredText(e.target.value)}
                    placeholder="React, TypeScript, AWS, Node.js"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Hiring Timeline Target</label>
                  <input
                    type="text"
                    value={timeline}
                    onChange={e => setTimeline(e.target.value)}
                    placeholder="e.g. 30 Days"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Position Specifications</span>
              </button>
            </form>
          ) : selectedJob ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-5 animate-in fade-in duration-200">
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider block w-fit">
                    {selectedJob.companyName}
                  </span>
                  <h4 className="font-extrabold text-base text-white pt-1">{selectedJob.title}</h4>
                  <p className="text-[10px] text-gray-400 font-mono italic">Created on {new Date(selectedJob.createdAt).toLocaleDateString()}</p>
                </div>
                
                {!isReadOnly && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicateJob(selectedJob)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-all cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(selectedJob)}
                      className="p-1.5 bg-white/5 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-gray-400">Department:</span>
                    <p className="text-white font-semibold">{selectedJob.department || "Engineering"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-400">Target Timeline:</span>
                    <p className="text-white font-semibold">{selectedJob.timeline || "Immediate"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-white/5 py-3.5">
                  <div className="space-y-1">
                    <span className="text-gray-400">CTC Budget LPA:</span>
                    <p className="text-emerald-400 font-bold font-mono">₹{selectedJob.salaryMin}L - ₹{selectedJob.salaryMax}L</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-400">Experience Reqd:</span>
                    <p className="text-white font-semibold">{selectedJob.experience}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-gray-400">Work Location:</span>
                  <p className="text-white font-semibold flex items-center gap-1 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedJob.location}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-400">Assigned Recruiter Lead:</span>
                  <p className="text-white font-semibold">{selectedJob.assignedRecruiter}</p>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-gray-400 font-medium block">Skills Specification:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedJob.skillsRequired.map((sk, idx) => (
                      <span key={idx} className="text-[10px] px-2.5 py-1 bg-white/5 text-gray-300 rounded-lg border border-white/5 font-mono">{sk}</span>
                    ))}
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleDeleteJob(selectedJob.id)}
                      className="w-full py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/25 text-red-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Vacancy Post</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <Briefcase className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Job Vacancy</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active vacancy from the card list to modify job profiles, duplicate listings, or assign recruiters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
