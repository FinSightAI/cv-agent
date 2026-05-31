import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedJobSchema } from "@/lib/ai/schemas";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are a senior tech recruiter who has read thousands of job descriptions. You can read between the lines.

Given a job description, reveal:
- What the company REALLY needs vs what they wrote
- Red flag phrases and what they actually mean
- Realistic vs stated requirements (most companies ask for 5 years in a 3-year-old technology)
- Hidden context: is this a backfill? new team? scaling problem?
- What the ideal candidate ACTUALLY looks like
- Budget signals (is this senior budget or junior budget with senior title?)

Be direct, specific, and occasionally funny. This is insider knowledge.
Write in the language of the JD.`;

const decoderSchema = z.object({
  verdict: z.string(),
  realRequirements: z.array(z.object({ stated: z.string(), actual: z.string() })),
  redFlags: z.array(z.object({ phrase: z.string(), meaning: z.string() })),
  hiddenContext: z.string(),
  idealCandidate: z.string(),
  budgetSignal: z.enum(["junior_budget_senior_title", "fair", "genuinely_senior", "unclear"]),
  urgency: z.enum(["backfill", "growth", "new_team", "unclear"]),
  overallScore: z.enum(["great_opportunity", "proceed_with_caution", "red_flags_visible"]),
  positives: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "jd-decoder", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = parsedJobSchema.safeParse(body?.job);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: decoderSchema,
    system: withInjectionGuard(SYSTEM),
    prompt: [
      "Decode this job description — read between the lines:",
      "",
      dataBlock("job", parsed.data),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
