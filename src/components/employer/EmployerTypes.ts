export interface CompanyJob {
  id: string;
  userId?: string;
  companyId?: string;
  employerId?: string;
  title: string;
  companyName: string;
  location: string;
  workMode?: "Remote" | "Hybrid" | "On-site" | string;
  type?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  education?: string;
  openings?: number;
  industry?: string;
  category?: string;
  department?: string;
  skillsRequired?: string[];
  languages?: string;
  benefits?: string;
  interviewProcess?: string;
  responsibilities?: string;
  requirements?: string;
  description?: string;
  screeningQuestions?: string[];
  status: "active" | "open" | "paused" | "closed" | "draft" | "pending_approval" | string;
  approved?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  applicationsCount?: number;
}

export interface CompanyApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateLocation?: string;
  candidateExperience?: string;
  candidateEducation?: string;
  candidateSkills?: string[];
  resumeUrl?: string;
  coverLetter?: string;
  status: "new" | "reviewed" | "shortlisted" | "interview" | "selected" | "rejected" | string;
  aiMatchScore?: number;
  appliedAt: string;
  notes?: string;
  matchBreakdown?: {
    skillsMatch?: number;
    experienceMatch?: number;
    locationMatch?: number;
    cultureFit?: number;
  };
}

export interface CompanyInterview {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  dateTime: string;
  roundName: string;
  interviewer: string;
  meetLink?: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  feedback?: string;
  score?: number;
}

export interface CompanyProfile {
  id: string;
  userId: string;
  companyName: string;
  industry: string;
  companySize: string;
  logoUrl?: string;
  website?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  officeAddress?: string;
  locations?: string[];
  hrName?: string;
  hrEmail?: string;
  description?: string;
  linkedinUrl?: string;
  isVerified?: boolean;
  createdAt: string;
}
