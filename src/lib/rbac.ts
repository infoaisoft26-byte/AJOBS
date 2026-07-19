export type UserRole =
  | 'admin'
  | 'consultancy'
  | 'recruiter'
  | 'candidate';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  consultancy: 3,
  recruiter: 2,
  candidate: 1,
};

export function hasRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canCreateRecruiter(userRole: UserRole) {
  return userRole === 'consultancy' || userRole === 'admin';
}

export function canPostJob(userRole: UserRole) {
  return (
    userRole === 'consultancy' ||
    userRole === 'recruiter' ||
    userRole === 'admin'
  );
}

export function canViewCandidateDatabase(userRole: UserRole) {
  return (
    userRole === 'consultancy' ||
    userRole === 'recruiter' ||
    userRole === 'admin'
  );
}
