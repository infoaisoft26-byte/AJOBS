import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

const MAX_JD_SIZE = 10 * 1024 * 1024;
const ALLOWED_JD_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export interface UploadedJobDescription {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
}

export function validateJobDescriptionFile(file: File) {
  if (!ALLOWED_JD_TYPES.has(file.type)) {
    throw new Error("Upload the full JD as PDF, DOC, DOCX or TXT only.");
  }
  if (file.size > MAX_JD_SIZE) {
    throw new Error("The JD file must be 10 MB or smaller.");
  }
}

export async function uploadJobDescription(userId: string, file: File): Promise<UploadedJobDescription> {
  validateJobDescriptionFile(file);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
  const storagePath = `job_descriptions/${userId}/${Date.now()}_${safeName}`;
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, file, {
    contentType: file.type,
    customMetadata: { ownerUid: userId, documentType: "job_description" },
  });
  return {
    url: await getDownloadURL(objectRef),
    fileName: file.name.slice(0, 180),
    contentType: file.type,
    size: file.size,
    storagePath,
  };
}
