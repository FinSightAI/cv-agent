# CV Agent

🌐 **Live:** https://cv-agent-opal.vercel.app

סוכן AI לניהול ושליחת קורות חיים. מנתח התאמה למשרה, כותב מכתבי כיסוי מותאמים, ומנהל את כל הצנרת במקום אחד.

## Stack

- **Next.js 16** App Router + TypeScript + Tailwind v4
- **shadcn/ui** (RTL)
- **Vercel AI SDK v6** + Google Gemini (free tier)
- **Drizzle ORM** + Neon Postgres (אופציונלי — MVP פועל גם עם localStorage)
- **Vercel Blob** לאחסון קבצי CV (אופציונלי)

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env file
cp .env.example .env.local
# מלא GOOGLE_GENERATIVE_AI_API_KEY

# 3. Run dev server
npm run dev
# פתח http://localhost:3000
```

### קבלת מפתח Gemini בחינם

1. היכנס ל-https://aistudio.google.com/app/apikey
2. לחץ "Create API key" (דורש חשבון Google)
3. העתק והדבק ב-`.env.local`

מגבלות חינם (Gemini 2.5 Flash): ~10 בקשות בדקה, 250 ביום. מספיק בנדיבות לשימוש אישי.

### חיבור Gmail (אופציונלי - מאפשר /inbox)

1. היכנס ל-https://console.cloud.google.com → צור פרויקט (או בחר קיים)
2. **APIs & Services → Library** → חפש "Gmail API" → **Enable**
3. **APIs & Services → OAuth consent screen** → User Type: **External** → מלא שם אפליקציה ומייל
   - Scopes: הוסף `gmail.readonly` ו-`userinfo.email`
   - Test users: הוסף את המייל שלך
4. **APIs & Services → Credentials** → Create credentials → **OAuth client ID** → Web application
   - Authorized redirect URI: `https://cv-agent-opal.vercel.app/api/auth/google/callback`
   - בלוקאלי: `http://localhost:3000/api/auth/google/callback`
5. העתק Client ID ו-Client secret
6. ב-Vercel → Project Settings → Environment Variables, הוסף:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `SESSION_SECRET` (32+ תווים אקראיים, למשל `openssl rand -hex 32`)
7. Deploy מחדש (ה-`vercel git connect` שלנו יעשה זאת אוטומטית בקומיט הבא)

### חיבור ל-Postgres (Neon)

```bash
# מ-Vercel Dashboard → Storage → Create → Neon Postgres
vercel env pull .env.local
npm run db:push    # יצירת טבלאות
npm run db:studio  # לעריכת DB
```

ללא DB, המידע נשמר ב-localStorage של הדפדפן. מספיק ל-MVP על מכשיר אחד.

## פיצ'רים

### MVP (פועל)
- ✅ העלאת קורות חיים (PDF/DOCX/טקסט) ופענוח ל-JSON מובנה
- ✅ הוספת משרה (URL או טקסט) ופענוח דרישות
- ✅ ניתוח התאמה: ציון, פערים, חוזקות, המלצה (apply / tailor / skip)
- ✅ מכתב מקדים מותאם, streaming, רגנרציה לפי feedback
- ✅ צנרת הגשות (Kanban view)
- ✅ העדפות חיפוש (תפקידים, מיקום, שכר, סטאק, dealbreakers)
- ✅ תמיכה מלאה ב-RTL ועברית

### בדרך
- 🔜 שמירת מצב ב-Postgres (להחליף את localStorage)
- 🔜 Connectors: LinkedIn (co-pilot), Greenhouse/Lever/Ashby
- 🔜 Browser automation ל-Workday עם Vercel Sandbox
- 🔜 Chat agent עם tool calling
- 🔜 Cron — אוטו-סקירה של משרות חדשות לפי העדפות

## ארכיטקטורה

```
app/
  page.tsx                  דשבורד
  cv/                       העלאה ועריכת CV
  jobs/                     רשימה / יצירה / פרטים
  applications/             Kanban מעקב
  settings/                 העדפות
  connectors/               אתרי משרות
  agent/                    Chat agent
  api/
    cv/parse                /api/cv/parse  - מעלה ומפענח CV
    jobs/parse              /api/jobs/parse - שולף ומפענח משרה
    match                   /api/match - ניתוח התאמה
    cover-letter            /api/cover-letter - streaming letter

lib/
  ai/
    gateway.ts              קביעת מודלים
    schemas.ts              Zod schemas (CV, Job, MatchResult)
    prompts.ts              system prompts
  db/
    schema.ts               Drizzle schema
    index.ts                client
  storage.ts                localStorage MVP
  scrape.ts                 שליפת תוכן URL
  extract.ts                PDF/DOCX → text
```

## הערה משפטית

שליחה אוטומטית מלאה לאתרי משרות מפרה את ה-ToS של רוב הפלטפורמות (LinkedIn, Indeed וכו'). ברירת המחדל היא **Co-pilot mode**: הסוכן מכין הכל ופותח טופס מולא מראש — אתה לוחץ "Submit". חוקי ובטוח.
