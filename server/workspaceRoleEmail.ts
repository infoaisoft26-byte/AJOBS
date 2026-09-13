import nodemailer from "nodemailer";
import { COMPLIANCE_EMAIL, INFO_EMAIL, SALES_EMAIL } from "./siteConfig.js";

export type WorkspaceSenderRole = "info" | "sales" | "compliance";

type RoleSmtpConfig = {
  role: WorkspaceSenderRole;
  address: string;
  user: string;
  pass?: string;
  fromName: string;
};

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE !== "false";

function roleConfig(role: WorkspaceSenderRole): RoleSmtpConfig {
  const sharedUser = process.env.SMTP_USER || process.env.EMAIL_FROM_ADDRESS || INFO_EMAIL;
  const sharedPass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS;

  if (role === "sales") {
    return {
      role,
      address: SALES_EMAIL,
      user: process.env.SMTP_SALES_USER || sharedUser,
      pass: process.env.SMTP_SALES_APP_PASSWORD || sharedPass,
      fromName: process.env.EMAIL_SALES_FROM_NAME || "AIJOBS Sales India",
    };
  }

  if (role === "compliance") {
    return {
      role,
      address: COMPLIANCE_EMAIL,
      user: process.env.SMTP_COMPLIANCE_USER || sharedUser,
      pass: process.env.SMTP_COMPLIANCE_APP_PASSWORD || sharedPass,
      fromName: process.env.EMAIL_COMPLIANCE_FROM_NAME || "AIJOBS Compliance",
    };
  }

  return {
    role: "info",
    address: INFO_EMAIL,
    user: process.env.SMTP_INFO_USER || sharedUser,
    pass: process.env.SMTP_INFO_APP_PASSWORD || sharedPass,
    fromName: process.env.EMAIL_INFO_FROM_NAME || process.env.EMAIL_FROM_NAME || "AIJOBS Support",
  };
}

const transporters = new Map<string, nodemailer.Transporter>();

function getRoleTransporter(config: RoleSmtpConfig): nodemailer.Transporter {
  if (!config.pass) {
    throw new Error(`Google Workspace SMTP App Password is missing for ${config.role}.`);
  }

  const cacheKey = `${config.role}:${config.user}`;
  const cached = transporters.get(cacheKey);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: { rejectUnauthorized: true },
  });

  transporters.set(cacheKey, transporter);
  return transporter;
}

export async function sendWorkspaceRoleEmail(params: {
  role: WorkspaceSenderRole;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}) {
  const config = roleConfig(params.role);
  const transporter = getRoleTransporter(config);

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.address}>`,
    to: params.to,
    replyTo: params.replyTo || config.address,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });

  return {
    success: true,
    messageId: info.messageId,
    from: config.address,
    smtpUser: config.user,
  };
}
