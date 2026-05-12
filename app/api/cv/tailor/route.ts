import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import {
  parsedJobSchema,
  parsedResumeSchema,
  tailoredResumeSchema,
} from "@/lib/ai/schemas";
import { TAILOR_RESUME_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "tailor", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, job, feedback } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: tailoredResumeSchema,
    system: withInjectionGuard(TAILOR_RESUME_SYSTEM),
    prompt: [
      "Produce a tailored resume for the target job.",
      "",
      dataBlock("original_resume", resume),
      "",
      dataBlock("target_job", job),
      feedback ? "\n" + dataBlock("revision_feedback", feedback) : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ result: object });
}
