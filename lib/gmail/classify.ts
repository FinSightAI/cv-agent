import { generateObject } from "ai";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";
import { z } from "zod";
import { MODEL_FAST } from "@/lib/ai/gateway";
import type { RawEmail } from "./scan";

export const classificationSchema = z.object({
  category: z.enum([
    "rejection",
    "interview_invite",
    "interview_followup",
    "offer",
    "recruiter_outreach",
    "application_confirmation",
    "automated_alert",
    "other",
  ]),
  confidence: z.enum(["high", "medium", "low"]),
  matchedCompany: z.string().nullable(),
  matchedJobTitle: z.string().nullable(),
  matchedJobId: z.string().nullable(),
  needsReply: z.boolean(),
  suggestedAction: z.string().nullable(),
  summary: z.string(),
  suggestedStatus: z
    .enum([
      "saved",
      "drafting",
      "ready",
      "applied",
      "screen",
      "interview",
      "offer",
      "rejected",
      "withdrawn",
      "ghosted",
    ])
    .nullable(),
});

export type EmailClassification = z.infer<typeof classificationSchema>;

const SYSTEM = `You classify emails relevant to a job seeker's pipeline.

Possible categories:
- rejection: explicit "we won't be moving forward", "decided to go in another direction"
- interview_invite: "we'd like to schedule", "are you available", new interview proposed
- interview_followup: thank-you, post-interview, "we're still considering"
- offer: explicit job offer
- recruiter_outreach: cold outreach from recruiter / employer that the user has NOT applied to yet
- application_confirmation: "thanks for applying", auto-acknowledgement
- automated_alert: LinkedIn job alerts, indeed digests, generic newsletters
- other: not really job-search related

Match to a known job from the provided list when possible — return the matched job's id, the company exactly as in that job, and the title. If no clear match, set those to null.

needsReply=true ONLY when a human action is expected: scheduling a call, answering a question, sending information. Auto-confirmations and rejections do NOT need reply.

suggestedStatus: a status to move the application TO if this email implies progression. null if no status change is implied.

suggestedAction: a SHORT next-step (e.g. "Reply with availability for a 30-min call this week", "Send your portfolio link"). null if no action needed.

summary: one short sentence (max 25 words).

Reply in the user's language (auto-detect from email content).`;

export async function classifyEmail(
  email: RawEmail,
  jobs: { id: string; title: string; company: string; status: string }[],
): Promise<EmailClassification> {
  const { object } = await generateObject({
    model: MODEL_FAST,
    schema: classificationSchema,
    system: withInjectionGuard(SYSTEM),
    prompt: [
      dataBlock("user_saved_jobs", jobs),
      "",
      dataBlock("email_to_classify", {
        from: email.from,
        subject: email.subject,
        date: email.date ?? "",
        body: email.body || email.snippet,
      }),
    ].join("\n"),
  });
  return object;
}
