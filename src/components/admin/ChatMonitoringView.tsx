import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  User,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";

import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface ChatSession {
  id: string;
  sessionId: string;
  candidateId?: string;
  candidateName?: string;
  recruiterId?: string;
  recruiterName?: string;
  consultancyId?: string;
  consultancyName?: string;
  jobId?: string;
  jobTitle?: string;
  applicationId?: string;
  status?: string;
  riskLevel?: "normal" | "low" | "medium" | "high_risk" | "flagged";
  riskFlags?: string[];
  updatedAt?: string;
  lastMessage?: string;
}

interface ChatMessageItem {
  id: string;
  senderType?: string;
  senderId?: string;
  senderName?: string;
  message?: string;
  createdAt?: string;
  detectedIntent?: string;
  riskFlags?: string[];
  visibleToCandidate?: boolean;
  visibleToAdmin?: boolean;
  originalMessage?: string;
}

export default function ChatMonitoringView() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [actionReason, setActionReason] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch all chat sessions from Firestore
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "chat_sessions"), limit(50));
      const snap = await getDocs(q);
      const list: ChatSession[] = [];

      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          sessionId: data.sessionId || d.id,
          candidateId: data.candidateId || data.userId || "Anonymous",
          candidateName: data.candidateName || data.userName || "Candidate",
          recruiterId: data.recruiterId || "",
          recruiterName: data.recruiterName || "Corporate Recruiter",
          consultancyId: data.consultancyId || "",
          consultancyName: data.consultancyName || "",
          jobId: data.jobId || "",
          jobTitle: data.jobTitle || "General Career Query",
          applicationId: data.applicationId || "",
          status: data.status || "active",
          riskLevel: data.riskLevel || "normal",
          riskFlags: data.riskFlags || [],
          updatedAt: data.updatedAt || new Date().toISOString(),
          lastMessage: data.lastMessage || "Chat thread active."
        });
      });

      setSessions(list);
      if (list.length > 0 && !activeSession) {
        setActiveSession(list[0]);
      }
    } catch (err) {
      console.error("Failed to load chat sessions for admin monitoring:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch messages for active session
  useEffect(() => {
    if (!activeSession) return;

    async function loadSessionMessages() {
      try {
        const msgsSnap = await getDocs(
          query(collection(db, "chat_sessions", activeSession.id, "messages"), limit(100))
        );
        const list: ChatMessageItem[] = [];

        if (!msgsSnap.empty) {
          msgsSnap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              senderType: data.senderType || data.role || "user",
              senderId: data.senderId || data.userId,
              senderName: data.senderName || "User",
              message: data.message || data.text || "",
              createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
              detectedIntent: data.detectedIntent || "chat",
              riskFlags: data.riskFlags || [],
              visibleToCandidate: data.visibleToCandidate !== false,
              visibleToAdmin: true,
              originalMessage: data.originalMessage || data.message
            });
          });
        } else {
          // Check top level messages collection
          const topMsgs = await getDocs(
            query(collection(db, "chat_messages"), limit(50))
          );
          topMsgs.forEach((d) => {
            const data = d.data();
            if (data.sessionId === activeSession.sessionId || data.sessionId === activeSession.id) {
              list.push({
                id: d.id,
                senderType: data.role || "user",
                senderId: data.userId,
                message: data.message || data.response || "",
                createdAt: data.timestamp || new Date().toISOString(),
                riskFlags: data.riskFlags || []
              });
            }
          });
        }

        setMessages(list);
      } catch (err) {
        console.warn("Error fetching session messages:", err);
      }
    }

    loadSessionMessages();
  }, [activeSession]);

  // Execute Admin Fraud Review Action
  const handleExecuteFraudAction = async (action: "RESTORE" | "WARN" | "SUSPEND" | "BLOCK") => {
    if (!activeSession?.recruiterId && !activeSession?.candidateId) {
      alert("No target account ID associated with this session.");
      return;
    }

    const targetUserId = activeSession.recruiterId || activeSession.candidateId;
    setIsExecuting(true);

    try {
      const res = await fetch("/api/admin/fraud-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          action,
          adminNotes: actionReason || `Admin executed ${action} action on session ${activeSession.sessionId}`,
          reviewedBy: "Super Admin"
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Action execution failed.");
      }

      alert(`🎉 Fraud action '${action}' completed successfully!`);
      setActionReason("");
      fetchSessions();
    } catch (err: any) {
      alert("Failed to execute action: " + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = 
      s.candidateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recruiterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sessionId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = 
      riskFilter === "all" ||
      (riskFilter === "high_risk" && (s.riskLevel === "high_risk" || s.riskFlags?.length)) ||
      s.riskLevel === riskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6" id="chat-monitoring-panel">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <span>Real-time Chat Monitoring & Anti-Fraud Center</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Audit candidate, recruiter, consultancy & AI assistant conversations in real-time. Detect unauthorized fee demands and freeze suspicious accounts.
          </p>
        </div>

        <button
          onClick={fetchSessions}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-300 font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sync Conversations</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate, recruiter, consultancy, or job title..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="high_risk">🚨 High Risk / Fraud Flagged</option>
            <option value="medium">⚠️ Medium Risk</option>
            <option value="normal">✅ Normal Conversations</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sessions List */}
        <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex justify-between items-center">
            <span>Chat Sessions ({filteredSessions.length})</span>
            <span className="text-[10px] text-gray-400">Monitoring Active</span>
          </h4>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSession(s)}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all cursor-pointer ${
                    activeSession?.id === s.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/5 bg-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-white text-xs truncate max-w-[180px]">{s.candidateName}</h5>
                      <p className="text-[10px] text-gray-400 font-mono truncate max-w-[180px]">
                        Target: {s.recruiterName || s.consultancyName || "AI Assistant"}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase border ${
                      s.riskLevel === "high_risk" ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse" :
                      s.riskLevel === "medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                      "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {s.riskLevel === "high_risk" ? "🚨 HIGH RISK" : s.riskLevel}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-300 line-clamp-1 italic">{s.lastMessage}</p>

                  <div className="flex justify-between text-[9px] font-mono text-gray-500 border-t border-white/5 pt-1.5">
                    <span>Job: {s.jobTitle}</span>
                    <span>{new Date(s.updatedAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
                No chat sessions aligned with search criteria.
              </div>
            )}
          </div>
        </div>

        {/* Selected Session Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {activeSession ? (
            <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
              
              {/* Active Session Info Header */}
              <div className="p-4 bg-slate-950/80 border border-white/10 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{activeSession.candidateName}</span>
                      <span className="text-gray-400 font-normal">↔</span>
                      <span>{activeSession.recruiterName || activeSession.consultancyName || "AI Assistant"}</span>
                    </h4>
                    <p className="text-xs text-indigo-300 font-mono mt-0.5">Job Posting: {activeSession.jobTitle}</p>
                  </div>

                  <div className="text-right font-mono text-[10px]">
                    <span className="text-gray-400 block">SESSION ID</span>
                    <strong className="text-white">{activeSession.sessionId}</strong>
                  </div>
                </div>

                {activeSession.riskLevel === "high_risk" && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>Fraud Alert Detected:</strong> Suspicious payment or fee demand phrase detected in this thread. Account frozen pending review.
                    </span>
                  </div>
                )}
              </div>

              {/* Message History Thread */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto p-3 bg-black/40 border border-white/5 rounded-xl scrollbar-thin scrollbar-thumb-white/10">
                {messages.length > 0 ? (
                  messages.map((m) => (
                    <div key={m.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="font-bold text-indigo-300 uppercase">{m.senderType} ({m.senderName || "User"})</span>
                        <span className="text-gray-500">{new Date(m.createdAt || Date.now()).toLocaleString()}</span>
                      </div>

                      <p className="text-xs text-gray-200 leading-relaxed font-sans">{m.message}</p>

                      {m.originalMessage && m.originalMessage !== m.message && (
                        <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-300 font-mono mt-1">
                          🔒 <strong>Original Unmasked Text (Admin Eye):</strong> {m.originalMessage}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-gray-500 italic">
                    No individual message logs captured for this session yet.
                  </div>
                )}
              </div>

              {/* Admin Fraud Resolution Controls */}
              <div className="p-4 bg-slate-950 border border-white/10 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Administrative Fraud Review & Account Actions</span>
                </h5>

                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter commentary justification for account action..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleExecuteFraudAction("RESTORE")}
                    disabled={isExecuting}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handleExecuteFraudAction("WARN")}
                    disabled={isExecuting}
                    className="py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Warn</span>
                  </button>

                  <button
                    onClick={() => handleExecuteFraudAction("SUSPEND")}
                    disabled={isExecuting}
                    className="py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Suspend</span>
                  </button>

                  <button
                    onClick={() => handleExecuteFraudAction("BLOCK")}
                    disabled={isExecuting}
                    className="py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Block</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-32 text-xs text-gray-500 italic bg-slate-950/40 border border-white/5 rounded-2xl">
              Select a conversation session to inspect message threads and execute anti-fraud actions.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
