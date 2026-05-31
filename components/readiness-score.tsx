"use client";
import type { StoredJob } from "@/lib/storage";
import { store } from "@/lib/storage";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { useLang } from "@/components/lang-provider";

function calcReadiness(
  job: StoredJob,
  hasResume: boolean,
): { score: number; items: { label: string; done: boolean; pts: number }[] } {
  const items = [
    { label: "קורות חיים", done: hasResume, pts: 20 },
    { label: "ניתוח התאמה", done: !!job.match, pts: 15 },
    { label: "ציון ≥ 60", done: (job.match?.score ?? 0) >= 60, pts: 10 },
    { label: "CV מותאם", done: !!job.tailoredResume, pts: 20 },
    { label: "מכתב מקדים", done: !!job.coverLetter, pts: 15 },
    { label: "הערות / מחקר", done: !!(job.notes?.trim()), pts: 10 },
    { label: "תזכורת קבועה", done: !!job.followUpAt, pts: 5 },
    { label: "הכנת ראיון", done: !!job.interviewPrep, pts: 5 },
  ];
  const score = items.filter((i) => i.done).reduce((s, i) => s + i.pts, 0);
  return { score, items };
}

export function ReadinessScore({ job }: { job: StoredJob }) {
  const { t } = useLang();
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    setHasResume(!!store.getResume());
  }, []);

  const { score, items } = calcReadiness(job, hasResume);
  const color =
    score >= 80
      ? "text-green-400"
      : score >= 40
        ? "text-amber-400"
        : "text-red-400";
  const barColor =
    score >= 80
      ? "[&>div]:bg-green-500"
      : score >= 40
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-red-500";

  return (
    <div className="glass rounded-xl p-4 space-y-3 border border-border/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold tabular-nums ${color}`}>
            {score}%
          </span>
          <span className="text-sm text-muted-foreground">
            {t("readiness.title")}
          </span>
        </div>
        {score >= 80 && job.url && (
          <Button
            size="sm"
            asChild
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <a href={job.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4 me-1.5" />
              {t("readiness.apply")}
            </a>
          </Button>
        )}
      </div>
      <Progress value={score} className={`h-2 ${barColor}`} />
      <div className="grid grid-cols-2 gap-1">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-1.5 text-xs ${item.done ? "text-foreground" : "text-muted-foreground/50"}`}
          >
            <CheckCircle2
              className={`size-3 shrink-0 ${item.done ? "text-green-500" : "text-muted-foreground/30"}`}
            />
            {item.label}
            {!item.done && (
              <span className="text-[10px] opacity-60">+{item.pts}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
