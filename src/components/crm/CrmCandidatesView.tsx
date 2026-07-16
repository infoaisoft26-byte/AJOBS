import { useState } from "react";
import { 
  Users, Search, Filter, Plus, Trash2, Edit, Save, X, 
  Tag, FileText, CheckCircle, Mail, AlertTriangle, MessageSquare, Download, FileDown
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ConsultancyCandidateModel } from "./CrmTypes";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface CrmCandidatesViewProps {
  candidates: ConsultancyCandidateModel[];
  onRefresh: () => void;
  userRole: "Admin" | "Manager" | "Recruiter" | "Viewer";
}

export default function CrmCandidatesView({
  candidates,
  onRefresh,
  userRole
}: CrmCandidatesViewProps) {
  const [selectedCand, setSelectedCand] = useState<ConsultancyCandidateModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Bulk CSV/Excel spreadsheet upload handlers
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleBulkUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const isCsv = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      alert("Unsupported file format. Please upload a .csv, .xlsx, or .xls file.");
      setUploadError("Unsupported file format. Please upload a .csv, .xlsx, or .xls file.");
      setIsUploading(false);
      return;
    }

    try {
      const processParsedData = async (rawData: any[]) => {
        if (!rawData || rawData.length === 0) {
          alert("The uploaded spreadsheet contains no data rows.");
          setUploadError("The uploaded spreadsheet contains no data rows.");
          setIsUploading(false);
          return;
        }

        let addedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          // Case-insensitive cell matches
          const rName = row.Name || row["Candidate Name"] || row["name"] || row["CandidateName"] || "";
          const rEmail = row.Email || row["Email Address"] || row["email"] || row["EmailAddress"] || "";
          const rPhone = row.Phone || row["phone"] || row["Phone Number"] || row["PhoneNumber"] || "";
          const rSkills = row.Skills || row["skills"] || row["Skills Stack"] || row["SkillsStack"] || "";
          const rExp = row.Experience || row["experience"] || "Mid-Level (5+ Years)";
          const rLoc = row.Location || row["location"] || "Bengaluru";
          const rSal = row.ExpectedSalary || row["expectedSalary"] || row["Expected Salary (LPA)"] || row["ExpectedSalaryLpa"] || "12";
          const rNotes = row.Notes || row["notes"] || "Bulk uploaded profile";
          const rTagsText = row.Tags || row["tags"] || "bulk_imported";

          // Validation Logic
          if (!rName || rName.toString().trim().length < 2) {
            errors.push(`Row ${i + 2}: Invalid or missing Name.`);
            skippedCount++;
            continue;
          }

          const emailStr = rEmail.toString().trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailStr || !emailRegex.test(emailStr)) {
            errors.push(`Row ${i + 2} (${rName}): Invalid or missing Email Address.`);
            skippedCount++;
            continue;
          }

          // Map and Save
          const candId = "ccand_" + Math.random().toString(36).substr(2, 9);
          const skillsArr = typeof rSkills === "string" 
            ? rSkills.split(/[,,|]/).map(s => s.trim()).filter(s => s.length > 0)
            : Array.isArray(rSkills) ? rSkills : ["React", "TypeScript"];
          
          const tagsArr = typeof rTagsText === "string"
            ? rTagsText.split(/[,,|]/).map(t => t.trim()).filter(t => t.length > 0)
            : ["bulk_imported"];
          if (!tagsArr.includes("bulk_imported")) {
            tagsArr.push("bulk_imported");
          }

          const parsedCandidateObj: ConsultancyCandidateModel = {
            id: candId,
            name: rName.toString().trim(),
            email: emailStr,
            phone: rPhone ? rPhone.toString().trim() : "+91-9876543210",
            skills: skillsArr,
            experience: rExp.toString().trim(),
            location: rLoc.toString().trim(),
            expectedSalary: rSal.toString().trim(),
            notes: rNotes.toString().trim(),
            tags: tagsArr,
            status: "active",
            resumeScore: 82,
            aiInterviewScore: 78
          };

          // Write to consultancy_candidates (Agency CRM)
          await setDoc(doc(db, "consultancy_candidates", candId), parsedCandidateObj);

          // Write to general candidates
          const generalCandidateObj = {
            id: candId,
            name: parsedCandidateObj.name,
            email: parsedCandidateObj.email,
            title: parsedCandidateObj.skills[0] ? `${parsedCandidateObj.skills[0]} Specialist` : "SDE Professional",
            skills: parsedCandidateObj.skills,
            experience: parsedCandidateObj.experience,
            resumeScore: 82,
            aiInterviewScore: 78,
            expectedSalary: parsedCandidateObj.expectedSalary + " LPA",
            location: parsedCandidateObj.location,
            availability: "Immediate",
            isAiVerified: true,
            tags: parsedCandidateObj.tags
          };
          await setDoc(doc(db, "candidates", candId), generalCandidateObj);

          addedCount++;
        }

        if (errors.length > 0) {
          alert(`Bulk upload completed with warnings:\n- ${addedCount} profiles registered successfully.\n- ${skippedCount} rows skipped due to errors:\n\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? "\n...and more" : ""}`);
        } else {
          alert(`Bulk upload successful! Registered ${addedCount} candidates into Agency CRM & Candidate database via PapaParse.`);
        }
        
        setIsUploading(false);
        onRefresh();
      };

      if (isCsv) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processParsedData(results.data);
          },
          error: (error) => {
            console.error(error);
            alert(`PapaParse failed to process CSV: ${error.message}`);
            setUploadError(`PapaParse failed to process CSV: ${error.message}`);
            setIsUploading(false);
          }
        });
      } else {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstr = evt.target?.result;
            const workbook = XLSX.read(bstr, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const csvData = XLSX.utils.sheet_to_csv(worksheet);
            
            Papa.parse(csvData, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                processParsedData(results.data);
              },
              error: (error) => {
                console.error(error);
                alert(`PapaParse failed to process converted Excel CSV: ${error.message}`);
                setUploadError(`PapaParse failed to process converted Excel CSV: ${error.message}`);
                setIsUploading(false);
              }
            });
          } catch (innerErr) {
            console.error(innerErr);
            alert("Error reading the Excel spreadsheet. Make sure file is not corrupted.");
            setUploadError("Error reading the Excel spreadsheet. Make sure file is not corrupted.");
            setIsUploading(false);
          }
        };
        reader.readAsBinaryString(file);
      }

    } catch (err) {
      console.error(err);
      alert("Failed to read upload file.");
      setUploadError("Failed to read upload file.");
      setIsUploading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const templateData = [
      {
        "Candidate Name": "Aryan Malhotra",
        "Email Address": "aryan.malhotra@gmail.com",
        "Phone": "+91-9988776655",
        "Skills": "React, TypeScript, Node.js",
        "Experience": "Mid-Level (5 Years)",
        "Location": "Delhi NCR (Hybrid)",
        "Expected Salary (LPA)": "18",
        "Tags": "developer, frontend",
        "Notes": "Great match for urgent frontend developer opening."
      },
      {
        "Candidate Name": "Nisha Verma",
        "Email Address": "nisha.verma@outlook.com",
        "Phone": "+91-9876543210",
        "Skills": "Python, Django, AWS, PostgreSQL",
        "Experience": "Senior (8 Years)",
        "Location": "Bengaluru (Onsite)",
        "Expected Salary (LPA)": "26",
        "Tags": "backend, lead",
        "Notes": "Excellent system architecture design score."
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates Template");
    XLSX.writeFile(workbook, "AIJobs_Bulk_Upload_Template.xlsx");
  };

  const downloadCrmCandidateExcel = (cand: ConsultancyCandidateModel) => {
    const dataRow = [{
      "Candidate Name": cand.name,
      "Email Address": cand.email,
      "Phone": cand.phone,
      "Experience": cand.experience,
      "Location": cand.location,
      "Expected Salary (LPA)": cand.expectedSalary,
      "Status": cand.status,
      "Skills": cand.skills.join(", "),
      "Tags": cand.tags.join(", "),
      "Notes": cand.notes
    }];
    const worksheet = XLSX.utils.json_to_sheet(dataRow);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidate Info");
    XLSX.writeFile(workbook, `${cand.name.replace(/\s+/g, "_")}_Profile.xlsx`);
  };

  const downloadCrmCandidateCSV = (cand: ConsultancyCandidateModel) => {
    const headers = ["Name", "Email", "Phone", "Experience", "Location", "Expected Salary", "Status", "Skills", "Tags"];
    const row = [cand.name, cand.email, cand.phone, cand.experience, cand.location, cand.expectedSalary, cand.status, cand.skills.join("|"), cand.tags.join("|")];
    const csvContent = [headers.join(","), row.map(v => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${cand.name.replace(/\s+/g, "_")}_Profile.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCrmCandidatePDF = (cand: ConsultancyCandidateModel) => {
    const htmlContent = `
      <html>
        <head>
          <title>Agency Candidate Dossier - ${cand.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; }
            h1 { color: #1e1b4b; font-size: 24px; margin: 0; }
            .section-title { font-size: 14px; font-weight: bold; color: #4338ca; margin-top: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .value { margin-top: 5px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${cand.name}</h1>
            <p>Agency Registered Candidate Profile • Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="section-title">Contact & Coordinates</div>
          <div class="value">Email: ${cand.email} | Phone: ${cand.phone}</div>
          <div class="value">Location: ${cand.location}</div>

          <div class="section-title">Recruitment Performance Matrices</div>
          <div class="value">Experience: ${cand.experience}</div>
          <div class="value">Expected CTC: ${cand.expectedSalary} LPA</div>
          <div class="value">Skills Stack: ${cand.skills.join(", ")}</div>

          <div class="section-title">Internal Evaluations</div>
          <div class="value">Status: <strong>${cand.status.toUpperCase()}</strong></div>
          <p style="font-size: 13px; font-style: italic;">Notes: ${cand.notes || "No candidate notes recorded."}</p>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [status, setStatus] = useState<"active" | "saved" | "shortlisted" | "rejected">("active");

  const isReadOnly = userRole === "Viewer";

  const handleOpenAdd = () => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot create candidate entries.");
      return;
    }
    setName("");
    setEmail("");
    setPhone("");
    setSkillsText("React, Node.js");
    setExperience("Mid-Level (5+ Years)");
    setLocation("Bengaluru, India");
    setExpectedSalary("24");
    setNotes("");
    setTagsText("Developer");
    setStatus("active");
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleOpenEdit = (cand: ConsultancyCandidateModel) => {
    if (isReadOnly) {
      alert("Role Permission Restriction: Viewers cannot edit candidate profiles.");
      return;
    }
    setName(cand.name);
    setEmail(cand.email);
    setPhone(cand.phone);
    setSkillsText(cand.skills.join(", "));
    setExperience(cand.experience);
    setLocation(cand.location);
    setExpectedSalary(cand.expectedSalary);
    setNotes(cand.notes);
    setTagsText(cand.tags.join(", "));
    setStatus(cand.status);
    setSelectedCand(cand);
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    try {
      const candId = isEditing && selectedCand 
        ? selectedCand.id 
        : "ccand_" + Math.random().toString(36).substr(2, 9);

      const skills = skillsText.split(",").map(s => s.trim()).filter(s => s.length > 0);
      const tags = tagsText.split(",").map(t => t.trim()).filter(t => t.length > 0);

      const candObj: ConsultancyCandidateModel = {
        id: candId,
        name,
        email,
        phone,
        skills,
        experience,
        location,
        expectedSalary,
        notes,
        tags,
        status,
        resumeScore: isEditing && selectedCand ? selectedCand.resumeScore : 80,
        aiInterviewScore: isEditing && selectedCand ? selectedCand.aiInterviewScore : 75
      };

      await setDoc(doc(db, "consultancy_candidates", candId), candObj);
      alert(isEditing ? "Candidate profile updated in Firestore!" : "New Candidate profile created successfully!");
      setIsAdding(false);
      setIsEditing(false);
      setSelectedCand(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Bulk operations
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCandidates.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidates.map(c => c.id));
    }
  };

  const handleBulkStatusChange = async (newStatus: "saved" | "shortlisted" | "rejected") => {
    if (isReadOnly) return;
    if (selectedIds.length === 0) {
      alert("Please select at least one candidate first.");
      return;
    }

    try {
      for (const id of selectedIds) {
        const original = candidates.find(c => c.id === id);
        if (original) {
          await setDoc(doc(db, "consultancy_candidates", id), {
            ...original,
            status: newStatus
          });
        }
      }
      alert(`Bulk updated ${selectedIds.length} candidate statuses to: ${newStatus.toUpperCase()}`);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCand = async (id: string) => {
    if (userRole !== "Admin" && userRole !== "Manager") {
      alert("Role Permission Restriction: Only Administrators or Managers can delete candidates.");
      return;
    }
    if (!confirm("Are you sure you want to remove this candidate from the database?")) return;

    try {
      await deleteDoc(doc(db, "consultancy_candidates", id));
      alert("Candidate deleted from database.");
      if (selectedCand?.id === id) {
        setSelectedCand(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = cand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.skills.some(sk => sk.toLowerCase().includes(searchQuery.toLowerCase())) ||
      cand.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesExp = filterExp ? cand.experience.toLowerCase().includes(filterExp.toLowerCase()) : true;
    const matchesStatus = filterStatus ? cand.status === filterStatus : true;

    return matchesSearch && matchesExp && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="crm-candidates-view">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Candidates CRM Registry</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Search, tag, filter profiles, and initiate bulk status transitions.</p>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hidden spreadsheet input */}
            <input
              type="file"
              id="bulk-spreadsheet-input"
              accept=".xlsx,.xls,.csv"
              onChange={handleBulkUploadFileChange}
              className="hidden"
            />
            
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#090d16] hover:bg-neutral-900 text-gray-400 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              title="Get Sample Template"
            >
              <FileDown className="w-3.5 h-3.5 text-pink-400" />
              <span>Get Sample XLS</span>
            </button>

            <button
              onClick={() => document.getElementById("bulk-spreadsheet-input")?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-pink-600/10 hover:bg-pink-600/20 text-pink-400 border border-pink-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Bulk Upload</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Candidate</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, skill, location..."
            className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
          />
        </div>

        <div>
          <select
            value={filterExp}
            onChange={e => setFilterExp(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
          >
            <option value="">Filter by Experience</option>
            <option value="Senior">Senior (8+ Years)</option>
            <option value="Mid">Mid-Level (5+ Years)</option>
            <option value="Junior">Junior (1-3 Years)</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-white"
          >
            <option value="">Filter by Stage Status</option>
            <option value="active">Active</option>
            <option value="saved">Saved / Pipeline</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Bulk Action Trigger */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono shrink-0">Bulk:</span>
          <button
            onClick={() => handleBulkStatusChange("shortlisted")}
            disabled={selectedIds.length === 0 || isReadOnly}
            className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold rounded-lg transition-all disabled:opacity-40 cursor-pointer"
          >
            Shortlist
          </button>
          <button
            onClick={() => handleBulkStatusChange("rejected")}
            disabled={selectedIds.length === 0 || isReadOnly}
            className="flex-1 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold rounded-lg transition-all disabled:opacity-40 cursor-pointer"
          >
            Reject
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Candidates Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 text-gray-400 font-mono border-b border-white/5 uppercase tracking-wider text-[10px]">
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={filteredCandidates.length > 0 && selectedIds.length === filteredCandidates.length}
                        onChange={handleSelectAll}
                        className="rounded bg-neutral-900 border-white/10"
                      />
                    </th>
                    <th className="p-4">Candidate Profile</th>
                    <th className="p-4">Key Tech Skills</th>
                    <th className="p-4 text-center">ATS Score</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map(cand => (
                      <tr 
                        key={cand.id}
                        onClick={() => { setSelectedCand(cand); setIsAdding(false); setIsEditing(false); }}
                        className={`hover:bg-white/5 transition-all cursor-pointer ${
                          selectedCand?.id === cand.id ? "bg-indigo-500/10" : ""
                        }`}
                      >
                        <td className="p-4" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(cand.id)}
                            onChange={() => handleToggleSelect(cand.id)}
                            className="rounded bg-neutral-900 border-white/10 text-indigo-600"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white">{cand.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{cand.location} • {cand.experience}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {cand.skills.slice(0, 3).map((sk, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-gray-300 rounded border border-white/5 font-mono">{sk}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-indigo-400">
                          {cand.resumeScore || 75}%
                        </td>
                        <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(cand)}
                              className="p-1.5 bg-white/5 hover:bg-indigo-600/20 text-gray-400 hover:text-indigo-400 rounded transition-all"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCand(cand.id)}
                              className="p-1.5 bg-white/5 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">No candidates matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {isAdding || isEditing ? (
            <form onSubmit={handleSaveCandidate} className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-white">{isEditing ? "Modify Candidate Profile" : "Register Candidate"}</h4>
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
                  <label className="block text-gray-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Aryan Sharma"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Email ID</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="aryan@pm.com"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 99999..."
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Experience Tier</label>
                    <input
                      type="text"
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      placeholder="e.g. Senior (8 Years)"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Current Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Bengaluru"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Expected CTC (LPA)</label>
                    <input
                      type="number"
                      value={expectedSalary}
                      onChange={e => setExpectedSalary(e.target.value)}
                      placeholder="42"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Stage Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                    >
                      <option value="active">Active</option>
                      <option value="saved">Saved</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Skills (Comma separated) *</label>
                  <input
                    type="text"
                    required
                    value={skillsText}
                    onChange={e => setSkillsText(e.target.value)}
                    placeholder="React, TypeScript, AWS"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Segmentation Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={e => setTagsText(e.target.value)}
                    placeholder="Architect, High CTC, Immediate Joiner"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Recruiter Audit Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Outstanding interview metrics. Strong system architect mindset."
                    className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-white resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Candidate Profile</span>
              </button>
            </form>
          ) : selectedCand ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 animate-in fade-in duration-200">
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">CRM Profile</span>
                  <h4 className="font-extrabold text-base text-white">{selectedCand.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono">{selectedCand.location} • Expected CTC: <strong>₹{selectedCand.expectedSalary} LPA</strong></p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleOpenEdit(selectedCand)}
                    className="p-1.5 bg-white/5 hover:bg-indigo-600 text-white rounded text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/5 font-mono text-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Resume Score</span>
                    <span className="text-sm font-extrabold text-indigo-400">{selectedCand.resumeScore || 70}%</span>
                  </div>
                  <div className="space-y-0.5 border-l border-white/5">
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Interview Index</span>
                    <span className="text-sm font-extrabold text-purple-400">{selectedCand.aiInterviewScore || 65}%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-400">Technical Skills Stack:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCand.skills.map((sk, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 bg-neutral-900 border border-white/10 text-gray-300 rounded font-mono">{sk}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-gray-400">Segmentation Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCand.tags.map((tg, idx) => (
                      <span key={idx} className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md font-mono flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{tg}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-white/5 pt-3">
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Audit Notes:</span>
                  </span>
                  <p className="p-3 bg-neutral-950/40 rounded-xl border border-white/5 text-gray-300 leading-relaxed italic text-[11px]">
                    {selectedCand.notes || "No candidate evaluation notes added yet."}
                  </p>
                </div>

                {/* Premium Dossier Download Actions */}
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Dossier Export (Own Data Only)</span>
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    <button
                      onClick={() => downloadCrmCandidateExcel(selectedCand)}
                      className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-emerald-400 text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Excel</span>
                    </button>
                    <button
                      onClick={() => downloadCrmCandidateCSV(selectedCand)}
                      className="py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white border border-blue-500/20 text-blue-400 text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={() => downloadCrmCandidatePDF(selectedCand)}
                      className="py-1.5 px-2 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 text-indigo-400 text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-6 rounded-2xl text-center space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="font-bold text-sm text-gray-300">Select Candidate Account</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Choose an active profile from the registry table to track system resume scores, evaluate skills, add recruiter notes, or tag categories.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
