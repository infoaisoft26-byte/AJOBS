import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserProfile } from "../types";
import { getNextSequentialId } from "./sequentialIdService";

export interface CandidateProfileData {
  uid: string;
  candidateId?: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  role: "candidate";
  emailVerified: boolean;
  verificationStatus: "verified" | "pending" | "rejected";
  accountStatus: "active" | "pending_verification" | "suspended";
  profileStatus: "incomplete" | "complete" | "in_review";
  profileCompletion: number;
  onboardingStep: "resume_upload" | "profile_details" | "completed";
  targetRole?: string;
  preferredLocation?: string;
  skills?: string[];
  experience?: any[];
  education?: any[];
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeScore?: number | null;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Service function that triggers after successful OTP verification
 * to initialize the candidateProfiles/{uid} document with 'profileStatus: incomplete'
 * to seamlessly begin the candidate onboarding flow.
 */
export async function initializeCandidateProfileAfterOtpVerification(
  uid: string,
  params: {
    email: string;
    fullName?: string;
    phone?: string;
    targetRole?: string;
    preferredLocation?: string;
  }
): Promise<CandidateProfileData> {
  const normalizedEmail = (params.email || "").trim().toLowerCase();
  const nameToSave = (params.fullName || "").trim() || "Candidate";
  const nowIso = new Date().toISOString();

  // Check if candidate already has a sequential candidateId
  let candidateId: string;
  try {
    const existingSnap = await getDoc(doc(db, "candidateProfiles", uid));
    if (existingSnap.exists() && existingSnap.data()?.candidateId) {
      candidateId = existingSnap.data().candidateId;
    } else {
      candidateId = await getNextSequentialId("candidates");
    }
  } catch {
    candidateId = await getNextSequentialId("candidates");
  }

  const candidateProfileData: CandidateProfileData = {
    uid,
    candidateId,
    fullName: nameToSave,
    name: nameToSave,
    email: normalizedEmail,
    phone: (params.phone || "").trim(),
    role: "candidate",
    emailVerified: true,
    verificationStatus: "verified",
    accountStatus: "active",
    profileStatus: "incomplete",
    profileCompletion: 20,
    onboardingStep: "resume_upload",
    targetRole: params.targetRole || "Software Engineer",
    preferredLocation: params.preferredLocation || "Remote / India",
    skills: [],
    experience: [],
    education: [],
    resumeUrl: null,
    resumeFileName: null,
    resumeScore: null,
    source: "Email OTP Verification",
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const sharedUserData = {
    uid,
    candidateId,
    name: nameToSave,
    fullName: nameToSave,
    email: normalizedEmail,
    phone: (params.phone || "").trim(),
    role: "candidate",
    emailVerified: true,
    verificationStatus: "verified",
    accountStatus: "active",
    status: "active",
    profileStatus: "incomplete",
    profileCompleted: false,
    profileCompletion: 20,
    source: "Email OTP Verification",
    updatedAt: nowIso
  };

  // Write across Firestore documents safely
  try {
    await Promise.all([
      setDoc(doc(db, "candidateProfiles", uid), candidateProfileData, { merge: true }),
      setDoc(doc(db, "candidates", uid), { ...sharedUserData, createdAt: nowIso }, { merge: true }),
      setDoc(doc(db, "users", uid), { ...sharedUserData, createdAt: nowIso }, { merge: true })
    ]);
    console.log(`[CandidateProfileService] Successfully initialized candidateProfiles/${uid} (${candidateId}) with profileStatus: incomplete`);
  } catch (err: any) {
    console.warn(`[CandidateProfileService] Notice writing candidate profile for ${uid}:`, err?.message || err);
  }

  return candidateProfileData;
}

/**
 * Helper to fetch candidate profile status
 */
export async function getCandidateProfile(uid: string): Promise<CandidateProfileData | null> {
  try {
    const snap = await getDoc(doc(db, "candidateProfiles", uid));
    if (snap.exists()) {
      return snap.data() as CandidateProfileData;
    }
  } catch (err) {
    console.warn("[CandidateProfileService] Error fetching candidate profile:", err);
  }
  return null;
}
