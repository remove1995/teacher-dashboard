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
          <span className="empty-badge">Foundation</span>
          <h2>Экран готов к подключению данных</h2>
          <p>На этом этапе настроены маршрут, адаптивная оболочка и место для следующей продуктовой итерации.</p>
        </section>
      )}
    </div>
  );
}
