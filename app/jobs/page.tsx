"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Search, X } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";

type StatusFilter = "all" | StoredJob["status"];
type ScoreFilter = "all" | "60" | "75" | "85";

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
    <div className="container max-w-6xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("jobs.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {jobs.length === 0
              ? t("jobs.empty")
              : hasFilters
              ? `${filtered.length} / ${jobs.length} ${t("jobs.count")}`
              : `${jobs.length} ${t("jobs.count")}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="size-4 me-2" />
            {t("jobs.add")}
          </Link>
        </Button>
      </header>

      {jobs.length > 0 && (
        <Card className="glass">
          <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs text-muted-foreground">
                {t("jobs.filter.search")}
              </label>
              <div className="relative">
                <Search className="size-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("jobs.filter.search.placeholder")}
                  className="ps-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t("jobs.filter.status")}
              </label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
                  {(
                    [
                      "saved",
                      "drafting",
                      "ready",
                      "applied",
                      "screen",
                      "interview",
                      "offer",
                      "rejected",
                      "withdrawn",
                      "ghosted",
                    ] as StoredJob["status"][]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}` as Key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t("jobs.filter.minScore")}
              </label>
              <Select
                value={minScore}
                onValueChange={(v) => setMinScore(v as ScoreFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("jobs.filter.all")}</SelectItem>
                  <SelectItem value="60">60+</SelectItem>
                  <SelectItem value="75">75+</SelectItem>
                  <SelectItem value="85">85+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant={remoteOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setRemoteOnly((v) => !v)}
            >
              {t("jobs.filter.remoteOnly")}
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="size-4 me-1" />
                {t("jobs.filter.clear")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {jobs.length === 0 ? (
        <Card className="glass">
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
      ) : filtered.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground">{t("jobs.filter.empty")}</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="size-4 me-1" />
              {t("jobs.filter.clear")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`}>
              <Card className="glass hover:border-primary/40 transition-all h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {j.parsed.title}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {j.parsed.company}
                        {j.parsed.location ? ` · ${j.parsed.location}` : ""}
                      </CardDescription>
                    </div>
                    {j.match && (
                      <Badge
                        variant={
                          j.match.score >= 75
                            ? "default"
                            : j.match.score >= 60
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {j.match.score}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{t(statusKey(j.status))}</Badge>
                  <span>{formatDate(j.createdAt, lang)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function statusKey(s: StoredJob["status"]): Key {
  return `status.${s}` as Key;
}
