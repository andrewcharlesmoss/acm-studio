import type { ReactNode } from "react";

/** Shared application chrome; feature owners supply navigation, status, and actions. */
export function StudioAppHeader({ section, children, className = "", homeHref = "/" }: {
  section: string; children?: ReactNode; className?: string; homeHref?: string;
}) {
  return <header className={`studio-app-header ${className}`}>
    <div className="studio-app-identity">
      <a className="studio-app-brand" href={homeHref} aria-label="ACM Studio home"><span className="studio-app-mark" aria-hidden="true">AM</span><strong>ACM Studio</strong></a>
      <span className="studio-app-divider" aria-hidden="true" />
      <strong className="studio-app-section">{section}</strong>
    </div>
    {children}
  </header>;
}
