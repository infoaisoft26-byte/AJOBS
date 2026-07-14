/**
 * Attribute-Based Access Control (ABAC) Service
 * Implements fine-grained security policies based on user (subject), resource, action, and environment attributes.
 */

// 1. Core ABAC Attribute Types
export interface SubjectAttributes {
  userId: string;
  role: "candidate" | "consultancy" | "employer" | "admin";
  name: string;
  email: string;
  
  // Role-specific candidate attributes
  skills?: string[];
  experienceYears?: number;
  aiInterviewScore?: number;
  resumeScore?: number;
  subscription?: string; // e.g. "Free Tier", "Starter Suite", "Pro Agency", "Enterprise Access"
  
  // Role-specific consultancy attributes
  pricingPlan?: "Free" | "Starter" | "Professional" | "Enterprise" | "Pro Agency";
  clientsCount?: number;
  revenue?: number;
  subscriptionStatus?: "active" | "inactive";

  // Role-specific employer attributes
  industry?: string;
  size?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+" | string;
  creditsRemaining?: number;

  // Role-specific admin attributes
  adminLevel?: "Super Admin" | "Standard Admin" | "Auditor";
  adminStatus?: "active" | "inactive";
}

export interface ResourceAttributes {
  id: string;
  type: "job" | "candidate_profile" | "client_record" | "financial_report" | "system_log" | "ai_coaching_session" | "api_endpoint";
  ownerId?: string;
  
  // Job Specifics
  salary?: number; // annual salary in INR
  experienceRequired?: number; // years
  skillsRequired?: string[];
  isAiVerifiedOnly?: boolean;

  // Candidate Profile Specifics
  overallScore?: number;
  isSuperstar?: boolean;

  // Financial / Log Specifics
  confidentialityLevel?: "low" | "medium" | "high";
  systemComponent?: string;
}

export interface ABACPolicyResult {
  granted: boolean;
  reason: string;
  requiredUpgrade?: string; // Suggested action (e.g. "Upgrade to Pro", "Take Interview Prep")
}

// 2. Policy Definitions
export const ABAC_POLICIES = {
  // A. Candidate Policies
  CANDIDATE_JOB_ACCESS: "Candidates must match skills and experience parameters, and premium high-salary jobs (>= ₹25,00,000) or 'AI Verified Only' jobs are restricted based on resume and AI interview scores.",
  
  // B. Consultancy Policies
  CONSULTANCY_CAPS: "Consultancies are restricted in client portfolio counts and talent analytics based on their subscription tier.",
  
  // C. Employer Policies
  EMPLOYER_TALENT_SOURCING: "Employers with small team sizes are blocked from direct downloads/contact of top-tier talent without profile upgrade.",

  // D. Admin Policies
  ADMIN_CLEARANCE: "Admins must have sufficient level clearances (Super Admin vs Standard vs Auditor) to view logs, execute updates, or view revenue metrics."
};

