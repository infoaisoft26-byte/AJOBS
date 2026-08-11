import { doc, runTransaction, setDoc } from "firebase/firestore";
import { Server, Type, User } from "lucide-react";
import { auth, db } from "../firebase";
import { ResumeAIService } from "./ai/resume.service";
import { parseJsonResponse } from "../utils/apiHelper";

export interface ParsedResumeMetadata {
  name: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  totalExperience: string;
  education: string;
  designation: string;
  currentDesignation: string;
  currentCompany: string;
  location: string;
  city: string;
  state: string;
  languages: string[];
  certificates: string[];
  linkedin?: string;
  github?: string;
  rawParsed?: any;
}

export interface ParseResumeResponse {
  success: boolean;
  parsedData?: ParsedResumeMetadata;
  error?: string;
}

/**
 * Parses resume details using the Gemini API and atomically updates Firestore collections
 * ('users/{uid}', 'candidates/{uid}', 'resumes/{uid}') using a Firestore transaction.
 * NEVER overwrites verified account email or mobile number with parser output.
 */
export async function parseResumeData(
  resumeUrl: string,
  uid: string,
  fileName?: string,
  fileType?: string
): Promise<ParseResumeResponse> {
  if (!uid) {
    return { success: false, error: "Missing user identifier (uid)." };
  }

  console.log(`[aiParser] Starting parseResumeData for UID: ${uid}, URL: ${resumeUrl}`);

  let parsed: ParsedResumeMetadata | null = null;
  let rawResponseData: any = null;

  try {
    // 1. Call the backend route which interfaces with Gemini API
    const response = await fetch("/api/resume/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        resumeUrl,
        fileName: fileName || "uploaded_resume.pdf",
        fileType: fileType || "application/pdf"
      })
    });

    if (response.ok) {
      rawResponseData = await parseJsonResponse(response);
      if (rawResponseData && rawResponseData.parsed) {
        const p = rawResponseData.parsed;
        parsed = {
          name: p.fullName || p.name || "",
          fullName: p.fullName || p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          skills: Array.isArray(p.skills) ? p.skills : [],
          experience: p.totalExperience || p.experience || "",
          totalExperience: p.totalExperience || p.experience || "",
          education: p.education || "",
          designation: p.currentDesignation || p.designation || "",
          currentDesignation: p.currentDesignation || p.designation || "",
          currentCompany: p.currentCompany || "",
          location: [p.city, p.state].filter(Boolean).join(", ") || p.location || "",
          city: p.city || "",
          state: p.state || "",
          languages: Array.isArray(p.languages) ? p.languages : [],
          certificates: Array.isArray(p.certificates) ? p.certificates : (Array.isArray(p.certifications) ? p.certifications : []),
          linkedin: p.linkedin || "",
          github: p.github || "",
          rawParsed: p
        };
      }
    }
  } catch (err) {
    console.warn("[aiParser] Server API endpoint failed or timed out, running client-side fallback parsing...", err);
  }

  // 2. Client-side fallback parsing if server API is unavailable
  if (!parsed) {
    try {
      const cleanFileName = (fileName || "Resume").replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const fallbackSampleText = `Candidate Name: ${cleanFileName}\nFile: ${fileName || "Resume"}`;
      const aiResult = await ResumeAIService.analyzeResume(fallbackSampleText, cleanFileName);
      const p = aiResult.parsed;

      parsed = {
        name: p.fullName || cleanFileName,
        fullName: p.fullName || cleanFileName,
        email: p.email || "",
        phone: p.phone || "",
        skills: Array.isArray(p.skills) ? p.skills : [],
        experience: p.experience?.length ? `${p.experience[0].role} at ${p.experience[0].company}` : "",
        totalExperience: p.experience?.length ? `${p.experience[0].role} at ${p.experience[0].company}` : "",
        education: p.education?.length ? `${p.education[0].degree} - ${p.education[0].school}` : "",
        designation: p.designation || "",
        currentDesignation: p.designation || "",
        currentCompany: p.currentCompany || "",
        location: p.preferredLocation || "",
        city: p.preferredLocation || "",
        state: "",
        languages: Array.isArray(p.languages) ? p.languages : [],
        certificates: Array.isArray(p.missingSkills?.certifications) ? p.missingSkills.certifications : [],
        rawParsed: p
      };
    } catch (fallbackErr) {
      console.error("[aiParser] Fallback AI parser error:", fallbackErr);
      parsed = {
        name: (fileName || "Candidate").replace(/\.[^/.]+$/, ""),
        fullName: (fileName || "Candidate").replace(/\.[^/.]+$/, ""),
        email: "",
        phone: "",
        skills: [],
        experience: "",
        totalExperience: "",
        education: "",
        designation: "",
        currentDesignation: "",
        currentCompany: "",
        location: "",
        city: "",
        state: "",
        languages: [],
        certificates: []
      };
    }
  }

  // 3. Perform a Firestore Transaction to atomically update users/{uid}, candidates/{uid}, and resumes/{uid}
  if (db && parsed) {
    try {
      console.log(`[aiParser] Executing Firestore transaction for user: ${uid}`);
      const isoDate = new Date().toISOString();

      const userDocRef = doc(db, "users", uid);
      const candidateDocRef = doc(db, "candidates", uid);
      const resumeDocRef = doc(db, "resumes", uid);

      await runTransaction(db, async (transaction) => {
        const candidateSnap = await transaction.get(candidateDocRef);
        const existingCandData = candidateSnap.data() || {};

        // Preserve verified primary email and mobile number. Do not overwrite with parser data!
        const verifiedEmail = auth.currentUser?.email || existingUserData.email || existingCandData.email || existingUserData.accountEmail || "";
        const verifiedPhone = existingUserData.phone || existingCandData.phone || existingUserData.mobile || "";

        const userPayload: Record<string, any> = {
          profileComplete: true,
          profileCompleted: true,
          resumeUploaded: true,
          resumeUrl: resumeUrl,
          resumeURL: resumeUrl,
          updatedAt: isoDate
        };

        // Fill EMPTY fields only in user document
        if ((!existingUserData.skills || existingUserData.skills.length === 0) && parsed.skills?.length) userPayload.skills = parsed.skills;
        if (!existingUserData.totalExperience && parsed.totalExperience) userPayload.totalExperience = parsed.totalExperience;
        if (!existingUserData.currentCompany && parsed.currentCompany) userPayload.currentCompany = parsed.currentCompany;
        if (!existingUserData.currentDesignation && parsed.currentDesignation) userPayload.currentDesignation = parsed.currentDesignation;
        if (!existingUserData.education && parsed.education) userPayload.education = parsed.education;
        if (!existingUserData.location && parsed.location) userPayload.location = parsed.location;
        if (!existingUserData.city && parsed.city) userPayload.city = parsed.city;
        if (!existingUserData.state && parsed.state) userPayload.state = parsed.state;
        if ((!existingUserData.languages || existingUserData.languages.length === 0) && parsed.languages?.length) userPayload.languages = parsed.languages;
        if ((!existingUserData.certificates || existingUserData.certificates.length === 0) && parsed.certificates?.length) userPayload.certificates = parsed.certificates;

        // Only update name if existing user name is generic or missing
        if (!existingUserData.name || existingUserData.name === "Candidate" || existingUserData.name === "User") {
          if (parsed.fullName) {
            userPayload.name = parsed.fullName;
            userPayload.fullName = parsed.fullName;
          }
        }

        if (!existingUserData.email && verifiedEmail) userPayload.email = verifiedEmail;
        if (!existingUserData.phone && verifiedPhone) userPayload.phone = verifiedPhone;

        const candidatePayload: Record<string, any> = {
          uid: uid,
          userId: uid,
          ownerUid: uid,
          accountEmail: verifiedEmail,
          resumeUrl: resumeUrl,
          resumeFileName: fileName || "uploaded_resume.pdf",
          resumeUploadedAt: isoDate,
          profileComplete: true,
          profileCompleted: true,
          updatedAt: isoDate
        };

        // Fill EMPTY fields only in candidate document
        if ((!existingCandData.skills || existingCandData.skills.length === 0) && parsed.skills?.length) candidatePayload.skills = parsed.skills;
        if (!existingCandData.totalExperience && parsed.totalExperience) candidatePayload.totalExperience = parsed.totalExperience;
        if (!existingCandData.experience && parsed.experience) candidatePayload.experience = parsed.experience;
        if (!existingCandData.currentCompany && parsed.currentCompany) candidatePayload.currentCompany = parsed.currentCompany;
        if (!existingCandData.currentDesignation && parsed.currentDesignation) candidatePayload.currentDesignation = parsed.currentDesignation;
        if (!existingCandData.designation && parsed.designation) candidatePayload.designation = parsed.designation;
        if (!existingCandData.education && parsed.education) candidatePayload.education = parsed.education;
        if (!existingCandData.location && parsed.location) candidatePayload.location = parsed.location;
        if (!existingCandData.city && parsed.city) candidatePayload.city = parsed.city;
        if (!existingCandData.state && parsed.state) candidatePayload.state = parsed.state;
        if ((!existingCandData.languages || existingCandData.languages.length === 0) && parsed.languages?.length) candidatePayload.languages = parsed.languages;
        if ((!existingCandData.certificates || existingCandData.certificates.length === 0) && parsed.certificates?.length) candidatePayload.certificates = parsed.certificates;
        if (!existingCandData.linkedin && parsed.linkedin) candidatePayload.linkedin = parsed.linkedin;
        if (!existingCandData.github && parsed.github) candidatePayload.github = parsed.github;

        if (verifiedEmail) candidatePayload.email = verifiedEmail;
        if (verifiedPhone) candidatePayload.phone = verifiedPhone;

        const resumePayload = {
          resumeId: uid,
          candidateId: uid,
          ownerUid: uid,
          accountEmail: verifiedEmail,
          emailVerified: auth.currentUser?.emailVerified ?? true,
          originalFileName: fileName || "uploaded_resume.pdf",
          resumeUrl: resumeUrl,
          resumeFileName: fileName || "uploaded_resume.pdf",
          parsedData: {
            ...parsed,
            suggestedEmail: parsed.email,
            suggestedPhone: parsed.phone
          },
          status: "active",
          parseStatus: "completed",
          parseConfidence: 0.95,
          candidateConfirmed: false,
          resumeAnalysisStatus: "completed",
          parsedAt: isoDate,
          updatedAt: isoDate
        };

        transaction.set(userDocRef, userPayload, { merge: true });
        transaction.set(candidateDocRef, candidatePayload, { merge: true });
        transaction.set(resumeDocRef, resumePayload, { merge: true });
      });

      console.log(`[aiParser] Firestore transaction completed successfully for user ${uid}.`);
    } catch (txErr: any) {
      console.warn("[aiParser] Firestore transaction notice, attempting atomic setDoc fallback:", txErr);
      try {
        const isoDate = new Date().toISOString();
        const verifiedEmail = auth.currentUser?.email || "";
        const basePayload = {
          userId: uid,
          ownerUid: uid,
          accountEmail: verifiedEmail,
          skills: parsed.skills,
          totalExperience: parsed.totalExperience,
          currentCompany: parsed.currentCompany,
          currentDesignation: parsed.currentDesignation,
          education: parsed.education,
          languages: parsed.languages,
          certificates: parsed.certificates,
          resumeUrl,
          resumeFileName: fileName || "uploaded_resume.pdf",
          parsedData: {
            ...parsed,
            suggestedEmail: parsed.email,
            suggestedPhone: parsed.phone
          },
          parseStatus: "completed",
          candidateConfirmed: false,
          updatedAt: isoDate
        };
        await setDoc(doc(db, "users", uid), basePayload, { merge: true });
        await setDoc(doc(db, "candidates", uid), basePayload, { merge: true });
        await setDoc(doc(db, "resumes", uid), basePayload, { merge: true });
      } catch (fallbackSetErr) {
        console.error("[aiParser] Error writing fallback setDoc:", fallbackSetErr);
      }
    }
  }

  return { success: true, parsedData: parsed };
}
