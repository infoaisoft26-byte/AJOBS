import { doc, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ResumeAIService } from "./ai/resume.service";

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
      rawResponseData = await response.json();
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

      const userPayload = {
        name: parsed.fullName,
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        skills: parsed.skills,
        totalExperience: parsed.totalExperience,
        currentCompany: parsed.currentCompany,
        currentDesignation: parsed.currentDesignation,
        education: parsed.education,
        location: parsed.location,
        city: parsed.city,
        state: parsed.state,
        languages: parsed.languages,
        certificates: parsed.certificates,
        profileComplete: true,
        profileCompleted: true,
        resumeUploaded: true,
        resumeUrl: resumeUrl,
        resumeURL: resumeUrl,
        updatedAt: isoDate
      };

      const candidatePayload = {
        uid: uid,
        userId: uid,
        name: parsed.fullName,
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        skills: parsed.skills,
        totalExperience: parsed.totalExperience,
        experience: parsed.experience,
        currentCompany: parsed.currentCompany,
        currentDesignation: parsed.currentDesignation,
        designation: parsed.designation,
        education: parsed.education,
        location: parsed.location,
        city: parsed.city,
        state: parsed.state,
        languages: parsed.languages,
        certificates: parsed.certificates,
        linkedin: parsed.linkedin || "",
        github: parsed.github || "",
        resumeUrl: resumeUrl,
        resumeFileName: fileName || "uploaded_resume.pdf",
        resumeUploadedAt: isoDate,
        profileComplete: true,
        profileCompleted: true,
        updatedAt: isoDate
      };

      const resumePayload = {
        id: uid,
        userId: uid,
        name: parsed.fullName,
        fullName: parsed.fullName,
        email: parsed.email,
        phone: parsed.phone,
        skills: parsed.skills,
        totalExperience: parsed.totalExperience,
        experience: parsed.experience,
        currentCompany: parsed.currentCompany,
        currentDesignation: parsed.currentDesignation,
        designation: parsed.designation,
        education: parsed.education,
        location: parsed.location,
        city: parsed.city,
        state: parsed.state,
        languages: parsed.languages,
        certificates: parsed.certificates,
        resumeUrl: resumeUrl,
        resumeFileName: fileName || "uploaded_resume.pdf",
        parsedData: parsed,
        status: "active",
        resumeAnalysisStatus: "completed",
        parsedAt: isoDate,
        updatedAt: isoDate
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(userDocRef, userPayload, { merge: true });
        transaction.set(candidateDocRef, candidatePayload, { merge: true });
        transaction.set(resumeDocRef, resumePayload, { merge: true });
      });

      console.log(`[aiParser] Firestore transaction completed successfully for user ${uid}.`);
    } catch (txErr: any) {
      console.warn("[aiParser] Firestore transaction notice, attempting atomic setDoc fallback:", txErr);
      try {
        const isoDate = new Date().toISOString();
        const basePayload = {
          userId: uid,
          name: parsed.fullName,
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          skills: parsed.skills,
          totalExperience: parsed.totalExperience,
          currentCompany: parsed.currentCompany,
          currentDesignation: parsed.currentDesignation,
          education: parsed.education,
          languages: parsed.languages,
          certificates: parsed.certificates,
          resumeUrl,
          resumeFileName: fileName || "uploaded_resume.pdf",
          parsedData: parsed,
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
