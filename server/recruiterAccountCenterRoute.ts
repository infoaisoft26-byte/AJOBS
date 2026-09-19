import type { Request, Response } from "express";
import { getFirebaseAuth, getFirestoreDb } from "./firestoreHelper.js";

const norm = (v: unknown) => String(v || "").trim().toLowerCase();
const okKyc = (v: unknown) => ["approved","verified","kyc_approved","active"].includes(norm(v));
const okAgreement = (v: unknown) => ["accepted","signed","payment_completed","completed"].includes(norm(v));
const okPayment = (v: unknown) => ["paid","success","verified"].includes(norm(v));

function ts(v: any) {
  if (!v) return 0;
  if (typeof v?.toDate === "function") return v.toDate().getTime();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
function latest(rows: any[], uid: string) {
  return rows
    .filter(r => [r.userId, r.uid, r.ownerUid, r.recruiterId, r.consultancyId].includes(uid))
    .sort((a,b) => Math.max(ts(b.updatedAt),ts(b.reviewedAt),ts(b.paidAt),ts(b.createdAt),ts(b.submittedAt)) - Math.max(ts(a.updatedAt),ts(a.reviewedAt),ts(a.paidAt),ts(a.createdAt),ts(a.submittedAt)))[0];
}
async function rows(db: any, name: string) {
  const snap = await db.collection(name).get();
  return snap.docs.map((d:any)=>({ id:d.id, ...d.data() }));
}
function cleanDoc(doc: any) {
  if (!doc) return null;
  return {
    id: doc.id || null,
    requestId: doc.requestId || null,
    status: doc.status || null,
    kycStatus: doc.kycStatus || doc.verificationStatus || null,
    riskLevel: doc.riskLevel || null,
    submittedAt: doc.submittedAt || doc.createdAt || null,
    reviewedAt: doc.reviewedAt || null,
    reviewedBy: doc.reviewedBy || null,
    rejectionReason: doc.rejectionReason || doc.adminNotes || null,
    documents: (doc.submittedDocuments || doc.documents || []).map((x:any)=>({
      id:x.id || x.publicId || null,
      type:x.docType || x.documentType || x.type || "Document",
      fileName:x.fileName || null,
      secureUrl:x.secureUrl || x.url || null,
      uploadedAt:x.uploadedAt || null
    }))
  };
}

export async function handleRecruiterAccountCenterRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (path !== "/api/recruiter/account-center") return false;

  if (req.method !== "GET") {
    res.setHeader("Allow","GET");
    res.status(405).json({success:false,error:"METHOD_NOT_ALLOWED"});
    return true;
  }

  try {
    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({success:false,error:"UNAUTHORIZED",message:"Please sign in again."});
      return true;
    }
    const decoded:any = await getFirebaseAuth().verifyIdToken(authHeader.slice(7).trim(), true);
    const uid = decoded.uid;
    const db = getFirestoreDb();

    const [userSnap,recruiterSnap,profileSnap,verifications,kycProfiles,agreements,payments,paymentOrders,subscriptions,invoices] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("recruiters").doc(uid).get(),
      db.collection("recruiter_profiles").doc(uid).get(),
      rows(db,"verification_requests"),
      rows(db,"kyc_profiles"),
      rows(db,"agreements"),
      rows(db,"payments"),
      rows(db,"payment_orders"),
      rows(db,"subscriptions"),
      rows(db,"invoices")
    ]);

    if (!userSnap.exists) {
      res.status(404).json({success:false,error:"PROFILE_NOT_FOUND"});
      return true;
    }

    const user:any = userSnap.data() || {};
    const recruiter:any = recruiterSnap.exists ? recruiterSnap.data() || {} : {};
    const profile:any = profileSnap.exists ? profileSnap.data() || {} : {};
    const role = norm(user.role || recruiter.role);
    if (!["recruiter","employer","corporate","consultancy","agency"].includes(role)) {
      res.status(403).json({success:false,error:"ROLE_NOT_ELIGIBLE"});
      return true;
    }

    const vr = latest(verifications,uid);
    const kp = kycProfiles.find((x:any)=>(x.userId || x.uid || x.id)===uid);
    const ag = latest(agreements,uid);
    const pay = latest(payments,uid);
    const order = latest(paymentOrders,uid);
    const sub = subscriptions
      .filter((x:any)=>[x.userId,x.uid,x.id].includes(uid) || x.id===`sub_${uid}`)
      .sort((a:any,b:any)=>Math.max(ts(b.updatedAt),ts(b.startedAt),ts(b.createdAt))-Math.max(ts(a.updatedAt),ts(a.startedAt),ts(a.createdAt)))[0];
    const invoice = latest(invoices,uid);

    const kycStatus = [vr?.kycStatus,vr?.verificationStatus,kp?.kycStatus,user.kycStatus,user.verificationStatus].find(okKyc)
      || vr?.kycStatus || vr?.verificationStatus || kp?.kycStatus || user.kycStatus || user.verificationStatus || "not_submitted";
    const agreementStatus = [ag?.status,user.agreementStatus].find(okAgreement) || ag?.status || user.agreementStatus || "pending";
    const paymentStatus = [order?.status,pay?.status,user.paymentStatus,sub?.paymentStatus].find(okPayment)
      || order?.status || pay?.status || user.paymentStatus || sub?.paymentStatus || "pending";
    const subscriptionStatus = sub?.status || user.subscriptionStatus || "inactive";
    const fullyVerified = okKyc(kycStatus);
    const fullyPaid = okPayment(paymentStatus) || norm(subscriptionStatus)==="active";

    const plan = {
      id: sub?.planId || user.activePlanId || recruiter.activePlanId || null,
      name: sub?.planName || user.activePlanName || user.planName || recruiter.planName || user.subscription || "No active plan",
      status: subscriptionStatus,
      paymentStatus,
      startedAt: sub?.startsAt || sub?.startedAt || user.subscriptionStartAt || null,
      expiresAt: sub?.expiresAt || user.subscriptionExpiresAt || user.planExpiresAt || null,
      candidateViewsLimit: sub?.candidateViewsLimit ?? null,
      candidateViewsUsed: sub?.candidateViewsUsed ?? null,
      resumeDownloadsLimit: sub?.resumeDownloadsLimit ?? null,
      resumeDownloadsUsed: sub?.resumeDownloadsUsed ?? null,
      contactUnlocksLimit: sub?.contactUnlocksLimit ?? null,
      contactUnlocksUsed: sub?.contactUnlocksUsed ?? null,
      jobPostLimit: sub?.jobPostLimit ?? null,
      recruiterSeatLimit: sub?.recruiterSeatLimit ?? null
    };

    const payment = order || pay ? {
      status: paymentStatus,
      orderId: order?.orderId || order?.id || null,
      transactionId: order?.razorpayPaymentId || pay?.transactionId || pay?.paymentId || null,
      gateway: order?.gateway || pay?.gateway || null,
      amount: order?.amount ?? pay?.amount ?? user.paymentAmount ?? user.paidAmount ?? null,
      currency: order?.currency || pay?.currency || "INR",
      paidAt: order?.paidAt || pay?.paidAt || user.paymentVerifiedAt || null,
      verified: Boolean(order?.gatewayVerified || user.paymentVerified || fullyPaid)
    } : null;

    const agreement = ag ? {
      id: ag.agreementId || ag.id || null,
      number: ag.agreementNumber || null,
      status: agreementStatus,
      generatedAt: ag.generatedAt || ag.createdAt || null,
      acceptedAt: ag.acceptedAt || ag.signedAt || null,
      acceptedName: ag.acceptedName || ag.buyer?.name || null,
      pdfUrl: ag.pdfUrl || ag.documentUrl || null,
      planSummary: ag.planSummary || null
    } : null;

    const invoiceSummary = invoice ? {
      id: invoice.invoiceId || invoice.id || null,
      number: invoice.invoiceNumber || null,
      status: invoice.status || "generated",
      amount: invoice.totalAmount ?? invoice.amount ?? null,
      currency: invoice.currency || "INR",
      issuedAt: invoice.issuedAt || invoice.createdAt || null,
      url: invoice.pdfUrl || invoice.invoiceUrl || invoice.downloadUrl || null
    } : null;

    res.json({
      success:true,
      profile:{
        uid,
        name:user.name || user.displayName || profile.name || recruiter.name || "",
        email:user.email || decoded.email || profile.email || recruiter.email || "",
        phone:user.phone || user.phoneNumber || profile.phone || recruiter.phone || "",
        role:user.role || recruiter.role || "recruiter",
        companyName:user.companyName || recruiter.companyName || profile.companyName || "",
        city:user.city || profile.city || recruiter.city || "",
        state:user.state || profile.state || recruiter.state || "",
        designation:user.designation || profile.designation || recruiter.designation || "",
        createdAt:user.createdAt || recruiter.createdAt || null,
        accountStatus:user.accountStatus || user.status || recruiter.accountStatus || "registered",
        isApproved:Boolean(user.isApproved || recruiter.isApproved)
      },
      kyc:{
        status:kycStatus,
        approved:fullyVerified,
        submittedAt:vr?.submittedAt || kp?.submittedAt || null,
        reviewedAt:vr?.reviewedAt || kp?.reviewedAt || null,
        reviewedBy:vr?.reviewedBy || kp?.reviewedBy || null,
        details:cleanDoc(vr || kp)
      },
      agreement,
      payment,
      subscription:plan,
      invoice:invoiceSummary,
      onboarding:{
        kycComplete:fullyVerified,
        agreementComplete:okAgreement(agreementStatus) || Boolean(ag?.acceptedAt || ag?.signedAt),
        paymentComplete:fullyPaid,
        accountActive: norm(user.accountStatus || user.status)==="active" || Boolean(user.isApproved),
        currentStage: !fullyVerified ? "KYC review pending" : !(okAgreement(agreementStatus) || ag?.acceptedAt || ag?.signedAt) ? "Agreement pending" : !fullyPaid ? "Payment pending" : "Active / awaiting final clearance"
      }
    });
    return true;
  } catch (e:any) {
    console.error("[RecruiterAccountCenterRoute]", e?.message || e);
    res.status(500).json({success:false,error:"ACCOUNT_CENTER_FAILED",message:e?.message || "Could not load account and billing details."});
    return true;
  }
}
