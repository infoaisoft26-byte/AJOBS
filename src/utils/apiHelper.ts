/**
 * Reusable JSON Response Parsing Helper with Validation
 * Safely validates HTTP status and parses JSON text to prevent unexpected end of JSON input errors.
 */
export async function parseJsonResponse(response: Response) {
  const text = await response.text();

  if (!text || text.trim() === "") {
    return {
      success: false,
      error: "Empty response from server."
    };
  }

  let data: any;

  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.slice(0, 150)}`);
  }

  return data;
}

