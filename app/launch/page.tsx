"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Rocket,
  Sparkles,
  Briefcase,
  CheckSquare,
  Square,
  Zap,
  AlertCircle,
} from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import { BatchTurboApply } from "@/components/batch-turbo-apply";

const APPLICABLE_STATUSES: StoredJob["status"][] = [
  "saved",
  "drafting",
  "ready",
];

const STATUS_COLOR: Partial<Record<StoredJob["status"], string>> = {
  saved: "bg-muted-foreground/15 text-muted-foreground",
  drafting: "bg-blue-500/15 text-blue-400",
  ready: "bg-cyan-500/15 text-cyan-400",
};

export default function LaunchPage() {
  const { t, dir } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasResume, setHasResume] = useState(false);
  const [filterReady, setFilterReady] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    const all = store.getJobs();
    setJobs(all.filter((j) => APPLICABLE_STATUSES.includes(j.status)));
    setHasResume(!!store.getResume());
  }, []);

  const displayed = useMemo(() => {
    const list = filterReady ? jobs.filter((j) => j.status === "ready") : jobs;
    return [...list].sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
  }, [jobs, filterReady]);

  function toggleJob(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function smartSelect() {
    const smart = displayed
      .filter((j) => (j.match?.score ?? 0) >= 70)
      .map((j) => j.id);
    setSelected(new Set(smart));
  }

  function selectAll() {
    setSelected(new Set(displayed.map((j) => j.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const selectedJobs = useMemo(
    () => displayed.filter((j) => selected.has(j.id)),
    [displayed, selected],
  );

  const smartCount = displayed.filter((j) => (j.match?.score ?? 0) >= 70).length;
  const readyCount = jobs.filter((j) => j.status === "ready").length;

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-6 lg:p-10 space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 grid place-items-center">
            <Rocket className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("launch.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("launch.subtitle")}</p>
          </div>
        </div>
      </header>

      {/* Stats row */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <StatChip
            icon={<Briefcase className="size-3" />}
            value={jobs.length}
            label={dir === "rtl" ? "משרות זמינות" : "available"}
            color="text-muted-foreground"
          />
          <StatChip
            icon={<Zap className="size-3" />}
            value={readyCount}
            label={dir === "rtl" ? "מוכנות" : "ready"}
            color="text-cyan-400"
          />
          <StatChip
            icon={<Sparkles className="size-3" />}
            value={smartCount}
            label={dir === "rtl" ? "ציון 70+" : "score 70+"}
            color="text-green-400"
          />
        </div>
      )}

      {/* No resume warning */}
      {!hasResume && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle className="size-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            {t("launch.noResume")}{" "}
            <Link href="/cv" className="underline underline-offset-2 hover:text-amber-200">
              →
            </Link>
          </p>
        </div>
      )}

      {/* No jobs */}
      {jobs.length === 0 && (
        <Card className="glass border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center">
              <Rocket className="size-8 text-primary/50" />
            </div>
            <div>
              <p className="font-medium">{t("launch.noJobs")}</p>
              <p className="text-sm text-muted-foreground">{t("launch.noJobs.desc")}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/jobs">
                <Briefcase className="size-4 me-2" />
                {t("nav.jobs")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterReady ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilterReady((v) => !v)}
          >
            <Zap className="size-3 me-1" />
            {t("launch.filterReady")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={smartSelect}
            disabled={smartCount === 0}
          >
            <Sparkles className="size-3 me-1" />
            {t("launch.smartSelect")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={selectAll}
          >
            <CheckSquare className="size-3 me-1" />
            {t("launch.selectAll")}
          </Button>
          {selected.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearAll}
            >
              <Square className="size-3 me-1" />
              {t("launch.clearAll")}
            </Button>
          )}
          <span className="ms-auto text-xs text-muted-foreground">
            {selected.size > 0 &&
              t("launch.selected").replace("{n}", String(selected.size))}
          </span>
        </div>
      )}

      {/* Job list */}
      {displayed.length > 0 && (
        <div className="space-y-2">
          {displayed.map((j) => (
            <JobRow
              key={j.id}
              job={j}
              checked={selected.has(j.id)}
              onToggle={() => toggleJob(j.id)}
            />
          ))}
        </div>
      )}

      {/* Launch button */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 md:bottom-6">
          <Button
            size="lg"
            disabled={!hasResume}
            className="w-full shadow-2xl shadow-primary/30 bg-gradient-to-r from-primary to-fuchsia-500 hover:opacity-90 transition-opacity text-lg font-bold py-6"
            onClick={() => setBatchOpen(true)}
          >
            <Rocket className="size-5 me-2" />
            {selected.size === 1
              ? t("launch.launchOne")
              : t("launch.launch").replace("{n}", String(selected.size))}
          </Button>
        </div>
      )}

      {/* Batch modal */}
      <BatchTurboApply
        jobs={selectedJobs}
        open={batchOpen}
        onClose={() => {
          setBatchOpen(false);
          // Refresh job list after applying
          const all = store.getJobs();
          setJobs(all.filter((j) => APPLICABLE_STATUSES.includes(j.status)));
          setSelected(new Set());
        }}
      />
    </div>
  );
}

function JobRow({
  job: j,
  checked,
  onToggle,
}: {
  job: StoredJob;
  checked: boolean;
  onToggle: () => void;
}) {
  const score = j.match?.score;
  const scoreColor =
    score === undefined
      ? "text-muted-foreground/40"
      : score >= 80
      ? "text-green-400"
      : score >= 65
      ? "text-amber-400"
      : "text-muted-foreground";

  const statusLabel =
    j.status === "ready"
      ? "bg-cyan-500/15 text-cyan-400"
      : j.status === "drafting"
      ? "bg-blue-500/15 text-blue-400"
      : "bg-muted/30 text-muted-foreground";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
        checked
          ? "border-primary/50 bg-primary/5"
          : "border-border/40 bg-card/60 hover:border-primary/30"
      }`}
      onClick={onToggle}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="shrink-0"
      />

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-semibold truncate">{j.parsed.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {j.parsed.company}
          {j.parsed.location ? ` · ${j.parsed.location}` : ""}
          {j.parsed.remote ? " · Remote" : ""}
        </p>
        {score !== undefined && (
          <Progress value={score} className="h-0.5 mt-1 opacity-40" />
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        {score !== undefined ? (
          <span className={`text-base font-bold tabular-nums ${scoreColor}`}>
            {score}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusLabel}`}>
          {j.status}
        </span>
      </div>

      <div className="shrink-0 flex gap-1">
        {j.tailoredResume && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">CV✓</span>
        )}
        {j.coverLetter && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400">✉✓</span>
        )}
      </div>
    </div>
  );
}

function StatChip({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/40 px-3 py-1.5">
      <span className={color}>{icon}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
