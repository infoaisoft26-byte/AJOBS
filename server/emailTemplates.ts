export interface EmailTemplateData {
  candidateName?: string;
  recipientName?: string;
  email?: string;
  userRole?: string;
  jobTitle?: string;
  companyName?: string;
  location?: string;
  salary?: string;
  jobUrl?: string;
  applicationId?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewLink?: string;
  offerDetails?: string;
  resumeScore?: number;
  unsubscribeToken?: string;
  jobsList?: Array<{
    title: string;
    company: string;
    location: string;
    salary: string;
    url: string;
  }>;
  customSubject?: string;
  customMessage?: string;
  appUrl?: string;
}

const DEFAULT_APP_URL = process.env.VITE_SITE_URL || process.env.APP_URL || "https://aijobs1.vercel.app";
const SUPPORT_EMAIL = "infoaisoft26@gmail.com";

export function escapeHtml(str: string = ""): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getHeaderHTML(): string {
  return `
  <div style="background-color: #030712; padding: 24px 32px; border-bottom: 1px solid rgba(59, 130, 246, 0.2); text-align: center;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="vertical-align: middle;">
          <div style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
            AI<span style="color: #3b82f6;">JOBS</span>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 4px;">
          <span style="font-family: Arial, sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #60a5fa; font-weight: 700;">
            AI-POWERED RECRUITMENT PLATFORM
          </span>
        </td>
      </tr>
    </table>
  </div>
  `;
}

