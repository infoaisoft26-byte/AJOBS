import { db } from "../../firebase";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { CompanyProfile, CompanyJob, CompanyApplication, CompanyInterview, CompanyOffer, CompanyActivityLog } from "./EmployerTypes";

export async function seedEmployerDataIfEmpty(userId: string, userName: string) {
  try {
    // 1. Verify and seed Company Profile
    const companyRef = doc(db, "companies", userId);
    const companySnap = await getDoc(companyRef);
    let companyName = "Acme Global Tech";
    
    if (!companySnap.exists()) {
      const demoCompany: CompanyProfile = {
        id: userId,
        userId: userId,
        companyName: "Acme Global Tech",
        logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80",
        industry: "Information Technology",
        website: "https://acme-global.io",
        gstNumber: "29AAAAA1111A1Z1",
        email: "hr@acme-global.io",
        phone: "+91 98765 43210",
        officeAddress: "Block C, Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103",
        locations: ["Bengaluru", "Mumbai", "Pune"],
        hrName: userName || "Ananya HR",
        hrEmail: "ananya@acme-global.io",
        verificationDocs: "GSTIN_Certificate_Signed.pdf",
        description: "Acme Global Tech is a modern, high-growth cloud intelligence platform scaling developer tooling globally.",
        linkedinUrl: "https://linkedin.com/company/acme-global-tech",
        companySize: "100-500",
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(companyRef, demoCompany);
      companyName = demoCompany.companyName;
    } else {
      companyName = companySnap.data().companyName || "Acme Global Tech";
    }

    // 2. Verify and seed Jobs (company_jobs)
    const jobsSnap = await getDocs(collection(db, "company_jobs"));
    if (jobsSnap.empty) {
      const demoJobs: CompanyJob[] = [
        {
          id: "cjob_1",
          companyId: userId,
          companyName: companyName,
          title: "Senior Full Stack Engineer",
          description: "We are looking for a senior systems developer to own deployment loops and build reactive user surfaces using React, TypeScript, and NestJS. You will design sub-systems for analytical high-throughput data pipelines.",
          requiredSkills: ["React", "TypeScript", "Node.js", "Firebase", "PostgreSQL"],
          experience: "Senior (5-8 Years)",
          education: "B.Tech / B.E in Computer Science or similar",
          location: "Bengaluru (Hybrid)",
          salary: "₹24,00,000 - ₹32,00,000 PA",
          benefits: "Premium Health, Stock Equity (ESOPs), High-end Macbook, Free Gym Membership",
          interviewProcess: ["Technical Screening", "System Design Hack", "HR Culture Round"],
          openPositions: 3,
          status: "Published",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          department: "Technical"
        },
        {
          id: "cjob_2",
          companyId: userId,
          companyName: companyName,
          title: "AI Product Designer",
          description: "Join our core UI/UX team to wireframe, prototype, and build exquisite user interfaces. You will champion beautiful, polished layouts, micro-animations, and unified design tokens across web/mobile platforms.",
          requiredSkills: ["Figma", "Tailwind CSS", "Framer Motion", "UI Design", "User Research"],
          experience: "Mid-Level (2-5 Years)",
          education: "Bachelor of Design (B.Des) or equivalent experience",
          location: "Remote (India)",
          salary: "₹14,00,000 - ₹18,00,000 PA",
          benefits: "Workplace Stipend, Health Coverage, Flexible PTO",
          interviewProcess: ["Portfolio Review", "Interactive Prototype Walkthrough", "Product Leadership Chat"],
          openPositions: 2,
          status: "Published",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          department: "Design"
        },
        {
          id: "cjob_3",
          companyId: userId,
          companyName: companyName,
          title: "Head of Talent Acquisition",
          description: "Responsible for steering employer branding, establishing fast candidate coordination frameworks, and direct sourcing of top tier engineering leads. You will manage candidate tracking indexes.",
          requiredSkills: ["Technical Sourcing", "ATS Management", "Salary Negotiation", "Employer Branding"],
          experience: "Lead / Director (8+ Years)",
          education: "MBA in Human Resources or related fields",
          location: "Mumbai (Onsite)",
          salary: "₹28,00,000 - ₹35,00,000 PA",
          benefits: "Annual Performance Bonuses, Full Family Medical, Executive Car Allowance",
          interviewProcess: ["Executive Sourcing Presentation", "VP People Alignment", "Board Review"],
          openPositions: 1,
          status: "Draft",
          createdAt: new Date().toISOString(),
          department: "HR"
        }
      ];

      for (const job of demoJobs) {
        await setDoc(doc(db, "company_jobs", job.id), job);
        // Also sync to standard 'jobs' collection so candidates can apply
        await setDoc(doc(db, "jobs", job.id), {
          id: job.id,
          employerId: userId,
          companyName: job.companyName,
          title: job.title,
          description: job.description,
          location: job.location,
          type: "Full-time",
          salary: job.salary,
          skillsRequired: job.requiredSkills,
          status: job.status === "Published" ? "open" : "closed",
          createdAt: job.createdAt,
          department: job.department,
          experience: job.experience,
          education: job.education,
          benefits: job.benefits,
          openings: job.openPositions
        });
      }
    }

    // 3. Verify and seed Applications (company_applications)
    const appsSnap = await getDocs(collection(db, "company_applications"));
    if (appsSnap.empty) {
      const demoApps: CompanyApplication[] = [
        {
          id: "capp_1",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          candidateId: "demo_candidate_aryan",
          candidateName: "Aryan Sharma",
          candidateEmail: "aryan.sharma@gmail.com",
          resumeUrl: "#",
          resumeScore: 88,
          interviewScore: 84,
          expectedSalary: "₹26L PA",
          distance: "4.2 km",
          availability: "Immediate Joiner",
          status: "Shortlisted",
          appliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "capp_2",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          candidateId: "demo_candidate_ananya",
          candidateName: "Ananya Iyer",
          candidateEmail: "ananya.iyer@outlook.com",
          resumeUrl: "#",
          resumeScore: 94,
          interviewScore: 91,
          expectedSalary: "₹28L PA",
          distance: "8.5 km",
          availability: "15 Days Notice",
          status: "Interview Scheduled",
          appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "capp_3",
          jobId: "cjob_2",
          jobTitle: "AI Product Designer",
          candidateId: "demo_candidate_rahul",
          candidateName: "Rahul Verma",
          candidateEmail: "rahul.verma@behance.net",
          resumeUrl: "#",
          resumeScore: 78,
          interviewScore: 80,
          expectedSalary: "₹15L PA",
          distance: "Remote (Bengaluru)",
          availability: "Immediate Joiner",
          status: "HR Round",
          appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "capp_4",
          jobId: "cjob_2",
          jobTitle: "AI Product Designer",
          candidateId: "demo_candidate_sneha",
          candidateName: "Sneha Rao",
          candidateEmail: "sneha.rao@design.io",
          resumeUrl: "#",
          resumeScore: 92,
          interviewScore: 88,
          expectedSalary: "₹18L PA",
          distance: "Remote (Pune)",
          availability: "30 Days Notice",
          status: "Offer",
          appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "capp_5",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          candidateId: "demo_candidate_vikram",
          candidateName: "Vikram Malhotra",
          candidateEmail: "vikram.m@gmail.com",
          resumeUrl: "#",
          resumeScore: 61,
          interviewScore: 54,
          expectedSalary: "₹30L PA",
          distance: "15 km",
          availability: "60 Days Notice",
          status: "Rejected",
          appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const app of demoApps) {
        await setDoc(doc(db, "company_applications", app.id), app);
        // Sync to standard applications collection
        await setDoc(doc(db, "applications", app.id), {
          id: app.id,
          jobId: app.jobId,
          candidateId: app.candidateId,
          candidateName: app.candidateName,
          jobTitle: app.jobTitle,
          companyName: companyName,
          status: app.status.toLowerCase(),
          appliedAt: app.appliedAt,
          resumeScore: app.resumeScore
        });
      }
    }

    // 4. Verify and seed Interviews (company_interviews)
    const interviewsSnap = await getDocs(collection(db, "company_interviews"));
    if (interviewsSnap.empty) {
      const demoInterviews: CompanyInterview[] = [
        {
          id: "cint_1",
          applicationId: "capp_2",
          candidateId: "demo_candidate_ananya",
          candidateName: "Ananya Iyer",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "11:30 AM",
          type: "Online",
          locationOrLink: "https://meet.google.com/abc-defg-hij",
          interviewer: "Arun Kumar (VP Engineering)",
          status: "Scheduled"
        },
        {
          id: "cint_2",
          applicationId: "capp_1",
          candidateId: "demo_candidate_aryan",
          candidateName: "Aryan Sharma",
          jobId: "cjob_1",
          jobTitle: "Senior Full Stack Engineer",
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "02:00 PM",
          type: "Online",
          locationOrLink: "https://meet.google.com/xyz-pqrs-uvw",
          interviewer: "Siddharth Roy (Senior Architect)",
          status: "Completed",
          feedback: "Extremely strong on systems architectures, concurrent streams implementation, and web performance tokens. Highly recommended for Senior Staff track.",
          score: 92
        }
      ];

      for (const interview of demoInterviews) {
        await setDoc(doc(db, "company_interviews", interview.id), interview);
      }
    }

    // 5. Verify and seed Offers (offers)
    const offersSnap = await getDocs(collection(db, "offers"));
    if (offersSnap.empty) {
      const demoOffer: CompanyOffer = {
        id: "coff_1",
        applicationId: "capp_4",
        candidateId: "demo_candidate_sneha",
        candidateName: "Sneha Rao",
        jobId: "cjob_2",
        jobTitle: "AI Product Designer",
        joiningDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        salaryPackage: "₹17,50,000 PA",
        offerStatus: "Released",
        acceptanceStatus: "Pending candidate signature",
        createdAt: new Date().toISOString(),
        offerLetterText: `DEAR SNEHA RAO,

ACME GLOBAL TECH is thrilled to offer you the position of AI Product Designer in our Core Design team. 

POSITION DETAILS:
- Title: AI Product Designer
- Department: Product Design & User Experience
- Compensation Package: INR 17,50,000 Per Annum (payable monthly)
- Joining Date: ${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}
- Location: Remote (India Office Hub)

BENEFITS INCLUDED:
- Comprehensive family medical coverage up to INR 10,00,000.
- Modern hardware allowance (high-spec MacBook Pro & developer workspace setup).
- Flexible PTO policy (25 days annual leave).

Please sign this letter to confirm your acceptance. We look forward to welcome you to our mission.

Warm regards,
HR Recruitment Committee
Acme Global Tech`
      };

      await setDoc(doc(db, "offers", demoOffer.id), demoOffer);
    }

    // 6. Verify and seed Activities / logs
    const activitiesSnap = await getDocs(collection(db, "company_activity_logs"));
    if (activitiesSnap.empty) {
      const demoLogs: CompanyActivityLog[] = [
        {
          id: "clog_1",
          companyId: userId,
          type: "registration",
          description: "Company registered & GST credentials validated.",
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "clog_2",
          companyId: userId,
          type: "job",
          description: "Senior Full Stack Engineer vacancy published on AIJobs Board.",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "clog_3",
          companyId: userId,
          type: "application",
          description: "Aryan Sharma applied for Senior Full Stack Engineer role.",
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "clog_4",
          companyId: userId,
          type: "offer",
          description: "Offer letter generated & released for Sneha Rao.",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const log of demoLogs) {
        await setDoc(doc(db, "company_activity_logs", log.id), log);
      }
    }
  } catch (err: any) {
    if (err.message?.includes("permissions") || err.code === "permission-denied" || err.message?.includes("permission-denied")) {
      console.warn("Employer seeding bypassed due to active Firestore permission restrictions, proceeding smoothly in local mode:", err.message);
    } else {
      console.error("Employer seeding failed:", err);
    }
  }
}
