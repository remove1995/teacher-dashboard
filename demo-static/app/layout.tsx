import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../app/globals.css";
import { StaticDemoShell } from "./static-demo-shell";

export const metadata: Metadata = {
  title: "TutorFlow Demo",
  description: "Read-only demonstration of the TutorFlow teacher workspace.",
};

export default function StaticDemoLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body><StaticDemoShell>{children}</StaticDemoShell></body></html>;
}
