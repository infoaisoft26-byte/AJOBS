import type { Request, Response } from "express";
import crypto from "crypto";
import { getFirebaseAuth } from "./firestoreHelper.js";

const ALLOWED_ASSET_TYPES = new Set(["resumes", "documents", "chat-attachments"]);
const ALLOWED_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function cloudinarySignature(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(payload + secret).digest("hex");
}

export async function handleCloudinarySignatureRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/cloudinary/signature" && path !== "/cloudinary/signature") return false;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Please sign in again before uploading secure documents." });
      return true;
    }

    const decoded = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim());
    const body: any = req.body || {};
    const userId = String(body.userId || decoded.uid || "").trim();
    const assetType = String(body.assetType || "resumes").trim();
    const fileType = String(body.fileType || "").trim().toLowerCase();

    if (!userId || userId !== decoded.uid) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "Upload account mismatch." });
      return true;
    }
    if (!ALLOWED_ASSET_TYPES.has(assetType)) {
      res.status(400).json({ success: false, error: "INVALID_ASSET_TYPE", message: "Unsupported upload asset type." });
      return true;
    }
    if (assetType === "documents") {
      if (!ALLOWED_DOCUMENT_TYPES.has(fileType)) {
        res.status(400).json({ success: false, error: "INVALID_DOCUMENT_TYPE", message: "Verification documents must be PDF, JPG, PNG or WEBP." });
        return true;
      }
      const db = getFirestoreDb();
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      const userData: any = userDoc.exists ? userDoc.data() || {} : {};
      const role = String(userData.role || decoded.role || "").toLowerCase();
      const isAuthorized = ["recruiter", "independent_recruiter", "consultancy", "agency", "employer", "admin", "super_admin"].includes(role);
      if (!isAuthorized) {
        const verifDoc = await db.collection("verification_requests").doc(`verif_${decoded.uid}`).get();
        if (!verifDoc.exists) {
          res.status(403).json({
            success: false,
            error: "UNAUTHORIZED_DOCUMENT_UPLOADER",
            message: "KYC document signatures are restricted to authenticated recruiters and business entities."
          });
          return true;
        }
      }
    }

    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
    const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
    const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({
        success: false,
        error: "CLOUDINARY_SERVER_CONFIG_MISSING",
        message: "Secure document upload is temporarily unavailable. Cloudinary server credentials are not configured."
      });
      return true;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = assetType === "documents"
      ? `aijobs/verification/${decoded.uid}/documents`
      : assetType === "chat-attachments"
        ? `aijobs/chat/${decoded.uid}`
        : `aijobs/candidates/${decoded.uid}/resumes`;

    const signature = cloudinarySignature({ folder, timestamp }, apiSecret);
    res.json({ success: true, signature, timestamp, apiKey, cloudName, folder });
    return true;
  } catch (error: any) {
    const authError = String(error?.code || "").startsWith("auth/");
    res.status(authError ? 401 : 500).json({
      success: false,
      error: authError ? "UNAUTHORIZED" : "CLOUDINARY_SIGNATURE_FAILED",
      message: authError ? "Your login session expired. Please sign in again." : "Secure document upload is temporarily unavailable. Please try again."
    });
    return true;
  }
}
