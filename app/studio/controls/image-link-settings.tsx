"use client";

import type { ContentBlock } from "../../content/model";
import { CheckboxControl } from "./checkbox-control";
import { SelectControl, TextInput } from "./native-fields";

export type ImageLinkBlock = Extract<ContentBlock, { type: "image" }>;

/** The inspector and toolbar use the same Image destination fields and rules. */
export function ImageLinkSettings({ block, onChange, disabled = false }: { block: ImageLinkBlock; onChange: (block: ImageLinkBlock) => void; disabled?: boolean }) {
  const destination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
  return <div className="image-link-settings">
    <label><span>Link destination</span><SelectControl disabled={disabled} value={destination} onChange={event => {
      const next = event.target.value as NonNullable<ImageLinkBlock["linkDestination"]>;
      onChange({ ...block, linkDestination: next, linkUrl: next === "custom" ? block.linkUrl : undefined, opensInNewTab: next === "custom" || next === "media" ? block.opensInNewTab : undefined, decorative: next === "none" ? block.decorative : false });
    }}><option value="none">None</option><option value="custom">Custom URL</option><option value="media">Image file</option><option value="lightbox">Enlarge on click</option></SelectControl></label>
    {destination === "custom" ? <label><span>Link URL</span><TextInput disabled={disabled} type="url" value={block.linkUrl ?? ""} onChange={event => onChange({ ...block, linkUrl: event.target.value || undefined, decorative: event.target.value ? false : block.decorative })} placeholder="https://…" /></label> : null}
    {destination === "custom" || destination === "media" ? <CheckboxControl className="checkbox-setting" disabled={disabled} checked={Boolean(block.opensInNewTab)} onChange={checked => onChange({ ...block, opensInNewTab: checked })} label={<>Open in new tab</>} /> : null}
  </div>;
}
