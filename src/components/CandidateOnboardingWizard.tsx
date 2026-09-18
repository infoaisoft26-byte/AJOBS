import React, { useEffect, useRef, useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile,
  sendEmailVerification 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Award, 
  BadgeCheck, 
  BookOpen, 
  Briefcase, 
  Building2, 
  Calendar, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  ExternalLink, 
  FileText, 
  GraduationCap, 
  Languages, 
  Layers, 
  Lock, 
  Mail, 
  MapPin, 
  Phone, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  Target, 
  Upload, 
  User, 
  X 
} from "lucide-react";
import { auth, db, googleProvider } from "../firebase";
import { JobPosting, UserProfile } from "../types";
import { getJobById } from "../services/jobService";
import { parseResumeData } from "../services/aiParser";
import { uploadToCloudinary } from "../services/cloudinaryService";
import { getNextSequentialId } from "../services/sequentialIdService";
import { 
  captureAttribution, 
  getStoredAttribution, 
  getIntendedJobId, 
  clearIntendedJobId, 
  AttributionData 
} from "../utils/attribution";
import { 
  trackCandidateRegistrationStarted, 
  trackCandidateRegistrationComplete, 
  trackResumeUploaded 
} from "../utils/analytics";
import { useToast } from "./GlobalToast";
import AIJobsLogo from "./AIJobsLogo";
import CandidateEmailVerification from "./CandidateEmailVerification";

interface CandidateOnboardingWizardProps {
  onRegisterSuccess: (userProfile: UserProfile) => void;
  onNavigateToLogin: () => void;
  initialJobId?: string;
  initialStep?: number;
}

// Popular India Metro and Tech Hubs for Preferred Job Cities
const POPULAR_INDIA_CITIES = [
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Noida",
  "Gurugram",
  "Chandigarh",
  "Indore",
  "Remote / India"
];

// Education Options
const EDUCATION_LEVELS = [
  "10th or Below",
  "12th Pass",
  "Diploma",
  "ITI",
  "Graduate",
  "Post Graduate"
];

// Popular Skill Suggestions
const SKILL_SUGGESTIONS = [
  "React",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "SQL",
  "Node.js",
  "HTML/CSS",
  "Data Analysis",
  "Excel",
  "Digital Marketing",
  "Sales",
  "Customer Support",
  "Communication",
  "Operations",
  "Content Writing",
  "Graphic Design",
  "Project Management",
  "Git",
  "C++"
];

// Popular Regional Languages of India
const REGIONAL_LANGUAGES = [
  "Hindi",
  "Marathi",
  "Telugu",
  "Tamil",
  "Bengali",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Urdu",
  "Odia",
  "Assamese"
];

// Popular Role Suggestions
const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Business Development Executive",
  "Sales Executive",
  "Digital Marketing Executive",
  "HR Executive",
  "Operations Associate",
  "Customer Support Specialist",
  "Product Manager",
  "UI/UX Designer",
  "Accountant"
];

const STORAGE_DRAFT_KEY = "aijobs_candidate_draft_v2";

