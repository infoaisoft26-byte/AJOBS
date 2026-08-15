import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";
import { 
  FileSpreadsheet, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  Calendar, 
  Download, 
  ShieldCheck,
  Clock,
  Search,
  Filter,
  XCircle,
  Eye,
  X,
  FileDown,
  Activity,
  Layers
} from "lucide-react";
import * as XLSX from "xlsx";
import { ImportBatchRecord, RecruitmentAuditLog } from "../../../types/recruitment";

export default function ImportHistoryTab() {
  const [batches, setBatches] = useState<ImportBatchRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<RecruitmentAuditLog[]>([]);
  const [activeSubView, setActiveSubView] = useState<"BATCHES" | "AUDIT_LOGS">("BATCHES");
  const [loading, setLoading] = useState(true);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Inspection Modal
  const [selectedBatchForInspection, setSelectedBatchForInspection] = useState<ImportBatchRecord | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    setLoading(true);

    // 1. Real-time listener for importBatches collection
    const batchesUnsub = onSnapshot(collection(db, "importBatches"), (snapshot) => {
      const bList: ImportBatchRecord[] = [];
      snapshot.forEach((docSnap) => {
        bList.push({ id: docSnap.id, ...docSnap.data() } as ImportBatchRecord);
      });
      // Sort newest first
      setBatches(bList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    }, (err) => {
      console.warn("[ImportHistoryTab] Batches snapshot notice:", err);
      setLoading(false);
    });

    // 2. Real-time listener for audit_logs collection
    const auditUnsub = onSnapshot(collection(db, "audit_logs"), (snapshot) => {
      const logs: RecruitmentAuditLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as RecruitmentAuditLog);
      });
      setAuditLogs(logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 150));
    }, (err) => {
      console.warn("[ImportHistoryTab] Audit snapshot notice:", err);
    });

    return () => {
      batchesUnsub();
      auditUnsub();
    };
  }, []);

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !term ||
      b.batchId.toLowerCase().includes(term) ||
      b.fileName.toLowerCase().includes(term) ||
      b.importedBy.toLowerCase().includes(term) ||
      (b.importedByEmail && b.importedByEmail.toLowerCase().includes(term));

    const matchesType = typeFilter === "ALL" || b.type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      !term ||
      log.action.toLowerCase().includes(term) ||
      log.entityName.toLowerCase().includes(term) ||
      log.entityId.toLowerCase().includes(term) ||
      log.performedBy.toLowerCase().includes(term) ||
      log.details.toLowerCase().includes(term)
    );
  });

  // KPI Calculations
  const totalBatchesCount = batches.length;
  const totalRowsImported = batches.reduce((sum, b) => sum + (b.totalRows || 0), 0);
  const totalSuccessCount = batches.reduce((sum, b) => sum + (b.successCount || 0), 0);
  const totalFailureCount = batches.reduce((sum, b) => sum + (b.failureCount || 0), 0);
  const overallSuccessRate = totalRowsImported > 0 ? ((totalSuccessCount / totalRowsImported) * 100).toFixed(1) : "100";

  // Export Batch History to Excel
  const handleExportBatchHistory = () => {
    const exportData = batches.map((b) => ({
      "Batch ID": b.batchId,
      "Import Type": b.type === "CANDIDATE_IMPORT" ? "Candidates" : "Job Openings",
      "File Name": b.fileName,
      "Total Rows": b.totalRows,
      "Success Count": b.successCount,
      "Failure Count": b.failureCount,
      "Duplicate Count": b.duplicateCount || 0,
      "Status": b.status,
      "Imported By": b.importedBy,
      "Imported By Email": b.importedByEmail,
      "Timestamp": new Date(b.createdAt).toLocaleString("en-IN")
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Import_Batches");
    XLSX.writeFile(workbook, `AIJOBS_Import_Batches_Audit_${Date.now()}.xlsx`);
  };

  // Export Batch Error Details
  const handleDownloadBatchErrors = (batch: ImportBatchRecord) => {
    if (!batch.errors || batch.errors.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(batch.errors.map((e) => ({
      "Batch ID": batch.batchId,
      "File Name": batch.fileName,
      "Row Number": e.rowNumber,
      "Row Identifier": e.identifier || "N/A",
      "Failure Reason": e.reason
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Batch_Errors");
    XLSX.writeFile(workbook, `Batch_Errors_${batch.batchId}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Operations Header Banner */}
      <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                IMPORT & AUDIT TRAIL
              </span>
              <span className="flex items-center text-xs text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                Live Firestore Ingestion Sync
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Excel Import Batches & Operations Audit Tracker
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl">
              Real-time Firestore audit tracking for bulk candidate rosters, job vacancies, atomic sequential ID logs (<span className="text-blue-400 font-mono">AIJ-IMP</span>), and operator event timestamps.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleExportBatchHistory}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Sheet</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Total Batches</span>
            <p className="text-xl font-bold text-white font-mono">{totalBatchesCount}</p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Records Ingested</span>
            <p className="text-xl font-bold text-blue-400 font-mono">{totalRowsImported}</p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Success Rate</span>
            <p className="text-xl font-bold text-emerald-400 font-mono">{overallSuccessRate}%</p>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Failed Rows</span>
            <p className="text-xl font-bold text-rose-400 font-mono">{totalFailureCount}</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-800 pt-2 text-xs">
          <button
            onClick={() => setActiveSubView("BATCHES")}
            className={`pb-3 px-4 font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeSubView === "BATCHES"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Import Batches ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubView("AUDIT_LOGS")}
            className={`pb-3 px-4 font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
              activeSubView === "AUDIT_LOGS"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Recruitment Activity Audit ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Matrix */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeSubView === "BATCHES" ? "Search batch ID, filename, admin..." : "Search action, entity, user..."}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {activeSubView === "BATCHES" && (
          <>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Import Types</option>
                <option value="CANDIDATE_IMPORT">Candidate Imports</option>
                <option value="JOB_IMPORT">Job Opening Imports</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Completed">Completed (100% Success)</option>
                <option value="Partial">Partial (Some Errors)</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* VIEW 1: IMPORT BATCHES (Responsive Grid-to-Card Transformation) */}
      {activeSubView === "BATCHES" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
          {/* Desktop Table View (hidden on small viewports < md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Batch ID</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">File Details</th>
                  <th className="p-3.5 text-center">Total</th>
                  <th className="p-3.5 text-center">Success</th>
                  <th className="p-3.5 text-center">Failed</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Operator</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-950/40">
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{b.batchId}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.type === "CANDIDATE_IMPORT" 
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" 
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {b.type === "CANDIDATE_IMPORT" ? "Candidates" : "Job Openings"}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-[200px]">
                      <span className="font-semibold text-white truncate block">{b.fileName}</span>
                      {b.fileSize && <span className="text-[10px] text-slate-500 font-mono">{(b.fileSize / 1024).toFixed(1)} KB</span>}
                    </td>
                    <td className="p-3.5 font-mono text-slate-200 text-center font-bold">{b.totalRows}</td>
                    <td className="p-3.5 font-mono text-emerald-400 text-center font-bold">{b.successCount}</td>
                    <td className="p-3.5 font-mono text-center">
                      <span className={b.failureCount > 0 ? "text-rose-400 font-bold" : "text-slate-500"}>
                        {b.failureCount}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.status === "Completed" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                          : b.status === "Partial"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-slate-300 block font-medium">{b.importedBy}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{b.importedByEmail}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedBatchForInspection(b)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-medium inline-flex items-center space-x-1 cursor-pointer transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid-to-Card Transformation (< md screens: 320px - 767px) */}
          <div className="block md:hidden divide-y divide-slate-800">
            {filteredBatches.map((b) => (
              <div key={b.id} className="p-4 space-y-3 hover:bg-slate-950/40 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-emerald-400 text-sm block">{b.batchId}</span>
                    <span className="text-slate-200 font-semibold text-xs line-clamp-1 mt-0.5">{b.fileName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                    b.status === "Completed" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                      : b.status === "Partial"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}>
                    {b.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">Total</span>
                    <span className="font-mono font-bold text-white text-xs">{b.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">Success</span>
                    <span className="font-mono font-bold text-emerald-400 text-xs">{b.successCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">Failed</span>
                    <span className={`font-mono font-bold text-xs ${b.failureCount > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {b.failureCount}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    b.type === "CANDIDATE_IMPORT" 
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30" 
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {b.type === "CANDIDATE_IMPORT" ? "Candidates" : "Jobs"}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(b.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 truncate max-w-[180px]">By: {b.importedBy}</span>
                  <button
                    onClick={() => setSelectedBatchForInspection(b)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold border border-slate-700 flex items-center space-x-1 cursor-pointer min-h-[36px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBatches.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 italic space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No bulk Excel import batches recorded yet.</p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: AUDIT LOGS (Responsive Grid-to-Card Transformation) */}
      {activeSubView === "AUDIT_LOGS" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Action Event</th>
                  <th className="p-3.5">Target Entity</th>
                  <th className="p-3.5">Operation Details</th>
                  <th className="p-3.5">Performed By</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-950/40">
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/30 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-white block">{log.entityName}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{log.entityId}</span>
                    </td>
                    <td className="p-3.5 text-slate-300 max-w-sm">{log.details}</td>
                    <td className="p-3.5">
                      <span className="text-slate-200 block font-medium">{log.performedBy}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{log.performedByEmail}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< md screens) */}
          <div className="block md:hidden divide-y divide-slate-800">
            {filteredAuditLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2 hover:bg-slate-950/40 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/30 text-[10px]">
                    {log.action}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-white text-xs block">{log.entityName}</span>
                  <span className="font-mono text-slate-500 text-[10px]">{log.entityId}</span>
                </div>

                <p className="text-slate-300 text-[11px]">{log.details}</p>

                <div className="text-[10px] text-slate-500 font-mono pt-1">
                  Operator: <span className="text-slate-300">{log.performedBy}</span> ({log.performedByRole || "Admin"})
                </div>
              </div>
            ))}
          </div>

          {filteredAuditLogs.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 italic space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No audit log entries found.</p>
            </div>
          )}
        </div>
      )}

      {/* BATCH INSPECTION MODAL */}
      {selectedBatchForInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {selectedBatchForInspection.batchId}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedBatchForInspection.type === "CANDIDATE_IMPORT"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}>
                    {selectedBatchForInspection.type === "CANDIDATE_IMPORT" ? "Candidate Batch" : "Job Openings Batch"}
                  </span>
                </div>
                <p className="text-slate-400 font-medium">{selectedBatchForInspection.fileName}</p>
              </div>

              <button
                onClick={() => setSelectedBatchForInspection(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Total Rows Ingested</span>
                <p className="text-lg font-bold text-white font-mono">{selectedBatchForInspection.totalRows}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Successful Inserts</span>
                <p className="text-lg font-bold text-emerald-400 font-mono">{selectedBatchForInspection.successCount}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Failed Rows</span>
                <p className="text-lg font-bold text-rose-400 font-mono">{selectedBatchForInspection.failureCount}</p>
              </div>
            </div>

            {/* Operator Details */}
            <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-slate-300">
              <p><span className="text-slate-500 font-mono">Imported By:</span> {selectedBatchForInspection.importedBy} ({selectedBatchForInspection.importedByEmail})</p>
              <p><span className="text-slate-500 font-mono">Created Date:</span> {new Date(selectedBatchForInspection.createdAt).toLocaleString("en-IN")}</p>
              {selectedBatchForInspection.fileSize && (
                <p><span className="text-slate-500 font-mono">File Size:</span> {(selectedBatchForInspection.fileSize / 1024).toFixed(1)} KB</p>
              )}
            </div>

            {/* Error Log Details if any */}
            {selectedBatchForInspection.errors && selectedBatchForInspection.errors.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-rose-400 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Row Failure Audit Logs ({selectedBatchForInspection.errors.length})</span>
                  </h4>
                  <button
                    onClick={() => handleDownloadBatchErrors(selectedBatchForInspection)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg border border-slate-700 text-[11px] font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Error Report (.xlsx)</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950/60">
                  {selectedBatchForInspection.errors.map((err, idx) => (
                    <div key={idx} className="p-2.5 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-rose-400 font-bold">Row #{err.rowNumber}</span>
                        {err.identifier && <span className="font-mono text-slate-400">{err.identifier}</span>}
                      </div>
                      <p className="text-slate-300 text-[11px]">{err.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>All rows in this batch were successfully validated and written without errors.</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedBatchForInspection(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
