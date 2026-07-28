import React, { useState } from "react";
import { 
  Briefcase, DollarSign, Clock, CheckCircle2, ShieldCheck, Send,
  Filter, Sparkles, FileText, ChevronRight, UserCheck, Code
} from "lucide-react";

export interface GigProject {
  id: string;
  title: string;
  companyName: string;
  category: "Web Development" | "AI & ML" | "Mobile" | "UI/UX Design" | "DevOps";
  budget: string;
  duration: string;
  workType: "Freelance" | "Contract" | "Remote" | "Internship" | "Full Time";
  skillsRequired: string[];
  proposalsCount: number;
  escrowStatus: "Secured in Escrow" | "Pending Escrow";
  description: string;
  milestones: Array<{ name: string; amount: string; status: "Completed" | "In Progress" | "Pending" }>;
}

const GIGS_SEED: GigProject[] = [
  {
    id: "gig-1",
    title: "Build Real-Time Multi-User Collaboration Canvas with Konva.js",
    companyName: "CollabCraft Tech",
    category: "Web Development",
    budget: "$3,500 Fixed",
    duration: "3 Weeks",
    workType: "Freelance",
    skillsRequired: ["React", "Konva.js", "WebSockets", "Node.js"],
    proposalsCount: 12,
    escrowStatus: "Secured in Escrow",
    description: "We require a senior frontend architect to build an interactive collaborative whiteboard canvas with multiplayer cursor presence.",
    milestones: [
      { name: "Milestone 1: Konva Canvas setup & local drawing state", amount: "$1,000", status: "Completed" },
      { name: "Milestone 2: WebSocket sync & multi-cursor engine", amount: "$1,500", status: "In Progress" },
      { name: "Milestone 3: Export to PDF & PNG + final audit", amount: "$1,000", status: "Pending" }
    ]
  },
  {
    id: "gig-2",
    title: "Fine-Tune Llama 3 & Deploy Gemini Agentic Pipeline",
    companyName: "NeuralNexus Systems",
    category: "AI & ML",
    budget: "$5,000 Fixed",
    duration: "4 Weeks",
    workType: "Contract",
    skillsRequired: ["Google Gemini API", "Python", "PyTorch", "FastAPI"],
    proposalsCount: 8,
    escrowStatus: "Secured in Escrow",
    description: "Looking for an AI engineer to fine-tune domain LLMs and build a multi-agent orchestration wrapper with search grounding.",
    milestones: [
      { name: "Milestone 1: Dataset curation & preprocessing pipeline", amount: "$1,500", status: "Completed" },
      { name: "Milestone 2: Multi-Agent wrapper & Gemini API grounding", amount: "$2,500", status: "Pending" },
      { name: "Milestone 3: Benchmark evaluation & documentation", amount: "$1,000", status: "Pending" }
    ]
  }
];

export default function GigMarketplace() {
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("All");
  const [selectedGig, setSelectedGig] = useState<GigProject | null>(null);
  const [proposalText, setProposalText] = useState("");
  const [proposalSubmitted, setProposalSubmitted] = useState(false);

  const filteredGigs = GIGS_SEED.filter(g => workTypeFilter === "All" || g.workType === workTypeFilter);

  const handleSubmitProposal = () => {
    if (!proposalText.trim()) return;
    setProposalSubmitted(true);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-neutral-900 to-black border border-amber-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold mb-3">
              <Briefcase className="w-3.5 h-3.5 text-amber-400" />
              <span>MODULE 8 — FREELANCER & GIG MARKETPLACE</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Freelance Projects & Escrow Contract Engine</span>
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </h2>
            <p className="text-gray-300 text-xs md:text-sm mt-1 max-w-2xl">
              Browse verified contract and gig opportunities, submit proposals, track milestone deliverables, and receive guaranteed escrow payouts.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 text-emerald-300 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Escrow Protected Payments</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto scrollbar pb-1">
        {["All", "Freelance", "Contract", "Remote", "Internship", "Full Time"].map(wt => (
          <button
            key={wt}
            onClick={() => setWorkTypeFilter(wt)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              workTypeFilter === wt
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "bg-neutral-900 border border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {wt}
          </button>
        ))}
      </div>

      {/* Gigs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGigs.map(gig => (
          <div
            key={gig.id}
            className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold">
                  {gig.workType}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{gig.escrowStatus}</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-lg">{gig.title}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{gig.companyName} • {gig.duration}</p>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">{gig.description}</p>

              {/* Skills badges */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {gig.skillsRequired.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-black/40 border border-white/5 text-[10px] text-gray-300 font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Milestones Preview */}
            <div className="pt-4 border-t border-white/5 space-y-3">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">Project Milestones:</span>
              <div className="space-y-1.5">
                {gig.milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-mono p-2 bg-black/40 rounded-lg border border-white/5">
                    <span className="text-gray-300 truncate pr-2">{m.name}</span>
                    <span className="font-bold text-amber-400 shrink-0">{m.amount}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-extrabold text-white font-mono">{gig.budget}</span>
                <button
                  onClick={() => { setSelectedGig(gig); setProposalSubmitted(false); }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-600/20 cursor-pointer"
                >
                  <span>Submit Proposal</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Proposal Modal */}
      {selectedGig && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">SUBMIT GIG PROPOSAL</span>
                <h3 className="text-base font-bold text-white">{selectedGig.title}</h3>
              </div>
              <button
                onClick={() => setSelectedGig(null)}
                className="px-2.5 py-1 rounded bg-white/5 text-gray-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                Close
              </button>
            </div>

            {!proposalSubmitted ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-gray-400">Cover Letter & Technical Pitch:</label>
                  <textarea
                    rows={4}
                    value={proposalText}
                    onChange={(e) => setProposalText(e.target.value)}
                    placeholder="Describe your relevant experience, proposed milestone timeline, and technical approach..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-mono text-emerald-400 font-bold">Proposed Rate: {selectedGig.budget}</span>
                  <button
                    onClick={handleSubmitProposal}
                    disabled={!proposalText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-amber-600/20 cursor-pointer"
                  >
                    <span>Send Proposal</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-lg font-bold text-white">Proposal Successfully Dispatched!</h4>
                <p className="text-xs text-gray-300 font-mono">
                  The client has been notified. You will receive an alert as soon as the escrow milestone deposit is initiated.
                </p>
                <button
                  onClick={() => setSelectedGig(null)}
                  className="px-6 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer"
                >
                  Return to Gig Board
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
