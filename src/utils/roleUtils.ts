
export type NormalizedRole = "candidate" | "recruiter" | "consultancy" | "employer" | "admin" | "super_admin" | "unknown";

export function normalizeRole(rawRole?: string): NormalizedRole {
  if (!rawRole) return "unknown";
  const cleaned = String(rawRole)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (cleaned === "superadmin" || cleaned === "super_admin" || cleaned === "systemadmin" || cleaned === "system_admin") {
    return "super_admin";
  }
  if (cleaned === "admin" || cleaned === "administrator") {
    return "admin";
  }
  if (cleaned === "candidate" || cleaned === "jobseeker" || cleaned === "job_seeker" || cleaned === "applicant") {
    return "candidate";
  }
  if (cleaned === "recruiter" || cleaned === "hr" || cleaned === "talent_acquisition") {
    return "recruiter";
  }
  if (cleaned === "consultancy" || cleaned === "agency" || cleaned === "placement_agency") {
    return "consultancy";
  }
  if (cleaned === "employer" || cleaned === "company" || cleaned === "corporate") {
    return "employer";
  }
  if (cleaned === "employee") {
    return "candidate"; // or internal employee
  }
  return "unknown";
}

export function isAdminRole(role?: string): boolean {
  const norm = normalizeRole(role);
  return norm === "admin" || norm === "super_admin";
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
    case "super_admin":
      return "/admin/dashboard";
    default:
      return "/access-error";
  }
}

export function isRoleAuthorizedForPath(userRole: string, currentPath: string): boolean {
  const norm = normalizeRole(userRole);
  
  if (currentPath.startsWith("/admin") || currentPath.startsWith("/superadmin") || currentPath.startsWith("/super_admin")) {
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

/**
 * Securely routes a user to their designated workspace/dashboard based on their normalized database role.
 * Updates browser history and invokes the navigation view handler if provided.
 */
export function routeUserByRole(
  userData: { role?: string; internalAccess?: boolean; isBetaTester?: boolean; [key: string]: any } | null | undefined,
  navigateCallback?: (viewName: string) => void
): { path: string; view: string } {
  if (!userData) {
    if (navigateCallback) navigateCallback("home");
    if (typeof window !== "undefined") window.history.pushState({}, "", "/");
    return { path: "/", view: "home" };
  }

  const normRole = normalizeRole(userData.role);
  let targetPath = "/candidate/dashboard";
  let targetView = "dashboard";

  switch (normRole) {
    case "super_admin":
    case "admin":
      targetPath = "/admin/dashboard";
      targetView = "admin-dashboard";
      break;

    case "employer":
      targetPath = "/employer/dashboard";
      targetView = "internal-employer";
      break;

    case "consultancy":
      targetPath = "/consultancy/dashboard";
      targetView = "internal-consultancy";
      break;

    case "recruiter":
      targetPath = "/recruiter/dashboard";
      targetView = "internal-recruiter";
      break;

    case "candidate":
    default:
      // If internal beta access or pre-launch profile
      if (userData.internalAccess || userData.isBetaTester) {
        targetPath = "/candidate/dashboard";
        targetView = "internal-candidate";
      } else {
        targetPath = "/candidate/dashboard";
        targetView = "dashboard";
      }
      break;
  }

  if (typeof window !== "undefined") {
    try {
      window.history.pushState({}, "", targetPath);
    } catch (e) {}
  }

  if (navigateCallback) {
    navigateCallback(targetView);
  }

  return { path: targetPath, view: targetView };
}

