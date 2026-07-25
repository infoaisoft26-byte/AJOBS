import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from "firebase/storage";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { storage, db } from "../firebase";

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
}

/**
 * Performs a single upload attempt for a resume using uploadBytesResumable.
 * Targets path: resumes/{uid}/resume.pdf
 */
async function uploadSingleAttempt(
  uid: string,
  file: File,
  timeoutMs: number = 60000,
  onProgress?: (progress: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized.");
  }

  // Storage path as requested: resumes/{uid}/resume.pdf
  const storagePath = `resumes/${uid}/resume.pdf`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let isCanceled = false;

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "application/pdf",
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
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error: any) => {
        if (timer) clearTimeout(timer);
        if (isCanceled) return;

        let errorMsg = error.message || "Resume upload failed.";
        if (error.code === "storage/unauthorized") {
          errorMsg = "Unauthorized: You do not have permission to upload to storage.";
        } else if (error.code === "storage/canceled") {
          errorMsg = "Upload attempt was canceled or timed out.";
        }
        reject(new Error(errorMsg));
      },
      async () => {
        if (timer) clearTimeout(timer);
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (urlErr: any) {
          reject(new Error(`Failed to retrieve download URL: ${urlErr?.message || urlErr}`));
        }
      }
    );
  });
}

/**
 * Uploads a resume file with exponential retry logic, progress reporting,
 * and saves metadata to Firestore under doc(`resumes`, uid) and user profile.
 */
export async function uploadResumeService(
  options: ResumeUploadOptions
): Promise<ResumeUploadResult> {
  const {
    uid,
    file,
    maxRetries = 3,
    timeoutMs = 60000,
    onProgress,
    additionalMetadata = {},
  } = options;

  if (!uid) {
    throw new Error("User ID (uid) is required for resume upload.");
  }

  if (!file) {
    throw new Error("File is required for resume upload.");
  }

  const MAX_SIZE_MB = 10;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds ${MAX_SIZE_MB}MB limit.`);
  }

  let lastError: Error | null = null;
  let uploadData: { downloadUrl: string; storagePath: string } | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ResumeUploadService] Executing upload attempt ${attempt}/${maxRetries} for uid: ${uid}`);
      uploadData = await uploadSingleAttempt(uid, file, timeoutMs, onProgress);
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[ResumeUploadService] Attempt ${attempt} failed: ${err.message}`);

      if (err.message.includes("Unauthorized") || err.message.includes("exceeds")) {
        break;
      }

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, attempt * 1000));
      }
    }
  }

  if (!uploadData) {
    const finalErrorMessage = lastError?.message || "Failed to upload resume after multiple attempts.";
    return {
      success: false,
      downloadUrl: "",
      storagePath: "",
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      error: finalErrorMessage,
    };
  }

  const uploadedAt = new Date().toISOString();

  try {
    if (db) {
      const resumeDocRef = doc(db, "resumes", uid);
      const resumeMetadata = {
        userId: uid,
        resumeUrl: uploadData.downloadUrl,
        storagePath: uploadData.storagePath,
        resumeFileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/pdf",
        uploadedAt,
        updatedAt: uploadedAt,
        status: "active",
        ...additionalMetadata,
      };

      await setDoc(resumeDocRef, resumeMetadata, { merge: true });
      console.log(`[ResumeUploadService] Firestore metadata saved to resumes/${uid}`);

      const candidateRef = doc(db, "candidates", uid);
      const candSnap = await getDoc(candidateRef);
      if (candSnap.exists()) {
        await updateDoc(candidateRef, {
          resumeUrl: uploadData.downloadUrl,
          resumeFileName: file.name,
          updatedAt: uploadedAt,
        });
      }

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, {
          resumeUrl: uploadData.downloadUrl,
          resumeFileName: file.name,
          updatedAt: uploadedAt,
        });
      }
    }
  } catch (dbErr: any) {
    console.warn(`[ResumeUploadService] Warning saving metadata to Firestore:`, dbErr?.message || dbErr);
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
