"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Briefcase,
  Sparkles,
  Plug,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

export default function Home() {
  const { t, dir } = useLang();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="container max-w-5xl mx-auto p-6 lg:p-10 space-y-10">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
          <Sparkles className="size-3" />
          AI-powered
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
          {t("dashboard.greeting")}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base">
          {t("dashboard.intro")}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t("dashboard.activeApps")} value="0" />
        <StatCard label={t("dashboard.upcomingInterviews")} value="0" />
        <StatCard label={t("dashboard.avgScore")} value="—" />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("dashboard.firstSteps")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ActionCard
            icon={FileText}
            titleKey="dashboard.uploadCv.title"
            descKey="dashboard.uploadCv.desc"
            ctaKey="dashboard.uploadCv.cta"
            href="/cv"
            Arrow={Arrow}
          />
          <ActionCard
            icon={Briefcase}
            titleKey="dashboard.addJob.title"
            descKey="dashboard.addJob.desc"
            ctaKey="dashboard.addJob.cta"
            href="/jobs/new"
            Arrow={Arrow}
          />
          <ActionCard
            icon={Sparkles}
            titleKey="dashboard.prefs.title"
            descKey="dashboard.prefs.desc"
            ctaKey="dashboard.prefs.cta"
            href="/settings"
            Arrow={Arrow}
          />
          <ActionCard
            icon={Plug}
            titleKey="dashboard.connectors.title"
            descKey="dashboard.connectors.desc"
            ctaKey="dashboard.connectors.cta"
            href="/connectors"
            Arrow={Arrow}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wider">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-bold">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  titleKey,
  descKey,
  ctaKey,
  href,
  Arrow,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: Key;
  descKey: Key;
  ctaKey: Key;
  href: string;
  Arrow: React.ComponentType<{ className?: string }>;
}) {
  const { t } = useLang();
  return (
    <Card className="glass group hover:border-primary/30 transition-all">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center border border-primary/20">
            <Icon className="size-5 text-primary" />
          </div>
          <CardTitle className="text-lg">{t(titleKey)}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t(descKey)}</p>
        <Button asChild variant="secondary" size="sm">
          <Link href={href}>
            {t(ctaKey)}
            <Arrow className="size-4 ms-1 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
