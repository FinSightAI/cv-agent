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
import { ScrollArea } from "@/components/ui/scroll-area";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

const COLUMNS: { status: StoredJob["status"]; key: Key }[] = [
  { status: "saved", key: "status.savedFem" },
  { status: "drafting", key: "status.draftingFem" },
  { status: "ready", key: "status.readyFem" },
  { status: "applied", key: "status.appliedFem" },
  { status: "screen", key: "status.screen" },
  { status: "interview", key: "status.interview" },
  { status: "offer", key: "status.offer" },
  { status: "rejected", key: "status.rejectedFem" },
];

export default function ApplicationsPage() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  const grouped = COLUMNS.map((c) => ({
    ...c,
    items: jobs.filter((j) => j.status === c.status),
  }));

  return (
    <div className="container mx-auto p-6 lg:p-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t("apps.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("apps.subtitle")}</p>
      </header>

      <ScrollArea className="w-full pb-4">
        <div className="flex gap-3 min-w-max">
          {grouped.map((col) => (
            <div key={col.status} className="w-72 shrink-0 space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium">{t(col.key)}</h2>
                <Badge variant="secondary">{col.items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {col.items.length === 0 && (
                  <Card className="border-dashed bg-muted/10">
                    <CardContent className="py-8 text-center text-xs text-muted-foreground">
                      {t("common.empty")}
                    </CardContent>
                  </Card>
                )}
                {col.items.map((j) => (
                  <Link key={j.id} href={`/jobs/${j.id}`}>
                    <Card className="glass hover:border-primary/40 transition-all">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm truncate">
                          {j.parsed.title}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {j.parsed.company}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-xs text-muted-foreground pt-0">
                        {j.match ? (
                          <Badge variant="outline">{j.match.score}</Badge>
                        ) : (
                          <span />
                        )}
                        <span>
                          {new Date(j.createdAt).toLocaleDateString(
                            lang === "he" ? "he-IL" : "en-US",
                          )}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
