import { JobPosting } from "../types";

export interface MatchBreakdown {
  skillsScore: number; // Max 35
  titleScore: number; // Max 20
  experienceScore: number; // Max 15
  locationScore: number; // Max 10
  industryScore: number; // Max 10
  preferenceScore: number; // Max 10
}

export interface JobMatchResult {
  totalScore: number; // 0 to 100
  matchLevel: "Strong Match" | "Good Match" | "Possible Match" | "Low Priority";
  badgeColor: string; // Tailwind colors
  reasons: string[];
  breakdown: MatchBreakdown;
}

/**
 * Calculates candidate-to-job match score using real active jobs and candidate profile data.
 * Weighting:
 * - Skills Match: 35%
 * - Role/Title Match: 20%
 * - Experience Match: 15%
 * - Location/Work Mode: 10%
 * - Industry Match: 10%
 * - Candidate Preference: 10%
 */
export function calculateJobMatchScore(job: JobPosting, profile: any): JobMatchResult {
  const reasons: string[] = [];

  // Candidate Data normalization
  const candSkills: string[] = Array.from(new Set([
    ...(Array.isArray(profile?.skills) ? profile.skills : []),
    ...(Array.isArray(profile?.technicalSkills) ? profile.technicalSkills : []),
    ...(Array.isArray(profile?.softSkills) ? profile.softSkills : [])
  ].map((s: string) => (s || "").toLowerCase().trim()).filter(Boolean)));

  const candTitle = (profile?.currentJobTitle || profile?.currentDesignation || profile?.designation || profile?.fullName || "").toLowerCase();
  const prefTitles = (profile?.jobPreferences?.preferredTitles || profile?.preferredTitles || profile?.preferredRoles || []).map((t: string) => t.toLowerCase());

  const candExpYears = parseFloat(profile?.totalExperienceYears || profile?.totalExperience || profile?.experienceYears || "0") || 0;
  const candLocation = (profile?.location || profile?.city || "").toLowerCase();
  const prefLocations = (profile?.jobPreferences?.preferredLocations || profile?.preferredLocations || []).map((l: string) => l.toLowerCase());
  const prefWorkMode = (profile?.jobPreferences?.workMode || profile?.preferredWorkMode || "").toLowerCase();
  const prefIndustry = (profile?.jobPreferences?.preferredIndustry || profile?.preferredIndustry || "").toLowerCase();
  const expectedSalary = parseFloat(profile?.jobPreferences?.expectedSalary || profile?.expectedSalary || "0") || 0;

  // Job Data normalization
  const jobSkills = (job?.skillsRequired || job?.skills || []).map((s: string) => s.toLowerCase().trim());
  const jobTitle = (job?.title || "").toLowerCase();
  const jobLocation = (job?.location || "").toLowerCase();
  const jobWorkMode = (job?.workMode || job?.type || "").toLowerCase();
  const jobIndustry = (job?.industry || job?.category || "").toLowerCase();
  const jobExpStr = (job?.experience || job?.experienceRequired || "").toLowerCase();
  const jobSalaryStr = (job?.salary || job?.salaryRange || "").toLowerCase();

  // 1. Skills Match (35%)
  let skillsScore = 0;
  if (jobSkills.length > 0 && candSkills.length > 0) {
    let matchedCount = 0;
    const matchedSkillsList: string[] = [];
    jobSkills.forEach((js: string) => {
      if (candSkills.some(cs => cs.includes(js) || js.includes(cs))) {
        matchedCount++;
        matchedSkillsList.push(js);
      }
    });

    const ratio = matchedCount / jobSkills.length;
    skillsScore = Math.round(ratio * 35);
    if (matchedCount > 0) {
      reasons.push(`Matched ${matchedCount} of ${jobSkills.length} required skills (${matchedSkillsList.slice(0, 3).join(", ")})`);
    } else {
      reasons.push("Skill overlap requires further alignment");
    }
  } else if (candSkills.length > 0) {
    skillsScore = 25; // Baseline if job does not list explicit skills
    reasons.push("Candidate possesses relevant technical background");
  } else {
    skillsScore = 15;
  }

  // 2. Role/Title Match (20%)
  let titleScore = 0;
  const isDirectTitleMatch = candTitle && jobTitle.includes(candTitle) || candTitle.includes(jobTitle);
  const isPrefTitleMatch = prefTitles.some((pt: string) => jobTitle.includes(pt) || pt.includes(jobTitle));

  if (isDirectTitleMatch || isPrefTitleMatch) {
    titleScore = 20;
    reasons.push(`Job title "${job.title}" aligns directly with your target role`);
  } else if (candTitle || prefTitles.length > 0) {
    // Partial word overlap check
    const titleWords = jobTitle.split(/\s+/).filter((w: string) => w.length > 3);
    const hasWordMatch = titleWords.some((w: string) => candTitle.includes(w) || prefTitles.some((pt: string) => pt.includes(w)));
    if (hasWordMatch) {
      titleScore = 14;
      reasons.push(`Role title overlaps with candidate profile domain`);
    } else {
      titleScore = 8;
    }
  } else {
    titleScore = 10;
  }

  // 3. Experience Match (15%)
  let experienceScore = 0;
  let reqExpMin = 0;
  const expMatch = jobExpStr.match(/(\d+)/);
  if (expMatch) reqExpMin = parseInt(expMatch[1], 10);

  if (candExpYears >= reqExpMin) {
    experienceScore = 15;
    reasons.push(`Experience (${candExpYears} yrs) meets or exceeds requirement (${reqExpMin}+ yrs)`);
  } else if (candExpYears > 0) {
    const ratio = candExpYears / Math.max(1, reqExpMin);
    experienceScore = Math.round(ratio * 15);
    reasons.push(`Candidate experience (${candExpYears} yrs) is near required target (${reqExpMin} yrs)`);
  } else {
    experienceScore = 8;
  }

  // 4. Location / Work Mode (10%)
  let locationScore = 0;
  const isRemote = jobLocation.includes("remote") || jobWorkMode.includes("remote") || prefWorkMode.includes("remote");
  const isLocMatch = candLocation && (jobLocation.includes(candLocation) || candLocation.includes(jobLocation));
  const isPrefLocMatch = prefLocations.some((pl: string) => jobLocation.includes(pl) || pl.includes(jobLocation));

  if (isRemote) {
    locationScore = 10;
    reasons.push("Flexible / Remote work model matches profile");
  } else if (isLocMatch || isPrefLocMatch) {
    locationScore = 10;
    reasons.push(`Location "${job.location}" matches preferred candidate geography`);
  } else {
    locationScore = 5;
  }

  // 5. Industry Match (10%)
  let industryScore = 0;
  if (prefIndustry && (jobIndustry.includes(prefIndustry) || prefIndustry.includes(jobIndustry))) {
    industryScore = 10;
    reasons.push(`Industry "${job.industry || job.category}" matches target domain`);
  } else {
    industryScore = 7;
  }

  // 6. Candidate Preferences (10%)
  let preferenceScore = 8; // Default good score
  if (expectedSalary > 0 && jobSalaryStr) {
    // Basic sanity check
    preferenceScore = 10;
    reasons.push("Compensation & role structure fits candidate expectations");
  }

  const totalScore = Math.min(100, Math.max(20, skillsScore + titleScore + experienceScore + locationScore + industryScore + preferenceScore));

  let matchLevel: "Strong Match" | "Good Match" | "Possible Match" | "Low Priority" = "Possible Match";
  let badgeColor = "bg-amber-100 text-amber-800 border-amber-300";

  if (totalScore >= 80) {
    matchLevel = "Strong Match";
    badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
  } else if (totalScore >= 60) {
    matchLevel = "Good Match";
    badgeColor = "bg-blue-100 text-blue-800 border-blue-300";
  } else if (totalScore >= 40) {
    matchLevel = "Possible Match";
    badgeColor = "bg-amber-100 text-amber-800 border-amber-300";
  } else {
    matchLevel = "Low Priority";
    badgeColor = "bg-gray-100 text-gray-700 border-gray-300";
  }

  return {
    totalScore,
    matchLevel,
    badgeColor,
    reasons,
    breakdown: {
      skillsScore,
      titleScore,
      experienceScore,
      locationScore,
      industryScore,
      preferenceScore
    }
  };
}

