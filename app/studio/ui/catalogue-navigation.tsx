import type { MouseEventHandler } from "react";
import "./catalogue-navigation.css";

export type CatalogueNavigationItem = {
  id: string;
  label: string;
  current?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  onSelect?: () => void;
};

export type CatalogueNavigationGroup = {
  id: string;
  label: string;
  headingHref?: string;
  onHeadingClick?: MouseEventHandler<HTMLAnchorElement>;
  items: CatalogueNavigationItem[];
};

export function CatalogueNavigation({ title, ariaLabel, navigationLabel, groups, leadingItems = [] }: {
  title: string;
  ariaLabel: string;
  navigationLabel: string;
  groups: CatalogueNavigationGroup[];
  leadingItems?: CatalogueNavigationItem[];
}) {
  const renderItem = (item: CatalogueNavigationItem) => <li key={item.id}>
    {item.href
      ? <a href={item.href} aria-current={item.current ? "location" : undefined} onClick={item.onClick}>{item.label}</a>
      : <button type="button" aria-current={item.current ? "location" : undefined} onClick={item.onSelect}>{item.label}</button>}
  </li>;

  return <aside className="ui-catalogue-navigation" aria-label={ariaLabel}>
    <h2>{title}</h2>
    <nav aria-label={navigationLabel}>
      {leadingItems.length > 0 && <ul className="ui-catalogue-navigation-list">{leadingItems.map(renderItem)}</ul>}
      <div className="ui-catalogue-navigation-groups">{groups.map(group => <section className="ui-catalogue-navigation-group" key={group.id}>
        <h3>{group.headingHref
          ? <a href={group.headingHref} onClick={group.onHeadingClick}>{group.label}</a>
          : group.label}</h3>
        <ul className="ui-catalogue-navigation-list">{group.items.map(renderItem)}</ul>
      </section>)}</div>
    </nav>
  </aside>;
}
