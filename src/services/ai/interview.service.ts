export interface InterviewQuestionItem {
  id: string;
  type: "MCQ" | "Technical Questions" | "Scenario Questions" | "Behavioral Questions" | "Role Play";
  question: string;
  options?: string[];
  correctOption?: string;
  difficulty: string;
  context: string;
}

export interface InterviewQueryParams {
  category: string;
  level: string;
  language: string;
  customRole?: string;
  resumeText?: string;
  skills?: string[];
  experience?: string;
}

export const InterviewAIService = {
  // Support Categories defined in Step 4
  getCategories() {
    return [
      "HR",
      "Behavioral",
      "Technical",
      "Scenario",
      "Problem Solving",
      "Communication",
      "Sales",
      "Customer Support",
      "Finance",
      "Banking",
      "Insurance",
      "Marketing",
      "BPO",
      "IT",
      "Custom"
    ];
  },

  async generateQuestions(params: InterviewQueryParams): Promise<InterviewQuestionItem[]> {
    try {
      const response = await fetch("/api/ai-interview-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: params.category,
          level: params.level,
          language: params.language,
          customRole: params.customRole,
          resumeText: params.resumeText
        })
      });

      if (!response.ok) {
        throw new Error("Question generation API failure");
      }

      const data = await response.json();
      return data.questions;
    } catch (err) {
      console.warn("API Question generation failed, utilizing adaptive fallback simulator:", err);
      return this.getFallbackQuestions(params);
    }
  },

  getFallbackQuestions(params: InterviewQueryParams): InterviewQuestionItem[] {
    const cat = params.category.toUpperCase();
    const lvl = params.level.toUpperCase();

    return [
      {
        id: "q_1",
        type: "MCQ",
        question: `For a ${params.level} practitioner in ${params.category} contexts, what is the most optimal approach to scale high-frequency operations without data leakage?`,
        options: [
          "A) Utilize un-indexed client-side caches entirely.",
          "B) Implement partitioned optimistic locks, isolated thread states, or single-directional updates.",
          "C) Apply global synchronization locks blocking secondary reads.",
          "D) Disable automated garbage collection or database integrity routines."
        ],
        correctOption: "B",
        difficulty: "Introductory",
        context: "Checks fundamental system design understanding."
      },
      {
        id: "q_2",
        type: "Technical Questions",
        question: `How do you organize the architectural components of your ${params.category} pipelines to guarantee high modularity and quick scaling under a ${params.level} tier system?`,
        difficulty: "Moderate",
        context: "Verifies knowledge of standard frameworks and code organization."
      },
      {
        id: "q_3",
        type: "Scenario Questions",
        question: `Scenario: A live transaction or process in your ${params.category} workflow fails silently midway. What precise diagnostic steps and failure-isolation methods do you enforce?`,
        difficulty: "Challenging",
        context: "Analyzes system resilience and operational diagnostics."
      },
      {
        id: "q_4",
        type: "Behavioral Questions",
        question: `Describe a situation where a key stakeholder strongly opposed a design path or operational upgrade you proposed. How did you structure your trade-offs matrix to convince them?`,
        difficulty: "Complex",
        context: "Examines negotiation competence, empathy, and professionalism."
      },
      {
        id: "q_5",
        type: "Role Play",
        question: `Roleplay: A customer calls in highly frustrated with a recent service failure in the ${params.category} module. Speak directly as a specialist to de-escalate and suggest a recovery path.`,
        difficulty: "Elite Expert",
        context: "Blends direct verbal empathy with technical authority."
      }
    ];
  }
};
