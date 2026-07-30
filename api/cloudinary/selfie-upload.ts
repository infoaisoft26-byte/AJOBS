import crypto from "crypto";
import {
  getFirebaseAuth,
  getFirestoreDb
} from "../../server/firestoreHelper";

const MAX_SELFIE_BYTES = 2 * 1024 * 1024;
const JPEG_DATA_URL_PREFIX = "data:image/jpeg;base64,";

type ApiError = Error & { statusCode?: number };

function fail(message: string, statusCode: number): never {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  throw error;
}

function getBearerToken(authorization: unknown): string {
  if (typeof authorization !== "string") {
    return "";
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function validateSelfieDataUrl(fileData: unknown): {
  dataUrl: string;
  bytes: number;
} {
  if (
    typeof fileData !== "string" ||
    !fileData.startsWith(JPEG_DATA_URL_PREFIX)
  ) {
    fail("Only a live camera JPEG image is accepted.", 400);
  }

  const base64 = fileData.slice(JPEG_DATA_URL_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    fail("The captured selfie payload is invalid.", 400);
  }

  const imageBuffer = Buffer.from(base64, "base64");
  if (imageBuffer.length === 0 || imageBuffer.length > MAX_SELFIE_BYTES) {
    fail("The selfie must be smaller than 2 MB.", 400);
  }

  const isJpeg =
    imageBuffer.length >= 3 &&
    imageBuffer[0] === 0xff &&
    imageBuffer[1] === 0xd8 &&
    imageBuffer[2] === 0xff;

  if (!isJpeg) {
    fail("The captured file is not a valid JPEG image.", 400);
  }

  return {
    dataUrl: fileData,
    bytes: imageBuffer.length
  };
}

function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string
): string {
  const valueToSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha256")
    .update(`${valueToSign}${apiSecret}`)
    .digest("hex");
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Only POST requests are allowed."
    });
  }

  try {
    const idToken = getBearerToken(req.headers?.authorization);
    if (!idToken) {
      fail("Authentication is required to submit a live selfie.", 401);
    }

    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken, true);
    const candidateId = decodedToken.uid;
    if (!candidateId) {
      fail("The authenticated candidate could not be identified.", 401);
    }

    const { dataUrl, bytes } = validateSelfieDataUrl(req.body?.fileData);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    const uploadPreset =
      process.env.CLOUDINARY_UPLOAD_PRESET?.trim() ||
      "aijobs_candidate_selfie";

    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
      fail("Cloudinary server configuration is incomplete.", 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const safeCandidateId = candidateId.replace(/[^A-Za-z0-9_-]/g, "");
    const publicId = `candidate_${safeCandidateId}_${timestamp}`;

    const signedParams: Record<string, string> = {
      faces: "true",
      overwrite: "true",
      public_id: publicId,
      timestamp: String(timestamp),
      type: "authenticated",
      upload_preset: uploadPreset
    };

    const signature = signCloudinaryParams(signedParams, apiSecret);
    const uploadBody = new URLSearchParams();
    uploadBody.set("file", dataUrl);
    uploadBody.set("api_key", apiKey);
    uploadBody.set("signature", signature);

    Object.entries(signedParams).forEach(([key, value]) => {
      uploadBody.set(key, value);
    });

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(
        cloudName
      )}/image/upload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: uploadBody.toString()
      }
    );

    const cloudinaryData = await cloudinaryResponse.json();
    if (!cloudinaryResponse.ok || cloudinaryData?.error) {
      console.error("[CandidateSelfie] Cloudinary upload failed:", {
        status: cloudinaryResponse.status,
        message: cloudinaryData?.error?.message || "Unknown Cloudinary error"
      });
      fail("The selfie could not be uploaded. Please try again.", 502);
    }

    if (cloudinaryData.type !== "authenticated") {
      console.error(
        "[CandidateSelfie] Rejected non-authenticated Cloudinary asset:",
        cloudinaryData.public_id
      );
      fail("The selfie was not stored with protected access.", 502);
    }

    const faces = Array.isArray(cloudinaryData.faces)
      ? cloudinaryData.faces
      : [];
    const faceDetected = faces.length > 0;
    const capturedAt =
      typeof req.body?.capturedAt === "string"
        ? req.body.capturedAt
        : new Date().toISOString();
    const updatedAt = new Date().toISOString();
    const verificationStatus = "pending_review";

    const db = getFirestoreDb();
    const batch = db.batch();
    const selfieRef = db.collection("candidate_selfies").doc(candidateId);
    const candidateRef = db.collection("candidates").doc(candidateId);
    const userRef = db.collection("users").doc(candidateId);

    batch.set(
      selfieRef,
      {
        candidateId,
        cloudinaryAssetId: cloudinaryData.asset_id || "",
        cloudinaryPublicId: cloudinaryData.public_id,
        cloudinaryVersion: cloudinaryData.version || null,
        deliveryType: "authenticated",
        resourceType: "image",
        format: cloudinaryData.format || "jpg",
        bytes: cloudinaryData.bytes || bytes,
        width: cloudinaryData.width || 640,
        height: cloudinaryData.height || 640,
        faceDetected,
        faceCount: faces.length,
        verificationStatus,
        capturedAt,
        submittedAt: updatedAt,
        updatedAt
      },
      { merge: true }
    );

    const candidateStatusUpdate = {
      selfieVerificationStatus: verificationStatus,
      selfieCapturedAt: capturedAt,
      selfieFaceDetected: faceDetected,
      selfieUpdatedAt: updatedAt
    };

    batch.set(candidateRef, candidateStatusUpdate, { merge: true });
    batch.set(userRef, candidateStatusUpdate, { merge: true });
    await batch.commit();

    return res.status(200).json({
      success: true,
      verificationStatus,
      capturedAt,
      faceDetected,
      faceCount: faces.length
    });
  } catch (error) {
    const apiError = error as ApiError;
    const statusCode =
      typeof apiError.statusCode === "number" ? apiError.statusCode : 500;

    if (statusCode >= 500) {
      console.error("[CandidateSelfie] Secure upload error:", apiError);
    }

    return res.status(statusCode).json({
      success: false,
      error:
        statusCode === 401
          ? "AUTHENTICATION_REQUIRED"
          : statusCode === 400
            ? "INVALID_SELFIE"
            : statusCode === 502
              ? "UPLOAD_FAILED"
              : "SELFIE_SERVICE_ERROR",
      message:
        statusCode >= 500
          ? "Live selfie service is temporarily unavailable. Please try again."
          : apiError.message
    });
  }
}
