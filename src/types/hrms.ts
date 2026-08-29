export type HrmsPlan = "starter" | "growth" | "enterprise" | "recruitment_bundle";

export interface HrmsCompany {
  id: string;
  companyName: string;
  ownerUid: string;
  ownerEmail: string;
  phone?: string;
  employeeRange?: string;
  plan: HrmsPlan;
  status: "trial" | "active" | "suspended";
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrmsWorkspaceUser {
  uid: string;
  name: string;
  email: string;
  role: "hrms_admin" | "employee" | "employer" | "admin" | "super_admin";
  companyId: string;
}
