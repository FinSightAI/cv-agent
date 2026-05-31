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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";
import { formatDate } from "@/lib/utils";
import { ChevronRight, GripVertical } from "lucide-react";

const COLUMNS: { status: StoredJob["status"]; key: Key; color: string }[] = [
  { status: "saved", key: "status.savedFem", color: "text-muted-foreground" },
  { status: "drafting", key: "status.draftingFem", color: "text-blue-400" },
  { status: "ready", key: "status.readyFem", color: "text-cyan-400" },
  { status: "applied", key: "status.appliedFem", color: "text-violet-400" },
  { status: "screen", key: "status.screen", color: "text-amber-400" },
  { status: "interview", key: "status.interview", color: "text-green-400" },
  { status: "offer", key: "status.offer", color: "text-emerald-400" },
  { status: "rejected", key: "status.rejectedFem", color: "text-red-400" },
];

const NEXT_STATUS: Partial<Record<StoredJob["status"], StoredJob["status"]>> = {
  saved: "drafting",
  drafting: "ready",
  ready: "applied",
  applied: "screen",
  screen: "interview",
  interview: "offer",
};

export default function ApplicationsPage() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  function moveJob(jobId: string, newStatus: StoredJob["status"]) {
    const job = store.getJob(jobId);
    if (!job) return;
    const updated: StoredJob = {
      ...job,
      status: newStatus,
      appliedAt:
        newStatus === "applied" && !job.appliedAt
          ? new Date().toISOString()
          : job.appliedAt,
    };
    store.saveJob(updated);
    setJobs(store.getJobs());
    toast.success(t("status.update"));
  }

  const grouped = COLUMNS.map((c) => ({
    ...c,
    items: jobs.filter((j) => j.status === c.status),
  }));

  const totalActive = jobs.filter((j) =>
    ["applied", "screen", "interview", "offer"].includes(j.status),
  ).length;

  return (
    <div className="h-full flex flex-col pb-20 md:pb-0">
      <header className="px-4 md:px-6 lg:px-10 pt-4 md:pt-6 lg:pt-10 pb-4 space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("apps.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("apps.subtitle")}</p>
          </div>
          {totalActive > 0 && (
            <Badge variant="secondary" className="text-base px-3 py-1">
              {totalActive} {t("dashboard.activeApps")}
            </Badge>
          )}
        </div>
      </header>

      <ScrollArea className="flex-1 px-4 md:px-6 lg:px-10">
        <div className="flex gap-3 pb-6 min-w-max">
          {grouped.map((col) => (
            <div key={col.status} className="w-64 md:w-72 shrink-0 space-y-2">
              <div className="flex items-center justify-between px-1 py-1 sticky top-0 bg-transparent">
                <h2 className={`text-xs font-semibold uppercase tracking-wide ${col.color}`}>
                  {t(col.key)}
                </h2>
                <Badge
                  variant={col.items.length > 0 ? "secondary" : "outline"}
                  className="text-[10px] h-5 min-w-5 justify-center"
                >
                  {col.items.length}
                </Badge>
              </div>

              <div className="space-y-2 min-h-[80px]">
                {col.items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/40 py-8 text-center">
                    <p className="text-xs text-muted-foreground/50">—</p>
                  </div>
                )}
                {col.items.map((j) => {
                  const nextStatus = NEXT_STATUS[j.status];
                  return (
                    <Card
                      key={j.id}
                      className="glass hover:border-primary/30 transition-all group"
                    >
                      <CardHeader className="pb-2 pt-3 px-3">
                        <div className="flex items-start gap-1.5">
                          <div className="flex-1 min-w-0">
                            <Link href={`/jobs/${j.id}`}>
                              <CardTitle className="text-xs font-semibold truncate hover:text-primary transition-colors">
                                {j.parsed.title}
                              </CardTitle>
                            </Link>
                            <CardDescription className="text-[11px] truncate mt-0.5">
                              {j.parsed.company}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="size-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded hover:bg-accent">
                              <GripVertical className="size-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {COLUMNS.filter((c) => c.status !== j.status).map(
                                (c) => (
                                  <DropdownMenuItem
                                    key={c.status}
                                    onClick={() => moveJob(j.id, c.status)}
                                    className="text-xs"
                                  >
                                    <span className={`me-2 font-medium ${c.color}`}>→</span>
                                    {t(c.key)}
                                  </DropdownMenuItem>
                                ),
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          {j.match ? (
                            <span
                              className={`font-bold ${
                                j.match.score >= 75
                                  ? "text-green-400"
                                  : j.match.score >= 60
                                  ? "text-amber-400"
                                  : ""
                              }`}
                            >
                              {j.match.score}/100
                            </span>
                          ) : (
                            <span />
                          )}
                          <span>{formatDate(j.createdAt, lang)}</span>
                        </div>
                        {nextStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => moveJob(j.id, nextStatus)}
                          >
                            → {t(`status.${nextStatus}` as Key)}
                            <ChevronRight className="size-3 ms-1" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
