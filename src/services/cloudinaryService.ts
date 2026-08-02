import { increment } from "firebase/firestore";
import { File, Network, Type, Upload } from "lucide-react";
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  asset_id?: string;
  folder?: string;
  original_filename: string;
  format?: string;
  bytes?: number;
  resource_type?: string;
  created_at?: string;
}

export interface CloudinaryUploadOptions {
  onProgress?: (percent: number) => void;
  maxRetries?: number;
  timeoutMs?: number;
  userId?: string;
  folder?: string;
  assetType?: "resumes" | "documents" | "chat-attachments";
}

export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "az2k99fv";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "aijobs_resumes";
  return { cloudName, uploadPreset };
}

/**
 * Uploads a file to Cloudinary with robust error handling, network timeout management,
 * progress tracking guarantees (preventing stall at 65%), and automatic exponential backoff retries.
 */
export async function uploadToCloudinary(
  file: File,
  onProgressOrOptions?: ((percent: number) => void) | CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  let onProgress: ((percent: number) => void) | undefined;
  let maxRetries = 3;
  let timeoutMs = 60000;
  let options: CloudinaryUploadOptions | undefined;

  if (typeof onProgressOrOptions === "function") {
    onProgress = onProgressOrOptions;
  } else if (onProgressOrOptions) {
    options = onProgressOrOptions;
    onProgress = onProgressOrOptions.onProgress;
    if (onProgressOrOptions.maxRetries !== undefined) maxRetries = onProgressOrOptions.maxRetries;
    if (onProgressOrOptions.timeoutMs !== undefined) timeoutMs = onProgressOrOptions.timeoutMs;
  }

  let attempt = 0;
  let lastError: Error = new Error("Upload failed to start.");

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (onProgress) onProgress(attempt === 1 ? 5 : Math.min(30, 10 * attempt));

      const result = await attemptSingleUpload(file, onProgress, timeoutMs, attempt, options);
      if (onProgress) onProgress(100);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[CloudinaryUpload] Attempt ${attempt}/${maxRetries} failed:`, err.message || err);

      // Don't retry if configuration or file format error
      if (err.message && (err.message.includes("configuration missing") || err.message.includes("Invalid upload preset"))) {
        throw err;
      }

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff: 1s, 2s...)
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }

  // Format final user-friendly error message
  const userFriendlyMessage = `Upload failed after ${maxRetries} attempts: ${lastError.message || "Network issue or Cloudinary service unavailable"}. Please check your connection and try uploading again.`;
  throw new Error(userFriendlyMessage);
}

async function attemptSingleUpload(
  file: File,
  onProgress?: (percent: number) => void,
  timeoutMs: number = 60000,
  attemptNumber: number = 1,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  // Fetch signed signature parameters from backend if possible
  let signedParams: { signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string } | null = null;
  try {
    const sigRes = await fetch("/api/cloudinary/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: options?.userId,
        folder: options?.folder,
        assetType: options?.assetType || "resumes",
        fileName: file.name,
        fileType: file.type
      })
    });
    if (sigRes.ok) {
      const data = await sigRes.json();
      if (data.signature) {
        signedParams = data;
      }
    }
  } catch (sigErr) {
    console.warn("[CloudinaryService] Signed signature endpoint notice:", sigErr);
  }

  return new Promise((resolve, reject) => {
    const { cloudName, uploadPreset } = getCloudinaryConfig();
    const effectiveCloudName = signedParams?.cloudName || cloudName;
    if (!effectiveCloudName) {
      return reject(new Error("Cloudinary configuration missing. Please verify cloudName in environment variables."));
    }

    const url = `https://api.cloudinary.com/v1_1/${effectiveCloudName}/auto/upload`;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);

    if (signedParams) {
      formData.append("api_key", signedParams.apiKey);
      formData.append("timestamp", String(signedParams.timestamp));
      formData.append("folder", signedParams.folder);
      formData.append("signature", signedParams.signature);
    } else {
      formData.append("upload_preset", uploadPreset);
      if (options?.folder) {
        formData.append("folder", options.folder);
      } else if (options?.userId) {
        const typeFolder = options.assetType || "resumes";
        formData.append("folder", `aijobs/candidates/${options.userId}/${typeFolder}`);
      }
    }

    let currentProgress = attemptNumber > 1 ? 15 : 5;
    let timer: any = null;

    // Smooth progress simulation timer to ensure progress bar never freezes or stalls at 65%
    if (onProgress) {
      onProgress(currentProgress);
      timer = setInterval(() => {
        if (currentProgress < 95) {
          // Increment progress smoothly, slowing down near 95%
          const increment = currentProgress < 60 ? 5 : currentProgress < 85 ? 3 : 1;
          currentProgress = Math.min(95, currentProgress + increment);
          onProgress(currentProgress);
        }
      }, 400);
    }

    const cleanup = () => {
      if (timer) clearInterval(timer);
    };

    xhr.open("POST", url, true);
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        const rawPercent = Math.round((e.loaded / e.total) * 98);
        if (rawPercent > currentProgress) {
          currentProgress = Math.min(98, rawPercent);
          if (onProgress) onProgress(currentProgress);
        }
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.secure_url) {
            resolve({
              secure_url: res.secure_url,
              public_id: res.public_id || "",
              asset_id: res.asset_id || "",
              folder: res.folder || (signedParams ? signedParams.folder : ""),
              original_filename: res.original_filename || file.name,
              format: res.format || "",
              bytes: res.bytes || file.size,
              resource_type: res.resource_type || "auto",
              created_at: res.created_at || new Date().toISOString(),
            });
          } else {
            reject(new Error(res.error?.message || "Cloudinary upload failed: Invalid response payload (missing secure_url)."));
          }
        } catch (e: any) {
          reject(new Error("Failed to parse Cloudinary response payload: " + e.message));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Cloudinary returned API status error ${xhr.status}.`));
        } catch (_) {
          reject(new Error(`Cloudinary returned HTTP status error ${xhr.status}.`));
        }
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network connection error during Cloudinary file upload."));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error(`Cloudinary upload request timed out after ${timeoutMs / 1000} seconds.`));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new Error("Cloudinary upload request was aborted."));
    };

    xhr.send(formData);
  });
}

