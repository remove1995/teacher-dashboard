import Link from "next/link";
import { PagePlaceholder } from "@/components/page-placeholder";
export default function PaymentsPage() { return <PagePlaceholder eyebrow="Финансы" title="Оплаты" description="Ожидаемые и полученные суммы, частичные платежи, задолженность и переносы." actions={<Link className="button" href="/payments/new">Добавить оплату</Link>} />; }
