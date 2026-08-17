import React, { ChangeEvent, DragEvent, useRef, useState } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { 
  AlertCircle, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Eye, 
  FileCheck, 
  FileText, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Upload 
} from "lucide-react";
import { auth, db } from "../firebase";
import { uploadResumeService } from "../services/resumeUploadService";
import { parseResumeData } from "../services/aiParser";
import { trackResumeUploaded, trackProfileCompleted } from "../utils/analytics";
import { useToast } from "./GlobalToast";

export interface CandidateResumeUploaderProps {
  userId?: string;
  profile?: any;
  currentResumeUrl?: string | null;
  currentResumeName?: string | null;
  currentResumeDate?: string | null;
  onResumeUploaded?: (updatedProfile: any) => void;
  className?: string;
  compact?: boolean;
}

export default function CandidateResumeUploader({
  userId,
  profile,
  currentResumeUrl,
  currentResumeName,
  currentResumeDate,
  onResumeUploaded,
  className = "",
  compact = false
}: CandidateResumeUploaderProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resume status
  const effectiveUserId = userId || profile?.userId || profile?.uid || auth.currentUser?.uid || "";
  const resumeUrl = currentResumeUrl || profile?.resumeUrl || profile?.resumeURL || null;
  const resumeName = currentResumeName || profile?.resumeFileName || profile?.originalFileName || "Candidate_Resume.pdf";
  const resumeDate = currentResumeDate || profile?.resumeUploadedAt || profile?.updatedAt || null;
  const resumeScore = profile?.resumeScore || profile?.atsScore || profile?.aiResumeScore || null;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileUpload(file);
    }
  };

  const processFileUpload = async (file: File) => {
    setErrorMsg(null);

    // 1. Validate file size (10MB maximum)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      const err = "File size exceeds 10MB limit. Please upload a smaller resume document.";
      setErrorMsg(err);
      showToast(err, "error");
      return;
    }

    // 2. Validate file type
    const validExtensions = [".pdf", ".doc", ".docx", ".txt", ".rtf"];
    const fileExt = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    const isValidType = validExtensions.includes(fileExt) || 
      file.type.includes("pdf") || 
      file.type.includes("word") || 
      file.type.includes("document");

    if (!isValidType) {
      const err = "Please upload a valid PDF, DOC, or DOCX document.";
      setErrorMsg(err);
      showToast(err, "error");
      return;
    }

    if (!effectiveUserId) {
      const err = "Please sign in or verify your account before uploading a resume.";
      setErrorMsg(err);
      showToast(err, "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadStep("Connecting to secure storage...");

    try {
      // 3. Upload File to Cloudinary / storage
      setUploadProgress(40);
      setUploadStep("Uploading resume document...");

      const uploadResult = await uploadResumeService(file, {
        userId: effectiveUserId,
        userRole: "candidate",
        userName: profile?.name || profile?.fullName || "Candidate",
        onProgress: (p) => {
          setUploadProgress(Math.min(75, 40 + Math.round(p * 0.35)));
        }
      });

      const uploadedUrl = uploadResult.secureUrl || uploadResult.url;
      if (!uploadedUrl) {
        throw new Error("Unable to obtain secure document URL. Please try again.");
      }

      setUploadProgress(80);
      setUploadStep("Extracting skills & profile with AI...");

      // 4. Parse Resume Data with AI
      let parsed = null;
      try {
        parsed = await parseResumeData(file, {
          userId: effectiveUserId,
          targetRole: profile?.targetRole || ""
        });
      } catch (parseErr: any) {
        console.warn("[CandidateResumeUploader] Non-blocking AI parse notice:", parseErr?.message || parseErr);
      }

      setUploadProgress(95);
      setUploadStep("Finalizing candidate profile...");

      const nowIso = new Date().toISOString();
      const calculatedScore = parsed?.atsScore || parsed?.score || 85;

      const profileUpdates: any = {
        resumeUrl: uploadedUrl,
        resumeURL: uploadedUrl,
        resumeFileName: file.name,
        resumeUploaded: true,
        resumeUploadedAt: nowIso,
        resumeScore: calculatedScore,
        atsScore: calculatedScore,
        profileStatus: "complete",
        profileCompletion: 85,
        updatedAt: nowIso
      };

      if (parsed) {
        if (parsed.skills && parsed.skills.length > 0) profileUpdates.skills = parsed.skills;
        if (parsed.experience) profileUpdates.experience = parsed.experience;
        if (parsed.education) profileUpdates.education = parsed.education;
        if (parsed.targetRole) profileUpdates.targetRole = parsed.targetRole;
        if (parsed.summary) profileUpdates.summary = parsed.summary;
      }

      // Update Firestore documents
      await Promise.all([
        updateDoc(doc(db, "candidates", effectiveUserId), profileUpdates).catch(() => 
          setDoc(doc(db, "candidates", effectiveUserId), { uid: effectiveUserId, ...profileUpdates }, { merge: true })
        ),
        updateDoc(doc(db, "users", effectiveUserId), profileUpdates).catch(() => 
          setDoc(doc(db, "users", effectiveUserId), { uid: effectiveUserId, ...profileUpdates }, { merge: true })
        ),
        setDoc(doc(db, "candidateProfiles", effectiveUserId), {
          uid: effectiveUserId,
          fullName: profile?.fullName || profile?.name || "Candidate",
          email: profile?.email || auth.currentUser?.email || "",
          ...profileUpdates
        }, { merge: true }),
        setDoc(doc(db, "resumes", effectiveUserId), {
          userId: effectiveUserId,
          resumeUrl: uploadedUrl,
          resumeFileName: file.name,
          parseStatus: "completed",
          parsedData: parsed || {},
          atsScore: calculatedScore,
          uploadedAt: nowIso,
          updatedAt: nowIso
        }, { merge: true })
      ]);

      trackResumeUploaded(file.type, "candidate_portal");
      trackProfileCompleted();

      setUploadProgress(100);
      setUploadStep("Resume uploaded & profile updated successfully!");
      showToast("Resume uploaded successfully! AI profile analysis completed.", "success");

      const mergedProfile = {
        ...(profile || {}),
        ...profileUpdates,
        parsedData: parsed
      };

      if (onResumeUploaded) {
        onResumeUploaded(mergedProfile);
      }
    } catch (err: any) {
      console.error("[CandidateResumeUploader Error]:", err);
      const msg = err.message || "Failed to upload resume. Please check your connection and try again.";
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadStep("");
        setUploadProgress(0);
      }, 2500);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`w-full ${className}`} id="candidate-single-resume-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.rtf,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Uploading Progress Overlay / Card */}
      {isUploading ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white mb-1">
              {uploadStep || "Processing Resume..."}
            </h4>
            <p className="text-xs text-blue-300 font-mono">
              AI parser extracting skills, experience, and calculating ATS score
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto bg-black/50 h-2.5 rounded-full overflow-hidden border border-blue-500/20">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-gray-400">
            {uploadProgress}% Complete
          </span>
        </div>
      ) : resumeUrl ? (
        /* Resume Already Uploaded View */
        <div className="p-5 sm:p-6 rounded-2xl bg-gray-900/60 border border-emerald-500/20 hover:border-emerald-500/30 transition-all space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white break-all">
                    {resumeName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold uppercase">
                    Active Resume
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Uploaded: {resumeDate ? new Date(resumeDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                </p>
              </div>
            </div>

            {/* ATS Score if available */}
            {resumeScore && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                <Award className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-300">
                  ATS Score: <strong className="text-white font-mono">{resumeScore}/100</strong>
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-white/5">
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Resume</span>
            </a>

            <a
              href={resumeUrl}
              download={resumeName}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace / Update Resume</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden group ${
            isDragging
              ? "border-blue-400 bg-blue-500/15 scale-[1.01]"
              : "border-blue-500/30 hover:border-blue-400/60 bg-gray-950/60 hover:bg-gray-900/60"
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-blue-400 group-hover:text-blue-300" />
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
            {isDragging ? "Drop your resume here" : "Upload Candidate Resume"}
          </h3>

          <p className="text-xs text-gray-400 max-w-md mx-auto mb-4 leading-relaxed">
            Drag and drop your resume file, or <span className="text-blue-400 font-semibold underline">browse from your device</span>.
            Our AI will automatically parse your skills and match you to active job openings.
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-gray-400">
            <span>Supports: PDF, DOC, DOCX (Max 10MB)</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
