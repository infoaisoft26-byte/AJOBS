import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "../firebase";
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
  assetId?: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  error?: string;
  parsedProfile?: any;
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function uploadResumeToFirebase(
  file: globalThis.File,
  uid: string,
  onProgress?: (progress: number) => void,
  timeoutMs: number = 60000
): Promise<CloudinaryUploadResult> {
  const currentUser = auth.currentUser;
  if (!storage || !currentUser || currentUser.uid !== uid) {
    throw new Error("Secure resume storage is unavailable. Please sign in again and retry.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `resumes/${uid}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, storagePath);

  const snapshot = await new Promise<any>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "application/octet-stream",
      customMetadata: {
        candidateId: uid,
        originalFileName: file.name,
        accountEmail: currentUser.email || ""
      }
    });

    let settled = false;
    let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { task.cancel(); } catch (_) {}
      reject(new Error(`Firebase Storage upload timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);

    const finish = (cb: () => void) => {
      if (settled) return;
      settled = true;
      if (watchdog) clearTimeout(watchdog);
      watchdog = null;
      cb();
    };

    task.on(
      "state_changed",
      (state) => {
        if (state.totalBytes > 0) {
          const percent = normalizeProgress((state.bytesTransferred / state.totalBytes) * 100);
          onProgress?.(percent);
        }
      },
      (error) => finish(() => reject(error)),
      () => finish(() => resolve(task.snapshot))
    );
  });

  onProgress?.(100);

  return {
    secure_url: await getDownloadURL(snapshot.ref),
    public_id: storagePath,
    asset_id: storagePath,
    folder: `resumes/${uid}`,
    original_filename: file.name,
    format: file.name.split(".").pop()?.toLowerCase() || "",
    bytes: file.size,
    resource_type: "raw",
    created_at: new Date().toISOString()
  };
}

export async function uploadResumeService(
  fileOrOptions: File | ResumeUploadOptions,
  maybeOptions?: Partial<ResumeUploadOptions> & { userId?: string; userName?: string; userRole?: string }
): Promise<ResumeUploadResult> {
  let file: File;
  let uid: string;
  let onProgress: ((progress: number) => void) | undefined;
  let maxRetries = 2;
  let timeoutMs = 45000;
  let additionalMetadata: Record<string, any> = {};

  const looksLikeFile = Boolean(
    fileOrOptions &&
    typeof (fileOrOptions as any).name === "string" &&
    typeof (fileOrOptions as any).slice === "function"
  );

  if (looksLikeFile) {
    file = fileOrOptions as File;
    uid = maybeOptions?.uid || maybeOptions?.userId || auth.currentUser?.uid || "";
    onProgress = maybeOptions?.onProgress;
    maxRetries = maybeOptions?.maxRetries ?? 2;
    timeoutMs = maybeOptions?.timeoutMs ?? 45000;
    additionalMetadata = maybeOptions?.additionalMetadata || {};
  } else {
    const opts = fileOrOptions as ResumeUploadOptions;
    file = opts.file;
    uid = opts.uid || auth.currentUser?.uid || "";
    onProgress = opts.onProgress;
    maxRetries = opts.maxRetries ?? 2;
    timeoutMs = opts.timeoutMs ?? 45000;
    additionalMetadata = opts.additionalMetadata || {};
  }

  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error("Your login session could not be verified. Please sign in again before uploading the resume.");
  }

  if (!file) throw new Error("File is required for resume upload.");

  const fileNameLower = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || fileNameLower.endsWith(".pdf");
  const isDoc = file.type.includes("wordprocessingml") || file.type.includes("msword") || fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc");
  const isTxt = file.type === "text/plain" || fileNameLower.endsWith(".txt");
  const isRtf = file.type === "application/rtf" || file.type === "text/rtf" || fileNameLower.endsWith(".rtf");

  if (!isPdf && !isDoc && !isTxt && !isRtf) {
    throw new Error("Invalid file format. Please upload a PDF, DOC, DOCX, RTF, or TXT file.");
  }

  const MAX_SIZE_MB = 10;
  if (file.size <= 0) throw new Error("The selected resume file is empty.");
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_SIZE_MB}MB.`);
  }

  onProgress?.(0);

  // Signed-in candidates upload to Firebase Storage first. This avoids the old
  // Cloudinary request path that could sit at the UI's ~45% stage while waiting
  // for a signed upload response. Cloudinary remains a fallback provider.
  let uploaded: CloudinaryUploadResult;
  let provider = "firebase_storage";

  try {
    console.log(`[ResumeUploadService] Uploading "${file.name}" to Firebase Storage for ${uid}`);
    uploaded = await uploadResumeToFirebase(file, uid, onProgress, timeoutMs);
  } catch (firebaseError: any) {
    provider = "cloudinary";
    console.warn("[ResumeUploadService] Firebase Storage unavailable; falling back to Cloudinary:", firebaseError?.message || firebaseError);
    try {
      uploaded = await uploadToCloudinary(file, {
        userId: uid,
        assetType: "resumes",
        maxRetries,
        timeoutMs,
        onProgress: (percent) => onProgress?.(normalizeProgress(percent))
      });
    } catch (cloudinaryError: any) {
      console.error("[ResumeUploadService] All resume upload providers failed", {
        firebase: firebaseError?.message,
        cloudinary: cloudinaryError?.message
      });
      throw new Error(
        cloudinaryError?.message ||
        firebaseError?.message ||
        "Resume upload failed. Please check your connection and retry."
      );
    }
  }

  const uploadedAt = new Date().toISOString();
  const downloadUrl = uploaded.secure_url;
  const publicId = uploaded.public_id;
  const assetId = uploaded.asset_id || "";
  const currentUser = auth.currentUser;
  const verifiedEmail = currentUser?.email || additionalMetadata.accountEmail || "";
  const isEmailVerified = currentUser?.emailVerified ?? false;

  if (!downloadUrl) throw new Error("Resume was uploaded but a secure download URL was not returned.");

  try {
    const resumeMetadata = {
      resumeId: uid,
      candidateId: uid,
      ownerUid: uid,
      userId: uid,
      role: "candidate",
      accountEmail: verifiedEmail,
      email: verifiedEmail,
      emailVerified: isEmailVerified,
      uploadProvider: provider,
      cloudinaryPublicId: provider === "cloudinary" ? publicId : "",
      cloudinaryAssetId: provider === "cloudinary" ? assetId : "",
      cloudinaryResourceType: uploaded.resource_type || "raw",
      cloudinaryFormat: uploaded.format || fileNameLower.split(".").pop() || "",
      cloudinaryFolder: provider === "cloudinary" ? uploaded.folder || `aijobs/candidates/${uid}/resumes` : "",
      originalFileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedAt,
      updatedAt: uploadedAt,
      parseStatus: "pending",
      parsedData: {},
      candidateConfirmed: false,
      resumeUrl: downloadUrl,
      resumeURL: downloadUrl,
      resumePublicId: publicId,
      resumeStoragePath: publicId,
      resumeFileName: file.name,
      resumeUploaded: true,
      status: "active",
      resumeAnalysisStatus: "pending",
      ...additionalMetadata,
    };

    await Promise.all([
      setDoc(doc(db, "resumes", uid), resumeMetadata, { merge: true }),
      setDoc(doc(db, "candidates", uid), {
        uid,
        userId: uid,
        ownerUid: uid,
        role: "candidate",
        email: verifiedEmail,
        accountEmail: verifiedEmail,
        resumeUrl: downloadUrl,
        resumeURL: downloadUrl,
        resumePublicId: publicId,
        resumeFileName: file.name,
        resumeStoragePath: publicId,
        resumeUploaded: true,
        resumeUploadedAt: uploadedAt,
        resumeAnalysisStatus: "pending",
        updatedAt: uploadedAt,
      }, { merge: true }),
      setDoc(doc(db, "users", uid), {
        uid,
        role: "candidate",
        resumeUrl: downloadUrl,
        resumeURL: downloadUrl,
        resumePublicId: publicId,
        resumeFileName: file.name,
        resumeStoragePath: publicId,
        resumeUploaded: true,
        resumeUploadedAt: uploadedAt,
        resumeAnalysisStatus: "pending",
        updatedAt: uploadedAt,
      }, { merge: true })
    ]);
  } catch (dbErr: any) {
    // The file is already safely uploaded. Do not make the candidate re-upload
    // because a secondary metadata write failed; surface the uploaded URL and let
    // the UI continue while logging the database problem for admin diagnosis.
    console.warn("[ResumeUploadService] Resume uploaded but metadata sync had a warning:", dbErr?.message || dbErr);
  }

  // Parsing is deliberately background-only. A slow/failed AI parser must never
  // keep the upload progress spinner open.
  setTimeout(async () => {
    try {
      await parseResumeData(downloadUrl, uid, file.name, file.type);
    } catch (parseErr) {
      console.warn("[ResumeUploadService] Background resume parsing notice:", parseErr);
    }
  }, 0);

  onProgress?.(100);

  return {
    success: true,
    downloadUrl,
    storagePath: publicId,
    publicId,
    assetId,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt,
  };
}
