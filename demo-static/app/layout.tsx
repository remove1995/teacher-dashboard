import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "../../app/globals.css";

export const metadata: Metadata = {
  title: "TutorFlow Demo",
  description: "Read-only demonstration of the TutorFlow teacher workspace.",
};

const links = [
  ["/", "Обзор"],
  ["/students", "Ученики"],
  ["/lessons", "Уроки"],
  ["/calendar", "Календарь"],
  ["/payments", "Оплаты"],
] as const;

export default function StaticDemoLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body><main className="static-demo-main"><div className="demo-slice">
    <header className="static-demo-brand"><Link href="/" aria-label="TutorFlow Demo"><span className="brand-mark">T</span><span>TutorFlow</span></Link></header>
    <div className="demo-notice"><strong>Demo</strong><span>Только просмотр · данные не сохраняются</span></div>
    <nav className="demo-navigation" aria-label="Навигация demo-версии">{links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</nav>
    {children}
  </div></main></body></html>;
}