function getFooterHTML(showUnsubscribe: boolean = false, unsubscribeToken?: string, appUrl: string = DEFAULT_APP_URL): string {
  const unsubUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken || 'general'}`;
  
  return `
  <div style="background-color: #0b0f19; padding: 24px 32px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-family: Arial, sans-serif; color: #6b7280; font-size: 12px; line-height: 1.6;">
    <p style="margin: 0 0 8px 0; color: #9ca3af;">
      Need help? Contact our candidate support team at 
      <a href="mailto:${SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
    </p>
    <p style="margin: 0 0 12px 0;">
      © ${new Date().getFullYear()} AIJobs India Enterprise. All candidate services are 100% Free.
    </p>
    ${showUnsubscribe ? `
    <div style="padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); font-size: 11px;">
      <p style="margin: 0;">
        You received this job alert because you opted in to AIJobs Career Updates. 
        <a href="${unsubUrl}" style="color: #93c5fd; text-decoration: underline;">Unsubscribe or change email preferences</a>
      </p>
    </div>
    ` : ''}
  </div>
  `;
}

function wrapBaseLayout(title: string, bodyContent: string, showUnsubscribe: boolean = false, unsubscribeToken?: string, appUrl: string = DEFAULT_APP_URL): { subject: string; html: string; text: string } {
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #020617;">
    <tr>
      <td align="center" style="padding: 30px 15px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0f172a; border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- HEADER -->
          <tr>
            <td>
              ${getHeaderHTML()}
            </td>
          </tr>
          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 32px; color: #e2e8f0; font-size: 15px; line-height: 1.6;">
              ${bodyContent}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td>
              ${getFooterHTML(showUnsubscribe, unsubscribeToken, appUrl)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // Strip HTML tags for plain text fallback
  const plainText = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    subject: title,
    html: fullHtml,
    text: plainText
  };
}

export const EMAIL_TEMPLATES: Record<string, (data: EmailTemplateData) => { subject: string; html: string; text: string }> = {
  
  // 1. CANDIDATE WELCOME EMAIL
  'candidate_welcome': (data) => {
    const name = escapeHtml(data.candidateName || data.recipientName || 'Candidate');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Welcome to AIJobs – Registration Successful";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">
          Welcome to AIJobs, ${name}! 🎉
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Your candidate registration has been completed successfully. Welcome to India's most advanced AI-powered job matching and recruitment platform.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #60a5fa; font-size: 14px; font-weight: 700; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">
            Next Steps for You:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li><strong>Complete Your Profile:</strong> Fill in your skills, education, and career preferences to stand out to employers.</li>
            <li><strong>Upload Your Resume:</strong> Get instant AI ATS scoring and automated keyword analysis.</li>
            <li><strong>AI-Powered Job Matching:</strong> Our generative AI matches your profile with top verified job openings automatically.</li>
          </ul>
        </div>

        <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #f87171; font-size: 12px; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
            ⚠️ Candidate Safety Disclaimer
          </p>
          <p style="color: #fca5a5; font-size: 12px; line-height: 1.6; margin: 0;">
            AIJobs never charges candidates for job applications, interviews, selection, offer letters, placement, or joining. If anyone requests payment in the name of AIJobs, report it immediately.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
          If you have any questions or need assistance, reach out to our team at 
          <a href="mailto:${SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: underline;">${SUPPORT_EMAIL}</a>.
        </p>

        <div style="text-align: center; margin-top: 28px;">
          <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
            Access Candidate Portal: ${appUrl} →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // Alias for candidate-registration
  'candidate-registration': (data) => EMAIL_TEMPLATES['candidate_welcome'](data),

  // 2. RECRUITER WELCOME EMAIL
  'recruiter_welcome': (data) => {
    const name = escapeHtml(data.recipientName || data.candidateName || 'Recruiter');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Welcome to AIJobs Recruiter Portal – Registration Received";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Welcome to AIJobs Recruiter Portal, ${name}! 🏢
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Your recruiter registration has been received successfully.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #60a5fa; font-size: 14px; font-weight: 700; margin: 0 0 10px 0; text-transform: uppercase;">
            Important Verification Information:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li><strong>Registration Status:</strong> Registration received and recorded.</li>
            <li><strong>KYC & Admin Approval:</strong> KYC verification or Admin approval may be required before full posting privileges are granted.</li>
            <li><strong>Account Access:</strong> Account access and job posting capabilities depend on successful verification.</li>
            <li><strong>Ethical Hiring Policy:</strong> Candidates must NEVER be charged any fee for applications, interviews, or hiring.</li>
          </ul>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
          Need support? Contact our enterprise support desk at 
          <a href="mailto:${SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: underline;">${SUPPORT_EMAIL}</a>.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Visit Recruiter Portal →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 3. CONSULTANCY WELCOME EMAIL
  'consultancy_welcome': (data) => {
    const name = escapeHtml(data.recipientName || data.candidateName || 'Consultancy Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Welcome to AIJobs Consultancy Portal – Registration Received";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Welcome to AIJobs Consultancy Portal, ${name}! 🤝
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Your consultancy agency registration has been received successfully.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #c084fc; font-size: 14px; font-weight: 700; margin: 0 0 10px 0; text-transform: uppercase;">
            Verification & Compliance Details:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li><strong>Registration Status:</strong> Application received for consultancy account.</li>
            <li><strong>KYC & Admin Approval:</strong> Mandatory KYC documentation review and Admin approval required before candidate roster submission.</li>
            <li><strong>Account Access:</strong> Portal access depends on completed verification.</li>
            <li><strong>Strict Candidate Protection:</strong> Consultancies are strictly forbidden from charging candidates any placement or recruitment fees.</li>
          </ul>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
          For agency verification queries, contact <a href="mailto:${SUPPORT_EMAIL}" style="color: #60a5fa; text-decoration: underline;">${SUPPORT_EMAIL}</a>.
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}" style="background-color: #9333ea; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Visit Consultancy Portal →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 4. ACCOUNT APPROVAL
  'account_approval': (data) => {
    const name = escapeHtml(data.recipientName || data.candidateName || 'Valued User');
    const role = escapeHtml((data.userRole || 'account').toUpperCase());
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Account Approval Confirmed – Welcome to AIJobs";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Your ${role} Account is Approved! ✅
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, your registration and verification on AIJobs has been officially approved by the Admin Desk.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #4ade80; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Status: Active & Full Access Unlocked
          </h3>
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            You can now log in to access your full suite of recruiting, job posting, and candidate management tools.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Log In to AIJobs →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'registration-approval': (data) => EMAIL_TEMPLATES['account_approval'](data),

  // 5. KYC REQUIRED
  'kyc_required': (data) => {
    const name = escapeHtml(data.recipientName || data.candidateName || 'Valued Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "KYC & Document Verification Required – AIJobs";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          KYC Verification Required 📋
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, to activate full posting and hiring privileges on AIJobs, please complete your mandatory KYC and business verification.
        </p>

        <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #f59e0b; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Required Documents:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li>Company Registration Certificate / GSTIN</li>
            <li>Authorized Representative Identity Document</li>
            <li>Official Corporate Domain Verification</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Upload KYC Documents →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 6. INTERVIEW INVITATION
  'interview_invitation': (data) => {
    const name = escapeHtml(data.candidateName || 'Candidate');
    const jobTitle = escapeHtml(data.jobTitle || 'Software Position');
    const companyName = escapeHtml(data.companyName || 'Enterprise Partner');
    const date = escapeHtml(data.interviewDate || 'To be confirmed');
    const time = escapeHtml(data.interviewTime || '10:00 AM IST');
    const link = data.interviewLink || data.appUrl || DEFAULT_APP_URL;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = `Interview Invitation – ${jobTitle} at ${companyName}`;

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #60a5fa; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          You Are Invited for an Interview! 🗓️
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been scheduled.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.9); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table border="0" cellpadding="6" cellspacing="0" width="100%" style="color: #cbd5e1; font-size: 13px;">
            <tr>
              <td style="color: #64748b; font-weight: 600; width: 120px;">Role:</td>
              <td style="color: #ffffff; font-weight: 700;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Company:</td>
              <td style="color: #ffffff; font-weight: 700;">${companyName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Date:</td>
              <td style="color: #60a5fa; font-weight: 700;">${date}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Time:</td>
              <td style="color: #60a5fa; font-weight: 700;">${time}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Join Interview Session →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'interview-scheduled': (data) => EMAIL_TEMPLATES['interview_invitation'](data),

  // 7. INTERVIEW REMINDER
  'interview_reminder': (data) => {
    const name = escapeHtml(data.candidateName || 'Candidate');
    const jobTitle = escapeHtml(data.jobTitle || 'Software Position');
    const companyName = escapeHtml(data.companyName || 'Enterprise Partner');
    const date = escapeHtml(data.interviewDate || 'Today');
    const time = escapeHtml(data.interviewTime || '10:00 AM IST');
    const link = data.interviewLink || data.appUrl || DEFAULT_APP_URL;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = `Interview Reminder – ${jobTitle} at ${companyName}`;

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Upcoming Interview Reminder ⏰
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, this is a reminder for your upcoming interview for <strong>${jobTitle}</strong> with <strong>${companyName}</strong>.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #ffffff; font-size: 14px; margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${date} at ${time}</p>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Please ensure you have a stable network connection and quiet environment.</p>
        </div>

        <div style="text-align: center;">
          <a href="${link}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Open Interview Room →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 8. OFFER LETTER
  'offer_letter': (data) => {
    const name = escapeHtml(data.candidateName || 'Candidate');
    const jobTitle = escapeHtml(data.jobTitle || 'Engineering Position');
    const companyName = escapeHtml(data.companyName || 'Enterprise Partner');
    const offerDetails = escapeHtml(data.offerDetails || 'Official Offer Letter Released');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = `Official Offer Letter Released – ${jobTitle} at ${companyName}`;

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Official Offer Letter Released! 📜
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, <strong>${companyName}</strong> has released an official job offer letter for <strong>${jobTitle}</strong>.
        </p>

        <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #f59e0b; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Offer Details:
          </h3>
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            ${offerDetails}
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Review Offer Letter →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'offer-released': (data) => EMAIL_TEMPLATES['offer_letter'](data),

  // 9. DOCUMENT REQUIRED
  'document_required': (data) => {
    const name = escapeHtml(data.candidateName || data.recipientName || 'Candidate');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Document Upload Required – AIJobs";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Document Verification Pending 📄
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, additional verification documents are required to complete your onboarding process on AIJobs.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            Please log in to your dashboard to upload the requested verification documents securely.
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            Upload Required Documents →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 10. PROFILE INCOMPLETE
  'profile_incomplete': (data) => {
    const name = escapeHtml(data.candidateName || data.recipientName || 'Candidate');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Action Required: Complete Your AIJobs Profile";

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Your Profile Needs Attention 🎯
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, candidates with 100% complete profiles get 4x more interview invitations from top enterprise recruiters!
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #f59e0b; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Pending Profile Items:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li>Upload updated ATS PDF resume</li>
            <li>Add key technical skills & target roles</li>
            <li>Fill in location & expected CTC preferences</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #d97706; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            Complete Profile Now →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 11. NEW JOB ALERT
  'new-job-alert': (data) => {
    const name = escapeHtml(data.candidateName || 'Candidate');
    const jobTitle = escapeHtml(data.jobTitle || 'High-Demand Role');
    const companyName = escapeHtml(data.companyName || 'Verified Partner');
    const location = escapeHtml(data.location || 'Pan-India / Remote');
    const salary = escapeHtml(data.salary || 'Competitive Package');
    const jobUrl = data.jobUrl || `${DEFAULT_APP_URL}/#jobs`;
    const unsubToken = data.unsubscribeToken || 'token';
    const appUrl = data.appUrl || DEFAULT_APP_URL;

    const body = `
      <div style="text-align: left;">
        <div style="display: inline-block; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #60a5fa; text-transform: uppercase; margin-bottom: 12px;">
          AI JOBS MATCH ALERT
        </div>
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          New Job Match for You, ${name}! ⚡
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          An approved job matching your target skills was just published:
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.9); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 0 0 6px 0;">
            ${jobTitle}
          </h3>
          <p style="color: #60a5fa; font-size: 13px; font-weight: 700; margin: 0 0 16px 0;">
            ${companyName}
          </p>
          <table border="0" cellpadding="4" cellspacing="0" width="100%" style="color: #cbd5e1; font-size: 13px;">
            <tr>
              <td style="color: #64748b; font-weight: 600; width: 100px;">Location:</td>
              <td style="color: #ffffff;">${location}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Salary CTC:</td>
              <td style="color: #4ade80; font-weight: 700;">${salary}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${jobUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            View Job Details & Apply 100% Free →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Job Alert: ${jobTitle} at ${companyName}`, body, true, unsubToken, appUrl);
  },

  // 12. WEEKLY JOB DIGEST
  'weekly-job-digest': (data) => {
    const name = escapeHtml(data.candidateName || 'Candidate');
    const jobs = data.jobsList && data.jobsList.length > 0 ? data.jobsList : [
      { title: 'Senior Software Engineer', company: 'TechCorp', location: 'Bangalore / Remote', salary: '₹18,00,000 - ₹24,00,000', url: `${DEFAULT_APP_URL}/#jobs` }
    ];
    const unsubToken = data.unsubscribeToken || 'token';
    const appUrl = data.appUrl || DEFAULT_APP_URL;

    const jobCardsHTML = jobs.map((j) => `
      <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${escapeHtml(j.title)}</div>
              <div style="font-size: 13px; color: #60a5fa; font-weight: 600; margin-bottom: 6px;">${escapeHtml(j.company)}</div>
              <div style="font-size: 12px; color: #94a3b8;">📍 ${escapeHtml(j.location)} &nbsp;•&nbsp; 💰 ${escapeHtml(j.salary)}</div>
            </td>
            <td align="right" style="vertical-align: middle; width: 100px;">
              <a href="${j.url}" style="background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 700; display: inline-block;">
                Apply Free
              </a>
            </td>
          </tr>
        </table>
      </div>
    `).join('');

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Top Job Recommendations for You, ${name} 🎯
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Here are this week's top active positions on AIJobs:
        </p>

        ${jobCardsHTML}

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}/#jobs" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Explore All Openings →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout('Weekly Job Recommendations - AIJobs', body, true, unsubToken, appUrl);
  },

  // 13. CUSTOM ADMIN BROADCAST
  'custom-admin-email': (data) => {
    const name = escapeHtml(data.recipientName || data.candidateName || 'Valued User');
    const subject = data.customSubject || 'Important Update from AIJobs Admin';
    const message = data.customMessage || 'We have an important update regarding your account.';
    const appUrl = data.appUrl || DEFAULT_APP_URL;

    const formattedMessage = message.includes('<p>') ? message : message.split('\n\n').map(p => `<p style="margin-bottom: 14px;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('');

    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Hello ${name},
        </h2>
        <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
          ${formattedMessage}
        </div>

        <div style="text-align: center; margin-top: 28px;">
          <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Visit AIJobs Portal →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  // 14. ONBOARDING EMAIL TEMPLATES
  'registration_received': (data) => {
    const name = escapeHtml(data.recipientName || 'Valued Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "AIJobs Registration Received – Onboarding Verification Pending";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Registration Received, ${name}! 📋
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Thank you for registering your recruiter/consultancy profile on AIJobs India. Your account is currently in <strong>Verification Pending</strong> state.
        </p>
        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #60a5fa; font-size: 14px; font-weight: 700; margin: 0 0 10px 0;">Onboarding Pipeline Overview:</h3>
          <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li><strong>KYC Verification:</strong> Submit owner/company ID documents.</li>
            <li><strong>Service Agreement:</strong> Digitally sign database terms & access limits.</li>
            <li><strong>Subscription Payment:</strong> Complete plan fee authorization.</li>
            <li><strong>Admin Final Clearance:</strong> Admin team approves and activates your account.</li>
          </ol>
        </div>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Start Verification →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'kyc_link': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const link = data.jobUrl || data.customMessage || `${data.appUrl || DEFAULT_APP_URL}/#kyc`;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Action Required: Complete Your KYC Verification – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #60a5fa; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Secure KYC Verification Link 🔐
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, an Admin has generated a secure KYC document submission link for your account. This link is valid for 24 hours.
        </p>
        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            Please click below to securely upload your Identity Card (Aadhaar/Passport), Corporate PAN, GSTIN, or Business Incorporation certificate.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Open Secure KYC Verification Link →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'kyc_reminder': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const link = data.jobUrl || `${data.appUrl || DEFAULT_APP_URL}/#kyc`;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Reminder: Complete Your KYC Verification on AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          KYC Verification Reminder ⏰
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, your KYC verification link is pending submission. Complete your KYC now to avoid onboarding delays.
        </p>
        <div style="text-align: center;">
          <a href="${link}" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Complete KYC Documents →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'kyc_submitted': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "KYC Documents Received – AIJobs Review in Progress";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          KYC Documents Received 📥
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your uploaded legal identity documents have been queued for Admin Review. Our team typically inspects credentials within 2-4 business hours.
        </p>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'kyc_approved': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "KYC Approved! Next Step: Service Agreement – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          KYC Verification Approved! ✅
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Congratulations ${name}, your identity and corporate credentials passed compliance review.
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 24px;">
          Next step: Review and digitally sign your AIJobs Service Agreement to proceed to plan subscription.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Review Service Agreement →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'kyc_rejected': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const reason = escapeHtml(data.customMessage || 'Document unreadable or invalid formatting');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "KYC Documents Update Required – AIJobs Compliance";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f87171; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          KYC Document Action Needed ⚠️
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your KYC document submission requires re-upload.
        </p>
        <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #fca5a5; font-size: 13px; margin: 0;">
            <strong>Reason:</strong> ${reason}
          </p>
        </div>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Re-upload KYC Documents →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'agreement_ready': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Service Agreement Ready for Digital Signature – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #c084fc; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Service Agreement Generated 📜
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your AIJobs Database Service Agreement is ready for digital signature and OTP authorization.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #9333ea; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Sign Agreement Now →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'agreement_reminder': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Reminder: Sign Your AIJobs Service Agreement";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Agreement Signature Pending ⏰
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, please review and sign your service agreement to complete your account setup.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Sign Agreement →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'agreement_accepted': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Agreement Signed! Proceed to Payment Authorization – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Service Agreement Signed Successfully! 🖊️
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Thank you ${name}. Your digital signature and timestamp have been permanently recorded in audit logs.
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 24px;">
          Next Step: Complete plan fee checkout to submit for final Admin clearance.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Proceed to Payment →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'payment_link': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Payment Authorization Link – AIJobs Subscription";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Subscription Payment Authorization 💳
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, complete your subscription payment to unlock full database search access.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Complete Payment Checkout →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'payment_success': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Payment Verified – Awaiting Final Admin Approval";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Payment Verified! 🎉
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, your subscription payment has been successfully verified. Your account is now in <strong>Admin Approval Pending</strong> stage.
        </p>
        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 24px;">
          An Admin will conduct final verification and activate full workspace privileges shortly.
        </p>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'payment_failed': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Payment Authorization Failed – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f87171; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Payment Unsuccessful ⚠️
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your payment attempt could not be verified or was declined by the bank.
        </p>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Retry Payment →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'admin_approval_pending': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Onboarding Complete – Final Admin Approval Pending";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Final Clearance Queue ⏳
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, all onboarding prerequisites (KYC, Agreement, Payment) are completed! An Admin will activate your account shortly.
        </p>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'account_activated': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "🎉 Account Activated! Full Access Unlocked – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Your AIJobs Account is Active! 🚀
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, Admin has granted full activation clearance for your recruiter/consultancy portal!
        </p>
        <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #4ade80; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">Unlocked Capabilities:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li>Post Unlimited Job Openings</li>
            <li>Search Verified Candidates Database</li>
            <li>Unlock Direct Phone & Email Contact Info</li>
            <li>Schedule Interviews & Release Offer Letters</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <a href="${appUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Access Dashboard Now →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'account_rejected': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const reason = escapeHtml(data.customMessage || 'Does not meet corporate verification criteria');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Account Onboarding Notice – AIJobs";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f87171; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Account Request Denied ❌
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your corporate account request was reviewed and rejected.
        </p>
        <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #fca5a5; font-size: 13px; margin: 0;">
            <strong>Reason:</strong> ${reason}
          </p>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  },

  'account_suspended': (data) => {
    const name = escapeHtml(data.recipientName || 'Partner');
    const reason = escapeHtml(data.customMessage || 'Policy violation or security review');
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const subject = "Urgent: Account Suspended – AIJobs Administration";
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f87171; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Account Suspended 🔒
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hello ${name}, your AIJobs account access has been suspended by Administration.
        </p>
        <div style="background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #fca5a5; font-size: 13px; margin: 0;">
            <strong>Details:</strong> ${reason}
          </p>
        </div>
      </div>
    `;
    return wrapBaseLayout(subject, body, false, undefined, appUrl);
  }
};
