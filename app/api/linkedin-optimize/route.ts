// LinkedIn Profile Optimizer — rewrites LinkedIn sections for maximum recruiter discoverability.
// Knows the LinkedIn algorithm: keyword density, headline real estate, first-person About storytelling.

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are a LinkedIn optimization expert who knows exactly how recruiter search works.

LinkedIn has its own SEO. Recruiters search for specific keywords, titles, and phrases.
Your job: rewrite the candidate's LinkedIn sections to maximize recruiter discoverability
while staying authentic.

Key differences from resume:
- LinkedIn headline: 220 chars, keyword-rich, value proposition
- About section: first-person, tells a story, ends with CTA
- Experience bullets: different from resume — more conversational, keyword-dense
- Skills section: which skills to prioritize for recruiter search

Write everything in the requested language.
DO NOT fabricate experience. Only use what's in the resume.`;

const resultSchema = z.object({
  headline: z.string(),
  about: z.string(),
  experienceRewrites: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      rewrittenSummary: z.string(),
      topBullets: z.array(z.string()),
    }),
  ),
  skillsToHighlight: z.array(z.string()),
  keywordsToAdd: z.array(z.string()),
  profileTips: z.array(z.string()),
  estimatedProfileStrength: z.number().min(0).max(100),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "linkedin-optimize", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.resume) {
    return NextResponse.json({ error: "Missing resume" }, { status: 400 });
  }

  const { resume, targetRoles, language } = body as {
    resume: unknown;
    targetRoles?: string[];
    language?: "he" | "en";
  };

  const prompt = [
    `Target roles: ${(targetRoles ?? []).join(", ") || "not specified"}`,
    `Write everything in: ${language === "en" ? "English" : "Hebrew"}`,
    "",
    dataBlock("candidate_resume", resume),
  ].join("\n");

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: resultSchema,
    system: withInjectionGuard(SYSTEM),
    prompt,
  });

  return NextResponse.json({ result: object });
}
