import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

type AccessLevel = "admin" | "superadmin";

const SUPERADMIN_ONLY = new Set([
  "/api/admin/create-admin",
  "/api/admin/repair-wrong-users",
  "/api/cleanup-demo-data",
]);

const ADMIN_PROTECTED = new Set([
  "/api/admin/create-workspace-user",
  "/api/admin/approve-account",
  "/api/admin/onboarding-list",
  "/api/admin/fraud-action",
  "/api/admin/approve-consultancy",
  "/api/admin/suspend-user",
  "/api/admin/role-audit-logs",
  "/api/admin/save-twilio-settings",
  "/api/admin/get-twilio-settings",
  "/api/admin/sms-logs",
  "/api/verification/review",
  "/api/kyc/send-link",
  "/api/kyc/send-reminder",
  "/api/indexing/publish",
  "/api/indexing/retry",
  "/api/indexing/logs",
  "/api/resumes/grant-access",
  "/api/resumes/grant-status",
  "/api/payment/verify-and-transition",
]);

function normalizeRole(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isInactive(profile: any): boolean {
  const status = String(profile?.status || profile?.accountStatus || "").trim().toLowerCase();
  return profile?.isActive === false || profile?.disabled === true || ["disabled", "suspended", "blocked", "inactive"].includes(status);
}

async function resolveVerifiedAdmin(req: Request, res: Response, required: AccessLevel) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Admin login session is required." });
    return null;
  }

  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(header.slice(7).trim(), true);
    const authUser = await auth.getUser(decoded.uid);
    if (authUser.disabled) {
      res.status(403).json({ success: false, error: "ACCOUNT_DISABLED", message: "This Admin account is disabled." });
      return null;
    }

    const db = getFirestoreDb();
    const [userSnap, adminSnap] = await Promise.all([
      db.collection("users").doc(decoded.uid).get(),
      db.collection("admins").doc(decoded.uid).get(),
    ]);

    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const adminData = adminSnap.exists ? adminSnap.data() || {} : {};
    const role = normalizeRole(userData.role || (decoded as any).role || adminData.role || adminData.level);
    const isSuperAdmin = role === "super_admin" || role === "superadmin";
    const isAdmin = role === "admin" || isSuperAdmin;
    const profile = { ...adminData, ...userData };

    if (!isAdmin || isInactive(profile)) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "Active Admin access is required." });
      return null;
    }
    if (required === "superadmin" && !isSuperAdmin) {
      res.status(403).json({ success: false, error: "SUPERADMIN_REQUIRED", message: "Super Admin access is required for this action." });
      return null;
    }

    return {
      uid: decoded.uid,
      email: String(decoded.email || authUser.email || userData.email || "").trim().toLowerCase(),
      role: isSuperAdmin ? "super_admin" : "admin",
      name: String(userData.name || userData.displayName || adminData.name || authUser.displayName || "AIJOBS Admin").trim(),
    };
  } catch (error: any) {
    console.warn("[AdminApiGateway] Authentication failed:", error?.message || error);
    res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Admin session expired. Please sign in again." });
    return null;
  }
}

export async function verifyAndInjectAdminIdentity(req: Request, res: Response, path: string): Promise<boolean> {
  const required: AccessLevel | null = SUPERADMIN_ONLY.has(path)
    ? "superadmin"
    : ADMIN_PROTECTED.has(path)
      ? "admin"
      : null;
  if (!required) return false;

  const identity = await resolveVerifiedAdmin(req, res, required);
  if (!identity) return true;

  req.body = req.body && typeof req.body === "object" ? req.body : {};
  Object.assign(req.body, {
    reviewedBy: identity.name || identity.email || identity.uid,
    adminUid: identity.uid,
    reqAdminUid: identity.uid,
    superAdminUid: identity.uid,
    grantedByAdminId: identity.uid,
    submittedBy: identity.uid,
    adminUserId: identity.uid,
  });

  req.headers["x-user-id"] = identity.uid;
  req.headers["x-user-email"] = identity.email;
  req.headers["x-user-role"] = identity.role;
  return false;
}

export const ADMIN_PROTECTED_PATHS = [...SUPERADMIN_ONLY, ...ADMIN_PROTECTED];
