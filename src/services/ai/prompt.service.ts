/**
 * Prompt Service
 * Defines the standard system prompts and schemas for Gemini API integration.
 */

export const PromptService = {
  getResumeAnalysisPrompt(resumeText: string, name: string): string {
    return `
You are an elite enterprise ATS (Applicant Tracking System) parser and AI Resume Analyzer.
Analyze the following resume details for candidate: "${name || "Candidate"}".

Resume Content:
"""
${resumeText}
"""

Extract and analyze the profile details. Identify skills, experience, education, projects, industry, role, and any missing skills relative to current industry standards.
Format your output strictly as a JSON object matching this schema:
{
  "fullName": "Candidate Full Name",
  "email": "email@example.com",
  "phone": "+123456789",
  "skills": ["Skill1", "Skill2"],
  "experience": [
    {
      "role": "Role Title",
      "company": "Company Name",
      "duration": "e.g., Jan 2024 - Present",
      "highlights": ["Accomplished X using Y to achieve Z"]
    }
  ],
  "education": [
    {
      "degree": "Degree/Diploma",
      "school": "Institution Name",
      "year": "Year of Completion",
      "score": "GPA or Percentage"
    }
  ],
  "projects": [
    {
      "title": "Project Title",
      "description": "Project summary",
      "skills": ["Tech1", "Tech2"]
    }
  ],
  "languages": ["English"],
  "currentCompany": "Company Name or N/A",
  "designation": "Current Role Title or N/A",
  "preferredLocation": "e.g., Remote / New York",
  "expectedSalary": "e.g., $90,000 - $110,000",
  "industry": "e.g., Software Engineering / IT",
  "role": "Target role designation",
  "missingSkills": {
    "technical": ["Missing Tech Skill 1"],
    "soft": ["Missing Soft Skill 1"],
    "certifications": ["Suggested Cert 1"]
  },
  "scores": {
    "overallScore": 85,
    "atsCompatibilityScore": 80,
    "grammarScore": 90,
    "formattingScore": 85,
    "professionalSummaryScore": 75,
    "skillsMatchScore": 80,
    "experienceScore": 85,
    "educationScore": 90,
    "achievementsScore": 80,
    "keywordOptimizationScore": 85
  },
  "salaryPrediction": {
    "min": 80000,
    "max": 110000,
    "currency": "USD",
    "base": "Annual",
    "basedOn": "Explanation of salary range prediction based on skills and level."
  }
}

Do not include markdown tags, just the raw JSON block.
`;
  },

  getQuestionGenerationPrompt(params: {
    resumeText: string;
    role: string;
    skills: string[];
    experience: string;
    category: string;
    level: string;
    language: string;
  }): string {
    return `
You are an expert HR and Technical Assessment Architect.
Generate 5 progressive mock interview questions tailored for:
Category: "${params.category}" (e.g., HR, Technical, Behavioral, Scenario, Problem Solving, Communication, Sales, Customer Support, Finance, Banking, Insurance, Marketing, BPO, IT, Custom)
Target Role: "${params.role}"
Career Level: "${params.level}"
Skills context: ${params.skills.join(", ")}
Experience: "${params.experience}"
Language: "${params.language}"

Candidate Resume Text context (if available):
"""
${params.resumeText || "No resume text provided."}
"""

The 5 questions must cover:
1. Question 1 (MCQ): An advanced multiple choice question testing conceptual fundamentals, with options (A, B, C, D) and correctOption ('A'|'B'|'C'|'D').
2. Question 2 (Technical): Code architectural patterns, toolsets, or domain regulations.
3. Question 3 (Scenario): Failure scenario or high-pressure problem solving.
4. Question 4 (Behavioral): Leadership, stakeholder management, or communication.
5. Question 5 (Role Play): Interactive dialogue or active client/stakeholder resolution scenario.

Format your output strictly as a JSON object matching this schema:
{
  "questions": [
    {
      "id": "q_1",
      "type": "MCQ",
      "question": "Question text...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOption": "B",
      "difficulty": "Introductory",
      "context": "Context hint for candidate..."
    },
    ...
  ]
}

No markdown tags or extra text.
`;
  },

  getEvaluationPrompt(params: {
    category: string;
    level: string;
    answers: Array<{
      questionText: string;
      type: string;
      candidateAnswer: string;
    }>;
  }): string {
    return `
You are an expert AI Interview Evaluator. Evaluate the candidate's performance across the mock interview session.
Interview Category: "${params.category}"
Career Level: "${params.level}"

Answers to Evaluate:
${params.answers.map((a, i) => `
Q${i+1} (${a.type}): ${a.questionText}
Candidate Answer: ${a.candidateAnswer}
`).join("\n---\n")}

Provide an objective assessment evaluating:
- Correctness
- Confidence
- Communication
- Grammar
- Technical Knowledge
- Leadership (where applicable)
- Problem Solving
- Professionalism

Format your output strictly as a JSON object matching this schema:
{
  "overallScore": 85,
  "technicalScore": 82,
  "communicationScore": 88,
  "confidenceScore": 80,
  "grammarScore": 92,
  "leadershipScore": 75,
  "behaviorScore": 85,
  "strengths": [
    "Strength item 1",
    "Strength item 2"
  ],
  "weaknesses": [
    "Weakness item 1",
    "Weakness item 2"
  ],
  "recommendations": [
    "Recommendation 1"
  ],
  "learningRoadmap": [
    {
      "milestone": "Topic/Skill to master",
      "duration": "e.g., Week 1-2",
      "resources": ["Suggested platform or doc"]
    }
  ]
}

Strictly JSON output only.
`;
  },

  getCareerCoachPrompt(chatHistory: any[], userMessage: string): string {
    return `
You are an premium AI Career Coach at "AIJobs". Help the candidate navigate their career, suggesting career streams, salary negotiations, learning tracks, and custom roadmaps.
History:
${JSON.stringify(chatHistory)}

User Query: "${userMessage}"

Respond with an actionable, structured analysis. Format your output strictly as a JSON object with this schema:
{
  "responseText": "In-depth conversational markdown advice for the candidate...",
  "careerSuggestions": ["Career option 1", "Career option 2"],
  "skillsToLearn": ["Skill 1", "Skill 2"],
  "certificationSuggestions": ["Cert 1", "Cert 2"],
  "learningPath": [
    { "step": "Step 1 name", "details": "Step 1 details" }
  ],
  "expectedSalaryRange": "e.g., $120,000 - $150,000",
  "suitableIndustries": ["Tech", "Fintech"]
}
`;
  },

  getJobMatchPrompt(jobDescription: string, resumeText: string, interviewScore: number): string {
    return `
You are an elite Recruitment Matching Engine.
Compare the candidate's resume and interview score with the job description.

Job Description:
"""
${jobDescription}
"""

Resume Content:
"""
${resumeText}
"""

Interview Score: ${interviewScore}%

Evaluate:
- Skills compatibility (hard and soft skills)
- Experience alignment
- Expected salary alignment vs Job budget
- Geographic or Remote fit

Format your output strictly as a JSON object with this schema:
{
  "matchPercentage": 87,
  "skillsMatchPercentage": 90,
  "experienceMatchPercentage": 85,
  "culturalMatchPercentage": 88,
  "strengths": ["Skill overlap details", "Role level alignment"],
  "gaps": ["Missing skill or experience gaps"],
  "recommendations": ["Actionable checklist to increase match profile"],
  "status": "highly_recommended" | "matched" | "potential_fit" | "not_matching"
}
`;
  }
};
