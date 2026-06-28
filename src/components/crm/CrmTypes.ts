export interface ClientModel {
  id: string;
  companyName: string;
  industry: string;
  email: string;
  website: string;
  contactPerson: string;
  mobile: string;
  notes: string;
  agreementsCount: number;
  documentsCount: number;
  createdAt: string;
}

export interface ConsultancyJobModel {
  id: string;
  title: string;
  companyName: string;
  department: string;
  assignedRecruiter: string;
  experience: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  skillsRequired: string[];
  timeline: string;
  status: "open" | "closed" | "draft" | "onhold";
  createdAt: string;
}

export interface ConsultancyCandidateModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  resumeScore: number;
  aiInterviewScore: number;
  skills: string[];
  experience: string;
  location: string;
  expectedSalary: string;
  notes: string;
  tags: string[];
  status: "active" | "saved" | "shortlisted" | "rejected";
}

export interface InterviewModel {
  id: string;
  candidateName: string;
  jobTitle: string;
  date: string;
  time: string;
  feedback: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
}

export interface PlacementModel {
  id: string;
  jobTitle: string;
  clientName: string;
  candidateName: string;
  status: "released" | "joined" | "rejected" | "hold" | "replacement";
  invoiceStatus: "pending" | "paid" | "overdue";
  salary: number;
  feePercent: number;
  revenue: number;
  date: string;
}

export interface TeamMemberModel {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Recruiter" | "Viewer";
}
