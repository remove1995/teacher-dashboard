"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const navigation = [
  ["/", "Обзор", "⌂"], ["/lessons", "Уроки", "□"], ["/students", "Ученики", "♙"],
  ["/attendance", "Посещаемость", "◷"], ["/payments", "Оплаты", "▣"], ["/calendar", "Календарь", "▦"], ["/settings", "Настройки", "⚙"],
] as const;

const isCurrent = (pathname: string, href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function StaticDemoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  return <div className="app-shell demo-app-shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">T</span><span>TutorFlow</span></Link><nav className="primary-nav" aria-label="Основная навигация">{navigation.map(([href, label, icon]) => <Link className={isCurrent(pathname, href) ? "active" : ""} aria-current={isCurrent(pathname, href) ? "page" : undefined} href={href} key={href}><i aria-hidden="true">{icon}</i>{label}</Link>)}</nav><p className="sidebar-note">Демонстрационная версия<br />Изменения отключены</p></aside>
    <div className="workspace"><header className="mobile-header"><Link className="brand" href="/"><span className="brand-mark">T</span><span>TutorFlow</span></Link><button className="mobile-menu-button" type="button" aria-label="Открыть меню" aria-expanded={open} onClick={() => setOpen(true)}><span /><span /><span /></button></header>
      <main><div className="demo-slice"><div className="demo-notice"><strong>Демо-режим</strong><span>Просмотр данных · изменения отключены</span></div>{children}</div></main>
      {open ? <div className="mobile-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><aside className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-label="Навигация"><header><strong>Разделы</strong><button type="button" aria-label="Закрыть меню" onClick={() => setOpen(false)}>×</button></header><nav>{navigation.map(([href, label]) => <Link className={isCurrent(pathname, href) ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav></aside></div> : null}
    </div>
  </div>;
}
