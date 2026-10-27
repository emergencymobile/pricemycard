import { base44 } from "@/api/base44Client";

/**
 * Verifies that seller-entered listing details are relevant to the submitted
 * product photo using vision AI (via a backend function that runs the LLM
 * call server-side). Returns:
 *   { relevant: boolean, confidence: number, mismatches: string[], summary: string }
 */
export async function verifyListingImage(imageUrl, details) {
  const res = await base44.functions.invoke("verifyListingImage", { image_url: imageUrl, details });
  return res.data;
}