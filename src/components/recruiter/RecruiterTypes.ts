export interface RecruiterJob {
  id: string;
  title: string;
  companyName: string;
  companyId?: string;
  location: string;
  workMode?: string;
  salary: string;
  openings: number;
  deadline?: string;
  candidateCount?: number;
  skillsRequired?: string[];
  status: "active" | "urgent" | "closed" | string;
  assignedAt?: string;
  payoutPerHire?: string;
}

export interface PipelineCandidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  experience: string;
  location: string;
  skills: string[];
  aiScore: number;
  stage: "new_lead" | "contacted" | "screened" | "shortlisted" | "interview" | "selected" | "rejected";
  lastActivity: string;
  notes?: string;
  resumeUnlocked?: boolean;
  resumeUrl?: string;
}

export interface RecruiterLead {
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  source: string;
  assignedBy: string;
  assignedAt: string;
  status: "uncontacted" | "in_discussion" | "interested" | "not_interested" | "converted";
  notes?: string;
}

export interface RecruiterTask {
  id: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}
