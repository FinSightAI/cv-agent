"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/lang-provider";
import type { Key } from "@/lib/i18n/dictionary";

const NAV: { href: string; key: Key; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/cv", key: "nav.cv", icon: FileText },
  { href: "/jobs", key: "nav.jobs", icon: Briefcase },
  { href: "/applications", key: "nav.applications", icon: KanbanSquare },
  { href: "/inbox", key: "nav.inbox", icon: Inbox },
  { href: "/agent", key: "nav.agent", icon: Sparkles },
  { href: "/connectors", key: "nav.connectors", icon: Plug },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t, lang, setLang, dir } = useLang();
  const sideClass = dir === "rtl" ? "border-l" : "border-r";

  return (
    <aside
      className={cn(
        "hidden md:flex w-64 shrink-0 flex-col bg-sidebar/60 backdrop-blur-xl",
        sideClass,
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
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all relative group",
                active
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground border border-primary/20 shadow-sm"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-primary" : "",
                )}
              />
              {t(key)}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border/50 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setLang(lang === "he" ? "en" : "he")}
        >
          <Languages className="size-4" />
          {lang === "he" ? "English" : "עברית"}
        </Button>
        <div className="text-[10px] text-muted-foreground/70 text-center">
          v0.1 · MVP
        </div>
      </div>
    </aside>
  );
}
