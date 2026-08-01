import { db } from "../firebase";

import { JobPosting } from "../types";
import { generateJobSlug, getPublicJobUrl } from "../config/site";

const JOBS_COLLECTION = "jobs";

/**
 * Checks if a job listing appears to be a duplicate based on title, company, and location.
 */
export async function checkDuplicateJob(title: string, companyName: string, location: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, JOBS_COLLECTION),
      where("companyName", "==", companyName),
      where("title", "==", title)
    );
    const snap = await getDocs(q);
    let isDup = false;
    snap.forEach((d) => {
      const data = d.data();
      if ((data.location || "").toLowerCase() === (location || "").toLowerCase() && data.status !== "Closed" && data.status !== "Expired") {
        isDup = true;
      }
    });
    return isDup;
  } catch (err) {
    console.warn("Duplicate check query notice:", err);
    return false;
  }
}

/**
 * Fetches all jobs from Firestore.
 */
export async function getAllJobs(): Promise<JobPosting[]> {
  try {
    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    const jobsList: JobPosting[] = [];
    querySnapshot.forEach((doc) => {
      jobsList.push({ id: doc.id, ...doc.data() } as JobPosting);
    });
    return jobsList;
  } catch (error) {
    console.error("Error fetching all jobs: ", error);
    throw error;
  }
}

/**
 * Fetches only 'LIVE' / 'Published' status jobs.
 */
export async function getLiveJobs(): Promise<JobPosting[]> {
  try {
    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    const jobsList: JobPosting[] = [];
    const currentDate = new Date();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      const expiry = data.validThrough || data.expiryDate || data.applyDeadline;
      const isExpired = expiry ? new Date(expiry) < currentDate : false;

      if (["live", "open", "published", "approved"].includes(status) && !isExpired) {
        const slug = data.slug || generateJobSlug(data.title, data.location, doc.id);
        const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title: data.title, location: data.location, id: doc.id, slug });
        jobsList.push({ id: doc.id, slug, canonicalUrl, ...data } as JobPosting);
      }
    });

    return jobsList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching live jobs:", error);
    return [];
  }
}

/**
 * Fetches a single job posting by ID or Slug.
 */
