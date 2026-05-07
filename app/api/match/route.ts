import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { matchResultSchema, parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { MATCH_SYSTEM } from "@/lib/ai/prompts";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  resume: parsedResumeSchema,
  job: parsedJobSchema,
});

export async function POST(req: NextRequest) {
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
    system: MATCH_SYSTEM,
    prompt: [
      "## Candidate resume (JSON):",
      JSON.stringify(resume, null, 2),
      "",
      "## Job listing (JSON):",
      JSON.stringify(job, null, 2),
    ].join("\n"),
  });

  return NextResponse.json({ result: object });
}
