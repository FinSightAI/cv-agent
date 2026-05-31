# Jobos — The Job Search OS

> An AI-powered job search operating system built with Next.js 16, Gemini 2.5, and TypeScript.

🌐 **Live demo:** https://cv-agent-opal.vercel.app

---

## What it does

Jobos manages the entire job search pipeline — from discovering jobs to negotiating offers — with AI at every step.

### Core features

| Feature | Description |
|---------|-------------|
| **CV Parser & Editor** | Upload PDF/DOCX → structured resume with inline editing and completeness score |
| **Job Fit Analysis** | 0–100 match score, gap analysis, blocker detection against any job description |
| **CV Tailoring** | Rewrites and reorders your resume for a specific job — without fabricating experience |
| **Cover Letter** | Streams a tailored letter in real-time; tone and language selector |
| **Interview Prep** | Generates 8–15 categorized questions with STAR-format answers and difficulty ratings |
| **Interview Simulator** | AI plays a real interviewer, adapts to your answers, gives a scored performance report |
| **Company Research** | Extracts company stage, culture signals, pain points and smart questions from the JD alone |
| **Salary Negotiation Coach** | Counter-offer range, negotiation script, leverage points when you get an offer |
| **Turbo Apply** | One button: tailor CV → generate letter → download ZIP → open apply page |
| **Application Analytics** | Funnel metrics, response rate, match score vs outcome, debrief aggregation |
| **Career Coach** | Holistic AI analysis of your entire pipeline with prioritized recommendations |
| **Post-Interview Debrief** | 5-dimension rating after each interview; pattern detection across all interviews |

### Infrastructure

| Feature | Description |
|---------|-------------|
| **Job Discovery** | LinkedIn, Greenhouse, Lever, Workday, AllJobs, Drushim — unified smart search |
| **Daily Email Digest** | Vercel Cron + Resend — morning email with new matching jobs |
| **Gmail Integration** | Scans inbox, classifies emails (interview invite / rejection / offer) |
| **AI Agent Chat** | Gemini-powered copilot with full context of your resume, jobs, and preferences |
| **Command Palette** | ⌘K global search across all pages and saved jobs |
| **Mobile-first** | Bottom nav, sticky header, PWA installable |
| **Dark/Light mode** | next-themes, persisted |
| **Auth (optional)** | Clerk — no-op without env vars |
| **DB sync (optional)** | Drizzle + Neon Postgres — localStorage by default |

---

## Stack

```
Next.js 16 (App Router, Turbopack)   AI SDK v6 + Gemini 2.5 Flash/Pro
TypeScript                            Tailwind CSS v4
shadcn/ui (Base UI)                   Drizzle ORM + Neon Postgres
@clerk/nextjs                         Resend
jszip                                 next-themes
```

All AI runs on Google AI Studio free tier (~250 req/day). No paid gateway needed.

---

## Architecture

- **localStorage-first** — works fully offline, no account required. DB sync is opt-in.
- **No auto-submit** — co-pilot only. Auto-submission violates most job portal ToS.
- **Streaming** — cover letter and interview simulator stream in real-time.
- **Rate limiting** — sliding window per IP, protects Gemini free tier quota.
- **Prompt injection guard** — user data wrapped in XML `<user_data>` blocks (spotlighting).
- **Optional auth** — ClerkProvider is a no-op without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

---

## Getting started

```bash
git clone https://github.com/FinSightAI/cv-agent
cd cv-agent
npm install
cp .env.example .env.local
# Add GOOGLE_GENERATIVE_AI_API_KEY (free: aistudio.google.com)
npm run dev
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ | Google AI Studio (free) |
| `DATABASE_URL` | Optional | Neon Postgres — cloud sync |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional | User auth |
| `CLERK_SECRET_KEY` | Optional | Clerk secret |
| `RESEND_API_KEY` | Optional | Daily email digest |
| `CRON_SECRET` | Optional | Protects cron endpoint |
| `GOOGLE_OAUTH_CLIENT_ID` | Optional | Gmail integration |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Optional | Gmail OAuth |
| `SESSION_SECRET` | Optional | Gmail session |

---

## Project structure

```
app/
  api/
    cv/                 # parse, tailor, suggestions
    interview/          # simulate, evaluate, questions
    salary/negotiate    # offer negotiation
    company-research/   # pre-interview intel
    career-coach/       # holistic pipeline analysis
    followup/           # follow-up email generator
    referral/           # LinkedIn referral message
    connectors/         # job discovery (smart-search, discover)
    cron/               # daily email digest
  agent/coach           # Career Coach page
  applications/         # Kanban pipeline
  jobs/[id]/simulate    # Interview Simulator
  stats/                # Application analytics
components/
  readiness-score.tsx   # 0-100 job readiness
  turbo-apply.tsx       # one-click apply prep
  company-research.tsx  # pre-interview brief
  salary-negotiation.tsx
  interview-debrief.tsx
  command-palette.tsx   # ⌘K
  mobile-nav.tsx
lib/
  ai/                   # prompts, schemas, gateway, injection guard
  connectors/           # LinkedIn, Greenhouse, Lever, Workday, AllJobs, Drushim
  db/                   # Drizzle schema + queries
  i18n/                 # Hebrew/English (400+ keys)
  storage.ts            # localStorage store
```

---

## Hebrew-first

Defaults to Hebrew RTL. Language toggle switches to English. AI outputs match the resume language automatically.

---

## License

MIT
