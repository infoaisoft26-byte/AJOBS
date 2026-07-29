import { useState } from "react";
import { 
  Briefcase, Search, Filter, ShieldAlert, CheckCircle, Trash2, 
  Sparkles, Star, MapPin, Tag, Building, Grid, Plus, X 
} from "lucide-react";
import { JobPosting } from "../../types";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import InteractiveExportTable from "../InteractiveExportTable";

interface JobManagementProps {
  jobs: JobPosting[];
  onRefresh: () => void;
}

type AdminJobForm = {
  title: string;
  companyName: string;
  description: string;
  city: string;
  state: string;
  streetAddress: string;
  postalCode: string;
  country: string;
  employmentType: string;
  workMode: "ONSITE" | "HYBRID" | "REMOTE";
  industry: string;
  department: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  skills: string;
  experienceRequirements: string;
  educationRequirements: string;
  numberOfOpenings: string;
  companyWebsite: string;
  companyLogo: string;
  applyUrl: string;
  validThrough: string;
  publishNow: boolean;
};

const getDefaultExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const createEmptyJobForm = (): AdminJobForm => ({
  title: "",
  companyName: "",
  description: "",
  city: "",
  state: "",
  streetAddress: "",
  postalCode: "",
  country: "IN",
  employmentType: "FULL_TIME",
  workMode: "ONSITE",
  industry: "",
  department: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "INR",
  salaryPeriod: "MONTH",
  skills: "",
  experienceRequirements: "",
  educationRequirements: "",
  numberOfOpenings: "1",
  companyWebsite: "",
  companyLogo: "",
  applyUrl: "",
  validThrough: getDefaultExpiryDate(),
  publishNow: true
});

