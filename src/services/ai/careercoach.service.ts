export interface AICareerCoachResponse {
  responseText: string;
  careerSuggestions: string[];
  skillsToLearn: string[];
  certificationSuggestions: string[];
  learningPath: Array<{
    step: string;
    details: string;
  }>;
  expectedSalaryRange: string;
  suitableIndustries: string[];
}

export const CareerCoachAIService = {
  async getCoachSession(chatHistory: any[], userMessage: string): Promise<AICareerCoachResponse> {
    try {
      const response = await fetch("/api/ai-career-coach-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory, userMessage })
      });

      if (!response.ok) {
        throw new Error("Career Coach API failure");
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.warn("Career Coach full API failed, using fallback coach data engine:", err);
      return this.getFallbackCoachResponse(userMessage);
    }
  },

  getFallbackCoachResponse(message: string): AICareerCoachResponse {
    const isTech = /code|react|developer|engineer|software|java|python|js|ts|cloud|data/i.test(message);
    const isDesign = /design|ui|ux|product|graphics/i.test(message);
    const isMgmt = /manager|lead|pmp|agile|scrum|product manager/i.test(message);

    if (isTech) {
      return {
        responseText: `### Strategic Technology Track Recommendations

To maximize your software engineering trajectory, focusing on distributed systems and reactive frontend models is highly recommended. 
1. **Consolidate Fullstack Capabilities**: Ensure that you have deep competency in typed asynchronous setups (e.g., TypeScript with Node.js) and modern transactional storage structures (such as Cloud Spanner or Firebase Firestore).
2. **System Architectures**: Familiarize yourself with load balancing, caching architectures (Redis), and message brokers.
3. **Continuous Deployment**: Master containerization (Docker) and basic cloud CI/CD flows (Google Cloud Build/Run).`,
        careerSuggestions: ["Lead Full-Stack Architect", "Staff Platform Engineer", "Cloud Infrastructure Architect"],
        skillsToLearn: ["Kubernetes", "Next.js & Server Components", "Apache Kafka", "NoSQL Schema Modeling"],
        certificationSuggestions: ["Google Professional Cloud Architect", "AWS Certified Developer Associate"],
        learningPath: [
          { step: "Milestone 1: Clean Architecture Mastery", details: "Review Domain-Driven Design and microservice decoupling structures." },
          { step: "Milestone 2: Database Scaling & Resilience", details: "Study sharding, replication lags, and write-ahead logs." },
          { step: "Milestone 3: Complete Cloud Deployment", details: "Deploy fully containerized multi-container ecosystems on Cloud Run with SSL." }
        ],
        expectedSalaryRange: "₹18,00,000 - ₹35,00,000",
        suitableIndustries: ["SaaS & Enterprise Systems", "Fintech & Payments Gateways", "E-commerce Platforms"]
      };
    } else if (isDesign) {
      return {
        responseText: `### Strategic Design Track Recommendations

As a designer in a highly competitive market, the highest leverage area is bridging aesthetic theory with active user research and system logic.
1. **Design System Orchestration**: Building modular components on Figma with auto-layout v5, variables, and flexible constraints.
2. **A/B Testing & Insights**: Knowing how to extract and evaluate analytics reports (Mixpanel, Hotjar) to prove usability iterations.
3. **Frontend Bridges**: Developing interactive prototyping skills using tools like Framer or simple Tailwind/React state integrations.`,
        careerSuggestions: ["Principal Product Designer", "UX Architect", "Design System Specialist"],
        skillsToLearn: ["Figma Design Tokenization", "Interactive Prototyping (Framer)", "User Research Methodologies", "Tailwind CSS Layouts"],
        certificationSuggestions: ["Google UX Design Professional Certificate", "NN/g UX Certification"],
        learningPath: [
          { step: "Milestone 1: Advanced Design Systems", details: "Create scalable, multi-mode component libraries in Figma with rich tokens." },
          { step: "Milestone 2: Usability Testing & Metrics", details: "Structure a full 5-user mock cognitive walk-through test and document gaps." },
          { step: "Milestone 3: Dynamic Micro-animations", details: "Master Framer motion or interactive prototyping states to present complex visual flows." }
        ],
        expectedSalaryRange: "₹14,00,000 - ₹28,00,000",
        suitableIndustries: ["Creative Agencies", "Product-led SaaS Platforms", "Web3 & Crypto Applications"]
      };
    } else {
      return {
        responseText: `### General Professional Strategy Plan

Excellent questions! Moving to the next step of your career involves transitioning from execution to strategic foresight.
1. **Pragmatic Metric Communication**: Frame every project or task you complete around business outcomes (e.g., reduced overhead, faster pipeline sync, increased conversion).
2. **Cross-functional Collaboration**: Develop strong empathy with engineering, product, and sales teams to align project deliverables perfectly.
3. **Agile Frameworks**: Solidify your experience leading sprint iterations, de-bottlenecking work pipelines, and optimizing resource delivery.`,
        careerSuggestions: ["Product Manager", "Agile Scrum Coach", "Operations Delivery Lead"],
        skillsToLearn: ["Product Roadmap Strategy", "KPI Dashboard Modeling", "System Thinking & Decoupling", "Customer Empathy Interviews"],
        certificationSuggestions: ["Certified Scrum Product Owner (CSPO)", "Project Management Professional (PMP)"],
        learningPath: [
          { step: "Milestone 1: Metric Frameworks Study", details: "Learn OKRs, North Star metrics, and pirate funnel metrics (AARRR)." },
          { step: "Milestone 2: Roadmap Orchestration", details: "Construct an interactive, visual sprint mapping document using Jira or Miro." },
          { step: "Milestone 3: Stakeholder persuasion", details: "Practice pitching trade-offs using mock prioritization matrices (RICE framework)." }
        ],
        expectedSalaryRange: "₹15,00,000 - ₹30,00,000",
        suitableIndustries: ["Fintech", "Consulting & Strategy firms", "Enterprise Software"]
      };
    }
  }
};
