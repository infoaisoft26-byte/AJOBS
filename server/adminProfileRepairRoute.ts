import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const OFFICIAL_ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@aijobs1.in").trim().toLowerCase();
const OFFICIAL_ADMIN_UID = String(process.env.ADMIN_UID || "Emy6ywuYbRNquBpTOYdnbWPUhtp2").trim();

function getBearerToken(req: any): string {
  const header = String(req.headers?.authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

export async function handleAdminProfileRepairRoute(req: any, res: any): Promise<boolean> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return true;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: "AUTH_TOKEN_REQUIRED" });
    return true;
  }

  try {
    const adminAuth = getFirebaseAuth();
    const decoded = await adminAuth.verifyIdToken(token, true);
    const decodedEmail = String(decoded.email || "").trim().toLowerCase();

    if (decoded.uid !== OFFICIAL_ADMIN_UID || decodedEmail !== OFFICIAL_ADMIN_EMAIL) {
      res.status(403).json({ success: false, error: "OFFICIAL_ADMIN_IDENTITY_MISMATCH" });
      return true;
    }

    const authUser = await adminAuth.getUser(decoded.uid);
    const authEmail = String(authUser.email || "").trim().toLowerCase();
    if (authUser.uid !== OFFICIAL_ADMIN_UID || authEmail !== OFFICIAL_ADMIN_EMAIL || authUser.disabled) {
      res.status(403).json({ success: false, error: "OFFICIAL_ADMIN_ACCOUNT_INVALID" });
      return true;
    }

    const now = new Date().toISOString();
    const name = String(req.body?.name || authUser.displayName || "AIJOBS Admin").trim().slice(0, 120) || "AIJOBS Admin";
    const db = getFirestoreDb();

    await adminAuth.setCustomUserClaims(authUser.uid, {
      ...(decoded as any),
      role: "admin",
      admin: true,
    });

    const profile = {
      uid: authUser.uid,
      email: OFFICIAL_ADMIN_EMAIL,
      name,
      role: "admin",
      status: "active",
      accountStatus: "active",
      isActive: true,
      isApproved: true,
      onboardingCompleted: true,
      internalAccess: true,
      updatedAt: now,
    };

    await Promise.all([
      db.collection("users").doc(authUser.uid).set(profile, { merge: true }),
      db.collection("admins").doc(authUser.uid).set({
        ...profile,
        level: "Administrator",
      }, { merge: true }),
    ]);

    res.status(200).json({ success: true, uid: authUser.uid, role: "admin" });
    return true;
  } catch (error: any) {
    console.error("[adminProfileRepairRoute]", error?.message || error);
    res.status(401).json({ success: false, error: "ADMIN_REPAIR_AUTH_FAILED" });
    return true;
  }
}
