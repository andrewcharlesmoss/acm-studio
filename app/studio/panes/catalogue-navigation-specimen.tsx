"use client";

import { useState } from "react";
import { blockLibraryEntries } from "../blocks/library-catalogue";
import { BlockLibraryNavigation } from "../ui/blocks/block-library-navigation";

type BlockType = (typeof blockLibraryEntries)[number]["type"];

export function CatalogueNavigationSpecimen() {
  const [selected, setSelected] = useState<BlockType | null>(null);
  const selectedEntry = blockLibraryEntries.find(entry => entry.type === selected);

  return <section className="pl-catalogue-navigation-example" aria-label="Catalogue Navigation Example">
    <div className="pl-specimen-heading">
      <p className="pl-eyebrow">Catalogue navigation</p>
      <h2>A grouped list for finding tools</h2>
      <p>This sidebar groups destinations and marks the current choice. It is distinct from a resizable Pane: it has no pane edge, collapse control, or product data.</p>
    </div>
    <div className="pl-catalogue-navigation-preview">
      <BlockLibraryNavigation active={selected ?? "all"} onSelect={setSelected} />
      <section className="pl-catalogue-navigation-result" aria-live="polite" aria-label="Selected example">
        <p className="pl-eyebrow">Temporary selection</p>
        <h3>{selectedEntry?.label ?? "All Blocks"}</h3>
        <p>{selectedEntry ? `The ${selectedEntry.label} destination is selected for this example.` : "Choose an item in the grouped list to try its selected state."}</p>
        <button className="pl-button" type="button" onClick={() => setSelected(null)}>Reset Example</button>
      </section>
    </div>
    <p className="pl-caption">This example uses the same catalogue navigation component and styles as the production Block Library and Controls menus. Selection stays in temporary example state.</p>
  </section>;
}
