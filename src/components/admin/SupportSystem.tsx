import { useState } from "react";
import { 
  HelpCircle, Search, Filter, ShieldAlert, CheckCircle, MessageSquare, 
  Send, AlertTriangle, Users, BookOpen, UserPlus, Clock, ArrowRight 
} from "lucide-react";
import { SupportTicket } from "./AdminTypes";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface SupportSystemProps {
  tickets: SupportTicket[];
  onRefresh: () => void;
  userName: string;
}

export default function SupportSystem({
  tickets,
  onRefresh,
  userName
}: SupportSystemProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState("");

  // Knowledge base articles
  const [articles, setArticles] = useState([
    { title: "Resolving ATS scoring discrepancies", group: "Resume Analyzer" },
    { title: "Configuring SMTP SMTP verification nodes", group: "Server Setup" },
    { title: "Resetting Candidate mock assessment tokens", group: "AI Interview" }
  ]);
  const [newArticle, setNewArticle] = useState({ title: "", group: "Resume Analyzer" });

  const handleUpdateTicketStatus = async (
    tkt: SupportTicket, 
    nextStatus: SupportTicket["status"],
    nextPriority?: SupportTicket["priority"]
  ) => {
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "support", tkt.id), {
        status: nextStatus,
        priority: nextPriority || tkt.priority,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Create log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: tkt.userId,
        userName: tkt.userName,
        userEmail: tkt.userEmail,
        role: "Super Admin",
        action: "UPDATE",
        category: "Support",
        description: `Support ticket #${tkt.id} was marked as status: ${nextStatus} (Priority: ${nextPriority || tkt.priority}).`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`🎉 Ticket status successfully updated to: ${nextStatus}`);
      if (selectedTicket?.id === tkt.id) {
        setSelectedTicket({
          ...tkt,
          status: nextStatus,
          priority: nextPriority || tkt.priority
        });
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setIsSubmitting(true);

    try {
      const currentReplies = selectedTicket.replies || [];
      const newReply = {
        id: `rep_${Math.random().toString(36).substr(2, 9)}`,
        sender: "admin" as const,
        senderName: userName,
        message: replyText,
        createdAt: new Date().toISOString()
      };

      const updatedReplies = [...currentReplies, newReply];

      // Save to Firestore
      await setDoc(doc(db, "support", selectedTicket.id), {
        status: "IN_PROGRESS",
        replies: updatedReplies,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      alert("Reply logged in ticket conversation.");
      setSelectedTicket({
        ...selectedTicket,
        status: "IN_PROGRESS",
        replies: updatedReplies
      });
      setReplyText("");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.title.trim()) return;
    setArticles([...articles, newArticle]);
    setNewArticle({ title: "", group: "Resume Analyzer" });
    alert("Article added to system knowledge base.");
  };

  // Filter tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || t.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="support-system-vault">
      {/* View Header */}
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <span>Technical Support, Escalation & Chat Registry</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Perform administrative client support, resolve ticket backlogs, upgrade escalation queues, and publish knowledge base documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ticket queue lists */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Advanced filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-gray-300">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket subject, client email, or ID..."
                className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Ticket Statuses</option>
                <option value="OPEN">Open (New)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ESCALATED">Escalated</option>
                <option value="RESOLVED">Resolved (Completed)</option>
              </select>
            </div>

            <div className="flex items-center justify-end font-mono text-[10px] text-gray-400">
              Active Support Cases: <strong className="text-white ml-1">{filteredTickets.length}</strong>
            </div>
          </div>

          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Active Support Queue</h4>

            <div className="space-y-3">
              {filteredTickets.length > 0 ? (
                filteredTickets.map((t) => (
                  <div 
                    key={t.id} 
                    className={`p-4 bg-white/5 border rounded-xl space-y-3 hover:border-indigo-500/30 transition-all cursor-pointer ${
                      selectedTicket?.id === t.id ? "border-indigo-500 bg-indigo-500/5" : "border-white/5"
                    }`}
                    onClick={() => setSelectedTicket(t)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border mr-2 uppercase ${
                          t.priority === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border-rose-500/25" :
                          t.priority === "HIGH" ? "bg-amber-500/10 text-amber-400 border-amber-500/25" :
                          "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                        }`}>
                          {t.priority}
                        </span>

                        <span className="text-[9px] font-mono text-gray-500 uppercase">{t.category}</span>
                        <h4 className="font-extrabold text-sm text-white mt-1.5">{t.subject}</h4>
                      </div>

                      <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        t.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" :
                        t.status === "ESCALATED" ? "bg-rose-500/10 text-rose-400 animate-pulse" :
                        t.status === "IN_PROGRESS" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                      }`}>{t.status}</span>
                    </div>

                    <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{t.message}</p>

                    <div className="flex justify-between items-center pt-2.5 border-t border-white/5 font-mono text-[9px] text-gray-500">
                      <span>Billed Client: <strong className="text-gray-300">{t.userName} ({t.role})</strong></span>
                      <span>Last Activity: {new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
                  Support queue is clear. No matching tickets.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticket dialog chat & Knowledge base */}
        <div className="space-y-6">
          
          {/* Active dialogue */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Dialogue Desk</span>
            </h4>

            {selectedTicket ? (
              <div className="space-y-4 text-[11px] leading-relaxed">
                
                {/* Core ticket text body */}
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                  <span className="text-[8px] font-mono text-gray-500 block uppercase">ORIGINAL MESSAGE</span>
                  <p className="text-gray-300 font-medium">{selectedTicket.message}</p>
                </div>

                {/* Dialog thread */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((r) => (
                      <div key={r.id} className={`p-2.5 rounded-xl text-[10px] space-y-1 ${
                        r.sender === "admin" ? "bg-indigo-600/10 border border-indigo-500/20 ml-4 text-indigo-300" : "bg-white/5 text-gray-300 mr-4"
                      }`}>
                        <div className="flex justify-between items-center text-[8px] font-mono text-gray-500">
                          <span>{r.senderName} ({r.sender})</span>
                          <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="leading-normal">{r.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-[9px] text-gray-500 italic">No replies on thread.</div>
                  )}
                </div>

                {/* Response builder */}
                <form onSubmit={handleSendReply} className="space-y-3 pt-3 border-t border-white/5">
                  <textarea
                    required
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type official system reply..."
                    className="w-full h-20 bg-neutral-900 border border-white/10 rounded-lg p-2 text-white font-mono text-[10px] resize-none focus:border-indigo-500 transition-all"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Reply</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(selectedTicket, "RESOLVED")}
                      className="px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/20 cursor-pointer"
                      title="Mark as Resolved"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateTicketStatus(selectedTicket, "ESCALATED", "CRITICAL")}
                      className="px-3 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg border border-rose-500/20 cursor-pointer"
                      title="Escalate priority to Critical"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                </form>

              </div>
            ) : (
              <div className="text-center py-24 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose an active ticket case to inspect replies or log administrative comments.
              </div>
            )}
          </div>

          {/* Knowledge base curation */}
          <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Technical Knowledge Base</span>
            </h4>

            <div className="space-y-1.5">
              {articles.map((art) => (
                <div key={art.title} className="p-2.5 bg-neutral-950/30 border border-white/5 rounded-lg flex flex-col justify-between text-xs">
                  <p className="text-white font-medium">{art.title}</p>
                  <span className="text-[8px] font-mono text-gray-500 uppercase mt-1">Topic: {art.group}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddArticle} className="space-y-2 text-xs">
              <input
                type="text"
                required
                value={newArticle.title}
                onChange={e => setNewArticle({ ...newArticle, title: e.target.value })}
                placeholder="Configure local SMTP server..."
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
              />
              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Publish Article
              </button>
            </form>
          </div>

        </div>
      </div>

    </div>
  );
}
