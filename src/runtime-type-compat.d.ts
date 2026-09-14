/// <reference types="vite/client" />

import "react";
import "./types";
import "./services/dbInitService";

declare module "react" {
  type HTMLInputElement = globalThis.HTMLInputElement;
  type HTMLDivElement = globalThis.HTMLDivElement;
}

declare module "./types" {
  interface UserProfile {
    emailVerified?: boolean;
    verificationStatus?: string;
    internalAccess?: boolean;
    isBetaTester?: boolean;
    updatedAt?: string;
    profileDetails?: Record<string, unknown>;
  }

  interface JobPosting {
    company?: string;
    companyId?: string;
    jobType?: string;
    postedDate?: string;
    experienceRequired?: string;
    requirements?: string | string[];
    skills?: string[];
    category?: string;
    salaryRange?: string;
    updatedAt?: string;
  }

  interface CrmLead {
    id?: string;
    candidateName?: string;
    candidateEmail?: string;
    candidatePhone?: string;
    phone?: string;
    currentStatus?: string;
  }
}

declare module "./services/dbInitService" {
  interface UserProfile {
    verificationStatus?: string;
    emailVerified?: boolean;
    accountStatus?: string;
    isActive?: boolean;
    isApproved?: boolean;
    onboardingCompleted?: boolean;
    internalAccess?: boolean;
    isBetaTester?: boolean;
    updatedAt?: string;
  }
}
