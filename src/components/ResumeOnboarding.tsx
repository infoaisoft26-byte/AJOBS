import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle2, Sparkles, AlertTriangle, FileText, RefreshCw, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { auth, storage, db } from "../firebase";
import { useToast } from "./GlobalToast";

interface ResumeOnboardingProps {
  user: any;
  setUser: (user: any) => void;
  setActiveView: (view: string) => void;
}

export default function ResumeOnboarding({ user, setUser, setActiveView }: ResumeOnboardingProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attemptNum, setAttemptNum] = useState(1);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      await processResumeFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await processResumeFile(file);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.includes(",") ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const formatStorageError = (err: any): string => {
    console.error("[ResumeOnboarding] Firebase Storage exact error:", err);
    if (!err) return "An unknown upload error occurred.";
    const code = err.code || "";
    const msg = String(err.message || err);

    if (code === "storage/unauthorized") {
      return "Unauthorized: You do not have permission to upload files to storage/unauthorized.";
    } else if (code === "storage/canceled") {
      return "Upload was canceled or timed out.";
    } else if (code === "storage/unknown") {
      return "An unknown storage error occurred on Firebase (storage/unknown).";
    } else if (msg.includes("CORS") || msg.includes("Failed to fetch") || msg.includes("network")) {
      return "Network or CORS error. Please check your internet connection.";
    }
    return msg || "Resume upload failed. Please try again.";
  };

  /**
   * Performs a single upload attempt using uploadBytesResumable with a 60-second timeout.
   */
  const uploadSingleAttempt = (storageRef: any, file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || "application/pdf"
      });

      // 60-second timeout guard
      const timeoutTimer = setTimeout(() => {
        console.warn("[ResumeOnboarding] Upload timed out after 60 seconds. Canceling task...");
        uploadTask.cancel();
        reject(new Error("Upload timed out after 60 seconds. Please check your network connection."));
      }, 60000);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            // Cap visual progress at 95% until final URL retrieval
            setProgress(Math.min(95, Math.max(1, pct)));
          }
        },
        (err) => {
          clearTimeout(timeoutTimer);
          reject(err);
        },
        async () => {
          clearTimeout(timeoutTimer);
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });
  };

  /**
   * Retries upload up to maxRetries (3) times automatically.
   */
  const uploadWithRetries = async (storageRef: any, file: File, maxRetries = 3): Promise<string> => {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setAttemptNum(attempt);
        if (attempt > 1) {
          setStep(`Connection retry (attempt ${attempt}/${maxRetries})...`);
        }
        console.log(`[ResumeOnboarding] Executing upload attempt ${attempt}/${maxRetries}...`);
        const url = await uploadSingleAttempt(storageRef, file);
        return url;
      } catch (err: any) {
        lastErr = err;
        console.error(`[ResumeOnboarding] Attempt ${attempt} error:`, err);
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 1200));
        }
      }
    }
    throw lastErr;
  };

  const processResumeFile = async (fileToProcess?: File) => {
    const file = fileToProcess || selectedFile;
    if (!file) {
      fileInputRef.current?.click();
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit
    if (file.size > maxSizeBytes) {
      const sizeErr = "File size exceeds 10MB limit. Please upload a smaller resume file.";
      setError(sizeErr);
      showToast(sizeErr, "error");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain"
    ];
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isWord = fileExt === "docx" || fileExt === "doc";

    if (!allowedTypes.includes(file.type) && !isWord) {
      const formatErr = "Unsupported file format. Please upload PDF, DOC, DOCX, or TXT formats.";
      setError(formatErr);
      showToast(formatErr, "error");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setStep("Uploading resume to secure Firebase Storage...");

    try {
      const uid = user?.uid || auth.currentUser?.uid;
      if (!uid) {
        throw new Error("Authentication context missing. Please log in again.");
      }

      // Upload path: resumes/{uid}/resume.pdf
      const storagePath = `resumes/${uid}/resume.pdf`;
      const storageRef = ref(storage, storagePath);

      // Upload with 3 retries and 60s timeout
      const downloadURL = await uploadWithRetries(storageRef, file, 3);

      setStep("Reading document and analyzing with AI...");
      setProgress(96);

      // Base64 conversion if PDF
      let fileBase64 = "";
      if (file.type === "application/pdf") {
        try {
          fileBase64 = await convertToBase64(file);
        } catch (b64Err) {
          console.warn("[ResumeOnboarding] Base64 conversion warning:", b64Err);
        }
      }

      // Call server resume parser API
      let parseResult: any = null;
      try {
        const response = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: uid,
            resumeUrl: downloadURL,
            fileName: file.name,
            fileType: file.type,
            fileBase64: fileBase64 || undefined
          })
        });

        if (response.ok) {
          parseResult = await response.json();
        }
      } catch (pErr) {
        console.warn("[ResumeOnboarding] Resume parse endpoint notice:", pErr);
      }

      // Update Firestore user document: users/{uid}.resumeURL and users/{uid}.resumeUploaded = true
      const userDocRef = doc(db, "users", uid);
      const updateData = {
        resumeURL: downloadURL,
        resumeUploaded: true,
        profileCompleted: true,
        profileComplete: true,
        fullName: parseResult?.parsed?.fullName || user?.name || user?.fullName || "Candidate",
        name: parseResult?.parsed?.fullName || user?.name || "Candidate",
        phone: parseResult?.parsed?.phone || user?.phone || "",
        updatedAt: new Date().toISOString()
      };

      try {
        await updateDoc(userDocRef, updateData);
      } catch (dbErr) {
        console.warn("[ResumeOnboarding] updateDoc failed, falling back to setDoc merge:", dbErr);
        await setDoc(userDocRef, updateData, { merge: true });
      }

      setProgress(100);
      setStep("Resume uploaded successfully!");

      // Update parent user state
      const updatedUser = {
        ...user,
        ...updateData,
        resumeUrl: downloadURL
      };
      setUser(updatedUser);

      showToast("Resume uploaded successfully!", "success");

      // Redirect to candidate dashboard
      setTimeout(() => {
        window.history.pushState({}, "", "/candidate/dashboard");
        setActiveView("dashboard");
      }, 800);

    } catch (err: any) {
      const formattedErr = formatStorageError(err);
      setError(formattedErr);
      showToast(formattedErr, "error");
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (selectedFile) {
      processResumeFile(selectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-3xl py-16 flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
          Create Your Candidate Profile Instantly
        </h1>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Upload your resume and our Gemini AI engine will parse your skills, experiences, and details to activate your candidate dashboard in seconds.
        </p>
      </div>

      <div className="w-full glass border border-white/10 rounded-3xl p-8 bg-gray-950/40 relative overflow-hidden shadow-2xl">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-white font-mono animate-pulse">{step}</p>
              <p className="text-xs text-gray-400">
                {attemptNum > 1 ? `Retry Attempt ${attemptNum}/3 in progress...` : "Please do not close this window"}
              </p>
            </div>
            
            {/* Real Progress Bar */}
            <div className="w-full max-w-md bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-gray-400 font-mono font-bold">{progress}% Complete</p>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-red-950/40 border border-red-500/30 rounded-2xl space-y-3"
              >
                <div className="flex items-start space-x-3 text-xs text-red-300">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-red-200 block text-sm">Upload Failed</span>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Upload</span>
                  </button>
                </div>
              </motion.div>
            )}

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-4 ${
                isDragging 
                  ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]" 
                  : "border-white/10 hover:border-indigo-500/40 hover:bg-white/5"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.docx,.doc,.txt"
                className="hidden"
              />
              <div className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-indigo-400 transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : "Drag & drop your resume here, or click to browse"}
                </p>
                <p className="text-xs text-gray-400">Supports PDF, DOC, DOCX and TXT up to 10MB</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Account Email: <strong className="text-white">{user?.email || "Authenticated"}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Firebase Storage Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
