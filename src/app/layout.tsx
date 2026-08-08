import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeController, type ThemePreference } from "@/components/theme-controller";
import { prisma } from "@/lib/db";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cryptolyst",
  description: "Self-hosted crypto trade journal and portfolio analytics",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await prisma.appSetting.findUnique({
    where: { id: "singleton" },
    select: { theme: true },
  });
  const theme = (["dark", "light", "system"].includes(settings?.theme ?? "")
    ? settings?.theme
    : "dark") as ThemePreference;

  return (
    <html lang="zh-Hant" data-theme={theme} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeController theme={theme} />
        {children}
      </body>
    </html>
  );
}
