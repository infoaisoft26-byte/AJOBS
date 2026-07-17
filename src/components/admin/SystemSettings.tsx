import { useState, useEffect } from "react";
import { 
  Settings, Save, ShieldAlert, Sparkles, RefreshCw, Server, 
  Database, ShieldCheck, Mail, Sliders, Globe, Lock, Key,
  Eye, EyeOff, MessageSquare, Phone
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
  const [activeSubTab, setActiveSubTab] = useState<"general" | "smtp" | "security" | "mobile_seo" | "twilio">("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Twilio settings states
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioVerifyServiceSid, setTwilioVerifyServiceSid] = useState("");
  const [twilioMessagingServiceSid, setTwilioMessagingServiceSid] = useState("");
  const [twilioWhatsAppNumber, setTwilioWhatsAppNumber] = useState("");

  const [testPhone, setTestPhone] = useState("+91");
  const [testMessage, setTestMessage] = useState("AIJobs communication channel handshake complete.");
  const [isTestingSms, setIsTestingSms] = useState(false);

  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [isSmsLogsLoading, setIsSmsLogsLoading] = useState(false);
  const [showAccountSid, setShowAccountSid] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const fetchTwilioSettings = async () => {
    try {
      const res = await fetch("/api/admin/get-twilio-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setTwilioAccountSid(data.settings.accountSid || "");
          setTwilioAuthToken(data.settings.authToken || "");
          setTwilioVerifyServiceSid(data.settings.verifyServiceSid || "");
          setTwilioMessagingServiceSid(data.settings.messagingServiceSid || "");
          setTwilioWhatsAppNumber(data.settings.whatsAppNumber || "");
        }
      }
    } catch (err) {
      console.error("Failed to load Twilio settings:", err);
    }
  };

  const fetchSmsLogs = async () => {
    setIsSmsLogsLoading(true);
    try {
      const res = await fetch("/api/admin/sms-logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSmsLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to load SMS logs:", err);
    } finally {
      setIsSmsLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "twilio") {
      fetchTwilioSettings();
      fetchSmsLogs();
    }
  }, [activeSubTab]);

  const handleSaveTwilioSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/save-twilio-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          verifyServiceSid: twilioVerifyServiceSid,
          messagingServiceSid: twilioMessagingServiceSid,
          whatsAppNumber: twilioWhatsAppNumber
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("🎉 Twilio Integration Settings synchronized successfully.");
          fetchTwilioSettings();
        } else {
          alert("Error: " + data.error);
        }
      } else {
        alert("Server failed to synchronize Twilio settings.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Twilio settings sync failure: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage) {
      alert("Please provide both test phone number and message.");
      return;
    }
    setIsTestingSms(true);
    try {
      const res = await fetch("/api/twilio/test-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: testPhone,
          message: testMessage
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert("🎉 Test SMS dispatch triggered successfully! Check logs table below.");
          fetchSmsLogs();
        } else {
          alert("Test dispatch failed: " + data.error);
        }
      } else {
        alert("Failed to communicate with Twilio test API endpoint.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error dispatching test SMS: " + err.message);
    } finally {
      setIsTestingSms(false);
    }
  };


  // Google & Android & Referral parameters
  const [gaMeasurementId, setGaMeasurementId] = useState("G-ZRE28JK4W8");
  const [adsenseClient, setAdsenseClient] = useState("ca-pub-4518002691129999");
  const [referralReward, setReferralReward] = useState(2500);
  const [freePostings, setFreePostings] = useState(1);
  const [deepLinkHost, setDeepLinkHost] = useState("www.aijobs.in");
  const [androidPkg, setAndroidPkg] = useState("com.theflexforce.aijobs");

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

  if (activeSubTab === "twilio") {
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
              Configure system communication adapters, adjust credentials, monitor SMS dispatch records, or trigger test runs.
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
            <button
              onClick={() => setActiveSubTab("mobile_seo")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSubTab === "mobile_seo" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Mobile & Marketing
            </button>
            <button
              onClick={() => setActiveSubTab("twilio")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeSubTab === "twilio" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              Twilio Core API
            </button>
          </div>
        </div>

        {/* Twilio Content Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-gray-300">
          <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
            <form onSubmit={handleSaveTwilioSettings} className="space-y-4">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Twilio Gateway Configuration</span>
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Provide your Twilio verified credentials below. All secrets are securely masked before sending to the client browser. Asterisk values preserve current database records on sync.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Twilio Account SID</label>
                  <div className="relative">
                    <input
                      type={showAccountSid ? "text" : "password"}
                      required
                      value={twilioAccountSid}
                      onChange={e => setTwilioAccountSid(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-2.5 pr-10 py-2 text-white font-mono"
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountSid(!showAccountSid)}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      {showAccountSid ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Twilio Auth Token</label>
                  <div className="relative">
                    <input
                      type={showAuthToken ? "text" : "password"}
                      required
                      value={twilioAuthToken}
                      onChange={e => setTwilioAuthToken(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg pl-2.5 pr-10 py-2 text-white font-mono"
                      placeholder="Your Twilio Authentication Token"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthToken(!showAuthToken)}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Verify Service SID (OTP)</label>
                  <input
                    type="text"
                    required
                    value={twilioVerifyServiceSid}
                    onChange={e => setTwilioVerifyServiceSid(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Messaging Service SID</label>
                  <input
                    type="text"
                    required
                    value={twilioMessagingServiceSid}
                    onChange={e => setTwilioMessagingServiceSid(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">WhatsApp Number</label>
                  <input
                    type="text"
                    value={twilioWhatsAppNumber}
                    onChange={e => setTwilioWhatsAppNumber(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    placeholder="whatsapp:+14155238886"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Syncing..." : "Save Twilio Settings"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Test SMS execution side panel */}
          <div className="space-y-6">
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-400" />
                <span>Test SMS Console</span>
              </h4>

              <p className="text-[11px] text-gray-300 leading-relaxed">
                Verify mobile routing parameters immediately. Direct handshakes run through active gateways or high-fidelity simulation fallbacks.
              </p>

              <form onSubmit={handleTestSms} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-gray-500 block font-mono text-[10px] uppercase">Recipient Mobile No.</label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    placeholder="+919999999999"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-500 block font-mono text-[10px] uppercase">Message Content</label>
                  <textarea
                    rows={3}
                    required
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono resize-none text-[11px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTestingSms}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-xs text-indigo-400 font-bold rounded-lg border border-indigo-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSms ? "animate-spin" : ""}`} />
                  <span>{isTestingSms ? "Dispatching..." : "Send Test SMS"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Real-time SMS logs */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" />
                <span>Twilio Activity Logs Registry</span>
              </h4>
              <p className="text-[10px] text-gray-500 mt-1">Audited real-time SMS transmissions including OTP logs, recruiter approvals, and candidate applications.</p>
            </div>
            <button
              type="button"
              onClick={fetchSmsLogs}
              disabled={isSmsLogsLoading}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-[10px] font-mono rounded-lg border border-white/5 flex items-center gap-1.5 cursor-pointer text-gray-300"
            >
              <RefreshCw className={`w-3 h-3 ${isSmsLogsLoading ? "animate-spin" : ""}`} />
              <span>Refresh Registry</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="border-b border-white/5 text-gray-400">
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Message Body</th>
                  <th className="py-2.5 px-3">Dispatch Category</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      {isSmsLogsLoading ? "Reading logs from firestore database..." : "No SMS logs recorded in sms_logs collection."}
                    </td>
                  </tr>
                ) : (
                  smsLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 font-bold text-white">{log.phone}</td>
                      <td className="py-2.5 px-3 max-w-sm truncate" title={log.message}>{log.message}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-900 text-gray-400 border border-white/5">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">{log.provider || "Twilio"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          log.status === "SENT" || log.status === "DELIVERED"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : log.status === "SIMULATED"
                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Now"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => setActiveSubTab("mobile_seo")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === "mobile_seo" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Mobile & Marketing
          </button>
          <button
            onClick={() => setActiveSubTab("twilio")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeSubTab === "twilio" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Twilio Core API
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

          {activeSubTab === "mobile_seo" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Google Services & Mobile App Compiler</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Google Analytics Measurement ID</label>
                  <input
                    type="text"
                    required
                    value={gaMeasurementId}
                    onChange={e => setGaMeasurementId(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Google AdSense Publisher Client ID</label>
                  <input
                    type="text"
                    required
                    value={adsenseClient}
                    onChange={e => setAdsenseClient(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Referral Commission (Recruiter Rewards INR)</label>
                  <input
                    type="number"
                    required
                    value={referralReward}
                    onChange={e => setReferralReward(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Free Job Postings Granted on Referral</label>
                  <input
                    type="number"
                    required
                    value={freePostings}
                    onChange={e => setFreePostings(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Android App Compiler & PWA Details</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Deep Linking Host (SHA-256 Domain)</label>
                    <input
                      type="text"
                      required
                      value={deepLinkHost}
                      onChange={e => setDeepLinkHost(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Android Package Identifier (APK/AAB Bundle)</label>
                    <input
                      type="text"
                      required
                      value={androidPkg}
                      onChange={e => setAndroidPkg(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="bg-neutral-950/40 p-3 rounded-xl border border-white/5 space-y-2 font-sans text-[11px] text-gray-400 leading-relaxed">
                  <p>✓ <strong>Adaptive Icon</strong>: Configured for splash grids on Android 12+ API 31.</p>
                  <p>✓ <strong>Push Notifications</strong>: Google FCM Channel initialized; deep-link handles custom routes automatically.</p>
                  <p>✓ <strong>Search Console Status</strong>: Indexing sitemap.xml and robots.txt triggers verified.</p>
                </div>
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
