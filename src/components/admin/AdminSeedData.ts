import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { AdminSystemSettings } from "./AdminTypes";

export async function seedSuperAdminDataIfEmpty(_userId: string, _userName: string, _userEmail: string) {
  try {
    // Ensure System Settings global config exists
    const settingsRef = doc(db, "system_settings", "global_config");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      const defaultSettings: AdminSystemSettings = {
        id: "global_config",
        general: {
          siteName: "AIJobs Enterprise Platform",
          supportEmail: "enterprise-support@aijobs.global",
          contactPhone: "+91 (80) 4596-7811",
          address: "Level 11, Prestige Tech Park, Outer Ring Road, Bengaluru, KA - 560103",
          maintenanceMode: false
        },
        branding: {
          logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80",
          primaryColor: "#4f46e5",
          secondaryColor: "#9333ea",
          accentColor: "#f43f5e",
          fontFamily: "Space Grotesk"
        },
        smtp: {
          host: "smtp.sendgrid.net",
          port: 587,
          user: "apikey",
          secure: true
        },
        firebase: {
          projectId: "ai-studio-1424b91d-989e-47eb-a336-779ca0dbfc42",
          storageBucket: "ai-studio-1424b91d-989e-47eb-a336-779ca0dbfc42.appspot.com",
          messagingSenderId: "4815162342"
        },
        api: {
          geminiKeySecure: true,
          razorpayKeyId: "",
          stripePublicKey: ""
        },
        aiConfig: {
          analyzerTemperature: 0.2,
          analyzerModel: "gemini-3.6-flash",
          interviewModel: "gemini-3.6-flash",
          matchingThreshold: 75
        },
        security: {
          maxLoginAttempts: 5,
          sessionTimeoutMinutes: 60,
          mfaRequired: false,
          ipWhitelist: ["127.0.0.1"]
        },
        backup: {
          frequency: "daily",
          lastBackupAt: new Date().toISOString(),
          totalBackups: 0
        }
      };
      await setDoc(settingsRef, defaultSettings);
    }
  } catch (err) {
    console.warn("Notice: System config initialization error:", err);
  }
}
