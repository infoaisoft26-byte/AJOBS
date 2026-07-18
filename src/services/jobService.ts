import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getFirestore,
  limit,
  startAfter,
  QueryConstraint
} from "firebase/firestore";
import { db } from "../firebase";
import { JobPosting } from "../types";

const JOBS_COLLECTION = "jobs";

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
 * Fetches only 'LIVE' status jobs sorted by 'createdAt' descending from Firestore.
 */
export async function getLiveJobs(): Promise<JobPosting[]> {
  try {
    const q = query(
      collection(db, JOBS_COLLECTION),
      where("status", "in", ["Live", "LIVE", "open", "Published", "Published", "approved"]),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const jobsList: JobPosting[] = [];
    querySnapshot.forEach((doc) => {
      jobsList.push({ id: doc.id, ...doc.data() } as JobPosting);
    });
    return jobsList;
  } catch (error) {
    console.warn("Error fetching live jobs using structured query, falling back to client-side filter: ", error);
    // Safe client-side fallback if composite index is still building or missing
    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    const jobsList: JobPosting[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toLowerCase();
      if (["live", "open", "published", "approved"].includes(status)) {
        jobsList.push({ id: doc.id, ...data } as JobPosting);
      }
    });
    return jobsList.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }
}

/**
 * Fetches a single job posting by ID.
 */
export async function getJobById(jobId: string): Promise<JobPosting | null> {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as JobPosting;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching job with ID ${jobId}: `, error);
    throw error;
  }
}

/**
 * Creates a new job posting in Firestore.
 */
export async function createJob(jobData: Omit<JobPosting, "id">): Promise<string> {
  try {
    const jobId = "job_" + Math.random().toString(36).substring(2, 11);
    const jobRef = doc(db, JOBS_COLLECTION, jobId);
    const fullJob: JobPosting = {
      ...jobData,
      id: jobId,
      createdAt: jobData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(jobRef, fullJob);
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
    await updateDoc(docRef, {
      ...jobData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error updating job with ID ${jobId}: `, error);
    throw error;
  }
}

/**
 * Deletes a job posting.
 */
export async function deleteJob(jobId: string): Promise<void> {
  try {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting job with ID ${jobId}: `, error);
    throw error;
  }
}

/**
 * Fetches jobs in pages from Firestore, applying status == "LIVE", approved == true, and expiryDate >= currentDate checks.
 * Integrates startAfter and limit constraints for high-performance infinite scrolling with resilient fallback.
 */
export async function fetchPaginatedLiveJobs(
  pageSize: number = 15,
  lastVisibleDoc: any = null
): Promise<{ jobs: JobPosting[]; lastDoc: any }> {
  try {
    const collectionRef = collection(db, JOBS_COLLECTION);
    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    
    if (lastVisibleDoc) {
      constraints.push(startAfter(lastVisibleDoc));
    }
    constraints.push(limit(pageSize * 2)); // Fetch extra to account for active filtering

    const q = query(collectionRef, ...constraints);
    const snap = await getDocs(q);
    const lastDoc = snap.docs[snap.docs.length - 1] || null;

    const jobsList: JobPosting[] = [];
    const currentDate = new Date();

    snap.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toUpperCase();
      // approved is true if explicitly true OR undefined/null (for existing seed/pre-existing entries)
      const approved = data.approved === true || data.approved === undefined || data.approved === null;
      const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
      const isExpired = expiry ? expiry < currentDate : false;

      if ((status === "LIVE" || data.status === "Live") && approved && !isExpired) {
        jobsList.push({ id: doc.id, ...data } as JobPosting);
      }
    });

    return {
      jobs: jobsList,
      lastDoc
    };
  } catch (error) {
    console.warn("Index or connection error in fetchPaginatedLiveJobs, using resilient fallback:", error);
    // Safe fallback: fetch all live postings and sort in memory
    const querySnapshot = await getDocs(collection(db, JOBS_COLLECTION));
    const jobsList: JobPosting[] = [];
    const currentDate = new Date();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const status = (data.status || "").toUpperCase();
      const approved = data.approved === true || data.approved === undefined || data.approved === null;
      const expiry = data.expiryDate ? new Date(data.expiryDate) : null;
      const isExpired = expiry ? expiry < currentDate : false;

      if ((status === "LIVE" || data.status === "Live") && approved && !isExpired) {
        jobsList.push({ id: doc.id, ...data } as JobPosting);
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
  }
}
