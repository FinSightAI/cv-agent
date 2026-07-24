# LinkedIn Profile Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current LinkedIn Optimizer (single-shot, resume-only, fabricated 0-100 score) with a LinkedIn Profile Diagnosis feature that compares the user's real live profile content + real LinkedIn analytics (SSI, Search Appearances, Profile Views, Post Impressions) + usage-pattern answers against their resume and target roles, producing a qualitative (low/medium/high) axis assessment, gaps, prioritized recommendations with ready-to-paste text, and flagged resume/profile conflicts.

**Architecture:** New Zod schemas in `lib/ai/schemas.ts` are the single source of truth for input/output shapes, consumed by a new `lib/storage.ts` persistence pair, a new `app/api/linkedin-diagnose/route.ts`, and four new components under `components/linkedin-diagnosis/` (one container + three input sections + one results view). The old route and component are deleted in the final task, atomically with the old i18n keys, so every intermediate commit still builds.

**Tech Stack:** Same as the rest of Jobos — Next.js API route, AI SDK `generateObject`, Zod, existing shadcn/Base UI components (`Select` is newly used by this feature; not used elsewhere in `/cv`).

## Global Constraints

- Design source of truth: `docs/superpowers/specs/2026-07-24-linkedin-profile-diagnosis-design.md`.
- No fabricated numeric scores anywhere in the output — `axisAssessment[].level` is `"low" | "medium" | "high"` only.
- Never recommend a skill/keyword absent from the resume — goes to `gaps` as a question, not `recommendations` as an instruction.
- All 3 input sections (profile, analytics, usage pattern) are required before the "Run Diagnosis" button is enabled — no partial-data path.
- No test framework exists in this repo (`package.json` has no test script, no `*.test.*` files) — verification is `npm run build` (type-check gate) plus manual `npm run dev` exercise, matching `docs/superpowers/plans/2026-07-22-word-export-plan.md`.
- Old feature (`components/linkedin-optimizer.tsx`, `app/api/linkedin-optimize/route.ts`, old `linkedin.*` i18n keys) is deleted only in the final task, atomically with the new wiring — every task before that must leave `npm run build` green.

---

### Task 1: Zod schemas for LinkedIn diagnosis input/output

**Files:**
- Modify: `lib/ai/schemas.ts` (append after line 188, end of file)

**Interfaces:**
- Produces: `linkedInProfileInputSchema`/`LinkedInProfileInput`, `linkedInAnalyticsInputSchema`/`LinkedInAnalyticsInput`, `linkedInUsagePatternInputSchema`/`LinkedInUsagePatternInput`, `linkedInDiagnosisResultSchema`/`LinkedInDiagnosisResult` — consumed by every later task in this plan.

- [ ] **Step 1: Append the schemas**

At the end of `lib/ai/schemas.ts` (after line 188, `export type InterviewPrep = z.infer<typeof interviewPrepSchema>;`), add:

```ts

export const linkedInProfileInputSchema = z.object({
  headline: z.string(),
  openToWork: z.enum(["off", "recruiters", "all"]),
  location: z.string(),
  connectionsCount: z.string(),
  about: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      description: z.string(),
    }),
  ),
  education: z.string(),
  certifications: z.string(),
  skills: z.array(z.string()),
  recommendations: z.string(),
  projects: z.string(),
});
export type LinkedInProfileInput = z.infer<typeof linkedInProfileInputSchema>;

export const linkedInAnalyticsInputSchema = z.object({
  ssiTotal: z.number(),
  ssiBrand: z.number(),
  ssiFindPeople: z.number(),
  ssiEngage: z.number(),
  ssiRelationships: z.number(),
  ssiIndustryAvg: z.number().nullable(),
  ssiNetworkAvg: z.number().nullable(),
  searchAppearances7d: z.number(),
  profileViews7d: z.number(),
  postImpressions7d: z.number(),
});
export type LinkedInAnalyticsInput = z.infer<typeof linkedInAnalyticsInputSchema>;

export const linkedInUsagePatternInputSchema = z.object({
  activityFrequency: z.enum(["daily", "weekly", "rarely", "never"]),
  postsOrEngages: z.boolean(),
  receivedRecruiterMessages: z.enum(["yes", "no", "unsure"]),
  sendsConnectionRequests: z.enum(["often", "sometimes", "never"]),
});
export type LinkedInUsagePatternInput = z.infer<typeof linkedInUsagePatternInputSchema>;

export const linkedInDiagnosisResultSchema = z.object({
  axisAssessment: z.array(
    z.object({
      axis: z.enum([
        "searchAppearance",
        "initialScreening",
        "keywordMatch",
        "activitySignals",
        "visibilitySettings",
      ]),
      level: z.enum(["low", "medium", "high"]),
      explanation: z.string(),
    }),
  ),
  gaps: z.array(z.string()),
  recommendations: z.array(
    z.object({
      priority: z.number(),
      title: z.string(),
      why: z.string(),
      readyToPasteText: z.string().optional(),
    }),
  ),
  conflicts: z.array(
    z.object({
      field: z.string(),
      resumeSays: z.string(),
      profileSays: z.string(),
    }),
  ),
  bottomLine: z.string(),
});
export type LinkedInDiagnosisResult = z.infer<typeof linkedInDiagnosisResultSchema>;
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors (new exports, no consumers yet, so nothing else can break).

- [ ] **Step 3: Commit**

```bash
git add lib/ai/schemas.ts
git commit -m "feat: add LinkedIn diagnosis input/output schemas"
```

---

### Task 2: Storage persistence for diagnosis input + last result

**Files:**
- Modify: `lib/storage.ts`

**Interfaces:**
- Consumes: `LinkedInProfileInput`, `LinkedInAnalyticsInput`, `LinkedInUsagePatternInput`, `LinkedInDiagnosisResult` from Task 1 (`@/lib/ai/schemas`).
- Produces: `store.getLinkedInDiagnosis(): StoredLinkedInDiagnosis | null`, `store.setLinkedInDiagnosis(d: StoredLinkedInDiagnosis)` — consumed by Task 9.

- [ ] **Step 1: Extend the type import**

Find (line 6-13):

```ts
import type {
  ParsedJob,
  ParsedResume,
  MatchResult,
  TailoredResume,
  CVSuggestions,
  InterviewPrep,
} from "@/lib/ai/schemas";
```

Replace with:

```ts
import type {
  ParsedJob,
  ParsedResume,
  MatchResult,
  TailoredResume,
  CVSuggestions,
  InterviewPrep,
  LinkedInProfileInput,
  LinkedInAnalyticsInput,
  LinkedInUsagePatternInput,
  LinkedInDiagnosisResult,
} from "@/lib/ai/schemas";
```

- [ ] **Step 2: Add the storage key**

Find (line 26-28):

```ts
const RESUME_KEY = "cv-agent:resume:v1";
const JOBS_KEY = "cv-agent:jobs:v1";
const PREFS_KEY = "cv-agent:prefs:v1";
```

Replace with:

```ts
const RESUME_KEY = "cv-agent:resume:v1";
const JOBS_KEY = "cv-agent:jobs:v1";
const PREFS_KEY = "cv-agent:prefs:v1";
const LINKEDIN_DIAGNOSIS_KEY = "cv-agent:linkedinDiagnosis:v1";
```

- [ ] **Step 3: Add the stored type**

Find (line 30-34):

```ts
export type StoredResume = {
  parsed: ParsedResume;
  rawText: string;
  updatedAt: string;
};
```

Add directly after it:

```ts

