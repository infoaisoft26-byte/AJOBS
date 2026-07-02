import { useState, useEffect } from "react";
import { 
  CreditCard, Search, Filter, ShieldCheck, CheckCircle2, FileText, 
  Download, Printer, DollarSign, IndianRupee, Tag, AlertCircle, RefreshCw, 
  Gift, Users, ArrowRight, Check, Sparkles, Building, Briefcase, HelpCircle, 
  Copy, CheckSquare, Plus, Trash2, Calendar
} from "lucide-react";
import { db } from "../firebase";
import { 
  doc, setDoc, getDoc, collection, getDocs, query, where, addDoc 
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface SubscriptionBillingHubProps {
  userId: string;
  userName: string;
  userRole: "consultancy" | "employer";
  onRefresh: () => void;
}

interface SavedBillingProfile {
  companyName: string;
  billingAddress: string;
  gstNumber: string;
  contactEmail: string;
  contactPhone: string;
}

export default function SubscriptionBillingHub({
  userId,
  userName,
  userRole,
  onRefresh
}: SubscriptionBillingHubProps) {
  // Navigation active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"plans" | "history" | "coupons" | "referral" | "profile">("plans");
  
  // PayU Checkout Overlay States
  const [payuModalData, setPayuModalData] = useState<any | null>(null);
  const [selectedPayuTab, setSelectedPayuTab] = useState<string>("upi");
  
  // Subscription parameters state
  const [currentPlan, setCurrentPlan] = useState<string>("Free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<"active" | "inactive">("inactive");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  
  // Billing address state
  const [billingProfile, setBillingProfile] = useState<SavedBillingProfile>({
    companyName: "",
    billingAddress: "",
    gstNumber: "",
    contactEmail: "",
    contactPhone: ""
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileSuccess, setSaveProfileSuccess] = useState(false);

  // Payments / invoices list
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);
  const [selectedTxnForInvoice, setSelectedTxnForInvoice] = useState<any | null>(null);

  // Checkout process state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [successTxnDetails, setSuccessTxnDetails] = useState<any | null>(null);

  // Coupon promo input state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" as "success" | "error" | "" });

  // Referral panel state
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState({
    referredCount: 0,
    earnings: 0,
    rewardPoints: 0,
  });
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [claimStatus, setClaimStatus] = useState("");

  // Plan lists definitions
  const CONSULTANCY_PLANS = [
    {
      id: "starter",
      name: "Starter",
      basePrice: 999,
      features: [
        "Up to 50 active jobs",
        "500 candidate views per month",
        "AI Resume Analysis included",
        "Email ticketing support"
      ],
      desc: "Excellent entry-level sourcing capabilities for small agencies."
    },
    {
      id: "professional",
      name: "Professional",
      basePrice: 2999,
      features: [
        "Unlimited job vacancies",
        "Unlimited candidate views & search",
        "Detailed AI Interview performance reports",
        "AI Shortlisting match algorithms",
        "Full client CRM database access",
        "Exportable Excel & PDF reports",
        "Priority premium support (2hr SLA)"
      ],
      desc: "The ultimate powerpack suited for scaling professional firms.",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      basePrice: 9999, // Custom / enterprise starting baseline
      features: [
        "Unlimited everything",
        "Team staff accounts with role access level control",
        "Private API access endpoints",
        "White label recruitment options",
        "Dedicated corporate manager account",
        "Custom ATS integrations (Greenhouse, Workday)"
      ],
      desc: "For multinational networks requiring absolute bandwidth."
    }
  ];

  const EMPLOYER_PLANS = [
    {
      id: "basic",
      name: "Basic",
      basePrice: 1999,
      features: [
        "Up to 10 active jobs",
        "100 candidate views",
        "AI candidate matching",
        "Standard email support"
      ],
      desc: "Perfect for fast-growing startups with immediate openings."
    },
    {
      id: "professional",
      name: "Professional",
      basePrice: 4999,
      features: [
        "Up to 50 active jobs",
        "500 candidate views",
        "Comprehensive AI interview summaries",
        "Enterprise CRM candidate matching",
        "Priority chat/phone support"
      ],
      desc: "Built for scaling industries managing multiple hiring pipelines.",
      popular: true
    },
    {
      id: "enterprise",
      name: "Enterprise",
      basePrice: 14999,
      features: [
        "Unlimited jobs",
        "Unlimited candidate search & parsing",
        "Private API access layers",
        "White labeled interview suites",
        "Dedicated account hiring strategist"
      ],
      desc: "Premium end-to-end recruitment suite for enterprise companies."
    }
  ];

  const activePlans = userRole === "consultancy" ? CONSULTANCY_PLANS : EMPLOYER_PLANS;

  // Sync initial user details, transactions, profile and referral parameters
  useEffect(() => {
    fetchActiveSubscriptionAndProfile();
    fetchTransactionsList();
    fetchReferralData();
  }, [userId, userRole]);

  const fetchActiveSubscriptionAndProfile = async () => {
    try {
      // 1. Fetch Subscription details
      const subRef = doc(db, "subscriptions", userId);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        const subData = subSnap.data();
        setCurrentPlan(subData.planName || "Free");
        setSubscriptionStatus(subData.status || "inactive");
        setExpiresAt(subData.expiresAt || "");
        if (subData.cycle) setBillingCycle(subData.cycle);
      } else {
        // Fallback checks consultancy/employer profiles
        const colName = userRole === "consultancy" ? "consultancies" : "companies";
        const profSnap = await getDoc(doc(db, colName, userId));
        if (profSnap.exists()) {
          const pd = profSnap.data();
          setCurrentPlan(pd.pricingPlan || "Free");
          setSubscriptionStatus(pd.subscriptionStatus || "inactive");
        }
      }

      // 2. Fetch billing profile details
      const billingRef = doc(db, "billing_profiles", userId);
      const billingSnap = await getDoc(billingRef);
      if (billingSnap.exists()) {
        setBillingProfile(billingSnap.data() as SavedBillingProfile);
      } else {
        // Default seed profile details
        setBillingProfile({
          companyName: userName + " Corp",
          billingAddress: "MG Road, Bengaluru, Karnataka, 560001",
          gstNumber: "29AABCA1234F1Z0",
          contactEmail: userId + "@aijobs.global",
          contactPhone: "+91 98765 00000"
        });
      }
    } catch (err) {
      console.error("Failed loading subscription telemetry:", err);
    }
  };

  const fetchTransactionsList = async () => {
    setIsLoadingTxns(true);
    try {
      const q = query(
        collection(db, "payments"), 
        where("userId", "==", userId)
      );
      const qSnap = await getDocs(q);
      const list: any[] = [];
      qSnap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort transactions by date (newest first)
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
    } catch (err) {
      console.error("Failed loading transaction history ledger:", err);
    } finally {
      setIsLoadingTxns(false);
    }
  };

  const fetchReferralData = async () => {
    try {
      const refRef = doc(db, "referrals", userId);
      const refSnap = await getDoc(refRef);
      if (refSnap.exists()) {
        const rd = refSnap.data();
        setReferralCode(rd.referralCode || "");
        setReferralStats({
          referredCount: rd.referredCount || 0,
          earnings: rd.earnings || 0,
          rewardPoints: rd.rewardPoints || 0
        });
      } else {
        // Generate a new clean referral code for this user
        const newCode = "AIJ-" + userName.toUpperCase().replace(/\s+/g, "").slice(0, 4) + Math.floor(100 + Math.random() * 900);
        const newRefData = {
          userId,
          referralCode: newCode,
          referredCount: 2, // Seeding mock activity metrics
          earnings: 1000,
          rewardPoints: 200,
          history: [
            { id: "ref_1", name: "Apex Sourcing Agency", rewardedAt: new Date().toISOString(), points: 100, bonus: 500 },
            { id: "ref_2", name: "InnoTech Sourcing Ltd", rewardedAt: new Date().toISOString(), points: 100, bonus: 500 }
          ]
        };
        await setDoc(refRef, newRefData);
        setReferralCode(newCode);
        setReferralStats({
          referredCount: 2,
          earnings: 1000,
          rewardPoints: 200
        });
      }
    } catch (err) {
      console.error("Failed syncing referral analytics:", err);
    }
  };

  // Billing address update
  const handleSaveBillingProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSaveProfileSuccess(false);
    try {
      await setDoc(doc(db, "billing_profiles", userId), billingProfile);
      setSaveProfileSuccess(true);
      setTimeout(() => setSaveProfileSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Referral point conversion
  const handleRedeemPoints = async () => {
    if (referralStats.rewardPoints < 100) {
      alert("⚠️ Minimum 100 reward points are required to redeem billing credits!");
      return;
    }
    setClaimStatus("converting");
    setTimeout(async () => {
      try {
        const rewardValue = referralStats.rewardPoints * 5; // ₹5 per point
        const newPoints = 0;
        const newEarnings = referralStats.earnings + rewardValue;
        
        await setDoc(doc(db, "referrals", userId), {
          rewardPoints: newPoints,
          earnings: newEarnings
        }, { merge: true });

        setReferralStats(prev => ({
          ...prev,
          rewardPoints: newPoints,
          earnings: newEarnings
        }));
        
        // Log auditing footprint
        const auditId = "log_ref_redeem_" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "audit_logs", auditId), {
          id: auditId,
          userId,
          userName,
          userEmail: billingProfile.contactEmail,
          role: userRole,
          action: "PAYMENT",
          category: "Payment",
          description: `Converted ${referralStats.rewardPoints} referral rewards into ₹${rewardValue.toLocaleString()} dashboard credits.`,
          ipAddress: "127.0.0.1",
          deviceInfo: "Web Browser console",
          createdAt: new Date().toISOString()
        });

        setClaimStatus("success");
        alert(`🎉 Successfully redeemed credits worth ₹${rewardValue.toLocaleString()}! Credits have been saved to your billing credentials.`);
      } catch (err) {
        console.error(err);
        setClaimStatus("error");
      }
    }, 1500);
  };

  // Copy referral script
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // Coupon Verification logic
  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setCouponMessage({ text: "Checking campaign voucher...", type: "" });
    
    // Simulate API checks
    setTimeout(() => {
      const codeClean = couponInput.toUpperCase().trim();
      
      // Seeded valid coupon keys
      const VALID_COUPONS: Record<string, { type: "percentage" | "flat"; value: number; label: string }> = {
        "FESTIVE10": { type: "percentage", value: 10, label: "10% festive discount" },
        "ENTERPRISE50": { type: "percentage", value: 50, label: "50% corporate premium discount" },
        "WELCOME500": { type: "flat", value: 500, label: "Flat ₹500 welcome credit" },
        "FIRST30": { type: "percentage", value: 30, label: "30% off initial subscription cycle" },
        "GROWTHFLAT": { type: "flat", value: 1000, label: "Flat ₹1,000 scaling credit" }
      };

      if (VALID_COUPONS[codeClean]) {
        setAppliedCoupon({
          code: codeClean,
          ...VALID_COUPONS[codeClean]
        });
        setCouponMessage({
          text: `🎉 Valid Voucher Applied: ${VALID_COUPONS[codeClean].label}!`,
          type: "success"
        });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({
          text: "❌ Invalid coupon code or voucher campaign has expired.",
          type: "error"
        });
      }
    }, 800);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage({ text: "", type: "" });
  };

  // Price Calculation details
  const getCycleMultiplier = () => {
    if (billingCycle === "quarterly") return 3;
    if (billingCycle === "yearly") return 12;
    return 1;
  };

  const getDiscountPercentage = () => {
    if (billingCycle === "quarterly") return 10; // 10% discount
    if (billingCycle === "yearly") return 20; // 20% discount
    return 0;
  };

  const calculateVoucherDiscount = (subtotal: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "percentage") {
      return Math.round((subtotal * appliedCoupon.value) / 100);
    } else {
      return Math.min(subtotal, appliedCoupon.value);
    }
  };

  const calculatePricingForPlan = (planPrice: number) => {
    const rawTotal = planPrice * getCycleMultiplier();
    
    // 1. Apply cycle discount
    const cycleDiscount = Math.round((rawTotal * getDiscountPercentage()) / 100);
    const afterCycleDiscount = rawTotal - cycleDiscount;

    // 2. Apply coupon code discount
    const voucherDiscount = calculateVoucherDiscount(afterCycleDiscount);
    const netBasePrice = afterCycleDiscount - voucherDiscount;

    // 3. GST 18% calculation
    const gstAmount = Math.round(netBasePrice * 0.18);
    const finalBillAmount = netBasePrice + gstAmount;

    return {
      subtotal: rawTotal,
      cycleDiscount,
      netBasePrice,
      voucherDiscount,
      gstAmount,
      finalBillAmount
    };
  };

  // Secure checkout process
  const handleInitiatePayUCheckout = async (plan: any) => {
    if (plan.basePrice === 0) return;
    setIsUpgrading(true);
    setCheckoutError("");
    setSuccessTxnDetails(null);

    const priceDetails = calculatePricingForPlan(plan.basePrice);

    try {
      // 1. Ping Express backend to initialize secure PayU payload
      const res = await fetch("/api/payu-initiate", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           planName: plan.name,
           price: priceDetails.finalBillAmount,
           userId,
           firstname: userName,
           email: billingProfile.contactEmail || "finance@aijobs.platform",
           phone: billingProfile.contactPhone || "9999999999",
           udf1: "subscription"
         })
      });

      if (!res.ok) {
        throw new Error("Unable to establish communication with PayU gateway.");
      }

      const orderData = await res.json();
      
      // 2. Open interactive high-fidelity PayU Secure Sandbox overlay
      setPayuModalData({
        ...orderData,
        plan,
        priceDetails
      });
      setIsUpgrading(false);

    } catch (err: any) {
      console.warn("Unable to initiate online PayU checkout:", err.message);
      setCheckoutError(err.message || "Failed to contact PayU checkout gateway.");
      setIsUpgrading(false);
    }
  };

  // Complete/Confirm the interactive PayU Checkout Flow
  const handleCompletePayUPayment = async (status: "success" | "failed" | "canceled") => {
    if (!payuModalData) return;
    
    setIsUpgrading(true);
    setCheckoutError("");

    const { plan, priceDetails, key, txnid, amount, productinfo, firstname, email, udf1, hash } = payuModalData;

    try {
      if (status === "canceled") {
        setCheckoutError("Payment process canceled by user.");
        setPayuModalData(null);
        setIsUpgrading(false);
        return;
      }

      if (status === "failed") {
        setCheckoutError("Transaction declined by issuing bank/issuer.");
        setPayuModalData(null);
        setIsUpgrading(false);
        return;
      }

      // Verify transaction integrity with the server postback signature validation
      const verifyRes = await fetch("/api/payu-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "success",
          txnid,
          amount,
          productinfo,
          firstname,
          email,
          udf1,
          hash,
          userId,
          planName: plan.name
        })
      });

      if (!verifyRes.ok) {
        throw new Error("PayU webhook checksum validation failed.");
      }

      const verifyResult = await verifyRes.json();

      if (verifyResult.success) {
        // Activate pricing and billing structures in Firestore
        const expiresDate = new Date();
        if (billingCycle === "yearly") expiresDate.setFullYear(expiresDate.getFullYear() + 1);
        else if (billingCycle === "quarterly") expiresDate.setMonth(expiresDate.getMonth() + 3);
        else expiresDate.setMonth(expiresDate.getMonth() + 1);

        const subData = {
          userId,
          planName: plan.name,
          status: "active",
          expiresAt: expiresDate.toISOString(),
          createdAt: new Date().toISOString(),
          cycle: billingCycle,
          billingAddress: billingProfile.billingAddress,
          gstNumber: billingProfile.gstNumber
        };

        // Save Subscription
        await setDoc(doc(db, "subscriptions", userId), subData);

        // Update company/consultancy profiles
        const colName = userRole === "consultancy" ? "consultancies" : "companies";
        await setDoc(doc(db, colName, userId), {
          pricingPlan: plan.name,
          subscriptionStatus: "active"
        }, { merge: true });

        // Save payment ledger logs
        const invoiceId = "INV-" + Math.floor(100000 + Math.random() * 900000);
        const txnRecord = {
          id: txnid || "pay_payu_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
          userId,
          userName,
          userEmail: billingProfile.contactEmail || email,
          planName: plan.name,
          amount: priceDetails.netBasePrice,
          gstAmount: priceDetails.gstAmount,
          discountAmount: priceDetails.voucherDiscount + priceDetails.cycleDiscount,
          totalPaid: priceDetails.finalBillAmount,
          currency: "INR",
          status: "SUCCESS",
          couponCode: appliedCoupon?.code || "",
          gateway: "PayU",
          invoiceNumber: invoiceId,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "payments", txnRecord.id), txnRecord);

        // Dispatch notifications
        await fetch("/api/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Plan Upgraded Successfully!",
            message: `Your corporate portal has been upgraded to ${plan.name} Plan (${billingCycle.toUpperCase()}).`,
            type: "PUSH",
            userId
          })
        });

        const notifId = "notif_" + Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId,
          title: "💳 Payment Successful & Subscription Activated",
          message: `Invoice ${invoiceId} has been generated. Your ${plan.name} capabilities are ready. Renewal date: ${expiresDate.toLocaleDateString()}.`,
          read: false,
          createdAt: new Date().toISOString()
        });

        // Sync local states
        setCurrentPlan(plan.name);
        setSubscriptionStatus("active");
        setExpiresAt(expiresDate.toISOString());
        setSuccessTxnDetails(txnRecord);
        setPayuModalData(null);
        fetchTransactionsList();
        onRefresh();
      } else {
        setCheckoutError("Checksum matching failed. Check secure parameters.");
      }
    } catch (err: any) {
      console.error("PayU checkout verification error:", err);
      setCheckoutError(err.message || "Unable to parse and register PayU logs.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("⚠️ Are you sure you want to cancel your premium subscription? This will suspend all advanced ATS matching and AI resume coach capabilities immediately at the end of the current billing cycle.")) {
      return;
    }
    setIsUpgrading(true);
    try {
      await setDoc(doc(db, "subscriptions", userId), {
        status: "inactive"
      }, { merge: true });

      const colName = userRole === "consultancy" ? "consultancies" : "companies";
      await setDoc(doc(db, colName, userId), {
        subscriptionStatus: "inactive"
      }, { merge: true });

      setSubscriptionStatus("inactive");
      alert("✅ Subscription successfully canceled. Account downgraded to Free tier.");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="glass p-6 md:p-8 rounded-3xl border border-white/5 space-y-8 animate-in fade-in duration-300" id="saas-subscription-billing-hub">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-5 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5.5 h-5.5 text-indigo-400" />
            <span>Enterprise Billing & Subscriptions</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Activate premium AI capabilities, review past invoices, apply promo coupon credits, and manage your billing profiles.
          </p>
        </div>

        {/* Navigation buttons tabs */}
        <div className="flex gap-1.5 p-1 bg-neutral-950/40 border border-white/5 rounded-xl text-xs font-mono">
          {[
            { id: "plans", label: "Plans Suite", icon: Briefcase },
            { id: "history", label: "Ledger History", icon: FileText },
            { id: "coupons", label: "Vouchers Desk", icon: Tag },
            { id: "referral", label: "Referral Rewards", icon: Gift },
            { id: "profile", label: "Billing Profile", icon: Building }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                  setSelectedTxnForInvoice(null);
                  setSuccessTxnDetails(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                  isSel ? "bg-indigo-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* State banner */}
      {subscriptionStatus === "active" && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">Subscription Active</span>
            <div className="flex items-center gap-2">
              <h4 className="text-white font-black text-sm">Tier License: {currentPlan} ({billingCycle.toUpperCase()})</h4>
              <span className="bg-emerald-500 text-neutral-950 text-[8px] font-bold px-2 py-0.5 rounded font-mono">LIVE / PAID</span>
            </div>
            <p className="text-gray-400">Next billing scheduled on: <strong className="text-white font-mono">{expiresAt ? new Date(expiresAt).toLocaleDateString() : "Auto"}</strong></p>
          </div>

          <button
            onClick={handleCancelSubscription}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/20 rounded-xl transition-all cursor-pointer font-bold font-mono"
          >
            Cancel Plan
          </button>
        </div>
      )}

      {/* Tab contents switches */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === "plans" && (
            <div className="space-y-6">
              
              {/* Billing Cycle Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Flexible Billing Cycles</h4>
                  <p className="text-[10px] text-gray-400">Save up to 20% on Quarterly and Annual plans.</p>
                </div>

                <div className="flex gap-2 p-1 bg-neutral-950/50 border border-white/5 rounded-xl font-mono text-xs">
                  {[
                    { id: "monthly", label: "Monthly", discount: "" },
                    { id: "quarterly", label: "Quarterly", discount: "10% OFF" },
                    { id: "yearly", label: "Yearly", discount: "20% OFF" }
                  ].map(cycle => (
                    <button
                      key={cycle.id}
                      onClick={() => setBillingCycle(cycle.id as any)}
                      className={`relative px-3 py-2 rounded-lg transition-all font-bold cursor-pointer ${
                        billingCycle === cycle.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{cycle.label}</span>
                      {cycle.discount && (
                        <span className="absolute -top-2.5 -right-2 bg-emerald-500 text-neutral-950 text-[7px] font-bold px-1 rounded-full scale-90 uppercase">
                          {cycle.discount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                
                {isUpgrading && (
                  <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 rounded-3xl flex flex-col items-center justify-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs text-indigo-400 font-mono font-bold uppercase tracking-wider animate-pulse">
                      Contacting PayU Secure Gateway...
                    </p>
                  </div>
                )}

                {activePlans.map((pl) => {
                  const isCurrent = currentPlan.toLowerCase() === pl.name.toLowerCase();
                  const pCalculations = calculatePricingForPlan(pl.basePrice);

                  return (
                    <div
                      key={pl.id}
                      className={`p-6 rounded-2xl border flex flex-col justify-between transition-all space-y-6 ${
                        pl.popular 
                          ? "bg-indigo-600/10 border-indigo-500 relative shadow-lg shadow-indigo-600/5" 
                          : "glass border-white/5 hover:border-white/10"
                      } ${isCurrent ? "ring-2 ring-emerald-500 border-transparent" : ""}`}
                    >
                      {pl.popular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-black uppercase bg-indigo-600 text-white px-3 py-1 rounded-full flex items-center gap-1 shadow">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span>Most Popular Choice</span>
                        </span>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">{pl.name} Tier</h4>
                          <p className="text-gray-400 text-[11px] leading-relaxed">{pl.desc}</p>
                        </div>

                        {/* Cost visualizer */}
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">₹{pCalculations.finalBillAmount.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-500 font-mono">/{billingCycle}</span>
                          </div>
                          
                          {billingCycle !== "monthly" && (
                            <p className="text-[9px] text-emerald-400 font-mono">
                              Subtotal: ₹{pCalculations.subtotal.toLocaleString()} (-₹{pCalculations.cycleDiscount.toLocaleString()} savings)
                            </p>
                          )}
                          
                          {appliedCoupon && (
                            <p className="text-[9px] text-emerald-400 font-mono">
                              Promo Coupon Code Applied: -₹{pCalculations.voucherDiscount.toLocaleString()}
                            </p>
                          )}

                          <p className="text-[8px] text-gray-500 font-mono">Includes 18% Tax Integrated GST (₹{pCalculations.gstAmount.toLocaleString()})</p>
                        </div>

                        {/* Features bullet items */}
                        <div className="space-y-2 border-t border-white/5 pt-4 text-xs">
                          {pl.features.map((feat, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-gray-300 leading-relaxed text-[11px]">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upgrade trigger button */}
                      <button
                        onClick={() => handleInitiatePayUCheckout(pl)}
                        disabled={isCurrent}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCurrent 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 cursor-not-allowed" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg"
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                            <span>Active Active Plan</span>
                          </>
                        ) : (
                          <>
                            <span>Select Upgrade Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>

                    </div>
                  );
                })}

              </div>

              {/* Coupon Bar integration on checkout page */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-indigo-400" />
                    <span>Promo Campaign Coupon Checker</span>
                  </h4>
                  <p className="text-[10px] text-gray-400">Unlock corporate voucher credits. Try applying <strong>ENTERPRISE50</strong> or <strong>WELCOME500</strong>.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto text-xs">
                  {appliedCoupon ? (
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-mono">
                      <strong className="text-emerald-400">{appliedCoupon.code} ({appliedCoupon.discountValue}{appliedCoupon.type === "percentage" ? "%" : " FLAT"} OFF)</strong>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-rose-400 hover:text-rose-300 font-black cursor-pointer ml-1"
                        title="Remove voucher"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={couponInput}
                        onChange={e => setCouponInput(e.target.value)}
                        placeholder="ENTER VOUCHER CODE..."
                        className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-indigo-500 outline-none placeholder-gray-500"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Verify
                      </button>
                    </>
                  )}
                </div>
              </div>

              {couponMessage.text && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  couponMessage.type === "success" 
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" 
                    : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span>{couponMessage.text}</span>
                </div>
              )}

              {/* Success Order Details message block */}
              {successTxnDetails && (
                <div className="p-5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Transaction Confirmed via Secure Gateway!</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    We have successfully captured transaction ID <strong>{successTxnDetails.id}</strong> under Invoice <strong>{successTxnDetails.invoiceNumber}</strong>. Your account has been upgraded, and tax receipts are archived below.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedTxnForInvoice(successTxnDetails);
                      setActiveSubTab("history");
                    }}
                    className="text-xs text-indigo-400 font-black hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View GST Tax Invoice Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {checkoutError && (
                <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-400" />
                  <span>Error processing checkout: {checkoutError}</span>
                </div>
              )}

            </div>
          )}

          {activeSubTab === "history" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Ledger Table */}
                <div className="lg:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Payments Ledger Logs</h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-400 font-mono pb-2">
                          <th className="pb-3 pr-2">Subscribed Plan</th>
                          <th className="pb-3">Invoice Number</th>
                          <th className="pb-3">Total Paid</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-300">
                        {isLoadingTxns ? (
                          <tr>
                            <td colSpan={5} className="text-center py-10 font-mono text-gray-500 animate-pulse">Syncing transactions database...</td>
                          </tr>
                        ) : transactions.length > 0 ? (
                          transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-white/5">
                              <td className="py-3 font-bold text-white">
                                {t.planName}
                                <div className="text-[9px] text-gray-500 font-mono font-normal mt-0.5">{new Date(t.createdAt).toLocaleDateString()} via {t.gateway}</div>
                              </td>
                              <td className="py-3 font-mono text-gray-400">{t.invoiceNumber}</td>
                              <td className="py-3 font-mono font-bold text-white">₹{t.totalPaid.toLocaleString()}</td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase">
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => setSelectedTxnForInvoice(t)}
                                  className="p-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="View GST Tax Receipt"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center py-12 text-xs text-gray-500 italic">No past transactions found. Purchase a plan to generate invoices.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* GST Tax Invoice Visualizer */}
                <div>
                  <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-indigo-400" />
                      <span>Compliant Tax Invoice</span>
                    </h4>

                    {selectedTxnForInvoice ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-white text-neutral-900 rounded-xl font-mono text-[9px] leading-relaxed border border-gray-200 shadow space-y-3" id="invoice-print-area">
                          <div className="text-center border-b border-gray-200 pb-2 mb-2">
                            <h5 className="font-sans font-black text-xs text-indigo-950 uppercase tracking-widest">AIJobs Sourcing India Pvt Ltd</h5>
                            <p className="text-[7px] text-gray-400">GSTIN: 29AABCA2210G1ZY • SAC Code: 998311</p>
                          </div>

                          <div className="flex justify-between border-b border-gray-100 pb-2 text-[8px] text-gray-500">
                            <div>
                              <p>INVOICE: <strong className="text-neutral-900">{selectedTxnForInvoice.invoiceNumber}</strong></p>
                              <p>DATE: {new Date(selectedTxnForInvoice.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p>CLIENT UID: {selectedTxnForInvoice.userId.substr(0, 8).toUpperCase()}</p>
                              <p>GATEWAY: {selectedTxnForInvoice.gateway}</p>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-gray-400">BILLED TO:</p>
                            <p className="font-bold text-neutral-900">{billingProfile.companyName || tName()}</p>
                            <p className="text-[8px] text-gray-400">{billingProfile.billingAddress}</p>
                            {billingProfile.gstNumber && <p className="text-[8px] text-gray-500">CLIENT GSTIN: <strong>{billingProfile.gstNumber}</strong></p>}
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-gray-200">
                            <div className="flex justify-between text-gray-400 font-bold">
                              <span>LINE ITEM DESCRIPTION</span>
                              <span>CHARGES</span>
                            </div>
                            <div className="flex justify-between font-bold text-neutral-900 border-b border-gray-100 pb-1.5">
                              <span>{selectedTxnForInvoice.planName} Plan License</span>
                              <span>₹{selectedTxnForInvoice.amount.toLocaleString()}</span>
                            </div>

                            <div className="space-y-0.5 text-right text-gray-500">
                              <p>Line Subtotal: ₹{selectedTxnForInvoice.amount.toLocaleString()}</p>
                              <p>Integrated GST (18%): ₹{selectedTxnForInvoice.gstAmount.toLocaleString()}</p>
                              {selectedTxnForInvoice.discountAmount > 0 && (
                                <p className="text-rose-600">Discounts Applied: -₹{selectedTxnForInvoice.discountAmount.toLocaleString()}</p>
                              )}
                              <p className="font-extrabold text-neutral-900 text-[10px] pt-1.5 border-t border-gray-200">
                                Total Collected: ₹{selectedTxnForInvoice.totalPaid.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="text-center text-[7px] text-gray-400 pt-2 border-t border-gray-200">
                            This is an electronically generated tax receipt.
                          </div>
                        </div>

                        <button
                          onClick={() => window.print()}
                          className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-xs text-gray-300 font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Tax Receipt</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-[10px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-xl">
                        Select a payment row inside the ledger table to load detailed calculations and printable receipts.
                      </div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          )}

          {activeSubTab === "coupons" && (
            <div className="space-y-6">
              
              <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Active Promo Campaign Coupons</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Apply promo vouchers inside your checkout suite to unlock percentage reductions or flat-cash credits during subscription upgrades. Below are active global campaigns running on AIJobs.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {[
                    { code: "ENTERPRISE50", label: "Enterprise Super Vouchers", value: "50% OFF", type: "Percentage Base", limits: "Limit 1 per account", validity: "Active" },
                    { code: "FESTIVE10", label: "Regional Sourcing Festive Offer", value: "10% OFF", type: "Percentage Base", limits: "No Limit", validity: "Active" },
                    { code: "WELCOME500", label: "First Time Workspace Sign-up Credits", value: "Flat ₹500 OFF", type: "Flat Currency Code", limits: "Single use", validity: "Active" },
                    { code: "FIRST30", label: "Early Adopter Kickstart Discount", value: "30% OFF", type: "Percentage Base", limits: "Starter/Basic only", validity: "Active" },
                    { code: "GROWTHFLAT", label: "Scaling Agency Voucher Campaign", value: "Flat ₹1,000 OFF", type: "Flat Currency Code", limits: "Pro plans only", validity: "Active" }
                  ].map((cp, i) => (
                    <div key={i} className="p-4 bg-neutral-950/40 border border-white/5 rounded-2xl space-y-3 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-indigo-400 text-sm">{cp.code}</strong>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {cp.validity}
                          </span>
                        </div>
                        <h5 className="text-[10px] text-gray-400 font-sans leading-relaxed">{cp.label}</h5>
                        <p className="text-xs font-extrabold text-white">{cp.value}</p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[8px] text-gray-500">
                        <span>{cp.limits}</span>
                        <button
                          onClick={() => {
                            setCouponInput(cp.code);
                            setActiveSubTab("plans");
                            setCouponMessage({ text: "Ready to check!", type: "" });
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                        >
                          Apply Code
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeSubTab === "referral" && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Referral link/code card */}
                <div className="md:col-span-2 glass p-5 rounded-2xl border border-white/5 space-y-5">
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Gift className="w-5 h-5 text-indigo-400" />
                      <span>Invite Competitors & Partners Program</span>
                    </h4>
                    <p className="text-xs text-gray-400">
                      Earn commissions, tax discounts, and reward points by sharing AIJobs. Receive ₹1,500 billing credits for every active agency that boards under your voucher footprint!
                    </p>
                  </div>

                  {/* Copy link bar */}
                  <div className="flex gap-2 p-1.5 bg-neutral-950 rounded-xl border border-white/10 text-xs">
                    <input
                      type="text"
                      readOnly
                      value={`https://aijobs.global/signup?ref=${referralCode}`}
                      className="flex-1 bg-transparent px-3 text-gray-300 outline-none font-mono"
                    />
                    <button
                      onClick={handleCopyReferral}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                    >
                      {copiedReferral ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedReferral ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3 text-xs leading-relaxed text-gray-300">
                    <h5 className="font-bold text-white font-sans">How the Referral Protocol works:</h5>
                    <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-gray-400">
                      <li>Copy your private campaign link and share with agencies or HR colleagues.</li>
                      <li>When they board and purchase any Starter or Pro subscription, we credit ₹1,500 directly into your portal.</li>
                      <li>You earn 100 Reward points which can be converted into standard INR credits instantly.</li>
                    </ol>
                  </div>
                </div>

                {/* Referral Earnings stats */}
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Earnings Balance Dashboard</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Real-time referral program bookkeeping.</p>
                  </div>

                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-neutral-950/40 rounded-xl border border-white/5">
                        <span className="text-[8px] font-mono text-gray-400 uppercase">Successful referrals</span>
                        <h5 className="text-lg font-black text-white mt-1">{referralStats.referredCount} Accounts</h5>
                      </div>
                      <div className="p-3 bg-neutral-950/40 rounded-xl border border-white/5">
                        <span className="text-[8px] font-mono text-gray-400 uppercase">Referral Earnings</span>
                        <h5 className="text-lg font-black text-emerald-400 mt-1">₹{referralStats.earnings.toLocaleString()}</h5>
                      </div>
                    </div>

                    <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">Unredeemed Points:</span>
                        <strong className="text-indigo-400 font-mono text-sm">{referralStats.rewardPoints} Points</strong>
                      </div>
                      <p className="text-[9px] text-gray-400 leading-normal">
                        Every 1 point equals ₹5. Convert your points to dashboard billing credits instantly.
                      </p>

                      <button
                        onClick={handleRedeemPoints}
                        disabled={claimStatus === "converting"}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        {claimStatus === "converting" ? "Redeeming Credits..." : "Convert Points to Credits"}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeSubTab === "profile" && (
            <div className="space-y-6">
              
              <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Corporate Billing Credentials</h4>
                <p className="text-xs text-gray-400">
                  Manage addresses, billing coordinates, and GST details requested during electronic invoice assembly.
                </p>

                <form onSubmit={handleSaveBillingProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-bold">Tax Registered Company Name</label>
                    <input
                      type="text"
                      required
                      value={billingProfile.companyName}
                      onChange={e => setBillingProfile({ ...billingProfile, companyName: e.target.value })}
                      placeholder="e.g. Acme Sourcing Private Ltd"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-bold">GST Number (GSTIN)</label>
                    <input
                      type="text"
                      value={billingProfile.gstNumber}
                      onChange={e => setBillingProfile({ ...billingProfile, gstNumber: e.target.value.toUpperCase().trim() })}
                      placeholder="e.g. 29AABCA1234F1Z0"
                      maxLength={15}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-gray-400 font-bold">Corporate Billing Address</label>
                    <textarea
                      required
                      rows={3}
                      value={billingProfile.billingAddress}
                      onChange={e => setBillingProfile({ ...billingProfile, billingAddress: e.target.value })}
                      placeholder="Enter company registered billing address..."
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-bold">Primary Billing Email Address</label>
                    <input
                      type="email"
                      required
                      value={billingProfile.contactEmail}
                      onChange={e => setBillingProfile({ ...billingProfile, contactEmail: e.target.value })}
                      placeholder="e.g. finance@acme.com"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-400 font-bold">Finance Coordinator Phone Number</label>
                    <input
                      type="text"
                      required
                      value={billingProfile.contactPhone}
                      onChange={e => setBillingProfile({ ...billingProfile, contactPhone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 flex justify-end gap-3 items-center">
                    {saveProfileSuccess && (
                      <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                        <CheckSquare className="w-4.5 h-4.5" /> Billing profile saved!
                      </span>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? "Saving Profile..." : "Save Billing Credentials"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* PayU Secure Sandbox Interactive Checkout Overlay */}
      <AnimatePresence>
        {payuModalData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-neutral-900 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-xs text-gray-300"
            >
              {/* Left Column: Transaction Details Summary */}
              <div className="w-full md:w-5/12 bg-neutral-950 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold text-xs">
                    <span className="bg-indigo-600 text-white font-black px-2 py-1 rounded">PayU</span>
                    <span>SECURE CHECKOUT</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Plan Upgrade</div>
                    <div className="text-base font-extrabold text-white">{payuModalData.plan.name} Tier</div>
                    <div className="text-[10px] text-gray-500 font-mono uppercase">Cycle: {billingCycle}</div>
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Net Plan Price</span>
                      <span className="font-mono text-white">₹{payuModalData.priceDetails.netBasePrice.toLocaleString()}</span>
                    </div>
                    {payuModalData.priceDetails.voucherDiscount + payuModalData.priceDetails.cycleDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Voucher & Cycle Disc</span>
                        <span className="font-mono">-₹{(payuModalData.priceDetails.voucherDiscount + payuModalData.priceDetails.cycleDiscount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Integrated GST (18%)</span>
                      <span className="font-mono text-white">₹{payuModalData.priceDetails.gstAmount.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/5 pt-2 flex justify-between items-baseline">
                      <span className="font-extrabold text-white text-sm">TOTAL AMOUNT</span>
                      <span className="font-mono font-black text-indigo-400 text-lg">₹{parseFloat(payuModalData.amount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="space-y-1 text-[9px] font-mono text-gray-500">
                    <div>Txn ID: {payuModalData.txnid}</div>
                    <div>Key: {payuModalData.key.substring(0, 10)}...</div>
                    <div>Hash: {payuModalData.hash.substring(0, 15)}...</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>256-bit Secure PCI-DSS Transaction</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Payment Instruments Selector */}
              <div className="w-full md:w-7/12 p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h4 className="text-white font-extrabold text-sm uppercase tracking-wide">Select Payment Mode</h4>

                  {/* Payment Instrument Tabs */}
                  <div className="grid grid-cols-5 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    {[
                      { id: "upi", label: "UPI" },
                      { id: "card", label: "Card" },
                      { id: "netbanking", label: "Net" },
                      { id: "wallet", label: "Wallet" },
                      { id: "emi", label: "EMI" }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedPayuTab(tab.id)}
                        className={`py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-all ${
                          selectedPayuTab === tab.id 
                            ? "bg-indigo-600 text-white" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Selected Tab Form Panel */}
                  <div className="min-h-[160px] bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-center">
                    
                    {/* UPI Panel */}
                    {selectedPayuTab === "upi" && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-400">Pay securely via any Virtual Private Address (VPA) / UPI ID:</p>
                        <input 
                          type="text" 
                          placeholder="e.g. mobile@okaxis, account@upi"
                          defaultValue={`${userId.substring(0, 8)}@payu`}
                          className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder-gray-500 focus:border-indigo-500 outline-none"
                        />
                        <div className="flex gap-2 justify-center pt-2">
                          {["Google Pay", "PhonePe", "Paytm", "BHIM"].map(brand => (
                            <span key={brand} className="px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-mono font-bold uppercase text-gray-400">
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Card Panel */}
                    {selectedPayuTab === "card" && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Cardholder Full Name</label>
                          <input 
                            type="text" 
                            defaultValue={userName}
                            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-white outline-none" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase">Card Number</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="4111 2222 3333 4444"
                              maxLength={19}
                              defaultValue="4111 2222 3333 4444"
                              className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-white font-mono outline-none" 
                            />
                            <CreditCard className="w-4 h-4 text-gray-500 absolute left-3 top-2" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase">Expiry (MM/YY)</label>
                            <input 
                              type="text" 
                              placeholder="12/29" 
                              maxLength={5}
                              defaultValue="12/29"
                              className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-center outline-none" 
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase">CVV / CVC Code</label>
                            <input 
                              type="password" 
                              placeholder="***" 
                              maxLength={3}
                              defaultValue="999"
                              className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono text-center outline-none" 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Net Banking */}
                    {selectedPayuTab === "netbanking" && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-400">Select your retail/corporate banking institution:</p>
                        <select className="w-full bg-neutral-950 border border-white/10 rounded-xl p-2.5 text-white focus:border-indigo-500 outline-none">
                          <option>State Bank of India (SBI)</option>
                          <option>HDFC Bank Ltd</option>
                          <option>ICICI Corporate Banking</option>
                          <option>Axis Retail Banking</option>
                          <option>Kotak Mahindra Bank</option>
                          <option>Punjab National Bank</option>
                        </select>
                        <p className="text-[8px] text-gray-500">You will be redirected to the secure bank portal to authorize this payment mandate.</p>
                      </div>
                    )}

                    {/* Wallets */}
                    {selectedPayuTab === "wallet" && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-400">Authenticate through linked wallet services:</p>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          {["Paytm Premium", "PhonePe Wallet", "Amazon Pay", "MobiKwik Secure"].map((wName) => (
                            <button 
                              key={wName}
                              type="button"
                              className="p-2.5 bg-neutral-950 hover:bg-neutral-900 border border-white/10 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="text-[10px] text-white">{wName}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EMI */}
                    {selectedPayuTab === "emi" && (
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-400">Easy Monthly Installments (Credit/Debit Card EMI):</p>
                        <div className="space-y-2">
                          <select className="w-full bg-neutral-950 border border-white/10 rounded-xl p-2 text-white outline-none">
                            <option>HDFC Credit Card EMI</option>
                            <option>ICICI Bank Card EMI</option>
                            <option>SBI Card Installments</option>
                          </select>
                          <div className="grid grid-cols-3 gap-1.5 text-[8px] font-mono text-center">
                            <div className="p-1 bg-white/5 border border-white/5 rounded">
                              <div className="font-bold text-white">3 Months</div>
                              <div className="text-gray-500">@ 12% p.a.</div>
                            </div>
                            <div className="p-1 bg-white/5 border border-white/5 rounded">
                              <div className="font-bold text-white">6 Months</div>
                              <div className="text-gray-500">@ 13% p.a.</div>
                            </div>
                            <div className="p-1 bg-white/5 border border-white/5 rounded">
                              <div className="font-bold text-white">12 Months</div>
                              <div className="text-gray-500">@ 15% p.a.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Secure Gateway Controls */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleCompletePayUPayment("success")}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <span>Complete Secure Payment (PayU)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleCompletePayUPayment("failed")}
                      className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Simulate Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompletePayUPayment("canceled")}
                      className="py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-white/10 text-gray-400 font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancel Checkout
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );

  function tName() {
    return userRole === "consultancy" ? "Consultancy Agency Account" : "Employer Corporate Partner";
  }
}
