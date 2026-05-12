"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

type Kind = "match" | "tailor" | "letter";

const LABELS: Record<Kind, Key> = {
  match: "loading.matching",
  tailor: "loading.tailoring",
  letter: "loading.coverLetter",
};

export function AILoadingSkeleton({ kind }: { kind: Kind }) {
  const { t } = useLang();
  return (
    <Card className="glass" aria-busy="true" aria-live="polite">
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>{t(LABELS[kind])}</span>
          <span className="text-xs opacity-70">· {t("loading.aiHint")}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {kind === "match" && (
          <>
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-2 w-full" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </>
        )}
        {kind === "tailor" && (
          <>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-2 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </>
        )}
        {kind === "letter" && (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
