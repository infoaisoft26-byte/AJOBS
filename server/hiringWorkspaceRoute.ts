import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const HIRING_ROLES = new Set(["employer", "recruiter", "consultancy"]);
const PIPELINE = new Set(["applied","viewed","shortlisted","interview_scheduled","selected","rejected","hired"]);
function clean(v:any,max=300){return String(v??"").trim().slice(0,max)}
function norm(v:any){return clean(v,60).toLowerCase().replace(/[\s-]+/g,"_")}
async function ctx(req:Request){const h=String(req.headers.authorization||"");if(!h.startsWith("Bearer "))throw Object.assign(new Error("Authentication required."),{status:401});const decoded=await getFirebaseAuth().verifyIdToken(h.slice(7),true);const db=getFirestoreDb();const us=await db.collection("users").doc(decoded.uid).get();if(!us.exists)throw Object.assign(new Error("Hiring profile not found."),{status:403});const profile:any=us.data()||{};const role=norm(profile.role);if(!HIRING_ROLES.has(role))throw Object.assign(new Error("Hiring workspace access denied."),{status:403});return{decoded,db,profile,role}}
function ownsJob(j:any,uid:string){return [j.ownerUid,j.createdBy,j.postedBy,j.recruiterId,j.employerId,j.consultancyId].some(v=>v===uid)}
function ownsApp(a:any,uid:string){return [a.jobOwnerUid,a.ownerUid,a.recruiterId,a.employerId,a.consultancyId,a.assignedRecruiterId].some(v=>v===uid)}

export async function handleHiringWorkspaceRoute(req:Request,res:Response):Promise<boolean>{
 const path=String(req.url||"").split("?")[0].replace(/\/+$/,"")||"/";
 if(!path.startsWith("/api/hire/workspace"))return false;
 try{
  const {decoded,db,profile,role}=await ctx(req);
  if(req.method==="GET"&&path==="/api/hire/workspace"){
   const [jobsSnap,appsSnap,creditsSnap]=await Promise.all([db.collection("jobs").get(),db.collection("applications").get(),db.collection("jobCredits").doc(decoded.uid).get()]);
   const jobs=jobsSnap.docs.map(d=>({id:d.id,...d.data()} as any)).filter(j=>ownsJob(j,decoded.uid));
   const jobIds=new Set(jobs.map((j:any)=>j.id));
   const applications=appsSnap.docs.map(d=>({id:d.id,...d.data()} as any)).filter(a=>ownsApp(a,decoded.uid)||jobIds.has(a.jobId));
   const s=(v:any)=>norm(v);
   const activeJobs=jobs.filter((j:any)=>s(j.status)==="approved").length,pendingJobs=jobs.filter((j:any)=>["pending_review","changes_requested"].includes(s(j.status))).length,expiredJobs=jobs.filter((j:any)=>["expired","closed"].includes(s(j.status))).length;
   const count=(...states:string[])=>applications.filter((a:any)=>states.includes(s(a.status))).length;
   const credits:any=creditsSnap.data()||{};const available=(Number(credits.freeCredits)||0)+(Number(credits.paidCredits)||0)-(Number(credits.usedCredits)||0);
   res.json({success:true,profile:{uid:decoded.uid,name:profile.name,email:profile.email,role},stats:{activeJobs,pendingJobs,expiredJobs,applications:applications.length,shortlisted:count("shortlisted"),interviews:count("interview","interview_scheduled"),hired:count("hired","joined"),availableJobCredits:Math.max(0,available)},jobs:jobs.sort((a:any,b:any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))),applications:applications.sort((a:any,b:any)=>String(b.appliedAt||b.createdAt||"").localeCompare(String(a.appliedAt||a.createdAt||"")))});return true
  }
  const close=path.match(/^\/api\/hire\/workspace\/jobs\/([^/]+)\/close$/);
  if(req.method==="POST"&&close){const ref=db.collection("jobs").doc(clean(close[1],120)),snap=await ref.get();if(!snap.exists){res.status(404).json({success:false,error:"Job not found."});return true}const job:any=snap.data()||{};if(!ownsJob(job,decoded.uid)){res.status(403).json({success:false,error:"You can only close your own jobs."});return true}await ref.set({status:"closed",closedAt:new Date().toISOString(),updatedAt:new Date().toISOString()},{merge:true});res.json({success:true,status:"closed"});return true}
  const appStatus=path.match(/^\/api\/hire\/workspace\/applications\/([^/]+)\/status$/);
  if(req.method==="POST"&&appStatus){const ref=db.collection("applications").doc(clean(appStatus[1],120)),snap=await ref.get();if(!snap.exists){res.status(404).json({success:false,error:"Application not found."});return true}const app:any=snap.data()||{};const jobSnap=app.jobId?await db.collection("jobs").doc(app.jobId).get():null;const job:any=jobSnap?.exists?jobSnap.data():{};if(!(ownsApp(app,decoded.uid)||ownsJob(job,decoded.uid))){res.status(403).json({success:false,error:"You can only manage applications for your own jobs."});return true}const next=norm(req.body?.status);if(!PIPELINE.has(next)){res.status(400).json({success:false,error:"Invalid application status."});return true}await ref.set({status:next,updatedAt:new Date().toISOString(),lastUpdatedBy:decoded.uid},{merge:true});res.json({success:true,status:next});return true}
  res.status(404).json({success:false,error:"Hiring workspace endpoint not found."});return true
 }catch(error:any){res.status(Number(error?.status||500)).json({success:false,error:error?.message||"Hiring workspace request failed."});return true}
}
