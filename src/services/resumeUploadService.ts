import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import { normalizeRole } from "../utils/roleUtils";
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

function stripUndefined(value: any): any {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map(stripUndefined);
  }
  if (value && typeof value === "object") {
    const cleaned: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) cleaned[key] = stripUndefined(item);
    }
    return cleaned;
  }
  return value;
}

function storageErrorMessage(error: any) {
  const code = String(error?.code || "");
  if (code.includes("storage/unauthorized")) {
    return "Firebase Storage rejected the resume upload. Candidate storage permissions need to be refreshed.";
  }
  if (code.includes("storage/canceled")) return "Resume upload was canceled before completion.";
  if (code.includes("storage/retry-limit-exceeded")) return "Resume upload timed out. Please retry on a stable connection.";
  if (code.includes("storage/quota-exceeded")) return "Resume storage quota is currently unavailable.";
  return error?.message || code || "Firebase Storage upload failed.";
}

async function assertCandidateAccount(uid: string) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error("Your login session could not be verified. Please sign in again before uploading the resume.");
  }

  try {
    await currentUser.getIdToken(true);
  } catch {
    throw new Error("Your login session expired. Please sign in again before uploading the resume.");
  }

  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.exists()) {
    const userData = userSnap.data();
    const storedRole = normalizeRole(userData?.role);
    if (storedRole === "candidate") return userData;
    if (storedRole) {
      throw new Error("Resume upload is available only from a Candidate account. Please use the correct AIJOBS portal.");
    }
  }

  // Older candidate registrations can have a candidate profile while their users/{uid}
  // role is missing. Accept only the authenticated user's own candidate record and still
  // reject any explicit non-candidate role above.
  const candidateSnap = await getDoc(doc(db, "candidates", uid));
  if (candidateSnap.exists()) {
    const candidateData = candidateSnap.data();
    const candidateRole = normalizeRole(candidateData?.role);
    if (!candidateRole || candidateRole === "candidate") {
      return { ...candidateData, role: "candidate" };
    }
  }

  throw new Error("Candidate profile not found. Please complete candidate registration before uploading a resume.");
}

