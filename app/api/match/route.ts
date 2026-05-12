import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { matchResultSchema, parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { MATCH_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "match", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { resume, job } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: matchResultSchema,
    system: withInjectionGuard(MATCH_SYSTEM),
    prompt: [
      "Analyze the fit between the candidate and the job.",
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("job_listing", job),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
