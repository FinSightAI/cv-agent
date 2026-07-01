import { NextRequest } from "next/server";
import { streamText } from "ai";
import { COVER_LETTER_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { z } from "zod";
import {
  checkRateLimit,
  rateLimitStreamResponse,
  HEAVY_AI_LIMIT,
} from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  language: z.enum(["he", "en"]).default("he"),
  tone: z
    .enum(["professional", "warm", "concise", "enthusiastic"])
    .default("professional"),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "cover-letter", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitStreamResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  const { resume, job, language, tone, feedback } = parsed.data;

  const result = streamText({
    model: MODEL_REASONING,
    system: withInjectionGuard(COVER_LETTER_SYSTEM),
    prompt: [
      `Language: ${language === "he" ? "Hebrew" : "English"}`,
      `Tone: ${tone}`,
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("job_listing", job),
      feedback ? "\n" + dataBlock("revision_feedback", feedback) : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return result.toTextStreamResponse();
}
