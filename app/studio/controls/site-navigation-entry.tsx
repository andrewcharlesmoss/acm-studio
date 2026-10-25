"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { InspectorAccordionSection } from "../inspector-accordion";
import "./site-navigation-entry.css";

/** Site owners supply actions and environment content; disclosure stays shared. */
export function SiteNavigationEntry({ name, active = false, headingAction, rowProps, children }: {
  name: string;
  active?: boolean;
  headingAction?: ReactNode;
  rowProps?: HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: unknown };
  children: ReactNode;
}) {
  return <div {...rowProps} className={`studio-local-site-actions studio-site-entry${active ? " is-active" : ""}`}>
    <InspectorAccordionSection className="studio-site-entry-disclosure" label={`${name} environments`} defaultOpen={active} title={<span className="studio-site-entry-title"><span className="studio-local-site-mark" aria-hidden="true">{name.slice(0, 1)}</span><strong>{name}</strong>{active ? <span className="visually-hidden"> — Active site</span> : null}</span>}>
      <div className="studio-local-site-environments">{children}</div>
    </InspectorAccordionSection>
    {headingAction ? <div className="studio-site-entry-action">{headingAction}</div> : null}
  </div>;
}
