import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { uploadToCloudinary, CloudinaryUploadResult } from "./cloudinaryService";
import { parseResumeData } from "./aiParser";

export { parseResumeData };

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
  publicId?: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  error?: string;
  parsedProfile?: any;
}

/**
 * Uploads a resume to Cloudinary with real progress reporting (0% -> 100%),
 * automatically saves metadata to users/{uid}, candidates/{uid}, and resumes/{uid},
 * and performs non-blocking AI parsing to auto-populate the profile in Firestore.
 */
export async function uploadResumeService(
  options: ResumeUploadOptions
): Promise<ResumeUploadResult> {
  const {
    uid,
    file,
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
  const fileNameLower = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || fileNameLower.endsWith(".pdf");
  const isDoc = file.type.includes("wordprocessingml") || file.type.includes("msword") || fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc");
  const isTxt = file.type === "text/plain" || fileNameLower.endsWith(".txt");

  if (!isPdf && !isDoc && !isTxt) {
    throw new Error("Invalid file format. Please upload a PDF, DOC, DOCX, or TXT file.");
  }

  // 2. File size validation (Max 10MB)
  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_SIZE_MB}MB.`);
  }

  if (onProgress) onProgress(0);

  // 3. Upload file directly to Cloudinary
  let cloudinaryRes: CloudinaryUploadResult;
  try {
    console.log(`[ResumeUploadService] Uploading file "${file.name}" via Cloudinary for user: ${uid}`);
    cloudinaryRes = await uploadToCloudinary(file, (percent) => {
      if (onProgress) onProgress(percent);
    });
  } catch (err: any) {
    console.error("[ResumeUploadService] Cloudinary upload error:", err);
    throw new Error(err.message || "Failed to upload resume to Cloudinary. Please check your network and try again.");
  }

  const uploadedAt = new Date().toISOString();
  const downloadUrl = cloudinaryRes.secure_url;
  const publicId = cloudinaryRes.public_id;

  // 4. Save metadata to Firestore across users/{uid}, candidates/{uid}, and resumes/{uid}
  try {
    if (db) {
      const resumeMetadata = {
        userId: uid,
        resumeUrl: downloadUrl,
        resumePublicId: publicId,
        resumeStoragePath: publicId,
        resumeFileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
        uploadedAt,
        updatedAt: uploadedAt,
        status: "active",
        resumeAnalysisStatus: "pending",
        ...additionalMetadata,
      };

      // 1. resumes/{uid}
      await setDoc(doc(db, "resumes", uid), resumeMetadata, { merge: true });

      // 2. candidates/{uid}
      await setDoc(doc(db, "candidates", uid), {
        userId: uid,
        resumeUrl: downloadUrl,
        resumePublicId: publicId,
        resumeFileName: file.name,
        resumeStoragePath: publicId,
        resumeAnalysisStatus: "pending",
        updatedAt: uploadedAt,
      }, { merge: true });

      // 3. users/{uid}
      await setDoc(doc(db, "users", uid), {
        resumeUrl: downloadUrl,
        resumePublicId: publicId,
        resumeFileName: file.name,
        resumeStoragePath: publicId,
        resumeUploaded: true,
        resumeAnalysisStatus: "pending",
        updatedAt: uploadedAt,
      }, { merge: true });
    }
  } catch (dbErr: any) {
    console.warn(`[ResumeUploadService] Warning saving metadata to Firestore:`, dbErr?.message || dbErr);
  }

  // 5. Trigger automatic AI Parsing and update Firestore
  setTimeout(async () => {
    try {
      console.log("[ResumeUploadService] Triggering parseResumeData automatically upon successful Cloudinary upload...");
      await parseResumeData(downloadUrl, uid, file.name, file.type);
      console.log("[ResumeUploadService] Automatic parseResumeData completed successfully.");
    } catch (parseErr) {
      console.warn("[ResumeUploadService] Non-fatal background AI parsing notice:", parseErr);
    }
  }, 10);

  return {
    success: true,
    downloadUrl,
    storagePath: publicId,
    publicId,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt,
  };
}
