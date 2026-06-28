import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  ClientModel, 
  ConsultancyJobModel, 
  ConsultancyCandidateModel, 
  PlacementModel, 
  TeamMemberModel, 
  InterviewModel 
} from "./CrmTypes";

export const DEFAULT_CLIENTS: ClientModel[] = [
  {
    id: "client_google",
    companyName: "Google India",
    industry: "Internet & Technology",
    email: "hr-india@google.com",
    website: "https://google.com",
    contactPerson: "Siddharth Mehta",
    mobile: "+91 98765 43210",
    notes: "Requires elite engineering candidates with dynamic data structures and systems proficiency.",
    agreementsCount: 2,
    documentsCount: 5,
    createdAt: "2026-03-15T10:00:00Z"
  },
  {
    id: "client_stripe",
    companyName: "Stripe Payment Systems",
    industry: "Fintech",
    email: "careers@stripe.com",
    website: "https://stripe.com",
    contactPerson: "Emily Watson",
    mobile: "+1 650 555 0192",
    notes: "Prefers fullstack developers with deep TypeScript, Node.js, and high scale transaction processing expertise.",
    agreementsCount: 1,
    documentsCount: 3,
    createdAt: "2026-04-01T12:00:00Z"
  },
  {
    id: "client_amazon",
    companyName: "Amazon Web Services (AWS)",
    industry: "Cloud Computing",
    email: "aws-hiring@amazon.in",
    website: "https://aws.amazon.com",
    contactPerson: "Rajesh Iyer",
    mobile: "+91 87654 32109",
    notes: "Focus is on cloud native architectures, Kubernetes clusters, and DevOps automated scripting.",
    agreementsCount: 3,
    documentsCount: 6,
    createdAt: "2026-02-28T09:00:00Z"
  }
];

export const DEFAULT_JOBS: ConsultancyJobModel[] = [
  {
    id: "cjob_fullstack",
    title: "Senior Fullstack Architect",
    companyName: "Google India",
    department: "Engineering Development",
    assignedRecruiter: "Amit Roy",
    experience: "Senior (8+ Years)",
    location: "Bengaluru, Karnataka",
    salaryMin: "35",
    salaryMax: "45",
    skillsRequired: ["React", "TypeScript", "Node.js", "System Design"],
    timeline: "30 Days",
    status: "open",
    createdAt: "2026-06-10T14:30:00Z"
  },
  {
    id: "cjob_devops",
    title: "Staff DevOps Engineer",
    companyName: "Stripe Payment Systems",
    department: "Cloud Operations",
    assignedRecruiter: "Kunal Sen",
    experience: "Lead (10+ Years)",
    location: "Remote, India",
    salaryMin: "40",
    salaryMax: "52",
    skillsRequired: ["AWS", "Kubernetes", "Terraform", "Docker"],
    timeline: "15 Days",
    status: "open",
    createdAt: "2026-06-15T11:00:00Z"
  },
  {
    id: "cjob_product",
    title: "Technical Product Manager",
    companyName: "Amazon Web Services (AWS)",
    department: "Cloud Products",
    assignedRecruiter: "Amit Roy",
    experience: "Mid-Level (5+ Years)",
    location: "Mumbai, Maharashtra",
    salaryMin: "28",
    salaryMax: "35",
    skillsRequired: ["Product Roadmap", "SQL", "System Design", "Agile"],
    timeline: "45 Days",
    status: "open",
    createdAt: "2026-06-18T09:15:00Z"
  }
];

export const DEFAULT_CANDIDATES: ConsultancyCandidateModel[] = [
  {
    id: "ccand_aryan",
    name: "Aryan Sharma",
    email: "aryan.sharma@engineer.com",
    phone: "+91 99988 77766",
    resumeScore: 92,
    aiInterviewScore: 88,
    skills: ["React", "TypeScript", "Node.js", "System Design", "MongoDB"],
    experience: "Senior (8 Years)",
    location: "Bengaluru",
    expectedSalary: "42",
    notes: "Outstanding systems architect. Possesses excellent communication skills from the simulator interview check.",
    tags: ["Architect", "MERN Stack", "Highly Rated"],
    status: "shortlisted"
  },
  {
    id: "ccand_ananya",
    name: "Ananya Iyer",
    email: "ananya.iyer@techlead.com",
    phone: "+91 88877 66655",
    resumeScore: 85,
    aiInterviewScore: 82,
    skills: ["AWS", "Kubernetes", "Terraform", "Docker", "Python"],
    experience: "Senior (6 Years)",
    location: "Remote",
    expectedSalary: "46",
    notes: "Excellent automation scripts builder. Cleared AWS Professional certifications. Ready to join in 30 days.",
    tags: ["DevOps", "Cloud Expert"],
    status: "active"
  },
  {
    id: "ccand_rohan",
    name: "Rohan Verma",
    email: "rohan.v@pm.com",
    phone: "+91 77766 55544",
    resumeScore: 79,
    aiInterviewScore: 81,
    skills: ["Product Roadmap", "SQL", "System Design", "Agile", "Tableau"],
    experience: "Mid-Level (5 Years)",
    location: "Mumbai",
    expectedSalary: "32",
    notes: "Dynamic product thinker with direct software background. Great with data metrics and dashboards.",
    tags: ["Product", "Agile Specialist"],
    status: "active"
  },
  {
    id: "ccand_neha",
    name: "Neha Gupta",
    email: "neha.g@developer.com",
    phone: "+91 66655 44433",
    resumeScore: 72,
    aiInterviewScore: 70,
    skills: ["React", "CSS", "JavaScript", "Redux"],
    experience: "Junior (3 Years)",
    location: "Noida",
    expectedSalary: "18",
    notes: "Energetic frontend coder. Keen observer of UI nuances. Looking for growth opportunities.",
    tags: ["Frontend", "React Developer"],
    status: "saved"
  }
];