export type StoredLinkedInDiagnosis = {
  profile: LinkedInProfileInput;
  analytics: LinkedInAnalyticsInput;
  usagePattern: LinkedInUsagePatternInput;
  result?: LinkedInDiagnosisResult;
  updatedAt: string;
};
```

- [ ] **Step 4: Add the store methods**

Find the end of the `store` object (line 121-128):

```ts
  getPrefs(): StoredPreferences | null {
    if (typeof window === "undefined") return null;
    return safeParse<StoredPreferences>(localStorage.getItem(PREFS_KEY));
  },
  setPrefs(p: StoredPreferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  },
};
```

Replace with:

```ts
  getPrefs(): StoredPreferences | null {
    if (typeof window === "undefined") return null;
    return safeParse<StoredPreferences>(localStorage.getItem(PREFS_KEY));
  },
  setPrefs(p: StoredPreferences) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  },

  getLinkedInDiagnosis(): StoredLinkedInDiagnosis | null {
    if (typeof window === "undefined") return null;
    return safeParse<StoredLinkedInDiagnosis>(localStorage.getItem(LINKEDIN_DIAGNOSIS_KEY));
  },
  setLinkedInDiagnosis(d: StoredLinkedInDiagnosis) {
    localStorage.setItem(LINKEDIN_DIAGNOSIS_KEY, JSON.stringify(d));
  },
};
```

- [ ] **Step 5: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/storage.ts
git commit -m "feat: add localStorage persistence for LinkedIn diagnosis"
```

---

### Task 3: New API route `app/api/linkedin-diagnose`

**Files:**
- Create: `app/api/linkedin-diagnose/route.ts`

**Interfaces:**
- Consumes: schemas from Task 1; `checkRateLimit`/`rateLimitResponse`/`HEAVY_AI_LIMIT` from `@/lib/rate-limit`; `dataBlock`/`withInjectionGuard` from `@/lib/ai/safe-prompt`; `MODEL_REASONING` from `@/lib/ai/gateway`.
- Produces: `POST /api/linkedin-diagnose` — consumed by Task 9's container. Old `app/api/linkedin-optimize/route.ts` is untouched by this task (deleted in Task 9).

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { MODEL_REASONING } from "@/lib/ai/gateway";
import { checkRateLimit, rateLimitResponse, HEAVY_AI_LIMIT } from "@/lib/rate-limit";
import { dataBlock, withInjectionGuard } from "@/lib/ai/safe-prompt";
import {
  linkedInProfileInputSchema,
  linkedInAnalyticsInputSchema,
  linkedInUsagePatternInputSchema,
  linkedInDiagnosisResultSchema,
} from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 90;

const requestSchema = z.object({
  resume: z.unknown(),
  targetRoles: z.array(z.string()).optional(),
  language: z.enum(["he", "en"]).optional(),
  profile: linkedInProfileInputSchema,
  analytics: linkedInAnalyticsInputSchema,
  usagePattern: linkedInUsagePatternInputSchema,
});

const SYSTEM = `You are a LinkedIn profile diagnostic expert who knows exactly how recruiter search (LinkedIn Recruiter) and the LinkedIn algorithm work.

You are given three sources: the candidate's resume (ground truth for real experience/skills), their CURRENT live LinkedIn profile content, and their real LinkedIn analytics (SSI, search appearances, profile views, post impressions) plus usage-pattern answers.

Your job is DIAGNOSIS, not rewriting from scratch: compare the current profile against the resume and the target roles, and assess how well the profile is actually doing today.

Hard rules:
- NEVER invent a numeric score, percentage, or "average candidate" comparison. Assess each axis qualitatively as "low", "medium", or "high" with a text explanation. You may reference the real numbers the user provided (e.g. their actual SSI) inside an explanation, but never fabricate a new number.
- NEVER recommend adding a skill or keyword that is not present in the resume. If a valuable keyword is missing from both the resume and the profile, put it in "gaps" phrased as a question back to the user, not as an instruction in "recommendations".
- If the resume and profile disagree on a fact (dates, seniority, current vs. past role), report it in "conflicts" — do not guess which source is correct or silently prefer one.
- For an early-career profile, low axis levels are a natural starting point, not a flaw — say so in the explanation, but keep the level itself honest (low/medium/high unchanged by tone).
- Write all text output in the requested language.`;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, "linkedin-diagnose", HEAVY_AI_LIMIT);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  const body = await req.json().catch(() => null);
  const parsedBody = requestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { resume, targetRoles, language, profile, analytics, usagePattern } = parsedBody.data;
  if (!resume) {
    return NextResponse.json({ error: "Missing resume" }, { status: 400 });
  }

  const prompt = [
    `Target roles: ${(targetRoles ?? []).join(", ") || "not specified"}`,
    `Write everything in: ${language === "en" ? "English" : "Hebrew"}`,
    "",
    dataBlock("candidate_resume", resume),
    dataBlock("current_linkedin_profile", profile),
    dataBlock("real_linkedin_analytics", analytics),
    dataBlock("usage_pattern_answers", usagePattern),
  ].join("\n");

  const { object } = await generateObject({
    model: MODEL_REASONING,
    schema: linkedInDiagnosisResultSchema,
    system: withInjectionGuard(SYSTEM),
    prompt,
  });

  return NextResponse.json({ result: object });
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 3: Verify with a live request**

Run: `npm run dev` in one terminal. In another:

