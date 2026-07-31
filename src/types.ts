export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: "candidate" | "consultancy" | "recruiter" | "admin" | "superadmin";
  profileImage?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  status?: string;
  subscription?: string;
  profileCompleted?: boolean;
  resumeURL?: string;
  companyId?: string;
  consultancyId?: string;
  subscriptionPlan?: string;
  accountStatus?: "pending_kyc" | "pending_admin_approval" | "active" | "rejected" | "suspended";
  kycStatus?: "not_started" | "pending" | "pending_admin_approval" | "verified" | "rejected" | "resubmit_required";
  isApproved?: boolean;
  isActive?: boolean;
  onboardingCompleted?: boolean;
}

export interface KycDocument {
  documentId: string;
  documentType: string;
  provider: string;
  publicId: string;
  maskedNumber?: string;
  verificationStatus: "pending" | "verified" | "mismatch" | "rejected";
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  mismatchReason?: string;
  isSensitive?: boolean;
}

export interface KycProfile {
  userId: string;
  role: "recruiter" | "consultancy" | "candidate";
  kycStatus: "not_started" | "pending_admin_approval" | "verified" | "rejected" | "resubmit_required" | "manual_review";
  identityMethod?: "aadhaar_offline" | "digilocker" | "manual_upload";
  emailVerified: boolean;
  mobileVerified: boolean;
  selfieVerified: boolean;
  businessVerified: boolean;
  identityVerified: boolean;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFlags: string[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  selectedPlan?: string;
  paymentStatus?: "pending" | "paid";
  personalDetails?: {
    fullName: string;
    email: string;
    mobile: string;
    maskedGovId?: string;
  };
  employmentDetails?: {
    companyName?: string;
    designation?: string;
    officeAddress?: string;
    companyWebsite?: string;
    linkedInProfile?: string;
    consultancyId?: string;
    proofType?: string;
  };
  businessDetails?: {
    legalName?: string;
    tradeName?: string;
    maskedGstin?: string;
    maskedPan?: string;
    registrationNumber?: string;
    officialEmail?: string;
    website?: string;
  };
  selfieData?: {
    selfieUrl: string;
    livenessStatus: "passed" | "failed" | "manual_review";
    faceMatchScore: number;
    capturedAt: string;
  };
}

export interface VerificationRequest {
  requestId: string;
  userId: string;
  role: string;
  selectedPlan: string;
  paymentStatus: "pending" | "paid";
  kycStatus: string;
  accountStatus: string;
  riskFlags: string[];
  riskLevel?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminDecision?: "APPROVED" | "REJECTED" | "RESUBMIT";
  rejectionReason?: string;
}

export interface CrmLead {
  leadId: string;
  userId?: string;
  role: string;
  fullName: string;
  email: string;
  mobile: string;
  city: string;
  source: string;
  medium?: string;
  campaign: string;
  status: "new" | "contacted" | "interested" | "documents_pending" | "interview_scheduled" | "selected" | "not_interested" | "no_response" | "converted" | "closed";
  assignedTo?: string;
  assignedRecruiterId?: string;
  assignedConsultancyId?: string;
  nextFollowUpAt?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  resumeStatus?: string;
  kycStatus?: string;
}

export interface AssignmentRecord {
  assignmentId: string;
  candidateId: string;
  consultancyId?: string;
  recruiterId?: string;
  jobId?: string;
  assignedBy: string;
  assignedAt: string;
  status: "active" | "reassigned" | "completed";
  previousRecruiterId?: string;
  reassignmentReason?: string;
}

export interface ApplicationTimelineEntry {
  id: string;
  applicationId: string;
  changedBy: string;
  changedByRole: string;
  previousStatus: string;
  newStatus: string;
  remarks?: string;
  createdAt: string;
}

export interface CandidateProfile {
  userId: string;
  resumeUrl: string;
  resumeFileName: string;
  resumeScore: number;
  skills: string[];
  experience: string;
  aiInterviewScore: number;
  resumeText: string;
  summary: string;
  careerCoachChat: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface ConsultancyProfile {
  userId: string;
  agencyName: string;
  subscriptionStatus: "active" | "inactive";
  pricingPlan: "Free" | "Starter" | "Professional" | "Enterprise";
  clientsCount: number;
  revenue: number;
  ownerName?: string;
  gstNumber?: string;
  panNumber?: string;
  companyEmail?: string;
  mobileNumber?: string;
  officeAddress?: string;
  website?: string;
}

export interface EmployerProfile {
  userId: string;
  companyName: string;
  industry: string;
  size: string;
}

export interface JobPosting {
  id: string;
  slug?: string;
  employerId: string;
  companyName: string;
  hiringOrganizationName?: string;
  companyWebsite?: string;
  companyLogo?: string;
  title: string;
  description: string;
  location: string;
  type: string;
  employmentType?: string;
  salary: string;
  skillsRequired: string[];
  status: "Draft" | "Pending Approval" | "Approved" | "Live" | "Published" | "Closed" | "Expired" | "Rejected";
  createdAt: string;
  datePosted?: string;
  validThrough?: string;
  
