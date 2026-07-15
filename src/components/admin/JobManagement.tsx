import { useState } from "react";
import { 
  Briefcase, Search, Filter, ShieldAlert, CheckCircle, Trash2, 
  Sparkles, Star, MapPin, Tag, Building, Grid, Plus, X 
} from "lucide-react";
import { JobPosting } from "../../types";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import InteractiveExportTable from "../InteractiveExportTable";

interface JobManagementProps {
  jobs: JobPosting[];
  onRefresh: () => void;
}

export default function JobManagement({
  jobs,
  onRefresh
}: JobManagementProps) {
  const [activeTab, setActiveTab] = useState<"database" | "taxonomy">("database");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const nextStatus = approve ? "Live" : "Rejected";
    try {
      // 1. Sync jobs
      await setDoc(doc(db, "jobs", job.id), {
        status: nextStatus
      }, { merge: true });

      // 2. Sync company_jobs
      try {
        await setDoc(doc(db, "company_jobs", job.id), {
          status: nextStatus
        }, { merge: true });
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
                  render: (val: any, j: JobPosting) => (
                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase border ${
                      j.status === "Live" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" :
                      j.status === "Pending Approval" ? "bg-amber-500/10 text-amber-400 border-amber-500/25 animate-pulse" :
                      j.status === "Draft" ? "bg-blue-500/10 text-blue-400 border-blue-500/25" :
                      j.status === "Approved" ? "bg-purple-500/10 text-purple-400 border-purple-500/25" :
                      j.status === "Closed" ? "bg-neutral-500/10 text-neutral-400 border-neutral-500/25" :
                      j.status === "Rejected" ? "bg-red-500/10 text-red-400 border-red-500/25" :
                      "bg-gray-500/10 text-gray-400 border-gray-500/25"
                    }`}>
                      {j.status || "Draft"}
                    </span>
                  )
                },
                {
                  key: "actions",
                  label: "Actions",
                  sortable: false,
                  render: (val: any, j: JobPosting) => {
                    const isFeat = (j as any).isFeatured || false;
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

                        {j.status === "Pending Approval" && (
                          <>
                            <button
                              onClick={() => handleApproveJob(j, true)}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-lg transition-all cursor-pointer inline-flex items-center"
                              title="Approve Job"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
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

    </div>
  );
}
