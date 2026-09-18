import React, { useState } from "react";
import { 
  Briefcase, 
  Search, 
  Sparkles, 
  PhoneCall, 
  ShieldCheck, 
  Check, 
  ChevronRight, 
  ArrowRight, 
  Building2, 
  Users, 
  Zap, 
  Globe, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Star
} from "lucide-react";
import AIJobsLogo from "../AIJobsLogo";

interface EmployerHiringLandingProps {
  onGoToEmployerLogin: () => void;
  onGoToCandidateLogin: () => void;
  onGoToPostJob: () => void;
  onGoToCandidateSearch: () => void;
  onGoToPricing: () => void;
}

export default function EmployerHiringLanding({
  onGoToEmployerLogin,
  onGoToCandidateLogin,
  onGoToPostJob,
  onGoToCandidateSearch,
  onGoToPricing
}: EmployerHiringLandingProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How fast do job openings go live on AIJOBS and Google Jobs?",
      a: "Once submitted, postings undergo rapid compliance checks and are typically live within 1 to 2 hours. Verified GSTIN employers receive immediate automated indexing directly into Google Jobs."
    },
    {
      q: "How does the AI Calling Agent work?",
      a: "Our autonomous conversational agent dials applicant candidates, checks CTC expectations, confirms notice periods and key skills, and prepares a summarized evaluation card for your recruiters."
    },
    {
      q: "Can I search candidates before purchasing a subscription?",
      a: "Yes! Searching and filtering through our 100,000+ candidate database is 100% free and unlimited. You only use credits when choosing to unlock direct verified phone numbers and full resumes."
    },
    {
      q: "Is there an unlimited plan for high-volume staffing?",
      a: "Yes, our Unlimited Hiring Membership allows fast-scaling startups and enterprises to post unlimited requisitions and unlock candidate profiles without per-action metering."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07050d] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0714]/90 backdrop-blur-md border-b border-purple-500/20 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="cursor-pointer" onClick={() => window.location.href = "/"}>
              <AIJobsLogo size="md" />
            </div>

            <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-300">
              <a href="#database" className="hover:text-cyan-400 transition-colors">Candidate Database</a>
              <a href="#calling-agent" className="hover:text-cyan-400 transition-colors">AI Calling Agent</a>
              <a href="#pricing" onClick={(e) => { e.preventDefault(); onGoToPricing(); }} className="hover:text-cyan-400 transition-colors">Pricing & Plans</a>
              <a href="#enterprise" className="hover:text-cyan-400 transition-colors">Enterprise</a>
              <a href="#faqs" className="hover:text-cyan-400 transition-colors">FAQs</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onGoToCandidateLogin}
              className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1.5 hidden sm:inline-block cursor-pointer"
            >
              Candidate Login
            </button>
            <button
              onClick={onGoToEmployerLogin}
              className="text-xs font-bold text-cyan-300 hover:text-white px-3 py-1.5 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/10 transition-all cursor-pointer"
            >
              Employer Login
            </button>
            <button
              onClick={onGoToPostJob}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              Post a Job →
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-[#130b22] via-[#0d0718] to-[#07050d]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-cyan-500/10 via-purple-600/5 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI-POWERED RECRUITMENT SUITE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Want to hire?
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Find verified candidates faster with AI-powered hiring tools. Post requisitions, search 100,000+ engineers, and screen applicants with autonomous voice agents.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onGoToPostJob}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-400/25 flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-slate-950" />
              <span>Post a Job Free</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>

            <button
              onClick={onGoToCandidateSearch}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-sm border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>Search Candidate Database</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>OTP & Phone Verified Candidates</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Indexed on Google Jobs</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Autonomous AI Screening</span>
            </span>
          </div>
        </div>
      </section>

      {/* Feature 1: Candidate Database Preview */}
      <section id="database" className="py-16 px-4 sm:px-8 border-t border-purple-500/15 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>VERIFIED SOURCING POOL</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Instant Access to 100,000+ Pre-screened Profiles
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Never wait for inbound applicants. Search by technology stack, notice period, location, and verified salary parameters. Direct download of resumes and personal contact details with 100% credit refund protection.
            </p>

            <ul className="space-y-2 text-xs text-slate-300 pt-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>Unlimited free search, filtering & Boolean queries</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>1-credit unlock for direct phone, email, and ATS resume</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400" />
                <span>Unused credit rollover on subscription renewals</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                onClick={onGoToCandidateSearch}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                Explore Candidate Search →
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-[#17111F] border border-purple-500/20 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-xs font-bold text-white">Sample Verified Candidate</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">96% FIT</span>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-extrabold text-white">Aarav Sharma</div>
              <div className="text-xs text-cyan-400">Senior React & TypeScript Architect</div>
              <div className="text-[11px] text-slate-400">Bengaluru • 5.5 Years Exp • 15 Days Notice</div>
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {["React", "TypeScript", "Next.js", "Node.js", "AWS"].map(s => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                  {s}
                </span>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 font-mono">
              Phone: +91 98765 43210 (Verified)
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: AI Calling Agent Preview */}
      <section id="calling-agent" className="py-16 px-4 sm:px-8 border-t border-purple-500/15 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1 p-6 rounded-3xl bg-[#17111F] border border-cyan-500/30 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold text-white">Live Telephony Agent</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300">Call Time: 3m 42s</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0e0a14] border border-white/5 text-xs text-slate-300 space-y-1.5">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Screening Transcript:</span>
              <p className="text-[11px] leading-relaxed">
                "Candidate confirmed 4+ years in modern React and microservices. Current compensation is ₹16 LPA with an expectation of ₹22 LPA. Notice period is 30 days negotiable."
              </p>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-400 font-bold">AI Assessment: Strong Match</span>
              <span className="text-slate-400 font-mono">Status: Ready for Interview</span>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
              <PhoneCall className="w-3.5 h-3.5 text-purple-400" />
              <span>AUTONOMOUS TELEPHONY</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              AI Calling Agent Screens Applicants While You Sleep
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Stop playing phone tag. Our AI agent dials candidates to verify availability, salary expectations, notice period, and technical stack alignment, automatically sending verified summaries to your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Feature 3: Unlimited Hiring Plan Overview */}
      <section className="py-16 px-4 sm:px-8 border-t border-purple-500/15 bg-gradient-to-r from-blue-950/20 via-purple-950/20 to-cyan-950/20">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>ALL-INCLUSIVE RECRUITMENT</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Unlimited Hiring Membership
          </h2>

          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Zero limits. Post unlimited jobs, download unlimited candidate profiles, and deploy autonomous screening agents at a predictable flat rate.
          </p>

          <div className="pt-2">
            <button
              onClick={onGoToPricing}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-xl shadow-cyan-500/25 cursor-pointer"
            >
              View Unlimited Pricing Plans →
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-16 px-4 sm:px-8 border-t border-purple-500/15 max-w-4xl mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Frequently Asked Hiring Questions</h2>
          <p className="text-xs text-slate-400">Everything you need to know about publishing jobs and sourcing talent</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-[#17111F] border border-purple-500/20 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-extrabold text-white hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                {activeFaq === i ? <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
              </button>
              {activeFaq === i && (
                <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Employer Footer */}
      <footer className="mt-auto border-t border-purple-500/20 bg-[#0a0714] py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-xs text-slate-400">
          <div className="col-span-2 space-y-3">
            <AIJobsLogo size="md" />
            <p className="text-slate-400 text-xs max-w-xs">
              AI-powered hiring platform connecting verified technical talent with world-class employers and consultancies.
            </p>
            <div className="text-slate-500 text-[11px] font-mono">
              © {new Date().getFullYear()} AIJOBS (aijobs1.in). All rights reserved.
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider block font-mono">Product</span>
            <div className="space-y-1.5 flex flex-col">
              <a href="#database" className="hover:text-cyan-400">Candidate Database</a>
              <a href="#calling-agent" className="hover:text-cyan-400">AI Calling Agent</a>
              <a href="#pricing" onClick={onGoToPricing} className="hover:text-cyan-400">Job Posting Credits</a>
              <a href="#faqs" className="hover:text-cyan-400">Google Jobs Indexing</a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider block font-mono">Company</span>
            <div className="space-y-1.5 flex flex-col">
              <a href="/about" className="hover:text-cyan-400">About AIJOBS</a>
              <a href="/careers" className="hover:text-cyan-400">Careers</a>
              <a href="/contact" className="hover:text-cyan-400">Contact Us</a>
              <a href="/support" className="hover:text-cyan-400">Help Desk</a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-white text-xs uppercase tracking-wider block font-mono">Legal</span>
            <div className="space-y-1.5 flex flex-col">
              <a href="/privacy" className="hover:text-cyan-400">Privacy Policy</a>
              <a href="/terms" className="hover:text-cyan-400">Terms of Service</a>
              <a href="/security" className="hover:text-cyan-400">Security Guarantee</a>
              <a href="/refund" className="hover:text-cyan-400">Refund Policy</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
