"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJobStatusChanged = exports.processNewJobAlertsScheduled = exports.weeklyJobDigestScheduled = exports.closeExpiredJobsDaily = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const admin = require("firebase-admin");
__exportStar(require("./agreement"), exports);
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Checks if a candidate's email preferences match a target job posting.
 */
function candidateMatchesJob(prefs, job, isWeeklyDigest = false) {
    // 1. Consent Check
    if (isWeeklyDigest) {
        if (!prefs.weeklyDigest)
            return false;
    }
    else {
        if (!prefs.jobAlerts)
            return false;
    }
    // Normalize job fields
    const jobTitle = (job.title || job.role || job.category || "").toLowerCase();
    const jobLocation = (job.location || "").toLowerCase();
    // Normalize job skills
    let jobSkills = [];
    if (Array.isArray(job.skills)) {
        jobSkills = job.skills.map((s) => String(s).toLowerCase());
    }
    else if (typeof job.skills === "string") {
        jobSkills = job.skills.split(",").map((s) => s.trim().toLowerCase());
    }
    if (Array.isArray(job.requiredSkills)) {
        const extra = job.requiredSkills.map((s) => String(s).toLowerCase());
        jobSkills.push(...extra);
    }
    // 2. Role matching
    const roles = prefs.preferredJobRoles || [];
    if (roles.length > 0) {
        const roleMatch = roles.some((role) => {
            const r = role.toLowerCase().trim();
            return r && (jobTitle.includes(r) || r.includes(jobTitle));
        });
        if (!roleMatch)
            return false;
    }
    // 3. Location matching
    const locations = prefs.preferredLocations || [];
    if (locations.length > 0) {
        const locMatch = locations.some((loc) => {
            const l = loc.toLowerCase().trim();
            if (!l)
                return false;
            if (jobLocation.includes("remote") || l.includes("remote"))
                return true;
            return jobLocation.includes(l) || l.includes(jobLocation);
        });
        if (!locMatch)
            return false;
    }
    // 4. Skills matching
    const skills = prefs.preferredSkills || [];
    if (skills.length > 0 && jobSkills.length > 0) {
        const skillMatch = skills.some((skill) => {
            const sk = skill.toLowerCase().trim();
            return sk && jobSkills.some((js) => js.includes(sk) || sk.includes(js));
        });
        if (!skillMatch)
            return false;
    }
    return true;
}
/**
 * Dispatches automated new-job-alert emails for a specific job in controlled batches to the mail collection
 */
async function processJobAlertForJob(db, jobId, jobData) {
    const campaignId = `campaign_job_${jobId}_${Date.now()}`;
    console.log(`[JobAlert] Processing job alert campaign for job ID: ${jobId}, Title: "${jobData.title}"`);
    const usersSnap = await db.collection("users").get();
    let matchCount = 0;
    let batch = db.batch();
    let operationCount = 0;
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.role && userData.role !== "candidate" && userData.role !== "user")
            continue;
        const uid = userDoc.id;
        const email = userData.email;
        if (!email)
            continue;
        // Fetch candidate preferences from subcollection
        const prefSnap = await db.collection("users").doc(uid).collection("email_preferences").doc("settings").get();
        if (!prefSnap.exists)
            continue;
        const prefs = prefSnap.data();
        if (!prefs.jobAlerts)
            continue;
        // Check candidate match against job
        if (!candidateMatchesJob(prefs, jobData, false))
            continue;
        // Check duplicate delivery
        const existingDel = await db.collection("email_campaign_deliveries")
            .where("jobId", "==", jobId)
            .where("candidateId", "==", uid)
            .get();
        if (!existingDel.empty)
            continue;
        const mailRef = db.collection("mail").doc();
        const deliveryId = `del_${jobId}_${uid}`;
        const deliveryRef = db.collection("email_campaign_deliveries").doc(deliveryId);
        const jobUrl = `https://aijobs.in/jobs/${jobData.slug || jobId}`;
        batch.set(mailRef, {
            to: [email],
            template: {
                name: "new-job-alert",
                data: {
                    candidateName: userData.name || "Candidate",
                    jobTitle: jobData.title || "Job Opportunity",
                    companyName: jobData.companyName || jobData.hiringOrganizationName || "Partner Enterprise",
                    location: jobData.location || "Remote / Pan-India",
                    salary: jobData.salary || "Competitive CTC",
                    jobUrl,
                    unsubscribeToken: prefs.unsubscribeToken || ""
                }
            },
            category: "job_alert",
            userId: uid,
            createdAt: firestore_2.FieldValue.serverTimestamp()
        });
        batch.set(deliveryRef, {
            id: deliveryId,
            campaignId,
            jobId,
            candidateId: uid,
            email,
            status: "SUCCESS",
            queuedAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
            unsubscribeStatus: false
        });
        matchCount++;
        operationCount += 2;
        if (operationCount >= 400) {
            await batch.commit();
            batch = db.batch();
            operationCount = 0;
        }
    }
    if (operationCount > 0) {
        await batch.commit();
    }
    await db.collection("jobs").doc(jobId).update({
        jobAlertProcessed: true,
        jobAlertProcessedAt: new Date().toISOString()
    });
    console.log(`[JobAlert] Campaign complete for job ${jobId}. Dispatched alerts to ${matchCount} matching candidate(s).`);
}
/**
 * Runs weekly consolidated job digest for opted-in candidates
 */
