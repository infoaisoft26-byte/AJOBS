import { useState, useEffect } from "react";
import { 
  FileText, Search, Filter, ShieldAlert, Download, Trash2, 
  RefreshCw, CheckCircle, Clock, Globe, Terminal, ChevronRight,
  ChevronLeft, DoubleCw, Sparkles, Layers
} from "lucide-react";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useToast } from "../GlobalToast";

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
  entityType: "job" | "user" | "admin" | "application" | "other" | string;
  entityId?: string;
  createdAt: string;
  ipAddress?: string;
  deviceInfo?: string;
}

interface AuditLogsProps {
  logs?: any;
  onRefresh?: any;
}

export default function AuditLogs({}: AuditLogsProps = {}) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const logsRef = collection(db, "activity_logs");
      const q = query(logsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const list: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ActivityLog);
      });
      setLogs(list);
    } catch (err) {
      console.error("Error loading activity_logs:", err);
      showToast("Failed to load official activity logs from Firestore.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs locally based on search query and selections
  const filteredLogs = logs.filter((l) => {
    const matchesSearch = 
      (l.details || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.userName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.id || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === "all" || l.role === selectedRole;
    const matchesAction = selectedAction === "all" || l.action === selectedAction;

    return matchesSearch && matchesRole && matchesAction;
  });

  // Pagination calculations
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedAction, pageSize]);

  // Unique actions and roles for select filters
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));
  const uniqueRoles = Array.from(new Set(logs.map((l) => l.role).filter(Boolean)));

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast("No matching audit logs to export.", "warning");
      return;
    }

    const headers = ["Log ID", "Created At", "User Name", "Role", "Action Type", "Details", "Entity Type", "Entity ID", "IP Address"];
    const rows = filteredLogs.map(l => [
      l.id,
      l.createdAt,
      l.userName,
      l.role,
      l.action,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      l.entityType,
      l.entityId || "N/A",
      l.ipAddress || "127.0.0.1"
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aijobs_activity_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Security audit trail successfully compiled and exported as CSV.", "success");
  };

  return (
    <div className="space-y-6" id="system-audit-logs-portal">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>Activity Logs & System Audits</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Real-time, paginated stream of administrative interactions, AI workflows, client logins, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs font-bold text-gray-300 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-xs font-bold text-white rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Advanced search and category filtering */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search details, executor name, action or UUID..."
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer focus:outline-none"
          >
            <option value="all">All Role Profiles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer focus:outline-none"
          >
            <option value="all">All Action Classes</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Logs Table */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Audit Activity Grid</span>
              </h4>
              <span className="font-mono text-[10px] text-gray-400">
                Matches found: <strong className="text-white ml-1">{totalItems}</strong>
              </span>
            </div>

            <div className="overflow-x-auto min-h-[350px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3 font-mono text-xs text-gray-500">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <span>Parsing Firestore trace clusters...</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 font-mono">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Operator</th>
                      <th className="pb-3">Action</th>
                      <th className="pb-3">Details</th>
                      <th className="pb-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-[11px]">
                    {paginatedLogs.length > 0 ? (
                      paginatedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/5 group">
                          <td className="py-3">
                            <div className="text-white">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-[9px] text-gray-500 mt-0.5">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="py-3 pr-2">
                            <div className="font-sans font-bold text-white truncate max-w-[120px]" title={log.userName}>
                              {log.userName}
                            </div>
                            <div className="text-[9px] text-gray-400">{log.role}</div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider ${
                              log.action.includes("CREATE") || log.action.includes("POST") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              log.action.includes("DELETE") ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              log.action.includes("AI") || log.action.includes("EVALUATE") ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                              "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 max-w-[180px] truncate pr-2 font-sans text-gray-400" title={log.details}>
                            {log.details}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="p-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded transition-all cursor-pointer inline-flex items-center"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-20 text-xs text-gray-500 italic">
                          No matching system audit records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 pt-4 font-mono text-[11px] text-gray-400">
              <div className="flex items-center gap-1.5">
                <span>View</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-neutral-900 border border-white/10 text-white rounded px-2 py-1 text-[11px] focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>per page</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-neutral-900 border border-white/10 rounded hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span>
                  Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong>
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-neutral-900 border border-white/10 rounded hover:text-white hover:border-white/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Log Inspection Panel */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Audit Diagnostic Node</span>
            </h4>

            {selectedLog ? (
              <div className="space-y-4 leading-relaxed animate-in fade-in slide-in-from-right-3 duration-200">
                
                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Log UUID Reference</span>
                  <div className="space-y-1 font-mono text-[10px]">
                    <p>UUID: <strong className="text-white select-all">{selectedLog.id}</strong></p>
                    <p>Timestamp: <strong className="text-white">{new Date(selectedLog.createdAt).toLocaleString()}</strong></p>
                    <p>Entity Type: <strong className="text-indigo-400 uppercase">{selectedLog.entityType}</strong></p>
                    {selectedLog.entityId && (
                      <p>Entity ID: <strong className="text-purple-400 select-all">{selectedLog.entityId}</strong></p>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Operator Security Token</span>
                  <div className="space-y-1 font-mono text-[10px]">
                    <p>Staff/Client: <strong className="text-white">{selectedLog.userName}</strong></p>
                    <p>Clearance Role: <strong className="text-white">{selectedLog.role}</strong></p>
                    <p>User UID: <strong className="text-white select-all">{selectedLog.userId}</strong></p>
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Context Parameters</span>
                  <div className="space-y-1 font-mono text-[10px]">
                    <p>IP Coordinates: <strong className="text-emerald-400">{selectedLog.ipAddress || "127.0.0.1"}</strong></p>
                    <p>Action Hook: <strong className="text-indigo-400">{selectedLog.action}</strong></p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-gray-500 block uppercase">Log Description</span>
                  <p className="text-gray-300 text-[11px] font-medium leading-relaxed">{selectedLog.details}</p>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose an audit row to inspect full trace telemetry, structural payload tags, and executor signatures.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
