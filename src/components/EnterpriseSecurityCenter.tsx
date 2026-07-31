import {
  Database,
  FileText,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Zap
} from "lucide-react";
import { useState } from "react";


export default function EnterpriseSecurityCenter() {
  const [searchLog, setSearchLog] = useState("");

  const auditLogs = [
    { id: "audit-101", timestamp: "2026-07-28 10:14:02", user: "admin@aijobs.app", ip: "192.168.1.1", action: "SETTINGS_TWILIO_SYNC", status: "SUCCESS", severity: "INFO" },
    { id: "audit-102", timestamp: "2026-07-28 10:20:15", user: "candidate@aijobs.app", ip: "172.16.0.42", action: "RESUME_AUTO_PARSED", status: "SUCCESS", severity: "INFO" },
    { id: "audit-103", timestamp: "2026-07-28 10:32:44", user: "recruiter@aijobs.app", ip: "10.0.4.12", action: "OFFER_LETTER_GENERATE", status: "SUCCESS", severity: "HIGH" },
    { id: "audit-104", timestamp: "2026-07-28 10:45:10", user: "unknown", ip: "185.220.101.5", action: "RATE_LIMIT_BLOCKED", status: "BLOCKED", severity: "WARNING" }
  ];

  const filteredLogs = auditLogs.filter(l => l.user.toLowerCase().includes(searchLog.toLowerCase()) || l.action.toLowerCase().includes(searchLog.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-950 via-neutral-900 to-black border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-xs font-mono font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              <span>MODULE 10 — ENTERPRISE CYBER SECURITY & AUDIT CENTER</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Zero-Trust RBAC / ABAC Security Matrix</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Inspect attribute-based access control rules, searchable audit logs, automated point-in-time database backups, and rate-limiting DDoS protection.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 text-emerald-300 text-xs font-mono font-bold">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>AES-256 + TLS 1.3 Active</span>
          </div>
        </div>
      </div>

      {/* Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl space-y-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Encryption Status</span>
          <div className="text-base font-bold text-emerald-400 flex items-center space-x-1.5">
            <Lock className="w-4 h-4" />
            <span>AES-256 / TLS 1.3</span>
          </div>
        </div>

        <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl space-y-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">Automated Backup</span>
          <div className="text-base font-bold text-blue-400 flex items-center space-x-1.5">
            <Database className="w-4 h-4" />
            <span>PITR Snapshot (15m)</span>
          </div>
        </div>

        <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl space-y-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">ABAC Security Guard</span>
          <div className="text-base font-bold text-purple-400 flex items-center space-x-1.5">
            <Shield className="w-4 h-4" />
            <span>Strict Enforced</span>
          </div>
        </div>

        <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl space-y-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase">DDoS & Rate Limits</span>
          <div className="text-base font-bold text-amber-400 flex items-center space-x-1.5">
            <Zap className="w-4 h-4" />
            <span>100 req/min Cap</span>
          </div>
        </div>
      </div>

      {/* Audit Log Viewer */}
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <FileText className="w-4 h-4 text-red-400" />
            <span>Immutable System Audit Log</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter audit logs..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/60 text-gray-400 border-b border-white/10 uppercase">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">User / Identity</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Action Event</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/5 text-gray-200">
                  <td className="p-3 text-gray-400">{log.timestamp}</td>
                  <td className="p-3 font-bold text-white">{log.user}</td>
                  <td className="p-3 text-gray-400">{log.ip}</td>
                  <td className="p-3 text-gray-300 font-bold">{log.action}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === "SUCCESS"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
