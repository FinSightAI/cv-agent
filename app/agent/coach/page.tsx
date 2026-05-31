"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Loader2,
  Trophy,
  AlertTriangle,
  TrendingUp,
  Target,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { store } from "@/lib/storage";
import { aiFetchJson } from "@/lib/utils";
import { useLang } from "@/components/lang-provider";

type CoachResult = {
  overallAssessment: string;
  priorityScore: number;
  topRecommendations: {
    priority: "critical" | "high" | "medium";
    title: string;
    action: string;
    impact: string;
    timeToImplement: string;
  }[];
  cvStrengths: string[];
  cvWeaknesses: string[];
  missingSkillsAcrossJobs: string[];
  strategyInsight: string;
};

const PRIORITY_CONFIG = {
  critical: { label: "קריטי", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  high: { label: "גבוה", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  medium: { label: "בינוני", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

export default function CareerCoachPage() {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const jobs = store.getJobs();
    const resume = store.getResume();
    setHasData(!!resume && jobs.length > 0);
  }, []);

  async function runCoach() {
    const resume = store.getResume();
    const jobs = store.getJobs();
    if (!resume || jobs.length === 0) {
      toast.error("העלה קורות חיים והוסף לפחות משרה אחת תחילה");
      return;
    }
    setBusy(true);
    try {
      const data = await aiFetchJson<{ result: CoachResult }>(
        "/api/career-coach",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resume: resume.parsed,
            language: lang,
            jobs: jobs.map((j) => ({
              title: j.parsed.title,
              company: j.parsed.company,
              status: j.status,
              matchScore: j.match?.score ?? null,
              keywords: j.parsed.keywords ?? [],
              requirements: j.parsed.requirements?.map((r) => r.text) ?? [],
            })),
          }),
        },
        { t, fallback: "ניתוח נכשל" },
      );
      setResult(data.result);
      toast.success("ניתוח הקריירה מוכן");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-6 lg:p-10 space-y-6 pb-20 md:pb-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agent">
              <ArrowLeft className="size-4 me-1 rtl:rotate-180" />
              חזרה
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Trophy className="size-7 text-primary" />
          מאמן קריירה AI
        </h1>
        <p className="text-muted-foreground text-sm">
          ניתוח הוליסטי של כל חיפוש העבודה שלך — CV, משרות, פייפליין — עם המלצות עדיפות ספציפיות.
        </p>
      </header>

      {!hasData && (
        <Card className="glass border-amber-500/30">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-muted-foreground">צריך קורות חיים + לפחות משרה אחת כדי להריץ את הניתוח</p>
            <div className="flex gap-3 justify-center">
              <Button asChild variant="outline" size="sm"><Link href="/cv">העלה CV</Link></Button>
              <Button asChild size="sm"><Link href="/jobs/new">הוסף משרה</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasData && !result && (
        <Card className="glass">
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center border border-primary/20">
              <Sparkles className="size-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              ה-AI יסרוק את הקורות חיים שלך, כל המשרות, הציונים, והפייפליין — ויתן לך 3-7 המלצות ספציפיות ומעשיות.
            </p>
            <Button onClick={runCoach} disabled={busy} size="lg">
              {busy ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 me-2" />
                  הרץ ניתוח מלא
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall score */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold">{result.priorityScore}/100</CardTitle>
                  <CardDescription className="mt-1">ציון בריאות חיפוש עבודה</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={runCoach} disabled={busy}>
                  {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                </Button>
              </div>
              <Progress
                value={result.priorityScore}
                className={`h-2 mt-3 ${
                  result.priorityScore >= 70
                    ? "[&>div]:bg-green-500"
                    : result.priorityScore >= 50
                    ? "[&>div]:bg-amber-500"
                    : "[&>div]:bg-red-500"
                }`}
              />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              {result.overallAssessment}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              המלצות עדיפות
            </h2>
            {result.topRecommendations.map((rec, i) => {
              const conf = PRIORITY_CONFIG[rec.priority];
              return (
                <Card key={i} className="glass">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${conf.color}`}>
                        {conf.label}
                      </span>
                      <CardTitle className="text-sm leading-snug">{rec.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground">{rec.action}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span className="flex items-center gap-1 text-green-400">
                        <TrendingUp className="size-3" />
                        {rec.impact}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground/60">
                        <Target className="size-3" />
                        {rec.timeToImplement}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          {/* CV analysis */}
          <div className="grid gap-3 md:grid-cols-2">
            {result.cvStrengths.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-400">💪 חוזקות ה-CV</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {result.cvStrengths.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-green-400">✓</span>
                      {s}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
            {result.cvWeaknesses.length > 0 && (
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="size-3.5" />
                    לשיפור
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {result.cvWeaknesses.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <span className="text-amber-400">→</span>
                      {w}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Missing skills */}
          {result.missingSkillsAcrossJobs.length > 0 && (
            <Card className="glass border-red-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">כישורים שחסרים במרבית המשרות שלך</CardTitle>
                <CardDescription className="text-xs">הוסף אם נכון עליך, או שקול לרכוש</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.missingSkillsAcrossJobs.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs border-red-500/30 text-red-400">{s}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strategy insight */}
          {result.strategyInsight && (
            <Card className="glass bg-primary/5 border-primary/20">
              <CardContent className="pt-4 text-sm leading-relaxed">
                <span className="font-semibold text-primary">תובנת אסטרטגיה: </span>
                {result.strategyInsight}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
