import { useState } from "react";
import { 
  DollarSign, Check, ShieldCheck, Sparkles, RefreshCw, Star, ArrowRight 
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { ConsultancyProfile } from "../../types";

interface CrmSubscriptionViewProps {
  profile: ConsultancyProfile;
  onRefresh: () => void;
}

export default function CrmSubscriptionView({
  profile,
  onRefresh
}: CrmSubscriptionViewProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"Starter" | "Professional" | "Enterprise">("Professional");

  const currentPlan = profile.pricingPlan || "Free";

  const handleSimulateUpgrade = async (plan: "Starter" | "Professional" | "Enterprise") => {
    setSelectedPlan(plan);
    setIsUpgrading(true);

    // Simulate Razorpay gateway loading
    setTimeout(async () => {
      try {
        await setDoc(doc(db, "consultancies", profile.userId), {
          ...profile,
          subscriptionStatus: "active",
          pricingPlan: plan,
          revenue: profile.revenue || 350000
        }, { merge: true });

        alert(`💰 Razorpay payment sandbox SUCCESS! Upgraded account to ${plan.toUpperCase()} subscription!`);
        setIsUpgrading(false);
        onRefresh();
      } catch (err) {
        console.error(err);
        setIsUpgrading(false);
      }
    }, 1500);
  };

  const PLANS = [
    {
      name: "Starter",
      price: "₹4,999",
      period: "month",
      features: [
        "Up to 2 Recruiter Logins",
        "Manage 10 Client Accounts",
        "Standard Resume Parsing Scores",
        "Email Pipeline notifications",
        "Standard PDF reports export"
      ],
      desc: "Perfect for boutique regional agencies."
    },
    {
      name: "Professional",
      price: "₹12,499",
      period: "month",
      features: [
        "Up to 8 Recruiter Logins",
        "Manage Unlimited Client Accounts",
        "Weighted Match Recommender",
        "Greenhouse-grade Calendar Co-ordinator",
        "Bulk ATS Status actions",
        "Excel CSV & PDF exports included"
      ],
      desc: "Ideal for fast scaling firms.",
      popular: true
    },
    {
      name: "Enterprise",
      price: "₹29,999",
      period: "month",
      features: [
        "Unlimited Staff Logins",
        "Dedicated Database Shard",
        "Dynamic commission fees calculator",
        "Role-Based Permission Matrix Swaps",
        "Automated PDF print reporting",
        "24/7 Account Executive support"
      ],
      desc: "Tailor-made for executive networks."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300" id="crm-subscription-view">
      {/* Header */}
      <div className="border-b border-white/5 pb-4 space-y-1">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-400" />
          <span>Plan & Billing Hub</span>
        </h3>
        <p className="text-xs text-gray-400">Scale recruitment scopes, coordinate team billing cycles, and review invoices.</p>
      </div>

      {/* Active plan status banner */}
      <div className="p-5 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 text-xs">
          <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">Active Account Status</span>
          <div className="flex items-center gap-2">
            <h4 className="text-white font-extrabold text-base">Authorized Profile Tier: {currentPlan}</h4>
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
              {profile.subscriptionStatus === "active" ? "ACTIVE / PAID" : "INACTIVE"}
            </span>
          </div>
          <p className="text-gray-300">Renews automatically on the 1st of next month.</p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Complies with Razorpay Merchant standards</span>
        </div>
      </div>

      {/* Pricing Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {/* Loading overlay */}
        {isUpgrading && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 rounded-3xl flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-indigo-400 font-mono font-bold uppercase tracking-wider animate-pulse">
              Contacting Razorpay Sandbox Gateway...
            </p>
          </div>
        )}

        {PLANS.map((pl, i) => (
          <div
            key={i}
            className={`p-6 rounded-2xl border transition-all space-y-5 flex flex-col justify-between ${
              pl.popular 
                ? "bg-indigo-600/10 border-indigo-500 shadow-xl shadow-indigo-600/5 relative" 
                : "glass border-transparent hover:bg-white/5"
            } ${currentPlan === pl.name ? "ring-2 ring-emerald-500" : ""}`}
          >
            {pl.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-black uppercase tracking-wider bg-indigo-600 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                <Sparkles className="w-3 h-3" />
                <span>Recommended Choice</span>
              </span>
            )}

            <div className="space-y-4">
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-sm text-white">{pl.name} Plan</h4>
                <p className="text-gray-400 text-[11px] leading-relaxed">{pl.desc}</p>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-black text-white">{pl.price}</span>
                <span className="text-xs text-gray-500">/ {pl.period}</span>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4 text-xs">
                {pl.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-gray-300 leading-relaxed text-[11px]">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSimulateUpgrade(pl.name as any)}
              disabled={currentPlan === pl.name}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                currentPlan === pl.name 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 cursor-not-allowed" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              <span>{currentPlan === pl.name ? "Current Active Plan" : "Upgrade Plan"}</span>
              {currentPlan !== pl.name && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