// 3. Dynamic ABAC Evaluation Engine
export function evaluateAbacPolicy(
  subject: SubjectAttributes,
  resource: ResourceAttributes,
  action: "read" | "write" | "apply" | "execute" | "delete" | "export",
  currentTime: string = new Date().toISOString()
): ABACPolicyResult {
  
  // Global Check: Inactive users are always denied
  if (subject.role === "admin" && subject.adminStatus === "inactive") {
    return { granted: false, reason: "Account status is inactive. Access revoked." };
  }

  // --- POLICY 1: CANDIDATE POLICIES ---
  if (subject.role === "candidate") {
    
    // Check when trying to apply to a Job
    if (resource.type === "job" && action === "apply") {
      // 1. AI Verified Only Job Check
      if (resource.isAiVerifiedOnly) {
        const score = subject.aiInterviewScore || 0;
        if (score < 80) {
          return {
            granted: false,
            reason: `This premium job requires an AI Interview Score of at least 80% (Your score: ${score}%). Please complete an AI interview simulation to unlock this job.`,
            requiredUpgrade: "COMPLETE_AI_INTERVIEW"
          };
        }
      }

      // 2. High-Salary Job Cap (salary >= 25,00,000 INR)
      const jobSalary = resource.salary || 0;
      if (jobSalary >= 2500000) {
        const isPremiumSub = ["Starter Suite", "Pro Agency", "Enterprise Access", "Professional", "Enterprise"].includes(subject.subscription || "");
        const highScore = (subject.resumeScore || 0) >= 85;
        
        if (!isPremiumSub && !highScore) {
          return {
            granted: false,
            reason: `High-paying roles (>= ₹25,00,000 PA) are restricted on the Free Tier unless your ATS Resume Match Score exceeds 85% (Your current ATS Score: ${subject.resumeScore || 0}%).`,
            requiredUpgrade: "UPGRADE_SUBSCRIPTION_OR_ATS"
          };
        }
      }

      // 3. Experience Gap Guard
      const reqExp = resource.experienceRequired || 0;
      const userExp = subject.experienceYears || 0;
      if (reqExp - userExp > 4) {
        return {
          granted: false,
          reason: `Experience mismatch: This role requires ${reqExp} years of experience, which exceeds your profile experience (${userExp} years) by a significant margin.`,
          requiredUpgrade: "UPDATE_EXPERIENCE"
        };
      }
    }

    // Check when reading a Job
    if (resource.type === "job" && action === "read") {
      // Free candidates with low resume scores cannot view advanced job details (salary disclosure, exact employer identity)
      const jobSalary = resource.salary || 0;
      if (jobSalary >= 3000000 && !subject.subscription && (subject.resumeScore || 0) < 60) {
        return {
          granted: false,
          reason: "Advanced high-paying job specs are hidden. Please upload a structured resume to cross the 60% ATS benchmark.",
          requiredUpgrade: "UPLOAD_RESUME"
        };
      }
    }
  }

  // --- POLICY 2: CONSULTANCY POLICIES ---
  if (subject.role === "consultancy") {
    const plan = subject.pricingPlan || "Free";
    
    if (resource.type === "client_record" && action === "read") {
      const currentClients = subject.clientsCount || 0;
      
      if (plan === "Free" && currentClients >= 3) {
        return {
          granted: false,
          reason: `Your Free Agency Plan limits you to a maximum of 3 clients. You currently have ${currentClients} active clients in your CRM portfolio.`,
          requiredUpgrade: "UPGRADE_CONSULTANCY_STARTER"
        };
      }

      if (plan === "Starter" && currentClients >= 10) {
        return {
          granted: false,
          reason: `Your Starter Suite Plan limits you to a maximum of 10 clients. You currently have ${currentClients} active clients.`,
          requiredUpgrade: "UPGRADE_CONSULTANCY_PRO"
        };
      }
    }

    // Advanced search / Candidate Sourcing Cap
    if (resource.type === "candidate_profile" && action === "export") {
      if (plan === "Free" || plan === "Starter") {
        return {
          granted: false,
          reason: `Exporting parsed candidate sheets is restricted on the ${plan} plan. Professional agency license required.`,
          requiredUpgrade: "UPGRADE_CONSULTANCY_PRO"
        };
      }
    }
  }

  // --- POLICY 3: EMPLOYER POLICIES ---
  if (subject.role === "employer") {
    const companySize = subject.size || "1-10";
    
    // Superstar candidate guard (score > 90)
    if (resource.type === "candidate_profile" && action === "apply") { // contact / download
      const userScore = resource.overallScore || 0;
      const isSuperstar = resource.isSuperstar || userScore >= 90;
      
      if (isSuperstar && ["1-10", "11-50"].includes(companySize)) {
        return {
          granted: false,
          reason: `Direct contact access to premium 'AI Superstar' candidates (Score >= 90%) is locked for small organizations (${companySize} employees) to avoid pipeline congestion.`,
          requiredUpgrade: "UPGRADE_EMPLOYER_PROFILE"
        };
      }
    }
  }

  // --- POLICY 4: ADMIN POLICIES ---
  if (subject.role === "admin") {
    const level = subject.adminLevel || "Auditor";

    if (resource.type === "financial_report") {
      if (level !== "Super Admin") {
        return {
          granted: false,
          reason: `Access Denied: Financial performance indices require 'Super Admin' credentials. Your level: '${level}'.`
        };
      }
    }

    if (resource.type === "system_log" && action === "delete") {
      if (level === "Auditor") {
        return {
          granted: false,
          reason: "Auditors are prohibited from deleting system or audit records. Read-only audit scope enforced."
        };
      }
    }

    if (resource.type === "candidate_profile" && action === "delete") {
      if (level !== "Super Admin") {
        return {
          granted: false,
          reason: `Deletion of candidate user records is restricted to 'Super Admin' users. Your level: '${level}'.`
        };
      }
    }
  }

  // --- POLICY 5: API CALL POLICIES ---
  if (resource.type === "api_endpoint") {
    const endpointPath = resource.id;

    // Restricted Admin endpoints
    if (endpointPath === "/api/admin-platform-insights") {
      if (subject.role !== "admin" || subject.adminLevel !== "Super Admin") {
        return {
          granted: false,
          reason: "Forbidden: Endpoint /api/admin-platform-insights is restricted strictly to Super Admins."
        };
      }
    }

    // Restricted consultancy endpoints
    if (endpointPath === "/api/consultancy-natural-search") {
      if (subject.role !== "consultancy") {
        return {
          granted: false,
          reason: "Endpoint /api/consultancy-natural-search is only authorized for consultancy accounts."
        };
      }
      
      const plan = subject.pricingPlan || "Free";
      if (plan === "Free") {
        return {
          granted: false,
          reason: "Natural language candidate semantic search requires a Starter or Pro subscription plan.",
          requiredUpgrade: "UPGRADE_CONSULTANCY_STARTER"
        };
      }
    }

    // AI Resume audit cap
    if (endpointPath === "/api/analyze-resume") {
      if (subject.role === "candidate" && (subject.resumeScore || 0) < 30 && !subject.skills) {
        return {
          granted: false,
          reason: "Your candidate profile attributes are too sparse to execute a full resume audit. Please update your target skills list first.",
          requiredUpgrade: "UPDATE_PROFILE_SKILLS"
        };
      }
    }
  }

  return { granted: true, reason: "Access authorized by policy rules." };
}

