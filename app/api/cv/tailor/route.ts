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

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  feedback: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { resume, job, feedback } = parsed.data;

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: tailoredResumeSchema,
    system: TAILOR_RESUME_SYSTEM,
    prompt: [
      "## Original resume (JSON):",
      JSON.stringify(resume, null, 2),
      "",
      "## Target job (JSON):",
      JSON.stringify(job, null, 2),
      feedback ? `\n## Revision feedback:\n${feedback}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return NextResponse.json({ result: object });
}
