import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase Admin App
admin.initializeApp();

/**
 * Scheduled Cloud Function (Runs every day at midnight 00:00)
 * Automatically transitions any job to 'Closed' if the applyDeadline field has passed.
 */
export const closeExpiredJobsDaily = onSchedule("0 0 * * *", async (event) => {
  const db = getFirestore();
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  
  console.log(`[Scheduled Cloud Function] Starting check for expired jobs. Current Date: ${todayStr}`);
  
  try {
    const jobsRef = db.collection("jobs");
    // Fetch all job listings that are not already Closed
    const snapshot = await jobsRef.where("status", "!=", "Closed").get();
    
    let transitionCount = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.applyDeadline) {
        // String comparison works perfectly for "YYYY-MM-DD" formatted dates
        if (data.applyDeadline < todayStr) {
          batch.update(doc.ref, { status: "Closed" });
          transitionCount++;
          console.log(`Job transition: "${data.title}" (ID: ${doc.id}) marked as CLOSED. Expiry Deadline was: ${data.applyDeadline}`);
        }
      }
    });
    
    if (transitionCount > 0) {
      await batch.commit();
      console.log(`[Scheduled Cloud Function] Successfully updated ${transitionCount} expired job(s) to 'Closed' status.`);
    } else {
      console.log("[Scheduled Cloud Function] No expired job postings were detected in this pass.");
    }
  } catch (error) {
    console.error("[Scheduled Cloud Function] Error occurred while updating expired jobs:", error);
  }
});
