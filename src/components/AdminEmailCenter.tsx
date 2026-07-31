import {
  CheckCircle2,
  FileText,
  Inbox,
  Layers,
  Mail,
  Package,
  Play,
  RefreshCw,
  RotateCw,
  Send,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";


interface TemplateInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface DeliveryLog {
  id: string;
  campaignId?: string;
  jobId?: string;
  candidateId?: string;
  email: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "ERROR";
  queuedAt?: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
}

export default function AdminEmailCenter() {
  const [activeTab, setActiveTab] = useState<"templates" | "campaign" | "digest" | "logs">("templates");
  
  // Data state
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("candidate-registration");
  const [previewData, setPreviewData] = useState<{ subject?: string; html?: string }>({});
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test Email state
  const [testEmailAddress, setTestEmailAddress] = useState("infoaisoft26@gmail.com");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState("");

  // Campaign state
  const [campaignJobId, setCampaignJobId] = useState("");
  const [campaignJobTitle, setCampaignJobTitle] = useState("Senior Full Stack AI Developer");
  const [campaignCompany, setCampaignCompany] = useState("AIJobs Partner Enterprise");
  const [campaignLocation, setCampaignLocation] = useState("Bangalore / Remote");
  const [campaignSalary, setCampaignSalary] = useState("₹20,00,000 - ₹28,00,000 CTC");
  const [runningCampaign, setRunningCampaign] = useState(false);
  const [campaignStats, setCampaignStats] = useState<any>(null);

  // Digest state
  const [runningDigest, setRunningDigest] = useState(false);
  const [digestResult, setDigestResult] = useState<any>(null);

  // Logs state
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // High level stats
  const [overallStats, setOverallStats] = useState({
    totalSent: 148,
    successCount: 142,
    failedCount: 6,
    optedInCandidates: 38,
    unsubscribedCandidates: 2
  });

  // Fetch templates list and stats on mount
  useEffect(() => {
    fetchTemplates();
    fetchStats();
    fetchLogs();
  }, []);

  // Fetch preview whenever selected template changes
  useEffect(() => {
    if (selectedTemplate) {
      loadTemplatePreview(selectedTemplate);
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/email/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (e) {
      console.warn("Failed to fetch templates:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/email/stats");
      const data = await res.json();
      if (data.success && data.stats) {
        setOverallStats(data.stats);
      }
    } catch (e) {
      console.warn("Failed to fetch stats:", e);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/email/deliveries");
      const data = await res.json();
      if (data.success) {
        setDeliveries(data.deliveries || []);
      }
    } catch (e) {
      console.warn("Failed to fetch delivery logs:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadTemplatePreview = async (tempId: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateName: tempId,
          data: {
            candidateName: "Rahul Sharma",
            jobTitle: campaignJobTitle,
            companyName: campaignCompany,
            location: campaignLocation,
            salary: campaignSalary,
            resumeScore: 88,
            interviewDate: "18 August 2026",
            interviewTime: "11:00 AM IST",
            offerDetails: "Base CTC: ₹22,00,000 + Joining Bonus: ₹2,00,000"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData({ subject: data.subject, html: data.html });
      }
    } catch (e) {
      console.warn("Error loading template preview:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setSendingTest(true);
    setTestResultMsg("");

    try {
      const res = await fetch("/api/email/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailAddress.trim(),
          templateName: selectedTemplate,
          data: {
            candidateName: "Admin Tester",
            jobTitle: campaignJobTitle,
            companyName: campaignCompany
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResultMsg(`Success! Test email queued/sent to ${testEmailAddress}`);
        fetchStats();
        fetchLogs();
      } else {
        setTestResultMsg(`Failed: ${data.error || "Could not dispatch test email"}`);
      }
    } catch (err: any) {
      setTestResultMsg(`Error: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const handleTriggerJobAlerts = async () => {
    setRunningCampaign(true);
    setCampaignStats(null);

    try {
      const res = await fetch("/api/email/trigger-job-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: campaignJobId || `job_${Date.now()}`,
          jobData: {
            title: campaignJobTitle,
            companyName: campaignCompany,
            location: campaignLocation,
            salary: campaignSalary,
            slug: "senior-ai-developer"
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setCampaignStats(data.stats);
        fetchStats();
        fetchLogs();
      }
    } catch (err: any) {
      console.error("Job alert campaign error:", err);
    } finally {
      setRunningCampaign(false);
    }
  };

  const handleTriggerDigest = async () => {
    setRunningDigest(true);
    setDigestResult(null);

    try {
      const res = await fetch("/api/email/weekly-digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setDigestResult(data.result);
        fetchStats();
        fetchLogs();
      }
    } catch (err: any) {
      console.error("Weekly digest error:", err);
    } finally {
      setRunningDigest(false);
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const res = await fetch("/api/email/retry-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId })
      });
      const data = await res.json();
      if (data.success) {
        fetchLogs();
        fetchStats();
      }
    } catch (err) {
      console.warn("Retry failed:", err);
    } finally {
      setRetryingId(null);
    }
  };

  const successRate = overallStats.totalSent > 0
    ? Math.round((overallStats.successCount / overallStats.totalSent) * 100)
    : 100;

  return (
    <div className="space-y-6 text-white font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-mono text-xs uppercase tracking-wider font-bold mb-1">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>AIJobs Enterprise Email Center</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Notification Engine & Automated Campaigns
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Manage transactional email templates, candidate preferences, automated job alerts, and SMTP delivery queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchStats(); fetchLogs(); }}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-4 bg-gradient-to-br from-blue-950/40 to-black border border-blue-500/20 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
            <span>TOTAL DISPATCHED</span>
            <Inbox className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{overallStats.totalSent}</div>
          <div className="text-[11px] text-blue-400 mt-1">
            Transactional & Job Alerts
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-950/40 to-black border border-emerald-500/20 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
            <span>SUCCESS RATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{successRate}%</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">
            {overallStats.successCount} Successful Deliveries
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-950/40 to-black border border-purple-500/20 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
            <span>OPTED-IN SUBSCRIBERS</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{overallStats.optedInCandidates}</div>
          <div className="text-[11px] text-purple-400 mt-1">
            Active Job Alert Consents
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-950/40 to-black border border-amber-500/20 rounded-2xl">
          <div className="flex items-center justify-between text-gray-400 text-xs font-mono mb-2">
            <span>BOUNCED / ERRORS</span>
            <XCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{overallStats.failedCount}</div>
          <div className="text-[11px] text-amber-400 mt-1">
            {overallStats.unsubscribedCandidates} Unsubscribed Users
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "templates"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Templates Library ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("campaign")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "campaign"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Job Alert Campaign Trigger</span>
        </button>

        <button
          onClick={() => setActiveTab("digest")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "digest"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Weekly Digest Automation</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "logs"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Delivery Logs</span>
        </button>
      </div>

      {/* TAB 1: TEMPLATES LIBRARY */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Template List */}
          <div className="lg:col-span-4 space-y-2 max-h-[650px] overflow-y-auto pr-1">
            <div className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
              Select Email Template to Inspect
            </div>

            {templates.map((temp) => (
              <button
                key={temp.id}
                onClick={() => setSelectedTemplate(temp.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer block ${
                  selectedTemplate === temp.id
                    ? "bg-blue-950/40 border-blue-500/50 text-white shadow-md shadow-blue-500/10"
                    : "bg-black/30 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white line-clamp-1">{temp.name}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md uppercase font-bold ${
                    temp.category === "job_alert" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {temp.category}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-snug">{temp.description}</p>
              </button>
            ))}
          </div>

          {/* Right Column: Live HTML Preview & Test Dispatcher */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Test Email Toolbar */}
            <div className="p-4 bg-black/40 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="w-full sm:w-auto flex-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">
                  Test Recipient Email (SMTP / Firestore Queue)
                </label>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter recipient email..."
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="w-full sm:w-auto mt-4 sm:mt-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Real Test Email</span>
              </button>
            </div>

            {testResultMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                testResultMsg.startsWith("Success") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-300"
              }`}>
                {testResultMsg}
              </div>
            )}

            {/* Subject Bar */}
            <div className="p-3 bg-gray-900 border border-white/10 rounded-xl text-xs font-mono flex items-center gap-2">
              <span className="text-gray-500 font-bold shrink-0">Subject:</span>
              <span className="text-blue-300 font-semibold">{previewData.subject || "Loading..."}</span>
            </div>

            {/* HTML Preview Iframe/Container */}
            <div className="border border-white/10 rounded-2xl bg-black overflow-hidden min-h-[480px] relative">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : (
                <iframe
                  title="Email Preview"
                  srcDoc={previewData.html || ""}
                  className="w-full h-[500px] border-none bg-black"
                />
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: JOB ALERT CAMPAIGN TRIGGER */}
      {activeTab === "campaign" && (
        <div className="max-w-2xl bg-black/40 border border-white/10 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              <span>Trigger Automated Job Alert Campaign</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Dispatch an automated notification email to all candidate users who checked the job alert opt-in box.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-gray-400 uppercase font-bold block mb-1">Job Title</label>
              <input
                type="text"
                value={campaignJobTitle}
                onChange={(e) => setCampaignJobTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono text-gray-400 uppercase font-bold block mb-1">Company</label>
                <input
                  type="text"
                  value={campaignCompany}
                  onChange={(e) => setCampaignCompany(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-gray-400 uppercase font-bold block mb-1">Location</label>
                <input
                  type="text"
                  value={campaignLocation}
                  onChange={(e) => setCampaignLocation(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-gray-400 uppercase font-bold block mb-1">Salary CTC Package</label>
              <input
                type="text"
                value={campaignSalary}
                onChange={(e) => setCampaignSalary(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleTriggerJobAlerts}
            disabled={runningCampaign}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {runningCampaign ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Campaign Deliveries...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch Job Alert to Opted-In Candidates</span>
              </>
            )}
          </button>

          {campaignStats && (
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-2 font-mono">
              <div className="text-blue-300 font-bold">Campaign Dispatch Summary:</div>
              <div className="text-gray-300">Queued & Dispatched: <span className="text-emerald-400 font-bold">{campaignStats.queued}</span></div>
              <div className="text-gray-300">Skipped (Unsubscribed / Duplicate): <span className="text-amber-400 font-bold">{campaignStats.skipped}</span></div>
              <div className="text-gray-300">Delivery Errors: <span className="text-red-400 font-bold">{campaignStats.errors}</span></div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WEEKLY DIGEST */}
      {activeTab === "digest" && (
        <div className="max-w-2xl bg-black/40 border border-white/10 rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Run Weekly Job Digest Engine</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Triggers the weekly roundup email compilation of top verified active openings for candidates who opted into weekly digests.
            </p>
          </div>

          <div className="p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl text-xs text-purple-300 space-y-1">
            <div className="font-bold">Automated Scheduling Rule:</div>
            <p className="text-gray-300 text-[11px]">
              This automated digest runs scheduled in background tasks or can be manually invoked on demand below.
            </p>
          </div>

          <button
            onClick={handleTriggerDigest}
            disabled={runningDigest}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {runningDigest ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating and Dispatching Digests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Weekly Digest Batch Now</span>
              </>
            )}
          </button>

          {digestResult && (
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-2 font-mono">
              <div className="text-purple-300 font-bold">Digest Execution Summary:</div>
              <div className="text-gray-300">Candidates Processed: <span className="text-white font-bold">{digestResult.processed}</span></div>
              <div className="text-gray-300">Emails Sent: <span className="text-emerald-400 font-bold">{digestResult.sent}</span></div>
              <div className="text-gray-300">Skipped (Opt-Out): <span className="text-amber-400 font-bold">{digestResult.skipped}</span></div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DELIVERY LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-gray-400 uppercase">Recent Campaign Deliveries</span>
            <button
              onClick={fetchLogs}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Logs
            </button>
          </div>

          <div className="border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-gray-400 font-mono text-[11px]">
                  <th className="p-3">Candidate Email</th>
                  <th className="p-3">Campaign / Job ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Dispatched At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No delivery logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-white/5">
                      <td className="p-3 font-mono text-white">{del.email}</td>
                      <td className="p-3 font-mono text-gray-400">{del.jobId || del.campaignId || "Direct"}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          del.status === "SUCCESS"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}>
                          {del.status === "SUCCESS" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {del.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-gray-400 text-[11px]">
                        {del.sentAt ? new Date(del.sentAt).toLocaleString() : del.queuedAt ? new Date(del.queuedAt).toLocaleString() : "Pending"}
                      </td>
                      <td className="p-3 text-right">
                        {del.status === "ERROR" && (
                          <button
                            onClick={() => handleRetryDelivery(del.id)}
                            disabled={retryingId === del.id}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
