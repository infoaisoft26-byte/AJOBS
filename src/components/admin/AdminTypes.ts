export interface SystemAuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  action: "LOGIN" | "UPDATE" | "APPROVAL" | "REJECTION" | "PAYMENT" | "SETTINGS_CHANGE" | "AI_ACTION" | "DELETE" | "SYSTEM";
  category: "User" | "Approval" | "Job" | "AI" | "Payment" | "Content" | "Support" | "System" | "Security";
  description: string;
  ipAddress: string;
  deviceInfo: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: "candidate" | "consultancy" | "employer" | "guest";
  subject: string;
  message: string;
  status: "OPEN" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: "Billing" | "Technical" | "Account" | "AI Resume" | "AI Interview" | "General";
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  replies?: Array<{
    id: string;
    sender: "admin" | "user";
    senderName: string;
    message: string;
    createdAt: string;
  }>;
}

export interface ApprovalRequest {
  id: string;
  targetId: string; // userId or companyId
  targetName: string;
  targetType: "consultancy" | "employer" | "document" | "job";
  email: string;
  gstNumber?: string;
  panNumber?: string;
  documentUrl?: string;
  documentType?: "GST Certificate" | "PAN Card" | "Incorporate Doc" | "Job Offer";
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  comments?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  timeline: Array<{
    id: string;
    status: string;
    note: string;
    timestamp: string;
    by: string;
  }>;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  targetRole: "all" | "candidate" | "consultancy" | "employer" | "admin";
  type: "announcement" | "maintenance" | "alert" | "info";
  sentBy: string;
  createdAt: string;
  deliveredCount: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: "Welcome" | "Verification" | "Interview Schedule" | "Offer Release" | "Payment Invoice" | "Security Alert";
  variables: string[];
  lastUpdated: string;
}

export interface CMSContent {
  id: string;
  type: "blog" | "faq" | "testimonial" | "banner" | "page";
  title: string;
  slug?: string;
  content: string;
  status: "draft" | "published";
  category?: string;
  author?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSystemSettings {
  id: string;
  general: {
    siteName: string;
    supportEmail: string;
    contactPhone: string;
    address: string;
    maintenanceMode: boolean;
  };
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    secure: boolean;
  };
  firebase: {
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
  };
  api: {
    geminiKeySecure: boolean;
    razorpayKeyId: string;
    stripePublicKey: string;
  };
  aiConfig: {
    analyzerTemperature: number;
    analyzerModel: string;
    interviewModel: string;
    matchingThreshold: number; // e.g. 70 for match
  };
  security: {
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
    mfaRequired: boolean;
    ipWhitelist: string[];
  };
  backup: {
    frequency: "daily" | "weekly" | "monthly";
    lastBackupAt: string;
    totalBackups: number;
  };
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  gstAmount: number;
  discountAmount: number;
  totalPaid: number;
  currency: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED";
  couponCode?: string;
  gateway: "Razorpay" | "Stripe" | "System Manual";
  invoiceNumber: string;
  createdAt: string;
}

export interface LiveStats {
  totalCandidates: number;
  totalConsultancies: number;
  totalEmployers: number;
  totalJobs: number;
  activeJobs: number;
  applicationsToday: number;
  interviewsToday: number;
  resumesAnalyzedToday: number;
  revenueToday: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  pendingApprovals: number;
  supportTickets: number;
  liveOnlineUsers: number;
  registrationsToday: number;
}
