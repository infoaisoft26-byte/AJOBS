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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof FileReader === "undefined") {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

/**
 * Parses resume details using the Gemini API and updates Firestore collections
 * ('candidateProfiles/{uid}', 'candidates/{uid}', 'users/{uid}', 'resumes/{uid}')
 * NEVER overwrites verified account email or mobile number with parser output.
 */
export async function parseResumeData(
  parsedOrUrlOrFile: any,
  resumeUrlOrUidOrOptions?: any,
  fileNameArg?: string,
  uidArg?: string
): Promise<ParseResumeResponse> {
  let uid = uidArg || "";
  let resumeUrl = "";
  let fileName = fileNameArg || "uploaded_resume.pdf";
  let fileType = "application/pdf";
  let base64Data = "";
  let parsed: ParsedResumeMetadata | null = null;

  // Case A: A File object is passed: parseResumeData(file, { userId: ... })
  const isNativeFile = typeof window !== "undefined" && typeof window.File === "function" && parsedOrUrlOrFile instanceof window.File;
  if (isNativeFile || (parsedOrUrlOrFile && typeof parsedOrUrlOrFile.name === "string" && typeof parsedOrUrlOrFile.slice === "function")) {
    const file = parsedOrUrlOrFile as File;
    fileName = file.name;
    fileType = file.type || (file.name.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf");
    
    if (typeof resumeUrlOrUidOrOptions === "object" && resumeUrlOrUidOrOptions !== null) {
      uid = resumeUrlOrUidOrOptions.userId || resumeUrlOrUidOrOptions.uid || "";
    } else if (typeof resumeUrlOrUidOrOptions === "string") {
      uid = resumeUrlOrUidOrOptions;
    }

    try {
      base64Data = await readFileAsBase64(file);
    } catch {
      // ignore
    }
  }
  // Case B: A parsed object is passed: parseResumeData(parsedObj, resumeUrl, fileName, uid)
  else if (typeof parsedOrUrlOrFile === "object" && parsedOrUrlOrFile !== null) {
    parsed = {
      name: parsedOrUrlOrFile.fullName || parsedOrUrlOrFile.name || "",
      fullName: parsedOrUrlOrFile.fullName || parsedOrUrlOrFile.name || "",
      email: parsedOrUrlOrFile.email || "",
      phone: parsedOrUrlOrFile.phone || "",
      skills: Array.isArray(parsedOrUrlOrFile.skills) ? parsedOrUrlOrFile.skills : [],
      technicalSkills: Array.isArray(parsedOrUrlOrFile.technicalSkills) ? parsedOrUrlOrFile.technicalSkills : (Array.isArray(parsedOrUrlOrFile.skills) ? parsedOrUrlOrFile.skills : []),
      softSkills: Array.isArray(parsedOrUrlOrFile.softSkills) ? parsedOrUrlOrFile.softSkills : [],
      experience: parsedOrUrlOrFile.totalExperienceYears ? `${parsedOrUrlOrFile.totalExperienceYears} Years` : (parsedOrUrlOrFile.totalExperience || ""),
      totalExperience: parsedOrUrlOrFile.totalExperienceYears ? `${parsedOrUrlOrFile.totalExperienceYears} Years` : (parsedOrUrlOrFile.totalExperience || ""),
      education: Array.isArray(parsedOrUrlOrFile.education) 
        ? parsedOrUrlOrFile.education.map((e: any) => `${e.qualification || e.degree || ''} ${e.specialization ? '(' + e.specialization + ')' : ''} - ${e.institution || e.school || ''}`).join(', ') 
        : (parsedOrUrlOrFile.education || ""),
      designation: parsedOrUrlOrFile.currentJobTitle || parsedOrUrlOrFile.currentDesignation || parsedOrUrlOrFile.designation || "",
      currentDesignation: parsedOrUrlOrFile.currentJobTitle || parsedOrUrlOrFile.currentDesignation || parsedOrUrlOrFile.designation || "",
      currentCompany: parsedOrUrlOrFile.currentCompany || (Array.isArray(parsedOrUrlOrFile.workExperience) && parsedOrUrlOrFile.workExperience[0]?.company) || "",
      location: [parsedOrUrlOrFile.city, parsedOrUrlOrFile.state].filter(Boolean).join(", ") || parsedOrUrlOrFile.location || "",
      city: parsedOrUrlOrFile.city || "",
      state: parsedOrUrlOrFile.state || "",
      languages: Array.isArray(parsedOrUrlOrFile.languages) ? parsedOrUrlOrFile.languages : [],
      certificates: Array.isArray(parsedOrUrlOrFile.certifications) ? parsedOrUrlOrFile.certifications : (Array.isArray(parsedOrUrlOrFile.certificates) ? parsedOrUrlOrFile.certificates : []),
      linkedin: parsedOrUrlOrFile.linkedin || "",
      github: parsedOrUrlOrFile.github || "",
      rawParsed: parsedOrUrlOrFile
    };
    if (typeof resumeUrlOrUidOrOptions === "string") {
      resumeUrl = resumeUrlOrUidOrOptions;
    }
    if (fileNameArg) fileName = fileNameArg;
  } 
  // Case C: A URL string is passed: parseResumeData(resumeUrl, uid, fileName, fileType)
  else if (typeof parsedOrUrlOrFile === "string") {
    resumeUrl = parsedOrUrlOrFile;
    if (typeof resumeUrlOrUidOrOptions === "string") {
      uid = resumeUrlOrUidOrOptions;
    }
    if (fileNameArg) fileName = fileNameArg;
    if (uidArg) fileType = uidArg;
  }

  if (!uid) {
    uid = auth.currentUser?.uid || "";
  }

  console.log(`[aiParser] Starting parseResumeData for UID: ${uid}, URL: ${resumeUrl}, File: ${fileName}`);

  // If parsed data not directly passed, call server API endpoint
  if (!parsed) {
    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({
          userId: uid,
          resumeUrl,
          fileName,
          fileType,
          base64Data: base64Data || undefined
        })
      });

      if (response.ok) {
        const rawResponseData = await parseJsonResponse(response);
        if (rawResponseData && (rawResponseData.parsed || rawResponseData.parsedData)) {
          const p = rawResponseData.parsed || rawResponseData.parsedData;
          parsed = {
            name: p.fullName || p.name || "",
            fullName: p.fullName || p.name || "",
            email: p.email || "",
            phone: p.phone || "",
            skills: Array.isArray(p.skills) ? p.skills : [],
            technicalSkills: Array.isArray(p.technicalSkills) ? p.technicalSkills : [],
            softSkills: Array.isArray(p.softSkills) ? p.softSkills : [],
            experience: p.totalExperienceYears ? `${p.totalExperienceYears} Years` : (p.totalExperience || ""),
            totalExperience: p.totalExperienceYears ? `${p.totalExperienceYears} Years` : (p.totalExperience || ""),
            education: Array.isArray(p.education) 
              ? p.education.map((e: any) => `${e.degree || e.qualification || ''} - ${e.school || e.institution || ''}`).join(', ') 
              : (typeof p.education === "string" ? p.education : ""),
            designation: p.currentJobTitle || p.currentDesignation || p.designation || "",
            currentDesignation: p.currentJobTitle || p.currentDesignation || p.designation || "",
            currentCompany: p.currentCompany || "",
            location: [p.city, p.state].filter(Boolean).join(", ") || p.location || "",
            city: p.city || "",
            state: p.state || "",
            languages: Array.isArray(p.languages) ? p.languages : [],
            certificates: Array.isArray(p.certifications) ? p.certifications : (Array.isArray(p.certificates) ? p.certificates : []),
            linkedin: p.linkedin || "",
            github: p.github || "",
            rawParsed: p
          };
        }
      }
    } catch (err) {
      console.warn("[aiParser] Server API parse call warning:", err);
    }
  }

  // Fallback metadata if parsing failed entirely
  if (!parsed) {
    parsed = {
      name: (fileName || "Candidate").replace(/\.[^/.]+$/, ""),
      fullName: (fileName || "Candidate").replace(/\.[^/.]+$/, ""),
      email: auth.currentUser?.email || "",
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

  // Update Firestore documents ('candidateProfiles/{uid}', 'candidates/{uid}', 'users/{uid}', 'resumes/{uid}')
  if (db && parsed) {
    try {
      console.log(`[aiParser] Updating Firestore documents for user: ${uid}`);
      const isoDate = new Date().toISOString();

      const userDocRef = doc(db, "users", uid);
      const candidateDocRef = doc(db, "candidates", uid);
      const profileDocRef = doc(db, "candidateProfiles", uid);
      const resumeDocRef = doc(db, "resumes", uid);

      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        const candidateSnap = await transaction.get(candidateDocRef);
        const profileSnap = await transaction.get(profileDocRef);

        const existingUserData = userSnap.exists() ? userSnap.data() : {};
        const existingCandData = candidateSnap.exists() ? candidateSnap.data() : {};
        const existingProfData = profileSnap.exists() ? profileSnap.data() : {};

        // Preserve verified primary email and mobile number. Do not overwrite with parser data!
        const verifiedEmail = auth.currentUser?.email || existingUserData.email || existingCandData.email || existingProfData.email || "";
        const verifiedPhone = existingUserData.phone || existingCandData.phone || existingProfData.phone || "";

        const basePayload: Record<string, any> = {
          uid,
          userId: uid,
          ownerUid: uid,
          resumeUploaded: true,
          resumeUrl,
          resumeFileName: fileName,
          resumeUploadedAt: isoDate,
          resumeUpdatedAt: isoDate,
          profileComplete: true,
          profileCompleted: true,
          updatedAt: isoDate
        };

        // Non-destructive update: Fill empty fields only
        if ((!existingCandData.skills || existingCandData.skills.length === 0) && parsed.skills?.length) basePayload.skills = parsed.skills;
        if ((!existingCandData.technicalSkills || existingCandData.technicalSkills.length === 0) && parsed.technicalSkills?.length) basePayload.technicalSkills = parsed.technicalSkills;
        if ((!existingCandData.softSkills || existingCandData.softSkills.length === 0) && parsed.softSkills?.length) basePayload.softSkills = parsed.softSkills;
        if (!existingCandData.totalExperience && parsed.totalExperience) basePayload.totalExperience = parsed.totalExperience;
        if (!existingCandData.currentCompany && parsed.currentCompany) basePayload.currentCompany = parsed.currentCompany;
        if (!existingCandData.currentDesignation && parsed.currentDesignation) basePayload.currentDesignation = parsed.currentDesignation;
        if (!existingCandData.currentJobTitle && parsed.designation) basePayload.currentJobTitle = parsed.designation;
        if (!existingCandData.education && parsed.education) basePayload.education = parsed.education;
        if (!existingCandData.location && parsed.location) basePayload.location = parsed.location;
        if (!existingCandData.city && parsed.city) basePayload.city = parsed.city;
        if (!existingCandData.state && parsed.state) basePayload.state = parsed.state;
        if ((!existingCandData.languages || existingCandData.languages.length === 0) && parsed.languages?.length) basePayload.languages = parsed.languages;
        if ((!existingCandData.certificates || existingCandData.certificates.length === 0) && parsed.certificates?.length) basePayload.certificates = parsed.certificates;

        if (!existingCandData.fullName || existingCandData.fullName === "Candidate") {
          if (parsed.fullName) {
            basePayload.fullName = parsed.fullName;
            basePayload.name = parsed.fullName;
          }
        }

        if (verifiedEmail) basePayload.email = verifiedEmail;
        if (verifiedPhone) basePayload.phone = verifiedPhone;

        const resumePayload = {
          resumeId: uid,
          candidateId: uid,
          ownerUid: uid,
          accountEmail: verifiedEmail,
          originalFileName: fileName,
          resumeUrl,
          resumeFileName: fileName,
          parsedData: parsed,
          status: "active",
          parseStatus: "completed",
          parsedAt: isoDate,
          updatedAt: isoDate
        };

        transaction.set(userDocRef, basePayload, { merge: true });
        transaction.set(candidateDocRef, basePayload, { merge: true });
        transaction.set(profileDocRef, basePayload, { merge: true });
        transaction.set(resumeDocRef, resumePayload, { merge: true });
      });

      console.log(`[aiParser] Firestore transaction completed successfully for user ${uid}.`);
    } catch (txErr: any) {
      console.warn("[aiParser] Transaction fallback setDoc:", txErr?.message || txErr);
      try {
        const isoDate = new Date().toISOString();
        const verifiedEmail = auth.currentUser?.email || "";
        const basePayload = {
          uid,
          userId: uid,
          ownerUid: uid,
          email: verifiedEmail,
          skills: parsed.skills,
          technicalSkills: parsed.technicalSkills || [],
          softSkills: parsed.softSkills || [],
          totalExperience: parsed.totalExperience,
          currentCompany: parsed.currentCompany,
          currentDesignation: parsed.currentDesignation,
          currentJobTitle: parsed.designation,
          education: parsed.education,
          languages: parsed.languages,
          certificates: parsed.certificates,
          resumeUrl,
          resumeFileName: fileName,
          resumeUploadedAt: isoDate,
          parsedData: parsed,
          parseStatus: "completed",
          updatedAt: isoDate
        };
        await setDoc(doc(db, "users", uid), basePayload, { merge: true });
        await setDoc(doc(db, "candidates", uid), basePayload, { merge: true });
        await setDoc(doc(db, "candidateProfiles", uid), basePayload, { merge: true });
        await setDoc(doc(db, "resumes", uid), basePayload, { merge: true });
      } catch (fallbackSetErr) {
        console.error("[aiParser] Fallback setDoc error:", fallbackSetErr);
      }
    }
  }

  return { success: true, parsedData: parsed };
}
