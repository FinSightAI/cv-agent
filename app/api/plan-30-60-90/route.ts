import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedResumeSchema, parsedJobSchema } from "@/lib/ai/schemas";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM = `You are a senior career strategist who helps candidates prepare 30-60-90 day plans for job interviews.

A 30-60-90 day plan shows the interviewer you've done your homework and can hit the ground running.

Rules:
- Be SPECIFIC to the actual role and company. Don't write generic plans.
- Use the candidate's actual background to make the plan credible.
- Each phase has a clear theme (learn → contribute → lead, or similar)
- Goals should be measurable where possible
- First week priorities are the most important — make them concrete
- Write in the language of the candidate's resume
- DO NOT invent information about the company not present in the JD`;

const planSchema = z.object({
  executiveSummary: z.string(),
  firstWeekPriorities: z.array(z.string()),
  day30: z.object({
    theme: z.string(),
    goals: z.array(z.string()),
    keyActions: z.array(z.string()),
    successMetric: z.string(),
  }),
  day60: z.object({
    theme: z.string(),
    goals: z.array(z.string()),
    keyActions: z.array(z.string()),
    successMetric: z.string(),
  }),
  day90: z.object({
    theme: z.string(),
    goals: z.array(z.string()),
    keyActions: z.array(z.string()),
    successMetric: z.string(),
  }),
  questionsToAskInterviewer: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "plan-30-60-90", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  if (!body?.resume || !body?.job) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const resumeParsed = parsedResumeSchema.safeParse(body.resume);
  const jobParsed = parsedJobSchema.safeParse(body.job);
  if (!resumeParsed.success || !jobParsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: planSchema,
    system: withInjectionGuard(SYSTEM),
    prompt: [
      "Create a 30-60-90 day plan for this candidate and role:",
      "",
      dataBlock("resume", resumeParsed.data),
      dataBlock("job", jobParsed.data),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