const slugifyJobTitle = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export default function JobManagement({
  jobs,
  onRefresh
}: JobManagementProps) {
  const [activeTab, setActiveTab] = useState<"database" | "taxonomy">("database");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [jobForm, setJobForm] = useState<AdminJobForm>(createEmptyJobForm);

  // Global taxonomies state (with standard enterprise lists)
  const [taxonomies, setTaxonomies] = useState({
    categories: ["Engineering", "Design", "Product", "Operations", "Sales", "Human Resources"],
    skills: ["React", "TypeScript", "Python", "Node.js", "Firebase", "Machine Learning", "System Design"],
    cities: ["Bengaluru", "Hyderabad", "Mumbai", "Delhi NCR", "Pune", "Chennai", "Remote"],
    states: ["Karnataka", "Telangana", "Maharashtra", "Delhi", "Tamil Nadu"],
    industries: ["Fintech", "Artificial Intelligence", "SaaS", "E-Commerce", "Healthcare", "Web3"],
    departments: ["Technical Division", "Creative Arts", "Corporate Sourcing", "Executive Office"]
  });

  const [newTaxValue, setNewTaxValue] = useState("");
  const [activeTaxKey, setActiveTaxKey] = useState<keyof typeof taxonomies>("skills");

  const handleToggleFeature = async (job: JobPosting) => {
    setIsSubmitting(true);
    const isFeatured = (job as any).isFeatured || false;
    const nextFeaturedState = !isFeatured;

    try {
      await setDoc(doc(db, "jobs", job.id), {
        isFeatured: nextFeaturedState
      }, { merge: true });

      // Log action
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: job.employerId,
        userName: job.companyName,
        userEmail: "recruitment@aijobs.global",
        role: "Super Admin",
        action: "UPDATE",
        category: "Job",
        description: `Set Job ID '${job.title}' featured attribute to ${nextFeaturedState ? "TRUE" : "FALSE"}.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`Job Featured status adjusted to: ${nextFeaturedState ? "FEATURED" : "STANDARD"}`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error adjusting featured state.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveJob = async (job: JobPosting, approve: boolean) => {
    setIsSubmitting(true);
    const nextStatus = approve ? "live" : "rejected";
    try {
      const updatePayload = approve 
        ? {
            status: "live",
            approved: true,
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        : {
            status: "rejected",
            approved: false,
            updatedAt: new Date().toISOString()
          };

      // 1. Sync jobs
      await setDoc(doc(db, "jobs", job.id), updatePayload, { merge: true });

      // 2. Sync company_jobs
      try {
        await setDoc(doc(db, "company_jobs", job.id), updatePayload, { merge: true });
      } catch (ce) {
        console.warn("Could not sync company_jobs status for job:", job.id, ce);
      }

      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: job.employerId || "admin",
        userName: job.companyName || "AIJobs System",
        userEmail: "recruitment@aijobs.global",
        role: "Super Admin",
        action: approve ? "APPROVAL" : "REJECTION",
        category: "Job",
        description: `Job verification: marked ${job.title} at ${job.companyName} as ${nextStatus.toUpperCase()}.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`Job vacancy marked as: ${nextStatus.toUpperCase()}`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Error approving/rejecting job posting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async (job: JobPosting) => {
    if (!confirm(`⚠️ Are you sure you want to delete job posting "${job.title}" at ${job.companyName}?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "jobs", job.id));

      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: job.employerId,
        userName: job.companyName,
        userEmail: "recruitment@aijobs.global",
        role: "Super Admin",
        action: "DELETE",
        category: "Job",
        description: `Permanently deleted job vacancy '${job.title}' by ${job.companyName} from database.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert("Successfully deleted job posting.");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTaxonomyValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxValue.trim()) return;

    const key = activeTaxKey;
    const currentList = taxonomies[key];
    if (currentList.includes(newTaxValue.trim())) {
      alert("Taxonomy item already exists.");
      return;
    }

    setTaxonomies({
      ...taxonomies,
      [key]: [...currentList, newTaxValue.trim()]
    });
    setNewTaxValue("");
    alert(`Added "${newTaxValue}" to ${key}!`);
  };

  const handleRemoveTaxonomyValue = (key: keyof typeof taxonomies, value: string) => {
    setTaxonomies({
      ...taxonomies,
      [key]: taxonomies[key].filter(v => v !== value)
    });
  };

  const updateJobForm = <K extends keyof AdminJobForm>(
    key: K,
    value: AdminJobForm[K]
  ) => {
    setJobForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = jobForm.title.trim();
    const companyName = jobForm.companyName.trim();
    const description = jobForm.description.trim();
    const city = jobForm.city.trim();
    const state = jobForm.state.trim();
    const country = jobForm.country.trim().toUpperCase();
    const salaryMin = Number(jobForm.salaryMin);
    const salaryMax = Number(jobForm.salaryMax);
    const numberOfOpenings = Number(jobForm.numberOfOpenings);
    const validThroughDate = new Date(`${jobForm.validThrough}T23:59:59`);

    if (!title || !companyName || !description || !city || !state || !country) {
      alert("Please complete the required job, company, description and location fields.");
      return;
    }

    if (description.length < 100) {
      alert("Please provide a complete job description of at least 100 characters.");
      return;
    }

    if (
      !Number.isFinite(salaryMin) ||
      !Number.isFinite(salaryMax) ||
      salaryMin < 0 ||
      salaryMax < salaryMin
    ) {
      alert("Please enter a valid salary range. Maximum salary must be greater than or equal to minimum salary.");
      return;
    }

    if (!Number.isInteger(numberOfOpenings) || numberOfOpenings < 1) {
      alert("Number of openings must be at least 1.");
      return;
    }

    if (Number.isNaN(validThroughDate.getTime()) || validThroughDate <= new Date()) {
      alert("Application closing date must be in the future.");
      return;
    }

    setIsSubmitting(true);

    try {
      const jobRef = doc(collection(db, "jobs"));
      const jobId = jobRef.id;
      const slug = slugifyJobTitle(title) || "job";
      const now = new Date().toISOString();
      const siteUrl = (
        import.meta.env.VITE_SITE_URL ||
        window.location.origin ||
        "https://aijobs1.vercel.app"
      ).replace(/\/+$/, "");
      const canonicalUrl = `${siteUrl}/jobs/${slug}-${jobId}`;
      const location = [city, state, country].filter(Boolean).join(", ");
      const skillsRequired = jobForm.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);
      const status = jobForm.publishNow ? "live" : "draft";
      const salary = `${jobForm.salaryCurrency} ${salaryMin.toLocaleString("en-IN")} - ${salaryMax.toLocaleString("en-IN")} / ${jobForm.salaryPeriod.toLowerCase()}`;
      const applyUrl = jobForm.applyUrl.trim() || `${canonicalUrl}?apply=1`;

      const payload = {
        id: jobId,
        slug,
        title,
        companyName,
        description,
        location,
        streetAddress: jobForm.streetAddress.trim(),
        city,
        state,
        postalCode: jobForm.postalCode.trim(),
        country,
        jobLocation: {
          address: {
            streetAddress: jobForm.streetAddress.trim(),
            addressLocality: city,
            addressRegion: state,
            postalCode: jobForm.postalCode.trim(),
            addressCountry: country
          }
        },
        employmentType: jobForm.employmentType,
        workMode: jobForm.workMode,
        jobLocationType: jobForm.workMode === "REMOTE" ? "TELECOMMUTE" : null,
        applicantLocationRequirements: jobForm.workMode === "REMOTE" ? country : null,
        industry: jobForm.industry.trim(),
        department: jobForm.department.trim(),
        salary,
        salaryMin,
        salaryMax,
        salaryCurrency: jobForm.salaryCurrency,
        salaryPeriod: jobForm.salaryPeriod,
        skillsRequired,
        experienceRequirements: jobForm.experienceRequirements.trim(),
        educationRequirements: jobForm.educationRequirements.trim(),
        numberOfOpenings,
        companyWebsite: jobForm.companyWebsite.trim(),
        companyLogo: jobForm.companyLogo.trim(),
        applyUrl,
        canonicalUrl,
        publicUrl: canonicalUrl,
        directApply: true,
        datePosted: now,
        validThrough: validThroughDate.toISOString(),
        status,
        approved: jobForm.publishNow,
        isFeatured: false,
        employerId: "admin",
        createdBy: "admin",
        createdByRole: "admin",
        source: "admin",
        createdAt: now,
        updatedAt: now,
        publishedAt: jobForm.publishNow ? now : null
      };

      await setDoc(jobRef, payload);

      try {
        await setDoc(doc(db, "company_jobs", jobId), payload);
      } catch (companyJobError) {
        console.warn("Job saved to jobs but company_jobs sync failed:", companyJobError);
      }

      const logId = `log_${jobId}`;
      try {
        await setDoc(doc(db, "audit_logs", logId), {
          id: logId,
          userId: "admin",
          userName: "AIJobs Admin",
          role: "Super Admin",
          action: "CREATE",
          category: "Job",
          description: `Created ${status.toUpperCase()} job '${title}' for ${companyName}.`,
          entityId: jobId,
          createdAt: now
        });
      } catch (auditLogError) {
        console.warn("Job saved but audit log creation failed:", auditLogError);
      }

      alert(
        jobForm.publishNow
          ? `Job published successfully.\n\nPublic URL:\n${canonicalUrl}`
          : "Job saved successfully as draft."
      );
      setJobForm(createEmptyJobForm());
      setIsCreateJobOpen(false);
      setActiveTab("database");
      onRefresh();
    } catch (err) {
      console.error("Error creating job:", err);
      alert("Unable to create the job. Confirm that the logged-in Admin has Firestore write permission for jobs, company_jobs and audit_logs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch = 
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesIndustry = selectedIndustry === "all" || (j as any).industry === selectedIndustry;

    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="space-y-6" id="job-management-portal">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <span>Job Sourcing Database & Taxonomies</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Moderate job postings, toggle priority featured slots, and manage platform taxonomies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateJobOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-950/30"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </button>

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-mono">
            <button
              onClick={() => setActiveTab("database")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "database" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Job Database ({jobs.length})
            </button>
            <button
              onClick={() => setActiveTab("taxonomy")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "taxonomy" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Manage Taxonomies
            </button>
          </div>
        </div>
      </div>

      {activeTab === "database" ? (
        <div className="space-y-4">
          {/* Advanced filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, company name, city..."
                className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Industries</option>
                {taxonomies.industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end font-mono text-[10px] text-gray-400">
              Filtered Job Postings: <strong className="text-white ml-1">{filteredJobs.length}</strong>
            </div>
          </div>

          {/* Table list */}
          <div className="space-y-4">
            <InteractiveExportTable
              id="active-vacancy-ledger-export-table"
              title="Active Vacancy Ledger"
              exportFileName="system_jobs_report"
              data={filteredJobs}
              columns={[
                {
                  key: "title",
                  label: "Position Details",
                  sortable: true,
                  render: (val: any, j: JobPosting) => {
                    const isFeat = (j as any).isFeatured || false;
                    return (
                      <div className="py-1">
                        <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{j.title}</span>
                          {isFeat && (
                            <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded uppercase font-mono">
                              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              <span>Featured</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{j.location}</span>
                        </div>
                      </div>
                    );
                  }
                },
                {
                  key: "companyName",
                  label: "Company",
                  sortable: true,
                  render: (val: any, j: JobPosting) => (
                    <span className="font-semibold text-white">{j.companyName}</span>
                  )
                },
                {
                  key: "salary",
                  label: "Compensation Package",
                  sortable: true,
                  render: (val: any, j: JobPosting) => (
                    <span className="font-mono text-indigo-400">{j.salary}</span>
                  )
                },
                {
                  key: "skillsRequired",
                  label: "Tags & Requirements",
                  sortable: false,
                  render: (val: any, j: JobPosting) => (
                    <div className="flex flex-wrap gap-1">
                      {j.skillsRequired?.slice(0, 3).map((sk) => (
                        <span key={sk} className="text-[8px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-300">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )
                },
                {
                  key: "status",
                  label: "Status",
                  sortable: true,
                  render: (val: any, j: JobPosting) => {
                    const st = (j.status || "").toLowerCase();
                    return (
                      <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase border ${
                        st === "live" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                        st === "pending_approval" || st === "pending approval" ? "bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse" :
                        st === "draft" ? "bg-blue-500/10 text-blue-400 border-blue-500/25" :
                        st === "approved" ? "bg-purple-500/10 text-purple-400 border-purple-500/25" :
                        st === "closed" ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/25" :
                        st === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/25" :
                        "bg-gray-500/10 text-gray-400 border-gray-500/25"
                      }`}>
                        {j.status || "Pending Approval"}
                      </span>
                    );
                  }
                },
                {
                  key: "actions",
                  label: "Actions",
                  sortable: false,
                  render: (val: any, j: JobPosting) => {
                    const isFeat = (j as any).isFeatured || false;
                    const isLive = (j.status || "").toLowerCase() === "live";
                    return (
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleFeature(j)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer inline-flex items-center border ${
                            isFeat 
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                              : "bg-white/5 border-white/5 text-gray-400 hover:text-white"
                          }`}
                          title={isFeat ? "Demote from Featured" : "Promote to Featured"}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFeat ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>

                        {!isLive && (
                          <>
                            <button
                              onClick={() => handleApproveJob(j, true)}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                              title="Approve Job & Set Live"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleApproveJob(j, false)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                              title="Reject Job"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDeleteJob(j)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                          title="Delete Job posting"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }
                }
              ]}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List of categories available */}
          <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Taxonomy Catalogs</h4>
              
              {/* Select tax to show */}
              <div className="flex gap-1">
                {Object.keys(taxonomies).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveTaxKey(k as any)}
                    className={`px-2 py-1 text-[9px] font-mono font-bold rounded capitalize transition-all cursor-pointer ${
                      activeTaxKey === k ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Displaying active items */}
            <div className="flex flex-wrap gap-2 py-4">
              {taxonomies[activeTaxKey].map((item) => (
                <span 
                  key={item} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-950/45 border border-white/10 rounded-full font-mono text-[10px] text-gray-300"
                >
                  <span>{item}</span>
                  <button 
                    onClick={() => handleRemoveTaxonomyValue(activeTaxKey, item)}
                    className="text-gray-500 hover:text-white ml-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Add taxonomy item */}
          <div>
            <form onSubmit={handleAddTaxonomyValue} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
              <h4 className="font-extrabold text-white flex items-center gap-1">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Register Taxonomy Option</span>
              </h4>

              <p className="text-[10px] text-gray-400">
                Extend platform attributes. Added terms will immediately become selectable option arrays across user dashboards.
              </p>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono capitalize">Active Catalog: {activeTaxKey}</label>
                <input
                  type="text"
                  required
                  value={newTaxValue}
                  onChange={(e) => setNewTaxValue(e.target.value)}
                  placeholder={`e.g. Next.js / AWS Sourced...`}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Append Taxonomy term</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {isCreateJobOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-job-title"
        >
          <div className="max-w-5xl mx-auto bg-neutral-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 md:px-7 py-4 bg-neutral-950/95 backdrop-blur border-b border-white/10">
              <div>
                <h4 id="create-job-title" className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <span>Post New Job</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-1">
                  Publish a genuine vacancy or save it as a draft. Candidate applications must remain free.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateJobOpen(false)}
                disabled={isSubmitting}
                className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                aria-label="Close job form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-5 md:p-7 space-y-7">
              <section className="space-y-4">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Job and employer</h5>
                  <p className="text-[10px] text-gray-500 mt-1">Use the actual hiring company name and complete vacancy details.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Job title *</span>
                    <input
                      required
                      value={jobForm.title}
                      onChange={(e) => updateJobForm("title", e.target.value)}
                      placeholder="e.g. Customer Support Executive"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Actual hiring company *</span>
                    <input
                      required
                      value={jobForm.companyName}
                      onChange={(e) => updateJobForm("companyName", e.target.value)}
                      placeholder="e.g. ABC Private Limited"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs text-gray-300">
                  <span>Complete job description * (minimum 100 characters)</span>
                  <textarea
                    required
                    minLength={100}
                    rows={7}
                    value={jobForm.description}
                    onChange={(e) => updateJobForm("description", e.target.value)}
                    placeholder="Describe responsibilities, eligibility, shift, benefits and application process. Do not add misleading claims or candidate fees."
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none resize-y"
                  />
                  <span className="block text-right text-[10px] text-gray-500">{jobForm.description.length} characters</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Industry</span>
                    <select
                      value={jobForm.industry}
                      onChange={(e) => updateJobForm("industry", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    >
                      <option value="">Select industry</option>
                      {taxonomies.industries.map((industry) => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Department</span>
                    <select
                      value={jobForm.department}
                      onChange={(e) => updateJobForm("department", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    >
                      <option value="">Select department</option>
                      {taxonomies.departments.map((department) => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Number of openings *</span>
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={jobForm.numberOfOpenings}
                      onChange={(e) => updateJobForm("numberOfOpenings", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-white/10 pt-6">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Location and work type</h5>
                  <p className="text-[10px] text-gray-500 mt-1">Use a real job location. Select Remote only when the role can genuinely be performed remotely.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>City *</span>
                    <input
                      required
                      value={jobForm.city}
                      onChange={(e) => updateJobForm("city", e.target.value)}
                      placeholder="Mumbai"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>State *</span>
                    <input
                      required
                      value={jobForm.state}
                      onChange={(e) => updateJobForm("state", e.target.value)}
                      placeholder="Maharashtra"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Country code *</span>
                    <input
                      required
                      maxLength={2}
                      value={jobForm.country}
                      onChange={(e) => updateJobForm("country", e.target.value.toUpperCase())}
                      placeholder="IN"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white uppercase"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Street address</span>
                    <input
                      value={jobForm.streetAddress}
                      onChange={(e) => updateJobForm("streetAddress", e.target.value)}
                      placeholder="Office street address"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Postal code</span>
                    <input
                      value={jobForm.postalCode}
                      onChange={(e) => updateJobForm("postalCode", e.target.value)}
                      placeholder="400001"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Employment type *</span>
                    <select
                      required
                      value={jobForm.employmentType}
                      onChange={(e) => updateJobForm("employmentType", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    >
                      <option value="FULL_TIME">Full-time</option>
                      <option value="PART_TIME">Part-time</option>
                      <option value="CONTRACTOR">Contract</option>
                      <option value="TEMPORARY">Temporary</option>
                      <option value="INTERN">Internship</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Work mode *</span>
                    <select
                      required
                      value={jobForm.workMode}
                      onChange={(e) => updateJobForm("workMode", e.target.value as AdminJobForm["workMode"])}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    >
                      <option value="ONSITE">On-site</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="REMOTE">Remote</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-white/10 pt-6">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Compensation and requirements</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Minimum salary *</span>
                    <input
                      required
                      type="number"
                      min="0"
                      value={jobForm.salaryMin}
                      onChange={(e) => updateJobForm("salaryMin", e.target.value)}
                      placeholder="15000"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Maximum salary *</span>
                    <input
                      required
                      type="number"
                      min="0"
                      value={jobForm.salaryMax}
                      onChange={(e) => updateJobForm("salaryMax", e.target.value)}
                      placeholder="25000"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Currency</span>
                    <input
                      maxLength={3}
                      value={jobForm.salaryCurrency}
                      onChange={(e) => updateJobForm("salaryCurrency", e.target.value.toUpperCase())}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white uppercase"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Salary period</span>
                    <select
                      value={jobForm.salaryPeriod}
                      onChange={(e) => updateJobForm("salaryPeriod", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    >
                      <option value="HOUR">Hourly</option>
                      <option value="DAY">Daily</option>
                      <option value="WEEK">Weekly</option>
                      <option value="MONTH">Monthly</option>
                      <option value="YEAR">Yearly</option>
                    </select>
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs text-gray-300">
                  <span>Skills (comma separated)</span>
                  <input
                    value={jobForm.skills}
                    onChange={(e) => updateJobForm("skills", e.target.value)}
                    placeholder="Customer service, Hindi, English, CRM"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Experience requirements</span>
                    <input
                      value={jobForm.experienceRequirements}
                      onChange={(e) => updateJobForm("experienceRequirements", e.target.value)}
                      placeholder="0-2 years"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Education requirements</span>
                    <input
                      value={jobForm.educationRequirements}
                      onChange={(e) => updateJobForm("educationRequirements", e.target.value)}
                      placeholder="Graduate or equivalent experience"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 border-t border-white/10 pt-6">
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Company, application and publishing</h5>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Company website</span>
                    <input
                      type="url"
                      value={jobForm.companyWebsite}
                      onChange={(e) => updateJobForm("companyWebsite", e.target.value)}
                      placeholder="https://company.example"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Company logo URL</span>
                    <input
                      type="url"
                      value={jobForm.companyLogo}
                      onChange={(e) => updateJobForm("companyLogo", e.target.value)}
                      placeholder="https://company.example/logo.png"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>External apply URL (optional)</span>
                    <input
                      type="url"
                      value={jobForm.applyUrl}
                      onChange={(e) => updateJobForm("applyUrl", e.target.value)}
                      placeholder="Leave blank to use the AIJobs application flow"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs text-gray-300">
                    <span>Application closing date *</span>
                    <input
                      required
                      type="date"
                      value={jobForm.validThrough}
                      onChange={(e) => updateJobForm("validThrough", e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobForm.publishNow}
                    onChange={(e) => updateJobForm("publishNow", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-500"
                  />
                  <span>
                    <span className="block text-xs font-bold text-white">Publish immediately</span>
                    <span className="block text-[10px] text-gray-400 mt-1">
                      Turn this off to save the job as a draft. Published jobs become visible to candidates immediately.
                    </span>
                  </span>
                </label>
              </section>

              <div className="sticky bottom-0 -mx-5 md:-mx-7 -mb-5 md:-mb-7 px-5 md:px-7 py-4 bg-neutral-950/95 backdrop-blur border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateJobOpen(false)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all inline-flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Saving job..."
                      : jobForm.publishNow
                        ? "Publish Job"
                        : "Save Draft"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
