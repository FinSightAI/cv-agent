// Company Research Brief — AI generates pre-interview company intelligence
// from the job description alone (no external API calls, pure reasoning).

import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedJobSchema } from "@/lib/ai/schemas";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are a career intelligence analyst preparing a candidate for a job interview.
Based ONLY on the job description provided, extract and infer as much useful company intelligence as possible.

Derive: company stage signals (startup/scaleup/enterprise), team size hints, tech stack maturity, engineering culture signals,
urgency of role, pain points they're solving, what they value in candidates, potential red flags, and smart questions to ask.

Be specific and insightful. Distinguish between what's stated vs inferred.
Write in the candidate's language (Hebrew or English based on the JD).
DO NOT invent information. If something is inferred, say "suggests" or "implies".`;

const resultSchema = z.object({
  companySnapshot: z.string(),
  companyStage: z.enum(["early_startup", "growth_startup", "scaleup", "enterprise", "unknown"]),
  teamSizeHint: z.string(),
  techCultureSignals: z.array(z.string()),
  whatTheyValue: z.array(z.string()),
  painPoints: z.array(z.string()),
  redFlags: z.array(z.string()),
  smartQuestionsToAsk: z.array(z.string()),
  urgencySignals: z.string(),
  competitiveEdgeForRole: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "company-research", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = parsedJobSchema.safeParse(body?.job);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: resultSchema,
    system: withInjectionGuard(SYSTEM),
    prompt: ["Extract company intelligence from this job description:", "", dataBlock("job", parsed.data)].join("\n"),
  });

  return NextResponse.json({ result: object });
}
