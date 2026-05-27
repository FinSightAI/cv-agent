import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import {
  cvSuggestionsSchema,
  parsedJobSchema,
  parsedResumeSchema,
} from "@/lib/ai/schemas";
import { CV_SUGGESTIONS_SYSTEM } from "@/lib/ai/prompts";
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
  const rl = checkRateLimit(req, "cv-suggestions", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, job } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: cvSuggestionsSchema,
    system: withInjectionGuard(CV_SUGGESTIONS_SYSTEM),
    prompt: [
      "Produce a prioritized list of concrete CV improvement suggestions for the target job.",
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("target_job", job),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
