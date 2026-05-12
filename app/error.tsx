"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, RotateCcw, AlertTriangle } from "lucide-react";
import { useLang } from "@/components/lang-provider";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="container max-w-xl mx-auto p-6 lg:p-10">
      <Card className="glass">
        <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="size-16 rounded-2xl bg-amber-500/10 grid place-items-center border border-amber-500/30">
            <AlertTriangle className="size-8 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{t("error.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("error.desc")}</p>
            {error.digest && (
              <p className="text-[10px] text-muted-foreground/60 font-mono pt-2">
                {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={reset}>
              <RotateCcw className="size-4 me-2" />
              {t("error.retry")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="size-4 me-2" />
                {t("common.backHome")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
