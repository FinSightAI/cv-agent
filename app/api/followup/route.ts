import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { FOLLOWUP_EMAIL_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  language: z.enum(["he", "en"]).default("he"),
  daysAgo: z.number().optional(),
});

const emailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "followup", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, job, language, daysAgo } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: emailSchema,
    system: withInjectionGuard(FOLLOWUP_EMAIL_SYSTEM),
    prompt: [
      `Write a follow-up email in ${language === "he" ? "Hebrew" : "English"}.`,
      daysAgo ? `The candidate applied ${daysAgo} days ago.` : "",
      "",
      dataBlock("candidate_resume", resume),
      "",
      dataBlock("target_job", job),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ result: object });
}
