import React, { useState } from "react";
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Users, 
  Briefcase,
  AlertCircle,
  HelpCircle,
  Eye,
  FileDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { RecruitmentCandidate, RecruitmentJob } from "../../../types/recruitment";
import { 
  downloadExcelTemplate, 
  parseAndValidateCandidateExcel, 
  parseAndValidateJobExcel, 
  executeCandidateBatchImport, 
  executeJobBatchImport, 
  CandidateExcelRow, 
  JobExcelRow 
} from "../../../services/recruitmentService";

interface ExcelImportCenterTabProps {
  candidates: RecruitmentCandidate[];
  jobs: RecruitmentJob[];
  onImportCompleted: () => void;
  adminUser?: { name: string; email: string };
}

export default function ExcelImportCenterTab({
  candidates,
  jobs,
  onImportCompleted,
  adminUser
}: ExcelImportCenterTabProps) {
  const [importType, setImportType] = useState<"CANDIDATES" | "JOBS">("CANDIDATES");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  // Candidate parse results
  const [candParseResult, setCandParseResult] = useState<{
    allRows: CandidateExcelRow[];
    validRows: CandidateExcelRow[];
    invalidRows: CandidateExcelRow[];
    duplicateRows: CandidateExcelRow[];
  } | null>(null);

  // Job parse results
  const [jobParseResult, setJobParseResult] = useState<{
    allRows: JobExcelRow[];
    validRows: JobExcelRow[];
    invalidRows: JobExcelRow[];
    duplicateRows: JobExcelRow[];
  } | null>(null);

  const [activePreviewTab, setActivePreviewTab] = useState<"VALID" | "INVALID" | "DUPLICATES" | "ALL">("VALID");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });
  const [successBanner, setSuccessBanner] = useState("");

  // File Upload & Parse Trigger
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setParseError("");
    setSuccessBanner("");
    setIsParsing(true);

    try {
      if (importType === "CANDIDATES") {
        const result = await parseAndValidateCandidateExcel(file, candidates);
        setCandParseResult(result);
        setJobParseResult(null);
        setActivePreviewTab(result.validRows.length > 0 ? "VALID" : "ALL");
      } else {
        const result = await parseAndValidateJobExcel(file, jobs);
        setJobParseResult(result);
        setCandParseResult(null);
        setActivePreviewTab(result.validRows.length > 0 ? "VALID" : "ALL");
      }
    } catch (err: any) {
      console.error("Excel parse failure:", err);
      setParseError(err.message || "Failed to parse Excel sheet. Please ensure valid .xlsx, .xls, or .csv format.");
      setCandParseResult(null);
      setJobParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Reset file selection
  const handleReset = () => {
    setSelectedFile(null);
    setCandParseResult(null);
    setJobParseResult(null);
    setParseError("");
    setSuccessBanner("");
  };

  // Switch between candidate and job mode
  const handleSwitchMode = (type: "CANDIDATES" | "JOBS") => {
    setImportType(type);
    handleReset();
  };

  // Download error report in Excel
  const handleDownloadErrorReport = () => {
    const workbook = XLSX.utils.book_new();

    if (importType === "CANDIDATES" && candParseResult) {
      const errorRows = [...candParseResult.invalidRows, ...candParseResult.duplicateRows].map((r) => ({
        "Excel Row #": r.rawRowNumber,
        "Candidate Name": r.fullName,
        "Email Address": r.email,
        "Phone Number": r.phone,
        "Validation Status": r.isDuplicate ? "DUPLICATE" : "INVALID",
        "Reason / Error Details": r.validationError
      }));
      const worksheet = XLSX.utils.json_to_sheet(errorRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Validation_Errors");
      XLSX.writeFile(workbook, `Candidate_Import_Errors_${Date.now()}.xlsx`);
    } else if (importType === "JOBS" && jobParseResult) {
      const errorRows = [...jobParseResult.invalidRows, ...jobParseResult.duplicateRows].map((r) => ({
        "Excel Row #": r.rawRowNumber,
        "Job Title": r.title,
        "Company Name": r.companyName,
        "Validation Status": r.isDuplicate ? "DUPLICATE" : "INVALID",
        "Reason / Error Details": r.validationError
      }));
      const worksheet = XLSX.utils.json_to_sheet(errorRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Validation_Errors");
      XLSX.writeFile(workbook, `Job_Import_Errors_${Date.now()}.xlsx`);
    }
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setParseError("");

    try {
      if (importType === "CANDIDATES" && candParseResult) {
        setImportProgress({ processed: 0, total: candParseResult.validRows.length });
        const batch = await executeCandidateBatchImport({
          validRows: candParseResult.validRows,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          adminUser,
          onProgress: (processed, total) => setImportProgress({ processed, total })
        });
        setSuccessBanner(`Successfully imported ${batch.successCount} candidate profiles with sequential AIJ-CAN IDs! (Batch: ${batch.batchId})`);
      } else if (importType === "JOBS" && jobParseResult) {
        setImportProgress({ processed: 0, total: jobParseResult.validRows.length });
        const batch = await executeJobBatchImport({
          validRows: jobParseResult.validRows,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          adminUser,
          onProgress: (processed, total) => setImportProgress({ processed, total })
        });
        setSuccessBanner(`Successfully imported ${batch.successCount} job vacancies with sequential AIJ-JOB IDs! (Batch: ${batch.batchId})`);
      }

      onImportCompleted();
    } catch (err: any) {
      console.error("Batch import error:", err);
      setParseError(err.message || "Batch write encountered an error.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                EXCEL IMPORT CENTER
              </span>
              <span className="text-xs text-slate-400">High-throughput Transactional Ingestion</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Bulk Database Import & Schema Validation Center
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Upload candidate rosters or bulk job postings (.xlsx / .csv). Includes automatic pre-validation, duplicate suppression, error reports, and atomic sequential ID generation.
            </p>
          </div>

          {/* Download Template Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => downloadExcelTemplate("candidates")}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-xl border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Candidate Template (.xlsx)</span>
            </button>

            <button
              onClick={() => downloadExcelTemplate("jobs")}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Job Template (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 pt-2 text-xs overflow-x-auto">
          <button
            onClick={() => handleSwitchMode("CANDIDATES")}
            className={`pb-3 px-4 font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              importType === "CANDIDATES"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Import Candidate Database</span>
          </button>

          <button
            onClick={() => handleSwitchMode("JOBS")}
            className={`pb-3 px-4 font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              importType === "JOBS"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Import Job Openings</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-[11px] font-semibold border border-emerald-500/40 cursor-pointer self-start sm:self-auto min-h-[36px]"
          >
            Import Another File
          </button>
        </div>
      )}

      {parseError && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-300 text-xs flex items-center space-x-2.5 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!candParseResult && !jobParseResult && !isParsing && (
        <div className="p-8 sm:p-12 bg-slate-900 border-2 border-dashed border-slate-700/80 hover:border-blue-500/60 rounded-2xl text-center space-y-4 transition-all group">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">
              Drag & Drop your {importType === "CANDIDATES" ? "Candidates" : "Jobs"} Excel File
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Supports <span className="text-slate-200 font-mono">.xlsx, .xls, .csv</span>. Validates required schema fields, duplicate entries, and syntax before generating sequential IDs.
            </p>
          </div>

          <label className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-500/20 transition-all cursor-pointer min-h-[44px] leading-[24px]">
            Browse File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
              }}
            />
          </label>
        </div>
      )}

      {/* Parsing Spinner */}
      {isParsing && (
        <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-white">Scanning & Validating Excel Rows...</h3>
          <p className="text-xs text-slate-400">Performing duplicate checks against live Firestore database.</p>
        </div>
      )}

      {/* Validation Summary & Preview */}
      {(candParseResult || jobParseResult) && (
        <div className="space-y-5">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-slate-400 font-mono uppercase text-[10px]">Total Scanned</span>
              <p className="text-xl sm:text-2xl font-bold text-white font-mono">
                {importType === "CANDIDATES" ? candParseResult?.allRows.length : jobParseResult?.allRows.length}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-emerald-400 font-mono uppercase text-[10px]">Valid & Ready</span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                {importType === "CANDIDATES" ? candParseResult?.validRows.length : jobParseResult?.validRows.length}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-rose-400 font-mono uppercase text-[10px]">Invalid / Errors</span>
              <p className="text-xl sm:text-2xl font-bold text-rose-400 font-mono">
                {importType === "CANDIDATES" ? candParseResult?.invalidRows.length : jobParseResult?.invalidRows.length}
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-amber-400 font-mono uppercase text-[10px]">Duplicates</span>
              <p className="text-xl sm:text-2xl font-bold text-amber-400 font-mono">
                {importType === "CANDIDATES" ? candParseResult?.duplicateRows.length : jobParseResult?.duplicateRows.length}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-white block sm:inline truncate">{selectedFile?.name}</span>
                <span className="text-slate-400 text-[11px] sm:ml-2">({((selectedFile?.size || 0) / 1024).toFixed(1)} KB)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {((importType === "CANDIDATES" 
                ? (candParseResult?.invalidRows.length || 0) + (candParseResult?.duplicateRows.length || 0) 
                : (jobParseResult?.invalidRows.length || 0) + (jobParseResult?.duplicateRows.length || 0)) > 0) && (
                <button
                  onClick={handleDownloadErrorReport}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-medium flex items-center space-x-1.5 transition-all cursor-pointer min-h-[40px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Error Report</span>
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={isImporting}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteImport}
                disabled={isImporting || (importType === "CANDIDATES" ? (candParseResult?.validRows.length || 0) === 0 : (jobParseResult?.validRows.length || 0) === 0)}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer min-h-[40px]"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing ({importProgress.processed}/{importProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Import {importType === "CANDIDATES" ? candParseResult?.validRows.length : jobParseResult?.validRows.length} Valid Records
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Navigation Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
            <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setActivePreviewTab("VALID")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activePreviewTab === "VALID"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Valid Rows ({importType === "CANDIDATES" ? candParseResult?.validRows.length : jobParseResult?.validRows.length})
              </button>

              <button
                onClick={() => setActivePreviewTab("INVALID")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activePreviewTab === "INVALID"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Invalid Rows ({importType === "CANDIDATES" ? candParseResult?.invalidRows.length : jobParseResult?.invalidRows.length})
              </button>

              <button
                onClick={() => setActivePreviewTab("DUPLICATES")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activePreviewTab === "DUPLICATES"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Duplicates ({importType === "CANDIDATES" ? candParseResult?.duplicateRows.length : jobParseResult?.duplicateRows.length})
              </button>

              <button
                onClick={() => setActivePreviewTab("ALL")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activePreviewTab === "ALL"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Rows ({importType === "CANDIDATES" ? candParseResult?.allRows.length : jobParseResult?.allRows.length})
              </button>
            </div>

            {/* CANDIDATE PREVIEW */}
            {importType === "CANDIDATES" && candParseResult && (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Row #</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Candidate Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Target Role</th>
                        <th className="p-3">Exp (Yrs)</th>
                        <th className="p-3">Key Skills</th>
                        <th className="p-3">Remarks / Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(activePreviewTab === "VALID"
                        ? candParseResult.validRows
                        : activePreviewTab === "INVALID"
                        ? candParseResult.invalidRows
                        : activePreviewTab === "DUPLICATES"
                        ? candParseResult.duplicateRows
                        : candParseResult.allRows
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/40">
                          <td className="p-3 font-mono text-slate-400">{row.rawRowNumber}</td>
                          <td className="p-3">
                            {row.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Valid
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Duplicate
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                Error
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-white">{row.fullName}</td>
                          <td className="p-3 font-mono text-slate-300">{row.email}</td>
                          <td className="p-3 font-mono text-slate-400">{row.phone || "-"}</td>
                          <td className="p-3 text-slate-300">{row.targetRole}</td>
                          <td className="p-3 text-slate-300">{row.totalExperienceYears || 0}</td>
                          <td className="p-3 text-slate-400 truncate max-w-xs">{row.keySkills.join(", ")}</td>
                          <td className="p-3 text-slate-400 text-[11px]">{row.validationError || "Ready for ingestion"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card-based Preview (< md screens: 320px - 767px) */}
                <div className="block md:hidden divide-y divide-slate-800 max-h-96 overflow-y-auto">
                  {(activePreviewTab === "VALID"
                    ? candParseResult.validRows
                    : activePreviewTab === "INVALID"
                    ? candParseResult.invalidRows
                    : activePreviewTab === "DUPLICATES"
                    ? candParseResult.duplicateRows
                    : candParseResult.allRows
                  ).map((row, idx) => (
                    <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400 text-[11px]">Row #{row.rawRowNumber}</span>
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Valid
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Duplicate
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Error
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-white block text-xs">{row.fullName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">{row.email}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                        <span>{row.targetRole}</span>
                        <span>•</span>
                        <span>{row.totalExperienceYears || 0} Yrs Exp</span>
                      </div>

                      {row.keySkills.length > 0 && (
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          Skills: {row.keySkills.join(", ")}
                        </div>
                      )}

                      {row.validationError && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                          {row.validationError}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* JOB PREVIEW */}
            {importType === "JOBS" && jobParseResult && (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="p-3">Row #</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Job Title</th>
                        <th className="p-3">Company</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">Exp (Min-Max)</th>
                        <th className="p-3">Openings</th>
                        <th className="p-3">Required Skills</th>
                        <th className="p-3">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(activePreviewTab === "VALID"
                        ? jobParseResult.validRows
                        : activePreviewTab === "INVALID"
                        ? jobParseResult.invalidRows
                        : activePreviewTab === "DUPLICATES"
                        ? jobParseResult.duplicateRows
                        : jobParseResult.allRows
                      ).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/40">
                          <td className="p-3 font-mono text-slate-400">{row.rawRowNumber}</td>
                          <td className="p-3">
                            {row.isValid ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Valid
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Duplicate
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                Error
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-white">{row.title}</td>
                          <td className="p-3 text-slate-300">{row.companyName}</td>
                          <td className="p-3 text-slate-300">{row.location}</td>
                          <td className="p-3 text-slate-300">{row.workMode}</td>
                          <td className="p-3 text-slate-300">{row.minimumExperience} - {row.maximumExperience} Yrs</td>
                          <td className="p-3 text-slate-300">{row.openings}</td>
                          <td className="p-3 text-slate-400 truncate max-w-xs">{row.skillsRequired.join(", ")}</td>
                          <td className="p-3 text-slate-400 text-[11px]">{row.validationError || "Ready for ingestion"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card-based Preview (< md screens: 320px - 767px) */}
                <div className="block md:hidden divide-y divide-slate-800 max-h-96 overflow-y-auto">
                  {(activePreviewTab === "VALID"
                    ? jobParseResult.validRows
                    : activePreviewTab === "INVALID"
                    ? jobParseResult.invalidRows
                    : activePreviewTab === "DUPLICATES"
                    ? jobParseResult.duplicateRows
                    : jobParseResult.allRows
                  ).map((row, idx) => (
                    <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400 text-[11px]">Row #{row.rawRowNumber}</span>
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Valid
                          </span>
                        ) : row.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Duplicate
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Error
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="font-bold text-white block text-xs">{row.title}</span>
                        <span className="text-slate-300 text-[11px]">{row.companyName} • {row.location} ({row.workMode})</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400">
                        <span>Exp: {row.minimumExperience}-{row.maximumExperience} Yrs</span>
                        <span>•</span>
                        <span>{row.openings} Opening{row.openings > 1 ? "s" : ""}</span>
                      </div>

                      {row.skillsRequired.length > 0 && (
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          Skills: {row.skillsRequired.join(", ")}
                        </div>
                      )}

                      {row.validationError && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                          {row.validationError}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
