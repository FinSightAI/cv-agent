# Feature brainstorm — 2026-07-01

Ideation session on what would make Jobos genuinely unique (not just "another AI cover letter tool"). Not yet designed/scoped — captured here so the ideas aren't lost.

## Direction, per user: combination of differentiation + speeding up the user's own job search, staying open to any infra (extension, voice, cron, etc).

## Candidate directions (ranked by build effort, not preference)

### 1. Personal learning loop — "what actually worked for you"
AI that mines the user's own pipeline history (CV versions, cover letters, match scores, outcomes) for personal correlations — e.g. "applying within 24h of posting → 2.8x response rate", "letters mentioning 'ownership' scored 15% higher match". Unique because it needs the full pipeline in one place, which Jobos already has (readiness score, debriefs, rejection analyzer, stats).
- Pros: most unique, no new OAuth/infra, high "wow" for a demo.
- Cons: needs a decent volume of applications to be statistically meaningful; prompting must avoid inventing false correlations.

### 2. Voice Interview Simulator
Upgrade the existing text-based Interview Simulator (`/jobs/[id]/simulate`) to a real-time spoken conversation (e.g. Gemini Live) with feedback on tone, pace, filler words.
- Pros: highest visual "wow", builds directly on an existing feature, fits the free-tier Gemini stack.
- Cons: needs client-side audio streaming (WebRTC/WebSocket) infra; latency/reliability need testing.

### 3. Browser extension — "Apply Co-pilot"
Chrome extension overlaying LinkedIn/Greenhouse/Workday job postings: live match score while browsing, auto-fills application forms, logs the application into Jobos automatically.
- Pros: closes the browse↔track gap, real daily-use value beyond a demo.
- Cons: separate Manifest V3 project + Chrome Web Store review, per-site form auto-fill is ongoing maintenance, the biggest of the four.

### 4. Job Radar — proactive company/people tracking
Agent that watches saved companies/people (funding news, leadership changes) and proactively flags "good time to prepare/apply."
- Pros: "agent working for you in the background" feel.
- Cons: depends on external data sources not currently integrated (funding news, LinkedIn signals) — scraping/API access is non-trivial; least certain in accuracy/noise.

## Status
No direction chosen yet. Visual mockups for all 4 were shown via the brainstorming visual companion (not persisted — ephemeral `.superpowers/brainstorm/` session, gitignored). Next step when resumed: pick one direction and run it through the full brainstorming → design doc → plan flow.
