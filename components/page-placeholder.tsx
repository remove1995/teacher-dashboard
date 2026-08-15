import type { ReactNode } from "react";

type PagePlaceholderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PagePlaceholder({ eyebrow, title, description, actions, children }: PagePlaceholderProps) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {description ? <p className="lede">{description}</p> : null}
        </div>
        {actions ? <div className="heading-actions">{actions}</div> : null}
      </section>
      {children ?? (
        <section className="empty-state">
          <h2>Здесь пока нет записей</h2>
          <p>Данные появятся после добавления первой записи.</p>
        </section>
      )}
    </div>
  );
}