async function processWeeklyJobDigest(db) {
    console.log(`[WeeklyDigest] Running scheduled weekly job digest...`);
    const jobsSnap = await db.collection("jobs").limit(20).get();
    const liveJobs = [];
    jobsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        data.id = docSnap.id;
        const status = (data.status || "").toLowerCase();
        if (["open", "published", "approved", "live"].includes(status)) {
            liveJobs.push(data);
        }
    });
    if (liveJobs.length === 0) {
        console.log(`[WeeklyDigest] No live jobs found. Skipping digest pass.`);
        return;
    }
    const usersSnap = await db.collection("users").get();
    let digestCount = 0;
    let batch = db.batch();
    let operationCount = 0;
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (userData.role && userData.role !== "candidate" && userData.role !== "user")
            continue;
        const uid = userDoc.id;
        const email = userData.email;
        if (!email)
            continue;
        const prefSnap = await db.collection("users").doc(uid).collection("email_preferences").doc("settings").get();
        if (!prefSnap.exists)
            continue;
        const prefs = prefSnap.data();
        if (!prefs.weeklyDigest)
            continue;
        const matchingJobs = liveJobs.filter((job) => candidateMatchesJob(prefs, job, true)).slice(0, 10);
        if (matchingJobs.length === 0)
            continue;
        const formattedJobs = matchingJobs.map((j) => ({
            title: j.title || "Software Opportunity",
            company: j.companyName || j.hiringOrganizationName || "AIJobs Partner",
            location: j.location || "Remote / India",
            salary: j.salary || "Competitive CTC",
            url: `https://aijobs.in/jobs/${j.slug || j.id}`
        }));
        const mailRef = db.collection("mail").doc();
        batch.set(mailRef, {
            to: [email],
            template: {
                name: "weekly-job-digest",
                data: {
                    candidateName: userData.name || "Candidate",
                    jobsList: formattedJobs,
                    unsubscribeToken: prefs.unsubscribeToken || ""
                }
            },
            category: "weekly_digest",
            userId: uid,
            createdAt: firestore_2.FieldValue.serverTimestamp()
        });
        digestCount++;
        operationCount++;
        if (operationCount >= 400) {
            await batch.commit();
            batch = db.batch();
            operationCount = 0;
        }
    }
    if (operationCount > 0) {
        await batch.commit();
    }
    console.log(`[WeeklyDigest] Completed weekly job digest. Queued emails for ${digestCount} candidate(s).`);
}
/**
 * Scheduled Cloud Function (Runs every day at midnight 00:00)
 * Automatically transitions any job to 'Closed' if the applyDeadline field has passed.
 */
exports.closeExpiredJobsDaily = (0, scheduler_1.onSchedule)("0 0 * * *", async () => {
    const db = (0, firestore_2.getFirestore)();
    const todayStr = new Date().toISOString().split("T")[0];
    console.log(`[Scheduled Cloud Function] Starting check for expired jobs. Current Date: ${todayStr}`);
    try {
        const jobsRef = db.collection("jobs");
        const snapshot = await jobsRef.where("status", "!=", "Closed").get();
        let transitionCount = 0;
        const batch = db.batch();
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.applyDeadline) {
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
        }
        else {
            console.log("[Scheduled Cloud Function] No expired job postings were detected in this pass.");
        }
    }
    catch (error) {
        console.error("[Scheduled Cloud Function] Error occurred while updating expired jobs:", error);
    }
});
/**
 * Scheduled Cloud Function: Weekly Job Digest (Runs every Monday at 09:00 AM UTC)
 */
exports.weeklyJobDigestScheduled = (0, scheduler_1.onSchedule)("0 9 * * 1", async () => {
    const db = (0, firestore_2.getFirestore)();
    try {
        await processWeeklyJobDigest(db);
    }
    catch (error) {
        console.error("[WeeklyDigest] Scheduled run failed:", error);
    }
});
/**
 * Scheduled Cloud Function: Process New Job Alerts (Runs every 15 minutes)
 * Scans for newly approved/live jobs that haven't been broadcast yet
 */
exports.processNewJobAlertsScheduled = (0, scheduler_1.onSchedule)("*/15 * * * *", async () => {
    const db = (0, firestore_2.getFirestore)();
    try {
        const jobsSnap = await db.collection("jobs").get();
        for (const docSnap of jobsSnap.docs) {
            const data = docSnap.data();
            const status = (data.status || "").toLowerCase();
            if (["approved", "live", "open", "published"].includes(status) && !data.jobAlertProcessed) {
                await processJobAlertForJob(db, docSnap.id, data);
            }
        }
    }
    catch (error) {
        console.error("[JobAlert] Scheduled scan failed:", error);
    }
});
/**
 * Firestore Trigger: Automatically sends new-job-alert when job status transitions to Approved / Live
 */
exports.onJobStatusChanged = (0, firestore_1.onDocumentUpdated)("jobs/{jobId}", async (event) => {
    if (!event.data)
        return;
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const oldStatus = (beforeData.status || "").toLowerCase();
    const newStatus = (afterData.status || "").toLowerCase();
    const isNewlyApproved = !["approved", "live", "open", "published"].includes(oldStatus) &&
        ["approved", "live", "open", "published"].includes(newStatus);
    if (isNewlyApproved && !afterData.jobAlertProcessed) {
        const db = (0, firestore_2.getFirestore)();
        try {
            await processJobAlertForJob(db, event.params.jobId, afterData);
        }
        catch (err) {
            console.error(`[JobAlert] Trigger failed for job ${event.params.jobId}:`, err);
        }
    }
});
//# sourceMappingURL=index.js.map