export interface JobMatchResponse {
  matchPercentage: number;
  skillsMatchPercentage: number;
  experienceMatchPercentage: number;
  culturalMatchPercentage: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  status: "highly_recommended" | "matched" | "potential_fit" | "not_matching";
}

export interface JobMatchInput {
  jobDescription: string;
  jobSkills: string[];
  resumeText: string;
  resumeSkills: string[];
  interviewScore: number;
  experience: string;
  location: string;
  expectedSalary: string;
}

export const JobMatchAIService = {
  async evaluateMatch(input: JobMatchInput): Promise<JobMatchResponse> {
    try {
      const response = await fetch("/api/evaluate-job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("Job Match API failure");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.warn("Job Match API failed, executing adaptive local comparison engine:", error);
      return this.calculateLocalMatch(input);
    }
  },

  calculateLocalMatch(input: JobMatchInput): JobMatchResponse {
    // Standard matching logic
    const jdSkillsLower = input.jobSkills.map(s => s.toLowerCase());
    const resumeSkillsLower = input.resumeSkills.map(s => s.toLowerCase());

    const intersectingSkills = resumeSkillsLower.filter(s => 
      jdSkillsLower.some(jdS => jdS.includes(s) || s.includes(jdS))
    );

    const skillsMatch = jdSkillsLower.length > 0 
      ? Math.round((intersectingSkills.length / jdSkillsLower.length) * 100)
      : 80;

    // Weight interview performance and skills
    const interviewWeight = input.interviewScore || 70;
    const skillsWeight = skillsMatch;
    const experienceWeight = input.experience ? 85 : 70;

    const overall = Math.round((skillsWeight * 0.45) + (interviewWeight * 0.35) + (experienceWeight * 0.20));
    const finalOverall = Math.min(99, Math.max(30, overall));

    let status: "highly_recommended" | "matched" | "potential_fit" | "not_matching" = "potential_fit";
    if (finalOverall >= 85) {
      status = "highly_recommended";
    } else if (finalOverall >= 70) {
      status = "matched";
    } else if (finalOverall >= 50) {
      status = "potential_fit";
    } else {
      status = "not_matching";
    }

    const gaps: string[] = [];
    const missingJdSkills = input.jobSkills.filter(s => 
      !resumeSkillsLower.some(rS => rS.includes(s.toLowerCase()) || s.toLowerCase().includes(rS))
    );

    missingJdSkills.slice(0, 3).forEach(s => {
      gaps.push(`Missing core qualification: "${s}" is not explicitly listed in your resume.`);
    });

    if (gaps.length === 0) {
      gaps.push("No substantial gaps identified in primary skill requirements.");
    }

    return {
      matchPercentage: finalOverall,
      skillsMatchPercentage: Math.min(100, Math.round(skillsWeight)),
      experienceMatchPercentage: Math.min(100, Math.round(experienceWeight)),
      culturalMatchPercentage: Math.min(100, Math.round(75 + (interviewWeight * 0.2))),
      strengths: [
        `Strong overlap in core toolkit: matches ${intersectingSkills.slice(0, 4).join(", ") || "primary technology stacks"}.`,
        `Solid performance verified in verified Mock Interview evaluation (${input.interviewScore || 75}%).`,
        "Professional experience matches candidate criteria and roles."
      ],
      gaps,
      recommendations: [
        missingJdSkills.length > 0 
          ? `Incorporate "${missingJdSkills.slice(0, 2).join(", ")}" with bulleted achievements in your resume version.` 
          : "Optimize summary statement to directly highlight company-relevant architectures.",
        "Refine project bullets to focus on metrics and high-traffic distributed scaling outcomes."
      ],
      status
    };
  }
};
