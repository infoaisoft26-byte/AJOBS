export interface UserProfile {
  uid: string;
  email: string;
  role: "candidate" | "consultancy" | "employer" | "admin";
  name: string;
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
  pricingPlan: "Free" | "Starter" | "Enterprise";
  clientsCount: number;
  revenue: number;
}

export interface EmployerProfile {
  userId: string;
  companyName: string;
  industry: string;
  size: string;
}

export interface JobPosting {
  id: string;
  employerId: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  type: string;
  salary: string;
  skillsRequired: string[];
  status: "open" | "closed";
  createdAt: string;
  
  // Step 1 - Job Management Module fields
  department?: string;
  consultancy?: string; // assigned agency name/ID
  experience?: "Fresher" | "Junior" | "Mid-Level" | "Senior" | string;
  education?: string;
  benefits?: string;
  openings?: number;
  expiryDate?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  status: "applied" | "interviewing" | "offered" | "rejected";
  appliedAt: string;
  resumeScore?: number;
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
