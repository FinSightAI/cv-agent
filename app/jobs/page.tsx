"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Search, X, Sparkles, Clock } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";

type StatusFilter = "all" | StoredJob["status"];
type ScoreFilter = "all" | "60" | "75" | "85";

const STATUS_DOT: Record<StoredJob["status"], string> = {
  saved: "bg-muted-foreground/40",
  drafting: "bg-blue-400",
  ready: "bg-cyan-400",
  applied: "bg-violet-400",
  screen: "bg-amber-400",
  interview: "bg-green-400",
  offer: "bg-emerald-400",
  rejected: "bg-red-400",
  withdrawn: "bg-muted-foreground/40",
  ghosted: "bg-muted-foreground/40",
};

const STATUS_BORDER: Record<StoredJob["status"], string> = {
  saved: "border-s-muted-foreground/20",
  drafting: "border-s-blue-500/40",
  ready: "border-s-cyan-500/40",
  applied: "border-s-violet-500/40",
  screen: "border-s-amber-500/40",
  interview: "border-s-green-500/50",
  offer: "border-s-emerald-500/60",
  rejected: "border-s-red-500/30",
  withdrawn: "border-s-muted-foreground/20",
  ghosted: "border-s-muted-foreground/20",
};

function isStale(j: StoredJob) {
  if (!["applied", "screen"].includes(j.status)) return false;
  const ref = j.appliedAt ?? j.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000 > 7;
}

export default function JobsPage() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minScore, setMinScore] = useState<ScoreFilter>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minScore === "all" ? 0 : Number(minScore);
    return jobs.filter((j) => {
      if (status !== "all" && j.status !== status) return false;
      if (min > 0 && (j.match?.score ?? 0) < min) return false;
      if (remoteOnly && !j.parsed.remote) return false;
      if (q) {
        const hay =
          `${j.parsed.title} ${j.parsed.company} ${j.parsed.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, query, status, minScore, remoteOnly]);

  const hasFilters =
    query !== "" || status !== "all" || minScore !== "all" || remoteOnly;

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setMinScore("all");
    setRemoteOnly(false);
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-6 lg:p-10 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("jobs.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {jobs.length === 0
              ? t("jobs.empty")
              : hasFilters
              ? `${filtered.length} / ${jobs.length} ${t("jobs.count")}`
              : `${jobs.length} ${t("jobs.count")}`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/jobs/new">
            <Plus className="size-4 me-1" />
            {t("jobs.add")}
          </Link>
        </Button>
      </header>

      {/* Filters */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative min-w-[180px] flex-1">
            <Search className="size-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("jobs.filter.search.placeholder")}
              className="ps-8 h-8 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
              {(
                [
                  "saved", "drafting", "ready", "applied", "screen",
                  "interview", "offer", "rejected", "withdrawn", "ghosted",
                ] as StoredJob["status"][]
              ).map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}` as Key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={minScore} onValueChange={(v) => setMinScore(v as ScoreFilter)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
              <SelectItem value="60">60+</SelectItem>
              <SelectItem value="75">75+</SelectItem>
              <SelectItem value="85">85+</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={remoteOnly ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setRemoteOnly((v) => !v)}
          >
            {t("jobs.filter.remoteOnly")}
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="size-3 me-1" />
              {t("jobs.filter.clear")}
            </Button>
          )}
        </div>
      )}

      {/* Empty states */}
      {jobs.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center">
              <Briefcase className="size-8 text-primary" />
            </div>
            <p className="text-muted-foreground">{t("jobs.emptyState")}</p>
            <Button asChild>
              <Link href="/jobs/new">
                <Plus className="size-4 me-2" />
                {t("jobs.add")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {jobs.length > 0 && filtered.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground">{t("jobs.filter.empty")}</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="size-4 me-1" />
              {t("jobs.filter.clear")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Job grid */}
      {filtered.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((j) => (
            <JobCard key={j.id} job={j} lang={lang} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({
  job: j,
  lang,
  t,
}: {
  job: StoredJob;
  lang: string;
  t: (k: Key) => string;
}) {
  const stale = isStale(j);
  return (
    <Link href={`/jobs/${j.id}`}>
      <Card
        className={`glass hover:border-primary/40 transition-all h-full border-s-2 ${STATUS_BORDER[j.status]}`}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold text-sm truncate leading-tight">{j.parsed.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {j.parsed.company}
                {j.parsed.location ? ` · ${j.parsed.location}` : ""}
                {j.parsed.remote ? " · Remote" : ""}
              </p>
            </div>
            {j.match && (
              <div className="shrink-0 text-right">
                <span
                  className={`text-base font-bold tabular-nums ${
                    j.match.score >= 80
                      ? "text-green-400"
                      : j.match.score >= 65
                      ? "text-amber-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {j.match.score}
                </span>
              </div>
            )}
          </div>

          {/* Score bar */}
          {j.match && (
            <Progress
              value={j.match.score}
              className="h-0.5 opacity-50"
            />
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[j.status]}`} />
              <span className="text-[11px] text-muted-foreground">
                {t(`status.${j.status}` as Key)}
              </span>
              {stale && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex items-center gap-1">
                  <Clock className="size-2.5" />
                  7+d
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!j.match && (
                <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <Sparkles className="size-2.5" />
                  {t("job.match.run")}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground/60">
                {formatDate(j.createdAt, lang as "he" | "en")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function statusKey(s: StoredJob["status"]): Key {
  return `status.${s}` as Key;
}