```bash
curl -s -X POST http://localhost:3000/api/linkedin-diagnose \
  -H "Content-Type: application/json" \
  -d '{
    "resume": {"fullName":"Test Person","headline":"Senior SAP SD Consultant","skills":["SAP SD","SAP OTC","GATP"],"experience":[{"company":"Acme","title":"SAP SD Consultant","current":true,"bullets":["Led SAP SD rollout"]}]},
    "targetRoles": ["SAP SD Consultant"],
    "language": "en",
    "profile": {"headline":"SAP Consultant","openToWork":"recruiters","location":"Tel Aviv","connectionsCount":"500+","about":"Experienced consultant.","experience":[{"company":"Acme","role":"SAP Consultant","description":"Worked on SAP projects."}],"education":"BSc","certifications":"","skills":["SAP"],"recommendations":"","projects":""},
    "analytics": {"ssiTotal":45,"ssiBrand":10,"ssiFindPeople":12,"ssiEngage":8,"ssiRelationships":15,"ssiIndustryAvg":33,"ssiNetworkAvg":40,"searchAppearances7d":3,"profileViews7d":10,"postImpressions7d":0},
    "usagePattern": {"activityFrequency":"rarely","postsOrEngages":false,"receivedRecruiterMessages":"no","sendsConnectionRequests":"sometimes"}
  }' | head -c 2000
```

Expected: JSON with a top-level `result` object containing `axisAssessment` (array of 5 objects with `axis`/`level`/`explanation`), `gaps`, `recommendations`, `conflicts`, `bottomLine`. No `estimatedProfileStrength` field anywhere. If `GOOGLE_GENERATIVE_AI_API_KEY` isn't set locally, this call fails at the AI SDK level (not a route bug) — confirm the route itself accepted the request (no 400) and pass real credentials before treating this step as complete.

- [ ] **Step 4: Commit**

```bash
git add app/api/linkedin-diagnose/route.ts
git commit -m "feat: add /api/linkedin-diagnose route"
```

---

### Task 4: New i18n keys (additive — old `linkedin.*` keys stay for now)

**Files:**
- Modify: `lib/i18n/dictionary.ts`

**Interfaces:**
- Produces: ~66 new `linkedin.*` keys per language, consumed by Tasks 5-9. Old `linkedin.*` keys (title/desc/run/running/headline/about/experience/skills/tips/strength/copyAll) are left untouched here — the old component still reads them until Task 9.

- [ ] **Step 1: Add the Hebrew block**

Find (line 715-726, inside the `he` block):

```ts
    // LinkedIn optimizer
    "linkedin.title": "אופטימייזר LinkedIn",
    "linkedin.desc": "כתיבה מחדש של הפרופיל למקסימום חשיפה לרקרוטרים",
    "linkedin.run": "אופטימייז פרופיל",
    "linkedin.running": "מייצר...",
    "linkedin.headline": "כותרת",
    "linkedin.about": "אודות",
    "linkedin.experience": "ניסיון",
    "linkedin.skills": "כישורים לבליטה",
    "linkedin.tips": "טיפים",
    "linkedin.strength": "חוזק הפרופיל",
    "linkedin.copyAll": "העתק הכל",
```

Add directly after it (before `// 30-60-90 Day Plan`):

```ts
    // LinkedIn diagnosis (replaces LinkedIn optimizer — old block above removed in a later task)
    "linkedin.diag.title": "אבחון פרופיל LinkedIn",
    "linkedin.diag.desc": "אבחון מבוסס-נתונים אמיתיים של הפרופיל הקיים שלך מול מגייסות",
    "linkedin.diag.language": "שפת פלט:",
    "linkedin.diag.targetRoles": "תפקידי יעד",
    "linkedin.diag.run": "הרץ אבחון",
    "linkedin.diag.running": "מאבחן...",
    "linkedin.diag.validation.needResume": "העלה קורות חיים תחילה",
    "linkedin.diag.validation.needFields": "מלא/י את כל השדות (כולל פרופיל, SSI ואנליטיקס) לפני הרצת האבחון",
    "linkedin.diag.error.generic": "שגיאה באבחון",
    "linkedin.diag.profile.headline": "כותרת (Headline)",
    "linkedin.diag.profile.openToWork": "הגדרת Open to Work",
    "linkedin.diag.profile.openToWorkOff": "כבוי",
    "linkedin.diag.profile.openToWorkRecruiters": "למגייסות בלבד",
    "linkedin.diag.profile.openToWorkAll": "לכולם",
    "linkedin.diag.profile.location": "מיקום",
    "linkedin.diag.profile.connections": "מספר קשרים",
    "linkedin.diag.profile.about": "About",
    "linkedin.diag.profile.experience": "ניסיון (Experience)",
    "linkedin.diag.profile.experienceAdd": "הוסף תפקיד",
    "linkedin.diag.profile.experienceCompany": "חברה",
    "linkedin.diag.profile.experienceRole": "תפקיד",
    "linkedin.diag.profile.experienceDesc": "תיאור",
    "linkedin.diag.profile.education": "השכלה",
    "linkedin.diag.profile.certifications": "קורסים / הסמכות",
    "linkedin.diag.profile.skills": "כישורים (Skills)",
    "linkedin.diag.profile.recommendations": "המלצות (Recommendations)",
    "linkedin.diag.profile.projects": "פרויקטים",
    "linkedin.diag.analytics.ssiLink": "מצא ב-linkedin.com/sales/ssi (לא דורש מנוי, כניסה עם החשבון הרגיל שלך)",
    "linkedin.diag.analytics.ssiTotal": "SSI כללי",
    "linkedin.diag.analytics.ssiBrand": "בניית מותג מקצועי",
    "linkedin.diag.analytics.ssiFindPeople": "מציאת האנשים הנכונים",
    "linkedin.diag.analytics.ssiEngage": "מעורבות עם תובנות",
    "linkedin.diag.analytics.ssiRelationships": "בניית קשרים",
    "linkedin.diag.analytics.ssiIndustryAvg": "ממוצע בתעשייה (אופציונלי)",
    "linkedin.diag.analytics.ssiNetworkAvg": "ממוצע ברשת שלך (אופציונלי)",
    "linkedin.diag.analytics.searchAppearances": "הופעות בחיפוש (7 ימים)",
    "linkedin.diag.analytics.profileViews": "צפיות בפרופיל (7 ימים)",
    "linkedin.diag.analytics.postImpressions": "חשיפות לפוסטים (7 ימים)",
    "linkedin.diag.usage.activityFrequency": "תדירות כניסה ללינקדין",
    "linkedin.diag.usage.freqDaily": "כל יום",
    "linkedin.diag.usage.freqWeekly": "פעם בשבוע",
    "linkedin.diag.usage.freqRarely": "לעיתים רחוקות",
    "linkedin.diag.usage.freqNever": "כמעט אף פעם",
    "linkedin.diag.usage.postsOrEngages": "מפרסם/ת פוסטים או מגיב/ה לתוכן?",
    "linkedin.diag.usage.yes": "כן",
    "linkedin.diag.usage.no": "לא",
    "linkedin.diag.usage.unsure": "לא בטוח/ה",
    "linkedin.diag.usage.receivedRecruiterMessages": "קיבלת פעם פנייה ממגייסת דרך לינקדין?",
    "linkedin.diag.usage.sendsConnectionRequests": "שולח/ת בקשות חיבור ביוזמתך?",
    "linkedin.diag.usage.connOften": "לעיתים קרובות",
    "linkedin.diag.usage.connSometimes": "לפעמים",
    "linkedin.diag.usage.connNever": "כמעט אף פעם",
    "linkedin.diag.results.axisTitle": "הערכה לפי צירים",
    "linkedin.diag.results.axis.searchAppearance": "סיכוי הופעה בחיפוש מגייסות",
    "linkedin.diag.results.axis.initialScreening": "סיכוי לעבור סינון ראשוני",
    "linkedin.diag.results.axis.keywordMatch": "התאמת מילות מפתח",
    "linkedin.diag.results.axis.activitySignals": "אותות פעילות לאלגוריתם",
    "linkedin.diag.results.axis.visibilitySettings": "הגדרות נראות",
    "linkedin.diag.results.level.low": "נמוך",
    "linkedin.diag.results.level.medium": "בינוני",
    "linkedin.diag.results.level.high": "גבוה",
    "linkedin.diag.results.gapsTitle": "פערים עיקריים",
    "linkedin.diag.results.conflictsTitle": "סתירות בין המקורות",
    "linkedin.diag.results.conflictsDesc": "נמצא חוסר-התאמה בין קורות החיים לפרופיל — בדוק/י מה נכון בפועל",
    "linkedin.diag.results.recommendationsTitle": "המלצות",
    "linkedin.diag.results.bottomLineTitle": "שורה תחתונה",
```

