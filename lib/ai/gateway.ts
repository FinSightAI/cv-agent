import { google } from "@ai-sdk/google";

// Direct Google Gemini integration — uses the free tier on Google AI Studio.
// Get your key (free): https://aistudio.google.com/app/apikey
// Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local
//
// Free tier (as of 2026):
// - Gemini 2.5 Flash: ~10 RPM, ~250 RPD, generous tokens
// - Gemini 2.5 Pro: lower limits but smarter
//
// If you ever switch to paid Claude/OpenAI, swap these constants and
// install the matching @ai-sdk/* package — call sites stay the same.

export const MODEL_FAST = google("gemini-2.5-flash");
export const MODEL_REASONING = google("gemini-2.5-pro");
export const MODEL_HEAVY = google("gemini-2.5-pro");
