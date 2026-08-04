import React, { Dispatch, FormEvent, SetStateAction, useEffect, useState } from "react";
import { AlertCircle, Building, Camera, CheckCircle2, Clock, Code, Contact, CreditCard, Database, File, FileCheck, FileText, KeyRound, Lock, LogOut, Phone, Search, ShieldCheck, Type, Upload, Vault, Webcam } from "lucide-react";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { parseJsonResponse } from "../utils/apiHelper";
import LiveSelfieCaptureModal from "./LiveSelfieCaptureModal";
import AadhaarOfflineModal from "./AadhaarOfflineModal";
import AgreementAndCheckoutModal from "./AgreementAndCheckoutModal";

interface VerificationOnboardingViewProps {
  user: any;
  onLogout: () => void;
  onStatusUpdate?: () => void;
}

interface DocUploadState {
  file: File | null;
  publicId?: string;
  secureUrl?: string;
  status: "idle" | "uploading" | "success" | "error";
  errorMsg?: string;
}

export default function VerificationOnboardingView({ user, onLogout, onStatusUpdate }: VerificationOnboardingViewProps) {
  const isConsultancy = user?.role === "consultancy" || user?.role === "agency";
  
  // Registration Form Fields
  const [formData, setFormData] = useState({
    fullName: user?.name || user?.displayName || "",
    email: user?.email || "",
    phone: user?.phone || user?.mobileNumber || "",
    companyName: user?.companyName || user?.agencyName || "",
    designation: user?.designation || (isConsultancy ? "Managing Director" : "Senior Recruiter"),
    officeAddress: user?.officeAddress || user?.location || "",
    website: user?.website || "",
    panNumber: user?.panNumber || "",
    gstNumber: user?.gstNumber || "",
    isIndependent: false
  });

  // Document states
  const [docGovId, setDocGovId] = useState<DocUploadState>({ file: null, status: "idle" });
  const [docPhoto, setDocPhoto] = useState<DocUploadState>({ file: null, status: "idle" });
  const [docProof, setDocProof] = useState<DocUploadState>({ file: null, status: "idle" });
  const [docPan, setDocPan] = useState<DocUploadState>({ file: null, status: "idle" });
  const [docAddress, setDocAddress] = useState<DocUploadState>({ file: null, status: "idle" });
  const [docBusinessProof, setDocBusinessProof] = useState<DocUploadState>({ file: null, status: "idle" });

  // Interactive KYC & Agreement Modals State
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Plan Selection State
  const [selectedPlan, setSelectedPlan] = useState<string>("plan_default_499");
  const [paymentDone, setPaymentDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Load active verification request on mount
  useEffect(() => {
    async function fetchVerificationStatus() {
      try {
        const res = await fetch(`/api/verification/my-status?userId=${user.uid}`);
        const data = await parseJsonResponse(res);
        if (data.request) {
          setExistingRequest(data.request);
          if (data.request.paymentStatus === "paid") {
            setPaymentDone(true);
          }
        }
      } catch (err) {
        console.warn("Failed to load verification status:", err);
      } finally {
        setLoadingStatus(false);
      }
    }
    if (user?.uid) {
      fetchVerificationStatus();
    } else {
      setLoadingStatus(false);
    }
  }, [user]);

  // Handle single document upload with file type & size validation (Max 10MB, PDF/JPG/PNG/WEBP)
  const handleUploadDocument = async (
    file: File, 
    setDocState: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setDocState({
        file: null,
        status: "error",
        errorMsg: "Invalid format. Allowed file formats: PDF, JPG, PNG, WEBP."
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setDocState({
        file: null,
        status: "error",
        errorMsg: "File too large. Maximum file size allowed is 10MB."
      });
      return;
    }

    setDocState({ file, status: "uploading" });

    try {
      const result = await uploadToCloudinary(file, {
        userId: user?.uid || "anonymous",
        assetType: "documents"
      });

      setDocState({
        file,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        status: "success"
      });
    } catch (err: any) {
      setDocState({
        file,
        status: "error",
        errorMsg: err.message || "Failed to upload document securely."
      });
    }
  };

  // Submit complete verification payload
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Validate required documents
    if (isConsultancy) {
      if (!docGovId.secureUrl || !docPan.secureUrl || !docAddress.secureUrl || !docBusinessProof.secureUrl) {
        setSubmitError("Please upload all required consultancy legal documents (Owner ID, PAN, Address Proof, GST/Incorporation Proof).");
        return;
      }
    } else {
      if (!docGovId.secureUrl || !docPhoto.secureUrl || !docProof.secureUrl) {
        setSubmitError("Please upload all required recruiter verification documents (Aadhaar/Gov ID, Photo, Employment Proof).");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const submittedDocs = isConsultancy ? [
        { docType: "owner_gov_id", publicId: docGovId.publicId, secureUrl: docGovId.secureUrl, fileName: docGovId.file?.name },
        { docType: "pan_card", publicId: docPan.publicId, secureUrl: docPan.secureUrl, fileName: docPan.file?.name },
        { docType: "address_proof", publicId: docAddress.publicId, secureUrl: docAddress.secureUrl, fileName: docAddress.file?.name },
        { docType: "business_proof", publicId: docBusinessProof.publicId, secureUrl: docBusinessProof.secureUrl, fileName: docBusinessProof.file?.name }
      ] : [
        { docType: "aadhaar_gov_id", publicId: docGovId.publicId, secureUrl: docGovId.secureUrl, fileName: docGovId.file?.name },
        { docType: "profile_photo", publicId: docPhoto.publicId, secureUrl: docPhoto.secureUrl, fileName: docPhoto.file?.name },
        { docType: "employment_proof", publicId: docProof.publicId, secureUrl: docProof.secureUrl, fileName: docProof.file?.name }
      ];

      const payload = {
        userId: user.uid,
        userEmail: user.email,
        role: user.role || (isConsultancy ? "consultancy" : "recruiter"),
        formData,
        submittedDocuments: submittedDocs,
        selectedPlan,
        paymentStatus: paymentDone ? "paid" : "pending"
      };

      const res = await fetch("/api/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await parseJsonResponse(res);
      if (!data.success) {
        throw new Error(data.error || "Failed to submit verification request.");
      }

      setExistingRequest(data.request);
      if (onStatusUpdate) onStatusUpdate();
    } catch (err: any) {
      setSubmitError(err.message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment processing simulation / gateway call
  const handleProcessPayment = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      // Simulate PayU payment completion
      const res = await fetch("/api/payu-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          amount: selectedPlan === "starter" ? 2999 : selectedPlan === "professional" ? 7999 : 19999,
          productInfo: `AIJobs ${selectedPlan.toUpperCase()} Subscription Plan`,
          firstname: formData.fullName,
          email: formData.email,
          phone: formData.phone
        })
      });

      const payData = await parseJsonResponse(res);
      if (payData.success) {
        setPaymentDone(true);
        alert(`🎉 Payment of ₹${payData.paymentDetails.amount} verified! Verification request will now be queued for Admin Review.`);
      } else {
        throw new Error("Payment initiation failed.");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Payment processing failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white font-mono text-sm">
        <Clock className="w-6 h-6 text-indigo-400 animate-spin mr-3" />
        <span>Syncing corporate verification credentials...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-gray-100 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{isConsultancy ? "Consultancy Onboarding & License Verification" : "Recruiter Identity & Employment Verification"}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {existingRequest?.verificationStatus || "Verification Pending"}
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Mandatory document submission and plan subscription under AIJobs India Recruitment Regulations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-gray-300 hover:text-white font-medium flex items-center space-x-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Status Notice if request submitted */}
        {existingRequest && existingRequest.verificationStatus !== "rejected" && existingRequest.verificationStatus !== "resubmission_required" && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-indigo-400 shrink-0 mt-1 animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">Account Verification Under Review</h3>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Your legal identity documents and subscription plan details have been securely logged. An AIJobs Compliance Admin will inspect your documents and activate your full portal access within 2-4 business hours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono pt-4 border-t border-indigo-500/20">
              <div>
                <span className="text-gray-400 block text-[10px]">REQUEST ID</span>
                <strong className="text-white">{existingRequest.requestId || existingRequest.id}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">SELECTED PLAN</span>
                <strong className="text-indigo-300 uppercase">{existingRequest.selectedPlan}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">PAYMENT STATUS</span>
                <strong className={existingRequest.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}>
                  {existingRequest.paymentStatus === "paid" ? "✅ PAID & VERIFIED" : "⏳ PENDING PAYMENT"}
                </strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">STATUS</span>
                <strong className="text-amber-400 uppercase">{existingRequest.verificationStatus}</strong>
              </div>
            </div>

            {/* Pending Permissions Warning */}
            <div className="p-3.5 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Restricted Mode:</strong> Job posting, candidate messaging, resume downloads, and offer letter releases remain locked until final Admin clearance.
              </span>
            </div>
          </div>
        )}

        {/* Rejection / Resubmission Notice */}
        {existingRequest && (existingRequest.verificationStatus === "rejected" || existingRequest.verificationStatus === "resubmission_required") && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-6 space-y-3">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-base">Verification Resubmission Required</h3>
                <p className="text-xs text-rose-200 mt-1">
                  Reason: <strong>{existingRequest.rejectionReason || "Uploaded documents were blurry or incomplete."}</strong>
                </p>
                <p className="text-xs text-gray-300 mt-1">Please review and re-upload clear copies below.</p>
              </div>
            </div>
          </div>
        )}

        {/* Verification & Onboarding Form */}
        {(!existingRequest || existingRequest.verificationStatus === "rejected" || existingRequest.verificationStatus === "resubmission_required") && (
          <form onSubmit={handleSubmitVerification} className="space-y-6">
            
            {/* Step 1: Corporate Details */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2">
                <Building className="w-4 h-4 text-indigo-400" />
                <span>1. Corporate Information</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-gray-300 block font-medium mb-1">Full Name / Authorized Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block font-medium mb-1">Official Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block font-medium mb-1">Mobile Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block font-medium mb-1">{isConsultancy ? "Consultancy Name *" : "Company Name *"}</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-gray-300 block font-medium mb-1">Registered Office Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.officeAddress}
                    onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                    placeholder="Street, City, State, PIN Code"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Document Uploads via Signed Cloudinary Flow */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>2. Upload Verification Documents (Cloudinary Encrypted Vault)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Accepted formats: PDF, JPG, PNG, WEBP. Maximum file size: 10MB per document.
              </p>

              {/* Instant Verification Quick Action Badges */}
              <div className="flex flex-wrap items-center gap-3 py-2 border-y border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSelfieModal(true)}
                  className="py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>Take Live Webcam Liveness Selfie</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAadhaarModal(true)}
                  className="py-2 px-3 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-purple-400" />
                  <span>UIDAI Aadhaar Offline e-KYC (Zip)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Gov ID */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-white block">
                    {isConsultancy ? "Owner Government ID (Aadhaar / Passport / Voter ID) *" : "Aadhaar Card or Government ID *"}
                  </span>
                  
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocGovId);
                    }}
                    className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                  />

                  {docGovId.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                  {docGovId.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docGovId.file?.name}</p>}
                  {docGovId.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docGovId.errorMsg}</p>}
                </div>

                {/* Recruiter Photo OR Consultancy PAN */}
                {isConsultancy ? (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-white block">Consultancy PAN Card *</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocPan);
                      }}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                    {docPan.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                    {docPan.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docPan.file?.name}</p>}
                    {docPan.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docPan.errorMsg}</p>}
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-white block">Recent Profile Photo *</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocPhoto);
                      }}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                    {docPhoto.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                    {docPhoto.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docPhoto.file?.name}</p>}
                    {docPhoto.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docPhoto.errorMsg}</p>}
                  </div>
                )}

                {/* Recruiter Employment Proof OR Consultancy Address Proof */}
                {isConsultancy ? (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-white block">Business Address Proof *</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocAddress);
                      }}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                    {docAddress.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                    {docAddress.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docAddress.file?.name}</p>}
                    {docAddress.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docAddress.errorMsg}</p>}
                  </div>
                ) : (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 md:col-span-2">
                    <span className="text-xs font-bold text-white block">Employment Proof (ID Card / Offer Letter / HR Confirmation) *</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocProof);
                      }}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                    {docProof.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                    {docProof.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docProof.file?.name}</p>}
                    {docProof.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docProof.errorMsg}</p>}
                  </div>
                )}

                {/* Consultancy Business Proof (GST / MSME / Incorporation) */}
                {isConsultancy && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 md:col-span-2">
                    <span className="text-xs font-bold text-white block">Business Proof (GST / MSME / Incorporation Certificate) *</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadDocument(e.target.files[0], setDocBusinessProof);
                      }}
                      className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer"
                    />
                    {docBusinessProof.status === "uploading" && <p className="text-[10px] text-indigo-400 animate-pulse font-mono">Encrypting and uploading file...</p>}
                    {docBusinessProof.status === "success" && <p className="text-[10px] text-emerald-400 font-mono">✅ Uploaded: {docBusinessProof.file?.name}</p>}
                    {docBusinessProof.status === "error" && <p className="text-[10px] text-rose-400 font-mono">❌ {docBusinessProof.errorMsg}</p>}
                  </div>
                )}

              </div>
            </div>

            {/* Step 3: Subscription Plan Selection */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span>3. Select Database Access Plan</span>
              </h3>

              <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10 space-y-3 relative overflow-hidden">
                <span className="absolute top-0 right-0 bg-indigo-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-bl">RECOMMENDED BASE PLAN</span>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-base">AIJOBS Database Access Plan</h4>
                    <p className="text-xs text-gray-300 mt-0.5">30 Days Full Candidate Search, Profiles & Resume Access</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-emerald-400">₹588.82 <span className="text-xs font-normal text-gray-300">Total</span></p>
                    <p className="text-[10px] text-gray-400 font-mono">₹499 Base + ₹89.82 GST (18%)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono pt-2 border-t border-indigo-500/20">
                  <div className="bg-black/30 p-2 rounded">Candidate Views: <strong>500 Profiles</strong></div>
                  <div className="bg-black/30 p-2 rounded">Resume Downloads: <strong>50 PDFs</strong></div>
                  <div className="bg-black/30 p-2 rounded">Contact Unlocks: <strong>10 Phone/Email</strong></div>
                  <div className="bg-black/30 p-2 rounded">Recruiter Seats: <strong>3 Seats</strong></div>
                </div>
              </div>

              {/* Payment Verification Trigger */}
              <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white/5 border border-white/5 rounded-xl">
                <div>
                  <h4 className="font-bold text-white text-xs">Sign Agreement & Authorize Subscription</h4>
                  <p className="text-[11px] text-gray-400">Digital OTP eSign agreement and payment authorization are mandatory under compliance guidelines.</p>
                </div>

                {!paymentDone ? (
                  <button
                    type="button"
                    onClick={() => setShowAgreementModal(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-2 shrink-0 shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Sign Agreement & Pay ₹588.82</span>
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Agreement Signed & Paid</span>
                  </span>
                )}
              </div>

            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Final Verification Request */}
            <button
              type="submit"
              disabled={isSubmitting || !paymentDone}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isSubmitting ? "Submitting Request..." : "Submit Verification Request For Admin Clearance"}</span>
            </button>

          </form>
        )}

        {/* Live Webcam Selfie Capture Modal */}
        <LiveSelfieCaptureModal
          isOpen={showSelfieModal}
          onClose={() => setShowSelfieModal(false)}
          userId={user?.uid || "anonymous"}
          userRole={user?.role || "candidate"}
          onSelfieVerified={(publicId, url) => {
            setDocPhoto({
              file: null,
              publicId,
              secureUrl: url,
              status: "success"
            });
          }}
        />

        {/* UIDAI Aadhaar Paperless Offline e-KYC Modal */}
        <AadhaarOfflineModal
          isOpen={showAadhaarModal}
          onClose={() => setShowAadhaarModal(false)}
          userId={user?.uid || "anonymous"}
          userRole={user?.role || "candidate"}
          onAadhaarVerified={(parsedData) => {
            setDocGovId({
              file: null,
              publicId: `aadhaar_ekyc_${user?.uid}`,
              secureUrl: parsedData.secureVaultUrl || "vault_aadhaar_verified",
              status: "success"
            });
          }}
        />

        {/* Legal Agreement & Razorpay/PayU Checkout Modal */}
        <AgreementAndCheckoutModal
          isOpen={showAgreementModal}
          onClose={() => setShowAgreementModal(false)}
          user={user}
          planId={selectedPlan}
          onSuccess={(invoiceId) => {
            setPaymentDone(true);
            setShowAgreementModal(false);
          }}
        />

      </div>
    </div>
  );
}
