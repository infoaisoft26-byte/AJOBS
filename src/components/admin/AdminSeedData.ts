import { db } from "../../firebase";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { 
  SystemAuditLog, SupportTicket, ApprovalRequest, 
  SystemNotification, EmailTemplate, CMSContent, 
  PaymentTransaction, AdminSystemSettings 
} from "./AdminTypes";

export async function seedSuperAdminDataIfEmpty(userId: string, userName: string, userEmail: string) {
  try {
    // 1. Seed System Settings
    const settingsRef = doc(db, "system_settings", "global_config");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      const defaultSettings: AdminSystemSettings = {
        id: "global_config",
        general: {
          siteName: "AIJobs Enterprise Platform",
          supportEmail: "enterprise-support@aijobs.global",
          contactPhone: "+91 (80) 4596-7811",
          address: "Level 11, Prestige Tech Park, Outer Ring Road, Bengaluru, KA - 560103",
          maintenanceMode: false
        },
        branding: {
          logoUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&q=80",
          primaryColor: "#4f46e5", // Indigo-600
          secondaryColor: "#9333ea", // Purple-600
          accentColor: "#f43f5e", // Rose-500
          fontFamily: "Space Grotesk"
        },
        smtp: {
          host: "smtp.sendgrid.net",
          port: 587,
          user: "apikey",
          secure: true
        },
        firebase: {
          projectId: "ai-studio-1424b91d-989e-47eb-a336-779ca0dbfc42",
          storageBucket: "ai-studio-1424b91d-989e-47eb-a336-779ca0dbfc42.appspot.com",
          messagingSenderId: "4815162342"
        },
        api: {
          geminiKeySecure: true,
          razorpayKeyId: "rzp_live_Efj39Skkd821La",
          stripePublicKey: "pk_live_51P8d928Skd1H34K"
        },
        aiConfig: {
          analyzerTemperature: 0.2,
          analyzerModel: "gemini-2.5-flash",
          interviewModel: "gemini-2.5-pro",
          matchingThreshold: 75
        },
        security: {
          maxLoginAttempts: 5,
          sessionTimeoutMinutes: 60,
          mfaRequired: false,
          ipWhitelist: ["127.0.0.1", "192.168.1.1"]
        },
        backup: {
          frequency: "daily",
          lastBackupAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          totalBackups: 142
        }
      };
      await setDoc(settingsRef, defaultSettings);
    }

    // 2. Check if audit logs are empty to seed
    const auditLogsSnap = await getDocs(collection(db, "audit_logs"));
    if (auditLogsSnap.empty) {
      const mockLogs: SystemAuditLog[] = [
        {
          id: "log_001",
          userId,
          userName,
          userEmail,
          role: "Super Admin",
          action: "LOGIN",
          category: "User",
          description: "Super Admin completed multi-factor authentication from secure terminal gateway.",
          ipAddress: "157.45.18.221",
          deviceInfo: "Chrome 124.0 / macOS Enterprise",
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        },
        {
          id: "log_002",
          userId: "emp_arizona",
          userName: "Arizona Labs Sourcing",
          userEmail: "recruitment@arizona.io",
          role: "Employer",
          action: "SETTINGS_CHANGE",
          category: "System",
          description: "Registered GST details for corporate payroll verification.",
          ipAddress: "49.206.11.84",
          deviceInfo: "Safari / iOS Mobile",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "log_003",
          userId,
          userName,
          userEmail,
          role: "Super Admin",
          action: "APPROVAL",
          category: "Approval",
          description: "Approved corporate onboarding documents for 'Hedgehog Fintech India'.",
          ipAddress: "157.45.18.221",
          deviceInfo: "Chrome 124.0 / macOS Enterprise",
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "log_004",
          userId: "consultancy_apex",
          userName: "Apex Sourcing Consultants",
          userEmail: "finance@apexconsult.in",
          role: "Consultancy",
          action: "PAYMENT",
          category: "Payment",
          description: "Subscribed to Consultancy Annual Enterprise Plan (Invoice #INV-2026-0894).",
          ipAddress: "103.45.12.98",
          deviceInfo: "Firefox / Linux Desktop",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "log_005",
          userId: "candidate_preeti",
          userName: "Preeti Iyer",
          userEmail: "preeti.iyer@gmail.com",
          role: "Candidate",
          action: "AI_ACTION",
          category: "AI",
          description: "Triggered AI Resume Analyzer scoring & matching algorithms on uploaded curriculum vitae.",
          ipAddress: "182.70.19.103",
          deviceInfo: "Chrome / Windows 11",
          createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const log of mockLogs) {
        await setDoc(doc(db, "audit_logs", log.id), log);
        // Sync to admin_logs too
        await setDoc(doc(db, "admin_logs", log.id), log);
      }
    }

    // 3. Seed Support Tickets
    const supportSnap = await getDocs(collection(db, "support"));
    if (supportSnap.empty) {
      const mockTickets: SupportTicket[] = [
        {
          id: "tkt_101",
          userId: "cand_01",
          userName: "Vikram Malhotra",
          userEmail: "vikram.m@techmail.com",
          role: "candidate",
          subject: "AI Interview Audio Connection Issue",
          message: "My microphone was not picking up sound during Question 3 of the AI mock session. I have completed the rest but my score is showing 0. Please help reset my slot.",
          status: "OPEN",
          priority: "HIGH",
          category: "AI Interview",
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          replies: []
        },
        {
          id: "tkt_102",
          userId: "emp_stripe_india",
          userName: "Stripe Sourcing Desk",
          userEmail: "stripe.india@stripe.com",
          role: "employer",
          subject: "Corporate Invoice Missing GST Breakdown",
          message: "Our finance department needs a copy of the monthly corporate invoice with our updated GSTIN number (29AABCS8893F1ZX). Currently it lists local state taxes directly.",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          category: "Billing",
          assignedTo: "Finance Coordinator",
          createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          replies: [
            {
              id: "rep_1",
              sender: "admin",
              senderName: userName,
              message: "Hello Stripe Desk, our finance unit is re-routing your invoice through the GST compiler. We will attach the manual GST breakdown PDF here shortly.",
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            }
          ]
        },
        {
          id: "tkt_103",
          userId: "cons_apex_hr",
          userName: "Apex Sourcing Executive",
          userEmail: "billing@apextalent.in",
          role: "consultancy",
          subject: "Enterprise Subscriptions Premium Cap Reset",
          message: "We have hired 45 candidates this month but our dashboard says we have reached the contract limit. Our pricing tier is Enterprise, please check.",
          status: "ESCALATED",
          priority: "CRITICAL",
          category: "Account",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const tkt of mockTickets) {
        await setDoc(doc(db, "support", tkt.id), tkt);
      }
    }

    // 4. Seed Corporate Approvals
    const approvalsSnap = await getDocs(collection(db, "approvals"));
    if (approvalsSnap.empty) {
      const mockApprovals: ApprovalRequest[] = [
        {
          id: "appr_101",
          targetId: "comp_001",
          targetName: "Goldman Tech Outsourcing",
          targetType: "employer",
          email: "hr-verification@goldmantech.com",
          gstNumber: "29AABCX4152G1ZY",
          panNumber: "AAACG4152G",
          documentUrl: "https://example.com/gst_goldman.pdf",
          documentType: "GST Certificate",
          status: "PENDING",
          submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          timeline: [
            {
              id: "t_1",
              status: "PENDING",
              note: "Corporate onboarding documents uploaded automatically during GST setup.",
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
              by: "Goldman Tech Bot"
            }
          ]
        },
        {
          id: "appr_102",
          targetId: "cons_quantum_talent",
          targetName: "Quantum Sourcing Labs",
          targetType: "consultancy",
          email: "verification@quantumtalent.in",
          gstNumber: "36BBDCV8821F1ZH",
          panNumber: "BBBDV8821F",
          documentUrl: "https://example.com/quantum_license.pdf",
          documentType: "Incorporate Doc",
          status: "CHANGES_REQUESTED",
          comments: "Please upload a high-resolution PDF instead of a camera photograph. The current file is blurry.",
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reviewedBy: userName,
          reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          timeline: [
            {
              id: "t_1",
              status: "PENDING",
              note: "Onboarding registry request submitted.",
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              by: "Quantum HR"
            },
            {
              id: "t_2",
              status: "CHANGES_REQUESTED",
              note: "Changes requested: Blurry upload. Need high-res scanner copy.",
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              by: userName
            }
          ]
        }
      ];

      for (const appr of mockApprovals) {
        await setDoc(doc(db, "approvals", appr.id), appr);
      }
    }

    // 5. Seed CMS Content
    const cmsSnap = await getDocs(collection(db, "cms"));
    if (cmsSnap.empty) {
      const mockCMS: CMSContent[] = [
        {
          id: "cms_faq_1",
          type: "faq",
          title: "How does the AI Resume Analyzer rank matching candidates?",
          content: "The AI system parses your resume text, extracts standard keywords, matches candidate skill matrices with job definitions, and outputs a score from 0-100 based on semantic proximity, years of experience, and location constraints.",
          status: "published",
          category: "AI Sourcing Features",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "cms_blog_1",
          type: "blog",
          title: "The Shift to AI-Powered Structured Recruitment inside India's Tech Scene",
          slug: "shift-to-ai-recruitment-india",
          content: "Enterprise platforms are moving away from traditional resume parsing toward contextual conversational assessments. Our platform is pioneering real-time dynamic technical evaluations...",
          status: "published",
          category: "Industry Trends",
          author: "Ananya Sen, Talent Advisory Lead",
          imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const content of mockCMS) {
        await setDoc(doc(db, "cms", content.id), content);
      }
    }

    // 6. Seed System Notifications
    const notificationsSnap = await getDocs(collection(db, "notifications"));
    // We only seed notifications if empty (avoid duplicate spam)
    if (notificationsSnap.empty) {
      const mockNotifs: SystemNotification[] = [
        {
          id: "notif_broadcast_1",
          title: "Upcoming AI Engine Core Upgrades",
          message: "Our generative models will undergo API gateway maintenance on Sunday 02:00 AM IST. Live interviews may experience brief socket reconnect timeouts.",
          targetRole: "all",
          type: "maintenance",
          sentBy: userName,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          deliveredCount: 412
        }
      ];

      for (const n of mockNotifs) {
        await setDoc(doc(db, "notifications", n.id), n);
      }
    }

    // 7. Seed Email Templates
    const emailsSnap = await getDocs(collection(db, "email_templates"));
    if (emailsSnap.empty) {
      const mockEmails: EmailTemplate[] = [
        {
          id: "tpl_welcome",
          name: "Candidate Welcome Greeting",
          subject: "Welcome to AIJobs, {{candidate_name}}! 🚀",
          body: "Dear {{candidate_name}},\n\nThank you for onboarding on AIJobs. Complete your profile, upload your resume, and let our Career Coach match you to premium enterprise positions automatically.\n\nWarm regards,\nSourcing Desk",
          category: "Welcome",
          variables: ["candidate_name"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "tpl_interview_scheduled",
          name: "AI Mock Interview Invitation",
          subject: "AI Technical Interview Scheduled: {{job_title}}",
          body: "Dear {{candidate_name}},\n\nYour automated evaluation slot for {{job_title}} at {{company_name}} is now ready.\n\nClick the dashboard to access the workspace.\n\nBest of luck,\nAI Recruiter Gatekeeper",
          category: "Interview Schedule",
          variables: ["candidate_name", "job_title", "company_name"],
          lastUpdated: new Date().toISOString()
        }
      ];

      for (const em of mockEmails) {
        await setDoc(doc(db, "email_templates", em.id), em);
      }
    }

    // 8. Seed Premium Subscriptions & Payment Transactions
    const paymentsSnap = await getDocs(collection(db, "payments"));
    if (paymentsSnap.empty) {
      const mockPayments: PaymentTransaction[] = [
        {
          id: "txn_2026_0911",
          userId: "cons_quantum_talent",
          userName: "Quantum Sourcing Labs",
          userEmail: "billing@quantumtalent.in",
          planName: "Consultancy Starter Plan",
          amount: 25000,
          gstAmount: 4500,
          discountAmount: 0,
          totalPaid: 29500,
          currency: "INR",
          status: "SUCCESS",
          gateway: "Razorpay",
          invoiceNumber: "INV-2026-9112",
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "txn_2026_0912",
          userId: "emp_stripe_india",
          userName: "Stripe Sourcing Desk",
          userEmail: "stripe.india@stripe.com",
          planName: "Corporate HR Enterprise Suite",
          amount: 75000,
          gstAmount: 13500,
          discountAmount: 5000,
          totalPaid: 83500,
          currency: "INR",
          status: "SUCCESS",
          couponCode: "ENTERPRISE50",
          gateway: "Stripe",
          invoiceNumber: "INV-2026-9113",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "txn_2026_0913",
          userId: "cand_vikram",
          userName: "Vikram Malhotra",
          userEmail: "vikram.m@techmail.com",
          planName: "Candidate Pro Boost",
          amount: 1499,
          gstAmount: 270,
          discountAmount: 100,
          totalPaid: 1669,
          currency: "INR",
          status: "SUCCESS",
          couponCode: "FESTIVE10",
          gateway: "Razorpay",
          invoiceNumber: "INV-2026-9114",
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "txn_2026_0914",
          userId: "emp_arizona",
          userName: "Arizona Labs Sourcing",
          userEmail: "recruitment@arizona.io",
          planName: "Corporate HR Starter",
          amount: 15000,
          gstAmount: 2700,
          discountAmount: 0,
          totalPaid: 17700,
          currency: "INR",
          status: "FAILED",
          gateway: "Razorpay",
          invoiceNumber: "INV-2026-9115",
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const pay of mockPayments) {
        await setDoc(doc(db, "payments", pay.id), pay);
      }
    }

  } catch (err) {
    console.error("Super Admin premium seed failure:", err);
  }
}
