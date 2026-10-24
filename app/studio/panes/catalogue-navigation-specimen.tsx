"use client";

import { useState } from "react";
import { CatalogueNavigation, type CatalogueNavigationGroup, type CatalogueNavigationItem } from "../ui/catalogue-navigation";

const destinations = [
  { id: "articles", label: "Articles", group: "content" },
  { id: "pages", label: "Pages", group: "content" },
  { id: "patterns", label: "Patterns", group: "design" },
  { id: "colours", label: "Colours", group: "design" },
  { id: "general", label: "General", group: "settings" },
  { id: "access", label: "Access", group: "settings" },
] as const;

const destinationGroups = [
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "settings", label: "Settings" },
] as const;

export function CatalogueNavigationSpecimen() {
  const [selected, setSelected] = useState("all");
  const selectedDestination = destinations.find(destination => destination.id === selected);
  const leadingItems: CatalogueNavigationItem[] = [{
    id: "all",
    label: "All destinations",
    current: selected === "all",
    onSelect: () => setSelected("all"),
  }];
  const groups: CatalogueNavigationGroup[] = destinationGroups.map(group => ({
    ...group,
    items: destinations.filter(destination => destination.group === group.id).map(destination => ({
      id: destination.id,
      label: destination.label,
      current: selected === destination.id,
      onSelect: () => setSelected(destination.id),
    })),
  }));

  return <section className="pl-catalogue-navigation-example" aria-label="Catalogue Navigation Example">
    <div className="pl-specimen-heading">
      <p className="pl-eyebrow">Catalogue navigation</p>
      <h2>A grouped list for finding items</h2>
      <p>Try the shared navigation with sample groups, destinations and a selected item.</p>
    </div>
    <div className="pl-catalogue-navigation-preview">
      <CatalogueNavigation title="Example navigation" ariaLabel="Example navigation pane" navigationLabel="Example destinations" leadingItems={leadingItems} groups={groups} />
      <section className="pl-catalogue-navigation-result" aria-live="polite" aria-label="Selected example">
        <p className="pl-eyebrow">Temporary selection</p>
        <h3>{selectedDestination?.label ?? "All destinations"}</h3>
        <p>{selectedDestination ? `${selectedDestination.label} is selected in this example.` : "Choose an item in the grouped list to try its selected state."}</p>
        <button className="pl-button" type="button" onClick={() => setSelected("all")}>Reset Example</button>
      </section>
    </div>
    <p className="pl-caption">This generic example uses the shared CatalogueNavigation component. Block Library and Controls supply their own groups and actions in production.</p>
  </section>;
}