export const DEFAULT_PLACEMENTS: PlacementModel[] = [
  {
    id: "place_01",
    jobTitle: "Senior Fullstack Architect",
    clientName: "Google India",
    candidateName: "Aryan Sharma",
    status: "joined",
    invoiceStatus: "paid",
    salary: 4200000,
    feePercent: 8.33,
    revenue: 349860,
    date: "2026-05-10"
  },
  {
    id: "place_02",
    jobTitle: "Staff DevOps Engineer",
    clientName: "Stripe Payment Systems",
    candidateName: "Ananya Iyer",
    status: "released",
    invoiceStatus: "pending",
    salary: 4600000,
    feePercent: 8.33,
    revenue: 383180,
    date: "2026-06-22"
  },
  {
    id: "place_03",
    jobTitle: "Technical Product Manager",
    clientName: "Amazon Web Services (AWS)",
    candidateName: "Rohan Verma",
    status: "hold",
    invoiceStatus: "pending",
    salary: 3200000,
    feePercent: 8.33,
    revenue: 266560,
    date: "2026-06-25"
  }
];

export const DEFAULT_TEAM: TeamMemberModel[] = [
  { id: "team_01", name: "Preeti Nair", email: "preeti@nexusagency.com", role: "Admin" },
  { id: "team_02", name: "Kunal Sen", email: "kunal@nexusagency.com", role: "Manager" },
  { id: "team_03", name: "Amit Roy", email: "amit@nexusagency.com", role: "Recruiter" },
  { id: "team_04", name: "Simran Kaur", email: "simran@nexusagency.com", role: "Viewer" }
];

export const DEFAULT_INTERVIEWS: InterviewModel[] = [
  {
    id: "int_01",
    candidateName: "Aryan Sharma",
    jobTitle: "Senior Fullstack Architect",
    date: "2026-06-28",
    time: "14:00",
    feedback: "Exceptional system design expertise. Excellent performance in real-time questions.",
    status: "completed"
  },
  {
    id: "int_02",
    candidateName: "Ananya Iyer",
    jobTitle: "Staff DevOps Engineer",
    date: "2026-06-28",
    time: "16:30",
    feedback: "Solid understanding of containerized deployment pipelines. Good communications.",
    status: "scheduled"
  },
  {
    id: "int_03",
    candidateName: "Rohan Verma",
    jobTitle: "Technical Product Manager",
    date: "2026-06-29",
    time: "11:00",
    feedback: "Yet to interview.",
    status: "scheduled"
  }
];

export async function seedCrmCollectionsIfEmpty() {
  try {
    // 1. Clients Check
    const clientsSnap = await getDocs(collection(db, "clients"));
    if (clientsSnap.empty) {
      for (const item of DEFAULT_CLIENTS) {
        await setDoc(doc(db, "clients", item.id), item);
      }
      console.log("Seeded clients collection");
    }

    // 2. Jobs Check
    const jobsSnap = await getDocs(collection(db, "consultancy_jobs"));
    if (jobsSnap.empty) {
      for (const item of DEFAULT_JOBS) {
        await setDoc(doc(db, "consultancy_jobs", item.id), item);
      }
      console.log("Seeded consultancy_jobs collection");
    }

    // 3. Candidates Check
    const candidatesSnap = await getDocs(collection(db, "consultancy_candidates"));
    if (candidatesSnap.empty) {
      for (const item of DEFAULT_CANDIDATES) {
        await setDoc(doc(db, "consultancy_candidates", item.id), item);
      }
      console.log("Seeded consultancy_candidates collection");
    }

    // 4. Placements Check
    const placementsSnap = await getDocs(collection(db, "placements"));
    if (placementsSnap.empty) {
      for (const item of DEFAULT_PLACEMENTS) {
        await setDoc(doc(db, "placements", item.id), item);
      }
      console.log("Seeded placements collection");
    }

    // 5. Team Check
    const teamSnap = await getDocs(collection(db, "team_members"));
    if (teamSnap.empty) {
      for (const item of DEFAULT_TEAM) {
        await setDoc(doc(db, "team_members", item.id), item);
      }
      console.log("Seeded team_members collection");
    }

    // 6. Interviews Check
    const interviewsSnap = await getDocs(collection(db, "interviews_scheduled"));
    if (interviewsSnap.empty) {
      for (const item of DEFAULT_INTERVIEWS) {
        await setDoc(doc(db, "interviews_scheduled", item.id), item);
      }
      console.log("Seeded interviews_scheduled collection");
    }
  } catch (err) {
    console.error("Seeding collections failed:", err);
  }
}
