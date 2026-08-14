# Security Specification: AIJobs Candidate → Admin → Recruiter Pipeline

## Invariants & Threat Vectors (Dirty Dozen)

1. **Candidate Identity Invariant**: A candidate can only create applications where `candidateId == request.auth.uid`.
2. **Status Immutability for Candidates**: A candidate cannot modify application status, recruiter assignment, or interview schedule fields.
3. **Recruiter Authorization**: A recruiter can only view and update applications assigned to them (`assignedRecruiterId == request.auth.uid`) or for jobs they created (`recruiterId == request.auth.uid` or `employerId == request.auth.uid`), unless they are an admin.
4. **Admin Global Access**: Administrators can read, update, and assign any application.
5. **No Public Writes**: Anonymous users cannot create or modify applications, interviews, or notifications.
6. **Notification Privacy**: Users can only read notifications targeted to their own `userId`.
7. **Interview Integrity**: Interview records can only be created/updated by authorized recruiters or admins, and can only be read by the candidate and authorized recruiter/admin.
8. **Cloudinary URL Preservation**: Resumes must use existing Cloudinary URLs and not duplicate file binaries in Firestore.
9. **Single Source of Truth**: All status transitions (`applied`, `under_review`, `shortlisted`, `interview`, `selected`, `offer`, `joined`, `rejected`) operate on the primary `applications/{applicationId}` document.
10. **Audit Fields**: Assignments must store `assignedRecruiterId`, `assignedRecruiterName`, `assignedAt`, and `assignedBy`.
