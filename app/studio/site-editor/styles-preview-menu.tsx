import { AcmIcon } from "@acm/icons/react";

/** Browse Styles and Typography share the temporary Styles preview; other categories remain visible. */
export function StylesPreviewMenu({ onBrowse, onTypography }: { onBrowse?: () => void; onTypography?: () => void }) {
  return <nav className="site-editor-styles-menu" aria-label="Styles preview menu">
    <button type="button" disabled={!onBrowse} onClick={onBrowse}><span>Browse Styles</span><AcmIcon name="navigation.chevron-right" scale="Regular-M" size={20} /></button>
    <div className="site-editor-styles-categories">
      {([
        { label: "Typography", icon: "text.typography" },
        { label: "Colours", icon: "style.colour" },
        { label: "Background", icon: "style.background" },
        { label: "Shadows", icon: "view.shadow" },
        { label: "Layout", icon: "layout.template" },
      ] as const).map(item => <button type="button" key={item.label} disabled={item.label !== "Typography" || !onTypography} title={item.label === "Typography" ? undefined : "Coming Soon"} onClick={item.label === "Typography" ? onTypography : undefined}><AcmIcon name={item.icon} scale="Regular-M" size={20} /><span>{item.label}</span></button>)}
    </div>
    <div>
      <p>Customise the appearance of specific blocks for the whole site.</p>
      <button type="button" disabled title="Coming Soon"><span>Blocks</span><AcmIcon name="navigation.chevron-right" scale="Regular-M" size={20} /></button>
    </div>
  </nav>;
}
