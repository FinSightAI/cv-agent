"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Target,
  Clock,
  AlertTriangle,
  Trophy,
  BarChart3,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import { formatDate } from "@/lib/utils";
import type { Key } from "@/lib/i18n/dictionary";

const POSITIVE_STATUSES = new Set(["screen", "interview", "offer"]);
const TERMINAL_STATUSES = new Set(["rejected", "withdrawn", "ghosted", "offer"]);

export default function StatsPage() {
  const { lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  const stats = useMemo(() => {
    const applied = jobs.filter((j) =>
      ["applied", "screen", "interview", "offer", "rejected", "withdrawn", "ghosted"].includes(j.status)
    );
    const responded = applied.filter((j) => POSITIVE_STATUSES.has(j.status));
    const interviews = jobs.filter((j) => ["interview", "offer"].includes(j.status));
    const offers = jobs.filter((j) => j.status === "offer");
    const rejected = jobs.filter((j) => j.status === "rejected");
    const ghosted = jobs.filter((j) => j.status === "ghosted");

    const responseRate = applied.length ? Math.round((responded.length / applied.length) * 100) : 0;
    const interviewRate = applied.length ? Math.round((interviews.length / applied.length) * 100) : 0;
    const offerRate = interviews.length ? Math.round((offers.length / interviews.length) * 100) : 0;

    // Average match score for jobs that got responses vs didn't
    const respondedScores = responded.filter((j) => j.match).map((j) => j.match!.score);
    const noResponseScores = applied
      .filter((j) => !POSITIVE_STATUSES.has(j.status) && j.match)
      .map((j) => j.match!.score);
    const avgRespondedScore = respondedScores.length
      ? Math.round(respondedScores.reduce((a, b) => a + b, 0) / respondedScores.length)
      : null;
    const avgNoResponseScore = noResponseScores.length
      ? Math.round(noResponseScores.reduce((a, b) => a + b, 0) / noResponseScores.length)
      : null;

    // Time to response (days from appliedAt to screen/interview)
    const responseTimes: number[] = responded
      .filter((j) => j.appliedAt)
      .map((j) => {
        const start = new Date(j.appliedAt!).getTime();
        const end = Date.now();
        return Math.floor((end - start) / 86_400_000);
      });
    const avgResponseDays = responseTimes.length
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    // Application velocity (jobs per week)
    const sortedByDate = [...jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let weeklyVelocity = 0;
    if (sortedByDate.length >= 2) {
      const first = new Date(sortedByDate[0]!.createdAt).getTime();
      const last = new Date(sortedByDate[sortedByDate.length - 1]!.createdAt).getTime();
      const weeks = Math.max((last - first) / (7 * 86_400_000), 1);
      weeklyVelocity = Math.round((jobs.length / weeks) * 10) / 10;
    }

    // Top performing companies (those that responded)
    const topCompanies = responded
      .map((j) => ({ company: j.parsed.company, title: j.parsed.title, id: j.id, status: j.status }))
      .slice(0, 5);

    // Stale (applied 14+ days with no response)
    const stale = applied.filter((j) => {
      if (POSITIVE_STATUSES.has(j.status) || TERMINAL_STATUSES.has(j.status)) return false;
      const ref = j.appliedAt ?? j.createdAt;
      return (Date.now() - new Date(ref).getTime()) / 86_400_000 > 14;
    });

    // Average match score of applied jobs
    const appliedWithScore = applied.filter((j) => j.match);
    const avgAppliedScore = appliedWithScore.length
      ? Math.round(appliedWithScore.reduce((s, j) => s + j.match!.score, 0) / appliedWithScore.length)
      : null;

    // Debrief insights — average scores
    const debriefs = jobs.filter((j) => j.debrief).map((j) => j.debrief!);
    const avgDebrief = debriefs.length
      ? {
          confidence: avg(debriefs.map((d) => d.confidence)),
          technical: avg(debriefs.map((d) => d.technicalPrep)),
          communication: avg(debriefs.map((d) => d.communicationClarity)),
          preparation: avg(debriefs.map((d) => d.overallPreparation)),
        }
      : null;

    return {
      total: jobs.length,
      applied: applied.length,
      responded: responded.length,
      interviews: interviews.length,
      offers: offers.length,
      rejected: rejected.length,
      ghosted: ghosted.length,
      responseRate,
      interviewRate,
      offerRate,
      avgRespondedScore,
      avgNoResponseScore,
      avgResponseDays,
      weeklyVelocity,
      topCompanies,
      stale,
      avgAppliedScore,
      avgDebrief,
    };
  }, [jobs]);

  if (jobs.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto p-6 lg:p-10">
        <header className="space-y-1 mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="size-7 text-primary" />
            ניתוח חיפוש עבודה
          </h1>
          <p className="text-muted-foreground text-sm">נתונים ותובנות על תהליך ההגשות שלך</p>
        </header>
        <Card className="glass border-dashed">
          <CardContent className="py-16 text-center">
            <Briefcase className="size-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">הוסף משרות ותתחיל להגיש כדי לראות סטטיסטיקות</p>
            <Button asChild className="mt-4">
              <Link href="/jobs/new">הוסף משרה ראשונה</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 lg:p-10 space-y-6 pb-20 md:pb-10">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="size-7 text-primary" />
          ניתוח חיפוש עבודה
        </h1>
        <p className="text-muted-foreground text-sm">
          {stats.total} משרות · {stats.applied} הוגשו · עדכון כל טעינה
        </p>
      </header>

      {/* Funnel */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">פאנל הגשות</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <FunnelCard label="הוגשו" value={stats.applied} color="text-violet-400" total={stats.applied} />
          <FunnelCard label="קיבלו מענה" value={stats.responded} color="text-amber-400" total={stats.applied} />
          <FunnelCard label="ראיונות" value={stats.interviews} color="text-green-400" total={stats.applied} />
          <FunnelCard label="הצעות" value={stats.offers} color="text-emerald-400" total={stats.applied} />
        </div>
      </section>

      {/* Conversion rates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">יחסי המרה</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <RateCard
            label="שיעור מענה"
            value={stats.responseRate}
            sub={`${stats.responded}/${stats.applied} הגשות`}
            icon={<TrendingUp className="size-4 text-amber-400" />}
            hint={stats.responseRate < 15 ? "נמוך — נסה לשפר את ה-CV או המכתב" : stats.responseRate > 40 ? "מצוין!" : "טוב"}
          />
          <RateCard
            label="שיעור ראיון"
            value={stats.interviewRate}
            sub={`${stats.interviews}/${stats.applied} הגשות`}
            icon={<Target className="size-4 text-green-400" />}
            hint={stats.interviewRate < 10 ? "שפר את ההתאמה לפני הגשה" : ""}
          />
          <RateCard
            label="המרת ראיון→הצעה"
            value={stats.offerRate}
            sub={`${stats.offers}/${stats.interviews} ראיונות`}
            icon={<Trophy className="size-4 text-primary" />}
            hint=""
          />
        </div>
      </section>

      {/* Score insights */}
      {(stats.avgRespondedScore || stats.avgNoResponseScore) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">ציוני התאמה לפי תוצאה</h2>
          <Card className="glass">
            <CardContent className="pt-6 grid gap-4 md:grid-cols-2">
              {stats.avgRespondedScore !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ממוצע — קיבלו מענה</span>
                    <span className="text-green-400 font-bold">{stats.avgRespondedScore}</span>
                  </div>
                  <Progress value={stats.avgRespondedScore} className="h-1.5 [&>div]:bg-green-500" />
                </div>
              )}
              {stats.avgNoResponseScore !== null && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ממוצע — ללא מענה</span>
                    <span className="text-muted-foreground font-bold">{stats.avgNoResponseScore}</span>
                  </div>
                  <Progress value={stats.avgNoResponseScore} className="h-1.5" />
                </div>
              )}
            </CardContent>
            {stats.avgRespondedScore && stats.avgNoResponseScore && (
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {stats.avgRespondedScore > stats.avgNoResponseScore + 10
                    ? `✓ המשרות שקיבלת עליהן מענה היו בממוצע +${stats.avgRespondedScore - stats.avgNoResponseScore} נקודות — המודל עובד. הגש רק מעל ${stats.avgRespondedScore - 5}.`
                    : "הפרש הציונים קטן — אולי כדאי לשפר את המכתב המקדים."}
                </p>
              </CardContent>
            )}
          </Card>
        </section>
      )}

      {/* Timing */}
      <section className="grid gap-3 md:grid-cols-2">
        {stats.avgResponseDays !== null && (
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="size-4 text-blue-400" />
                זמן מענה ממוצע
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.avgResponseDays} ימים</p>
              <p className="text-xs text-muted-foreground mt-1">מהגשה עד תגובה ראשונה</p>
            </CardContent>
          </Card>
        )}
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              קצב הגשות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.weeklyVelocity}</p>
            <p className="text-xs text-muted-foreground mt-1">משרות לשבוע בממוצע</p>
            {stats.weeklyVelocity < 3 && (
              <p className="text-xs text-amber-400 mt-1">מחקרים מראים ש-5-10 הגשות/שבוע מיטביות</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Stale applications alert */}
      {stats.stale.length > 0 && (
        <Card className="glass border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400" />
              {stats.stale.length} הגשות ממתינות 14+ ימים ללא מענה
            </CardTitle>
            <CardDescription>שקול follow-up או לסמן כ"ללא מענה"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.stale.slice(0, 3).map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between hover:opacity-80 transition-opacity">
                <div>
                  <p className="text-sm font-medium">{j.parsed.title}</p>
                  <p className="text-xs text-muted-foreground">{j.parsed.company}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top performing */}
      {stats.topCompanies.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">חברות שהגיבו</h2>
          <div className="space-y-2">
            {stats.topCompanies.map((c) => (
              <Link key={c.id} href={`/jobs/${c.id}`}>
                <Card className="glass hover:border-primary/30 transition-all">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.company}</p>
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        c.status === "offer"
                          ? "border-emerald-500/30 text-emerald-400"
                          : c.status === "interview"
                          ? "border-green-500/30 text-green-400"
                          : "border-amber-500/30 text-amber-400"
                      }
                    >
                      {c.status === "offer" ? "הצעה 🎉" : c.status === "interview" ? "ראיון" : "סינון"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Debrief insights */}
      {stats.avgDebrief && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">תובנות מדברופי ראיונות</h2>
          <Card className="glass">
            <CardHeader>
              <CardDescription>ממוצע מ-{jobs.filter((j) => j.debrief).length} ראיונות שדיברפת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "ביטחון עצמי", value: stats.avgDebrief.confidence },
                { label: "ידע טכני", value: stats.avgDebrief.technical },
                { label: "בהירות תקשורת", value: stats.avgDebrief.communication },
                { label: "מוכנות כללית", value: stats.avgDebrief.preparation },
              ].map((d) => (
                <div key={d.label} className="flex items-center gap-3">
                  <span className="text-xs w-32 shrink-0 text-muted-foreground">{d.label}</span>
                  <Progress value={d.value * 20} className="flex-1 h-1.5" />
                  <span className="text-xs font-medium w-8 text-right">{d.value.toFixed(1)}/5</span>
                </div>
              ))}
              {(() => {
                const weakest = [
                  { label: "ביטחון עצמי", value: stats.avgDebrief!.confidence },
                  { label: "ידע טכני", value: stats.avgDebrief!.technical },
                  { label: "בהירות תקשורת", value: stats.avgDebrief!.communication },
                ].sort((a, b) => a.value - b.value)[0]!;
                return weakest.value < 3.5 ? (
                  <p className="text-xs text-amber-400 pt-1">
                    ⚠ הנקודה החלשה ביותר: <strong>{weakest.label}</strong> ({weakest.value.toFixed(1)}/5) — כדאי לתרגל לפני הראיון הבא.
                  </p>
                ) : (
                  <p className="text-xs text-green-400 pt-1">✓ ביצועי הראיון שלך חזקים בכל הקטגוריות</p>
                );
              })()}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function FunnelCard({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <Card className="glass">
      <CardContent className="pt-4 pb-4 px-4">
        <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {total > 0 && value !== total && (
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{pct}%</p>
        )}
      </CardContent>
    </Card>
  );
}

function RateCard({ label, value, sub, icon, hint }: { label: string; value: number; sub: string; icon: React.ReactNode; hint: string }) {
  const color = value >= 30 ? "text-green-400" : value >= 15 ? "text-amber-400" : "text-red-400";
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}%</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70 mt-1 italic">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}