- [ ] **Step 2: Add the English block**

Find (line 1507-1518, inside the `en` block):

```ts
    // LinkedIn optimizer
    "linkedin.title": "LinkedIn Optimizer",
    "linkedin.desc": "Rewrite your profile for maximum recruiter discoverability",
    "linkedin.run": "Optimize profile",
    "linkedin.running": "Generating...",
    "linkedin.headline": "Headline",
    "linkedin.about": "About",
    "linkedin.experience": "Experience",
    "linkedin.skills": "Skills to highlight",
    "linkedin.tips": "Tips",
    "linkedin.strength": "Profile strength",
    "linkedin.copyAll": "Copy all",
```

Add directly after it (before `// 30-60-90 Day Plan`):

```ts
    // LinkedIn diagnosis (replaces LinkedIn optimizer — old block above removed in a later task)
    "linkedin.diag.title": "LinkedIn Profile Diagnosis",
    "linkedin.diag.desc": "Data-grounded diagnosis of your real profile vs. recruiter search",
    "linkedin.diag.language": "Output language:",
    "linkedin.diag.targetRoles": "Target roles",
    "linkedin.diag.run": "Run Diagnosis",
    "linkedin.diag.running": "Diagnosing...",
    "linkedin.diag.validation.needResume": "Upload a resume first",
    "linkedin.diag.validation.needFields": "Fill in all fields (profile, SSI, and analytics) before running the diagnosis",
    "linkedin.diag.error.generic": "Diagnosis failed",
    "linkedin.diag.profile.headline": "Headline",
    "linkedin.diag.profile.openToWork": "Open to Work setting",
    "linkedin.diag.profile.openToWorkOff": "Off",
    "linkedin.diag.profile.openToWorkRecruiters": "Recruiters only",
    "linkedin.diag.profile.openToWorkAll": "Everyone",
    "linkedin.diag.profile.location": "Location",
    "linkedin.diag.profile.connections": "Connections count",
    "linkedin.diag.profile.about": "About",
    "linkedin.diag.profile.experience": "Experience",
    "linkedin.diag.profile.experienceAdd": "Add role",
    "linkedin.diag.profile.experienceCompany": "Company",
    "linkedin.diag.profile.experienceRole": "Role",
    "linkedin.diag.profile.experienceDesc": "Description",
    "linkedin.diag.profile.education": "Education",
    "linkedin.diag.profile.certifications": "Courses / Certifications",
    "linkedin.diag.profile.skills": "Skills",
    "linkedin.diag.profile.recommendations": "Recommendations",
    "linkedin.diag.profile.projects": "Projects",
    "linkedin.diag.analytics.ssiLink": "Find it at linkedin.com/sales/ssi (no paid subscription needed, log in with your regular account)",
    "linkedin.diag.analytics.ssiTotal": "Overall SSI",
    "linkedin.diag.analytics.ssiBrand": "Establish your professional brand",
    "linkedin.diag.analytics.ssiFindPeople": "Find the right people",
    "linkedin.diag.analytics.ssiEngage": "Engage with insights",
    "linkedin.diag.analytics.ssiRelationships": "Build relationships",
    "linkedin.diag.analytics.ssiIndustryAvg": "Industry average (optional)",
    "linkedin.diag.analytics.ssiNetworkAvg": "Network average (optional)",
    "linkedin.diag.analytics.searchAppearances": "Search appearances (7 days)",
    "linkedin.diag.analytics.profileViews": "Profile views (7 days)",
    "linkedin.diag.analytics.postImpressions": "Post impressions (7 days)",
    "linkedin.diag.usage.activityFrequency": "LinkedIn login frequency",
    "linkedin.diag.usage.freqDaily": "Daily",
    "linkedin.diag.usage.freqWeekly": "Weekly",
    "linkedin.diag.usage.freqRarely": "Rarely",
    "linkedin.diag.usage.freqNever": "Almost never",
    "linkedin.diag.usage.postsOrEngages": "Do you post or engage with content?",
    "linkedin.diag.usage.yes": "Yes",
    "linkedin.diag.usage.no": "No",
    "linkedin.diag.usage.unsure": "Not sure",
    "linkedin.diag.usage.receivedRecruiterMessages": "Have you ever received a recruiter message on LinkedIn?",
    "linkedin.diag.usage.sendsConnectionRequests": "Do you send connection requests proactively?",
    "linkedin.diag.usage.connOften": "Often",
    "linkedin.diag.usage.connSometimes": "Sometimes",
    "linkedin.diag.usage.connNever": "Almost never",
    "linkedin.diag.results.axisTitle": "Axis Assessment",
    "linkedin.diag.results.axis.searchAppearance": "Search appearance likelihood",
    "linkedin.diag.results.axis.initialScreening": "Initial screening pass likelihood",
    "linkedin.diag.results.axis.keywordMatch": "Keyword match",
    "linkedin.diag.results.axis.activitySignals": "Activity signals to the algorithm",
    "linkedin.diag.results.axis.visibilitySettings": "Visibility settings",
    "linkedin.diag.results.level.low": "Low",
    "linkedin.diag.results.level.medium": "Medium",
    "linkedin.diag.results.level.high": "High",
    "linkedin.diag.results.gapsTitle": "Key Gaps",
    "linkedin.diag.results.conflictsTitle": "Conflicts Between Sources",
    "linkedin.diag.results.conflictsDesc": "A mismatch was found between your resume and profile — check which one reflects reality",
    "linkedin.diag.results.recommendationsTitle": "Recommendations",
    "linkedin.diag.results.bottomLineTitle": "Bottom Line",
```

