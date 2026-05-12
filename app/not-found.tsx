"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, FileQuestion } from "lucide-react";
import { useLang } from "@/components/lang-provider";

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="container max-w-xl mx-auto p-6 lg:p-10">
      <Card className="glass">
        <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="size-16 rounded-2xl bg-primary/10 grid place-items-center border border-primary/20">
            <FileQuestion className="size-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("notFound.desc")}</p>
          </div>
          <Button asChild>
            <Link href="/">
              <Home className="size-4 me-2" />
              {t("common.backHome")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
