import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Saved Jobs Service
 * Handles adding and removing job document references in a user's private Firestore 'bookmarks' sub-collection.
 * The path is: candidates/{userId}/bookmarks/{jobId}
 */

export interface Bookmark {
  jobId: string;
  savedAt: any;
}

/**
 * Saves/bookmarks a job for a candidate.
 * Adds a document to the private 'bookmarks' sub-collection of the candidate.
 */
export async function saveJobToBookmarks(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) throw new Error("Missing userId or jobId for bookmarking");
  try {
    const bookmarkRef = doc(db, "candidates", userId, "bookmarks", jobId);
    await setDoc(bookmarkRef, {
      jobId,
      savedAt: serverTimestamp() || new Date().toISOString()
    });
    console.log(`[SavedJobsService] Job ${jobId} successfully bookmarked for candidate ${userId}`);
  } catch (error) {
    console.error(`[SavedJobsService] Error saving job ${jobId} to bookmarks:`, error);
    throw error;
  }
}

/**
 * Removes/unbookmarks a job for a candidate.
 * Deletes the document from the private 'bookmarks' sub-collection of the candidate.
 */
export async function removeJobFromBookmarks(userId: string, jobId: string): Promise<void> {
  if (!userId || !jobId) throw new Error("Missing userId or jobId for unbookmarking");
  try {
    const bookmarkRef = doc(db, "candidates", userId, "bookmarks", jobId);
    await deleteDoc(bookmarkRef);
    console.log(`[SavedJobsService] Job ${jobId} successfully removed from bookmarks for candidate ${userId}`);
  } catch (error) {
    console.error(`[SavedJobsService] Error removing job ${jobId} from bookmarks:`, error);
    throw error;
  }
}

/**
 * Fetches all saved job IDs (bookmarks) for a candidate.
 */
export async function getSavedJobIdsFromBookmarks(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const bookmarksColRef = collection(db, "candidates", userId, "bookmarks");
    const querySnapshot = await getDocs(bookmarksColRef);
    const savedIds: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.jobId) {
        savedIds.push(data.jobId);
      } else {
        savedIds.push(doc.id);
      }
    });
    return savedIds;
  } catch (error) {
    console.warn(`[SavedJobsService] Error fetching bookmarks for candidate ${userId}:`, error);
    return [];
  }
}
