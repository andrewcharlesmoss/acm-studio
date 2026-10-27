"use client";

import { useRef, useState } from "react";
import { ImageLinkSettings, type ImageLinkBlock } from "./controls/image-link-settings";
import { StudioAnchoredPopover } from "./overlays/anchored-popover";
import { StudioIcon } from "./studio-icons";

/** The owner checks document freshness before applying a destination change. */
export function ImageLinkControl({ block, writable, onChange }: { block: ImageLinkBlock; writable: boolean; onChange: (previous: ImageLinkBlock, next: ImageLinkBlock) => boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const linked = (block.linkDestination ?? (block.linkUrl ? "custom" : "none")) !== "none";
  return <>
    <button ref={trigger} type="button" className={linked ? "is-active" : ""} disabled={!writable} aria-label="Image link settings" title="Image link settings" aria-haspopup="dialog" aria-expanded={open} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(value => !value); setError(false); }}><StudioIcon name="link" size={24} /></button>
    {open && writable ? <StudioAnchoredPopover anchor={() => trigger.current} label="Image link settings" className="image-link-popover" focusOnMount ignoreOutside={target => Boolean(trigger.current?.contains(target))} onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}>
      <button className="image-link-close" type="button" aria-label="Close image link settings" title="Close" onClick={() => { setOpen(false); trigger.current?.focus(); }}><StudioIcon name="close" size={20} /></button>
      <ImageLinkSettings block={block} onChange={next => setError(!onChange(block, next))} />
      {error ? <p role="alert">The image changed. Reopen these settings to use its latest values.</p> : null}
    </StudioAnchoredPopover> : null}
  </>;
}
