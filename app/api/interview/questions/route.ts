import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import {
  interviewPrepSchema,
  parsedJobSchema,
  parsedResumeSchema,
} from "@/lib/ai/schemas";
import { INTERVIEW_PREP_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "interview-questions", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, job } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: interviewPrepSchema,
    system: withInjectionGuard(INTERVIEW_PREP_SYSTEM),
    prompt: [
      "Generate interview preparation questions and suggested answers for this candidate and job.",
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("target_job", job),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
