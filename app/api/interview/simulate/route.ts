import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { MODEL_FAST } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitStreamResponse, DEFAULT_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";
import { z } from "zod";
import { parsedResumeSchema, parsedJobSchema } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

const inputSchema = z.object({
  messages: z.array(z.unknown()),
  resume: parsedResumeSchema,
  job: parsedJobSchema,
  stage: z.enum(["hr_screen", "technical", "behavioral", "final_round"]).default("technical"),
  language: z.enum(["he", "en"]).default("he"),
});

const INTERVIEWER_SYSTEM = (stage: string, lang: string) =>
  `You are a professional interviewer conducting a job interview. You are playing the role of a real hiring manager.

Stage: ${stage}
Language: Respond in ${lang === "he" ? "Hebrew" : "English"} unless explicitly told otherwise.

BEHAVIOR:
- Ask ONE question at a time, never multiple
- Warmup (first 1-2 exchanges): brief greeting, ask about background/motivation
- Core (next 6-8 exchanges): dig into experience, technical skills, behavioral situations
- Wrap-up (last 1-2): ask if candidate has questions, thank them
- If candidate answers weakly: probe deeper ("Can you tell me more about your specific role?", "What was the outcome?")
- If candidate answers strongly: briefly acknowledge then move to harder question
- For behavioral: use STAR probing if components missing
- For technical: increase/decrease depth based on answer quality
- Be realistic — sometimes skeptical, sometimes impressed
- Keep each message short: 1-3 sentences max

NEVER:
- Break character or reveal you're AI
- Give feedback or scores during the interview
- Ask more than one question at a time
- Use more than 3 sentences per message

Start with: brief greeting + first warmup question based on resume and role.`;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "interview-sim", DEFAULT_AI_LIMIT);
  if (!rl.ok) return rateLimitStreamResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid input", { status: 400 });

  const { messages, resume, job, stage, language } = parsed.data;

  const modelMessages = await convertToModelMessages(messages as UIMessage[]);

  const result = streamText({
    model: MODEL_FAST,
    system: withInjectionGuard(
      INTERVIEWER_SYSTEM(stage, language) +
        "\n\n" +
        dataBlock("candidate_resume", resume) +
        "\n" +
        dataBlock("target_job", job),
    ),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
