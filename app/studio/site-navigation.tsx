import { miniGolfSites } from "./site-registry";

export function SiteNavigation({ currentSiteId }: { currentSiteId?: string }) {
  return <nav className="studio-site-navigation" aria-label="Sites">
    <h2>Sites</h2>
    {miniGolfSites.map((site) => <a key={site.id} href={site.editorHref} aria-current={site.id === currentSiteId ? "page" : undefined}><strong>{site.name}</strong></a>)}
  </nav>;
}
