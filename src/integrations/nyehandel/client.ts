export const nyeBaseUrl = process.env.NYE_BASE_URL ?? "https://api.nyehandel.se/api/v2";

export function nyeHeaders(lang?: string) {
  const h: Record<string, string> = {
    "X-identifier": process.env.NYE_IDENTIFIER ?? "",
    Authorization: `Bearer ${process.env.NYE_TOKEN ?? ""}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (lang) h["X-Language"] = lang;
  return h;
}
