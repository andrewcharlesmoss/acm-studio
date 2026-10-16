import { SelectControl } from "./controls/native-fields";
import { isLocalFixtureSiteId, localFixtureName, type LocalFixtureSiteId } from "./test-site/sites";
import type { GlobalTemplatePreviewSite } from "./global-template-preview";

export function templatePreviewName(site: GlobalTemplatePreviewSite) {
  return site === "neutral" ? "Neutral" : localFixtureName(site);
}

/** An active site owns the preview; unscoped previews may choose a site. */
export function TemplatePreviewControls({ siteId, previewSite, onChange, status }: {
  siteId?: LocalFixtureSiteId; previewSite: GlobalTemplatePreviewSite;
  onChange?: (site: GlobalTemplatePreviewSite) => void; status?: string;
}) {
  return <>
    {siteId ? <span>Preview With: <strong>{templatePreviewName(siteId)}</strong></span> : <label>Preview Site<SelectControl value={previewSite} onChange={event => onChange?.(isLocalFixtureSiteId(event.target.value) ? event.target.value : "neutral")}><option value="neutral">Neutral</option><option value="test">Test</option><option value="test2">Test2</option></SelectControl></label>}
    {status ? <span role="status">{status}</span> : null}
  </>;
}
