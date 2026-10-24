"use client";

import { useId, useState } from "react";
import { blockLibraryEntries } from "../blocks/library-catalogue";
import { BlockLibraryNavigation } from "../ui/blocks/block-library-navigation";
import { ControlsNavigationMenu, orderedControlEntries } from "../ui/controls/controls-navigation";

type BlockType = (typeof blockLibraryEntries)[number]["type"];

export function CatalogueNavigationSpecimen() {
  const [selected, setSelected] = useState<BlockType | null>(null);
  const selectedEntry = blockLibraryEntries.find(entry => entry.type === selected);
  const [selectedControlId, setSelectedControlId] = useState(orderedControlEntries[0]?.id ?? "");
  const selectedControl = orderedControlEntries.find(entry => entry.id === selectedControlId);
  const controlSelectionId = useId();

  return <section className="pl-catalogue-navigation-example" aria-label="Catalogue Navigation Example">
    <div className="pl-specimen-heading">
      <p className="pl-eyebrow">Catalogue navigation</p>
      <h2>A grouped list for finding tools</h2>
      <p>These sidebars group destinations and mark the current choice. Try the Block Library buttons and Controls jump links below.</p>
    </div>
    <section aria-label="Block Library navigation example">
      <div className="pl-catalogue-navigation-preview">
        <BlockLibraryNavigation active={selected ?? "all"} onSelect={setSelected} />
        <section className="pl-catalogue-navigation-result" aria-live="polite" aria-label="Selected example">
          <p className="pl-eyebrow">Temporary selection</p>
          <h3>{selectedEntry?.label ?? "All Blocks"}</h3>
          <p>{selectedEntry ? `The ${selectedEntry.label} destination is selected for this example.` : "Choose an item in the grouped list to try its selected state."}</p>
          <button className="pl-button" type="button" onClick={() => setSelected(null)}>Reset Example</button>
        </section>
      </div>
    </section>
    <section className="pl-catalogue-navigation-controls" aria-label="Controls navigation example">
      <div className="pl-catalogue-navigation-preview">
        <ControlsNavigationMenu activeId={selectedControlId} hrefForDestination={() => `#${controlSelectionId}`} onNavigate={(event, id) => {
          event.preventDefault();
          setSelectedControlId(id);
        }} />
        <section className="pl-catalogue-navigation-result" id={controlSelectionId} aria-live="polite" aria-label="Selected control example">
          <p className="pl-eyebrow">Controls / Temporary selection</p>
          <h3>{selectedControl?.title}</h3>
          <p>{selectedControl?.purpose}</p>
          <button className="pl-button" type="button" onClick={() => setSelectedControlId(orderedControlEntries[0]?.id ?? "")}>Reset Example</button>
        </section>
      </div>
    </section>
    <p className="pl-caption">This example uses the same catalogue navigation component and styles as the production Block Library and Controls menus. Selection stays in temporary example state.</p>
  </section>;
}
