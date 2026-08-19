import React, { useState } from "react";
import { 
  MessageSquare, 
  Send, 
  Search, 
  CheckCheck, 
  Paperclip, 
  Sparkles,
  User,
  ShieldCheck
} from "lucide-react";

interface EmployerMessagesProps {
  initialRecipientId?: string;
  initialRecipientName?: string;
}

export default function EmployerMessages({
  initialRecipientId,
  initialRecipientName
}: EmployerMessagesProps) {
  const [conversations, setConversations] = useState([
    {
      id: initialRecipientId || "conv_1",
      name: initialRecipientName || "Aarav Sharma",
      role: "Senior React & TypeScript Engineer",
      lastMsg: "Thank you for the update. I am ready for the technical round on Thursday.",
      time: "10:45 AM",
      unread: 0,
      messages: [
        { sender: "candidate", text: "Hello! Thank you for reviewing my application for the Senior React Engineer position.", time: "10:30 AM" },
        { sender: "employer", text: "Hi Aarav, we were impressed with your experience with high-throughput UI design systems. We would love to schedule a technical round.", time: "10:40 AM" },
        { sender: "candidate", text: "Thank you for the update. I am ready for the technical round on Thursday.", time: "10:45 AM" }
      ]
    },
    {
      id: "conv_2",
      name: "Pooja Patel",
      role: "Full Stack Node.js Developer",
      lastMsg: "I have shared my updated GitHub repo with Docker setup.",
      time: "Yesterday",
      unread: 1,
      messages: [
        { sender: "candidate", text: "Hi, I have shared my updated GitHub repo with Docker setup.", time: "Yesterday" }
      ]
    },
    {
      id: "conv_3",
      name: "Vikram Malhotra",
      role: "AI / ML Solutions Engineer",
      lastMsg: "Looking forward to speaking with the VP of Engineering.",
      time: "Aug 16",
      unread: 0,
      messages: [
        { sender: "candidate", text: "Looking forward to speaking with the VP of Engineering.", time: "Aug 16" }
      ]
    }
  ]);

  const [activeConvId, setActiveConvId] = useState(conversations[0]?.id || "conv_1");
  const [inputMsg, setInputMsg] = useState("");

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const updatedConvs = conversations.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMsg: inputMsg,
          time: "Just now",
          messages: [
            ...c.messages,
            { sender: "employer", text: inputMsg, time: "Just now" }
          ]
        };
      }
      return c;
    });

    setConversations(updatedConvs);
    setInputMsg("");
  };

  return (
    <div className="space-y-6" id="employer-messages-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>DIRECT MESSAGING CONSOLE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Candidate Conversations</h2>
          <p className="text-xs text-slate-400">Secure real-time communication channel with applicants and sourced talent</p>
        </div>
      </div>

      {/* Chat Layout Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 overflow-hidden shadow-2xl backdrop-blur-md h-[600px]">
        
        {/* Left Conversation List (4 cols) */}
        <div className="lg:col-span-4 border-r border-purple-500/20 flex flex-col h-full bg-[#120d1a]/60">
          <div className="p-4 border-b border-purple-500/20">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-purple-500/10">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                    isActive ? "bg-blue-600/15 border-l-4 border-blue-500" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                    {conv.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">{conv.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{conv.time}</span>
                    </div>
                    <p className="text-[11px] text-blue-300 truncate">{conv.role}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-1">{conv.lastMsg}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Chat Thread (8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-[#17111F]/90">
          {/* Thread Header */}
          <div className="p-4 border-b border-purple-500/20 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {activeConv?.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">{activeConv?.name}</h4>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active Now • Verified Candidate
                </span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {activeConv?.messages.map((m, idx) => {
              const isMe = m.sender === "employer";
              return (
                <div key={idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                    isMe 
                      ? "bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/20" 
                      : "bg-[#0e0a14] border border-purple-500/30 text-slate-200 rounded-bl-none"
                  }`}>
                    <p>{m.text}</p>
                    <span className={`text-[9px] block mt-1.5 font-mono text-right ${isMe ? "text-blue-200" : "text-slate-500"}`}>
                      {m.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input Footer */}
          <form onSubmit={handleSend} className="p-4 border-t border-purple-500/20 bg-black/30 flex items-center gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type your message to candidate..."
              className="flex-1 px-4 py-3 rounded-2xl bg-[#0e0a14] border border-purple-500/30 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/25 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
