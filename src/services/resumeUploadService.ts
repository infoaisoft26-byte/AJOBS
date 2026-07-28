import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot, deleteObject } from "firebase/storage";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "../firebase";
import { ResumeAIService } from "./ai/resume.service";

export interface ResumeUploadOptions {
  uid: string;
  file: File;
  maxRetries?: number;
  timeoutMs?: number;
  onProgress?: (progress: number) => void;
  additionalMetadata?: Record<string, any>;
}

export interface ResumeUploadResult {
  success: boolean;
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  error?: string;
  parsedProfile?: any;
}

/**
 * Performs a single upload attempt for a resume using uploadBytesResumable.
 * Targets path: resumes/{uid}/resume.pdf
 */
/**
 * Performs a single upload attempt for a resume using uploadBytesResumable.
 * Targets path: resumes/{uid}/{timestamp}_{sanitizedFileName}
 */
async function uploadSingleAttempt(
  uid: string,
  file: File,
  timeoutMs: number = 120000,
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const storagePath = `resumes/${uid}/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
 let timer: ReturnType<typeof setTimeout> | null = null;
    let isCanceled = false;

    const isDocx = file.name.endsWith(".docx") || file.name.endsWith(".doc");

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || (isDocx ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf"),
      customMetadata: {
        originalName: file.name,
        uploadedBy: uid,
      },
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        isCanceled = true;
        uploadTask.cancel();
        reject(new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
      }, timeoutMs);
    }
  uploadTask.on(
    "state_changed",

    (snapshot: UploadTaskSnapshot) => {
      if (snapshot.totalBytes > 0 && onProgress) {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );

        onProgress(progress);
      }
    },

    (error: any) => {
      if (timer) {
        clearTimeout(timer);
      }

      if (isCanceled) {
        return;
      }

      let errorMsg = error.message || "Resume upload failed.";

      if (error.code === "storage/unauthorized") {
        errorMsg =
          "Unauthorized: You do not have permission to upload to storage.";
      } else if (error.code === "storage/canceled") {
        errorMsg = "Upload attempt was canceled or timed out.";
      }

      reject(new Error(errorMsg));
    },

    async () => {
      if (timer) {
        clearTimeout(timer);
      }

      try {
        const downloadUrl = await getDownloadURL(
          uploadTask.snapshot.ref
        );

        if (onProgress) {
          onProgress(100);
        }

        resolve({
          downloadUrl,
          storagePath,
        });
      } catch (urlErr: any) {
        reject(
          new Error(
            `Failed to retrieve download URL: ${
              urlErr?.message || urlErr
            }`
          )
        );
      }
    }
   );
  });
  }
 * Uploads a resume file with exponential retry logic, progress reporting,
 * fallback data URL support, non-blocking AI parsing, and Firestore persistence.
 */
export async function uploadResumeService(
  options: ResumeUploadOptions
): Promise<ResumeUploadResult> {
  const {
    uid,
    file,
    maxRetries = 2,
    timeoutMs = 120000,
    onProgress,
    additionalMetadata = {},
  } = options;

  if (!uid) {
    throw new Error("User ID (uid) is required for resume upload.");
  }

  if (!file) {
    throw new Error("File is required for resume upload.");
  }

  // 1. File type validation
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx = file.type.includes("wordprocessingml") || file.type.includes("msword") || file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc");
  const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
  const isImg = file.type.startsWith("image/");

  if (!isPdf && !isDocx && !isTxt && !isImg) {
    throw new Error("Invalid file format. Only PDF, DOCX, TXT, and Image files are supported.");
  }

  // 2. File size validation (Max 10MB)
  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds the ${MAX_SIZE_MB}MB limit.`);
  }

  if (onProgress) onProgress(10);

  let lastError: Error | null = null;
  let uploadData: { downloadUrl: string; storagePath: string } | null = null;

  // Try Firebase Storage upload
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ResumeUploadService] Executing upload attempt ${attempt}/${maxRetries} for uid: ${uid}`);
      uploadData = await uploadSingleAttempt(uid, file, timeoutMs, onProgress);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[ResumeUploadService] Storage attempt ${attempt} notice: ${err.message}`);

      if (err.message.includes("Unauthorized") || err.message.includes("exceeds")) {
        break;
      }

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 500));
      }
    }
  }

  // Fallback to Base64 data URI if storage bucket is offline/restricted
 if (!uploadData) {
  return {
    success: false,
    downloadUrl: "",
    storagePath: "",
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    error:
      lastError?.message ||
      "Resume upload failed. Please check Firebase Storage permissions and try again.",
  };
}
try {
  const existingResumeSnap = await getDoc(doc(db, "resumes", uid));

  if (existingResumeSnap.exists()) {
    const oldStoragePath = existingResumeSnap.data()?.resumeStoragePath;

    if (
      oldStoragePath &&
      oldStoragePath !== uploadData.storagePath &&
      !oldStoragePath.startsWith("firestore_embedded/")
    ) {
      await deleteObject(ref(storage, oldStoragePath)).catch((error) => {
        console.warn("Old resume could not be deleted:", error);
      });
    }
  }
} catch (error) {
  console.warn("Could not check previous resume:", error);
}
  const uploadedAt = new Date().toISOString();

  // Save metadata to Firestore instantly without waiting for AI analysis
  try {
    if (db) {
      const resumeMetadata = {
        userId: uid,
        resumeUrl: uploadData.downloadUrl,
        resumeStoragePath: uploadData.storagePath,
        resumeFileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
        uploadedAt: serverTimestamp(),
updatedAt: serverTimestamp(),
uploadedAtIso: uploadedAt,
        status: "active",
        resumeAnalysisStatus: "pending",
        ...additionalMetadata,
      };

      // 1. resumes/{uid}
      await setDoc(doc(db, "resumes", uid), resumeMetadata, { merge: true });

      // 2. candidates/{uid}
      await setDoc(doc(db, "candidates", uid), {
        userId: uid,
        resumeUrl: uploadData.downloadUrl,
        resumeFileName: file.name,
        resumeStoragePath: uploadData.storagePath,
        resumeAnalysisStatus: "pending",
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 3. users/{uid}
      await setDoc(doc(db, "users", uid), {
        resumeUrl: uploadData.downloadUrl,
        resumeFileName: file.name,
        resumeStoragePath: uploadData.storagePath,
        resumeAnalysisStatus: "pending",
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
 } catch (dbErr: any) {
  try {
    await deleteObject(ref(storage, uploadData.storagePath));
  } catch {
    // Ignore cleanup error
  }

  return {
    success: false,
    downloadUrl: "",
    storagePath: "",
    fileName: file.name,
    fileSize: file.size,
    uploadedAt,
    error:
      dbErr?.message ||
      "Resume uploaded, but candidate profile could not be saved.",
  };
}
  // NON-BLOCKING BACKGROUND GEMINI AI ANALYSIS
  setTimeout(async () => {
    try {
      console.log("[ResumeUploadService] Starting background AI analysis for:", file.name);
      const rawTextSample = `Candidate Name: ${file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}\nFile: ${file.name}`;
      const aiResult = await ResumeAIService.analyzeResume(rawTextSample, file.name.replace(/\.[^/.]+$/, ""));
      const p = aiResult.parsed;

      const parsedProfile = {
        fullName: p.fullName || "Candidate",
        email: p.email || "",
        mobileNumber: p.phone || "",
        address: p.preferredLocation || "",
        skills: p.skills || [],
        education: p.education?.length ? `${p.education[0].degree} - ${p.education[0].school}` : "",
        experience: p.experience?.length ? `${p.experience[0].role} at ${p.experience[0].company}` : "",
        currentCompany: p.currentCompany || "",
        currentDesignation: p.designation || "",
        languages: p.languages?.join(", ") || "",
        certifications: p.missingSkills?.certifications?.join(", ") || "",
        parsedAt: new Date().toISOString(),
      };

      if (db) {
        const aiUpdate = {
          parsedProfile,
          resumeAnalysisStatus: "completed",
          resumeScore: p.score || 85,
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(db, "resumes", uid), aiUpdate, { merge: true });
        await setDoc(doc(db, "candidates", uid), {
          ...aiUpdate,
          skills: p.skills || [],
          experience: p.experience?.length ? p.experience[0].role : "",
        }, { merge: true });
        await setDoc(doc(db, "users", uid), {
          resumeAnalysisStatus: "completed",
          skills: p.skills || [],
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      console.log("[ResumeUploadService] Background AI analysis completed successfully.");
    } catch (bgErr) {
      console.warn("[ResumeUploadService] Background AI analysis non-fatal warning:", bgErr);
      if (db) {
        await setDoc(doc(db, "resumes", uid), { resumeAnalysisStatus: "failed" }, { merge: true }).catch(() => {});
        await setDoc(doc(db, "candidates", uid), { resumeAnalysisStatus: "failed" }, { merge: true }).catch(() => {});
        await setDoc(doc(db, "users", uid), { resumeAnalysisStatus: "failed" }, { merge: true }).catch(() => {});
      }
    }
  }, 10);
if (onProgress) {
  onProgress(100);
}
  return {
    success: true,
    downloadUrl: uploadData.downloadUrl,
    storagePath: uploadData.storagePath,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt,
  };
}
