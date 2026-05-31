"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/lang-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Key } from "@/lib/i18n/dictionary";

const PAGE_TITLES: Record<string, Key> = {
  "/": "nav.dashboard",
  "/cv": "nav.cv",
  "/jobs": "nav.jobs",
  "/jobs/new": "jobs.new.title",
  "/applications": "nav.applications",
  "/inbox": "nav.inbox",
  "/agent": "nav.agent",
  "/connectors": "nav.connectors",
  "/settings": "nav.settings",
  "/offer-compare": "nav.offerCompare",
  "/stats": "nav.stats",
  "/help": "nav.help",
};

export function MobileHeader() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();

  const titleKey =
    Object.entries(PAGE_TITLES)
      .filter(([p]) => (p === "/" ? pathname === "/" : pathname.startsWith(p)))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "brand.name";

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <Link href="/" className="flex items-center gap-2">
        <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-sm shadow-primary/20">
          <Sparkles className="size-3.5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">{t(titleKey as Key)}</span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => setLang(lang === "he" ? "en" : "he")}
        >
          <Languages className="size-4" />
        </Button>
      </div>
    </header>
  );
}
