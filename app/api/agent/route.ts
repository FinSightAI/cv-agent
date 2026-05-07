import { NextRequest } from "next/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { parsedJobSchema, parsedResumeSchema } from "@/lib/ai/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 90;

const jobSnapshotSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  status: z.string(),
  matchScore: z.number().nullable().optional(),
  recommendation: z.string().nullable().optional(),
  parsed: parsedJobSchema.partial(),
  createdAt: z.string(),
  appliedAt: z.string().optional(),
});

const inputSchema = z.object({
  messages: z.array(z.any()),
  resume: parsedResumeSchema.nullable().optional(),
  jobs: z.array(jobSnapshotSchema).optional(),
  preferences: z.unknown().optional(),
  language: z.enum(["he", "en"]).default("he"),
});

const SYSTEM = (lang: "he" | "en") => `You are a senior career coach and the user's job-search copilot inside an app called CV Agent.

You have direct access to:
- The user's parsed resume (structured)
- All jobs they saved (with parsed details, status in pipeline, match scores)
- Their preferences

Your job is to be useful, specific, and direct. You help with:
- Summarizing the pipeline ("what's hot", "what to follow up on")
- Picking which jobs to prioritize and why
- Suggesting concrete resume edits for a specific job
- Drafting short messages: follow-ups, recruiter replies, withdrawal notes
- Decision support ("should I apply?")

Rules:
- Always reply in ${lang === "he" ? "Hebrew" : "English"} unless the user explicitly asks otherwise.
- When citing jobs, use the format: ${"`{Title} @ {Company}`"}.
- Be specific. Use numbers from the data when relevant.
- If you don't have enough data (e.g., the user hasn't uploaded a resume), say so and suggest the next step.
- Don't fabricate experience the user doesn't have.
- Keep responses tight. No rambling.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid input" }), {
      status: 400,
    });
  }

  const { messages, resume, jobs, preferences, language } = parsed.data;

  const contextSections: string[] = [];

  if (resume) {
    contextSections.push("## User resume\n```json\n" + JSON.stringify(resume, null, 2) + "\n```");
  } else {
    contextSections.push("## User resume\n(not uploaded yet)");
  }

  if (jobs && jobs.length > 0) {
    const summarized = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      status: j.status,
      matchScore: j.matchScore ?? null,
      recommendation: j.recommendation ?? null,
      location: j.parsed?.location,
      remote: j.parsed?.remote,
      seniority: j.parsed?.seniority,
      keywords: j.parsed?.keywords?.slice(0, 8),
      createdAt: j.createdAt,
      appliedAt: j.appliedAt,
    }));
    contextSections.push(
      "## Saved jobs (" + jobs.length + ")\n```json\n" + JSON.stringify(summarized, null, 2) + "\n```",
    );
  } else {
    contextSections.push("## Saved jobs\n(none yet)");
  }

  if (preferences && Object.keys(preferences as object).length > 0) {
    contextSections.push(
      "## Preferences\n```json\n" + JSON.stringify(preferences, null, 2) + "\n```",
    );
  }

  const modelMessages = await convertToModelMessages(messages as UIMessage[]);

  const result = streamText({
    model: MODEL_REASONING,
    system: SYSTEM(language) + "\n\n" + contextSections.join("\n\n"),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