// 4. Front-End Helpers
export function mapUserToAbacSubject(userId: string, userProfile: any, roleSpecificProfile: any): SubjectAttributes {
  const role = userProfile?.role || "candidate";
  
  const base: SubjectAttributes = {
    userId,
    role,
    name: userProfile?.name || roleSpecificProfile?.name || "User",
    email: userProfile?.email || roleSpecificProfile?.email || "",
  };

  if (role === "candidate") {
    // Parse skills
    let skillsList: string[] = [];
    if (roleSpecificProfile?.skills) {
      if (Array.isArray(roleSpecificProfile.skills)) {
        skillsList = roleSpecificProfile.skills;
      } else if (typeof roleSpecificProfile.skills === "object") {
        skillsList = [
          ...(roleSpecificProfile.skills.technical || []),
          ...(roleSpecificProfile.skills.soft || [])
        ];
      }
    }
    
    // Parse experience years
    let expYears = 2;
    if (roleSpecificProfile?.experience) {
      const match = String(roleSpecificProfile.experience).match(/(\d+)/);
      if (match) expYears = parseInt(match[1], 10);
    }

    return {
      ...base,
      skills: skillsList,
      experienceYears: expYears,
      aiInterviewScore: roleSpecificProfile?.aiInterviewScore || userProfile?.aiInterviewScore || 0,
      resumeScore: roleSpecificProfile?.resumeScore || userProfile?.resumeScore || 0,
      subscription: userProfile?.subscription || roleSpecificProfile?.subscription || "Free Tier"
    };
  }

  if (role === "consultancy") {
    return {
      ...base,
      pricingPlan: roleSpecificProfile?.pricingPlan || userProfile?.pricingPlan || "Free",
      clientsCount: roleSpecificProfile?.clientsCount || 0,
      revenue: roleSpecificProfile?.revenue || 0,
      subscriptionStatus: roleSpecificProfile?.subscriptionStatus || "active"
    };
  }

  if (role === "employer") {
    return {
      ...base,
      industry: roleSpecificProfile?.industry || "Technology",
      size: roleSpecificProfile?.size || "1-10",
      creditsRemaining: roleSpecificProfile?.creditsRemaining || 5
    };
  }

  if (role === "admin") {
    return {
      ...base,
      adminLevel: roleSpecificProfile?.level || userProfile?.level || "Standard Admin",
      adminStatus: roleSpecificProfile?.status || "active"
    };
  }

  return base;
}
