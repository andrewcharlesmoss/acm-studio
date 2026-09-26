"use client";

import { useState } from "react";

export type ApplicationSectionItem = { id: string; label: string; href?: string };

export const applicationSectionExample: readonly ApplicationSectionItem[] = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Accounts" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
];

type ApplicationSectionNavigationProps = {
  items?: readonly ApplicationSectionItem[];
  activeId?: string;
  initialActiveId?: string;
  onActiveIdChange?: (id: string) => void;
  preventNavigation?: boolean;
};

export function ApplicationSectionNavigation({ items = applicationSectionExample, activeId, initialActiveId, onActiveIdChange, preventNavigation = false }: ApplicationSectionNavigationProps) {
  const [localActiveId, setLocalActiveId] = useState(initialActiveId ?? items[0]?.id ?? "");
  const selectedId = activeId ?? localActiveId;

  return <nav className="ui-section-navigation" aria-label="Application sections">
    <span className="ui-section-navigation-label">Application sections</span>
    <div className="ui-section-navigation-list">
      {items.map((item) => <a
        href={item.href ?? `#${item.id}`}
        key={item.id}
        aria-current={selectedId === item.id ? "page" : undefined}
        onClick={(event) => {
          onActiveIdChange?.(item.id);
          if (preventNavigation) {
            event.preventDefault();
            if (activeId === undefined) setLocalActiveId(item.id);
          }
        }}
      >{item.label}</a>)}
    </div>
  </nav>;
}
