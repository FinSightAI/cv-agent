"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  KanbanSquare,
  Sparkles,
  Settings,
  Plug,
  Languages,
  Inbox,
  HelpCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/lang-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@/components/user-button";
import type { Key } from "@/lib/i18n/dictionary";
import { store } from "@/lib/storage";

type NavItem = {
  href: string;
  key: Key;
  icon: React.ComponentType<{ className?: string }>;
  badge?: () => number;
};

const NAV: NavItem[] = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/cv", key: "nav.cv", icon: FileText },
  { href: "/jobs", key: "nav.jobs", icon: Briefcase },
  { href: "/applications", key: "nav.applications", icon: KanbanSquare },
  { href: "/inbox", key: "nav.inbox", icon: Inbox },
  { href: "/agent", key: "nav.agent", icon: Sparkles },
  { href: "/connectors", key: "nav.connectors", icon: Plug },
  { href: "/settings", key: "nav.settings", icon: Settings },
  { href: "/help", key: "nav.help", icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t, lang, setLang, dir } = useLang();
  const sideClass = dir === "rtl" ? "border-l" : "border-r";
  const [interviewCount, setInterviewCount] = useState(0);
  const [staleCount, setStaleCount] = useState(0);

  useEffect(() => {
    const jobs = store.getJobs();
    setInterviewCount(jobs.filter((j) => j.status === "interview").length);
    const now = Date.now();
    setStaleCount(
      jobs.filter((j) => {
        if (!["applied", "screen"].includes(j.status)) return false;
        const ref = j.appliedAt ?? j.createdAt;
        return (now - new Date(ref).getTime()) / 86_400_000 > 7;
      }).length,
    );
  }, []);

  const badges: Record<string, number> = {};
  if (interviewCount > 0) badges["/applications"] = interviewCount;
  if (staleCount > 0) badges["/jobs"] = (badges["/jobs"] ?? 0) + staleCount;

  return (
    <aside
      className={cn(
        "hidden md:flex w-64 shrink-0 flex-col bg-sidebar/60 backdrop-blur-xl",
        sideClass,
        "border-border/50",
      )}
    >
      <div className="px-5 py-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 grid place-items-center shadow-lg shadow-primary/20">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-base">{t("brand.name")}</div>
            <div className="text-[11px] text-muted-foreground">
              {t("brand.tagline")}
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const badge = badges[href];
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all relative",
                active
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground border border-primary/20 shadow-sm"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground border border-transparent",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "",
                )}
              />
              <span className="flex-1">{t(key)}</span>
              {badge ? (
                <span className="size-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold grid place-items-center">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50 space-y-2">
        <button
          className="w-full flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 hover:border-border transition-all"
          onClick={() => {
            const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
            document.dispatchEvent(e);
          }}
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-start">{lang === "he" ? "חיפוש..." : "Search..."}</span>
          <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono text-[9px]">
            ⌘K
          </kbd>
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-start gap-2"
            onClick={() => setLang(lang === "he" ? "en" : "he")}
          >
            <Languages className="size-4" />
            {lang === "he" ? "English" : "עברית"}
          </Button>
          <ThemeToggle />
          <UserButton />
        </div>
        <div className="text-[10px] text-muted-foreground/50 text-center">
          v0.2 · Beta
        </div>
      </div>
    </aside>
  );
}
