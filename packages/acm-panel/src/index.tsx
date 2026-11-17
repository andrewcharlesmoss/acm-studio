import { useId, type ReactNode } from "react";

export type PanelCardProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function PanelCard({
  eyebrow,
  title,
  description,
  headerActions,
  children,
  footer,
  className,
}: PanelCardProps) {
  const titleId = useId();
  const panelClassName = ["acm-panel", className].filter(Boolean).join(" ");

  return (
    <aside className={panelClassName} aria-labelledby={titleId} data-acm-panel>
      <header className="acm-panel-header">
        <div className="acm-panel-heading">
          {eyebrow != null ? <p className="acm-panel-eyebrow">{eyebrow}</p> : null}
          <h2 className="acm-panel-title" id={titleId}>{title}</h2>
          {description != null ? <p className="acm-panel-description">{description}</p> : null}
        </div>
        {headerActions != null ? <div className="acm-panel-header-actions">{headerActions}</div> : null}
      </header>
      <div className="acm-panel-body">{children}</div>
      {footer != null ? <footer className="acm-panel-footer">{footer}</footer> : null}
    </aside>
  );
}
