import { NextRequest } from "next/server";
import { streamText } from "ai";
import { COVER_LETTER_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  language: z.enum(["he", "en"]).default("he"),
  tone: z
    .enum(["professional", "warm", "concise", "enthusiastic"])
    .default("professional"),
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  const { resume, job, language, tone, feedback } = parsed.data;

  const result = streamText({
    model: MODEL_REASONING,
    system: COVER_LETTER_SYSTEM,
    prompt: [
      `Language: ${language === "he" ? "Hebrew" : "English"}`,
      `Tone: ${tone}`,
      feedback ? `Revision feedback from previous draft: ${feedback}` : "",
      "",
      "## Candidate resume (JSON):",
      JSON.stringify(resume, null, 2),
      "",
      "## Job listing (JSON):",
      JSON.stringify(job, null, 2),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return result.toTextStreamResponse();
}
