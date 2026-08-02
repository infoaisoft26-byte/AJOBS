
export type NormalizedRole = "candidate" | "recruiter" | "consultancy" | "employer" | "admin" | "superadmin" | "unknown";

export function normalizeRole(rawRole?: string): NormalizedRole {
  if (!rawRole) return "unknown";
  const lower = String(rawRole).trim().toLowerCase().replace(/[\s_-]/g, "");
  if (["candidate", "jobseeker"].includes(lower)) return "candidate";
  if (["recruiter", "hr"].includes(lower)) return "recruiter";
  if (["consultancy", "agency"].includes(lower)) return "consultancy";
  if (["employer", "company", "corporate"].includes(lower)) return "employer";
  if (["admin", "systemadmin"].includes(lower)) return "admin";
  if (["superadmin"].includes(lower)) return "superadmin";
  return "unknown";
}

export function isAdminRole(role?: string): boolean {
  const norm = normalizeRole(role);
  return norm === "admin" || norm === "superadmin";
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
    case "superadmin":
      return "/admin/dashboard";
    default:
      return "/access-error";
  }
}

export function isRoleAuthorizedForPath(userRole: string, currentPath: string): boolean {
  const norm = normalizeRole(userRole);
  
  if (currentPath.startsWith("/admin") || currentPath.startsWith("/superadmin")) {
    return norm === "admin" || norm === "superadmin";
  }
  if (currentPath.startsWith("/candidate")) {
    return norm === "candidate" || norm === "admin" || norm === "superadmin";
  }
  if (currentPath.startsWith("/recruiter")) {
    return norm === "recruiter" || norm === "employer" || norm === "admin" || norm === "superadmin";
  }
  if (currentPath.startsWith("/employer")) {
    return norm === "employer" || norm === "admin" || norm === "superadmin";
  }
  if (currentPath.startsWith("/consultancy")) {
    return norm === "consultancy" || norm === "admin" || norm === "superadmin";
  }
  return true;
}
