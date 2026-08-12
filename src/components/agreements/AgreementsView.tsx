import { HTMLDivElement, useEffect, useRef, useState } from "react";
import { collection, doc, getDocs, orderBy, query, where } from "firebase/firestore";
import { ref } from "firebase/storage";
import { AlertCircle, Badge, CheckCircle2, CheckSquare, Code, Contact, Database, FileCheck, FileText, KeyRound, Printer, RefreshCw, Save, Scroll, ScrollText, Section, ShieldCheck, Signature, Type, User } from "lucide-react";
import { db } from "../../firebase";


interface AgreementsViewProps {
  userId: string;
  userRole?: string;
  userName?: string;
  userEmail?: string;
  onAgreementSigned?: (agreementData: any) => void;
}

export default function AgreementsView({
  userId,
  userRole = "consultancy",
  userName = "Valued Partner",
  userEmail = "",
  onAgreementSigned
}: AgreementsViewProps) {
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [activeAgreement, setActiveAgreement] = useState<any>(null);

  // Form / Step state for agreement signing flow
  const [isSigning, setIsSigning] = useState(false);
  const [signingStep, setSigningStep] = useState<"review" | "otp" | "completed">("review");

  // Scroll to end check
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const agreementDocRef = useRef<HTMLDivElement>(null);

  // 6 Mandatory Checkboxes
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
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load user agreements from Firestore / API
  const parseJsonResponse = async (res: Response, defaultError: string) => {
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
      throw new Error(`${defaultError} (${res.status}): ${text.slice(0, 150) || res.statusText}`);
    }

    if (!json) {
      throw new Error(`${defaultError}: Server returned non-JSON response (${res.status}).`);
    }

    return json;
  };

  const fetchAgreements = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const q = query(
        collection(db, "agreements"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const list = snap.docs.map(doc => doc.data());
        setAgreements(list);
        setActiveAgreement(list[0]);
      } else {
        // Auto-generate default agreement if none exists yet
        const res = await fetch("/api/agreements/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            role: userRole,
            planId: "plan_default_499",
            legalName: userName,
            authorizedPerson: userName
          })
        });
        const data = await parseJsonResponse(res, "Failed to generate agreement");
        if (data.success && data.agreement) {
          setAgreements([data.agreement]);
          setActiveAgreement(data.agreement);
        } else {
          setErrorMsg(data.error || "Failed to generate agreement.");
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch/generate agreements:", err);
      setErrorMsg(err.message || "Failed to load agreement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchAgreements();
    }
  }, [userId]);

  // Track scrolling inside agreement box
  const handleScroll = () => {
    if (agreementDocRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = agreementDocRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        setHasScrolledToEnd(true);
      }
    }
  };

  // Handle OTP request & dispatch
  const handleProceedToOtp = async () => {
    const allChecked = Object.values(checkboxes).every(Boolean);
    if (!allChecked) {
      setErrorMsg("You must scroll to the bottom and accept all 6 mandatory legal clauses before proceeding.");
      return;
    }
    setErrorMsg("");
    setSigningStep("otp");

    // Trigger OTP dispatch via backend Twilio / Verify API
    try {
      const res = await fetch("/api/agreements/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, agreementId: activeAgreement?.agreementId, phone: "" })
      });
      const data = await parseJsonResponse(res, "Failed to send OTP");
      if (data.success) {
        setOtpSent(true);
        setSuccessMsg(data.message || "OTP code sent successfully.");
      } else {
        setErrorMsg(data.error || "Could not dispatch OTP.");
      }
    } catch (err: any) {
      console.warn("OTP dispatch notice:", err);
      setErrorMsg(err.message || "OTP dispatch error.");
    }
  };

  // Handle Verify OTP & Execute Digital eSign
  const handleVerifyOtpAndSign = async () => {
    if (!otp || otp.trim().length < 4) {
      setErrorMsg("Please enter a valid OTP code (e.g., 123456).");
      return;
    }

    setOtpVerifying(true);
    setErrorMsg("");

    try {
      // Capture User Agent and IP
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Browser";
      let ipAddress = "127.0.0.1";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData?.ip) ipAddress = ipData.ip;
        }
      } catch (e) {
        // Fallback IP
      }

      const res = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: activeAgreement?.agreementId || `agmt_${userId}`,
          userId,
          otp: otp.trim(),
          ipAddress,
          userAgent,
          checkboxes
        })
      });

      const data = await parseJsonResponse(res);
      if (!data.success) {
        throw new Error(data.error || data.message || "Digital signature failed.");
      }

      setActiveAgreement(data.agreement);
      setSigningStep("completed");
      setSuccessMsg("Agreement signed and accepted via OTP eSign!");

      if (onAgreementSigned) {
        onAgreementSigned(data.agreement);
      }

      fetchAgreements();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept agreement.");
    } finally {
      setOtpVerifying(false);
    }
  };

  // Print Agreement Document
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 font-mono text-xs animate-pulse flex items-center justify-center space-x-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading Legal Agreements & Compliance Documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-gray-100">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Database Access Agreements</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                Legal & Compliance
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              Authorized Database Access Agreements, candidate no-charge covenants, and digital OTP signatures.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAgreements}
          className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-mono font-medium transition-all flex items-center space-x-1.5 border border-white/10 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Candidate Safety Mandate Warning */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300 uppercase tracking-wide">
            Mandatory Candidate Safety & Fair Recruitment Covenant
          </p>
          <p className="leading-relaxed">
            AIJOBS does not permit charging candidates for job applications, interviews, selection, offer letters, or joining. All recruiters and consultancies operating under this agreement agree to adhere to strict ethical recruitment standards.
          </p>
        </div>
      </div>

      {/* Agreement Selection Tabs if multiple agreements exist */}
      {agreements.length > 1 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {agreements.map((agr) => (
            <button
              key={agr.agreementId}
              onClick={() => {
                setActiveAgreement(agr);
                setIsSigning(false);
                setSigningStep("review");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer flex items-center space-x-2 shrink-0 ${
                activeAgreement?.agreementId === agr.agreementId
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>{agr.agreementNumber}</span>
              <span className={`px-1.5 py-0.2 text-[9px] rounded uppercase ${
                agr.status === "accepted" || agr.status === "payment_completed" || agr.status === "active"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}>
                {agr.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Agreement Content Card */}
      {activeAgreement && (
        <div className="bg-[#0c101c] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
          
          {/* Document Header Status Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-indigo-400 font-bold">
                <span>AGREEMENT NO:</span>
                <span className="text-white bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  {activeAgreement.agreementNumber}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                Version: {activeAgreement.agreementVersion || "v1.0.2026"} | Date: {new Date(activeAgreement.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 border ${
                activeAgreement.status === "accepted" || activeAgreement.status === "payment_completed" || activeAgreement.status === "active"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status: {activeAgreement.status}</span>
              </div>

              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-mono transition-all border border-white/10 flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Parties & Plan Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            
            {/* Party A: Licensor */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <span className="text-indigo-400 font-bold uppercase text-[10px] block">LICENSOR / ISSUING ENTITY</span>
              <h4 className="font-bold text-white text-sm">{activeAgreement.seller?.legalEntityName || "AIJOBS Technologies India Private Limited"}</h4>
              <p className="text-gray-300">GSTIN: <strong className="text-white">{activeAgreement.seller?.gstin || "29AAAAA0000A1Z5"}</strong></p>
              <p className="text-gray-400 text-[11px] leading-relaxed">{activeAgreement.seller?.registeredAddress || "Outer Ring Road, Marathahalli, Bengaluru, Karnataka 560103"}</p>
            </div>

            {/* Party B: Subscriber */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <span className="text-indigo-400 font-bold uppercase text-[10px] block">SUBSCRIBER / RECRUITER ENTITY</span>
              <h4 className="font-bold text-white text-sm">{activeAgreement.buyer?.legalName || userName}</h4>
              <p className="text-gray-300">Authorized Person: <strong className="text-white">{activeAgreement.buyer?.authorizedPerson || userName}</strong></p>
              {activeAgreement.buyer?.gstin && <p className="text-gray-300">GSTIN: <strong className="text-white">{activeAgreement.buyer.gstin}</strong></p>}
              <p className="text-gray-400 text-[11px] leading-relaxed">{activeAgreement.buyer?.registeredAddress || "Registered Address"}</p>
            </div>
          </div>

          {/* Pricing & Commercial Breakup */}
          <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-indigo-500/20 pb-2">
              <span className="font-bold text-indigo-300 uppercase">Selected Pricing Plan Details</span>
              <span className="text-emerald-400 font-bold text-sm">₹{activeAgreement.planSummary?.totalAmount || "588.82"} Total</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-300">
              <div>Plan Name: <strong className="text-white">{activeAgreement.planSummary?.planName || "Database Access Plan"}</strong></div>
              <div>Base Fee: <strong className="text-white">₹{activeAgreement.planSummary?.baseAmount || "499.00"}</strong></div>
              <div>GST Rate: <strong className="text-white">{activeAgreement.planSummary?.gstPercentage || 18}%</strong></div>
              <div>GST Amount: <strong className="text-emerald-300">₹{activeAgreement.planSummary?.gstAmount || "89.82"}</strong></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-gray-300 pt-2 border-t border-indigo-500/20 text-[11px]">
              <div>Validity: <strong>{activeAgreement.planSummary?.validityDays || 30} Days</strong></div>
              <div>Profile Views: <strong>{activeAgreement.planSummary?.candidateViewLimit || 500} Profiles</strong></div>
              <div>Resume Downloads: <strong>{activeAgreement.planSummary?.resumeDownloadLimit || 50} Resumes</strong></div>
              <div>Contact Unlocks: <strong>{activeAgreement.planSummary?.contactUnlockLimit || 10} Contacts</strong></div>
            </div>
          </div>

          {/* Full Agreement Render / Scroll Area */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-300 font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Agreement Clauses Document</span>
              </span>
              {!hasScrolledToEnd && activeAgreement.status === "generated" && (
                <span className="text-amber-400 font-mono text-[11px] animate-pulse">
                  👇 Scroll to bottom to unlock acceptance checkboxes
                </span>
              )}
            </div>

            <div
              ref={agreementDocRef}
              onScroll={handleScroll}
              className="bg-black/70 border border-white/10 rounded-xl p-5 max-h-72 overflow-y-auto text-xs text-gray-300 font-mono space-y-4 leading-relaxed select-none"
            >
              <h3 className="font-bold text-white text-center text-sm uppercase tracking-wide border-b border-white/10 pb-2">
                AIJOBS DATABASE ACCESS & RECRUITMENT SERVICES AGREEMENT
              </h3>

              <p><strong>1. PREAMBLE & E-ACCEPTANCE:</strong> This Agreement is legally binding between AIJOBS Technologies India Private Limited ("AIJOBS") and the Subscriber entity ("Subscriber"). Electronic signature via OTP shall constitute valid acceptance under Section 10A of Indian Information Technology Act, 2000.</p>

              <p><strong>2. CANDIDATE DATABASE LICENSING:</strong> Subject to full payment of the plan fee (₹{activeAgreement.planSummary?.baseAmount} + 18% GST = ₹{activeAgreement.planSummary?.totalAmount} INR), AIJOBS grants Subscriber a limited, non-transferable, non-exclusive license to search and view candidate profiles.</p>

              <p><strong>3. CANDIDATE NO-CHARGE MANDATE (ZERO CANDIDATE FEES):</strong> Subscriber covenants strictly and irrevocably never to request, charge, or demand any money, deposit, registration fee, interview charge, or placement fee from any candidate. Violations shall trigger immediate criminal and civil liability.</p>

              <p><strong>4. NON-REFUNDABLE SUBSCRIPTION FEE:</strong> All plan fees paid under this agreement are strictly non-refundable upon successful verification and database activation, except where explicitly required by applicable law.</p>

              <p><strong>5. PROHIBITED DATA RESALE & EXPORT:</strong> Subscriber shall not copy, export, scrape, sell, publish, or share candidate personal data with unauthorized third parties or marketing agencies.</p>

              <p><strong>6. RECRUITER RESPONSIBILITY UNDER CONSULTANCY:</strong> Consultancies operating under this agreement accept full vicarious liability for all recruiters, employees, and agents accessing candidate data under their subscription seats.</p>

              <p><strong>7. SUSPENSION AND TERMINATION:</strong> AIJOBS reserves absolute right to suspend or terminate database access immediately upon detecting suspicious activity, candidate complaints, fraud, or misuse of contact details.</p>

              <p><strong>8. GOVERNING LAW & JURISDICTION:</strong> This Agreement shall be governed by the laws of India. Courts in Bengaluru, Karnataka shall have exclusive jurisdiction over disputes.</p>

              <div className="pt-4 text-center text-[10px] text-gray-500 font-bold border-t border-white/10">
                --- END OF OFFICIAL LEGAL AGREEMENT ---
              </div>
            </div>
          </div>

          {/* SIGNING CONTROLS IF AGREEMENT IS PENDING ACCEPTANCE */}
          {(activeAgreement.status === "generated" || activeAgreement.status === "sent" || activeAgreement.status === "viewed") && (
            <div className="pt-4 border-t border-white/10 space-y-4">
              
              <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-2">
                <CheckSquare className="w-4 h-4" />
                <span>2. Mandatory Acceptance Checkboxes (Scroll Required)</span>
              </h4>

              {/* 6 Mandatory Checkboxes */}
              <div className="space-y-2.5 bg-white/5 border border-white/10 p-4 rounded-xl text-xs font-mono">
                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.readAndAccepted}
                    onChange={(e) => setCheckboxes({ ...checkboxes, readAndAccepted: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>1. I have read, understood, and accepted the full AIJOBS Database Access Agreement.</span>
                </label>

                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.noCandidateCharges}
                    onChange={(e) => setCheckboxes({ ...checkboxes, noCandidateCharges: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-amber-300 font-bold">2. I agree NEVER to charge candidates for job applications, interviews, selection, offer letters, or joining.</span>
                </label>

                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.legitimateRecruitmentOnly}
                    onChange={(e) => setCheckboxes({ ...checkboxes, legitimateRecruitmentOnly: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>3. I will use candidate data exclusively for legitimate recruitment activity.</span>
                </label>

                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.noDataResaleOrExport}
                    onChange={(e) => setCheckboxes({ ...checkboxes, noDataResaleOrExport: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>4. I will not copy, export, sell, or share candidate data with unauthorized third parties.</span>
                </label>

                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.nonRefundablePolicyAccepted}
                    onChange={(e) => setCheckboxes({ ...checkboxes, nonRefundablePolicyAccepted: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>5. I understand that the plan fee is non-refundable after successful activation.</span>
                </label>

                <label className="flex items-start space-x-2.5 text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!hasScrolledToEnd}
                    checked={checkboxes.suspensionOnViolationAccepted}
                    onChange={(e) => setCheckboxes({ ...checkboxes, suspensionOnViolationAccepted: e.target.checked })}
                    className="mt-0.5 rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <span>6. I agree that violations may result in immediate suspension or termination.</span>
                </label>
              </div>

              {/* STEP: OTP Verification */}
              {signingStep === "otp" ? (
                <div className="p-5 bg-indigo-950/60 border border-indigo-500/40 rounded-xl space-y-4 max-w-md mx-auto text-center font-mono">
                  <div className="p-3 bg-indigo-600/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/30">
                    <KeyRound className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm">Enter eSign Consent OTP</h4>
                    <p className="text-xs text-gray-300 mt-1">
                      Enter the 6-digit verification code sent to <strong>{userEmail || "your email"}</strong> to complete digital signature.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-44 mx-auto text-center font-mono text-xl tracking-widest bg-black/50 border border-indigo-500/50 rounded-xl py-2 text-white focus:outline-none focus:border-indigo-400"
                    />
                    <p className="text-[10px] text-gray-400">Demo Code: 123456</p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-left">
                      <p className="text-xs text-rose-300 font-mono flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                      </p>
                      <div className="flex items-center gap-2 pt-1 font-mono">
                        <button
                          type="button"
                          onClick={handleVerifyOtpAndSign}
                          disabled={otpVerifying}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          {otpVerifying ? "Retrying..." : "🔄 Retry Signature"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setErrorMsg("")}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Dismiss Error
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleVerifyOtpAndSign}
                    disabled={otpVerifying}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {otpVerifying ? (
                      <span>Executing Digital eSign Signature...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm OTP & Execute Digital Signature</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-left">
                      <p className="text-xs text-rose-300 font-mono flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                      </p>
                      <div className="flex items-center gap-2 pt-1 font-mono">
                        <button
                          type="button"
                          onClick={() => setErrorMsg("")}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded text-[11px] transition-colors cursor-pointer"
                        >
                          Dismiss Error
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProceedToOtp}
                    disabled={!hasScrolledToEnd || !Object.values(checkboxes).every(Boolean)}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Proceed to Digital OTP eSign Verification</span>
                  </button>
                </>
              )}

            </div>
          )}

          {/* SIGNED DIGITAL ESIGN SEAL IF ALREADY ACCEPTED */}
          {(activeAgreement.status === "accepted" || activeAgreement.status === "payment_completed" || activeAgreement.status === "active") && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>OFFICIALLY SIGNED DIGITAL ESIGN SEAL</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                  Legally Binding
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-gray-300 text-[11px] pt-1">
                <div>Signed At: <strong className="text-white block">{new Date(activeAgreement.acceptedAt || activeAgreement.createdAt).toLocaleString()}</strong></div>
                <div>eSign Provider: <strong className="text-white block">{activeAgreement.eSignProvider || "Twilio Verify & AIJOBS eSign Engine"}</strong></div>
                <div>Signing IP: <strong className="text-white block">{activeAgreement.acceptedIp || "127.0.0.1"}</strong></div>
                <div>Transaction ID: <strong className="text-emerald-300 block">{activeAgreement.eSignTransactionId || "TXN_ESIGN_VERIFIED"}</strong></div>
              </div>
              {activeAgreement.acceptedUserAgent && (
                <div className="text-[10px] text-gray-400 border-t border-emerald-500/20 pt-1.5 truncate">
                  User Agent: <span className="text-gray-300 font-mono">{activeAgreement.acceptedUserAgent}</span>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
