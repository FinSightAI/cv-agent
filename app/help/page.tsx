"use client";

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
import {
  HelpCircle,
  FileText,
  Briefcase,
  Inbox,
  Sparkles,
  Plug,
  Lightbulb,
  Mail,
  ChevronRight,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

export default function HelpPage() {
  const { t } = useLang();

  return (
    <div className="container max-w-4xl mx-auto p-6 lg:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="size-7 text-primary" />
          {t("help.title")}
        </h1>
        <p className="text-muted-foreground">{t("help.subtitle")}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("help.quickStart.title")}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              n: 1,
              key: "help.quickStart.step1" as Key,
              href: "/cv",
              icon: FileText,
            },
            {
              n: 2,
              key: "help.quickStart.step2" as Key,
              href: "/jobs/new",
              icon: Briefcase,
            },
            {
              n: 3,
              key: "help.quickStart.step3" as Key,
              href: "/jobs",
              icon: Sparkles,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.n} href={s.href}>
                <Card className="glass hover:border-primary/40 transition-all h-full">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-primary/10 grid place-items-center">
                        <Icon className="size-5 text-primary" />
                      </div>
                      <Badge variant="outline">{s.n}</Badge>
                    </div>
                    <p className="text-sm">{t(s.key)}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("help.tabs.title")}</h2>
        <Card className="glass">
          <CardContent className="pt-6 space-y-4">
            <FeatureRow
              icon={Sparkles}
              titleKey="help.tabs.match.title"
              descKey="help.tabs.match.desc"
            />
            <FeatureRow
              icon={Lightbulb}
              titleKey="help.tabs.suggest.title"
              descKey="help.tabs.suggest.desc"
            />
            <FeatureRow
              icon={FileText}
              titleKey="help.tabs.tailor.title"
              descKey="help.tabs.tailor.desc"
            />
            <FeatureRow
              icon={Mail}
              titleKey="help.tabs.letter.title"
              descKey="help.tabs.letter.desc"
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("help.modules.title")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <ModuleCard
            icon={Briefcase}
            titleKey="help.modules.jobs.title"
            descKey="help.modules.jobs.desc"
            href="/jobs"
          />
          <ModuleCard
            icon={Inbox}
            titleKey="help.modules.inbox.title"
            descKey="help.modules.inbox.desc"
            href="/inbox"
          />
          <ModuleCard
            icon={Plug}
            titleKey="help.modules.connectors.title"
            descKey="help.modules.connectors.desc"
            href="/connectors"
          />
          <ModuleCard
            icon={Sparkles}
            titleKey="help.modules.agent.title"
            descKey="help.modules.agent.desc"
            href="/agent"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("help.faq.title")}</h2>
        <Card className="glass">
          <CardContent className="pt-6 divide-y divide-border/40">
            <FAQItem qKey="help.faq.q1" aKey="help.faq.a1" />
            <FAQItem qKey="help.faq.q2" aKey="help.faq.a2" />
            <FAQItem qKey="help.faq.q3" aKey="help.faq.a3" />
            <FAQItem qKey="help.faq.q4" aKey="help.faq.a4" />
            <FAQItem qKey="help.faq.q5" aKey="help.faq.a5" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("help.gmail.title")}</h2>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">{t("help.gmail.title")}</CardTitle>
            <CardDescription>{t("help.gmail.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal ps-6 space-y-2">
              <li>{t("help.gmail.step1")}</li>
              <li>{t("help.gmail.step2")}</li>
              <li>{t("help.gmail.step3")}</li>
              <li>{t("help.gmail.step4")}</li>
            </ol>
            <Button asChild variant="outline" size="sm">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
              >
                {t("help.gmail.openConsole")}
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  titleKey,
  descKey,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: Key;
  descKey: Key;
}) {
  const { t } = useLang();
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="space-y-1 min-w-0">
        <h3 className="font-medium text-sm">{t(titleKey)}</h3>
        <p className="text-sm text-muted-foreground">{t(descKey)}</p>
      </div>
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  titleKey,
  descKey,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titleKey: Key;
  descKey: Key;
  href: string;
}) {
  const { t } = useLang();
  return (
    <Link href={href}>
      <Card className="glass hover:border-primary/40 transition-all h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" />
            <CardTitle className="text-sm">{t(titleKey)}</CardTitle>
            <ChevronRight className="size-4 text-muted-foreground ms-auto" />
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t(descKey)}
        </CardContent>
      </Card>
    </Link>
  );
}

function FAQItem({ qKey, aKey }: { qKey: Key; aKey: Key }) {
  const { t } = useLang();
  return (
    <details className="group py-3">
      <summary className="cursor-pointer font-medium text-sm flex items-center gap-2 list-none">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90 text-muted-foreground" />
        {t(qKey)}
      </summary>
      <p className="text-sm text-muted-foreground pt-2 ps-6">{t(aKey)}</p>
    </details>
  );
}
