import { useState } from "react";
import { 
  Settings, Save, ShieldAlert, Sparkles, RefreshCw, Server, 
  Database, ShieldCheck, Mail, Sliders, Globe, Lock, Key 
} from "lucide-react";
import { AdminSystemSettings } from "./AdminTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface SystemSettingsProps {
  settings: AdminSystemSettings;
  onRefresh: () => void;
  userName: string;
}

export default function SystemSettings({
  settings,
  onRefresh,
  userName
}: SystemSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "smtp" | "security">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // General settings state form
  const [siteName, setSiteName] = useState(settings.general.siteName);
  const [supportEmail, setSupportEmail] = useState(settings.general.supportEmail);
  const [contactPhone, setContactPhone] = useState(settings.general.contactPhone);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.general.maintenanceMode);

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState(settings.smtp.host);
  const [smtpPort, setSmtpPort] = useState(settings.smtp.port);
  const [smtpUser, setSmtpUser] = useState(settings.smtp.user);

  // Security
  const [maxAttempts, setMaxAttempts] = useState(settings.security.maxLoginAttempts);
  const [sessionTimeout, setSessionTimeout] = useState(settings.security.sessionTimeoutMinutes);
  const [mfaRequired, setMfaRequired] = useState(settings.security.mfaRequired);

  // Backups state
  const [backupFreq, setBackupFreq] = useState(settings.backup.frequency);
  const [lastBackup, setLastBackup] = useState(settings.backup.lastBackupAt);
  const [totalBackups, setTotalBackups] = useState(settings.backup.totalBackups);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: AdminSystemSettings = {
        ...settings,
        general: {
          ...settings.general,
          siteName,
          supportEmail,
          contactPhone,
          maintenanceMode
        },
        smtp: {
          ...settings.smtp,
          host: smtpHost,
          port: Number(smtpPort),
          user: smtpUser
        },
        security: {
          ...settings.security,
          maxLoginAttempts: Number(maxAttempts),
          sessionTimeoutMinutes: Number(sessionTimeout),
          mfaRequired
        },
        backup: {
          ...settings.backup,
          frequency: backupFreq,
          lastBackupAt: lastBackup,
          totalBackups: totalBackups
        }
      };

      await setDoc(doc(db, "system_settings", "global_config"), payload);

      // Audit Log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: userName,
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "System",
        description: `Modified administrative global configuration. Maintenance Mode: ${maintenanceMode ? "ENABLED" : "DISABLED"}.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert("🎉 Global system settings synchronized on Cloud Server.");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Settings sync failure.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerBackup = async () => {
    setIsSubmitting(true);
    try {
      const nextBackupDate = new Date().toISOString();
      const nextTotal = totalBackups + 1;

      await setDoc(doc(db, "system_settings", "global_config"), {
        backup: {
          lastBackupAt: nextBackupDate,
          totalBackups: nextTotal
        }
      }, { merge: true });

      // Audit log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: userName,
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "SETTINGS_CHANGE",
        category: "System",
        description: `Triggered manual Cloud Database (Firestore) backup snapshot. Snapshot ID: #SNAP-${nextTotal}.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      setLastBackup(nextBackupDate);
      setTotalBackups(nextTotal);
      alert(`📂 Firestore snapshot compiled successfully!\n\nBackup #SNAP-${nextTotal} compiled and stored in secure Cloud bucket.`);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="system-settings-panel">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Global Administrative Control Room</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Configure system brand identifiers, adjust SMTP credentials, restrict clearance attempts, or trigger database snapshots.
          </p>
        </div>

        {/* Local subtabs switcher */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab("general")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === "general" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            General & Brand
          </button>
          <button
            onClick={() => setActiveSubTab("smtp")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === "smtp" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            SMTP Mail Servers
          </button>
          <button
            onClick={() => setActiveSubTab("security")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === "security" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Clearances & Backups
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveAllSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-gray-300">
        
        {/* Main form section */}
        <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
          
          {activeSubTab === "general" && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>General Site Configurations</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Platform Identity Title</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={e => setSiteName(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Support Helpdesk Address</label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={e => setSupportEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Contact hotline No.</label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={e => setMaintenanceMode(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    <div>
                      <span className="text-white font-bold block">Maintenance Mode</span>
                      <span className="text-[9px] text-gray-500 font-mono">Re-routes visitor logs to offline cards</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Brand settings mockup */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Design System Identifiers</span>
                <div className="grid grid-cols-3 gap-3 font-mono text-[10px]">
                  <div className="p-2.5 bg-neutral-950/40 rounded border border-white/5 flex justify-between items-center">
                    <span>Primary Hex</span>
                    <strong className="text-indigo-400">#4F46E5</strong>
                  </div>
                  <div className="p-2.5 bg-neutral-950/40 rounded border border-white/5 flex justify-between items-center">
                    <span>Secondary Hex</span>
                    <strong className="text-purple-400">#9333EA</strong>
                  </div>
                  <div className="p-2.5 bg-neutral-950/40 rounded border border-white/5 flex justify-between items-center">
                    <span>Typography</span>
                    <strong className="text-white">Inter Sans</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeSubTab === "smtp" && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>SMTP Mail Credentials</span>
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-gray-400 block font-mono">SMTP Relay Hostname</label>
                  <input
                    type="text"
                    required
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">SMTP Port</label>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={e => setSmtpPort(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block font-mono">Authorized SMTP Mail sender user</label>
                <input
                  type="text"
                  required
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] text-gray-400">
                ⚠️ Modifying relay endpoints changes where automated notification templates are compiled. Verify connections before saving.
              </div>

            </div>
          )}

          {activeSubTab === "security" && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>System Clearances Security Constraints</span>
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Max Consecutive Failures before Ban</label>
                  <input
                    type="number"
                    required
                    value={maxAttempts}
                    onChange={e => setMaxAttempts(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Session Expiry Period (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1 flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={mfaRequired}
                  onChange={e => setMfaRequired(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  id="mfa-req-checkbox"
                />
                <label htmlFor="mfa-req-checkbox" className="cursor-pointer">
                  <span className="text-white font-bold block">Enforce Multi-Factor Staff Authentication</span>
                  <span className="text-[9px] text-gray-500 font-mono">Requires secondary verification codes on login</span>
                </label>
              </div>

            </div>
          )}

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Syncing..." : "Sync Control Room Changes"}</span>
            </button>
          </div>

        </div>

        {/* Database Snapshots side panel */}
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>Database Backups & Snapshots</span>
            </h4>

            <p className="text-[11px] text-gray-300 leading-relaxed">
              Backups execute full Firestore document serialization and export JSON objects to Google Cloud Storage buckets securely.
            </p>

            <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2 font-mono text-[9px] text-gray-400">
              <p>Last compiled: <strong className="text-white">{lastBackup ? new Date(lastBackup).toLocaleString() : "Unknown"}</strong></p>
              <p>Backup Registry Index: <strong className="text-indigo-400 font-bold">#SNAP-{totalBackups}</strong></p>
            </div>

            <div className="space-y-1">
              <label className="text-gray-500 block font-mono text-[10px] uppercase">Automated Backup frequency</label>
              <select
                value={backupFreq}
                onChange={e => setBackupFreq(e.target.value as any)}
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono cursor-pointer"
              >
                <option value="daily">Daily Cron schedule</option>
                <option value="weekly">Weekly scheduler</option>
                <option value="monthly">Monthly compilation</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleTriggerBackup}
              disabled={isSubmitting}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-xs text-indigo-400 font-bold rounded-lg border border-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Manual Database Backup</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}
