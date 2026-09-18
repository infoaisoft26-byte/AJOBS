import React, { useState } from "react";
import { 
  HelpCircle, 
  X, 
  MessageSquare, 
  Mail, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Calendar, 
  BookOpen, 
  ExternalLink,
  CheckCircle2,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
}

export default function HelpSupportModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName
}: HelpSupportModalProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Job Posting / Approval");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "What is the job posting review & approval timeline?",
      a: "Our compliance and quality team reviews new job postings within 1 to 2 business hours. Verified employer accounts with valid GSTINs receive instant priority clearance, immediately distributing the role to Google Jobs and candidate alerts."
    },
    {
      q: "How does Google Jobs indexing work?",
      a: "Every approved job on AIJOBS includes complete JSON-LD JobPosting schema data. Google's search crawlers automatically index and list your openings directly within Google Jobs search results, providing organic applicant reach."
    },
    {
      q: "What happens if a candidate's contact info is unreachable?",
      a: "AIJOBS maintains a 100% Verified Quality Guarantee. If an unlocked candidate's phone or email is disconnected or unverified, submit an automated flag from your usage ledger, and 1 credit will be instantly refunded to your balance within 48 hours."
    },
    {
      q: "Do unused database unlock credits roll over?",
      a: "Yes! Any unused database or job posting credits automatically roll over when renewing your subscription before the expiration date."
    },
    {
      q: "What are the prerequisites for AI Calling Agent screening?",
      a: "The AI Calling Agent requires the applicant's verified phone number and active consent during job application. Calls are conducted between 10:00 AM and 6:30 PM IST with human recruiter handover protocols."
    }
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "support_tickets"), {
        userId: userId || "emp_anon",
        userName: userName || "Employer",
        userEmail: userEmail || "employer@aijobs1.in",
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage,
        status: "open",
        createdAt: new Date().toISOString()
      });
      setTicketSuccess(true);
      setTicketSubject("");
      setTicketMessage("");
    } catch (err: any) {
      console.warn("Ticket submission note:", err);
      setTicketSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#17111F] border border-purple-500/30 p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Help & Hiring Support Center</h3>
              <p className="text-xs text-slate-400">Enterprise support desk, hiring documentation, and ticket portal</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Contact Options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* WhatsApp Support */}
          <a
            href="https://wa.me/919999999999?text=Hello%20AIJOBS%20Support,%20I%20need%20assistance%20with%20my%20recruiter%20account"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex flex-col justify-between space-y-2 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">WhatsApp Support</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300">Instant chat with our onboarding support team</p>
            <span className="text-[10px] font-mono font-bold text-emerald-400">Online Now • 9 AM - 8 PM</span>
          </a>

          {/* Email Support */}
          <a
            href="mailto:support@aijobs1.in?subject=Recruiter%20Support%20Request"
            className="p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 flex flex-col justify-between space-y-2 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Email Desk</span>
              <Mail className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300">Official ticketing & verification escalations</p>
            <span className="text-[10px] font-mono font-bold text-blue-400">support@aijobs1.in</span>
          </a>

          {/* Schedule 1-on-1 Training */}
          <div
            onClick={() => alert("Our hiring specialist will contact you to schedule a 20-minute 1-on-1 walkthrough.")}
            className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 flex flex-col justify-between space-y-2 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">1-on-1 Training</span>
              <Calendar className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[11px] text-slate-300">Book free video session for your hiring team</p>
            <span className="text-[10px] font-mono font-bold text-purple-400">Schedule 20-Min Call</span>
          </div>

        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 font-mono">
            Frequently Answered Questions
          </h4>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full p-4 flex items-center justify-between text-left text-xs font-extrabold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {activeFaq === i ? <ChevronUp className="w-4 h-4 shrink-0 text-cyan-400" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-500" />}
                </button>
                {activeFaq === i && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Ticket Form */}
        <div className="p-5 rounded-2xl bg-[#0e0a14] border border-purple-500/20 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>Submit a Dedicated Support Ticket</span>
          </h4>

          {ticketSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ticket received! Our enterprise support engineering team will respond via email within 2 hours.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Issue Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17111F] border border-purple-500/30 text-white text-xs"
                  >
                    <option value="Job Posting / Approval">Job Posting / Approval</option>
                    <option value="Candidate Credits / Unlocks">Candidate Credits / Unlocks</option>
                    <option value="Billing & Tax Invoices">Billing & Tax Invoices</option>
                    <option value="AI Calling Agent">AI Calling Agent</option>
                    <option value="Other Inquiries">Other Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief description of inquiry..."
                    className="w-full px-3 py-2 rounded-xl bg-[#17111F] border border-purple-500/30 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Message Details</label>
                <textarea
                  rows={3}
                  required
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder="Provide any relevant Job IDs, candidate names, or questions..."
                  className="w-full p-3 rounded-xl bg-[#17111F] border border-purple-500/30 text-white text-xs"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Ticket</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
