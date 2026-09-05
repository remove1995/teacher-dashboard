import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { getTeacherSettings } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "TutorFlow",
  description: "Planning, attendance, payments, and learning records for tutors.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TutorFlow" },
  icons: {
    icon: [
      { url: "/assets/tutorflow-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/tutorflow-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/assets/tutorflow-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F8F4EF",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getTeacherSettings();
  return (
    <html lang="ru">
      <body>
        <AppShell teacherName={settings.displayName} teacherAvatarUrl={settings.avatarUrl}>{children}</AppShell>
      </body>
    </html>
  );
}