export async function getJobById(jobIdOrSlug: string): Promise<JobPosting | null> {
  try {
    // 1. Try direct ID lookup
    const docRef = doc(db, JOBS_COLLECTION, jobIdOrSlug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const slug = data.slug || generateJobSlug(data.title, data.location, docSnap.id);
      const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title: data.title, location: data.location, id: docSnap.id, slug });
      return { id: docSnap.id, slug, canonicalUrl, ...data } as JobPosting;
    }

    // 2. Search by slug field or slug ending with ID
    const q = query(collection(db, JOBS_COLLECTION), where("slug", "==", jobIdOrSlug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const firstDoc = snap.docs[0];
      const data = firstDoc.data();
      const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title: data.title, location: data.location, id: firstDoc.id, slug: data.slug });
      return { id: firstDoc.id, canonicalUrl, ...data } as JobPosting;
    }

    // 3. Extract trailing ID if slug format (e.g. "customer-support-executive-AJ1024" or "job_123")
    const parts = jobIdOrSlug.split("-");
    const trailingId = parts[parts.length - 1];
    if (trailingId && trailingId !== jobIdOrSlug) {
      const trailingRef = doc(db, JOBS_COLLECTION, trailingId);
      const trailingSnap = await getDoc(trailingRef);
      if (trailingSnap.exists()) {
        const data = trailingSnap.data();
        const slug = data.slug || generateJobSlug(data.title, data.location, trailingSnap.id);
        const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title: data.title, location: data.location, id: trailingSnap.id, slug });
        return { id: trailingSnap.id, slug, canonicalUrl, ...data } as JobPosting;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching job with ID/slug ${jobIdOrSlug}: `, error);
    return null;
  }
}

/**
 * Creates a new job posting in Firestore and triggers indexing if published.
 */
export async function createJob(jobData: Omit<JobPosting, "id">): Promise<string> {
  try {
    const rawId = jobData.employerId || "AJ" + Math.floor(1000 + Math.random() * 9000);
    const jobId = "job_" + Math.random().toString(36).substring(2, 11);
    
    const isDup = await checkDuplicateJob(jobData.title, jobData.companyName, jobData.location);

    const slug = generateJobSlug(jobData.title, jobData.location, jobId);
    const canonicalUrl = getPublicJobUrl({ title: jobData.title, location: jobData.location, id: jobId, slug });

    const finalStatus = isDup ? "Pending Approval" : (jobData.status || "Published");

    const fullJob: JobPosting = {
      ...jobData,
      id: jobId,
      slug,
      canonicalUrl,
      status: finalStatus,
      isPotentialDuplicate: isDup,
      datePosted: jobData.datePosted || new Date().toISOString().split("T")[0],
      createdAt: jobData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const jobRef = doc(db, JOBS_COLLECTION, jobId);
    await setDoc(jobRef, fullJob);

    // If published, trigger backend Google Indexing API
    if (["Published", "Live", "Approved"].includes(finalStatus)) {
      fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: jobData.title, slug, canonicalUrl, action: "URL_UPDATED" })
      }).catch(err => console.warn("Indexing trigger notice:", err));
    }

    return jobId;
  } catch (error) {
    console.error("Error creating job: ", error);
    throw error;
  }
}

/**
 * Updates an existing job posting.
 */
export async function updateJob(jobId: string, jobData: Partial<JobPosting>): Promise<void> {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const currentSnap = await getDoc(docRef);
    const currentData = currentSnap.exists() ? currentSnap.data() : {};

    const updatedTitle = jobData.title || currentData.title || "job";
    const updatedLoc = jobData.location || currentData.location || "";
    const slug = jobData.slug || generateJobSlug(updatedTitle, updatedLoc, jobId);
    const canonicalUrl = jobData.canonicalUrl || getPublicJobUrl({ title: updatedTitle, location: updatedLoc, id: jobId, slug });

    const updatePayload = {
      ...jobData,
      slug,
      canonicalUrl,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updatePayload);

    const newStatus = jobData.status || currentData.status;
    if (["Published", "Live", "Approved"].includes(newStatus)) {
      fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: updatedTitle, slug, canonicalUrl, action: "URL_UPDATED" })
      }).catch(err => console.warn("Indexing trigger notice:", err));
    } else if (["Closed", "Expired", "Rejected"].includes(newStatus)) {
      fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: updatedTitle, slug, canonicalUrl, action: "URL_DELETED" })
      }).catch(err => console.warn("Indexing trigger notice:", err));
    }
  } catch (error) {
    console.error(`Error updating job with ID ${jobId}: `, error);
    throw error;
  }
}

/**
 * Deletes a job posting and triggers URL_DELETED on Google Indexing API.
 */
export async function deleteJob(jobId: string): Promise<void> {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const currentSnap = await getDoc(docRef);
    if (currentSnap.exists()) {
      const currentData = currentSnap.data();
      const slug = currentData.slug || generateJobSlug(currentData.title, currentData.location, jobId);
      const canonicalUrl = currentData.canonicalUrl || getPublicJobUrl({ title: currentData.title, location: currentData.location, id: jobId, slug });

      fetch("/api/indexing/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, title: currentData.title, slug, canonicalUrl, action: "URL_DELETED" })
      }).catch(err => console.warn("Indexing trigger notice:", err));
    }

    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting job with ID ${jobId}: `, error);
    throw error;
  }
}

/**
 * Fetches jobs in pages from Firestore.
 */
export async function fetchPaginatedLiveJobs(
  pageSize: number = 15,
  lastVisibleDoc: any = null
): Promise<{ jobs: JobPosting[]; lastDoc: any }> {
  try {
    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    const jobsList: JobPosting[] = [];
    const currentDate = new Date();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      const expiry = data.validThrough || data.expiryDate || data.applyDeadline;
      const isExpired = expiry ? new Date(expiry) < currentDate : false;

      if (["live", "open", "published", "approved"].includes(status) && !isExpired) {
        const slug = data.slug || generateJobSlug(data.title, data.location, doc.id);
        const canonicalUrl = data.canonicalUrl || getPublicJobUrl({ title: data.title, location: data.location, id: doc.id, slug });
        jobsList.push({ id: doc.id, slug, canonicalUrl, ...data } as JobPosting);
      }
    });

    const sorted = jobsList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return {
      jobs: sorted,
      lastDoc: null
    };
  } catch (error) {
    console.warn("fetchPaginatedLiveJobs fallback:", error);
    return { jobs: [], lastDoc: null };
  }
}
