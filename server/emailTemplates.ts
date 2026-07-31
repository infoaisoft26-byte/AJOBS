export interface EmailTemplateData {
  candidateName?: string;
  email?: string;
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
  customMessage?: string;
  appUrl?: string;
}

const DEFAULT_APP_URL = process.env.VITE_SITE_URL || process.env.APP_URL || "https://aijobs.in";
const SUPPORT_EMAIL = "infoaisoft26@gmail.com";

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
  <title>${title}</title>
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
  
  // 1. Candidate Registration
  'candidate-registration': (data) => {
    const name = data.candidateName || 'Candidate';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.5px;">
          Welcome to AIJobs, ${name}! 🎉
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Your candidate account has been registered. You now have access to India's most advanced AI-powered job matching engine, automated ATS resume scoring, and AI interview practice suites.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #60a5fa; font-size: 14px; font-weight: 700; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">
            Next Steps to Accelerate Your Career:
          </h3>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.8;">
            <li>Upload your latest PDF/DOCX resume for instant AI ATS scoring.</li>
            <li>Take an AI Mock Technical Interview to gauge your readiness score.</li>
            <li>Explore live verified job openings matching your skill profile.</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 28px;">
          <a href="${appUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
            Complete Your Candidate Profile →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout('Welcome to AIJobs - Registration Confirmed', body, false, undefined, appUrl);
  },

  // 2. Resume Uploaded Successfully
  'resume-uploaded': (data) => {
    const name = data.candidateName || 'Candidate';
    const score = data.resumeScore || 85;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Resume Parsed & Evaluated, ${name}! 📄
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Your resume was processed by the AIJobs ATS parser engine.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
            Your AI ATS Score
          </div>
          <div style="font-size: 42px; font-weight: 900; color: #38bdf8; margin-bottom: 4px;">
            ${score}/100
          </div>
          <div style="font-size: 12px; color: #cbd5e1;">
            High alignment with modern tech recruiter criteria.
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}/candidate/resume" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            View Full ATS Breakdown & Suggestions →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout('Resume Uploaded & ATS Score Generated - AIJobs', body, false, undefined, appUrl);
  },

  // 3. Application Submitted
  'application-submitted': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Software Role';
    const companyName = data.companyName || 'Target Enterprise';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Application Submitted Successfully 🚀
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been transmitted to the employer's hiring portal.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <table border="0" cellpadding="4" cellspacing="0" width="100%" style="color: #cbd5e1; font-size: 13px;">
            <tr>
              <td style="color: #64748b; font-weight: 600; width: 120px;">Role:</td>
              <td style="color: #ffffff; font-weight: 700;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Company:</td>
              <td style="color: #ffffff; font-weight: 700;">${companyName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; font-weight: 600;">Applied Date:</td>
              <td style="color: #ffffff;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 20px;">
          You will receive automatic email updates as soon as the recruiter reviews your profile or updates your application status.
        </p>

        <div style="text-align: center;">
          <a href="${appUrl}/candidate/applications" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            Track Application Status →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Application Received: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 4. Application Shortlisted
  'application-shortlisted': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Target Position';
    const companyName = data.companyName || 'Hiring Enterprise';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #38bdf8; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Great News! Profile Shortlisted ⭐
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, the talent acquisition team at <strong>${companyName}</strong> has reviewed your resume and shortlisted you for <strong>${jobTitle}</strong>!
        </p>

        <div style="background-color: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #38bdf8; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Status: Shortlisted for Next Round
          </h3>
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            The recruiter will reach out shortly or schedule your interview through the AIJobs system. Prepare by reviewing key skill requirements.
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}/candidate/interviews" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            Prepare with AI Interview Coach →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Shortlisted: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 5. Interview Scheduled
  'interview-scheduled': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Target Position';
    const companyName = data.companyName || 'Enterprise Partner';
    const date = data.interviewDate || 'To be confirmed';
    const time = data.interviewTime || '10:00 AM IST';
    const link = data.interviewLink || data.appUrl || DEFAULT_APP_URL;
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #60a5fa; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Interview Scheduled 🗓️
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Hi ${name}, your interview for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been confirmed.
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
            Join / View Interview Details →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Interview Invitation: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 6. Application Selected
  'application-selected': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Software Position';
    const companyName = data.companyName || 'Hiring Enterprise';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #4ade80; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Congratulations! You are Selected! 🏆
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, we are delighted to inform you that <strong>${companyName}</strong> has officially selected your profile for the <strong>${jobTitle}</strong> position!
        </p>

        <div style="background-color: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #4ade80; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Status: Selection Confirmed
          </p>
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            Your hiring manager or HR representative will generate your formal offer letter shortly. Keep an eye on your AIJobs dashboard.
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}/candidate/applications" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            View Candidate Dashboard →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Selection Notice: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 7. Application Rejected / Update
  'application-rejected': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Target Role';
    const companyName = data.companyName || 'Hiring Company';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #ffffff; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Application Update: ${jobTitle}
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, thank you for your interest in <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.
        </p>

        <p style="color: #cbd5e1; font-size: 13px; margin-bottom: 20px; line-height: 1.6;">
          After careful consideration of all candidate profiles, the hiring team has decided to proceed with other candidates whose experience more closely matches the current requirements of this role.
        </p>

        <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #60a5fa; font-size: 13px; font-weight: 700; margin: 0 0 6px 0;">
            Don't let this slow you down!
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            AIJobs has multiple live verified job openings that match your skills.
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}/#jobs" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">
            Explore Matching Jobs on AIJobs →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Application Status Update: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 8. Offer Released
  'offer-released': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'Engineering Position';
    const companyName = data.companyName || 'Enterprise Partner';
    const offerDetails = data.offerDetails || 'Official Offer Letter Released';
    const appUrl = data.appUrl || DEFAULT_APP_URL;
    const body = `
      <div style="text-align: left;">
        <h2 style="color: #f59e0b; font-size: 24px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Official Job Offer Letter Released! 📜
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Dear ${name}, <strong>${companyName}</strong> has released an official job offer for <strong>${jobTitle}</strong>.
        </p>

        <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #f59e0b; font-size: 14px; font-weight: 700; margin: 0 0 8px 0;">
            Offer Breakdown:
          </h3>
          <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
            ${offerDetails}
          </p>
        </div>

        <div style="text-align: center;">
          <a href="${appUrl}/candidate/offers" style="background-color: #d97706; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Review & Respond to Offer →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Official Offer Letter: ${jobTitle} at ${companyName}`, body, false, undefined, appUrl);
  },

  // 9. New Matching Job Alert (Marketing/Promotional Opt-In)
  'new-job-alert': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobTitle = data.jobTitle || 'High-Demand Role';
    const companyName = data.companyName || 'Verified Partner';
    const location = data.location || 'Pan-India / Remote';
    const salary = data.salary || 'Competitive Package';
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
          An admin-approved job matching your preferred skills and target role was just posted:
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
          <a href="${jobUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
            View Job Details & Apply 100% Free →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout(`Job Alert: ${jobTitle} at ${companyName}`, body, true, unsubToken, appUrl);
  },

  // 10. Weekly Job Digest
  'weekly-job-digest': (data) => {
    const name = data.candidateName || 'Candidate';
    const jobs = data.jobsList && data.jobsList.length > 0 ? data.jobsList : [
      { title: 'Senior Software Engineer', company: 'TechCorp', location: 'Bangalore / Remote', salary: '₹18,00,000 - ₹24,00,000', url: `${DEFAULT_APP_URL}/#jobs` },
      { title: 'AI Full Stack Developer', company: 'CloudLabs', location: 'Mumbai / Hybrid', salary: '₹14,00,000 - ₹20,00,000', url: `${DEFAULT_APP_URL}/#jobs` }
    ];
    const unsubToken = data.unsubscribeToken || 'token';
    const appUrl = data.appUrl || DEFAULT_APP_URL;

    const jobCardsHTML = jobs.map((j) => `
      <div style="background-color: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; text-align: left;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${j.title}</div>
              <div style="font-size: 13px; color: #60a5fa; font-weight: 600; margin-bottom: 6px;">${j.company}</div>
              <div style="font-size: 12px; color: #94a3b8;">📍 ${j.location} &nbsp;•&nbsp; 💰 ${j.salary}</div>
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
        <div style="display: inline-block; background-color: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 700; color: #c084fc; text-transform: uppercase; margin-bottom: 12px;">
          WEEKLY CAREER RECOMMENDATIONS
        </div>
        <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin-top: 0; margin-bottom: 12px;">
          Top Job Recommendations for You, ${name} 🎯
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
          Here are this week's top active positions curated specifically for your target skills on AIJobs:
        </p>

        ${jobCardsHTML}

        <div style="text-align: center; margin-top: 24px;">
          <a href="${appUrl}/#jobs" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">
            Explore All Matching Openings →
          </a>
        </div>
      </div>
    `;
    return wrapBaseLayout('Weekly Job Recommendations - AIJobs', body, true, unsubToken, appUrl);
  }
};
