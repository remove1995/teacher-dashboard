import Link from "next/link";
import type { ReactNode } from "react";

export default async function StudentLayout({ children, params }: { children: ReactNode; params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const tabs = [["", "Обзор"], ["history", "История"], ["finance", "Финансы"], ["learning", "Обучение"]];
  return <div className="page-stack"><nav className="profile-tabs" aria-label="Разделы профиля">{tabs.map(([path, label]) => <Link key={path} href={`/students/${studentId}${path ? `/${path}` : ""}`}>{label}</Link>)}</nav>{children}</div>;
}
