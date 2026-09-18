export interface CreditBalance {
  jobCredits: number;
  jobCreditsUsed: number;
  databaseCredits: number;
  databaseCreditsUsed: number;
  aiCredits: number;
  aiCreditsUsed: number;
  callingCredits: number;
  callingCreditsUsed: number;
  validityDate: string;
}

export interface CreditUsageLog {
  id: string;
  date: string;
  activity: string;
  item: string;
  quantity: number;
  creditsUsed: number;
  recruiter: string;
  refId: string;
}

export interface CallingLog {
  id: string;
  candidateName: string;
  candidatePhone: string;
  jobTitle: string;
  callStatus: "completed" | "scheduled" | "in_progress" | "unreachable";
  aiFit: "strong_match" | "potential" | "unfit";
  screeningSummary: string;
  duration?: string;
  timestamp: string;
  recordingUrl?: string;
  recruiterAction?: string;
}

export interface SavedCandidateSearch {
  id: string;
  title: string;
  query: string;
  skills: string[];
  location: string;
  createdAt: string;
  matchCount: number;
}
