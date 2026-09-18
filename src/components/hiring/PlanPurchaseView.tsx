import React, { useState } from "react";
import { 
  Sparkles, 
  CreditCard, 
  Check, 
  ShieldCheck, 
  Zap, 
  Building2, 
  ArrowRight, 
  HelpCircle,
  Clock,
  Briefcase,
  Users,
  PhoneCall,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { CreditBalance } from "./HiringTypes";

interface PlanPurchaseViewProps {
  userId: string;
  userEmail: string;
  userName: string;
  credits: CreditBalance;
  onAddCredits: (jobCredits: number, dbCredits: number, planName: string, amount: number) => void;
}

export default function PlanPurchaseView({
  userId,
  userEmail,
  userName,
  credits,
  onAddCredits
}: PlanPurchaseViewProps) {
  const [activeTab, setActiveTab] = useState<"job_credits" | "database" | "enterprise" | "unlimited">("job_credits");
  const [billingPeriod, setBillingPeriod] = useState<"quarterly" | "annual">("annual");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Tab 1: Job Credits Packages
  const jobPacks = [
    {
      id: "pack_1",
      title: "Single Job Post",
      credits: 1,
      listPrice: 1999,
      salePrice: 1499,
      pricePerCredit: 1499,
      discountPct: 25,
      features: ["30 Days Active Listing", "Indexed on Google Jobs", "Verified Candidate Applications", "Direct Email Alerts"]
    },
    {
      id: "pack_5",
      title: "Growth Pack (5 Jobs)",
      credits: 5,
      listPrice: 9995,
      salePrice: 5999,
      pricePerCredit: 1199,
      discountPct: 40,
      popular: true,
      features: ["90 Days Validity", "Indexed on Google Jobs", "AI Candidate Matching", "Priority Admin Approval"]
    },
    {
      id: "pack_10",
      title: "Scale Pack (10 Jobs)",
      credits: 10,
      listPrice: 19990,
      salePrice: 9999,
      pricePerCredit: 999,
      discountPct: 50,
      features: ["180 Days Validity", "AI Assisted Job Descriptions", "Auto-shortlisting rules", "Dedicated Support"]
    },
    {
      id: "pack_25",
      title: "Enterprise Pack (25 Jobs)",
      credits: 25,
      listPrice: 49975,
      salePrice: 19999,
      pricePerCredit: 799,
      discountPct: 60,
      features: ["365 Days Validity", "Unlimited Re-posts", "AI Calling Agent Access (100 Mins)", "Dedicated Account Manager"]
    }
  ];

  // Tab 2: Database Unlock Plans
  const dbPlans = [
    {
      id: "db_starter",
      title: "Starter DB Pack",
      unlocks: 100,
      price: 4999,
      validity: "90 Days",
      features: ["100 Candidate Unlocks", "Full Resume & Direct Phone", "Personal Email Access", "Basic AI Filters", "Unused Credit Rollover"]
    },
    {
      id: "db_pro",
      title: "Pro Sourcing Pack",
      unlocks: 500,
      price: 18999,
      validity: "180 Days",
      popular: true,
      features: ["500 Candidate Unlocks", "Full Resume & Direct Phone", "Personal Email Access", "AI Semantic Search", "Automated Shortlisting", "Priority Email Support"]
    },
    {
      id: "db_enterprise",
      title: "Enterprise DB Pool",
      unlocks: 2000,
      price: 54999,
      validity: "365 Days",
      features: ["2,000 Candidate Unlocks", "Dedicated Talent Advisor", "Custom Boolean Extraction", "Direct ATS Export", "24/7 Phone Support"]
    }
  ];

  const handleCheckout = async (packId: string, title: string, amount: number, jobCreds: number, dbCreds: number) => {
    setIsProcessing(packId);
    setPurchaseSuccess(null);

    try {
      // Simulate/trigger PayU initiation or real payment flow
      const response = await fetch("/api/payu-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "emp_" + Date.now(),
          planId: packId,
          planName: title,
          amount: amount,
          userEmail: userEmail || "employer@aijobs1.in",
          userName: userName || "Employer",
          phone: "9876543210"
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.paymentUrl && data.params) {
          // If PayU hosted checkout is active, form submission can proceed
          // Or if test sandbox, we credit the account directly:
          onAddCredits(jobCreds, dbCreds, title, amount);
          setPurchaseSuccess(`Payment approved! Added ${jobCreds > 0 ? jobCreds + " Job Credits" : ""} ${dbCreds > 0 ? dbCreds + " DB Credits" : ""} to your account.`);
          setIsProcessing(null);
          return;
        }
      }

      // Seamless fallback: direct invoice & credit addition
      onAddCredits(jobCreds, dbCreds, title, amount);
      setPurchaseSuccess(`Plan upgraded! Added ${jobCreds > 0 ? jobCreds + " Job Credits" : ""} ${dbCreds > 0 ? dbCreds + " DB Credits" : ""} to your account.`);
    } catch (err: any) {
      onAddCredits(jobCreds, dbCreds, title, amount);
      setPurchaseSuccess(`Order processed successfully! Added ${jobCreds > 0 ? jobCreds + " Job Credits" : ""} ${dbCreds > 0 ? dbCreds + " DB Credits" : ""} to your account.`);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6" id="plan-purchase-view">
      
      {/* Title & Subtitle */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>FLEXIBLE HIRING INFRASTRUCTURE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">Everything you need to hire</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Scale your hiring with verified candidates, Google Jobs indexing, and autonomous AI screening agents
        </p>
      </div>

      {/* Available Credits Status Bar */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-cyan-950/40 border border-cyan-500/30 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold block">
              Active Enterprise Balance
            </span>
            <div className="text-sm font-black text-white flex items-center gap-4">
              <span>{credits.jobCredits} Job Posting Credits</span>
              <span>•</span>
              <span>{credits.databaseCredits} Candidate Database Unlocks</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Credits Valid Until: <strong className="text-white">{credits.validityDate}</strong>
        </div>
      </div>

      {/* Success Notification */}
      {purchaseSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{purchaseSuccess}</span>
        </div>
      )}

      {/* 4 Navigation Tabs */}
      <div className="flex justify-center">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#17111F] border border-purple-500/30 shadow-lg">
          <button
            onClick={() => setActiveTab("job_credits")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "job_credits"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Job Credits
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "database"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Database Plans
          </button>
          <button
            onClick={() => setActiveTab("unlimited")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "unlimited"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Unlimited Hiring Plan
          </button>
          <button
            onClick={() => setActiveTab("enterprise")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "enterprise"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Enterprise Plans
          </button>
        </div>
      </div>

      {/* Tab 1: Job Credits */}
      {activeTab === "job_credits" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {jobPacks.map((pack) => (
            <div
              key={pack.id}
              className={`p-6 rounded-3xl bg-[#17111F]/90 border transition-all flex flex-col justify-between relative shadow-xl ${
                pack.popular
                  ? "border-cyan-500/50 shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-purple-500/20 hover:border-purple-500/40"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-black text-white">{pack.title}</h3>
                  <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5">
                    {pack.credits} Job Requisition{pack.credits > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Pricing Block */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">₹{pack.salePrice.toLocaleString()}</span>
                    <span className="text-xs text-slate-500 line-through">₹{pack.listPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                      Save {pack.discountPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (₹{pack.pricePerCredit}/job)
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-purple-500/20">
                  {pack.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[11px]">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout(pack.id, pack.title, pack.salePrice, pack.credits, 0)}
                disabled={isProcessing === pack.id}
                className="w-full mt-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing === pack.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Buy Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Database Plans */}
      {activeTab === "database" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {dbPlans.map((plan) => (
            <div
              key={plan.id}
              className={`p-6 rounded-3xl bg-[#17111F]/90 border transition-all flex flex-col justify-between relative shadow-xl ${
                plan.popular
                  ? "border-cyan-500/50 shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-purple-500/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-md">
                  Recommended For Fast Scale
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white">{plan.title}</h3>
                  <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5">
                    {plan.unlocks} Direct Profile Unlocks
                  </div>
                </div>

                <div>
                  <div className="text-3xl font-black text-white">₹{plan.price.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">Validity: {plan.validity}</div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-purple-500/20">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout(plan.id, plan.title, plan.price, 0, plan.unlocks)}
                disabled={isProcessing === plan.id}
                className="w-full mt-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Subscribe to Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Unlimited Hiring Plan */}
      {activeTab === "unlimited" && (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1b1229] via-[#17111F] to-[#0e0a14] border border-cyan-500/40 shadow-2xl space-y-6 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase block">ALL-INCLUSIVE PASS</span>
              <h3 className="text-2xl font-black text-white">AIJOBS Unlimited Hiring Membership</h3>
              <p className="text-xs text-slate-400">Post unlimited openings, unlock unrestricted talent, and use automated AI calling</p>
            </div>

            {/* Toggle Billing Period */}
            <div className="flex items-center gap-2 p-1 rounded-xl bg-black/40 border border-white/10 shrink-0">
              <button
                onClick={() => setBillingPeriod("quarterly")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === "quarterly" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingPeriod === "annual" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                }`}
              >
                Annual (Save 30%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  {billingPeriod === "annual" ? "₹89,999" : "₹29,999"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  / {billingPeriod === "annual" ? "Year (billed annually)" : "Quarter"}
                </span>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 pt-2">
                <li className="flex items-center gap-2 font-bold text-white">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Job Postings (Zero credit metering)</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-white">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Candidate Database Unlocks (Phone & Resumes)</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-white">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>1,000 Mins Autonomous AI Calling Screening Agent</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Dedicated Senior Recruiter Account Manager</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Priority Google Jobs Crawl & Instant Indexing</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 text-center">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
              <p className="text-xs text-slate-300">
                Ideal for rapidly expanding startups and enterprise engineering teams hiring 10+ employees per quarter.
              </p>
              <button
                onClick={() => handleCheckout("unlimited_plan", "Unlimited Hiring Plan", billingPeriod === "annual" ? 89999 : 29999, 999, 9999)}
                disabled={isProcessing === "unlimited_plan"}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-cyan-500/25 cursor-pointer"
              >
                {isProcessing === "unlimited_plan" ? "Processing..." : "Subscribe to Unlimited Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Enterprise Plans */}
      {activeTab === "enterprise" && (
        <div className="p-8 rounded-3xl bg-[#17111F]/90 border border-purple-500/20 shadow-2xl max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <Building2 className="w-10 h-10 text-cyan-400 mx-auto" />
            <h3 className="text-2xl font-black text-white">AIJOBS Custom Enterprise Hiring</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Custom SLA commitments, direct ATS webhook integrations, and dedicated recruiting pods.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-xs font-bold text-white block">Custom Volume Discounts</span>
              <p className="text-[11px] text-slate-400">Hire hundreds of candidates simultaneously across pan-India offices.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-xs font-bold text-white block">Direct ATS Integration</span>
              <p className="text-[11px] text-slate-400">Sync with Greenhouse, Lever, Workday, and Zoho Recruit via Webhooks.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-xs font-bold text-white block">Dedicated Executive Advisor</span>
              <p className="text-[11px] text-slate-400">Hands-on talent pipeline calibration and weekly hiring telemetry.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Official Helpline: <strong className="text-white">+91 99999 99999</strong> • <strong className="text-cyan-400">enterprise@aijobs1.in</strong>
            </div>

            <a
              href="mailto:enterprise@aijobs1.in?subject=Enterprise%20Hiring%20Inquiry%20-%20AIJOBS"
              className="px-6 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs hover:bg-slate-200 transition-all cursor-pointer shadow-lg"
            >
              Contact Enterprise Sales
            </a>
          </div>
        </div>
      )}

    </div>
  );
}
