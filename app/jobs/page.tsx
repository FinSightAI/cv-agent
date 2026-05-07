"use client";

import { useEffect, useState } from "react";
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
import { Plus, Briefcase } from "lucide-react";
import { store, type StoredJob } from "@/lib/storage";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

export default function JobsPage() {
  const { t, lang } = useLang();
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    setJobs(store.getJobs());
  }, []);

  return (
    <div className="container max-w-6xl mx-auto p-6 lg:p-10 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("jobs.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {jobs.length === 0
              ? t("jobs.empty")
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
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {jobs.map((j) => (
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
      )}
    </div>
  );
}

function statusKey(s: StoredJob["status"]): Key {
  return `status.${s}` as Key;
}
