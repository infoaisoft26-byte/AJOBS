/**
 * Shared API Response Parser for Frontend
 * Prevents "Unexpected end of JSON input", "Unexpected token", and empty body crashes.
 */
export async function parseApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text || !text.trim()) {
    throw new Error(`Empty response from server. HTTP ${response.status}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `Invalid JSON response. HTTP ${response.status}: ${text.slice(0, 150)}`
    );
  }

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Malformed JSON response. HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Request failed with HTTP ${response.status}`
    );
  }

  return data;
}

export async function parseJsonResponse(response: Response) {
  try {
    return await parseApiResponse(response);
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to parse API response."
    };
  }
}

/**
 * Safe wrapper around fetch that guarantees non-throwing response handling
 * and converts raw TypeError: Failed to fetch into a standard JSON payload.
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    return await parseJsonResponse(res);
  } catch (err: any) {
    console.warn(`[safeFetch] Network error for ${url}:`, err);
    return {
      success: false,
      error: err?.message || "Network error. Failed to reach server."
    };
  }
}


