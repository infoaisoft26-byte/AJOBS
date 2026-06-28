import { useState } from "react";
import { 
  FileText, Search, Filter, ShieldAlert, Download, Trash2, 
  RefreshCw, CheckCircle, Clock, Globe, Terminal, ChevronRight 
} from "lucide-react";
import { SystemAuditLog } from "./AdminTypes";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";

interface AuditLogsProps {
  logs: SystemAuditLog[];
  onRefresh: () => void;
}

export default function AuditLogs({
  logs,
  onRefresh
}: AuditLogsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);

  // Filter logs
  const filteredLogs = logs.filter((l) => {
    const matchesSearch = 
      l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ipAddress.includes(searchQuery);
    
    const matchesCategory = selectedCategory === "all" || l.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No matching audit logs to export.");
      return;
    }

    // Compose CSV contents
    const headers = ["Log ID", "Created At", "User Name", "Email", "Role", "Category", "Action", "Description", "IP Address", "Device"];
    const rows = filteredLogs.map(l => [
      l.id,
      l.createdAt,
      l.userName,
      l.userEmail,
      l.role,
      l.category,
      l.action,
      `"${l.description.replace(/"/g, '""')}"`,
      l.ipAddress,
      `"${l.deviceInfo.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `aijobs_system_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert("📝 Security audit trail successfully compiled and exported as CSV.");
  };

  return (
    <div className="space-y-6" id="system-audit-logs-portal">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span>System Audits & Security Logs</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Track and audit logins, administrative updates, legal approvals, payment status events, and generative model calls.
          </p>
        </div>

        {/* Download reports */}
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-xs font-bold text-gray-300 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Advanced search and category filtering */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description, email, or IP address..."
            className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">All Audit Categories</option>
            <option value="User">User Clearances</option>
            <option value="Approval">Corporate Approvals</option>
            <option value="Job">Job Vacancies</option>
            <option value="AI">AI Processing</option>
            <option value="Payment">Payments & Billings</option>
            <option value="System">System Configurations</option>
            <option value="Security">Security Shields</option>
          </select>
        </div>

        <div className="flex items-center justify-end font-mono text-[10px] text-gray-400">
          Trace Records Logged: <strong className="text-white ml-1">{filteredLogs.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Logs Table */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Access Trail Grid</h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 font-mono">
                  <th className="pb-3">Timestamp / IP</th>
                  <th className="pb-3">Staff Operator</th>
                  <th className="pb-3">Action Segment</th>
                  <th className="pb-3">Description Details</th>
                  <th className="pb-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-[11px]">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 group">
                      <td className="py-3">
                        <div className="text-white">{new Date(log.createdAt).toLocaleTimeString()}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">{log.ipAddress}</div>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="font-sans font-bold text-white">{log.userName}</div>
                        <div className="text-[9px] text-gray-400">{log.role}</div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          log.action === "LOGIN" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          log.action === "APPROVAL" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          log.action === "AI_ACTION" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 max-w-[200px] truncate pr-2 font-sans text-gray-400" title={log.description}>
                        {log.description}
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
                    <td colSpan={5} className="text-center py-12 text-xs text-gray-500 italic">
                      No matching audit footprints in security database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Log Inspection Panel */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Diagnostic Payload</span>
            </h4>

            {selectedLog ? (
              <div className="space-y-4 leading-relaxed">
                
                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Audit metadata</span>
                  
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <p>Log UUID: <strong className="text-white">{selectedLog.id}</strong></p>
                    <p>Timestamp: <strong className="text-white">{new Date(selectedLog.createdAt).toLocaleString()}</strong></p>
                    <p>Category: <strong className="text-indigo-400 uppercase">{selectedLog.category}</strong></p>
                    <p>Action Type: <strong className="text-indigo-400 uppercase">{selectedLog.action}</strong></p>
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Executor signature</span>
                  
                  <div className="space-y-1 font-mono text-[10px]">
                    <p>Staff Name: <strong className="text-white">{selectedLog.userName}</strong></p>
                    <p>Clearance Role: <strong className="text-white">{selectedLog.role}</strong></p>
                    <p>Email: <strong className="text-white">{selectedLog.userEmail}</strong></p>
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Access Footprint</span>
                  
                  <div className="space-y-1 font-mono text-[10px]">
                    <p>IP Address: <strong className="text-emerald-400">{selectedLog.ipAddress}</strong></p>
                    <p className="leading-normal">Device User-Agent: <span className="text-gray-400 block mt-0.5">{selectedLog.deviceInfo}</span></p>
                  </div>
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-gray-500 block uppercase">Log Description</span>
                  <p className="text-gray-300 text-[11px] font-medium leading-relaxed">{selectedLog.description}</p>
                </div>

              </div>
            ) : (
              <div className="text-center py-24 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose a telemetry log row to parse system parameters and inspect payload schemas.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
