import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle2, Sparkles, AlertTriangle, FileText } from "lucide-react";
import { motion } from "motion/react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
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
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      await processResumeFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processResumeFile(file);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Strip out the data:application/pdf;base64, prefix
        resolve(base64String.split(",")[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const processResumeFile = async (file: File) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain"
    ];
    
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    const isWord = fileExt === "docx" || fileExt === "doc";
    
    if (!allowedTypes.includes(file.type) && !isWord) {
      setError("Unsupported file format. Please upload PDF, DOC, DOCX, or TXT formats.");
      showToast("Unsupported file format", "error");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStep("Uploading resume to secure Firebase Storage...");
    setProgress(25);

    try {
      const uid = user?.uid || auth.currentUser?.uid;
      if (!uid) {
        throw new Error("Authentication context missing. Please log in again.");
      }

      // 1. Upload file to Firebase Storage
      const timestamp = Date.now();
      const storagePath = `resumes/${uid}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      setStep("Reading document and analyzing with Gemini AI...");
      setProgress(60);

      // 2. Prepare fileBase64 if PDF
      let fileBase64 = "";
      if (file.type === "application/pdf") {
        fileBase64 = await convertToBase64(file);
      }

      // 3. Trigger backend resume parser API
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

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Automatic profile parsing failed.");
      }

      const parseResult = await response.json();
      setProgress(90);
      setStep("Synchronizing candidate workspace environments...");

      // 4. Update parent local user state
      const updatedUser = {
        ...user,
        fullName: parseResult.parsed?.fullName || user?.name || "Candidate",
        name: parseResult.parsed?.fullName || user?.name || "Candidate",
        phone: parseResult.parsed?.phone || user?.phone || "",
        profileComplete: true,
        profileCompleted: true,
        resumeUploaded: true,
        resumeUrl: downloadURL
      };

      setUser(updatedUser);
      showToast("Profile generated successfully!", "success");
      setProgress(100);

      // Redirect to candidate profile section
      setTimeout(() => {
        window.history.pushState({}, "", "/candidate/profile");
        setActiveView("dashboard");
      }, 1000);

    } catch (err: any) {
      console.error("[Onboarding] Resume parsing error:", err);
      setError(err.message || "Failed to parse resume automatically. Please try again.");
      showToast(err.message || "Failed to process resume", "error");
      setIsProcessing(false);
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
          Upload your resume and our server-side Gemini AI engine will parse your skills, experiences, and details to build your professional profile in seconds.
        </p>
      </div>

      <div className="w-full glass border border-white/10 rounded-3xl p-8 bg-gray-950/40 relative overflow-hidden shadow-2xl">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <div className="space-y-2 text-center">
              <p className="text-sm font-semibold text-white font-mono animate-pulse">{step}</p>
              <p className="text-xs text-gray-400">Please do not close this window</p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full max-w-md bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
            <p className="text-xs text-gray-500 font-mono">{progress}% Complete</p>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-950/30 border border-red-500/20 rounded-2xl flex items-start space-x-2 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
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
                <p className="text-sm font-semibold text-white">Drag & drop your resume here, or click to browse</p>
                <p className="text-xs text-gray-400">Supports PDF, DOC, DOCX and TXT up to 10MB</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Pre-filled Mobile: <strong className="text-white">{user?.phone || "None"}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified identity</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