  // Job Posting Details & Schema Fields
  department?: string;
  industry?: string;
  consultancy?: string; // assigned agency name/ID
  consultancyId?: string;
  recruiterId?: string;
  experience?: "Fresher" | "Junior" | "Mid-Level" | "Senior" | string;
  minimumExperience?: number;
  maximumExperience?: number;
  education?: string;
  qualification?: string;
  benefits?: string;
  openings?: number;
  numberOfOpenings?: number;
  expiryDate?: string;
  applyDeadline?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  workMode?: "On-site" | "Remote" | "Hybrid" | string;
  minimumSalary?: number;
  maximumSalary?: number;
  salaryCurrency?: string;
  salaryPeriod?: "Hourly" | "Daily" | "Weekly" | "Monthly" | "Yearly" | string;
  applyUrl?: string;
  recruiterEmail?: string;
  recruiterPhone?: string;
  responsibilities?: string;
  createdBy?: string;
  createdByRole?: string;
  approvedBy?: string;
  approvedAt?: string;
  isFeatured?: boolean;
  canonicalUrl?: string;
  indexingStatus?: "PENDING" | "SUCCESS" | "FAILED" | "SKIPPED_MISSING_CREDENTIALS";
  lastIndexedAt?: string;
  isPotentialDuplicate?: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  recruiterId?: string;
  consultancyId?: string;
  resumeUrl?: string;
  status: "Applied" | "Application Submitted" | "Resume Under Review" | "Screening" | "Shortlisted" | "Interview Scheduled" | "Interview Completed" | "Selected" | "Offer Released" | "On Hold" | "Joined" | "Rejected" | "Withdrawn";
  appliedAt: string;
  updatedAt?: string;
  resumeScore?: number;
  trackingSource?: string;
}

export interface Lead {
  id: string;
  candidateId: string;
  candidateName: string;
  email: string;
  phone: string;
  resume: string;
  jobId: string;
  jobTitle: string;
  company: string;
  recruiter: string;
  consultancy: string;
  currentStatus: "Applied" | "Screening" | "Shortlisted" | "Interview Scheduled" | "Interview Completed" | "Selected" | "Offer Released" | "Joined" | "Rejected" | "Withdrawn";
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSession {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  questions: InterviewQuestion[];
  overallScore?: number;
  feedback?: string;
  status: "scheduled" | "completed";
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  answer?: string;
  score?: number;
  feedback?: string;
  modelAnswer?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  createdAt: string;
}

export interface SubscriptionRecord {
  userId: string;
  planName: string;
  status: "active" | "inactive";
  expiresAt: string;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    duration: string;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
    score: string;
  }>;
  certifications: string[];
  projects: Array<{
    title: string;
    description: string;
    skills: string[];
  }>;
  languages: string[];
  currentCompany: string;
  designation: string;
  preferredLocation: string;
  expectedSalary: string;
  salaryPredictionMin: number;
  salaryPredictionMax: number;
  analyzedAt: string;
}

export interface ResumeScores {
  id: string;
  userId: string;
  overallScore: number;
  atsCompatibilityScore: number;
  grammarScore: number;
  formattingScore: number;
  professionalSummaryScore: number;
  skillsMatchScore: number;
  experienceScore: number;
  educationScore: number;
  achievementsScore: number;
  keywordOptimizationScore: number;
  evaluatedAt: string;
}

export interface ResumeVersion {
  id: string;
  userId: string;
  version: number;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface ResumeRecommendation {
  id: string;
  userId: string;
  missingTechnicalSkills: string[];
  missingSoftSkills: string[];
  missingCertifications: string[];
  learningRecommendations: Array<{
    title: string;
    provider: string;
    link: string;
  }>;
  summaryImprovements: string;
  skillsImprovements: string;
  experienceImprovements: string;
  keywordsImprovements: string;
  formattingImprovements: string;
  atsImprovements: string;
  generatedAt: string;
}

export interface JobMatchRecord {
  id: string;
  jobId: string;
  candidateId: string;
  matchPercentage: number;
  skillsMatchPercentage: number;
  experienceMatchPercentage: number;
  culturalMatchPercentage: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  status: "highly_recommended" | "matched" | "potential_fit" | "not_matching";
  updatedAt: string;
}

export interface SavedJobRecord {
  id: string;
  userId: string;
  jobId: string;
  savedAt: string;
}

export interface CandidateRankingRecord {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  rank: number;
  overallScore: number;
  resumeScore: number;
  interviewScore: number;
  matchPercentage: number;
  updatedAt: string;
}

export interface CompanyRankingRecord {
  id: string;
  companyName: string;
  overallRating: number;
  reviewCount: number;
  salaryRating: number;
  cultureRating: number;
  careerGrowthRating: number;
  updatedAt: string;
}
