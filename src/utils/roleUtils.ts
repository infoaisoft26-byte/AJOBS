
export type NormalizedRole = "candidate" | "recruiter" | "consultancy" | "employer" | "admin" | "super_admin";

export function normalizeRole(rawRole?: string): NormalizedRole {
  if (!rawRole) return "candidate";
  const lower = rawRole.toLowerCase().trim().replace(/[-\s]/g, "_");
  if (["candidate", "jobseeker", "job_seeker"].includes(lower)) return "candidate";
  if (["recruiter", "hr"].includes(lower)) return "recruiter";
  if (["consultancy", "agency"].includes(lower)) return "consultancy";
  if (["employer", "company", "corporate"].includes(lower)) return "employer";
  if (["admin", "system_admin"].includes(lower)) return "admin";
  if (["superadmin", "super_admin", "super-admin"].includes(lower)) return "super_admin";
  return "candidate";
}

export function getRoleDashboardPath(role: string): string {
  const norm = normalizeRole(role);
  switch (norm) {
    case "candidate":
      return "/candidate/dashboard";
    case "recruiter":
      return "/recruiter/dashboard";
    case "consultancy":
      return "/consultancy/dashboard";
    case "employer":
      return "/employer/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "super_admin":
      return "/superadmin/dashboard";
    default:
      return "/candidate/dashboard";
  }
}

export function isRoleAuthorizedForPath(userRole: string, currentPath: string): boolean {
  const norm = normalizeRole(userRole);
  
  if (currentPath.startsWith("/admin") || currentPath.startsWith("/superadmin")) {
    return norm === "admin" || norm === "super_admin";
  }
  if (currentPath.startsWith("/candidate")) {
    return norm === "candidate" || norm === "admin" || norm === "super_admin";
  }
  if (currentPath.startsWith("/recruiter")) {
    return norm === "recruiter" || norm === "employer" || norm === "admin" || norm === "super_admin";
  }
  if (currentPath.startsWith("/employer")) {
    return norm === "employer" || norm === "admin" || norm === "super_admin";
  }
  if (currentPath.startsWith("/consultancy")) {
    return norm === "consultancy" || norm === "admin" || norm === "super_admin";
  }
  return true;
}
