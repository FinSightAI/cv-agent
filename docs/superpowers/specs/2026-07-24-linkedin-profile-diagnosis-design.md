# LinkedIn Profile Diagnosis (replaces LinkedIn Optimizer)

## Problem

The current LinkedIn Optimizer (`components/linkedin-optimizer.tsx` + `app/api/linkedin-optimize/route.ts`) generates headline/About/experience rewrites from the resume alone, in a single AI call. It never looks at the user's actual live LinkedIn profile, so it can't diagnose gaps between what's already there and what's missing — every run is "start from scratch," not "fix what's wrong." It also fabricates a precise `estimatedProfileStrength: number(0-100)` with no real data behind it, displayed to the user as if it were measured. A separate `linkedin-recruiter-visibility` skill (installed via the Desktop app, now symlinked into `~/.claude/skills/`) does this properly — real profile content + real LinkedIn analytics (SSI, Search Appearances, Profile Views, Post Impressions) + usage-pattern questions, qualitative low/medium/high axis assessment instead of invented scores, explicit conflict handling between sources. This spec ports that diagnostic approach into Jobos as an in-app feature (not a Word document — the skill's deliverable format — since this lives inside the app's existing UI).

## Scope decisions (from brainstorming)

- **Depth over frequency.** Frequent profile edits are visibly discouraged by LinkedIn itself (broadcasts "profile updated" to the network) and are bad practice regardless. So this is a considered, occasional diagnostic tool, not a dashboard meant for daily re-runs — no historical trend tracking, no SSI-over-time charts.
- **Real analytics are mandatory input**, not optional — user must provide current SSI (total + 4 sub-scores) and the three 7-day metrics before running. No partial-data fallback path.
- **Single long form**, matching the existing app pattern (setup card → results), not a multi-step wizard.
- **Profile input is persisted** in localStorage like the resume, so returning users don't re-paste on every run.
- Not in scope for this pass: Word/.docx export of the diagnosis (the app already renders results in-page with copy buttons, which covers the same "get ready-to-use text" need the skill's Word output serves in a chat context); continuous/automatic LinkedIn data fetching (no LinkedIn API access — manual entry only, same constraint the skill operates under).

## Approach

Full replacement of the feature (route + component), not an additive v2 — the old single-shot generator provides no value the new version doesn't superset. Old files deleted outright, no compatibility shim (nothing else in the codebase references them — confirmed via grep for `linkedin-optimize` and `LinkedInOptimizer`).

Split into small single-purpose components rather than growing the existing 442-line file further (it would roughly double in field count), matching how other multi-part Jobos features are organized (e.g. `lib/cv-export-docx.ts` as its own module).

## Data model

### Storage (`lib/storage.ts`)

New key `cv-agent:linkedinDiagnosis:v1`, following the exact `{parsed-ish fields, updatedAt}` shape used by `StoredResume`:

```ts
export type StoredLinkedInDiagnosis = {
  profile: LinkedInProfileInput;
  analytics: LinkedInAnalyticsInput;
  usagePattern: LinkedInUsagePatternInput;
  result?: LinkedInDiagnosisResult;   // last successful run, if any
  updatedAt: string;
};
```
`getLinkedInDiagnosis(): StoredLinkedInDiagnosis | null` / `setLinkedInDiagnosis(d: StoredLinkedInDiagnosis)`, same pattern as `getResume`/`setResume`.

### API input (`POST /api/linkedin-diagnose`)

```ts
{
  resume: ParsedResume,        // from store.getResume().parsed — required, existing type
  targetRoles: string[],       // existing behavior, unchanged
  language: "he" | "en",       // existing behavior, unchanged
  profile: {
    headline: string;
    openToWork: { enabled: boolean; visibility: "all" | "recruiters" | "off" };
    location: string;
    connectionsCount: string;        // free text, e.g. "500+"
    about: string;
    experience: { company: string; role: string; description: string }[];
    education: string;
    certifications: string;
    skills: string[];
    recommendations: string;         // optional content, empty string if none
    projects: string;                // optional content, empty string if none
  },
  analytics: {
    ssiTotal: number;                // 0-100
    ssiBrand: number;
    ssiFindPeople: number;
    ssiEngage: number;
    ssiRelationships: number;
    ssiIndustryAvg: number | null;   // real value from LinkedIn's own SSI page if user provides it
    ssiNetworkAvg: number | null;
    searchAppearances7d: number;
    profileViews7d: number;
    postImpressions7d: number;
  },
  usagePattern: {
    activityFrequency: "daily" | "weekly" | "rarely" | "never";
    postsOrEngages: boolean;
    receivedRecruiterMessages: "yes" | "no" | "unsure";
    sendsConnectionRequests: "often" | "sometimes" | "never";
  },
}
```

All fields required (client-side validation blocks submission if any are empty — see Error handling). `profile`, `analytics`, and `usagePattern` types are exported from the route file (or a shared `lib/ai/schemas.ts` addition) and reused by the input components' props.

### API output (`generateObject` result)

```ts
const resultSchema = z.object({
  axisAssessment: z.array(z.object({
    axis: z.enum([
      "searchAppearance",    // סיכוי להופיע בחיפוש מגייסות
      "initialScreening",    // סיכוי לעבור סינון ראשוני
      "keywordMatch",        // התאמת מילות מפתח לתפקידי היעד
      "activitySignals",     // אותות פעילות לאלגוריתם
      "visibilitySettings",  // הגדרות נראות
    ]),
    level: z.enum(["low", "medium", "high"]),
    explanation: z.string(),
  })),
  gaps: z.array(z.string()),
  recommendations: z.array(z.object({
    priority: z.number(),
    title: z.string(),
    why: z.string(),
    readyToPasteText: z.string().optional(),
  })),
  conflicts: z.array(z.object({
    field: z.string(),
    resumeSays: z.string(),
    profileSays: z.string(),
  })),
  bottomLine: z.string(),
});
```

Removed entirely: `estimatedProfileStrength` (fabricated score), `keywordsToAdd` (was generated but never rendered — dead field, folded into `gaps`).

### System prompt changes (`app/api/linkedin-diagnose/route.ts`)

Rewritten from the current "rewrite from resume" framing to a diagnostic framing:
- Compare `profile` (what's live today) against `resume` (source of truth for real experience/skills) and `targetRoles` (what recruiters search for).
- **Never recommend adding a skill/keyword the resume doesn't support.** If a valuable keyword is missing from both resume and profile, it goes into `gaps` phrased as a question back to the user, not into `recommendations` as an instruction.
- **Never invent a numeric score.** Axis levels are qualitative (`low`/`medium`/`high`) with a textual explanation; the only numbers in the output are echoes of real input data the user already provided (e.g. referencing their actual SSI in an explanation string is fine — inventing a new one is not).
- When `resume` and `profile` disagree on a fact (dates, seniority, current-vs-past role), surface it in `conflicts` — do not silently prefer one source or infer which is correct.
- Low ratings for early-career profiles should be framed as a natural starting point in `explanation`, not a deficiency (mirrors the skill's guidance).

## Components

```
components/linkedin-diagnosis/
  index.tsx               — container: owns profile/analytics/usagePattern state, loads/saves via store.getLinkedInDiagnosis/setLinkedInDiagnosis, calls the API, holds loading/result state
  profile-input.tsx       — controlled form for the `profile` fields (props: value, onChange)
  analytics-input.tsx     — controlled form for `analytics` fields, with inline link + instructions to https://www.linkedin.com/sales/ssi (props: value, onChange)
  usage-pattern-input.tsx — controlled form for `usagePattern` (4 selects) (props: value, onChange)
  diagnosis-results.tsx   — stateless, renders axisAssessment table, gaps, recommendations (with copy buttons, reusing the existing copyText pattern), conflicts, bottomLine (props: result)
```

`app/cv/page.tsx`: swap `import { LinkedInOptimizer }` → `import { LinkedInDiagnosis } from "@/components/linkedin-diagnosis"`, one-line usage swap.

## i18n

New keys under the existing `linkedin.*` namespace in `lib/i18n/dictionary.ts` (he + en), covering: section headers for the 3 new input forms, field labels for all `profile`/`analytics`/`usagePattern` fields, the SSI link explanation text, axis names/labels, and results section labels (gaps/recommendations/conflicts/bottom line). Existing keys reused where semantics match (`linkedin.title`, `linkedin.headline`, `linkedin.about`, `linkedin.run`, `linkedin.running`, `common.copy`, `common.copied`, `error.rateLimit`). Removed: `linkedin.strength` (was tied to the deleted score).

## Error handling

Same base pattern as the current route: `checkRateLimit` / `HEAVY_AI_LIMIT`, 429 → `t("error.rateLimit")` toast, other failures → generic error toast. New: client-side validation in `index.tsx` disables the "Run Diagnosis" button (rather than submitting and failing server-side) until `resume` exists, all `profile` text fields are non-empty, all `analytics` numeric fields are filled, and all `usagePattern` selects have a value — with inline field-level hints, not just a disabled button with no explanation.

## Testing / verification

No unit test suite exists for AI-route features elsewhere in this codebase (`app/api/*` routes are verified live, per repo convention). Verify per the `verify` skill: run the dev server, fill the full form with real data (including a deliberately mismatched resume/profile fact to confirm `conflicts` populates), run a diagnosis, and visually confirm — no numeric score/percentage anywhere in the output, no recommended skill absent from the resume, axis levels render as text badges not progress bars, copy buttons work on `readyToPasteText` entries.
