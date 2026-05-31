"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  FileText,
  Briefcase,
  Sparkles,
  Plug,
  ArrowLeft,
  ArrowRight,
  Plus,
  Bell,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { store, type StoredJob } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

const STATUS_COLOR: Record<StoredJob["status"], string> = {
  saved: "bg-muted text-muted-foreground",
  drafting: "bg-blue-500/15 text-blue-400",
  ready: "bg-cyan-500/15 text-cyan-400",
  applied: "bg-violet-500/15 text-violet-400",
  screen: "bg-amber-500/15 text-amber-400",
  interview: "bg-green-500/15 text-green-400",
  offer: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  withdrawn: "bg-muted text-muted-foreground",
  ghosted: "bg-muted text-muted-foreground",
};

export default function Home() {
  const { t, dir, lang } = useLang();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    setJobs(store.getJobs());
    setHasResume(!!store.getResume());
  }, []);

  const stats = useMemo(() => {
    const active = jobs.filter((j) =>
      ["applied", "screen", "interview"].includes(j.status),
    ).length;
    const interviews = jobs.filter((j) => j.status === "interview").length;
    const withScore = jobs.filter((j) => j.match?.score != null);
    const avgScore =
      withScore.length > 0
        ? Math.round(
            withScore.reduce((s, j) => s + (j.match?.score ?? 0), 0) /
              withScore.length,
          )
        : null;

    const now = Date.now();
    const stale = jobs.filter((j) => {
      if (!["applied", "screen"].includes(j.status)) return false;
      const ref = j.appliedAt ?? j.createdAt;
      return (now - new Date(ref).getTime()) / 86_400_000 > 7;
    });

    const highScoreNoLetter = jobs.filter(
      (j) => (j.match?.score ?? 0) >= 80 && !j.coverLetter,
    );

    const pipeline: Record<string, number> = {};
    for (const j of jobs) {
      if (!["saved", "withdrawn", "ghosted", "rejected"].includes(j.status)) {
        pipeline[j.status] = (pipeline[j.status] ?? 0) + 1;
      }
    }

    return { active, interviews, avgScore, stale, highScoreNoLetter, pipeline };
  }, [jobs]);

  const recent = useMemo(
    () => [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [jobs],
  );

  const nudges: { icon: React.ReactNode; text: string; cta: string; href: string }[] = [];

  if (!hasResume) {
    nudges.push({
      icon: <FileText className="size-4 text-amber-400" />,
      text: t("dashboard.nudge.noResume"),
      cta: t("dashboard.nudge.noResume.cta"),
      href: "/cv",
    });
  }

  if (jobs.length === 0 && hasResume) {
    nudges.push({
      icon: <Briefcase className="size-4 text-primary" />,
      text: t("dashboard.nudge.noJobs"),
      cta: t("dashboard.nudge.noJobs.cta"),
      href: "/jobs/new",
    });
  }

  if (stats.stale.length > 0) {
    nudges.push({
      icon: <Clock className="size-4 text-amber-400" />,
      text: t("dashboard.nudge.stale").replace("{n}", String(stats.stale.length)),
      cta: t("dashboard.nudge.stale.cta"),
      href: "/jobs",
    });
  }

  if (stats.highScoreNoLetter.length > 0) {
    nudges.push({
      icon: <Target className="size-4 text-green-400" />,
      text: t("dashboard.nudge.highScore").replace(
        "{n}",
        String(stats.highScoreNoLetter.length),
      ),
      cta: t("dashboard.nudge.highScore.cta"),
      href: `/jobs/${stats.highScoreNoLetter[0]!.id}`,
    });
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 lg:p-10 space-y-8 pb-20 md:pb-10">
      {/* Header */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="size-3" />
          AI-powered
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
          {t("dashboard.greeting")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          {t("dashboard.intro")}
        </p>
      </header>

      {/* Live stat cards */}
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard
          label={t("dashboard.activeApps")}
          value={String(stats.active)}
          icon={<TrendingUp className="size-4 text-violet-400" />}
          color="violet"
          active={stats.active > 0}
        />
        <StatCard
          label={t("dashboard.upcomingInterviews")}
          value={String(stats.interviews)}
          icon={<BrainCircuit className="size-4 text-green-400" />}
          color="green"
          active={stats.interviews > 0}
        />
        <StatCard
          label={t("dashboard.avgScore")}
          value={stats.avgScore != null ? String(stats.avgScore) : t("dashboard.score.na")}
          icon={<Target className="size-4 text-primary" />}
          color="primary"
          active={stats.avgScore != null}
          suffix={stats.avgScore != null ? "/100" : undefined}
        />
        <StatCard
          label={t("dashboard.totalJobs")}
          value={String(jobs.length)}
          icon={<Briefcase className="size-4 text-blue-400" />}
          color="blue"
          active={jobs.length > 0}
        />
      </section>

      {/* Pipeline mini bar */}
      {Object.keys(stats.pipeline).length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("dashboard.pipeline")}
            </h2>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href="/applications">
                {t("nav.applications")}
                <Arrow className="size-3 ms-1" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["drafting", "ready", "applied", "screen", "interview", "offer"] as const).map((s) => {
              const n = stats.pipeline[s];
              if (!n) return null;
              return (
                <Link key={s} href="/applications">
                  <Badge
                    variant="outline"
                    className={`gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLOR[s]}`}
                  >
                    <span className="font-bold">{n}</span>
                    {t(`status.${s}` as Key)}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Smart nudges */}
      {nudges.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell className="size-3.5" />
            {t("dashboard.nudges.title")}
          </h2>
          <div className="space-y-2">
            {nudges.map((n, i) => (
              <Card key={i} className="glass border-border/40 hover:border-primary/30 transition-all">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0">{n.icon}</div>
                    <p className="text-sm text-muted-foreground truncate">{n.text}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="shrink-0 h-7 text-xs">
                    <Link href={n.href}>
                      {n.cta}
                      <ChevronRight className="size-3 ms-1 rtl:rotate-180" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Two-column layout: recent + action cards */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Quick-add + action cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{t("dashboard.firstSteps")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard
              icon={FileText}
              titleKey="dashboard.uploadCv.title"
              descKey="dashboard.uploadCv.desc"
              ctaKey="dashboard.uploadCv.cta"
              href="/cv"
              Arrow={Arrow}
              done={hasResume}
            />
            <ActionCard
              icon={Briefcase}
              titleKey="dashboard.addJob.title"
              descKey="dashboard.addJob.desc"
              ctaKey="dashboard.addJob.cta"
              href="/jobs/new"
              Arrow={Arrow}
              done={jobs.length > 0}
            />
            <ActionCard
              icon={Sparkles}
              titleKey="dashboard.prefs.title"
              descKey="dashboard.prefs.desc"
              ctaKey="dashboard.prefs.cta"
              href="/settings"
              Arrow={Arrow}
            />
            <ActionCard
              icon={Plug}
              titleKey="dashboard.connectors.title"
              descKey="dashboard.connectors.desc"
              ctaKey="dashboard.connectors.cta"
              href="/connectors"
              Arrow={Arrow}
            />
          </div>
        </section>

        {/* Recent activity */}
        {recent.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("dashboard.recentJobs")}</h2>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link href="/jobs">
                  {t("nav.jobs")}
                  <Arrow className="size-3 ms-1" />
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recent.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`}>
                  <Card className="glass hover:border-primary/30 transition-all">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{j.parsed.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {j.parsed.company}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {j.match && (
                            <span
                              className={`text-xs font-bold ${
                                j.match.score >= 75
                                  ? "text-green-400"
                                  : j.match.score >= 60
                                  ? "text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {j.match.score}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLOR[j.status]}`}
                          >
                            {t(`status.${j.status}` as Key)}
                          </span>
                        </div>
                      </div>
                      {j.match && (
                        <Progress
                          value={j.match.score}
                          className="h-0.5 mt-2 opacity-40"
                        />
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/jobs/new">
                  <Plus className="size-4 me-2" />
                  {t("jobs.add")}
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Empty state — no recent jobs */}
        {recent.length === 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("dashboard.recentJobs")}</h2>
            <Card className="glass border-dashed">
              <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                <Briefcase className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t("dashboard.noJobs")}</p>
                <Button asChild size="sm">
                  <Link href="/jobs/new">
                    <Plus className="size-4 me-2" />
                    {t("jobs.add")}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  active,
  suffix,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  suffix?: string;
}) {
  return (
    <Card className={`glass transition-all ${active ? "border-border/60" : "opacity-60"}`}>
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between mb-1">
          {icon}
        </div>
        <div className="flex items-end gap-1">
          <CardTitle className="text-2xl md:text-3xl font-bold tabular-nums">
            {value}
          </CardTitle>
          {suffix && (
            <span className="text-xs text-muted-foreground mb-1">{suffix}</span>
          )}
        </div>
        <CardDescription className="text-[11px] uppercase tracking-wide">
          {label}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  titleKey,
  descKey,
  ctaKey,
  href,
  Arrow,
  done,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: Key;
  descKey: Key;
  ctaKey: Key;
  href: string;
  Arrow: React.ComponentType<{ className?: string }>;
  done?: boolean;
}) {
  const { t } = useLang();
  return (
    <Card
      className={`glass group hover:border-primary/30 transition-all ${
        done ? "opacity-70" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center border border-primary/20 shrink-0">
            <Icon className="size-4 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">{t(titleKey)}</CardTitle>
            {done && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">
                ✓
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-xs text-muted-foreground">{t(descKey)}</p>
        <Button asChild variant="secondary" size="sm">
          <Link href={href}>
            {t(ctaKey)}
            <Arrow className="size-3 ms-1 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
