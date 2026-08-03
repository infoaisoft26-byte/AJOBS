import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const targetDbId = process.env.FIRESTORE_DATABASE_ID || "ai-studio-aijobs-1424b91d-989e-47eb-a336-779ca0dbfc42";

function getDb() {
  return targetDbId ? getFirestore(targetDbId) : getFirestore();
}

/**
 * Lead list handler logic using Firebase Admin SDK
 */
export async function getLeadsListHandler(requesterUid?: string) {
  try {
    const db = getDb();

    // Verify admin role if UID provided
    if (requesterUid) {
      const userDoc = await db.collection("users").doc(requesterUid).get();
      if (userDoc.exists) {
        const userData = userDoc.data() || {};
        const role = (userData.role || "").toLowerCase();
        const isAdmin =
          role === "admin" ||
          role === "superadmin" ||
          role === "super_admin" ||
          userData.isAdmin === true ||
          userData.email === "infoaisoft26@gmail.com";

        if (!isAdmin) {
          return {
            success: false,
            error: "Access denied: Admin or Superadmin privileges required."
          };
        }
      }
    }

    // 5-second timeout wrapper
    const fetchPromise = (async () => {
      const leadsRef = db.collection("leads");
      let snapshot;

      try {
        snapshot = await leadsRef.orderBy("createdAt", "desc").limit(100).get();
      } catch (err) {
        console.warn("[functions/leads] orderBy failed, falling back to raw fetch:", err);
        snapshot = await leadsRef.limit(100).get();
      }

      if (!snapshot || snapshot.empty) {
        return { success: true, leads: [], count: 0 };
      }

      const leads: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() || {};
        leads.push({
          id: doc.id,
          leadId: data.leadId || doc.id,
          fullName: data.fullName || "New Prospect",
          email: data.email || "",
          mobile: data.mobile || "",
          role: data.role || "Candidate",
          source: data.source || "Direct",
          campaign: data.campaign || "Organic Search",
          status: data.status || "new",
          createdAt: data.createdAt || new Date().toISOString(),
          ...data
        });
      });

      return {
        success: true,
        leads,
        count: leads.length
      };
    })();

    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 5000)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if ("timeout" in result) {
      console.warn("[functions/leads] Fetch timed out after 5s");
      return {
        success: false,
        error: "Lead service is temporarily unavailable."
      };
    }

    return result;
  } catch (error: any) {
    console.error("[functions/leads] Error getting leads:", error?.message || error);
    return {
      success: false,
      error: "Lead service is temporarily unavailable."
    };
  }
}
