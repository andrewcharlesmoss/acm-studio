import type { ReactNode } from "react";
import type { StudioProject, StudioProjectLink } from "./project-registry";
import { StudioIcon } from "./studio-icons";

function ProjectLinks({ links, context }: { links: StudioProjectLink[]; context: string }) {
  return <div className="dashboard-project-links">{links.map((link, index) => {
    const external = link.href?.startsWith("https://") ?? false;
    const unavailable = link.label === "Edit Site" && !link.href;
    const accessibleName = `${link.label} — ${context}${unavailable ? " — not available yet" : ""}`;
    const icon = external ? "external" : link.label === "Edit Site" ? "pencil" : "arrow-right";
    if (!link.href) return <button className="dashboard-card-link is-icon-only is-unavailable" key={`${link.label}-${index}`} type="button" disabled title={accessibleName} aria-label={accessibleName}>
      <StudioIcon name={icon} size={20} />
    </button>;
    return <a className={`dashboard-card-link${["Visit Site", "Edit Site"].includes(link.label) ? " is-icon-only" : ""}`} key={link.href} href={link.href} aria-label={accessibleName} title={accessibleName} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {icon === "arrow-right" ? link.label : <StudioIcon name={icon} size={20} />}
    </a>;
  })}</div>;
}

export function ProjectEnvironmentActions({ project, local }: { project: StudioProject; local: ReactNode }) {
  const environments = project.environments ?? [{ id: `${project.id}-production`, name: "Production", links: project.links }];
  return <div className="dashboard-project-environments" data-environment-count={environments.length + 1}>
    {local}
    {environments.map(environment => <div className="dashboard-project-environment" key={environment.id}>
      <strong>{environment.name}</strong><ProjectLinks links={environment.links} context={`${project.name} — ${environment.name}`} />
    </div>)}
  </div>;
}
