export interface RecruitmentCandidate {
  id: string; // Document ID (e.g. uid or auto ID)
  candidateId: string; // Sequential ID: AIJ-CAN-000001
  uid?: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  gender?: string;
  city?: string;
  state?: string;
  location?: string;
  preferredLocation?: string;
  targetRole?: string;
  jobPreference?: string;
  currentCompany?: string;
  designation?: string;
  totalExperienceYears?: number;
  experience?: string;
  highestQualification?: string;
  education?: string;
  keySkills: string[];
  skills?: string[];
  currentCtc?: number | string;
  expectedCtc?: number | string;
  noticePeriodDays?: number | string;
  noticePeriod?: string;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeScore?: number | null;
  emailVerified: boolean;
  phoneVerified?: boolean;
  verificationStatus: "verified" | "pending" | "rejected";
  accountStatus: "active" | "pending_verification" | "suspended";
  profileStatus: "incomplete" | "complete" | "in_review";
  profileCompletion: number;
  assignedRecruiterId?: string | null;
  assignedRecruiterName?: string | null;
  assignedConsultancyId?: string | null;
  assignedConsultancyName?: string | null;
  assignedAt?: string | null;
  assignedJobId?: string | null;
  assignedJobTitle?: string | null;
  assignmentPriority?: "Urgent" | "High" | "Medium" | "Low";
  source: "Email Registration" | "Google Sign-In" | "Mobile OTP" | "Excel Import" | "Admin Manual" | "Consultancy Referral" | string;
  importBatchId?: string;
  invitationStatus?: "pending_activation" | "activated";
  importedProfileId?: string;
  adminNotes?: string;
  notesHistory?: Array<{
    note: string;
    author: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface RecruitmentJob {
  id: string; // Document ID or job_xxx
  jobId: string; // Sequential ID: AIJ-JOB-000001
  title: string;
  companyName: string;
  industry: string;
  department?: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Internship" | "Freelance" | string;
  workMode: "On-site" | "Hybrid" | "Remote" | string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  minimumExperience: number;
  maximumExperience: number;
  experienceLevel?: "Fresher" | "Junior" | "Mid-Level" | "Senior" | "Lead" | string;
  highestQualification?: string;
  education?: string;
  minimumSalary?: number;
  maximumSalary?: number;
  salaryCurrency: string;
  salaryPeriod: "Yearly" | "Monthly" | "Hourly" | string;
  salaryDisplay?: string;
  openings: number;
  skillsRequired: string[];
  description: string;
  responsibilities?: string;
  benefits?: string;
  status: "Draft" | "Published" | "Live" | "Paused" | "Closed" | "Expired";
  assignedRecruiterIds?: string[];
  assignedRecruiterNames?: string[];
  consultancyId?: string;
  consultancyName?: string;
  applyDeadline?: string;
  expiryDate?: string;
  createdBy?: string;
  createdByRole?: string;
  createdAt: string;
  updatedAt: string;
  slug?: string;
  canonicalUrl?: string;
  importBatchId?: string;
  applicantCount?: number;
  assignedCandidateCount?: number;
}

export interface RecruiterUser {
  id: string; // UID
  recruiterId: string; // AIJ-REC-000001
  name: string;
  email: string;
  phone?: string;
  agencyOrCompany?: string;
  status: "active" | "pending" | "inactive";
  activeCandidateCount?: number;
  activeJobCount?: number;
  totalPlacements?: number;
  createdAt: string;
  partnerType?: "recruiter" | "consultancy" | "employer";
}

export interface CandidateMatchResult {
  candidate: RecruitmentCandidate;
  job: RecruitmentJob;
  overallScore: number; // 0 - 100
  skillsScore: number; // 0 - 100
  experienceScore: number; // 0 - 100
  roleScore: number; // 0 - 100
  locationScore: number; // 0 - 100
  qualificationScore: number; // 0 - 100
  preferenceScore: number; // 0 - 100
  matchingSkills: string[];
  missingSkills: string[];
  reasons: string[];
  grade: "Exceptional Fit" | "Strong Match" | "Moderate Fit" | "Potential Match";
}

export interface RecruiterAssignment {
  id: string;
  assignmentId?: string;
  candidateId: string;
  candidateSequentialId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobId?: string;
  jobSequentialId?: string;
  jobTitle?: string;
  recruiterId: string;
  recruiterSequentialId?: string;
  recruiterName: string;
  recruiterEmail: string;
  partnerType?: "recruiter" | "consultancy" | "employer";
  priority: "Urgent" | "High" | "Medium" | "Low";
  deadlineDate?: string;
  adminNotes?: string;
  status: "Assigned" | "Contacted" | "Screening" | "Interview Scheduled" | "Shortlisted" | "Offered" | "Joined" | "Rejected" | "Reassigned";
  assignedBy: string;
  assignedByEmail: string;
  assignedAt: string;
  updatedAt: string;
  timeline?: Array<{
    status: string;
    notes?: string;
    updatedBy: string;
    timestamp: string;
  }>;
}

export interface ImportBatchRecord {
  id: string;
  batchId: string; // AIJ-IMP-000001
  type: "CANDIDATE_IMPORT" | "JOB_IMPORT";
  fileName: string;
  fileSize?: number;
  totalRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  importedBy: string;
  importedByEmail: string;
  status: "Completed" | "Partial" | "Failed" | "Processing";
  errors?: Array<{
    rowNumber: number;
    identifier: string;
    reason: string;
  }>;
  createdAt: string;
}

export interface RecruitmentAuditLog {
  id: string;
  action: "JOB_CREATED" | "JOB_UPDATED" | "JOB_STATUS_CHANGED" | "JOB_DELETED" | "JOB_BULK_IMPORTED" | "CANDIDATE_REGISTERED" | "CANDIDATE_UPDATED" | "CANDIDATE_BULK_IMPORTED" | "CANDIDATE_ASSIGNED" | "APPLICATION_STATUS_CHANGED" | string;
  entityType: "JOB" | "CANDIDATE" | "RECRUITER" | "ASSIGNMENT" | "APPLICATION" | "IMPORT_BATCH";
  entityId: string;
  entityName: string;
  details: string;
  performedBy: string;
  performedByRole: string;
  performedByEmail: string;
  ipAddress?: string;
  timestamp: string;
}
