"use client";

import { useRef, useState } from "react";
import { GROUP_ALLOWED_BLOCK_TYPES, GROUP_SELECTABLE_BLOCK_TYPES, type GroupAllowedBlockType } from "../../content/model";
import { blockCatalogue } from "../editor-model";
import { CheckboxControl } from "./checkbox-control";
import { StudioButton } from "./button";
import { StudioDialog, StudioDialogActions } from "../overlays/dialog";
import { SearchInput } from "./native-fields";
import { SettingLabel } from "./setting-inheritance";

const allowedBlockOptions = GROUP_SELECTABLE_BLOCK_TYPES.map(type => ({
  type,
  label: blockCatalogue.find(item => item.type === type)?.label ?? type,
  group: blockCatalogue.find(item => item.type === type)?.group ?? "Other",
}));

export function filterGroupAllowedBlockOptions(query: string) {
  return allowedBlockOptions.filter(option => `${option.label} ${option.type}`.toLowerCase().includes(query.trim().toLowerCase()));
}

export function toggleGroupAllowedBlockTypes(current: readonly GroupAllowedBlockType[], types: readonly GroupAllowedBlockType[], checked: boolean): GroupAllowedBlockType[] {
  return checked ? [...new Set([...current, ...types])] : current.filter(type => !types.includes(type));
}

export function groupAllowedBlockValue(previous: GroupAllowedBlockType[] | undefined, draft: GroupAllowedBlockType[]) {
  const next = [...GROUP_SELECTABLE_BLOCK_TYPES.filter(type => draft.includes(type)), ...(previous ?? []).filter(type => !GROUP_SELECTABLE_BLOCK_TYPES.includes(type))];
  const allCurrentOptionsSelected = GROUP_SELECTABLE_BLOCK_TYPES.every(type => draft.includes(type));
  const allStoredTypesSelected = GROUP_ALLOWED_BLOCK_TYPES.every(type => next.includes(type));
  return (previous === undefined && allCurrentOptionsSelected) || allStoredTypesSelected ? undefined : next;
}

export function GroupAllowedBlocksControl({ value, onChange }: {
  value: GroupAllowedBlockType[] | undefined;
  onChange: (value: GroupAllowedBlockType[] | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GroupAllowedBlockType[]>([]);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = value ?? [...GROUP_SELECTABLE_BLOCK_TYPES];
  const filteredOptions = filterGroupAllowedBlockOptions(query);
  const groups = [...new Set(filteredOptions.map(option => option.group))];

  function toggleTypes(types: readonly GroupAllowedBlockType[], checked: boolean) {
    setDraft(current => toggleGroupAllowedBlockTypes(current, types, checked));
  }

  function openDialog() {
    setDraft([...selected]);
    setQuery("");
    setOpen(true);
  }

  function apply() {
    onChange(groupAllowedBlockValue(value, draft));
    setOpen(false);
  }

  return <div className="group-allowed-blocks-control">
    <SettingLabel>Allowed Blocks</SettingLabel>
    <StudioButton type="button" variant="secondary" onClick={event => { trigger.current = event.currentTarget; openDialog(); }}>Manage allowed blocks</StudioButton>
    <p className="setting-note">Specify which blocks are allowed inside this container.</p>
    {open ? <StudioDialog title="Manage allowed blocks" className="group-allowed-blocks-dialog" returnFocus={trigger} onClose={() => setOpen(false)}>
      <p>Select which blocks can be added inside this container.</p>
      <label><span>Search for a block</span><SearchInput aria-label="Search for a block" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <CheckboxControl label="Select all" checked={GROUP_SELECTABLE_BLOCK_TYPES.every(type => draft.includes(type))} indeterminate={draft.length > 0 && !GROUP_SELECTABLE_BLOCK_TYPES.every(type => draft.includes(type))} onChange={checked => toggleTypes(GROUP_SELECTABLE_BLOCK_TYPES, checked)} />
      <div className="group-allowed-blocks-list" role="region" aria-label="Available block types">
        {groups.map(group => {
          const types = allowedBlockOptions.filter(option => option.group === group).map(option => option.type);
          const selectedCount = types.filter(type => draft.includes(type)).length;
          return <fieldset key={group}><legend><CheckboxControl label={group} checked={selectedCount === types.length} indeterminate={selectedCount > 0 && selectedCount < types.length} onChange={checked => toggleTypes(types, checked)} /></legend><ul>{filteredOptions.filter(option => option.group === group).map(option => <li key={option.type}><CheckboxControl checked={draft.includes(option.type)} onChange={checked => toggleTypes([option.type], checked)} label={option.label} /></li>)}</ul></fieldset>;
        })}
        {!filteredOptions.length ? <p>No blocks found.</p> : null}
      </div>
      <StudioDialogActions>
        <StudioButton type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</StudioButton>
        <StudioButton type="button" onClick={apply}>Apply</StudioButton>
      </StudioDialogActions>
    </StudioDialog> : null}
  </div>;
}
