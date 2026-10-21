import type { Request, Response } from "express";
import { getFirestoreDb } from "./firestoreHelper.js";

const norm = (v: unknown) => String(v || "").trim().toLowerCase();
const okKyc = (v: unknown) => ["approved","verified","kyc_approved","active"].includes(norm(v));
const okAgreement = (v: unknown) => ["accepted","signed","payment_completed","completed"].includes(norm(v));
const okPayment = (v: unknown) => ["paid","success","verified"].includes(norm(v));

function latestFor(rows: any[], uid: string) {
  return rows
    .filter(r => [r.userId, r.uid, r.ownerUid, r.recruiterId, r.consultancyId].includes(uid))
    .sort((a,b) => {
      const ta = new Date(a.updatedAt || a.reviewedAt || a.paidAt || a.createdAt || a.submittedAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.reviewedAt || b.paidAt || b.createdAt || b.submittedAt || 0).getTime();
      return tb - ta;
    })[0];
}

async function allRows(db: any, name: string) {
  const snap = await db.collection(name).get();
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
}

export async function handleAdminOnboardingApprovalRoute(req: Request, res: Response): Promise<boolean> {
  const path = String(req.url || "").split("?")[0].replace(/\/+$/, "") || "/";
  if (!["/api/admin/onboarding-list","/api/admin/approve-account","/api/admin/manual-partner-override"].includes(path)) return false;

  const db = getFirestoreDb();

  try {
    if (path === "/api/admin/onboarding-list" && req.method === "GET") {
      const [users, verifications, kycProfiles, agreements, payments, paymentOrders, subscriptions] = await Promise.all([
        allRows(db,"users"), allRows(db,"verification_requests"), allRows(db,"kyc_profiles"),
        allRows(db,"agreements"), allRows(db,"payments"), allRows(db,"payment_orders"), allRows(db,"subscriptions")
      ]);

      const statusQ = norm((req.query as any)?.status || "all");
      const roleQ = norm((req.query as any)?.role || "all");
      const searchQ = norm((req.query as any)?.search || "");

      const out = users.map((u:any) => {
        const uid = u.uid || u.id;
        const vr = latestFor(verifications, uid);
        const kp = kycProfiles.find((x:any) => (x.userId || x.id) === uid);
        const ag = latestFor(agreements, uid);
        const p = latestFor(payments, uid);
        const po = latestFor(paymentOrders, uid);
        const sub = subscriptions.find((x:any) => [x.userId,x.uid,x.id].includes(uid) || x.id === `sub_${uid}`);

        const kycStatus = [vr?.kycStatus, vr?.verificationStatus, kp?.kycStatus, u.kycStatus, u.verificationStatus].find(okKyc)
          || vr?.kycStatus || vr?.verificationStatus || kp?.kycStatus || u.kycStatus || u.verificationStatus || "kyc_pending";
        const agreementStatus = [ag?.status, u.agreementStatus].find(okAgreement)
          || ag?.status || u.agreementStatus || "pending";
        const paymentStatus = [po?.status, p?.status, u.paymentStatus, sub?.paymentStatus].find(okPayment)
          || po?.status || p?.status || u.paymentStatus || sub?.paymentStatus || "pending";

        const accountStatus = u.accountStatus || (u.isApproved ? "active" : "registered");
        return {
          uid, email:u.email || "", displayName:u.displayName || u.name || u.companyName || "Unnamed User",
          companyName:u.companyName || "", phone:u.phoneNumber || u.phone || "", role:u.role || "recruiter",
          registrationDate:u.createdAt || "", accountStatus, kycStatus, agreementStatus, paymentStatus,
          verificationRequestId: vr?.requestId || vr?.id || "", agreementId: ag?.agreementId || ag?.id || "",
          paymentOrderId: po?.orderId || po?.id || "", subscriptionStatus: sub?.status || u.subscriptionStatus || "inactive",
          isApproved:!!u.isApproved, isActive:u.isActive !== false, riskLevel:vr?.riskLevel || "LOW RISK",
          riskFlags:vr?.riskFlags || [], lastActivityAt:u.updatedAt || vr?.reviewedAt || vr?.submittedAt || u.createdAt || "",
          kycReminderCount:u.kycReminderCount || 0
        };
      }).filter((u:any) => {
        if (roleQ !== "all" && norm(u.role) !== roleQ) return false;
        if (statusQ !== "all" && norm(u.accountStatus) !== statusQ && norm(u.kycStatus) !== statusQ) return false;
        if (searchQ) {
          const h = [u.uid,u.email,u.displayName,u.companyName,u.phone].join(" ").toLowerCase();
          if (!h.includes(searchQ)) return false;
        }
        return true;
      });

      return res.json({ success:true, totalCount:out.length, users:out }), true;
    }

    if (path === "/api/admin/manual-partner-override" && req.method === "POST") {
      const body:any = req.body || {};
      const uid = String(body.targetUserId || "").trim();
      if (!uid) { res.status(400).json({success:false,error:"targetUserId is required."}); return true; }

      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) { res.status(404).json({success:false,error:"User profile not found."}); return true; }

      const user:any = userSnap.data() || {};
      const now = new Date().toISOString();
      const reviewedBy = String(body.reviewedBy || body.adminUserName || "Super Admin").trim();
      const kycStatus = norm(body.kycStatus || user.kycStatus || "pending");
      const documentsStatus = norm(body.documentsStatus || "pending");
      const agreementStatus = norm(body.agreementStatus || user.agreementStatus || "pending");
      const paymentStatus = norm(body.paymentStatus || user.paymentStatus || "pending");
      const subscriptionStatus = norm(body.subscriptionStatus || user.subscriptionStatus || "inactive");
      const planName = String(body.planName || user.activePlanName || user.planName || "AIJOBS Database Access Plan").trim();
      const adminNotes = String(body.adminNotes || "").trim();
      const fullName = String(body.fullName || user.name || user.displayName || "").trim();
      const mobile = String(body.mobile || user.phone || user.phoneNumber || "").trim();
      const paymentAmount = Number(body.paymentAmount || 0);
      const expiresAtInput = String(body.expiresAt || "").trim();
      const expiresAt = expiresAtInput
        ? new Date(expiresAtInput).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const kycApproved = okKyc(kycStatus);
      const agreementAccepted = okAgreement(agreementStatus);
      const paymentPaid = okPayment(paymentStatus);
      const subscriptionActive = subscriptionStatus === "active";
      const allActive = kycApproved && agreementAccepted && paymentPaid && subscriptionActive;

      const userUpdates:any = {
        name: fullName || user.name || user.displayName || "Partner",
        phone: mobile || user.phone || user.phoneNumber || "",
        kycStatus: kycApproved ? "verified" : kycStatus,
        verificationStatus: kycApproved ? "approved" : kycStatus,
        agreementStatus,
        paymentStatus: paymentPaid ? "paid" : paymentStatus,
        subscriptionStatus,
        activePlanName: planName,
        subscriptionExpiresAt: subscriptionActive ? expiresAt : (user.subscriptionExpiresAt || null),
        isApproved: allActive ? true : Boolean(user.isApproved && kycApproved),
        isActive: allActive ? true : user.isActive !== false,
        status: allActive ? "active" : (user.status || "pending"),
        accountStatus: allActive ? "active" : (kycApproved ? "pending_activation" : "pending_kyc"),
        manualOverrideAt: now,
        manualOverrideBy: reviewedBy,
        adminNotes,
        updatedAt: now
      };

      const batch = db.batch();
      batch.set(userRef, userUpdates, {merge:true});

      const verificationId = String(body.verificationRequestId || `manual_kyc_${uid}`);
      batch.set(db.collection("verification_requests").doc(verificationId), {
        requestId: verificationId,
        userId: uid,
        role: user.role || "recruiter",
        kycStatus: kycApproved ? "verified" : kycStatus,
        verificationStatus: kycApproved ? "approved" : kycStatus,
        documentsStatus,
        manualEntry: true,
        reviewedAt: now,
        reviewedBy,
        adminNotes,
        updatedAt: now
      }, {merge:true});

      batch.set(db.collection("kyc_profiles").doc(uid), {
        userId: uid,
        role: user.role || "recruiter",
        kycStatus: kycApproved ? "verified" : kycStatus,
        documentsStatus,
        personalDetails: {
          fullName: fullName || user.name || user.displayName || "",
          mobile: mobile || user.phone || user.phoneNumber || "",
          email: user.email || ""
        },
        manualEntry: true,
        reviewedAt: now,
        reviewedBy,
        adminNotes,
        updatedAt: now
      }, {merge:true});

      const agreementId = String(body.agreementId || `manual_agreement_${uid}`);
      batch.set(db.collection("agreements").doc(agreementId), {
        agreementId,
        userId: uid,
        role: user.role || "recruiter",
        status: agreementAccepted ? "accepted" : agreementStatus,
        acceptedAt: agreementAccepted ? now : null,
        planSummary: { planName, validityDays: 30 },
        manualEntry: true,
        reviewedBy,
        updatedAt: now
      }, {merge:true});

      const orderId = String(body.paymentOrderId || `manual_order_${uid}`);
      batch.set(db.collection("payment_orders").doc(orderId), {
        orderId,
        userId: uid,
        role: user.role || "recruiter",
        status: paymentPaid ? "paid" : paymentStatus,
        amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
        paidAt: paymentPaid ? now : null,
        paymentSource: "admin_manual_override",
        paymentMethod: "manual_admin",
        gatewaySignatureVerified: false,
        manualEntry: true,
        reviewedBy,
        updatedAt: now
      }, {merge:true});

      const subscriptionId = `sub_${uid}`;
      batch.set(db.collection("subscriptions").doc(subscriptionId), {
        subscriptionId,
        userId: uid,
        role: user.role || "recruiter",
        planName,
        status: subscriptionStatus,
        startsAt: subscriptionActive ? now : null,
        expiresAt: subscriptionActive ? expiresAt : null,
        paymentStatus: paymentPaid ? "paid" : paymentStatus,
        manualEntry: true,
        approvedBy: reviewedBy,
        updatedAt: now
      }, {merge:true});

      if (norm(user.role)==="recruiter") batch.set(db.collection("recruiters").doc(uid), userUpdates, {merge:true});
      if (["consultancy","agency"].includes(norm(user.role))) batch.set(db.collection("consultancies").doc(uid), userUpdates, {merge:true});
      if (norm(user.role)==="employer") batch.set(db.collection("employers").doc(uid), userUpdates, {merge:true});

      batch.set(db.collection("onboarding_timelines").doc(`manual_${uid}_${Date.now()}`), {
        userId: uid,
        stage: "ADMIN_MANUAL_OVERRIDE",
        title: "Onboarding status manually updated",
        description: `KYC=${kycStatus}; Documents=${documentsStatus}; Agreement=${agreementStatus}; Payment=${paymentStatus}; Subscription=${subscriptionStatus}`,
        timestamp: now,
        actor: reviewedBy,
        adminNotes
      });

      await batch.commit();
      res.json({
        success:true,
        message:"Manual onboarding details saved and recruiter access state synchronized.",
        resolved:{kycStatus:kycApproved ? "verified" : kycStatus,documentsStatus,agreementStatus,paymentStatus:paymentPaid ? "paid" : paymentStatus,subscriptionStatus,accountStatus:allActive ? "active" : userUpdates.accountStatus}
      });
      return true;
    }

    if (path === "/api/admin/approve-account" && req.method === "POST") {
      const body:any = req.body || {};
      const uid = String(body.targetUserId || "").trim();
      if (!uid) { res.status(400).json({success:false,error:"targetUserId is required."}); return true; }

      const [userSnap, verifications, kycProfiles, agreements, payments, paymentOrders, subscriptions] = await Promise.all([
        db.collection("users").doc(uid).get(), allRows(db,"verification_requests"), allRows(db,"kyc_profiles"),
        allRows(db,"agreements"), allRows(db,"payments"), allRows(db,"payment_orders"), allRows(db,"subscriptions")
      ]);
      if (!userSnap.exists) { res.status(404).json({success:false,error:"User profile not found."}); return true; }

      const user:any = userSnap.data() || {};
      const vr = latestFor(verifications,uid);
      const kp = kycProfiles.find((x:any)=>(x.userId || x.id)===uid);
      const ag = latestFor(agreements,uid);
      const p = latestFor(payments,uid);
      const po = latestFor(paymentOrders,uid);
      const sub = subscriptions.find((x:any)=>[x.userId,x.uid,x.id].includes(uid) || x.id===`sub_${uid}`);

      const kycOk = [user.kycStatus,user.verificationStatus,vr?.kycStatus,vr?.verificationStatus,kp?.kycStatus].some(okKyc);
      const agmtOk = [user.agreementStatus,ag?.status].some(okAgreement) || Boolean(ag?.acceptedAt || ag?.signedAt);
      const payOk = [user.paymentStatus,p?.status,po?.status,sub?.paymentStatus].some(okPayment) || norm(sub?.status)==="active";

      if (!kycOk || !agmtOk || !payOk) {
        res.status(400).json({
          success:false,
          error:"PREREQUISITES_MISSING",
          message:`Cannot activate account. Prerequisites missing: KYC Approved=${kycOk}, Agreement Signed=${agmtOk}, Payment Verified=${payOk}.`,
          prerequisites:{kycApproved:kycOk,agreementSigned:agmtOk,paymentVerified:payOk},
          resolvedStatus:{
            kyc:vr?.kycStatus || vr?.verificationStatus || kp?.kycStatus || user.kycStatus || user.verificationStatus || "pending",
            agreement:ag?.status || user.agreementStatus || "pending",
            payment:po?.status || p?.status || user.paymentStatus || sub?.paymentStatus || "pending"
          }
        });
        return true;
      }

      const now = new Date().toISOString();
      const reviewedBy = body.reviewedBy || "Super Admin";
      const updates = {
        accountStatus:"active", status:"active", isActive:true, isApproved:true,
        kycStatus:"verified", agreementStatus:"accepted", paymentStatus:"paid",
        subscriptionStatus: sub?.status || "active",
        approvedAt:now, approvedBy:reviewedBy, adminNotes:body.adminNotes || "", updatedAt:now
      };
      const batch = db.batch();
      batch.set(db.collection("users").doc(uid), updates, {merge:true});
      if (norm(user.role)==="recruiter") batch.set(db.collection("recruiters").doc(uid), updates, {merge:true});
      if (["consultancy","agency"].includes(norm(user.role))) batch.set(db.collection("consultancies").doc(uid), updates, {merge:true});
      batch.set(db.collection("onboarding_timelines").doc(`tl_${uid}_${Date.now()}`), {
        userId:uid, stage:"ACCOUNT_ACTIVATED", title:"Account Activated & Granted Workspace Access",
        description:`Final clearance granted by ${reviewedBy}. KYC, agreement and payment verified from canonical records.`,
        timestamp:now, actor:reviewedBy
      });
      await batch.commit();

      res.json({success:true,message:"Account approved and full workspace privileges activated.",accountStatus:"active"});
      return true;
    }

    res.status(405).json({success:false,error:"METHOD_NOT_ALLOWED"});
    return true;
  } catch (e:any) {
    console.error("[AdminOnboardingApprovalRoute]", e?.message || e);
    res.status(500).json({success:false,error:"ONBOARDING_APPROVAL_FAILED",message:e?.message || "Onboarding approval failed."});
    return true;
  }
}
