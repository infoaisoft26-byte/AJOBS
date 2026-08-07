/**
 * Utility to format and normalize phone numbers into +91 format for India/international standards.
 */
export function formatPhoneNumber(input: string | number | null | undefined): string {
  if (!input) return "";
  const str = String(input).trim();
  if (!str) return "";

  // If already starts with +, clean extraneous characters
  if (str.startsWith("+")) {
    return str.replace(/[^\d+]/g, "");
  }

  // Remove non-digit characters
  const cleaned = str.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }

  if (cleaned.length > 0) {
    return `+91${cleaned}`;
  }

  return str;
}