Note: every key uses a `linkedin.diag.*` prefix (not `linkedin.*`) specifically so it cannot collide with the still-present old `linkedin.*` keys before Task 9 removes them.

- [ ] **Step 3: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dictionary.ts
git commit -m "feat: add i18n keys for LinkedIn profile diagnosis"
```

---

### Task 5: `components/linkedin-diagnosis/profile-input.tsx`

**Files:**
- Create: `components/linkedin-diagnosis/profile-input.tsx`

**Interfaces:**
- Consumes: `LinkedInProfileInput` (Task 1), `useLang` (`@/components/lang-provider`), UI primitives (`Input`, `Textarea`, `Label`, `Badge`, `Button`, `Select*` from `@/components/ui/*`).
- Produces: `ProfileInput({ value, onChange }: { value: LinkedInProfileInput; onChange: (v: LinkedInProfileInput) => void })` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { LinkedInProfileInput } from "@/lib/ai/schemas";

export function ProfileInput({
  value,
  onChange,
}: {
  value: LinkedInProfileInput;
  onChange: (v: LinkedInProfileInput) => void;
}) {
  const { t } = useLang();
  const [skillInput, setSkillInput] = useState("");

  function set<K extends keyof LinkedInProfileInput>(key: K, v: LinkedInProfileInput[K]) {
    onChange({ ...value, [key]: v });
  }

  function addSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed || value.skills.includes(trimmed)) return;
    set("skills", [...value.skills, trimmed]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    set(
      "skills",
      value.skills.filter((s) => s !== skill),
    );
  }

  function addExperience() {
    set("experience", [...value.experience, { company: "", role: "", description: "" }]);
  }

  function updateExperience(i: number, field: "company" | "role" | "description", v: string) {
    const next = value.experience.slice();
    next[i] = { ...next[i], [field]: v };
    set("experience", next);
  }

  function removeExperience(i: number) {
    set(
      "experience",
      value.experience.filter((_, idx) => idx !== i),
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.headline")}</Label>
        <Input value={value.headline} onChange={(e) => set("headline", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.openToWork")}</Label>
        <Select
          value={value.openToWork}
          onValueChange={(v) => set("openToWork", v as LinkedInProfileInput["openToWork"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">{t("linkedin.diag.profile.openToWorkOff")}</SelectItem>
            <SelectItem value="recruiters">{t("linkedin.diag.profile.openToWorkRecruiters")}</SelectItem>
            <SelectItem value="all">{t("linkedin.diag.profile.openToWorkAll")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("linkedin.diag.profile.location")}</Label>
          <Input value={value.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("linkedin.diag.profile.connections")}</Label>
          <Input value={value.connectionsCount} onChange={(e) => set("connectionsCount", e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.about")}</Label>
        <Textarea rows={5} value={value.about} onChange={(e) => set("about", e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("linkedin.diag.profile.experience")}</Label>
          <Button type="button" size="sm" variant="outline" onClick={addExperience}>
            <Plus className="size-4" />
            {t("linkedin.diag.profile.experienceAdd")}
          </Button>
        </div>
        {value.experience.map((exp, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/40 p-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder={t("linkedin.diag.profile.experienceCompany")}
                value={exp.company}
                onChange={(e) => updateExperience(i, "company", e.target.value)}
              />
              <Input
                placeholder={t("linkedin.diag.profile.experienceRole")}
                value={exp.role}
                onChange={(e) => updateExperience(i, "role", e.target.value)}
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeExperience(i)}>
                <X className="size-4" />
              </Button>
            </div>
            <Textarea
              rows={3}
              placeholder={t("linkedin.diag.profile.experienceDesc")}
              value={exp.description}
              onChange={(e) => updateExperience(i, "description", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.education")}</Label>
        <Textarea rows={2} value={value.education} onChange={(e) => set("education", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.certifications")}</Label>
        <Textarea rows={2} value={value.certifications} onChange={(e) => set("certifications", e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>{t("linkedin.diag.profile.skills")}</Label>
        {value.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {value.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors text-xs"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <X className="size-3" />
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Button type="button" size="sm" variant="outline" onClick={addSkill}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.recommendations")}</Label>
        <Textarea
          rows={2}
          value={value.recommendations}
          onChange={(e) => set("recommendations", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.profile.projects")}</Label>
        <Textarea rows={2} value={value.projects} onChange={(e) => set("projects", e.target.value)} />
      </div>
    </div>
  );
}
```

Note on the skills tag-input: this adds one whole token per Enter/click, never re-splitting existing text on keystroke — deliberately avoiding the known bug in `app/settings/page.tsx`'s `FieldList` (re-parses on every keystroke, eating spaces/commas mid-word).

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds (new file, no consumers yet, unused-export is not a build error).

- [ ] **Step 3: Commit**

```bash
git add components/linkedin-diagnosis/profile-input.tsx
git commit -m "feat: add ProfileInput component for LinkedIn diagnosis"
```

---

### Task 6: `components/linkedin-diagnosis/analytics-input.tsx`

**Files:**
- Create: `components/linkedin-diagnosis/analytics-input.tsx`

**Interfaces:**
- Consumes: `LinkedInAnalyticsInput` (Task 1), `useLang`, `Input`/`Label`.
- Produces: `AnalyticsInput({ value, onChange }: { value: LinkedInAnalyticsInput; onChange: (v: LinkedInAnalyticsInput) => void })` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/components/lang-provider";
import type { LinkedInAnalyticsInput } from "@/lib/ai/schemas";

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

export function AnalyticsInput({
  value,
  onChange,
}: {
  value: LinkedInAnalyticsInput;
  onChange: (v: LinkedInAnalyticsInput) => void;
}) {
  const { t } = useLang();

  function set<K extends keyof LinkedInAnalyticsInput>(key: K, v: LinkedInAnalyticsInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("linkedin.diag.analytics.ssiLink")}</p>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={t("linkedin.diag.analytics.ssiTotal")}
          value={value.ssiTotal}
          onChange={(v) => set("ssiTotal", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiBrand")}
          value={value.ssiBrand}
          onChange={(v) => set("ssiBrand", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiFindPeople")}
          value={value.ssiFindPeople}
          onChange={(v) => set("ssiFindPeople", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiEngage")}
          value={value.ssiEngage}
          onChange={(v) => set("ssiEngage", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiRelationships")}
          value={value.ssiRelationships}
          onChange={(v) => set("ssiRelationships", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiIndustryAvg")}
          value={value.ssiIndustryAvg}
          onChange={(v) => set("ssiIndustryAvg", v)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.ssiNetworkAvg")}
          value={value.ssiNetworkAvg}
          onChange={(v) => set("ssiNetworkAvg", v)}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          label={t("linkedin.diag.analytics.searchAppearances")}
          value={value.searchAppearances7d}
          onChange={(v) => set("searchAppearances7d", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.profileViews")}
          value={value.profileViews7d}
          onChange={(v) => set("profileViews7d", v ?? 0)}
        />
        <NumberField
          label={t("linkedin.diag.analytics.postImpressions")}
          value={value.postImpressions7d}
          onChange={(v) => set("postImpressions7d", v ?? 0)}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/linkedin-diagnosis/analytics-input.tsx
git commit -m "feat: add AnalyticsInput component for LinkedIn diagnosis"
```

---

### Task 7: `components/linkedin-diagnosis/usage-pattern-input.tsx`

**Files:**
- Create: `components/linkedin-diagnosis/usage-pattern-input.tsx`

**Interfaces:**
- Consumes: `LinkedInUsagePatternInput` (Task 1), `useLang`, `Select*`/`Label`.
- Produces: `UsagePatternInput({ value, onChange }: { value: LinkedInUsagePatternInput; onChange: (v: LinkedInUsagePatternInput) => void })` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLang } from "@/components/lang-provider";
import type { LinkedInUsagePatternInput } from "@/lib/ai/schemas";

export function UsagePatternInput({
  value,
  onChange,
}: {
  value: LinkedInUsagePatternInput;
  onChange: (v: LinkedInUsagePatternInput) => void;
}) {
  const { t } = useLang();

  function set<K extends keyof LinkedInUsagePatternInput>(key: K, v: LinkedInUsagePatternInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.activityFrequency")}</Label>
        <Select
          value={value.activityFrequency}
          onValueChange={(v) =>
            set("activityFrequency", v as LinkedInUsagePatternInput["activityFrequency"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{t("linkedin.diag.usage.freqDaily")}</SelectItem>
            <SelectItem value="weekly">{t("linkedin.diag.usage.freqWeekly")}</SelectItem>
            <SelectItem value="rarely">{t("linkedin.diag.usage.freqRarely")}</SelectItem>
            <SelectItem value="never">{t("linkedin.diag.usage.freqNever")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.postsOrEngages")}</Label>
        <Select
          value={value.postsOrEngages ? "yes" : "no"}
          onValueChange={(v) => set("postsOrEngages", v === "yes")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t("linkedin.diag.usage.yes")}</SelectItem>
            <SelectItem value="no">{t("linkedin.diag.usage.no")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.receivedRecruiterMessages")}</Label>
        <Select
          value={value.receivedRecruiterMessages}
          onValueChange={(v) =>
            set("receivedRecruiterMessages", v as LinkedInUsagePatternInput["receivedRecruiterMessages"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">{t("linkedin.diag.usage.yes")}</SelectItem>
            <SelectItem value="no">{t("linkedin.diag.usage.no")}</SelectItem>
            <SelectItem value="unsure">{t("linkedin.diag.usage.unsure")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{t("linkedin.diag.usage.sendsConnectionRequests")}</Label>
        <Select
          value={value.sendsConnectionRequests}
          onValueChange={(v) =>
            set("sendsConnectionRequests", v as LinkedInUsagePatternInput["sendsConnectionRequests"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="often">{t("linkedin.diag.usage.connOften")}</SelectItem>
            <SelectItem value="sometimes">{t("linkedin.diag.usage.connSometimes")}</SelectItem>
            <SelectItem value="never">{t("linkedin.diag.usage.connNever")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/linkedin-diagnosis/usage-pattern-input.tsx
git commit -m "feat: add UsagePatternInput component for LinkedIn diagnosis"
```

---

### Task 8: `components/linkedin-diagnosis/diagnosis-results.tsx`

**Files:**
- Create: `components/linkedin-diagnosis/diagnosis-results.tsx`

**Interfaces:**
- Consumes: `LinkedInDiagnosisResult` (Task 1), `Key` type (`@/lib/i18n/dictionary`), `useLang`, `Badge`/`Button`.
- Produces: `DiagnosisResults({ result }: { result: LinkedInDiagnosisResult })` — consumed by Task 9.

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import type { LinkedInDiagnosisResult } from "@/lib/ai/schemas";

type Axis = LinkedInDiagnosisResult["axisAssessment"][number]["axis"];
type Level = LinkedInDiagnosisResult["axisAssessment"][number]["level"];

const AXIS_KEY: Record<Axis, Key> = {
  searchAppearance: "linkedin.diag.results.axis.searchAppearance",
  initialScreening: "linkedin.diag.results.axis.initialScreening",
  keywordMatch: "linkedin.diag.results.axis.keywordMatch",
  activitySignals: "linkedin.diag.results.axis.activitySignals",
  visibilitySettings: "linkedin.diag.results.axis.visibilitySettings",
};

const LEVEL_KEY: Record<Level, Key> = {
  low: "linkedin.diag.results.level.low",
  medium: "linkedin.diag.results.level.medium",
  high: "linkedin.diag.results.level.high",
};

const LEVEL_COLOR: Record<Level, string> = {
  low: "border-red-500/30 text-red-400",
  medium: "border-amber-500/30 text-amber-400",
  high: "border-green-500/30 text-green-400",
};

export function DiagnosisResults({ result }: { result: LinkedInDiagnosisResult }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  function copy(i: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopied((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [i]: false })), 2000);
    toast.success(t("common.copied"));
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40">
          <span className="text-sm font-medium">{t("linkedin.diag.results.axisTitle")}</span>
        </div>
        <div className="divide-y divide-border/30">
          {result.axisAssessment.map((a) => (
            <div key={a.axis} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t(AXIS_KEY[a.axis])}</span>
                <Badge variant="outline" className={`text-xs ${LEVEL_COLOR[a.level]}`}>
                  {t(LEVEL_KEY[a.level])}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{a.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {result.gaps.length > 0 && (
        <div className="glass rounded-xl p-4 border border-border/40">
          <div className="text-sm font-medium mb-2">{t("linkedin.diag.results.gapsTitle")}</div>
          <ul className="space-y-1.5">
            {result.gaps.map((gap, i) => (
              <li key={i} className="text-xs text-foreground/80 flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.conflicts.length > 0 && (
        <div className="glass rounded-xl p-4 border border-amber-500/30">
          <div className="text-sm font-medium mb-1">{t("linkedin.diag.results.conflictsTitle")}</div>
          <p className="text-xs text-muted-foreground mb-2">{t("linkedin.diag.results.conflictsDesc")}</p>
          <ul className="space-y-2">
            {result.conflicts.map((c, i) => (
              <li key={i} className="text-xs text-foreground/80">
                <span className="font-medium">{c.field}:</span> CV — {c.resumeSays} / Profile — {c.profileSays}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div className="glass rounded-xl border border-border/40 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40">
            <span className="text-sm font-medium">{t("linkedin.diag.results.recommendationsTitle")}</span>
          </div>
          <div className="divide-y divide-border/30">
            {result.recommendations
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map((rec, i) => (
                <div key={i} className="px-4 py-3 space-y-1.5">
                  <div className="text-sm font-medium">{rec.title}</div>
                  <p className="text-xs text-muted-foreground">{rec.why}</p>
                  {rec.readyToPasteText && (
                    <div className="bg-muted/20 rounded-lg p-3 flex items-start justify-between gap-2">
                      <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans flex-1">
                        {rec.readyToPasteText}
                      </pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs shrink-0"
                        onClick={() => copy(i, rec.readyToPasteText!)}
                      >
                        <Copy className="size-3" />
                        {copied[i] ? t("common.copied") : t("common.copy")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4 border border-border/40">
        <div className="text-sm font-medium mb-1">{t("linkedin.diag.results.bottomLineTitle")}</div>
        <p className="text-xs text-foreground/80">{result.bottomLine}</p>
      </div>
    </div>
  );
}
```

`AXIS_KEY`/`LEVEL_KEY` are typed `Record<_, Key>` (not `Record<_, string>`) specifically so TypeScript checks every literal against the real dictionary — `t()`'s parameter type is the literal union `Key = keyof typeof dictionary["he"]`, so a plain `string` (e.g. from template-string interpolation) would fail to compile here; a typo in one of these two lookup tables fails the build instead of silently rendering a raw key at runtime.

- [ ] **Step 2: Verify with a build**

Run: `npm run build`
Expected: succeeds. If you get a type error on `AXIS_KEY`/`LEVEL_KEY` entries, it means a key string doesn't exactly match what Task 4 added to `lib/i18n/dictionary.ts` — fix the typo, don't loosen the type to `string`.

- [ ] **Step 3: Commit**

```bash
git add components/linkedin-diagnosis/diagnosis-results.tsx
git commit -m "feat: add DiagnosisResults component for LinkedIn diagnosis"
```

---

### Task 9: Container, wiring, and old-feature removal (atomic)

**Files:**
- Create: `components/linkedin-diagnosis/index.tsx`
- Modify: `app/cv/page.tsx` (line 25 import, line 272 usage)
- Modify: `lib/i18n/dictionary.ts` (remove old `linkedin.*` block in both `he` and `en`)
- Delete: `components/linkedin-optimizer.tsx`, `app/api/linkedin-optimize/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 1-8.
- Produces: `LinkedInDiagnosis` — the default export used by `/cv`.

- [ ] **Step 1: Create the container**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Link2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type {
  LinkedInProfileInput,
  LinkedInAnalyticsInput,
  LinkedInUsagePatternInput,
  LinkedInDiagnosisResult,
} from "@/lib/ai/schemas";
import { ProfileInput } from "./profile-input";
import { AnalyticsInput } from "./analytics-input";
import { UsagePatternInput } from "./usage-pattern-input";
import { DiagnosisResults } from "./diagnosis-results";

const EMPTY_PROFILE: LinkedInProfileInput = {
  headline: "",
  openToWork: "off",
  location: "",
  connectionsCount: "",
  about: "",
  experience: [],
  education: "",
  certifications: "",
  skills: [],
  recommendations: "",
  projects: "",
};

const EMPTY_ANALYTICS: LinkedInAnalyticsInput = {
  ssiTotal: 0,
  ssiBrand: 0,
  ssiFindPeople: 0,
  ssiEngage: 0,
  ssiRelationships: 0,
  ssiIndustryAvg: null,
  ssiNetworkAvg: null,
  searchAppearances7d: 0,
  profileViews7d: 0,
  postImpressions7d: 0,
};

const EMPTY_USAGE: LinkedInUsagePatternInput = {
  activityFrequency: "weekly",
  postsOrEngages: false,
  receivedRecruiterMessages: "unsure",
  sendsConnectionRequests: "sometimes",
};

function isProfileComplete(p: LinkedInProfileInput): boolean {
  return Boolean(
    p.headline.trim() &&
      p.about.trim() &&
      p.location.trim() &&
      p.experience.length > 0 &&
      p.experience.every((e) => e.company.trim() && e.role.trim() && e.description.trim()) &&
      p.skills.length > 0,
  );
}

function isAnalyticsComplete(a: LinkedInAnalyticsInput): boolean {
  return a.ssiTotal > 0 && a.ssiBrand > 0 && a.ssiFindPeople > 0 && a.ssiEngage > 0 && a.ssiRelationships > 0;
}

export function LinkedInDiagnosis() {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<"he" | "en">("he");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [profile, setProfile] = useState<LinkedInProfileInput>(EMPTY_PROFILE);
  const [analytics, setAnalytics] = useState<LinkedInAnalyticsInput>(EMPTY_ANALYTICS);
  const [usagePattern, setUsagePattern] = useState<LinkedInUsagePatternInput>(EMPTY_USAGE);
  const [result, setResult] = useState<LinkedInDiagnosisResult | null>(null);

  useEffect(() => {
    const prefs = store.getPrefs();
    if (prefs?.targetRoles?.length) setTargetRoles(prefs.targetRoles);

    const saved = store.getLinkedInDiagnosis();
    if (saved) {
      setProfile(saved.profile);
      setAnalytics(saved.analytics);
      setUsagePattern(saved.usagePattern);
      if (saved.result) setResult(saved.result);
    }
  }, []);

  function addRole() {
    const trimmed = roleInput.trim();
    if (!trimmed || targetRoles.includes(trimmed)) return;
    setTargetRoles((prev) => [...prev, trimmed]);
    setRoleInput("");
  }

  function removeRole(role: string) {
    setTargetRoles((prev) => prev.filter((r) => r !== role));
  }

  const canRun = isProfileComplete(profile) && isAnalyticsComplete(analytics);

  async function runDiagnosis() {
    const resume = store.getResume();
    if (!resume?.parsed) {
      toast.error(t("linkedin.diag.validation.needResume"));
      return;
    }
    if (!canRun) {
      toast.error(t("linkedin.diag.validation.needFields"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resume.parsed,
          targetRoles,
          language: outputLanguage,
          profile,
          analytics,
          usagePattern,
        }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error(t("error.rateLimit"));
        else toast.error(t("linkedin.diag.error.generic"));
        return;
      }
      const data = await res.json();
      setResult(data.result);
      store.setLinkedInDiagnosis({
        profile,
        analytics,
        usagePattern,
        result: data.result,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      toast.error(t("linkedin.diag.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="glass border-border/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4 text-blue-400" />
            {t("linkedin.diag.title")}
          </CardTitle>
          <CardDescription>{t("linkedin.diag.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("linkedin.diag.language")}</span>
            <button
              onClick={() => setOutputLanguage("he")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                outputLanguage === "he"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setOutputLanguage("en")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                outputLanguage === "en"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              English
            </button>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">{t("linkedin.diag.targetRoles")}</span>
            {targetRoles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {targetRoles.map((role) => (
                  <Badge
                    key={role}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors text-xs"
                    onClick={() => removeRole(role)}
                  >
                    {role}
                    <X className="size-3" />
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="e.g. Senior SAP SD Consultant"
                className="max-w-xs bg-background/50 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRole();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addRole}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Separator />
          <ProfileInput value={profile} onChange={setProfile} />
          <Separator />
          <AnalyticsInput value={analytics} onChange={setAnalytics} />
          <Separator />
          <UsagePatternInput value={usagePattern} onChange={setUsagePattern} />

          <Button
            onClick={runDiagnosis}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 me-2 animate-spin" />
                {t("linkedin.diag.running")}
              </>
            ) : (
              <>
                <Sparkles className="size-4 me-2" />
                {t("linkedin.diag.run")}
              </>
            )}
          </Button>
          {!canRun && !loading && (
            <p className="text-xs text-muted-foreground text-center">
              {t("linkedin.diag.validation.needFields")}
            </p>
          )}
        </CardContent>
      </Card>

      {result && <DiagnosisResults result={result} />}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `/cv`**

In `app/cv/page.tsx`, find line 25:

```ts
import { LinkedInOptimizer } from "@/components/linkedin-optimizer";
```

Replace with:

```ts
import { LinkedInDiagnosis } from "@/components/linkedin-diagnosis";
```

Find line 272:

```tsx
      <LinkedInOptimizer />
```

Replace with:

```tsx
      <LinkedInDiagnosis />
```

- [ ] **Step 3: Delete the old feature files**

```bash
rm components/linkedin-optimizer.tsx
rm app/api/linkedin-optimize/route.ts
```

- [ ] **Step 4: Remove the old i18n keys**

In `lib/i18n/dictionary.ts`, in the `he` block, find and delete these 12 lines (the old block Task 4 left untouched — the `linkedin.diag.*` block added by Task 4 stays):

```ts
    // LinkedIn optimizer
    "linkedin.title": "אופטימייזר LinkedIn",
    "linkedin.desc": "כתיבה מחדש של הפרופיל למקסימום חשיפה לרקרוטרים",
    "linkedin.run": "אופטימייז פרופיל",
    "linkedin.running": "מייצר...",
    "linkedin.headline": "כותרת",
    "linkedin.about": "אודות",
    "linkedin.experience": "ניסיון",
    "linkedin.skills": "כישורים לבליטה",
    "linkedin.tips": "טיפים",
    "linkedin.strength": "חוזק הפרופיל",
    "linkedin.copyAll": "העתק הכל",
```

In the `en` block, find and delete the equivalent 12 lines:

```ts
    // LinkedIn optimizer
    "linkedin.title": "LinkedIn Optimizer",
    "linkedin.desc": "Rewrite your profile for maximum recruiter discoverability",
    "linkedin.run": "Optimize profile",
    "linkedin.running": "Generating...",
    "linkedin.headline": "Headline",
    "linkedin.about": "About",
    "linkedin.experience": "Experience",
    "linkedin.skills": "Skills to highlight",
    "linkedin.tips": "Tips",
    "linkedin.strength": "Profile strength",
    "linkedin.copyAll": "Copy all",
```

Also update the now-inaccurate comment left behind on the `linkedin.diag.*` blocks (both languages) — find:

```ts
    // LinkedIn diagnosis (replaces LinkedIn optimizer — old block above removed in a later task)
```

Replace with (both occurrences):

```ts
    // LinkedIn diagnosis
```

- [ ] **Step 5: Verify with a build**

Run: `npm run build`
Expected: succeeds with no type errors, no unresolved imports.

- [ ] **Step 6: Verify nothing else references the deleted files**

Run: `grep -rn "linkedin-optimizer\|linkedin-optimize\|LinkedInOptimizer" --include="*.ts" --include="*.tsx" .`
Expected: no output (confirms the deletion was safe — this was already checked during planning, re-checking here catches any drift).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire LinkedIn Profile Diagnosis into /cv, remove old LinkedIn Optimizer"
```

---

### Task 10: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Load a resume**

Open `/cv`, upload or paste a real resume (or reuse one already parsed from a prior session) so `store.getResume()` returns a value.

- [ ] **Step 3: Fill the diagnosis form completely**

Scroll to the LinkedIn Profile Diagnosis card. Fill: at least one target role, profile headline/location/about, at least one experience entry (company + role + description), at least one skill, all 5 SSI numbers (total + 4 sub-scores — button stays disabled until these are non-zero), the 3 analytics numbers, all 4 usage-pattern selects.

- [ ] **Step 4: Deliberately introduce a conflict**

Make the profile's experience description state a different current employer or role than the resume's most recent entry (e.g. resume says "current: true" at Company A, profile experience says still at Company B). This exercises the `conflicts` output path.

- [ ] **Step 5: Run the diagnosis and inspect the output**

Click "Run Diagnosis" / "הרץ אבחון". Confirm:
- No numeric score or percentage appears anywhere in the results (no progress bar, no "X%" badge — only "Low"/"Medium"/"High" text badges under Axis Assessment).
- The Conflicts section appears and correctly names the mismatched field.
- No recommendation or `readyToPasteText` mentions a skill that wasn't entered in the resume or profile skills list.
- Copy buttons on `readyToPasteText` blocks copy the exact text (paste into a scratch text field to confirm).

- [ ] **Step 6: Reload the page**

Refresh `/cv`. Confirm the profile/analytics/usage-pattern form fields and the last result are pre-filled from localStorage (via `store.getLinkedInDiagnosis()`), not reset to empty.

- [ ] **Step 7: Report results**

If any check in Steps 5-6 fails, that's a bug to fix before considering this plan complete — do not mark this task done on a partial pass.
