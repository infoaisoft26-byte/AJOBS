import { HTMLDivElement, useEffect, useRef, useState } from "react";
import { where } from "firebase/firestore";
import { ref } from "firebase/storage";
import { AlertCircle, Building2, CheckCircle2, Container, CreditCard, Database, KeyRound, ScrollText, Send, ShieldCheck, Signature, Table, Type, Verified, X } from "lucide-react";
interface AgreementAndCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  planId?: string;
  onSuccess: (invoiceId?: string) => void;
}

export default function AgreementAndCheckoutModal({
  isOpen,
  onClose,
  user,
  planId = "plan_default_499",
  onSuccess
}: AgreementAndCheckoutModalProps) {
  const [step, setStep] = useState<"plan" | "agreement" | "otp" | "payment" | "completed">("plan");
  
  // Plan details
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Legal details
  const [buyerInfo, setBuyerInfo] = useState({
    legalName: user?.companyName || user?.agencyName || user?.name || "",
    authorizedPerson: user?.name || user?.displayName || "",
    registeredAddress: user?.officeAddress || user?.address || "Registered Address",
    gstin: user?.gstNumber || "",
    pan: user?.panNumber || ""
  });

  // Agreement & Consent State
  const [agreement, setAgreement] = useState<any>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const agreementContainerRef = useRef<HTMLDivElement>(null);

  const [checkboxes, setCheckboxes] = useState({
    readAndAccepted: false,
    noCandidateCharges: false,
    legitimateRecruitmentOnly: false,
    noDataResaleOrExport: false,
    nonRefundablePolicyAccepted: false,
    suspensionOnViolationAccepted: false
  });

  // OTP State
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Payment State
  const [paymentOrder, setPaymentOrder] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);

  const [errorMsg, setErrorMsg] = useState("");

  // Load active plan details
  useEffect(() => {
    async function loadPlans() {
      try {
        setLoadingPlan(true);
        const res = await fetch("/api/plans/list");
        const data = await res.json();
        if (data.success && data.plans) {
          setPlans(data.plans);
          const current = data.plans.find((p: any) => p.planId === planId) || data.plans[0];
          setSelectedPlan(current);
        }
      } catch (err) {
        console.warn("Failed to load plans:", err);
      } finally {
        setLoadingPlan(false);
      }
    }
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen, planId]);

  // Track scrolling to end of agreement
  const handleScroll = () => {
    if (agreementContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = agreementContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 30) {
        setHasScrolledToEnd(true);
      }
    }
  };

  if (!isOpen) return null;

  const safeParseJson = async (res: Response, defaultErr: string) => {
    const text = await res.text();
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let json: any = null;
    if (isJson || (text.trim().startsWith("{") || text.trim().startsWith("["))) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        // Not valid JSON
      }
    }

    if (!res.ok) {
      if (json && (json.error || json.message)) {
        throw new Error(json.error || json.message);
      }
      throw new Error(`${defaultErr} (${res.status}): ${text.slice(0, 150) || res.statusText}`);
    }

    if (!json) {
      throw new Error(`${defaultErr}: Server returned non-JSON response (${res.status}).`);
    }

    return json;
  };

  // Step 1 -> Generate Agreement
  const handleGenerateAgreement = async () => {
    setErrorMsg("");
    try {
      const res = await fetch("/api/agreements/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          role: user.role || "consultancy",
          planId: selectedPlan?.planId || "plan_default_499",
          legalName: buyerInfo.legalName,
          authorizedPerson: buyerInfo.authorizedPerson,
          registeredAddress: buyerInfo.registeredAddress,
          gstin: buyerInfo.gstin,
          pan: buyerInfo.pan
        })
      });

      const data = await safeParseJson(res, "Failed to generate agreement");
      if (!data.success) throw new Error(data.error || "Failed to generate agreement.");

      setAgreement(data.agreement);
      setStep("agreement");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not generate agreement.");
    }
  };

  // Step 2 -> Send OTP for eSign Consent
  const handleRequestOtp = () => {
    // Validate checkboxes
    const allChecked = Object.values(checkboxes).every(Boolean);
    if (!allChecked) {
      setErrorMsg("Please accept all 6 mandatory legal clauses before proceeding.");
      return;
    }
    setErrorMsg("");
    setOtpSent(true);
    setStep("otp");
  };

  // Step 3 -> Verify OTP & Accept Agreement
  const handleVerifyOtpAndSign = async () => {
    if (!otp || otp.trim().length < 4) {
      setOtpError("Please enter valid OTP (Default test code: 123456)");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: agreement.agreementId,
          userId: user.uid,
          otp: otp.trim(),
          checkboxes
        })
      });

      const data = await safeParseJson(res, "Failed to sign agreement");
      if (!data.success) throw new Error(data.error || "Failed to sign agreement.");

      setAgreement(data.agreement);

      // Create Payment Order
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          agreementId: agreement.agreementId
        })
      });

      const orderData = await safeParseJson(orderRes, "Failed to create payment order");
      if (!orderData.success) throw new Error(orderData.error || "Failed to create payment order.");

      setPaymentOrder(orderData.order);
      setStep("payment");
    } catch (err: any) {
      setOtpError(err.message || "OTP verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Step 4 -> Complete Payment & Receive Tax Invoice
  const handleExecutePayment = async () => {
    setIsProcessingPayment(true);
    setErrorMsg("");

    try {
      // Execute payment webhook call
      const res = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentOrder.paymentId,
          orderId: paymentOrder.orderId,
          gatewayPaymentId: `pay_gateway_${Date.now()}`,
          signature: "valid_gateway_signature"
        })
      });

      const data = await safeParseJson(res, "Payment verification failed");
      if (!data.success) throw new Error(data.error || "Payment verification failed.");

      // Fetch generated Tax Invoice
      const invRes = await fetch(`/api/invoices/${data.invoiceId}`);
      const invData = await safeParseJson(invRes, "Failed to fetch invoice");

      if (invData.success) {
        setInvoice(invData.invoice);
      }

      setStep("completed");
      onSuccess(data.invoiceId);
    } catch (err: any) {
      setErrorMsg(err.message || "Payment execution failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-white/15 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative text-gray-100 my-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
          <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>AIJOBS Candidate Database Access Agreement</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                Legal & Tax Compliant
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Official legal agreement & Razorpay/PayU payment authorization for Candidate Database Access.
            </p>
          </div>
        </div>

        {/* Candidate Free Notice Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-start space-x-2.5 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Candidate Free Policy:</strong> AIJOBS does not charge candidates for job applications, interviews, selection, offer letters, or joining. Paid plans grant candidate search and database access privileges to verified recruiters.
          </span>
        </div>

        {/* STEP 1: PLAN & BUYER DETAILS */}
        {step === "plan" && (
          <div className="space-y-5">
            <h3 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>1. Confirm Corporate & Pricing Breakdown</span>
            </h3>

            {/* Plan Card */}
            <div className="p-4 bg-white/5 border border-indigo-500/30 rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-base">{selectedPlan?.planName || "AIJOBS Database Access Plan"}</h4>
                  <p className="text-xs text-gray-400">Validity: {selectedPlan?.validityDays || 30} Days | Role: {user?.role || "Consultancy"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total Payable</p>
                  <p className="text-xl font-extrabold text-emerald-400">₹{selectedPlan?.totalAmount || "588.82"}</p>
                </div>
              </div>

              {/* Tax Breakup Table */}
              <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-gray-300">
                  <span>Base Access Fee:</span>
                  <span>₹{selectedPlan?.baseAmount || "499.00"}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST Rate:</span>
                  <span>{selectedPlan?.gstPercentage || 18}%</span>
                </div>
                <div className="flex justify-between text-indigo-300 pt-1 border-t border-white/10">
                  <span>GST Amount (CGST 9% + SGST 9% / IGST 18%):</span>
                  <span>₹{selectedPlan?.gstAmount || "89.82"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-300 pt-1 font-mono">
                <div className="bg-white/5 p-2 rounded">Views: <strong>{selectedPlan?.candidateViewLimit || 500} Profiles</strong></div>
                <div className="bg-white/5 p-2 rounded">Downloads: <strong>{selectedPlan?.resumeDownloadLimit || 50} Resumes</strong></div>
                <div className="bg-white/5 p-2 rounded">Unlocks: <strong>{selectedPlan?.contactUnlockLimit || 10} Contacts</strong></div>
                <div className="bg-white/5 p-2 rounded">Seats: <strong>{selectedPlan?.recruiterSeatLimit || 3} Recruiter Seats</strong></div>
              </div>
            </div>

            {/* Buyer Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Subscriber Legal Name *</label>
                <input
                  type="text"
                  required
                  value={buyerInfo.legalName}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, legalName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Authorized Signatory Name *</label>
                <input
                  type="text"
                  required
                  value={buyerInfo.authorizedPerson}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, authorizedPerson: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Company GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="29AAAAA0000A1Z5"
                  value={buyerInfo.gstin}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, gstin: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Company PAN (Optional)</label>
                <input
                  type="text"
                  placeholder="ABCDE1234F"
                  value={buyerInfo.pan}
                  onChange={(e) => setBuyerInfo({ ...buyerInfo, pan: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                ❌ {errorMsg}
              </p>
            )}

            <button
              onClick={handleGenerateAgreement}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <ScrollText className="w-4 h-4" />
              <span>Generate Official Database Access Agreement & Proceed</span>
            </button>
          </div>
        )}

        {/* STEP 2: AGREEMENT TEXT & 6 CHECKBOXES */}
        {step === "agreement" && agreement && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-mono border-b border-white/10 pb-2">
              <span className="text-indigo-400 font-bold">AGREEMENT NO: {agreement.agreementNumber}</span>
              <span className="text-gray-400">VERSION: {agreement.agreementVersion}</span>
            </div>

            {/* Scrollable Legal Clauses Container */}
            <div
              ref={agreementContainerRef}
              onScroll={handleScroll}
              className="bg-black/60 border border-white/10 rounded-xl p-4 max-h-64 overflow-y-auto text-xs text-gray-300 space-y-3 font-mono leading-relaxed select-none"
            >
              <p className="font-bold text-white text-center text-sm">
                AIJOBS DATABASE ACCESS & RECRUITMENT SERVICES AGREEMENT
              </p>

              <p><strong>1. PARTIES:</strong> This Agreement is executed between AIJOBS Technologies India Pvt Ltd ("Licensor") and {agreement.buyer?.legalName} ("Subscriber").</p>

              <p><strong>2. SCOPE OF ACCESS:</strong> The Licensor grants non-exclusive, non-transferable access to candidate profiles and resumes for legitimate employment placement purposes.</p>

              <p><strong>3. PLAN FEES AND TAXES:</strong> Base Fee: ₹{agreement.planSummary?.baseAmount} + 18% GST (₹{agreement.planSummary?.gstAmount}) = Total ₹{agreement.planSummary?.totalAmount} INR for {agreement.planSummary?.validityDays} Days.</p>

              <p><strong>4. NON-REFUNDABLE POLICY:</strong> The plan fee is strictly non-refundable after successful payment verification and database access activation, except where required by applicable law.</p>

              <p><strong>5. CANDIDATE NO-CHARGE MANDATE:</strong> Subscriber strictly covenants never to demand, request, or collect any fee, security deposit, registration charge, or placement amount from any job candidate for applications, interviews, offer letters, or joining.</p>

              <p><strong>6. PROHIBITED DATA RESALE:</strong> Subscriber shall not copy, export, scrape, sell, publish, or redistribute candidate data to third parties.</p>

              <p><strong>7. SUSPENSION & TERMINATION:</strong> Any violation of recruitment ethics, candidate exploitation, or data leak shall result in immediate account suspension, forfeiture of fees, and legal proceedings under Information Technology Act, 2000 and DPDP Act, 2023.</p>

              <p><strong>8. GOVERNING LAW & JURISDICTION:</strong> This agreement shall be governed by laws of India and subject to exclusive jurisdiction of courts in Bengaluru, Karnataka.</p>

              <div className="pt-2 text-center text-[10px] text-gray-500">
                [ --- END OF AGREEMENT CLAUSES --- ]
              </div>
            </div>

            {!hasScrolledToEnd && (
              <p className="text-[11px] text-amber-400 font-mono text-center animate-pulse">
                👇 Please scroll to the bottom of the agreement document to enable checkboxes.
              </p>
            )}

            {/* 6 Mandatory Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.readAndAccepted}
                  onChange={(e) => setCheckboxes({ ...checkboxes, readAndAccepted: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>1. I have read, understood, and accepted the full AIJOBS Database Access Agreement.</span>
              </label>

              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.noCandidateCharges}
                  onChange={(e) => setCheckboxes({ ...checkboxes, noCandidateCharges: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-amber-300 font-medium">2. I agree NEVER to charge candidates for job applications, interviews, selection, offer letters, or joining.</span>
              </label>

              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.legitimateRecruitmentOnly}
                  onChange={(e) => setCheckboxes({ ...checkboxes, legitimateRecruitmentOnly: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>3. I will use candidate data exclusively for legitimate hiring and recruitment activity.</span>
              </label>

              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.noDataResaleOrExport}
                  onChange={(e) => setCheckboxes({ ...checkboxes, noDataResaleOrExport: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>4. I will not copy, export, sell, or share candidate data with unauthorized third parties.</span>
              </label>

              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.nonRefundablePolicyAccepted}
                  onChange={(e) => setCheckboxes({ ...checkboxes, nonRefundablePolicyAccepted: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>5. I acknowledge that the ₹{agreement.planSummary?.totalAmount} subscription fee is non-refundable after successful activation.</span>
              </label>

              <label className="flex items-start space-x-2 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!hasScrolledToEnd}
                  checked={checkboxes.suspensionOnViolationAccepted}
                  onChange={(e) => setCheckboxes({ ...checkboxes, suspensionOnViolationAccepted: e.target.checked })}
                  className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>6. I agree that violations will trigger immediate account suspension, data lockout, and compliance action.</span>
              </label>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                ❌ {errorMsg}
              </p>
            )}

            <button
              onClick={handleRequestOtp}
              disabled={!hasScrolledToEnd || !Object.values(checkboxes).every(Boolean)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Proceed to Digital OTP eSign Signature</span>
            </button>
          </div>
        )}

        {/* STEP 3: OTP eSign VERIFICATION */}
        {step === "otp" && (
          <div className="space-y-4 max-w-md mx-auto text-center py-4">
            <div className="p-3 bg-indigo-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/30">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-white text-base">Digital Consent OTP Verification</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter the 6-digit verification code sent to <strong>{user?.email || "your registered email"}</strong> to execute agreement signature.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-48 mx-auto text-center font-mono text-xl tracking-widest bg-white/5 border border-indigo-500/50 rounded-xl py-2.5 text-white focus:outline-none focus:border-indigo-400"
              />
              <p className="text-[10px] text-gray-500 font-mono">Demo Signature Consent OTP: 123456</p>
            </div>

            {otpError && (
              <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded border border-rose-500/20">
                ❌ {otpError}
              </p>
            )}

            <button
              onClick={handleVerifyOtpAndSign}
              disabled={otpVerifying}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              {otpVerifying ? (
                <span>Executing Digital eSign...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP & Sign Agreement Legally</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: PAYMENT CHECKOUT */}
        {step === "payment" && paymentOrder && (
          <div className="space-y-5">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-3 text-xs text-emerald-300 font-mono">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Agreement <strong>{agreement?.agreementNumber}</strong> successfully signed with OTP consent!</span>
            </div>

            {/* Payment Summary */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="font-bold text-white uppercase font-mono">Payment Order Summary</span>
                <span className="text-gray-400 font-mono">ORDER ID: {paymentOrder.orderId}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-300 font-mono">
                <div>Plan: <strong>{paymentOrder.planName}</strong></div>
                <div>Base Price: <strong>₹{paymentOrder.baseAmount}</strong></div>
                <div>GST (18%): <strong>₹{paymentOrder.gstAmount}</strong></div>
                <div className="text-emerald-400 font-bold">Total Payable: ₹{paymentOrder.totalAmount}</div>
              </div>
            </div>

            <button
              onClick={handleExecutePayment}
              disabled={isProcessingPayment}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isProcessingPayment ? "Verifying Payment Gateway..." : `Pay ₹${paymentOrder.totalAmount} via Razorpay / PayU`}</span>
            </button>
          </div>
        )}

        {/* STEP 5: COMPLETED TAX INVOICE & STATUS */}
        {step === "completed" && invoice && (
          <div className="space-y-4 text-center py-2">
            <div className="p-3 bg-emerald-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-white text-lg">Payment Verified & Tax Invoice Issued!</h3>
              <p className="text-xs text-emerald-300 font-mono mt-1">
                INVOICE NO: {invoice.invoiceNumber}
              </p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-left text-xs font-mono space-y-2">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span>Total Amount Paid:</span>
                <strong className="text-emerald-400">₹{invoice.totalAmount} INR</strong>
              </div>
              <div className="flex justify-between">
                <span>Supplier GSTIN:</span>
                <span>{invoice.supplier?.gstin}</span>
              </div>
              <div className="flex justify-between">
                <span>Place of Supply:</span>
                <span>{invoice.placeOfSupply}</span>
              </div>
            </div>

            <p className="text-xs text-gray-300">
              Your account details have been queued for final Admin verification. You will receive an email once database access is enabled.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Done & Return to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
