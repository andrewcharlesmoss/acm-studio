"use client";

import { useState } from "react";
import { TemplateNavigationView } from "../../template-navigation-view";
import type { NavigationTemplateNode, SiteLink } from "../../template-model";
import { StudioButton } from "../../controls/button";
import "../../templates.css";

const navigation: NavigationTemplateNode = {
  id: "library-mobile-navigation", type: "element", element: "navigation",
  overlayMenu: "mobile", showIcon: true, icon: "menu", submenuOpenOnClick: true,
  ariaLabel: "Example mobile navigation",
};
const links: SiteLink[] = [
  { id: "example-home", label: "Home", url: "#mobile-navigation-example" },
  { id: "example-resources", label: "Resources", url: "#mobile-navigation-example", children: [
    { id: "example-guides", label: "Guides", url: "#mobile-navigation-example" },
    { id: "example-support", label: "Support", url: "#mobile-navigation-example" },
  ] },
  { id: "example-contact", label: "Contact", url: "#mobile-navigation-example" },
];

/** Only fixture data and selection feedback are local; production owns the menu. */
export function MobileNavigationExample() {
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="ui-mobile-navigation-example">
    <StudioButton type="button" variant="secondary" onClick={() => { setRevision(value => value + 1); setSelected(null); }}>Reset Example</StudioButton>
    <div className="ui-mobile-navigation-frame template-surface document-preview" key={revision}>
      <TemplateNavigationView node={navigation} links={links} renderLink={link => <a href={link.url} onClick={event => { event.preventDefault(); setSelected(link.label); }}>{link.label}</a>} />
      <p>Example page</p>
    </div>
    <p role="status">{selected ? `Selected: ${selected}.` : "No example link selected."}</p>
    <p>Open the menu with Enter or Space. Tab and Shift+Tab stay inside it. Escape closes the current submenu first, then the menu. Close and Escape return focus to the relevant opener. Selecting a link also closes the menu. Links stay in this example.</p>
  </div>;
}
