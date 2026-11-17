import type { Request, Response } from "express";
import { neon } from "@neondatabase/serverless";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const reportRequestLimits = new Map<string, { count: number; resetAt: number }>();

function safePayload(value: any) {
  return JSON.parse(JSON.stringify(value ?? {}, (key, item) => {
    if (/password|otp|token|secret|private.?key|credential/i.test(key)) return undefined;
    return item;
  }));
}
function clean(value: unknown, max = 160) { return String(value ?? "").trim().slice(0, max); }
function roleOf(value: unknown) { return clean(value, 60).toLowerCase().replace(/[\s-]+/g, "_"); }
function iso(value: any): string | null {
  if (!value) return null;
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  } catch { return null; }
}
function asRows(snapshot: any) { return snapshot?.docs?.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) })) || []; }
function statusOf(value: any) { return clean(value?.status || value?.applicationStatus || "applied", 80).toLowerCase().replace(/[\s-]+/g, "_"); }
function isInRange(value: any, start: number | null, end: number | null) {
  if (!start && !end) return true;
  const time = iso(value) ? new Date(iso(value)!).getTime() : 0;
  if (!time) return false;
  return (!start || time >= start) && (!end || time <= end);
}
function csvCell(value: any) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}
async function mirrorToNeon(sql: any, users: any[], jobs: any[], applications: any[], interviews: any[], audits: any[], screenings: any[]) {
  const json = (rows: any[]) => JSON.stringify(rows);
  if (users.length) await sql`INSERT INTO app_users (id,email,display_name,role,status,source_ref,profile,created_at,updated_at,synced_at)
    SELECT x.id,x.email,x.display_name,x.role,x.status,x.source_ref,x.profile::jsonb,x.created_at::timestamptz,now(),now()
    FROM jsonb_to_recordset(${json(users)}::jsonb) AS x(id text,email text,display_name text,role text,status text,source_ref text,profile text,created_at text)
    ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,role=EXCLUDED.role,status=EXCLUDED.status,profile=EXCLUDED.profile,updated_at=now(),synced_at=now()`;
  if (jobs.length) await sql`INSERT INTO jobs (id,owner_uid,recruiter_id,employer_id,consultancy_id,title,company_name,status,location,created_at,source_ref,payload,synced_at)
    SELECT x.id,x.owner_uid,x.recruiter_id,x.employer_id,x.consultancy_id,x.title,x.company_name,x.status,x.location,x.created_at::timestamptz,x.source_ref,x.payload::jsonb,now()
    FROM jsonb_to_recordset(${json(jobs)}::jsonb) AS x(id text,owner_uid text,recruiter_id text,employer_id text,consultancy_id text,title text,company_name text,status text,location text,created_at text,source_ref text,payload text)
    ON CONFLICT (id) DO UPDATE SET owner_uid=EXCLUDED.owner_uid,recruiter_id=EXCLUDED.recruiter_id,employer_id=EXCLUDED.employer_id,consultancy_id=EXCLUDED.consultancy_id,title=EXCLUDED.title,company_name=EXCLUDED.company_name,status=EXCLUDED.status,location=EXCLUDED.location,payload=EXCLUDED.payload,updated_at=now(),synced_at=now()`;
  if (applications.length) await sql`INSERT INTO applications (id,job_id,candidate_id,recruiter_id,employer_id,consultancy_id,status,applied_at,source_ref,payload,synced_at)
    SELECT x.id,x.job_id,x.candidate_id,x.recruiter_id,x.employer_id,x.consultancy_id,x.status,x.applied_at::timestamptz,x.source_ref,x.payload::jsonb,now()
    FROM jsonb_to_recordset(${json(applications)}::jsonb) AS x(id text,job_id text,candidate_id text,recruiter_id text,employer_id text,consultancy_id text,status text,applied_at text,source_ref text,payload text)
    ON CONFLICT (id) DO UPDATE SET job_id=EXCLUDED.job_id,candidate_id=EXCLUDED.candidate_id,recruiter_id=EXCLUDED.recruiter_id,employer_id=EXCLUDED.employer_id,consultancy_id=EXCLUDED.consultancy_id,status=EXCLUDED.status,applied_at=EXCLUDED.applied_at,payload=EXCLUDED.payload,updated_at=now(),synced_at=now()`;
  if (interviews.length) await sql`INSERT INTO interviews (id,application_id,job_id,candidate_id,recruiter_id,employer_id,status,scheduled_at,source_ref,payload,synced_at)
    SELECT x.id,x.application_id,x.job_id,x.candidate_id,x.recruiter_id,x.employer_id,x.status,x.scheduled_at::timestamptz,x.source_ref,x.payload::jsonb,now()
    FROM jsonb_to_recordset(${json(interviews)}::jsonb) AS x(id text,application_id text,job_id text,candidate_id text,recruiter_id text,employer_id text,status text,scheduled_at text,source_ref text,payload text)
    ON CONFLICT (id) DO UPDATE SET application_id=EXCLUDED.application_id,job_id=EXCLUDED.job_id,candidate_id=EXCLUDED.candidate_id,recruiter_id=EXCLUDED.recruiter_id,employer_id=EXCLUDED.employer_id,status=EXCLUDED.status,scheduled_at=EXCLUDED.scheduled_at,payload=EXCLUDED.payload,synced_at=now()`;
  if (screenings.length) await sql`INSERT INTO screening_evaluations (id,application_id,job_id,candidate_id,evaluated_by,score,outcome,evaluated_at,payload,source_ref,synced_at)
    SELECT x.id,x.application_id,x.job_id,x.candidate_id,x.evaluated_by,x.score::numeric,x.outcome,x.evaluated_at::timestamptz,x.payload::jsonb,x.source_ref,now()
    FROM jsonb_to_recordset(${json(screenings)}::jsonb) AS x(id text,application_id text,job_id text,candidate_id text,evaluated_by text,score text,outcome text,evaluated_at text,payload text,source_ref text)
    ON CONFLICT (id) DO UPDATE SET application_id=EXCLUDED.application_id,job_id=EXCLUDED.job_id,candidate_id=EXCLUDED.candidate_id,evaluated_by=EXCLUDED.evaluated_by,score=EXCLUDED.score,outcome=EXCLUDED.outcome,evaluated_at=EXCLUDED.evaluated_at,payload=EXCLUDED.payload,synced_at=now()`;
  if (audits.length) await sql`INSERT INTO hiring_audit_events (id,actor_uid,actor_email,actor_role,action,entity_type,entity_id,job_id,application_id,details,occurred_at,source_ref,payload)
    SELECT x.id,x.actor_uid,x.actor_email,x.actor_role,x.action,x.entity_type,x.entity_id,x.job_id,x.application_id,x.details,x.occurred_at::timestamptz,x.source_ref,x.payload::jsonb
    FROM jsonb_to_recordset(${json(audits)}::jsonb) AS x(id text,actor_uid text,actor_email text,actor_role text,action text,entity_type text,entity_id text,job_id text,application_id text,details text,occurred_at text,source_ref text,payload text)
    ON CONFLICT (id) DO UPDATE SET actor_uid=EXCLUDED.actor_uid,actor_email=EXCLUDED.actor_email,actor_role=EXCLUDED.actor_role,action=EXCLUDED.action,details=EXCLUDED.details,occurred_at=EXCLUDED.occurred_at,payload=EXCLUDED.payload`;
}

