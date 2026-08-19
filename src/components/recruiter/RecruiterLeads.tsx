import React, { useState } from "react";
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { RecruiterLead } from "./RecruiterTypes";

interface RecruiterLeadsProps {
  onOpenLiveChat?: (id: string, name: string) => void;
}

export default function RecruiterLeads({
  onOpenLiveChat
}: RecruiterLeadsProps) {
  const [leads, setLeads] = useState<RecruiterLead[]>([
    {
      id: "lead_1",
      candidateName: "Karthik Ranganathan",
      email: "karthik.r@example.com",
      phone: "+91 98450 12345",
      skills: ["React", "TypeScript", "Tailwind CSS"],
      experience: "5.0 Years",
      source: "AIJOBS Career Portal",
      assignedBy: "Admin Operations",
      assignedAt: "Today 10:00 AM",
      status: "uncontacted"
    },
    {
      id: "lead_2",
      candidateName: "Tanvi Saxena",
      email: "tanvi.saxena@example.com",
      phone: "+91 97110 54321",
      skills: ["Python", "FastAPI", "Gemini API"],
      experience: "3.0 Years",
      source: "Direct Inbound Lead",
      assignedBy: "Admin Operations",
      assignedAt: "Yesterday",
      status: "in_discussion"
    }
  ]);

  const updateLeadStatus = (leadId: string, status: RecruiterLead["status"]) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));
  };

  return (
    <div className="space-y-6" id="recruiter-leads-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>ADMIN ASSIGNED TALENT LEADS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Inbound Candidate Leads</h2>
          <p className="text-xs text-slate-400">Direct candidate inquiries automatically routed to you by the recruitment administrator</p>
        </div>

        <span className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
          {leads.length} Active Leads
        </span>
      </div>

      {/* Table */}
      <div className="p-6 rounded-3xl bg-[#17111F]/80 border border-purple-500/20 backdrop-blur-md shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-purple-500/20 text-[11px] font-mono text-slate-400 uppercase">
            <tr>
              <th className="pb-3 font-semibold">Lead Candidate</th>
              <th className="pb-3 font-semibold">Experience & Skills</th>
              <th className="pb-3 font-semibold">Assigned By</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-right">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {leads.map((l) => (
              <tr key={l.id} className="hover:bg-white/5 transition-colors">
                <td className="py-4 pr-4">
                  <div className="font-extrabold text-white text-sm">{l.candidateName}</div>
                  <div className="text-[11px] text-slate-400">{l.email}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{l.phone}</div>
                </td>
                <td className="py-4 pr-4">
                  <div className="font-mono text-slate-300 font-bold mb-1">{l.experience}</div>
                  <div className="flex flex-wrap gap-1">
                    {l.skills.map((sk) => (
                      <span key={sk} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] font-mono">
                        {sk}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4 pr-4 text-slate-400">
                  <div>{l.assignedBy}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{l.assignedAt}</div>
                </td>
                <td className="py-4 pr-4">
                  <select
                    value={l.status}
                    onChange={(e) => updateLeadStatus(l.id, e.target.value as any)}
                    className="px-2.5 py-1 rounded-xl bg-[#0e0a14] border border-purple-500/30 text-xs font-bold text-white capitalize focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="uncontacted">Uncontacted</option>
                    <option value="in_discussion">In Discussion</option>
                    <option value="interested">Interested</option>
                    <option value="converted">Converted to Pipeline</option>
                  </select>
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => onOpenLiveChat && onOpenLiveChat(l.id, l.candidateName)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contact</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
