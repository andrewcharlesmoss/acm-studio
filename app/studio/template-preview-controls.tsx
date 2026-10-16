import { useCallback, useId, useState } from "react";
import { SelectControl } from "./controls/native-fields";
import { StudioButton } from "./controls/button";
import { isLocalFixtureSiteId, localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import type { GlobalTemplatePreviewSite } from "./global-template-preview";

export function templatePreviewName(site: GlobalTemplatePreviewSite) {
  return site === "neutral" ? "Neutral" : localFixtureName(site);
}

/** Comparison affects only the canvas; selected-site navigation stays with its owner. */
export function TemplatePreviewControls({ siteId, previewSite, onChange, status }: {
  siteId?: LocalFixtureSiteId; previewSite: GlobalTemplatePreviewSite;
  onChange?: (site: GlobalTemplatePreviewSite) => void; status?: string;
}) {
  const comparisonButtonId = useId();
  const focusPreviewSite = useCallback((element: HTMLSelectElement | null) => { element?.focus(); }, []);
  const [choosingSite, setChoosingSite] = useState(false);
  const defaultSite = siteId ?? "neutral";
  const defaultName = templatePreviewName(defaultSite);
  return <>
    <span>Preview With: <strong>{templatePreviewName(previewSite)}</strong></span>
    {choosingSite ? <label>Preview Site<SelectControl ref={focusPreviewSite} value={previewSite} onChange={event => onChange?.(isLocalFixtureSiteId(event.target.value) ? event.target.value : "neutral")}><option value="neutral">Neutral</option><option value="test">Test</option><option value="test2">Test2</option></SelectControl></label> : <StudioButton id={comparisonButtonId} variant="secondary" onClick={() => setChoosingSite(true)}>Preview Another Site…</StudioButton>}
    {choosingSite || previewSite !== defaultSite ? <StudioButton variant="secondary" onClick={() => { onChange?.(defaultSite); setChoosingSite(false); requestAnimationFrame(() => document.getElementById(comparisonButtonId)?.focus()); }}>Return to {defaultName} Preview</StudioButton> : null}
    {previewSite !== defaultSite ? <span role="status">{siteId ? `Preview differs from selected site ${defaultName}.` : "Previewing site content instead of Neutral examples."}</span> : null}
    {status ? <span role="status">{status}</span> : null}
  </>;
}