export async function handleAdminReportingRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/admin/reports") return false;
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); res.status(405).json({ success: false, error: "Method not allowed." }); return true; }

  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) { res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Admin sign-in required." }); return true; }
    const decoded: any = await getFirebaseAuth().verifyIdToken(header.slice(7).trim(), true);
    const db = getFirestoreDb();
    const [userSnap, adminSnap] = await Promise.all([
      db.collection("users").doc(decoded.uid).get(),
      db.collection("admins").doc(decoded.uid).get()
    ]);
    const user = userSnap.data() || {}, admin = adminSnap.data() || {};
    const nowMs = Date.now();
    const limitKey = decoded.uid;
    const currentLimit = reportRequestLimits.get(limitKey);
    if (!currentLimit || nowMs > currentLimit.resetAt) reportRequestLimits.set(limitKey, { count: 1, resetAt: nowMs + 60000 });
    else {
      currentLimit.count += 1;
      if (currentLimit.count > 90) { res.status(429).json({ success:false,error:"RATE_LIMITED",message:"Too many report requests. Please wait one minute." }); return true; }
    }
    const role = roleOf((adminSnap.exists ? admin.role || admin.level || "admin" : "") || user.role || decoded.role);
    const active = user.isActive !== false && admin.isActive !== false && ![user.status, user.accountStatus, admin.status].some(v => ["disabled","suspended","blocked","inactive"].includes(roleOf(v)));
    if (!["admin","superadmin","super_admin"].includes(role) || !active) {
      res.status(403).json({ success: false, error: "FORBIDDEN", message: "Active AIJOBS Admin access is required." }); return true;
    }

    const q = req.query || {};
    const startDate = clean(q.startDate, 30), endDate = clean(q.endDate, 30);
    const start = startDate ? new Date(startDate + "T00:00:00.000Z").getTime() : null;
    const end = endDate ? new Date(endDate + "T23:59:59.999Z").getTime() : null;
    if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) { res.status(400).json({ success:false,error:"Invalid date filter." }); return true; }
    const jobId = clean(q.jobId), recruiterId = clean(q.recruiterId), employerId = clean(q.employerId);
    const page = Math.max(1, Math.min(10000, Number(q.page) || 1));
    const pageSize = Math.max(10, Math.min(100, Number(q.pageSize) || 25));

    const names = ["users","jobs","applications","interviews","hiring_audit_logs","activity_logs","audit_logs","screening_evaluations","candidate_screenings"];
    const snaps = await Promise.all(names.map(name => db.collection(name).limit(name === "users" || name === "applications" ? 10000 : 5000).get().catch(() => null)));
    const [usersRaw,jobsRaw,appsRaw,interviewsRaw,hiringAuditRaw,activityRaw,auditRaw,screeningRaw,candidateScreeningsRaw] = snaps.map(asRows);
    const users = usersRaw.map((u:any)=>({ ...u, role:roleOf(u.role || u.userType) }));
    const jobs = jobsRaw;
    const allApps = appsRaw;
    const interviews = interviewsRaw;
    const inRangeApps = allApps.filter((a:any)=>isInRange(a.appliedAt || a.createdAt || a.updatedAt,start,end));
    const filteredApps = inRangeApps.filter((a:any)=>(!jobId || clean(a.jobId)===jobId) && (!recruiterId || clean(a.recruiterId || a.assignedRecruiterId)===recruiterId) && (!employerId || clean(a.employerId || a.companyId)===employerId));
    const filteredInterviews = interviews.filter((i:any)=>isInRange(i.scheduledAt || i.createdAt,start,end) && (!jobId || clean(i.jobId)===jobId) && (!recruiterId || clean(i.recruiterId)===recruiterId) && (!employerId || clean(i.employerId)===employerId));
    const combinedAuditRows = [...hiringAuditRaw,...activityRaw,...auditRaw];
    const auditEvents = combinedAuditRows.filter((a:any)=>isInRange(a.timestamp || a.createdAt || a.occurredAt,start,end)).map((a:any)=>({
      id:clean(a.id || a.auditId,180), action:clean(a.action || a.eventName,120), actorUid:clean(a.performedBy || a.userId || a.actorUid,180),
      actorEmail:clean(a.performedByEmail || a.email || a.actorEmail,180), actorRole:clean(a.role || a.actorRole,60),
      entityType:clean(a.entityType || a.category,80), entityId:clean(a.entityId || a.jobId || a.applicationId,180),
      details:clean(a.details || a.message,1200), occurredAt:iso(a.timestamp || a.createdAt || a.occurredAt)
    })).filter((a:any)=>a.id || a.action).sort((a:any,b:any)=>(b.occurredAt||"").localeCompare(a.occurredAt||""));
    const counts = (rows:any[], fn:(row:any)=>string) => rows.reduce((out:any,row:any)=>{const key=fn(row)||"unknown";out[key]=(out[key]||0)+1;return out;},{});
    const byRole = counts(users,(u:any)=>u.role);
    const byJobStatus = counts(jobs,(j:any)=>roleOf(j.status)||"unknown");
    const byStage = counts(filteredApps,(a:any)=>statusOf(a));
    const recruiterMap = new Map<string,any>(), employerMap = new Map<string,any>(), jobMap = new Map<string,any>();
    for (const a of filteredApps) {
      const rid=clean(a.recruiterId || a.assignedRecruiterId || a.consultancyId), eid=clean(a.employerId || a.companyId), jid=clean(a.jobId);
      if (rid) { const x=recruiterMap.get(rid)||{id:rid,applications:0,interviews:0,shortlisted:0,hired:0}; x.applications++; const s=statusOf(a); if(s.includes("interview"))x.interviews++; if(s.includes("shortlist"))x.shortlisted++; if(["hired","joined","selected","offer"].includes(s))x.hired++; recruiterMap.set(rid,x); }
      if (eid) { const x=employerMap.get(eid)||{id:eid,applications:0,interviews:0,hired:0}; x.applications++; const s=statusOf(a); if(s.includes("interview"))x.interviews++; if(["hired","joined","selected","offer"].includes(s))x.hired++; employerMap.set(eid,x); }
      if (jid) { const x=jobMap.get(jid)||{id:jid,title:clean(a.jobTitle,180),applications:0,shortlisted:0,interviews:0,hired:0}; x.applications++; const s=statusOf(a); if(s.includes("shortlist"))x.shortlisted++; if(s.includes("interview"))x.interviews++; if(["hired","joined","selected","offer"].includes(s))x.hired++; jobMap.set(jid,x); }
    }
    const interviewStatus = counts(filteredInterviews,(i:any)=>roleOf(i.status)||"scheduled");
    const screeningResults = [...screeningRaw,...candidateScreeningsRaw,...allApps.filter((a:any)=>a.screeningSummary || a.screeningResult || a.aiScreeningSummary).map((a:any)=>({id:a.id,applicationId:a.id,score:a.screeningScore || a.aiScreeningScore || null,outcome:a.screeningOutcome || a.screeningResult?.outcome || "evaluated",evaluatedAt:a.screeningEvaluatedAt || a.updatedAt}))];
    const pagedApps = filteredApps.slice((page-1)*pageSize,page*pageSize);
    const pagedAudit = auditEvents.slice((page-1)*pageSize,page*pageSize);

    const dbUrl = process.env.DATABASE_URL;
    let neonSync = "not_configured";
    if (dbUrl) {
      try {
        const sql = neon(dbUrl);
        const toPayload = (row:any) => JSON.stringify(safePayload(row));
        const userRows = users.map((u:any)=>({id:clean(u.uid || u.id,180),email:clean(u.email,180),display_name:clean(u.name || u.displayName || u.fullName,180),role:u.role || "candidate",status:clean(u.status || u.accountStatus || "active",60),source_ref:clean(u.id || u.uid,180),profile:toPayload(u),created_at:iso(u.createdAt)})).filter((x:any)=>x.id);
        const jobRows = jobs.map((j:any)=>({id:clean(j.id,180),owner_uid:clean(j.ownerUid || j.createdBy || j.postedBy,180),recruiter_id:clean(j.recruiterId,180),employer_id:clean(j.employerId || j.companyId,180),consultancy_id:clean(j.consultancyId,180),title:clean(j.title,240),company_name:clean(j.companyName,240),status:clean(j.status || "draft",60),location:clean(j.location,240),created_at:iso(j.createdAt),source_ref:clean(j.id,180),payload:toPayload(j)})).filter((x:any)=>x.id);
        const appRows = allApps.map((a:any)=>({id:clean(a.id,180),job_id:clean(a.jobId,180),candidate_id:clean(a.candidateId || a.userId,180),recruiter_id:clean(a.recruiterId || a.assignedRecruiterId,180),employer_id:clean(a.employerId || a.companyId,180),consultancy_id:clean(a.consultancyId,180),status:statusOf(a),applied_at:iso(a.appliedAt || a.createdAt),source_ref:clean(a.id,180),payload:toPayload(a)})).filter((x:any)=>x.id);
        const interviewRows = interviews.map((i:any)=>({id:clean(i.id,180),application_id:clean(i.applicationId || i.application_id,180),job_id:clean(i.jobId,180),candidate_id:clean(i.candidateId,180),recruiter_id:clean(i.recruiterId,180),employer_id:clean(i.employerId,180),status:clean(i.status || "scheduled",60),scheduled_at:iso(i.scheduledAt || i.interviewDate),source_ref:clean(i.id,180),payload:toPayload(i)})).filter((x:any)=>x.id);
        const auditRows = auditEvents.slice(0,2000).map((a:any)=>({id:a.id,actor_uid:a.actorUid,actor_email:a.actorEmail,actor_role:a.actorRole,action:a.action,entity_type:a.entityType,entity_id:a.entityId,job_id:"",application_id:"",details:a.details,occurred_at:a.occurredAt || new Date().toISOString(),source_ref:a.id,payload:toPayload(a)})).filter((x:any)=>x.id);
        const screeningRows = [...screeningRaw,...allApps.filter((a:any)=>a.screeningSummary || a.screeningResult || a.aiScreeningSummary)].map((s:any)=>({id:clean(s.id || s.evaluationId,180),application_id:clean(s.applicationId || s.application_id || (s.screeningSummary ? s.id : ""),180),job_id:clean(s.jobId,180),candidate_id:clean(s.candidateId,180),evaluated_by:clean(s.evaluatedBy || s.createdBy,180),score:Number.isFinite(Number(s.score ?? s.screeningScore ?? s.aiScreeningScore)) ? Number(s.score ?? s.screeningScore ?? s.aiScreeningScore) : null,outcome:clean(s.outcome || s.screeningOutcome || s.screeningResult?.outcome || "evaluated",80),evaluated_at:iso(s.evaluatedAt || s.screeningEvaluatedAt || s.updatedAt) || new Date().toISOString(),payload:toPayload(s),source_ref:clean(s.id,180)})).filter((x:any)=>x.id && x.application_id);
        await mirrorToNeon(sql,userRows,jobRows,appRows,interviewRows,auditRows,screeningRows);
        neonSync = "synced";
      } catch (error:any) { console.error("[AIJOBS reports] Neon mirror failed:",error?.message || error); neonSync="sync_failed"; }
    }

    const format = clean(q.format,10).toLowerCase();
    if (format === "csv") {
      const headers=["Application ID","Job ID","Job Title","Candidate ID","Candidate Name","Recruiter ID","Employer ID","Status","Applied At"];
      const lines=[headers,...filteredApps.map((a:any)=>[a.id,a.jobId,a.jobTitle,a.candidateId||a.userId,a.candidateName||a.name,a.recruiterId||a.assignedRecruiterId,a.employerId||a.companyId,statusOf(a),iso(a.appliedAt||a.createdAt)])].map(row=>row.map(csvCell).join(","));
      res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition",'attachment; filename="aijobs-applications-report.csv"'); res.status(200).send(lines.join("\r\n")); return true;
    }
    res.setHeader("Cache-Control","no-store");
    res.json({success:true,source:"Firestore live records with Neon PostgreSQL reporting mirror",neonSync,generatedAt:new Date().toISOString(),limits:{users:10000,applications:10000,otherCollections:5000},filters:{startDate,endDate,jobId,recruiterId,employerId,page,pageSize},summary:{totalUsers:users.length,candidates:byRole.candidate||0,recruiters:byRole.recruiter||0,employers:byRole.employer||0,consultancies:byRole.consultancy||0,totalJobs:jobs.length,activeJobs:jobs.filter((j:any)=>["live","open","published","approved"].includes(roleOf(j.status))).length,totalApplications:filteredApps.length,totalInterviews:filteredInterviews.length,totalAuditEvents:auditEvents.length,screeningEvaluations:screeningResults.length},byRole,byJobStatus,byStage,interviewStatus,recruiterPerformance:Array.from(recruiterMap.values()),employerPerformance:Array.from(employerMap.values()),jobPerformance:Array.from(jobMap.values()),applications:pagedApps.map((a:any)=>({id:a.id,jobId:a.jobId,jobTitle:a.jobTitle,candidateId:a.candidateId||a.userId,candidateName:a.candidateName||a.name,recruiterId:a.recruiterId||a.assignedRecruiterId,employerId:a.employerId||a.companyId,status:statusOf(a),appliedAt:iso(a.appliedAt||a.createdAt)})),auditEvents:pagedAudit,screeningResults:screeningResults.slice(0,2000)});
    return true;
  } catch (error:any) {
    console.error("[AIJOBS admin reports]",error?.message || error);
    res.status(Number(error?.status)||500).json({success:false,error:"REPORTS_UNAVAILABLE",message:"Unable to load live reports. Please retry or contact the Super Admin."});
    return true;
  }
}
