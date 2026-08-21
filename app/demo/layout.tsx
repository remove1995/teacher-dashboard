import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["/demo", "Обзор"],
  ["/demo/students", "Ученики"],
  ["/demo/lessons", "Уроки"],
  ["/demo/calendar", "Календарь"],
  ["/demo/payments", "Оплаты"],
] as const;

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <div className="demo-slice">
    <div className="demo-notice"><strong>Demo</strong><span>Только просмотр · данные не сохраняются</span></div>
    <nav className="demo-navigation" aria-label="Навигация demo-версии">
      {links.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
    </nav>
    {children}
  </div>;
}
