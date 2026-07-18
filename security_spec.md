# Firestore Security Specification

This document defines the Data Invariants and the "Dirty Dozen" malicious payloads to verify the security of the Firestore Security Rules for our AI-Powered Recruitment Platform.

## 1. Data Invariants

- **User Profiles (`/users/{userId}`)**: 
  - Every user profile must be bound to the owner's authentic `uid`.
  - No user is allowed to self-escalate or change their role unless they are an Admin.
  - The `email` field must match the authenticated user's email.

- **Job Postings (`/jobs/{jobId}`)**:
  - Only registered Recruiters, Employers, or Admins can create or update job postings.
  - The `employerId` field must match the authenticated creator's `uid`.
  - `createdAt` must be set to the server timestamp `request.time`.

- **Applications (`/applications/{applicationId}`)**:
  - Only Candidates can create applications.
  - A candidate can only submit an application referencing their own `candidateId`.
  - Only Recruiters, Employers, or Admins can change an application's status (e.g., to "offered" or "rejected").

- **Employers & Companies (`/employers/{employerId}`)**:
  - Only the authentic registered employer or an admin can create or update profiles.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads designed to test our security invariants and ensure they return `PERMISSION_DENIED`.

### Payload 1: Privilege Escalation on Register
- **Collection**: `/users/attacker123`
- **Operation**: `create`
- **Payload**: `{ "uid": "attacker123", "email": "attacker@spam.com", "role": "admin" }`
- **Threat**: Attacker tries to register themselves with the `admin` role directly on signup.

### Payload 2: Role Spoofing on Existing Profile
- **Collection**: `/users/user456`
- **Operation**: `update`
- **Payload**: `{ "role": "admin" }` (under affectedKeys)
- **Threat**: Standard user attempts to change their own role to admin after initial registration.

### Payload 3: Spoofed Identity on Profile Creation
- **Collection**: `/users/victim_uid`
- **Operation**: `create`
- **Payload**: `{ "uid": "victim_uid", "email": "victim@domain.com", "role": "candidate" }`
- **Threat**: Attacker attempts to create or overwrite a profile belonging to another user.

### Payload 4: Unauthorized Job Posting
- **Collection**: `/jobs/malicious_job`
- **Operation**: `create`
- **Payload**: `{ "employerId": "attacker123", "title": "Fake Executive VP", "description": "Send Bitcoin to apply.", "status": "open" }` (by user with 'candidate' role)
- **Threat**: A candidate attempts to post a job listing to scam other candidates.

### Payload 5: Job Ownership Hijacking
- **Collection**: `/jobs/legit_job_789`
- **Operation**: `update`
- **Payload**: `{ "employerId": "attacker123" }`
- **Threat**: Attacker tries to transfer a legitimate job's ownership to their own account.

### Payload 6: Application Submission Spoofing (Foreign ID)
- **Collection**: `/applications/app_999`
- **Operation**: `create`
- **Payload**: `{ "jobId": "job123", "candidateId": "victim_uid", "status": "applied" }`
- **Threat**: Attacker applies to a job on behalf of another candidate without their consent.

### Payload 7: Application Status Sabotage (Candidate-side)
- **Collection**: `/applications/app_999`
- **Operation**: `update`
- **Payload**: `{ "status": "offered" }` (sent by the candidate)
- **Threat**: An applicant attempts to bypass screening by changing their own application status directly to "offered".

### Payload 8: Spam Application Attack (Role Check bypass)
- **Collection**: `/applications/app_illegal`
- **Operation**: `create`
- **Payload**: `{ "jobId": "job123", "candidateId": "employer123", "status": "applied" }` (sent by user with 'employer' role)
- **Threat**: An employer tries to apply to a job, violating the Candidate-only invariant.

### Payload 9: Unauthorized Company Verification Override
- **Collection**: `/companies/company_abc`
- **Operation**: `update`
- **Payload**: `{ "isVerified": true }` (sent by company manager)
- **Threat**: Company representative attempts to self-approve/verify their company document without admin audit.

### Payload 10: Anonymous Read of Sensitive Private Info
- **Collection**: `/users/secret_user/private/info`
- **Operation**: `get`
- **Threat**: Unauthenticated or unauthorized user attempts to read private PII.

### Payload 11: Denial-of-Wallet Path Variable Poisoning
- **Collection**: `/jobs/` + "A" * 500
- **Operation**: `get`
- **Threat**: Attacker sends massive junk document ID strings to exhaust server resources.

### Payload 12: Timestamp Spoofing
- **Collection**: `/jobs/job123`
- **Operation**: `create`
- **Payload**: `{ "title": "Software Engineer", "createdAt": "2020-01-01T00:00:00Z" }`
- **Threat**: Attacker attempts to backdate a job posting instead of using `request.time`.

---

## 3. Test Cases (TDD Verification Plan)

We will implement strict check assertions in our Firestore Rules to verify:
1. `request.auth != null`
2. `request.auth.uid == userId` for resource owners
3. Role lookup checking via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role`
4. Strict field validations via Standalone helpers (`isValidUser`, `isValidJob`, `isValidApplication`).
