"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { logout } from "@/app/actions/auth";

const navigation = [
  ["/", "Обзор", "home"], ["/lessons", "Уроки", "lessons"], ["/students", "Ученики", "students"],
  ["/attendance", "Посещаемость", "attendance"], ["/payments", "Оплаты", "payments"],
  ["/calendar", "Календарь", "calendar"], ["/settings", "Настройки", "settings"],
] as const;
const isCurrent = (pathname: string, href: string) => href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function NavIcon({ name }: { name: typeof navigation[number][2] }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "home") return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
  if (name === "lessons") return <svg {...common}><path d="M6 3h9l3 3v15H6z" /><path d="M15 3v4h4M9 11h6M9 15h4" /></svg>;
  if (name === "students") return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20M16 5.5a3 3 0 0 1 0 5.8M16.5 14a4.5 4.5 0 0 1 4 4.5V20" /></svg>;
  if (name === "attendance") return <svg {...common}><rect x="4" y="4" width="16" height="17" rx="3" /><path d="M8 2v4M16 2v4M8 12l2.4 2.4L16 9" /></svg>;
  if (name === "payments") return <svg {...common}><path d="M4 7.5h16v12H4zM4 10.5h16" /><path d="M15 15h2M6 7.5V5h12v2.5" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-2.83 2.83A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1.4 1.6H10.4A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.91.31l-2.8-2.8A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 13.6v-3.2A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.31-1.91l2.8-2.8A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10.4 3h3.2A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.91-.31l2.8 2.8A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.6 1.4v3.2a1.7 1.7 0 0 0-1.6 1.4Z" /></svg>;
}

export function AppShell({ children, teacherName, teacherAvatarUrl }: { children: ReactNode; teacherName: string; teacherAvatarUrl?: string | null }) {
  const pathname = usePathname(), [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => { if (!menuOpen) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [menuOpen]);
  const links = (mobile = false) => navigation.map(([href, label, icon]) => <Link className={isCurrent(pathname, href) ? "active" : ""} aria-current={isCurrent(pathname, href) ? "page" : undefined} href={href} key={href} onClick={mobile ? () => setMenuOpen(false) : undefined}><span className="nav-icon"><NavIcon name={icon} /></span><span>{label}</span></Link>);
  if (pathname === "/login") return children;
  const account = () => <div className="sidebar-account"><span className={`account-avatar${teacherAvatarUrl ? " has-image" : ""}`}>{teacherAvatarUrl ? <img src={teacherAvatarUrl} alt="" /> : teacherName.slice(0, 1).toUpperCase()}</span><div><strong>{teacherName}</strong><small>TutorFlow</small></div><form action={logout}><button className="account-logout" type="submit">Выйти</button></form></div>;
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/" aria-label="TutorFlow"><span className="brand-mark">T</span><span>TutorFlow</span></Link><nav className="primary-nav" aria-label="Основная навигация">{links()}</nav><img className="sidebar-decoration" src="/assets/decor-branch-sage.png" alt="" aria-hidden="true" />{account()}</aside><div className="workspace"><header className="mobile-header"><Link className="brand" href="/" aria-label="TutorFlow"><span className="brand-mark">T</span><span>TutorFlow</span></Link><button className="mobile-menu-button" type="button" aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(true)}><span /><span /><span /></button></header><main>{children}</main>{menuOpen ? <div className="mobile-menu-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><aside className="mobile-menu-sheet" id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Навигация"><header><strong>Разделы</strong><button type="button" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)}>×</button></header><nav aria-label="Мобильная навигация">{links(true)}</nav><div className="mobile-account">{account()}</div></aside></div> : null}</div></div>;
}