async function uploadResumeToFirebase(
  file: globalThis.File,
  uid: string,
  onProgress?: (progress: number) => void,
  timeoutMs: number = 120000
): Promise<CloudinaryUploadResult> {
  const currentUser = auth.currentUser;
  if (!storage || !currentUser || currentUser.uid !== uid) {
    throw new Error("Secure resume storage is unavailable. Please sign in again and retry.");
  }

  // Force a fresh Firebase Auth token before Storage evaluates owner-only rules.
  await currentUser.getIdToken(true);

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
  let requestedUid = "";
  let onProgress: ((progress: number) => void) | undefined;
  let maxRetries = 2;
  let timeoutMs = 120000;
  let additionalMetadata: Record<string, any> = {};

  const looksLikeFile = Boolean(
    fileOrOptions &&
    typeof (fileOrOptions as any).name === "string" &&
    typeof (fileOrOptions as any).slice === "function"
  );

  if (looksLikeFile) {
    file = fileOrOptions as File;
    requestedUid = maybeOptions?.uid || maybeOptions?.userId || "";
    onProgress = maybeOptions?.onProgress;
    maxRetries = maybeOptions?.maxRetries ?? 2;
    timeoutMs = maybeOptions?.timeoutMs ?? 120000;
    additionalMetadata = maybeOptions?.additionalMetadata || {};
  } else {
    const opts = fileOrOptions as ResumeUploadOptions;
    file = opts.file;
    requestedUid = opts.uid || "";
    onProgress = opts.onProgress;
    maxRetries = opts.maxRetries ?? 2;
    timeoutMs = opts.timeoutMs ?? 120000;
    additionalMetadata = opts.additionalMetadata || {};
  }

  // Firebase Auth is the source of truth. Profile props can be stale after role/login migrations.
  const authUid = auth.currentUser?.uid || "";
  const uid = authUid || requestedUid;
  if (!uid) {
    throw new Error("Your login session could not be verified. Please sign in again before uploading the resume.");
  }
  if (authUid && requestedUid && authUid !== requestedUid) {
    console.warn("[ResumeUploadService] Ignoring stale profile UID and using the authenticated Candidate UID.");
  }

  const candidateProfile = await assertCandidateAccount(uid);

  if (!file) throw new Error("File is required for resume upload.");

  const fileNameLower = file.name.toLowerCase();
  const fileType = String(file.type || "").toLowerCase();
  const isPdf = fileType === "application/pdf" || fileNameLower.endsWith(".pdf");
  const isDoc = fileType.includes("wordprocessingml") || fileType.includes("msword") || fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc");
  const isTxt = fileType === "text/plain" || fileNameLower.endsWith(".txt");
  const isRtf = fileType === "application/rtf" || fileType === "text/rtf" || fileNameLower.endsWith(".rtf");

  if (!isPdf && !isDoc && !isTxt && !isRtf) {
    throw new Error("Invalid file format. Please upload a PDF, DOC, DOCX, RTF, or TXT file.");
  }

  const MAX_SIZE_MB = 10;
  if (file.size <= 0) throw new Error("The selected resume file is empty.");
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_SIZE_MB}MB.`);
  }

  onProgress?.(0);

  let uploaded: CloudinaryUploadResult;
  let provider = "cloudinary";
  let cloudinaryFailure = "";

  // Candidate resumes use the authenticated, server-signed Cloudinary flow first.
  // This avoids long Firebase Storage stalls while preserving Firebase as a backup.
  try {
    console.log(`[ResumeUploadService] Uploading "${file.name}" to signed Cloudinary storage for ${uid}`);
    uploaded = await uploadToCloudinary(file, {
      userId: uid,
      assetType: "resumes",
      maxRetries,
      timeoutMs: Math.min(timeoutMs, 60000),
      onProgress: (percent) => onProgress?.(normalizeProgress(percent))
    });
  } catch (cloudinaryError: any) {
    provider = "firebase_storage";
    cloudinaryFailure = cloudinaryError?.message || "Cloudinary upload failed.";
    console.warn("[ResumeUploadService] Cloudinary unavailable; falling back to Firebase Storage:", cloudinaryFailure);

    try {
      uploaded = await uploadResumeToFirebase(file, uid, onProgress, Math.min(timeoutMs, 60000));
    } catch (firebaseError: any) {
      const firebaseFailure = storageErrorMessage(firebaseError);
      console.error("[ResumeUploadService] All resume upload providers failed", {
        cloudinary: cloudinaryFailure,
        firebase: firebaseFailure
      });
      throw new Error(`Resume upload failed. Primary upload failed: ${cloudinaryFailure} Backup storage failed: ${firebaseFailure}`);
    }
  }

  const uploadedAt = new Date().toISOString();
  const downloadUrl = uploaded.secure_url;
  const publicId = uploaded.public_id || "";
  const assetId = uploaded.asset_id || "";
  const currentUser = auth.currentUser;
  const verifiedEmail = currentUser?.email || candidateProfile?.email || additionalMetadata.accountEmail || "";
  const isEmailVerified = currentUser?.emailVerified ?? candidateProfile?.emailVerified ?? false;

  if (!downloadUrl) throw new Error("Resume was uploaded but a secure download URL was not returned.");

  const resumeMetadata = stripUndefined({
    ...additionalMetadata,
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
    resumeAnalysisStatus: "pending"
  });

  const candidateMetadata = stripUndefined({
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
    updatedAt: uploadedAt
  });

  const userMetadata = stripUndefined({
    uid,
    resumeUrl: downloadUrl,
    resumeURL: downloadUrl,
    resumePublicId: publicId,
    resumeFileName: file.name,
    resumeStoragePath: publicId,
    resumeUploaded: true,
    resumeUploadedAt: uploadedAt,
    resumeAnalysisStatus: "pending",
    updatedAt: uploadedAt
  });

  const metadataWrites = await Promise.allSettled([
    setDoc(doc(db, "resumes", uid), resumeMetadata, { merge: true }),
    setDoc(doc(db, "candidates", uid), candidateMetadata, { merge: true }),
    setDoc(doc(db, "users", uid), userMetadata, { merge: true })
  ]);

  const successfulWrites = metadataWrites.filter((result) => result.status === "fulfilled").length;
  if (successfulWrites === 0) {
    const firstFailure = metadataWrites.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
    const reason = firstFailure?.reason?.message || "Candidate profile metadata could not be saved.";
    throw new Error(`Resume file uploaded, but profile sync failed: ${reason}`);
  }
  if (successfulWrites < metadataWrites.length) {
    console.warn("[ResumeUploadService] Resume uploaded; one or more secondary profile sync writes were skipped.");
  }

  // Parsing must never block the upload success state.
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
    uploadedAt
  };
}
