import { Check } from "lucide-react";
/**
 * Payment Request and Fraud Detection Engine for AIJobs
 *
 * Detects unauthorized fee or payment demands (English, Hindi, Hinglish)
 * while ignoring legitimate salary or CTC discussions.
 */

const SUSPICIOUS_PAYMENT_PATTERNS = [
  "pay money",
  "registration fee",
  "security deposit",
  "interview fee",
  "offer letter fee",
  "joining fee",
  "training fee",
  "send upi",
  "send qr code",
  "transfer money",
  "cash payment",
  "wallet payment",
  "bank transfer",
  "processing fee",
  "refundable amount",
  "document charge",
  "paise bhejo",
  "payment karo",
  "registration charge",
  "joining ke paise",
  "interview ke paise",
  "security amount",
  "upi karo",
  "qr scan karo",
  "pay fee",
  "deposit fee",
  "pay charges",
  "advance payment",
  "paid job"
];

export function detectPaymentRequest(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  // Normalize string by stripping non-alphanumeric characters except spaces
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  // Check if any suspicious phrase matches
  return SUSPICIOUS_PAYMENT_PATTERNS.some((pattern) => {
    return normalized.includes(pattern);
  });
}

export const ANTI_FRAUD_CANDIDATE_WARNING =
  "⚠️ AIJobs Safety Alert: AIJobs does not charge candidates for jobs, interviews, or selection. Do not make any payment to recruiters or consultancies.";