export default function CandidateOnboardingWizard({
  onRegisterSuccess,
  onNavigateToLogin,
  initialJobId,
  initialStep = 1
}: CandidateOnboardingWizardProps) {
  const { showToast } = useToast();

  // Intended Job State
  const [intendedJobId, setIntendedJobId] = useState<string | null>(() => {
    return initialJobId || getIntendedJobId();
  });
  const [intendedJob, setIntendedJob] = useState<JobPosting | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);

  // Marketing attribution data
  const [attribution, setAttribution] = useState<AttributionData>(() => {
    return captureAttribution();
  });

  // Wizard Step (1 to 10)
  const [step, setStep] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedDraft = sessionStorage.getItem(STORAGE_DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.step && parsed.step >= 1 && parsed.step <= 10) {
            return parsed.step;
          }
        } catch {}
      }
    }
    return initialStep;
  });

  // Step 1: Basic Profile
  const [fullName, setFullName] = useState("");
  const [highestEducation, setHighestEducation] = useState("Graduate");
  const [onboardingChoice, setOnboardingChoice] = useState<"manual" | "resume">("manual");

  // Step 2: Personal Details & Auth
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "Prefer not to say">("Male");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailConsent, setEmailConsent] = useState(true);

  // Step 3: Location Details
  const [currentCity, setCurrentCity] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [preferredCities, setPreferredCities] = useState<string[]>(["Bengaluru"]);
  const [customCityInput, setCustomCityInput] = useState("");

  // Step 4: Education Details
  const [pursuingEducation, setPursuingEducation] = useState<"Yes" | "No">("No");
  const [instituteName, setInstituteName] = useState("");
  const [degree, setDegree] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [completionYear, setCompletionYear] = useState("2024");
  const [completionMonth, setCompletionMonth] = useState("May");
  const [schoolBoard, setSchoolBoard] = useState("CBSE");
  const [schoolName, setSchoolName] = useState("");
  const [passingYear, setPassingYear] = useState("2020");
  const [medium, setMedium] = useState<"English" | "Hindi" | "Regional Language">("English");

  // Step 5: Experience Details
  const [workStatus, setWorkStatus] = useState<"experienced" | "fresher">("experienced");
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [totalExperienceYears, setTotalExperienceYears] = useState("1-3 Years");
  const [currentSalary, setCurrentSalary] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("Immediate");
  const [industry, setIndustry] = useState("IT & Software");
  const [department, setDepartment] = useState("Software Engineering");

  // Step 6: Skills
  const [skills, setSkills] = useState<string[]>(["JavaScript", "React"]);
  const [skillInput, setSkillInput] = useState("");

  // Step 7: Language
  const [englishProficiency, setEnglishProficiency] = useState<"No English" | "Basic" | "Intermediate" | "Advanced">("Intermediate");
  const [otherLanguages, setOtherLanguages] = useState<string[]>(["Hindi"]);

  // Step 8: Preferred Job Role
  const [preferredRoles, setPreferredRoles] = useState<string[]>(["Software Engineer"]);
  const [roleInput, setRoleInput] = useState("");
  const [preferredWorkMode, setPreferredWorkMode] = useState<"any" | "in_office" | "hybrid" | "remote">("any");
  const [preferredJobType, setPreferredJobType] = useState<"full_time" | "part_time" | "internship" | "contract">("full_time");

  // Step 9: Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>("");
  const [resumeFileName, setResumeFileName] = useState<string>("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // General State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredProfile, setRegisteredProfile] = useState<UserProfile | null>(null);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [createdUid, setCreatedUid] = useState<string>("");

  // 1. Fetch real intended job if provided in URL or attribution
  useEffect(() => {
    let isMounted = true;
    async function loadJob() {
      const jId = intendedJobId;
      if (!jId) return;
      try {
        setLoadingJob(true);
        const job = await getJobById(jId);
        if (job && isMounted) {
          setIntendedJob(job);
          // Set role suggestions based on intended job
          if (job.title && !preferredRoles.includes(job.title)) {
            setPreferredRoles((prev) => [job.title, ...prev.slice(0, 4)]);
          }
          if (job.location) {
            setCurrentCity(job.location.split(",")[0].trim());
          }
        }
      } catch (err) {
        console.warn("[CandidateOnboarding] Could not load intended job:", err);
      } finally {
        if (isMounted) setLoadingJob(false);
      }
    }
    loadJob();
    return () => { isMounted = false; };
  }, [intendedJobId]);

  // 2. Capture attribution on mount
  useEffect(() => {
    const attr = captureAttribution();
    setAttribution(attr);
    trackCandidateRegistrationStarted(attr.gclid ? "google_ads" : "organic");
  }, []);

  // 3. Load Draft from SessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.fullName) setFullName(d.fullName);
        if (d.highestEducation) setHighestEducation(d.highestEducation);
        if (d.email) setEmail(d.email);
        if (d.phone) setPhone(d.phone);
        if (d.dob) setDob(d.dob);
        if (d.gender) setGender(d.gender);
        if (d.currentCity) setCurrentCity(d.currentCity);
        if (d.currentState) setCurrentState(d.currentState);
        if (Array.isArray(d.preferredCities) && d.preferredCities.length) setPreferredCities(d.preferredCities);
        if (d.workStatus) setWorkStatus(d.workStatus);
        if (d.currentJobTitle) setCurrentJobTitle(d.currentJobTitle);
        if (d.currentCompany) setCurrentCompany(d.currentCompany);
        if (d.totalExperienceYears) setTotalExperienceYears(d.totalExperienceYears);
        if (d.currentSalary) setCurrentSalary(d.currentSalary);
        if (Array.isArray(d.skills) && d.skills.length) setSkills(d.skills);
        if (d.englishProficiency) setEnglishProficiency(d.englishProficiency);
        if (Array.isArray(d.otherLanguages)) setOtherLanguages(d.otherLanguages);
        if (Array.isArray(d.preferredRoles) && d.preferredRoles.length) setPreferredRoles(d.preferredRoles);
        if (d.resumeUrl) setResumeUrl(d.resumeUrl);
        if (d.resumeFileName) setResumeFileName(d.resumeFileName);
      }
    } catch {}
  }, []);

  // 4. Autosave draft on state change
  useEffect(() => {
    try {
      const draft = {
        step,
        fullName,
        highestEducation,
        email,
        phone,
        dob,
        gender,
        currentCity,
        currentState,
        preferredCities,
        pursuingEducation,
        instituteName,
        degree,
        specialization,
        completionYear,
        schoolBoard,
        schoolName,
        passingYear,
        workStatus,
        currentJobTitle,
        currentCompany,
        totalExperienceYears,
        currentSalary,
        noticePeriod,
        skills,
        englishProficiency,
        otherLanguages,
        preferredRoles,
        preferredWorkMode,
        preferredJobType,
        resumeUrl,
        resumeFileName
      };
      sessionStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [
    step, fullName, highestEducation, email, phone, dob, gender,
    currentCity, currentState, preferredCities, pursuingEducation,
    instituteName, degree, specialization, completionYear, schoolBoard,
    schoolName, passingYear, workStatus, currentJobTitle, currentCompany,
    totalExperienceYears, currentSalary, noticePeriod, skills,
    englishProficiency, otherLanguages, preferredRoles, preferredWorkMode,
    preferredJobType, resumeUrl, resumeFileName
  ]);

  // Calculate Profile Completion Score (0-100%)
  const calculateCompletionScore = () => {
    let score = 10; // Started
    if (fullName.trim()) score += 10;
    if (email.trim() && phone.trim()) score += 15;
    if (currentCity.trim()) score += 10;
    if (highestEducation) score += 15;
    if (workStatus === "fresher" || (currentJobTitle && currentCompany)) score += 15;
    if (skills.length > 0) score += 15;
    if (preferredRoles.length > 0) score += 10;
    if (resumeUrl) score += 10;
    return Math.min(100, score);
  };

  // -------------------------------------------------------------
  // Resume Upload Handler (Step 1 fast-track or Step 9)
  // -------------------------------------------------------------
  const handleResumeFileSelect = async (file: File) => {
    setErrorMsg("");
    setParseError(null);
    if (!file) return;

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg("Resume file size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }

    const allowed = [".pdf", ".docx", ".doc", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMsg("Please upload a PDF, DOC, DOCX, or TXT file.");
      return;
    }

    setResumeFile(file);
    setResumeFileName(file.name);
    setIsUploadingResume(true);
    setUploadProgress(20);

    try {
      // 1. Upload to Cloudinary / storage
      const uidForUpload = auth.currentUser?.uid || createdUid || `temp_${Date.now()}`;
      setUploadProgress(50);
      const uploadRes = await uploadToCloudinary(file, {
        folder: "candidate_resumes",
        publicId: `resume_${uidForUpload}`
      });

      const uploadedUrl = uploadRes.secureUrl || uploadRes.url || "";
      setResumeUrl(uploadedUrl);
      setUploadProgress(80);

      trackResumeUploaded(ext, "candidate_wizard");

      // 2. Parse resume using Gemini API parser
      setIsParsingResume(true);
      try {
        const parseResult = await parseResumeData(file, { userId: uidForUpload }, file.name);
        if (parseResult && parseResult.success && parseResult.parsedData) {
          const p = parseResult.parsedData;
          setParsedSummary(`Parsed ${p.skills?.length || 0} skills, ${p.designation || "experience"}`);
          
          // Auto-fill fields if not already populated by user
          if (p.fullName && !fullName.trim()) setFullName(p.fullName);
          if (p.email && !email.trim()) setEmail(p.email);
          if (p.phone && !phone.trim()) setPhone(p.phone);
          if (p.city && !currentCity.trim()) setCurrentCity(p.city);
          if (p.state && !currentState.trim()) setCurrentState(p.state);
          if (p.designation && !currentJobTitle.trim()) setCurrentJobTitle(p.designation);
          if (p.currentCompany && !currentCompany.trim()) setCurrentCompany(p.currentCompany);
          if (p.skills && p.skills.length) {
            setSkills((prev) => Array.from(new Set([...prev, ...p.skills.slice(0, 10)])));
          }
          if (p.designation && !preferredRoles.includes(p.designation)) {
            setPreferredRoles((prev) => [p.designation, ...prev]);
          }
          showToast("Resume parsed! We've auto-filled relevant details.", "success");
        } else {
          // Never claim resume parsed if parser failed
          setParseError("Could not automatically extract all fields, but your file is safely attached.");
        }
      } catch (parseErr) {
        console.warn("[ResumeParser] Parse error handled gracefully:", parseErr);
        setParseError("Auto-fill unavailable for this document format, but your resume is saved.");
      } finally {
        setIsParsingResume(false);
      }

      setUploadProgress(100);
      showToast("Resume attached successfully!", "success");
    } catch (uploadErr: any) {
      console.error("[Resume Upload Error]:", uploadErr);
      setErrorMsg("Failed to upload resume document. You can skip this step and upload later.");
    } finally {
      setIsUploadingResume(false);
    }
  };

  // -------------------------------------------------------------
  // Firestore Candidate Persistence
  // -------------------------------------------------------------
  const saveCandidateData = async (uid: string, targetEmail: string, targetName: string, isEmailVerified: boolean): Promise<UserProfile> => {
    const nowIso = new Date().toISOString();
    const candidateId = await getNextSequentialId("candidates").catch(() => `CAN-${uid.slice(0, 6).toUpperCase()}`);
    const finalScore = calculateCompletionScore();

    const userProfile: UserProfile = {
      uid,
      name: targetName,
      email: targetEmail,
      phone: phone.trim() || undefined,
      role: "candidate",
      emailVerified: isEmailVerified,
      status: "active",
      accountStatus: isEmailVerified ? "active" : "pending_verification",
      profileCompleted: true,
      resumeURL: resumeUrl || undefined,
      createdAt: nowIso,
      lastLogin: nowIso
    };

    const detailedProfileData = {
      uid,
      candidateId,
      name: targetName,
      fullName: targetName,
      email: targetEmail,
      phone: phone.trim(),
      role: "candidate",
      emailVerified: isEmailVerified,
      verificationStatus: isEmailVerified ? "verified" : "pending",
      accountStatus: isEmailVerified ? "active" : "pending_verification",
      profileStatus: "complete",
      profileCompletion: finalScore,
      onboardingStep: "completed",
      dob,
      gender,
      whatsappConsent,
      emailConsent,
      // Location
      location: [currentCity, currentState].filter(Boolean).join(", ") || "India",
      currentCity,
      currentState,
      preferredCities,
      // Education
      highestEducation,
      pursuingEducation,
      educationDetails: {
        highestEducation,
        pursuingEducation,
        instituteName,
        degree,
        specialization,
        completionYear,
        completionMonth,
        schoolBoard,
        schoolName,
        passingYear,
        medium
      },
      // Experience
      experienceType: workStatus,
      workStatus,
      targetRole: preferredRoles[0] || currentJobTitle || "Software Engineer",
      currentJobTitle,
      currentCompany,
      experience: totalExperienceYears,
      totalExperienceYears,
      currentSalary,
      noticePeriod,
      industry,
      department,
      // Skills & Languages
      skills,
      englishProficiency,
      languages: ["English", ...otherLanguages],
      // Preferences
      preferredRoles,
      preferredWorkMode,
      preferredJobType,
      preferredLocation: preferredCities.join(", ") || "Remote / India",
      // Resume
      resumeUrl: resumeUrl || null,
      resumeFileName: resumeFileName || null,
      resumeScore: resumeUrl ? 85 : null,
      // Marketing Attribution & Google Ads tracking
      intendedJobId: intendedJobId || null,
      gclid: attribution.gclid || null,
      utm_source: attribution.utm_source || null,
      utm_medium: attribution.utm_medium || null,
      utm_campaign: attribution.utm_campaign || null,
      utm_content: attribution.utm_content || null,
      utm_term: attribution.utm_term || null,
      acquisitionSource: attribution.gclid ? "google_ads" : (attribution.utm_source || "organic"),
      referrer: attribution.referrer || document.referrer || "direct",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Save across all 3 Firestore collections in parallel
    await Promise.all([
      setDoc(doc(db, "users", uid), {
        ...userProfile,
        candidateId,
        intendedJobId: intendedJobId || null,
        gclid: attribution.gclid || null,
        utm_source: attribution.utm_source || null,
        utm_campaign: attribution.utm_campaign || null,
        acquisitionSource: attribution.gclid ? "google_ads" : "organic",
        profileCompletion: finalScore,
        createdAt: nowIso,
        updatedAt: nowIso
      }, { merge: true }),
      setDoc(doc(db, "candidates", uid), detailedProfileData, { merge: true }),
      setDoc(doc(db, "candidateProfiles", uid), detailedProfileData, { merge: true })
    ]);

    // Fire Google Ads & GA4 conversion telemetry event
    try {
      trackCandidateRegistrationComplete({
        method: auth.currentUser?.providerData[0]?.providerId || "email",
        gclid: attribution.gclid,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        intendedJobId: intendedJobId || undefined
      });
    } catch (e) {
      console.debug("[Telemetry] Notice tracking conversion:", e);
    }

    return userProfile;
  };

  // -------------------------------------------------------------
  // Account Creation / Step 2 Submission
  // -------------------------------------------------------------
  const handleCreateAccountStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("Please fill in your full name, email address, and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    if (!termsAccepted) {
      setErrorMsg("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      setCreatedUid(cred.user.uid);

      // 2. Trigger Email OTP verification non-blockingly
      try {
        await fetch("/api/auth/candidate/send-email-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            name: fullName.trim()
          })
        });
      } catch (otpErr) {
        console.warn("[CandidateOnboarding] OTP trigger note:", otpErr);
      }

      // 3. Fallback Firebase verification email
      await sendEmailVerification(cred.user).catch(() => {});

      // 4. Initial partial save
      const profile = await saveCandidateData(cred.user.uid, email.trim(), fullName.trim(), false);
      setRegisteredProfile(profile);

      showToast("Account created! Let's complete your profile details.", "success");
      setStep(3); // Move forward to Location
    } catch (err: any) {
      console.error("[Candidate Registration Error]:", err);
      let msg = "Failed to create account. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email address is already registered. Please log in instead or use another email.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Please use at least 6 characters.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-Up Alternative
  const handleGoogleSignUp = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const displayName = res.user.displayName || fullName.trim() || res.user.email?.split("@")[0] || "Candidate";
      const userEmail = res.user.email || "";
      
      setFullName(displayName);
      setEmail(userEmail);
      setCreatedUid(res.user.uid);

      const isVerified = res.user.emailVerified === true;
      const profile = await saveCandidateData(res.user.uid, userEmail, displayName, isVerified);
      setRegisteredProfile(profile);

      showToast(`Signed up with Google as ${displayName}!`, "success");
      setStep(3); // Move to Location
    } catch (err: any) {
      console.error("[Google Sign-up Error]:", err);
      setErrorMsg("Google Sign-up was cancelled or failed. Please try email registration.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Final Completion (Step 9 -> Step 10)
  // -------------------------------------------------------------
  const handleFinalizeProfile = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid || createdUid;
      if (uid) {
        const userEmail = auth.currentUser?.email || email.trim();
        const userName = auth.currentUser?.displayName || fullName.trim();
        const isVerified = auth.currentUser?.emailVerified === true;
        const profile = await saveCandidateData(uid, userEmail, userName, isVerified);
        setRegisteredProfile(profile);
      }
      setStep(10); // Success step
      showToast("🎉 Profile completed successfully!", "success");
    } catch (err) {
      console.error("[Finalize Profile Error]:", err);
      showToast("Profile saved with minor warnings. Proceeding to matching jobs.", "info");
      setStep(10);
    } finally {
      setLoading(false);
    }
  };

  // Clear draft on successful completion
  const handleFinishAndProceed = () => {
    sessionStorage.removeItem(STORAGE_DRAFT_KEY);
    clearIntendedJobId();
    if (registeredProfile) {
      onRegisterSuccess(registeredProfile);
    } else {
      window.location.href = intendedJob ? `/jobs/${intendedJob.id}` : "/candidate/dashboard";
    }
  };

  // Skill Add / Remove
  const handleAddSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  // Preferred City Toggle
  const handleToggleCity = (city: string) => {
    if (preferredCities.includes(city)) {
      if (preferredCities.length > 1) {
        setPreferredCities(preferredCities.filter(c => c !== city));
      }
    } else {
      if (preferredCities.length < 8) {
        setPreferredCities([...preferredCities, city]);
      } else {
        showToast("You can select up to 8 preferred cities", "warning");
      }
    }
  };

  // Preferred Role Add / Remove
  const handleAddRole = (role: string) => {
    const trimmed = role.trim();
    if (trimmed && !preferredRoles.includes(trimmed)) {
      if (preferredRoles.length < 5) {
        setPreferredRoles([...preferredRoles, trimmed]);
        setRoleInput("");
      } else {
        showToast("You can add up to 5 preferred roles", "warning");
      }
    }
  };

  const handleRemoveRole = (role: string) => {
    if (preferredRoles.length > 1) {
      setPreferredRoles(preferredRoles.filter(r => r !== role));
    }
  };

  // If email verification modal is active
  if (showVerificationScreen && registeredProfile) {
    return (
      <CandidateEmailVerification
        user={registeredProfile}
        candidateName={fullName || registeredProfile.name}
        onVerified={(verified) => {
          setRegisteredProfile(verified);
          setShowVerificationScreen(false);
          setStep(10);
        }}
        onSignOut={() => {
          setShowVerificationScreen(false);
          onNavigateToLogin();
        }}
      />
    );
  }

  const completionPct = calculateCompletionScore();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col justify-between" id="candidate-onboarding-root">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AIJobsLogo size="md" variant="full" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold tracking-wide border border-blue-200">
              Candidate Onboarding
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Free for Job Seekers</span>
            </div>

            <button
              onClick={onNavigateToLogin}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Already Registered? Login
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Responsive Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: AIJOBS Brand, Value Props, & Target Job Card */}
          {/* ======================================================== */}
          <div className="hidden lg:flex lg:col-span-4 flex-col space-y-6 sticky top-24">
            
            {/* Brand Banner Card */}
            <div className="bg-[#07152F] text-white rounded-2xl p-6 shadow-xl border border-blue-900/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-300 text-xs font-mono font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>AI-POWERED MATCHMAKING</span>
                </div>

                <h1 className="text-2xl font-black text-white leading-tight">
                  Complete your profile to unlock verified hiring.
                </h1>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Join thousands of Indian job seekers getting direct interview calls with top companies.
                </p>

                {/* 3 Value Propositions */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Target className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Personalized Job Matches</p>
                      <p className="text-[11px] text-slate-400">Tailored to your skills, education, and preferred cities.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Direct Recruiter Opportunities</p>
                      <p className="text-[11px] text-slate-400">Verified corporate recruiters and authorized consultants.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <BadgeCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Job Application Updates</p>
                      <p className="text-[11px] text-slate-400">Real-time status tracking from Under Review to Interview.</p>
                    </div>
                  </div>
                </div>

                {/* Trust Badge */}
                <div className="pt-4 border-t border-slate-700/60">
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>100% Free for Job Seekers</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                    AIJOBS does not charge candidates for job applications or placement. Never pay anyone for job offers or interviews.
                  </p>
                </div>
              </div>
            </div>

            {/* If user came from Google Ads with an Intended Job: Real Job Card */}
            {intendedJob && (
              <div className="bg-white rounded-2xl p-5 border-2 border-blue-500/30 shadow-md space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                    Applying For
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {intendedJob.workMode || intendedJob.type || "Full Time"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {intendedJob.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {intendedJob.companyName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {intendedJob.location}
                  </span>
                  {intendedJob.salary && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      ₹ {intendedJob.salary}
                    </span>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Complete profile to confirm your application for this job.</span>
                </div>
              </div>
            )}

            {/* Profile Completion Meter */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">Profile Strength</span>
                <span className="text-blue-600 font-mono">{completionPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {completionPct < 50 ? "Add your education and experience to stand out." : "Great profile! Recruiters can match you directly."}
              </p>
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: The 10-Step Interactive Onboarding Form    */}
          {/* ======================================================== */}
          <div className="col-span-1 lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8 lg:p-10 relative">
            
            {/* Progress Indicator */}
            {step < 10 && (
              <div className="mb-6 pb-6 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px]">
                      Step {step} of 10
                    </span>
                    <span className="text-slate-700">
                      {step === 1 && "Basic Profile"}
                      {step === 2 && "Personal Details"}
                      {step === 3 && "Location Preferences"}
                      {step === 4 && "Education"}
                      {step === 5 && "Work Experience"}
                      {step === 6 && "Key Skills"}
                      {step === 7 && "Languages"}
                      {step === 8 && "Target Roles"}
                      {step === 9 && "Resume Upload"}
                    </span>
                  </div>
                  <span className="text-blue-600 font-mono">{Math.round((step / 10) * 100)}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(step / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Notification */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 1: BASIC PROFILE & FAST TRACK RESUME OPTION          */}
            {/* -------------------------------------------------------- */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Tell us your basic details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Start your AIJOBS profile in 2 quick steps.
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Tell us your full name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Highest Level of Education */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    What is your highest level of education? *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {EDUCATION_LEVELS.map((edu) => (
                      <button
                        key={edu}
                        type="button"
                        onClick={() => setHighestEducation(edu)}
                        className={`py-3 px-3.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                          highestEducation === edu
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {edu}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fast-Track with Resume Box */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 space-y-3">
                    <div className="flex items-center gap-2 text-blue-900">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Fast-track your AIJOBS profile</span>
                    </div>
                    
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Have a resume? Upload it now and our AI parser will auto-fill your education, experience, and skills!
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleResumeFileSelect(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingResume}
                        className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isUploadingResume ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading Resume ({uploadProgress}%)...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{resumeFileName ? "Replace Resume" : "Upload Resume (PDF/DOC)"}</span>
                          </>
                        )}
                      </button>

                      {resumeFileName && (
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="truncate max-w-[200px]">{resumeFileName}</span>
                        </div>
                      )}
                    </div>

                    {parsedSummary && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        ✓ {parsedSummary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary Next Action */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!fullName.trim()) {
                        setErrorMsg("Please enter your full name.");
                        return;
                      }
                      setErrorMsg("");
                      setStep(2);
                    }}
                    className="w-full sm:w-auto py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Continue to Personal Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 2: PERSONAL DETAILS & REGISTRATION ACCOUNT          */}
            {/* -------------------------------------------------------- */}
            {step === 2 && (
              <form onSubmit={handleCreateAccountStep} className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Personal Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Create your free candidate account to get matched with verified jobs.
                  </p>
                </div>

                {/* Google Sign-up Quick Alternative */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs text-slate-600 font-medium text-center">
                    Quick option: Sign up with Google to skip manual password setup
                  </p>
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">or with email</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rahul Sharma"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e: any) => setGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  {/* Mobile Number (+91) */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Mobile Number *</label>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-semibold text-slate-700">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        className="w-full bg-slate-50 border border-slate-300 rounded-r-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Create Password *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Consent Checkboxes */}
                <div className="pt-2 space-y-2.5">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                    <input
                      type="checkbox"
                      checked={whatsappConsent}
                      onChange={(e) => setWhatsappConsent(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Send me important job updates on WhatsApp</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 hover:text-slate-900">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>
                      I agree to the <a href="/terms" target="_blank" className="text-blue-600 underline">Terms of Service</a> and <a href="/privacy-policy" target="_blank" className="text-blue-600 underline">Privacy Policy</a>. *
                    </span>
                  </label>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Location</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 3: LOCATION DETAILS & PREFERRED JOB CITIES          */}
            {/* -------------------------------------------------------- */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Where are you located & where do you want to work?
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    We match jobs based on your current city and preferred locations.
                  </p>
                </div>

                {/* Current Location */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 text-xs font-bold uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Your Current Location</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">City *</label>
                      <input
                        type="text"
                        value={currentCity}
                        onChange={(e) => setCurrentCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">State</label>
                      <input
                        type="text"
                        value={currentState}
                        onChange={(e) => setCurrentState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferred Job Cities */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Add Preferred Job Cities (Choose up to 8)
                    </label>
                    <span className="text-[11px] text-blue-600 font-medium">
                      {preferredCities.length} selected
                    </span>
                  </div>

                  {/* Selected City Badges */}
                  <div className="flex flex-wrap gap-2">
                    {preferredCities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold border border-blue-200"
                      >
                        <span>{city}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCity(city)}
                          className="hover:text-blue-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Custom city input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCityInput}
                      onChange={(e) => setCustomCityInput(e.target.value)}
                      placeholder="Add another city..."
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (customCityInput.trim()) {
                            handleToggleCity(customCityInput.trim());
                            setCustomCityInput("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCityInput.trim()) {
                          handleToggleCity(customCityInput.trim());
                          setCustomCityInput("");
                        }
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Popular India City Pills */}
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Popular Locations:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_INDIA_CITIES.map((city) => {
                        const isSelected = preferredCities.includes(city);
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() => handleToggleCity(city)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {isSelected && <span className="mr-1">✓</span>}
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!currentCity.trim()) {
                        setErrorMsg("Please enter your current city.");
                        return;
                      }
                      setErrorMsg("");
                      setStep(4);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Education</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 4: EDUCATION DETAILS                                */}
            {/* -------------------------------------------------------- */}
            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Your Education Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Help recruiters verify your academic qualification.
                  </p>
                </div>

                {/* Are you currently pursuing education? */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Are you currently pursuing your education? *
                  </label>
                  <div className="flex gap-3">
                    {["No", "Yes"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPursuingEducation(val as "Yes" | "No")}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          pursuingEducation === val
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {val === "Yes" ? "Yes, currently studying" : "No, completed"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Fields: Higher Degrees vs 10th/12th */}
                {["Diploma", "ITI", "Graduate", "Post Graduate"].includes(highestEducation) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">College / Institute Name *</label>
                      <input
                        type="text"
                        value={instituteName}
                        onChange={(e) => setInstituteName(e.target.value)}
                        placeholder="e.g. Delhi University / IIT Madras / Anna University"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Degree *</label>
                      <input
                        type="text"
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        placeholder="e.g. B.Tech / BCA / B.Com / MBA"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Specialization / Branch</label>
                      <input
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g. Computer Science / Finance"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Passing Year</label>
                      <select
                        value={completionYear}
                        onChange={(e) => setCompletionYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        {Array.from({ length: 30 }, (_, i) => 2026 - i).map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Completion Month</label>
                      <select
                        value={completionMonth}
                        onChange={(e) => setCompletionMonth(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">School Board *</label>
                      <select
                        value={schoolBoard}
                        onChange={(e) => setSchoolBoard(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="State Board">State Board</option>
                        <option value="NIOS">NIOS</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Passing Year</label>
                      <select
                        value={passingYear}
                        onChange={(e) => setPassingYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        {Array.from({ length: 30 }, (_, i) => 2026 - i).map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">Medium of Instruction</label>
                      <div className="flex gap-2">
                        {["English", "Hindi", "Regional Language"].map((med) => (
                          <button
                            key={med}
                            type="button"
                            onClick={() => setMedium(med as any)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              medium === med
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {med}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStep(5);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Experience</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 5: EXPERIENCE DETAILS                               */}
            {/* -------------------------------------------------------- */}
            {step === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Confirm your work status
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you currently working or seeking your first role?
                  </p>
                </div>

                {/* Status Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setWorkStatus("experienced")}
                    className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      workStatus === "experienced"
                        ? "border-blue-600 bg-blue-50/50 shadow-md"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className={`w-5 h-5 ${workStatus === "experienced" ? "text-blue-600" : "text-slate-400"}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">I have work experience</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Currently working or previously employed</p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkStatus("fresher")}
                    className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      workStatus === "fresher"
                        ? "border-blue-600 bg-blue-50/50 shadow-md"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap className={`w-5 h-5 ${workStatus === "fresher" ? "text-blue-600" : "text-slate-400"}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">I am a Fresher / Student</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Recent graduate or looking for internships</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Experienced Form Fields */}
                {workStatus === "experienced" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Current / Recent Job Title *</label>
                      <input
                        type="text"
                        value={currentJobTitle}
                        onChange={(e) => setCurrentJobTitle(e.target.value)}
                        placeholder="e.g. Software Engineer / Sales Executive"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Company Name *</label>
                      <input
                        type="text"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        placeholder="e.g. TCS / Infosys / Startup"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Total Experience</label>
                      <select
                        value={totalExperienceYears}
                        onChange={(e) => setTotalExperienceYears(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="0-1 Years">0 - 1 Years</option>
                        <option value="1-3 Years">1 - 3 Years</option>
                        <option value="3-5 Years">3 - 5 Years</option>
                        <option value="5-8 Years">5 - 8 Years</option>
                        <option value="8+ Years">8+ Years</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Current Salary (Annual CTC in ₹)</label>
                      <input
                        type="text"
                        value={currentSalary}
                        onChange={(e) => setCurrentSalary(e.target.value)}
                        placeholder="e.g. 6.5 LPA or ₹50,000/month"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Notice Period</label>
                      <select
                        value={noticePeriod}
                        onChange={(e) => setNoticePeriod(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="Immediate">Immediate Joiner</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                        <option value="60 Days">60 Days</option>
                        <option value="90 Days">90 Days</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Industry / Domain</label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                      >
                        <option value="IT & Software">IT & Software</option>
                        <option value="Banking & Financial Services">Banking & Financial Services</option>
                        <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                        <option value="Healthcare & Pharma">Healthcare & Pharma</option>
                        <option value="EdTech & Education">EdTech & Education</option>
                        <option value="Manufacturing & Engineering">Manufacturing & Engineering</option>
                        <option value="Sales & Marketing">Sales & Marketing</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                    <p className="font-bold">Entry-Level Profile Configured</p>
                    <p className="text-slate-600">
                      We will prioritize graduate training programs, junior roles, and walk-in hiring drives matching your educational branch.
                    </p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (workStatus === "experienced" && !currentJobTitle.trim()) {
                        setErrorMsg("Please enter your current or recent job title.");
                        return;
                      }
                      setErrorMsg("");
                      setStep(6);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Skills</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 6: SKILLS                                           */}
            {/* -------------------------------------------------------- */}
            {step === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    What skills do you have?
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Recruiters use skills to filter and match suitable candidates.
                  </p>
                </div>

                {/* Active Skills Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Selected Skills</span>
                    <span className="text-blue-600">{skills.length} added</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 min-h-[60px] flex flex-wrap gap-2 items-center">
                    {skills.length === 0 ? (
                      <span className="text-xs text-slate-400">No skills added yet. Select from below or type to add.</span>
                    ) : (
                      skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-blue-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Add Custom Skill Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Type a skill (e.g. React, SQL, Digital Marketing)..."
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill(skillInput);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSkill(skillInput)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Popular Skill Suggestions */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Suggested Skills for you:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_SUGGESTIONS.map((skill) => {
                      const isAdded = skills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          disabled={isAdded}
                          onClick={() => handleAddSkill(skill)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isAdded
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                              : "bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200"
                          }`}
                        >
                          <span>+ {skill}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (skills.length === 0) {
                        setErrorMsg("Please add at least one skill.");
                        return;
                      }
                      setErrorMsg("");
                      setStep(7);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Languages</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 7: LANGUAGE PREFERENCES                             */}
            {/* -------------------------------------------------------- */}
            {step === 7 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Preferred Languages
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Recruiters check language proficiency for client communication.
                  </p>
                </div>

                {/* English Proficiency */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-800">
                    English Proficiency Level *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "No English", desc: "Cannot speak or understand" },
                      { id: "Basic", desc: "Can understand simple sentences" },
                      { id: "Intermediate", desc: "Good conversational English" },
                      { id: "Advanced", desc: "Fluent / Professional communication" }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setEnglishProficiency(item.id as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          englishProficiency === item.id
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <p className="text-xs font-bold">{item.id}</p>
                        <p className={`text-[10px] mt-1 leading-tight ${englishProficiency === item.id ? "text-blue-100" : "text-slate-500"}`}>
                          {item.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regional Languages */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Additional Indian Languages you know
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {REGIONAL_LANGUAGES.map((lang) => {
                      const isSelected = otherLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setOtherLanguages(otherLanguages.filter(l => l !== lang));
                            } else {
                              setOtherLanguages([...otherLanguages, lang]);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isSelected && <span className="mr-1.5">✓</span>}
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(6)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("");
                      setStep(8);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Job Roles</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 8: PREFERRED JOB ROLE                               */}
            {/* -------------------------------------------------------- */}
            {step === 8 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    What kind of job are you looking for?
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the job titles that match your career interests.
                  </p>
                </div>

                {/* Active Roles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Selected Target Roles (Max 5)</span>
                    <span className="text-blue-600">{preferredRoles.length} / 5</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap gap-2 items-center">
                    {preferredRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs"
                      >
                        <span>{role}</span>
                        {preferredRoles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(role)}
                            className="hover:text-blue-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Add Custom Role */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    placeholder="Search or type a role..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRole(roleInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRole(roleInput)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Add Role
                  </button>
                </div>

                {/* Suggested Roles */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Popular Job Roles:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_SUGGESTIONS.map((role) => {
                      const isSelected = preferredRoles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          disabled={isSelected}
                          onClick={() => handleAddRole(role)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                              : "bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200"
                          }`}
                        >
                          + {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Work Mode & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Work Mode Preference</label>
                    <select
                      value={preferredWorkMode}
                      onChange={(e: any) => setPreferredWorkMode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="any">Any Work Mode</option>
                      <option value="in_office">In-Office</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote / Work from Home</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Job Type</label>
                    <select
                      value={preferredJobType}
                      onChange={(e: any) => setPreferredJobType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="internship">Internship</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(7)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (preferredRoles.length === 0) {
                        setErrorMsg("Please add at least one preferred role.");
                        return;
                      }
                      setErrorMsg("");
                      setStep(9);
                    }}
                    className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Resume</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 9: RESUME UPLOAD                                    */}
            {/* -------------------------------------------------------- */}
            {step === 9 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Upload your resume
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Supported formats: PDF, DOC, DOCX, TXT (Maximum 5MB).
                  </p>
                </div>

                {/* Dropzone Area */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 sm:p-12 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all cursor-pointer space-y-4 group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.docx,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleResumeFileSelect(file);
                    }}
                  />

                  <div className="w-16 h-16 rounded-2xl bg-blue-100 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center mx-auto transition-all shadow-sm">
                    <Upload className="w-7 h-7" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {resumeFileName ? "Replace Current Resume" : "Click to select or drag and drop your resume"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, DOCX, DOC or TXT up to 5MB
                    </p>
                  </div>

                  {isUploadingResume && (
                    <div className="max-w-xs mx-auto space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold text-blue-600">
                        <span>Uploading document...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {resumeFileName && !isUploadingResume && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{resumeFileName} attached</span>
                    </div>
                  )}
                </div>

                {/* Parsing Status or Error */}
                {isParsingResume && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Analyzing resume contents with AI engine...</span>
                  </div>
                )}

                {parseError && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    {parseError}
                  </div>
                )}

                {/* Navigation & Skip Option */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(8)}
                    className="py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleFinalizeProfile}
                      className="py-2.5 px-4 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      Skip for Now
                    </button>

                    <button
                      type="button"
                      disabled={loading || isUploadingResume}
                      onClick={handleFinalizeProfile}
                      className="py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Finalizing Profile...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Registration</span>
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------- */}
            {/* STEP 10: PROFILE SUCCESS & CONTINUE TO JOB / SEARCH       */}
            {/* -------------------------------------------------------- */}
            {step === 10 && (
              <div className="text-center py-6 sm:py-10 space-y-6 animate-fadeIn">
                
                {/* Checkmark Celebration Icon */}
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Congratulations, {fullName || "Candidate"}!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Your AIJOBS candidate profile has been successfully created. You are now ready to apply for verified openings.
                  </p>
                </div>

                {/* Profile Badge Card */}
                <div className="max-w-md mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">AIJOBS Verified Candidate</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {completionPct}% Complete
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 border-t border-slate-200/80 pt-3">
                    <p><strong className="text-slate-800">Target Role:</strong> {preferredRoles.join(", ")}</p>
                    <p><strong className="text-slate-800">Preferred Cities:</strong> {preferredCities.join(", ")}</p>
                    <p><strong className="text-slate-800">Skills:</strong> {skills.slice(0, 5).join(", ")}{skills.length > 5 ? ` +${skills.length - 5} more` : ""}</p>
                    {resumeFileName && <p><strong className="text-slate-800">Resume:</strong> {resumeFileName}</p>}
                  </div>
                </div>

                {/* If candidate arrived via a specific job link: continue to that job */}
                {intendedJob ? (
                  <div className="max-w-md mx-auto p-5 rounded-2xl bg-blue-50 border-2 border-blue-500/30 text-left space-y-3">
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      Ready to Apply
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{intendedJob.title}</h4>
                      <p className="text-xs text-slate-600">{intendedJob.companyName} • {intendedJob.location}</p>
                    </div>

                    <button
                      onClick={() => {
                        clearIntendedJobId();
                        sessionStorage.removeItem(STORAGE_DRAFT_KEY);
                        window.location.href = `/jobs/${intendedJob.id}`;
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Continue to Apply for this Job</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        sessionStorage.removeItem(STORAGE_DRAFT_KEY);
                        window.location.href = "/jobs";
                      }}
                      className="w-full sm:flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Search className="w-4 h-4" />
                      <span>View Matching Jobs</span>
                    </button>

                    <button
                      onClick={handleFinishAndProceed}
                      className="w-full sm:w-auto py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Go to Dashboard</span>
                    </button>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </main>

      {/* Footer Trust & Safety Banner */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>AIJOBS Candidate Safety: 100% Free • Verified Recruiters Only • Zero Job Application Fees</span>
          </div>

          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} AIJOBS (aijobs1.in). All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