/**
 * Calculate Profile Completion Breakdown (Section I requirement)
 */
export function calculateProfileCompletion(profile: any): number {
  if (!profile) return 0;
  let score = 0;

  // 1. Basic Account Info (Name, Email, Mobile, Location) - 20%
  const nameOk = Boolean(profile.name || profile.fullName);
  const emailOk = Boolean(profile.email || profile.accountEmail);
  const phoneOk = Boolean(profile.phone || profile.mobile || profile.mobileNumber);
  const locOk = Boolean(profile.location || profile.city);
  let basicScore = 0;
  if (nameOk) basicScore += 5;
  if (emailOk) basicScore += 5;
  if (phoneOk) basicScore += 5;
  if (locOk) basicScore += 5;
  score += basicScore;

  // 2. Resume Uploaded & Validated - 20%
  if (profile.resumeUrl || profile.resumeUploaded) score += 20;

  // 3. Skills Added (Min 3 skills) - 20%
  const skillsArr = Array.isArray(profile.skills) ? profile.skills : [];
  if (skillsArr.length >= 3) {
    score += 20;
  } else if (skillsArr.length > 0) {
    score += Math.round((skillsArr.length / 3) * 20);
  }

  // 4. Work Experience Listed - 15%
  if (
    profile.totalExperience ||
    profile.experienceYears ||
    (Array.isArray(profile.workExperience) && profile.workExperience.length > 0) ||
    profile.currentCompany ||
    profile.currentJobTitle
  ) {
    score += 15;
  }

  // 5. Education Listed - 10%
  if (
    profile.education ||
    (Array.isArray(profile.educationList) && profile.educationList.length > 0) ||
    profile.qualification
  ) {
    score += 10;
  }

  // 6. Job Preferences Configured - 15%
  if (
    profile.preferredRoles?.length ||
    profile.preferredTitles?.length ||
    profile.preferredLocations?.length ||
    profile.jobPreferences?.preferredTitles?.length ||
    profile.jobPreferences?.workMode ||
    profile.preferredWorkMode ||
    profile.expectedSalary
  ) {
    score += 15;
  }

  return Math.min(100, score);
}
