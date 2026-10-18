import { AcmIcon } from "@acm/icons/react";

/** Menu preview only; style values and editing remain outside this first step. */
export function StylesPreviewMenu() {
  return <nav className="site-editor-styles-menu" aria-label="Styles preview menu">
    <button type="button" disabled title="Coming Soon"><span>Browse Styles</span><AcmIcon name="navigation.chevron-right" scale="Regular-M" size={20} /></button>
    <div className="site-editor-styles-categories">
      {([
        { label: "Typography", icon: "insert.text" },
        { label: "Colours", icon: "view.styles" },
        { label: "Background", icon: "insert.image" },
        { label: "Shadows", icon: "view.shadow" },
        { label: "Layout", icon: "layout.columns" },
      ] as const).map(item => <button type="button" key={item.label} disabled title="Coming Soon"><AcmIcon name={item.icon} scale="Regular-M" size={20} /><span>{item.label}</span></button>)}
    </div>
    <div>
      <p>Customise the appearance of specific blocks for the whole site.</p>
      <button type="button" disabled title="Coming Soon"><span>Blocks</span><AcmIcon name="navigation.chevron-right" scale="Regular-M" size={20} /></button>
    </div>
  </nav>;
}
