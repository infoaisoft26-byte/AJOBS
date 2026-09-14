import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

function getBearerToken(req: any): string {
  const header = String(req.headers?.authorization || "").trim();
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

function normalizeRole(value: unknown): string {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export async function verifyAndInjectAbacIdentity(req: any, res: any, path: string): Promise<boolean> {
  const protectedPaths = ["/api/admin-platform-insights", "/api/consultancy-natural-search"];
  if (!protectedPaths.includes(path)) return false;

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, reason: "Authenticated Firebase session required." });
    return true;
  }

  try {
    const auth = getFirebaseAuth();
    const decoded = await auth.verifyIdToken(token, true);
    const db = getFirestoreDb();
    const [userSnap, adminSnap] = await Promise.all([
      db.collection("users").doc(decoded.uid).get(),
      db.collection("admins").doc(decoded.uid).get(),
    ]);

    const userData = userSnap.exists ? (userSnap.data() || {}) : {};
    const adminData = adminSnap.exists ? (adminSnap.data() || {}) : {};
    const role = normalizeRole(adminData.role || userData.role || decoded.role);
    const status = normalizeRole(adminData.status || userData.status || userData.accountStatus || "active");

    if (["disabled", "suspended", "inactive", "blocked"].includes(status)) {
      res.status(403).json({ success: false, reason: "Account is not active." });
      return true;
    }

    if (path === "/api/admin-platform-insights") {
      const isSuperAdmin = role === "super_admin" || role === "superadmin" || adminData.level === "Super Admin";
      if (!isSuperAdmin) {
        res.status(403).json({ success: false, reason: "Super Admin access required." });
        return true;
      }

      req.headers["x-user-id"] = decoded.uid;
      req.headers["x-user-role"] = "admin";
      req.headers["x-user-email"] = decoded.email || adminData.email || userData.email || "";
      req.headers["x-user-name"] = adminData.name || userData.name || "Super Admin";
      req.headers["x-user-admin-level"] = "Super Admin";
      req.headers["x-user-admin-status"] = "active";
      return false;
    }

    if (role !== "consultancy") {
      res.status(403).json({ success: false, reason: "Consultancy account required." });
      return true;
    }

    req.headers["x-user-id"] = decoded.uid;
    req.headers["x-user-role"] = "consultancy";
    req.headers["x-user-email"] = decoded.email || userData.email || "";
    req.headers["x-user-name"] = userData.name || userData.agencyName || "Consultancy";
    req.headers["x-user-pricing-plan"] = userData.pricingPlan || userData.subscriptionPlan || "Free";
    req.headers["x-user-clients-count"] = String(userData.clientsCount || 0);
    return false;
  } catch (error: any) {
    console.error("[authenticatedAbacGateway]", error?.message || error);
    res.status(401).json({ success: false, reason: "Authentication failed." });
    return true;
  }
}
