import type { Metadata } from "next";
import { Heebo, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { LangProvider } from "@/components/lang-provider";
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

export const metadata: Metadata = {
  title: "CV Agent — Smart job-hunting copilot",
  description:
    "AI agent that scores fit, drafts cover letters, and manages your application pipeline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`dark ${heebo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground relative">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 start-1/3 size-[600px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 end-0 size-[500px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
          <div className="absolute top-1/3 start-0 size-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>
        <LangProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden">{children}</main>
          </div>
          <Toaster richColors position="top-center" theme="dark" />
        </LangProvider>
      </body>
    </html>
  );
}
