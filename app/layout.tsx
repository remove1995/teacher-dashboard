import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getTeacherSettings } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  description: "Planning, attendance, payments, and learning records for tutors.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getTeacherSettings();
  return (
    <html lang="ru">
      <body>
        <AppShell teacherName={settings.displayName}>{children}</AppShell>
      </body>
    </html>
  );
}
