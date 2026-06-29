export interface CompanyProfile {
  id: string;
  userId: string;
  companyName: string;
  logoUrl: string;
  industry: string;
  website: string;
  gstNumber: string;
  email: string;
  phone: string;
  officeAddress: string;
  locations: string[];
  hrName: string;
  hrEmail: string;
  verificationDocs: string;
  description: string;
  linkedinUrl: string;
  companySize: string;
  isVerified: boolean;
  createdAt: string;
}

export interface CompanyJob {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  requiredSkills: string[];
  experience: string;
  education: string;
  location: string;
  salary: string;
  benefits: string;
  interviewProcess: string[];
  openPositions: number;
  status: "Published" | "Draft" | "Archived" | "Closed" | "Paused";
  createdAt: string;
  department: string;
  consultancy?: string;
  industry?: string;
  category?: string;
  employmentType?: string;
  workMode?: string;
  languages?: string[];
  responsibilities?: string;
  requirements?: string;
  expiryDate?: string;
}

export interface CompanyApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  resumeUrl: string;
  resumeScore: number;
  interviewScore: number;
  expectedSalary?: string;
  distance?: string;
  availability?: string;
  status: 
    | "Applied" 
    | "Screening" 
    | "Shortlisted" 
    | "Interview Scheduled" 
    | "HR Round" 
    | "Final Round" 
    | "Offer" 
    | "Joined" 
    | "Rejected";
  appliedAt: string;
}

export interface CompanyInterview {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  date: string;
  time: string;
  type: "Online" | "Offline";
  locationOrLink: string;
  interviewer: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  feedback?: string;
  score?: number; // feedback evaluation score
}

export interface CompanyOffer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  joiningDate: string;
  salaryPackage: string;
  offerStatus: "Released" | "Accepted" | "Declined";
  acceptanceStatus: string;
  createdAt: string;
  offerLetterText?: string;
}

export interface CompanyActivityLog {
  id: string;
  companyId: string;
  type: "job" | "application" | "interview" | "offer" | "registration";
  description: string;
  createdAt: string;
}
