import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";
import {
  linkedInProfileInputSchema,
  linkedInAnalyticsInputSchema,
  linkedInUsagePatternInputSchema,
  linkedInDiagnosisResultSchema,
} from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

const requestSchema = z.object({
  resume: z.unknown(),
  targetRoles: z.array(z.string()).optional(),
  language: z.enum(["he", "en"]).optional(),
  profile: linkedInProfileInputSchema,
  analytics: linkedInAnalyticsInputSchema,
  usagePattern: linkedInUsagePatternInputSchema,
});

const SYSTEM = `You are a LinkedIn profile diagnostic expert who knows exactly how recruiter search (LinkedIn Recruiter) and the LinkedIn algorithm work.

You are given three sources: the candidate's resume (ground truth for real experience/skills), their CURRENT live LinkedIn profile content, and their real LinkedIn analytics (SSI, search appearances, profile views, post impressions) plus usage-pattern answers.

Your job is DIAGNOSIS, not rewriting from scratch: compare the current profile against the resume and the target roles, and assess how well the profile is actually doing today.

Hard rules:
- NEVER invent a numeric score, percentage, or "average candidate" comparison. Assess each axis qualitatively as "low", "medium", or "high" with a text explanation. You may reference the real numbers the user provided (e.g. their actual SSI) inside an explanation, but never fabricate a new number.
- NEVER recommend adding a skill or keyword that is not present in the resume. If a valuable keyword is missing from both the resume and the profile, put it in "gaps" phrased as a question back to the user, not as an instruction in "recommendations".
- If the resume and profile disagree on a fact (dates, seniority, current vs. past role), report it in "conflicts" — do not guess which source is correct or silently prefer one.
- For an early-career profile, low axis levels are a natural starting point, not a flaw — say so in the explanation, but keep the level itself honest (low/medium/high unchanged by tone).
- Write all text output in the requested language.`;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "linkedin-diagnose", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { resume, targetRoles, language, profile, analytics, usagePattern } = parsedBody.data;
  if (!resume) {
    return NextResponse.json({ error: "Missing resume" }, { status: 400 });
  }

  const prompt = [
    `Target roles: ${(targetRoles ?? []).join(", ") || "not specified"}`,
    `Write everything in: ${language === "en" ? "English" : "Hebrew"}`,
    "",
    dataBlock("candidate_resume", resume),
    dataBlock("current_linkedin_profile", profile),
    dataBlock("real_linkedin_analytics", analytics),
    dataBlock("usage_pattern_answers", usagePattern),
  ].join("\n");

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: linkedInDiagnosisResultSchema,
    system: withInjectionGuard(SYSTEM),
    prompt,
  });

  return NextResponse.json({ result: object });
}
