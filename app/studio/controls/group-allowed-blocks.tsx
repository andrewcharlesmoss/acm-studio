"use client";

import { useRef, useState } from "react";
import { GROUP_ALLOWED_BLOCK_TYPES, GROUP_SELECTABLE_BLOCK_TYPES, type GroupAllowedBlockType } from "../../content/model";
import { blockCatalogue } from "../editor-model";
import { CheckboxControl } from "./checkbox-control";
import { StudioButton } from "./button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";

const allowedBlockOptions = GROUP_SELECTABLE_BLOCK_TYPES.map(type => ({
  type,
  label: blockCatalogue.find(item => item.type === type)?.label ?? type,
}));

export function GroupAllowedBlocksControl({ value, onChange }: {
  value: GroupAllowedBlockType[] | undefined;
  onChange: (value: GroupAllowedBlockType[] | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GroupAllowedBlockType[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = value ?? [...GROUP_SELECTABLE_BLOCK_TYPES];
  const unrestricted = value === undefined;

  function openDialog() {
    setDraft([...selected]);
    setOpen(true);
  }

  function apply() {
    const next = [
      ...GROUP_SELECTABLE_BLOCK_TYPES.filter(type => draft.includes(type)),
      ...(value ?? []).filter(type => !GROUP_SELECTABLE_BLOCK_TYPES.includes(type)),
    ];
    const allCurrentOptionsSelected = GROUP_SELECTABLE_BLOCK_TYPES.every(type => draft.includes(type));
    const allStoredTypesSelected = GROUP_ALLOWED_BLOCK_TYPES.every(type => next.includes(type));
    onChange((value === undefined && allCurrentOptionsSelected) || allStoredTypesSelected ? undefined : next);
    setOpen(false);
  }

  return <div className="group-allowed-blocks-control">
    <p className="setting-note">{unrestricted ? "All supported block types are allowed." : `${selected.length} block type${selected.length === 1 ? " is" : "s are"} allowed.`}</p>
    <StudioButton type="button" variant="secondary" onClick={event => { trigger.current = event.currentTarget; openDialog(); }}>Manage allowed blocks</StudioButton>
    {!unrestricted ? <StudioButton type="button" variant="text" onClick={() => onChange(undefined)}>Allow all block types</StudioButton> : null}
    {open ? <StudioDialog title="Manage allowed blocks" className="group-allowed-blocks-dialog" returnFocus={trigger} onClose={() => setOpen(false)}>
      <p>Choose which block types can be added to this Group. Existing blocks stay in place.</p>
      <div className="group-allowed-blocks-list" role="group" aria-label="Allowed block types">
        {allowedBlockOptions.map(option => <CheckboxControl key={option.type} checked={draft.includes(option.type)} onChange={checked => setDraft(current => checked
          ? [...current, option.type]
          : current.filter(type => type !== option.type))} label={option.label} />)}
      </div>
      <StudioDialogActions>
        <StudioButton type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</StudioButton>
        <StudioButton type="button" onClick={apply}>Apply</StudioButton>
      </StudioDialogActions>
    </StudioDialog> : null}
  </div>;
}
