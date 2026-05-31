import type { Metadata } from "next";
import { Heebo, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { MobileHeader } from "@/components/mobile-header";
import { CommandPalette } from "@/components/command-palette";
import { LangProvider } from "@/components/lang-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cv-agent-opal.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jobos — The operating system for your job search",
    template: "%s · Jobos",
  },
  description:
    "AI agent that scores fit, drafts cover letters, and manages your application pipeline.",
  applicationName: "Jobos",
  authors: [{ name: "Ofir Shamir" }],
  keywords: [
    "job search",
    "resume",
    "CV",
    "cover letter",
    "AI",
    "Gemini",
    "Hebrew",
    "Israel jobs",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Jobos",
    title: "Jobos — The operating system for your job search",
    description:
      "AI agent that scores fit, drafts cover letters, and manages your application pipeline.",
    locale: "he_IL",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jobos — The operating system for your job search",
    description:
      "AI agent that scores fit, drafts cover letters, and manages your application pipeline.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider {...(clerkKey ? { publishableKey: clerkKey } : {})}>
      <html
        lang="he"
        dir="rtl"
        className={`${heebo.variable} ${inter.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full bg-background text-foreground relative">
          <ThemeProvider>
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-40 start-1/3 size-[600px] rounded-full bg-primary/10 blur-[120px]" />
              <div className="absolute bottom-0 end-0 size-[500px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
              <div className="absolute top-1/3 start-0 size-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
            </div>
            <LangProvider>
              <div className="flex min-h-screen">
                <AppSidebar />
                <div className="flex-1 flex flex-col overflow-x-hidden">
                  <MobileHeader />
                  <main className="flex-1 pb-16 md:pb-0">{children}</main>
                </div>
              </div>
              <MobileNav />
              <CommandPalette />
              <Toaster richColors position="top-center" theme="system" />
            </LangProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
