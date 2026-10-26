"use client";

import { TextInput } from "../../controls/native-fields";
import { useRef, useState } from "react";
import { StudioAnchoredPopover } from "../../overlays/anchored-popover";
import { PopoverHeading } from "../../overlays/popover-heading";
import { StudioDialog } from "../../overlays/dialog";
import { ImageChoiceGrid } from "../../controls/image-choice-grid";

function fixtureImage(background: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="${background}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
const images = [
  { id: "sky", name: "Sky example", src: fixtureImage("#cbe8f4") },
  { id: "leaf", name: "Leaf example", src: fixtureImage("#b7d7bc") },
];
const urls = Object.fromEntries(images.map(image => [image.id, image.src]));

/** Production overlay composition with temporary fixtures and no product stores. */
export function OverlaySpecimen() {
  const trigger = useRef<HTMLButtonElement>(null);
  const childTrigger = useRef<HTMLButtonElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [child, setChild] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("None");
  function close(restore: boolean) { setOpen(false); setChild(false); if (restore) trigger.current?.focus(); }
  return <div>
    <button ref={trigger} type="button" aria-expanded={open} onClick={() => open ? close(true) : setOpen(true)}>Open overlay example</button>
    <p role="status">Selected image: {choice}</p>
    {open ? <StudioAnchoredPopover anchor={() => trigger.current} label="Parent example" focusOnMount className="ui-overlay-example" onClose={close}>
      <PopoverHeading closeLabel="Close parent example" onClose={() => close(true)}>Parent example</PopoverHeading>
      <label>Temporary value<TextInput value={text} onChange={event => setText(event.target.value)} /></label>
      <button ref={childTrigger} type="button" onClick={() => setChild(true)}>Open child popup</button>
      <button ref={dialogTrigger} type="button" onClick={() => setDialog(true)}>Open image dialog</button>
      {child ? <StudioAnchoredPopover anchor={() => childTrigger.current} label="Child example" focusOnMount className="ui-overlay-example" onClose={restore => { setChild(false); if (restore) childTrigger.current?.focus(); }}>
        <PopoverHeading closeLabel="Close child example" onClose={() => { setChild(false); childTrigger.current?.focus(); }}>Child example</PopoverHeading>
        <label>Child value<TextInput defaultValue="Temporary child" /></label>
      </StudioAnchoredPopover> : null}
    </StudioAnchoredPopover> : null}
    {dialog ? <StudioDialog className="image-choice-dialog" title="Choose example image" returnFocus={dialogTrigger} onClose={() => setDialog(false)}><ImageChoiceGrid choices={images} urls={urls} onChoose={image => { setChoice(image.name); setDialog(false); }} /></StudioDialog> : null}
  </div>;
}
