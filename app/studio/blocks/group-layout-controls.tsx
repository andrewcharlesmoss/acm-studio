import { useState } from "react";
import { InspectorToolsSection } from "../inspector-tools-section";
import { AcmIcon } from "@acm/icons/react";
import { groupFlexAlignment, groupHorizontalChoices as horizontal, groupUsesContentWidth, type GroupAlignmentChoice as Choice } from "./group-layout-alignment";
import type { ContentBlock } from "../../content/model";
import { ToggleSetting } from "../controls/toggle-setting";
import { NumberUnitField } from "../controls/number-unit-field";

import { RangeControl } from "../controls/range-control";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;
function AlignmentChoices({ label, choices, value, onChange }: { label: string; choices: Choice[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="group-alignment-control"><legend>{label}</legend><div role="group" aria-label={label}>{choices.map(choice => <button key={choice.value} type="button" aria-label={`${label}: ${choice.label}`} title={choice.label} aria-pressed={value === choice.value} onClick={() => onChange(choice.value)}><AcmIcon name={choice.icon} size={24} /></button>)}</div></fieldset>;
}
function ContentWidthControl({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)$/);
  const [emptyUnit, setUnit] = useState("px");
  const unit = match?.[2] ?? emptyUnit;
  const number = match ? match[1] : "";
  return <div className="group-grid-minimum"><span>{label}</span><NumberUnitField inputProps={{ "aria-label": label, value: number, min: 0, max: 4000, placeholder: "Inherit", step: "any", onChange: event => { const next = event.target.value; if (!next) onChange(undefined); else if (Number(next) >= 0 && Number(next) <= 4000) onChange(`${next}${unit}`); } }} unitProps={{ "aria-label": `${label} unit`, value: unit, onChange: event => { setUnit(event.target.value); if (number) onChange(`${number}${event.target.value}`); } }} units={["px", "rem", "em", "%", "ch", "vw", "vh"]} /></div>;
}
export function GroupLayoutControls({ block, onChange }: { block: GroupBlock; onChange: (block: ContentBlock) => void }) {
  const update = (changes: Partial<GroupBlock>) => onChange({ ...block, ...changes });
  const [requestedVisible, setVisible] = useState(() => new Set<string>([
    ...(block.contentSize ? ["content-width"] : []), ...(block.wideSize ? ["wide-width"] : []),
    ...(block.horizontalAlign ? ["justification"] : []), ...(block.allowWrap !== undefined ? ["wrapping"] : []),
    ...(block.columns && block.gridMode !== "manual" ? ["max-columns"] : []),
  ]));
  const visible = new Set([...requestedVisible,
    ...(block.contentSize ? ["content-width"] : []), ...(block.wideSize ? ["wide-width"] : []),
    ...(block.horizontalAlign ? ["justification"] : []), ...(block.allowWrap === true ? ["wrapping"] : []),
    ...(block.columns && block.gridMode !== "manual" ? ["max-columns"] : []),
  ]);
  const options = block.layout === "flow" ? [{ id: "content-width", label: "Content width" }, { id: "wide-width", label: "Wide width" }, { id: "justification", label: "Justification" }]
    : block.layout === "row" ? [{ id: "wrapping", label: "Allow wrapping" }]
    : block.layout === "grid" && block.gridMode !== "manual" ? [{ id: "max-columns", label: "Max. columns" }] : [];
  function wrap(children: React.ReactNode) { return <InspectorToolsSection title="Layout" options={options} visible={visible} alwaysShow canReset={[block.horizontalAlign, block.verticalAlign, block.contentSize, block.wideSize, block.columns, block.minColumnWidth, block.allowWrap].some(value => value !== undefined) || block.contentWidth === "full" || block.inheritLayout === false || block.gridMode === "manual" || block.minColumnWidthUnit !== undefined} onToggle={id => { if (visible.has(id)) { setVisible(current => { const next = new Set(current); next.delete(id); return next; }); const field = ({ "content-width": "contentSize", "wide-width": "wideSize", justification: "horizontalAlign", wrapping: "allowWrap", "max-columns": "columns" } as const)[id as "content-width" | "wide-width" | "justification" | "wrapping" | "max-columns"]; if (field === "allowWrap") update({ allowWrap: false }); else if (field) update({ [field]: undefined }); } else setVisible(current => new Set([...current, id])); }} onReset={() => { setVisible(new Set()); update({ horizontalAlign: undefined, verticalAlign: undefined, contentSize: undefined, wideSize: undefined, columns: undefined, minColumnWidth: block.layout === "grid" ? 12 : undefined, minColumnWidthUnit: block.layout === "grid" ? "rem" : undefined, gridMode: block.layout === "grid" ? "auto" : undefined, allowWrap: block.layout === "row" ? false : undefined, inheritLayout: true, contentWidth: undefined }); }}>{children}</InspectorToolsSection>; }
  if (block.layout === "columns") return wrap(<p className="setting-note">This saved Group uses the legacy Columns arrangement. Select Group, Row, Stack or Grid above to change its layout.</p>);
  if (block.layout === "flow") return wrap(<>
    <ToggleSetting label="Inner blocks use content width" checked={groupUsesContentWidth(block)} onChange={checked => update({ contentWidth: checked ? "constrained" : "full", inheritLayout: block.inheritLayout ?? true })} />
    <p className="setting-note">Nested blocks use content width with options for wide and full widths.</p>
    {groupUsesContentWidth(block) ? <>
      <div className="group-content-width-controls">{visible.has("content-width") ? <ContentWidthControl label="Content width" value={block.contentSize} onChange={contentSize => update({ contentSize, inheritLayout: false })} /> : null}{visible.has("wide-width") ? <ContentWidthControl label="Wide width" value={block.wideSize} onChange={wideSize => update({ wideSize, inheritLayout: false })} /> : null}</div>
      <p className="setting-note">Leave widths empty to inherit the enclosing layout.</p>
      {visible.has("justification") ? <AlignmentChoices label="Justification" choices={horizontal} value={block.horizontalAlign ?? "centre"} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} /> : null}
    </> : null}
  </>);
  if (block.layout === "grid") {
    const unit = block.minColumnWidthUnit ?? "px";
    const minimum = unit === "px" ? 80 : 1;
    return wrap(<>
      <fieldset className="group-grid-mode"><legend>Grid layout</legend><div role="group" aria-label="Grid layout">{(["auto", "manual"] as const).map(mode => <button key={mode} type="button" aria-pressed={(block.gridMode ?? "auto") === mode} onClick={() => update({ gridMode: mode })}>{mode === "auto" ? "Auto" : "Manual"}</button>)}</div></fieldset>
      {block.gridMode === "manual" ? <div className="group-grid-columns"><label htmlFor={`${block.id}-grid-columns`}>Columns</label><div><input id={`${block.id}-grid-columns`} type="number" min={1} max={6} value={block.columns ?? 3} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 6) update({ columns: value }); }} /><RangeControl className="studio-range-control" aria-label="Grid columns" min={1} max={6} value={block.columns ?? 3} onChange={event => update({ columns: Number(event.target.value) })} /></div></div> : <div className="group-grid-minimum"><span>Minimum column width</span><NumberUnitField inputProps={{ "aria-label": "Minimum column width", min: minimum, max: 600, step: unit === "px" ? 1 : 0.1, value: block.minColumnWidth ?? 192, onChange: event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= minimum && value <= 600) update({ minColumnWidth: value }); } }} unitProps={{ "aria-label": "Minimum column width unit", value: unit, onChange: event => update({ minColumnWidthUnit: event.target.value as GroupBlock["minColumnWidthUnit"], minColumnWidth: event.target.value === "px" ? 192 : 12 }) }} units={["px", "em", "rem", "vw"]} /></div>}
      {block.gridMode !== "manual" && visible.has("max-columns") ? <label>Max. columns<input type="number" aria-label="Maximum grid columns" min={1} max={6} value={block.columns ?? ""} placeholder="Auto" onChange={event => { const value = Number(event.target.value); if (!event.target.value) update({ columns: undefined }); else if (Number.isInteger(value) && value >= 1 && value <= 6) update({ columns: value }); }} /></label> : null}
      <p className="setting-note">{block.gridMode === "manual" ? "Specify the number of columns in the grid." : "The number of columns adjusts automatically to the available space."}</p>
    </>);
  }
  const row = block.layout === "row";
  const alignment = groupFlexAlignment(block);
  return wrap(<>
    <AlignmentChoices label={alignment.horizontal.label} choices={alignment.horizontal.choices} value={alignment.horizontal.value} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} />
    <AlignmentChoices label={alignment.vertical.label} choices={alignment.vertical.choices} value={alignment.vertical.value} onChange={value => update({ verticalAlign: value as GroupBlock["verticalAlign"] })} />
    {row && visible.has("wrapping") ? <ToggleSetting label="Allow to wrap to multiple lines" checked={block.allowWrap !== false} onChange={allowWrap => update({ allowWrap })} /> : null}
  </>);
}
