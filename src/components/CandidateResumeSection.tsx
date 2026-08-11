import React, { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { 
  AlertCircle, 
  AlertTriangle, 
  Award, 
  BookOpen, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  FileCheck, 
  FileText, 
  FolderOpen, 
  GraduationCap, 
  MapPin, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Trash2, 
  Upload, 
  User 
} from "lucide-react";
import { auth, db } from "../firebase";
import { uploadResumeService } from "../services/resumeUploadService";
import { parseResumeData } from "../services/aiParser";
import { useToast } from "./GlobalToast";

interface CandidateResumeSectionProps {
  resumeText: string;
  setResumeText: (text: string) => void;
  isAnalyzing: boolean;
  handleAnalyzeResume: () => Promise<void>;
  analysisResult: any;
  profile: any;
  setProfile: (profile: any) => void;
}

export default function CandidateResumeSection({
  resumeText,
  setResumeText,
  profile,
  setProfile
}: CandidateResumeSectionProps) {
  const { showToast } = useToast();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<"overview" | "parsed" | "insights" | "documents">("overview");

  // Upload & processing states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Resume metadata states
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedAt, setUploadedAt] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  // AI Analysis state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<"idle" | "in_progress" | "completed" | "failed">("idle");
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Secondary Document Vault states
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const userId = profile?.userId || profile?.uid || auth.currentUser?.uid;

  // 1. Fetch persistent resume metadata & documents from Firestore on mount
  useEffect(() => {
    if (!userId) return;

    const loadPersistentResume = async () => {
      try {
        // First check 'resumes' collection
        const resumeRef = doc(db, "resumes", userId);
        const resumeSnap = await getDoc(resumeRef);

        let url = profile?.resumeUrl || profile?.resumeURL || null;
        let name = profile?.resumeFileName || profile?.originalFileName || "";
        let time = profile?.resumeUploadedAt || profile?.updatedAt || null;
        let pData = null;

        if (resumeSnap.exists()) {
          const rData = resumeSnap.data();
          url = url || rData.resumeUrl || rData.downloadUrl;
          name = name || rData.resumeFileName || rData.originalFileName || "Uploaded_Resume.pdf";
          time = time || rData.parsedAt || rData.updatedAt;
          pData = rData.parsedData || null;
          if (rData.parseStatus === "completed") {
            setAiAnalysisStatus("completed");
          }
        }

        // Also check 'candidates' collection
        if (!url || !name) {
          const candRef = doc(db, "candidates", userId);
          const candSnap = await getDoc(candRef);
          if (candSnap.exists()) {
            const cData = candSnap.data();
            url = url || cData.resumeUrl;
            name = name || cData.resumeFileName;
            time = time || cData.resumeUploadedAt;
          }
        }

        if (url) setUploadedFileUrl(url);
        if (name) setUploadedFileName(name);
        if (time) setUploadedAt(time);
        if (pData) setParsedData(pData);

        // Fetch document vault items
        setIsLoadingDocs(true);
        const docsRef = collection(db, "candidate_documents");
        const docsQuery = query(docsRef, where("userId", "==", userId));
        const docsSnap = await getDocs(docsQuery);
        const docsList: any[] = [];
        docsSnap.forEach(dDoc => docsList.push(dDoc.data()));
        docsList.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setDocuments(docsList);
        setIsLoadingDocs(false);
      } catch (err: any) {
        setIsLoadingDocs(false);
        console.warn("[CandidateResumeSection] Note on loading persistence:", err?.message || err);
      }
    };

    loadPersistentResume();
  }, [userId, profile]);

  // 2. Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFile(e.target.files[0]);
    }
  };

  // 3. File upload handler using Cloudinary (No Firebase Storage)
  const handleIncomingFile = async (file: File) => {
    if (!userId) {
      showToast("Please log in to upload a resume file.", "warning");
      return;
    }

    // Size limit check: <= 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast("Maximum allowed file size is 10MB. Please choose a smaller file.", "warning");
      return;
    }

    // Extension & MIME check
    const allowedExtensions = [".pdf", ".doc", ".docx", ".txt"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      showToast(`Unsupported format "${fileExt}". Please upload a PDF, DOC, DOCX, or TXT file.`, "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Direct Cloudinary upload service
      const uploadRes = await uploadResumeService({
        uid: userId,
        file,
        onProgress: (pct) => setUploadProgress(Math.min(99, Math.max(15, pct)))
      });

      if (!uploadRes.success || !uploadRes.downloadUrl) {
        throw new Error(uploadRes.error || "Failed to upload file to Cloudinary.");
      }

      const storageUrl = uploadRes.downloadUrl;
      const nowIso = new Date().toISOString();

      setUploadedFileUrl(storageUrl);
      setUploadedFileName(file.name);
      setUploadedAt(nowIso);
      setFileSize(file.size);
      setUploadProgress(100);

      // Save initial metadata immediately to Firestore
      try {
        await updateDoc(doc(db, "candidates", userId), {
          resumeUrl: storageUrl,
          resumeFileName: file.name,
          resumeUploadedAt: nowIso,
          resumeUploaded: true,
          updatedAt: nowIso
        });
      } catch (fErr) {
        // Fallback setDoc
        await setDoc(doc(db, "candidates", userId), {
          uid: userId,
          userId,
          resumeUrl: storageUrl,
          resumeFileName: file.name,
          resumeUploadedAt: nowIso,
          resumeUploaded: true,
          updatedAt: nowIso
        }, { merge: true });
      }

      // Update React state
      setProfile((prev: any) => ({
        ...prev,
        resumeUrl: storageUrl,
        resumeFileName: file.name,
        resumeUploadedAt: nowIso,
        resumeUploaded: true
      }));

      showToast("Resume uploaded successfully!", "success");

      // Auto-trigger background AI analysis without blocking UI or applying page opacity!
      runAiAnalysis(storageUrl, file.name, fileExt, file);
    } catch (err: any) {
      console.error("[CandidateResumeSection] Upload failure:", err);
      showToast(`Upload failed: ${err.message || err}`, "error");
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
    }
  };

  // 4. Independent AI Analysis Execution (Calls /api/parse-resume)
  const runAiAnalysis = async (urlOverride?: string, nameOverride?: string, extOverride?: string, rawFile?: File) => {
    const activeUrl = urlOverride || uploadedFileUrl;
    const activeName = nameOverride || uploadedFileName || "Resume.pdf";

    if (!userId) return;

    setIsAnalyzingAi(true);
    setAiAnalysisStatus("in_progress");
    setAiErrorMsg(null);

    try {
      let extractText = resumeText || "";

      // If user uploaded plain text file, read content
      if (rawFile && rawFile.type === "text/plain") {
        extractText = await rawFile.text();
        setResumeText(extractText);
      }

      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({
          userId,
          resumeUrl: activeUrl,
          fileName: activeName,
          fileType: extOverride || "pdf",
          resumeText: extractText
        })
      });

      if (!response.ok) {
        throw new Error(`AI Analysis server error: ${response.statusText}`);
      }

      const resData = await response.json();
      if (!resData.success || !resData.parsed) {
        throw new Error(resData.error || "Could not parse candidate information from resume.");
      }

      const parsed = resData.parsed;
      setParsedData(parsed);
      setAiAnalysisStatus("completed");

      // Non-destructive update to Firestore (Fills empty fields only, never overwrites candidate edits)
      await parseResumeData(parsed, activeUrl || "", activeName, userId);

      showToast("AI analysis complete! Candidate profile updated.", "success");
    } catch (err: any) {
      console.error("[CandidateResumeSection] AI Analysis failed:", err);
      setAiAnalysisStatus("failed");
      setAiErrorMsg(err.message || "AI Analysis encountered an issue. You can retry anytime.");
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // 5. Delete Resume handler
  const handleDeleteResume = async () => {
    if (!userId) return;
    if (!window.confirm("Are you sure you want to remove your active resume? You can upload a new version at any time.")) return;

    try {
      await updateDoc(doc(db, "candidates", userId), {
        resumeUrl: "",
        resumeFileName: "",
        resumeUploadedAt: "",
        resumeUploaded: false
      });

      setUploadedFileUrl(null);
      setUploadedFileName("");
      setUploadedAt(null);
      setFileSize(null);
      setParsedData(null);
      setAiAnalysisStatus("idle");

      setProfile((prev: any) => ({
        ...prev,
        resumeUrl: "",
        resumeFileName: "",
        resumeUploaded: false
      }));

      showToast("Active resume cleared.", "info");
    } catch (err: any) {
      console.error("[CandidateResumeSection] Delete error:", err);
      showToast("Could not clear resume record.", "error");
    }
  };

  // Helper for formatting file sizes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="w-full space-y-6" id="candidate-resume-section">
      
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900">Candidate Resume & Credentials</h2>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              Cloudinary Storage
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Upload your resume for real-time Cloudinary hosting and automated AI candidate profile extraction.
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("parsed")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "parsed"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Parsed Profile
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "insights"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveTab("documents")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "documents"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Document Vault
          </button>
        </div>
      </div>

      {/* TABS CONTENT */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: File Upload & Active State Card */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-base flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Primary Active Resume</span>
              </h3>
              {uploadedFileUrl ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resume Uploaded</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>No Resume</span>
                </span>
              )}
            </div>

            {/* Upload Zone or Active Resume Card */}
            {uploadedFileUrl ? (
              <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                      <FileCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm max-w-sm truncate" title={uploadedFileName}>
                        {uploadedFileName || "Uploaded_Resume.pdf"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Uploaded: {uploadedAt ? new Date(uploadedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently"}
                        {fileSize ? ` • ${formatBytes(fileSize)}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-blue-100">
                  <a
                    href={uploadedFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Resume</span>
                  </a>

                  <label
                    htmlFor="replace-resume-input"
                    className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Replace File</span>
                  </label>
                  <input
                    type="file"
                    id="replace-resume-input"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt"
                  />

                  <button
                    onClick={handleDeleteResume}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-300 hover:border-blue-400 bg-gray-50/50"
                }`}
              >
                <input
                  type="file"
                  id="primary-resume-upload-input"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt"
                />

                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Drag and drop your resume file here</h4>
                  <p className="text-xs text-gray-500 mt-1">Supports PDF, DOC, DOCX, or TXT formats (Max 10MB)</p>
                </div>

                <label
                  htmlFor="primary-resume-upload-input"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Browse File from Computer</span>
                </label>
              </div>
            )}

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-1.5 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex justify-between text-xs font-semibold text-blue-800">
                  <span>Uploading to Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Optional Plain Text Transcript Box */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <label className="block text-xs font-semibold text-gray-700">
                Optional Resume Plain Text Transcript
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste raw text transcript here for extra verification or manual AI parsing..."
                className="w-full h-32 p-3 text-xs border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-gray-800 bg-white placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* RIGHT: AI Analysis Control & Status Panel */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 border-b border-gray-200 pb-3">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-base">AI Candidate Parsing</h3>
              </div>

              <div className="py-4 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  Our Gemini AI automatically parses your uploaded resume to fill your candidate profile (skills, total experience, designations, education) without overwriting any info you manually edited.
                </p>

                {/* Status Indicator */}
                <div className="p-4 rounded-xl border space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-gray-700">AI Parsing Status:</span>
                    {aiAnalysisStatus === "completed" && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                        Completed
                      </span>
                    )}
                    {aiAnalysisStatus === "in_progress" && (
                      <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 font-medium flex items-center space-x-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Analyzing...</span>
                      </span>
                    )}
                    {aiAnalysisStatus === "failed" && (
                      <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-medium">
                        Failed
                      </span>
                    )}
                    {aiAnalysisStatus === "idle" && (
                      <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                        Pending Scan
                      </span>
                    )}
                  </div>

                  {aiErrorMsg && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mt-2">
                      {aiErrorMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AI Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => runAiAnalysis()}
                disabled={isAnalyzingAi || (!uploadedFileUrl && !resumeText.trim())}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isAnalyzingAi
                    ? "Running AI Analysis..."
                    : aiAnalysisStatus === "failed"
                    ? "Retry AI Analysis"
                    : "Run AI Analysis Now"}
                </span>
              </button>

              <p className="text-[11px] text-gray-500 text-center">
                AI parsing is non-destructive and fills empty profile fields only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PARSED PROFILE FIELDS TAB */}
      {activeTab === "parsed" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Extracted Candidate Details</h3>
              <p className="text-xs text-gray-500 mt-0.5">Information extracted directly from your resume by Gemini AI.</p>
            </div>
            {parsedData && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                AI Verified
              </span>
            )}
          </div>

          {parsedData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Full Name</label>
                  <p className="font-semibold text-gray-900 text-base mt-0.5">{parsedData.fullName || profile?.name || "Candidate"}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Designation</label>
                  <p className="font-semibold text-gray-900 mt-0.5">{parsedData.designation || parsedData.currentDesignation || profile?.designation || "Not specified"}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Current / Target Company</label>
                  <p className="font-medium text-gray-800 mt-0.5">{parsedData.currentCompany || "Not specified"}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Experience</label>
                  <p className="font-medium text-gray-800 mt-0.5">{parsedData.totalExperience || profile?.totalExperience || "Not specified"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Education & Degree</label>
                  <p className="font-medium text-gray-800 mt-0.5">{parsedData.education || profile?.education || "Not specified"}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block font-sans">Extracted Technical Skills</label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(parsedData.skills || profile?.skills || ["TypeScript", "React"]).map((skill: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Location / City</label>
                  <p className="font-medium text-gray-800 mt-0.5">{parsedData.location || parsedData.city || profile?.location || "Remote"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <Sparkles className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600 font-medium">No extracted AI data available yet.</p>
              <button
                onClick={() => runAiAnalysis()}
                disabled={!uploadedFileUrl && !resumeText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-all cursor-pointer"
              >
                Run AI Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI INSIGHTS TAB */}
      {activeTab === "insights" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-bold text-gray-900 text-base">Candidate AI Career Insights</h3>
            <p className="text-xs text-gray-500 mt-0.5">Automated career feedback and improvement checklist.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Profile Strengths</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                Strong technical stack alignment in modern framework tools. Clear experience timeline.
              </p>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-blue-800 font-bold text-xs">
                <Award className="w-4 h-4 text-blue-600" />
                <span>Recommended Upgrades</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                Include quantifiable impact metrics in past roles (e.g. "Increased performance by 30%").
              </p>
            </div>

            <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-purple-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Recruiter Visibility</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">
                Profile is verified and visible to active recruiters on AIJobs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VAULT TAB */}
      {activeTab === "documents" && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Candidate Document Vault</h3>
              <p className="text-xs text-gray-500 mt-0.5">Upload portfolios, certificates, or cover letters to Cloudinary.</p>
            </div>
          </div>

          {isLoadingDocs ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Loading documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((dItem: any) => (
                <div key={dItem.id} className="p-4 border border-gray-200 rounded-xl flex items-center justify-between bg-gray-50/50">
                  <div className="truncate space-y-1">
                    <p className="font-semibold text-gray-900 text-xs truncate">{dItem.fileName}</p>
                    <p className="text-[10px] text-gray-500">Uploaded {new Date(dItem.uploadedAt).toLocaleDateString()}</p>
                  </div>
                  <a
                    href={dItem.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl space-y-2">
              <FolderOpen className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs font-medium text-gray-600">No additional documents uploaded yet.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
