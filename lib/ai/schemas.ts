import { z } from "zod";

export const parsedResumeSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  languages: z
    .array(z.object({ name: z.string(), level: z.string().optional() }))
    .optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        current: z.boolean().optional(),
        bullets: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string().optional(),
        field: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .optional(),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .optional(),
});

export const parsedJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  employmentType: z.string().optional(),
  seniority: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  summary: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  requirements: z
    .array(z.object({ text: z.string(), required: z.boolean() }))
    .optional(),
  niceToHave: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

export const matchResultSchema = z.object({
  score: z.number().min(0).max(100),
  recommendation: z.enum(["apply", "tailor_first", "skip"]),
  reason: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(
    z.object({
      requirement: z.string(),
      severity: z.enum(["blocker", "major", "minor"]),
      mitigation: z.string().optional(),
    }),
  ),
  hardRequirementsMet: z.boolean(),
  suggestedResumeEdits: z.array(
    z.object({ section: z.string(), change: z.string() }),
  ),
  keywordsToAdd: z.array(z.string()),
  estimatedFitNotes: z.string().optional(),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type ParsedJob = z.infer<typeof parsedJobSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;

export const tailoredResumeSchema = z.object({
  resume: parsedResumeSchema,
  changes: z.array(
    z.object({
      section: z.string(),
      change: z.string(),
      kind: z.enum([
        "summary_rewrite",
        "bullet_rewrite",
        "reorder",
        "keyword_added",
        "skill_added",
        "no_change",
      ]),
    }),
  ),
  notes: z.string().optional(),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

export const cvSuggestionSchema = z.object({
  type: z.enum([
    "add_skill",
    "rewrite_bullet",
    "add_keyword",
    "quantify",
    "reword_headline",
    "rewrite_summary",
    "reorder",
    "add_project_mention",
    "remove",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  section: z.enum([
    "headline",
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "other",
  ]),
  target: z.string(),
  currentText: z.string().optional(),
  suggestedText: z.string(),
  reason: z.string(),
  matchedKeywords: z.array(z.string()).default([]),
});

export const cvSuggestionsSchema = z.object({
  overallNote: z.string(),
  suggestions: z.array(cvSuggestionSchema),
  missingKeywords: z.array(z.string()).default([]),
  strengthsToEmphasize: z.array(z.string()).default([]),
});

export type CVSuggestion = z.infer<typeof cvSuggestionSchema>;
export type CVSuggestions = z.infer<typeof cvSuggestionsSchema>;
