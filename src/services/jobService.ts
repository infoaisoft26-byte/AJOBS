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
  getFirestore 
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
      where("status", "==", "Live"),
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
      if (data.status === "Live" || data.status === "LIVE") {
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
