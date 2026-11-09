import { NumberInput, TextInput } from "../controls/native-fields";
import { useState } from "react";
import { InspectorToolsSection } from "../inspector-tools-section";
import { AcmIcon } from "@acm/icons/react";
import { groupFlexAlignment, groupHorizontalChoices, groupUsesContentWidth, type GroupAlignmentChoice as Choice } from "./group-layout-alignment";
import type { ContentBlock } from "../../content/model";
import { ToggleSetting } from "../controls/toggle-setting";
import { NumberUnitField } from "../controls/number-unit-field";

import { changeGroupLayout, resetGroupLayout, updateGroupGridOptions } from "./group-variations";
import { GROUP_LAYOUT_CONTROL_CONTRACT, groupLayoutControlsFor, groupLayoutMenuActionsFor, groupLayoutRequiredMenuFor } from "./group-layout-contract";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;
function AlignmentChoices({ label, choices, value, onChange }: { label: string; choices: Choice[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="group-alignment-control"><legend>{label}</legend><div role="group" aria-label={label}>{choices.map(choice => <button key={choice.value} type="button" data-value={choice.value} aria-label={`${label}: ${choice.label}`} title={choice.label} aria-pressed={value === choice.value} onClick={() => onChange(choice.value)}><AcmIcon name={choice.icon} size={24} /></button>)}</div></fieldset>;
}
function ContentWidthControl({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)$/);
  const [emptyUnit, setUnit] = useState("px");
  const unit = match?.[2] ?? emptyUnit;
  const number = match ? match[1] : "";
  return <div className="group-grid-minimum"><span>{label}</span><NumberUnitField inputProps={{ "aria-label": label, value: number, min: 0, max: 4000, placeholder: "Inherit", step: "any", onChange: event => { const next = event.target.value; if (!next) onChange(undefined); else if (Number(next) >= 0 && Number(next) <= 4000) onChange(`${next}${unit}`); } }} unitProps={{ "aria-label": `${label} unit`, value: unit, onChange: event => { setUnit(event.target.value); if (number) onChange(`${number}${event.target.value}`); } }} units={["px", "rem", "em", "%", "ch", "vw", "vh"]} /></div>;
}
export function GroupLayoutControls({ block, onChange, navigation = false }: { block: GroupBlock; onChange: (block: ContentBlock) => void; navigation?: boolean }) {
  const update = (changes: Partial<GroupBlock>) => onChange({ ...block, ...changes });
  const crossAxisAlignment = block.layout === "stack" ? block.horizontalAlign : block.verticalAlign;
  const hasVisibleAlignment = crossAxisAlignment !== undefined && (block.layout === "row" ? crossAxisAlignment !== "centre" : block.layout === "stack" ? crossAxisAlignment !== "left" : true);
  const [requestedVisible, setVisible] = useState(() => new Set<string>([
    ...(block.contentSize ? ["content-width"] : []), ...(block.wideSize ? ["wide-width"] : []),
    ...(block.layout === "flow" && block.horizontalAlign ? ["justification"] : []),
    ...(block.fillAvailableSpace === true ? ["fill-available-space"] : []),
    ...(block.allowWrap === false ? ["wrapping"] : []),
    ...(hasVisibleAlignment ? ["alignment"] : []),
  ]));
  const visible = new Set([
    ...(block.layout === "row" || block.layout === "stack" ? ["justification", "orientation"] : []),
    ...requestedVisible,
  ]);
  const layoutContract = block.layout === "flow" || block.layout === "row" || block.layout === "stack" || block.layout === "grid" ? GROUP_LAYOUT_CONTROL_CONTRACT[block.layout] : null;
  const options = groupLayoutControlsFor(block.layout, block);
  const menuOptions = [...groupLayoutMenuActionsFor(block), ...(layoutContract ? groupLayoutRequiredMenuFor(block) : [])];
  function wrap(children: React.ReactNode) { return <InspectorToolsSection title="Layout" options={options} visible={visible} alwaysShow canReset={[block.horizontalAlign, block.verticalAlign, block.contentSize, block.wideSize, block.columns, block.minColumnWidth, block.allowWrap, block.fillAvailableSpace].some(value => value !== undefined) || block.contentWidth === "full" || block.inheritLayout === false || block.minColumnWidthUnit !== undefined || block.layout === "grid" && (block.gridMode !== "auto" || block.fillAvailableSpace !== false || block.minColumnWidth !== 12 || block.minColumnWidthUnit !== "rem") || block.tagName === "details" && (block.detailsSummary !== "Details" || block.openByDefault === true)} menuOptions={menuOptions} onMenuOptionSelect={id => { if (id === "reset-content-width") update({ contentWidth: undefined, inheritLayout: true, contentSize: undefined, wideSize: undefined }); else if (id === "reset-justification") update(block.layout === "stack" ? { verticalAlign: undefined } : { horizontalAlign: undefined }); }} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => { setVisible(new Set()); onChange(resetGroupLayout(block)); }}>{children}</InspectorToolsSection>; }
  if (block.tagName === "details") return wrap(<>
    <label><span>Summary</span><TextInput aria-label="Details summary" value={block.detailsSummary ?? "Details"} onChange={event => update({ detailsSummary: event.target.value })} /></label>
    <ToggleSetting label="Open by default" checked={block.openByDefault === true} onChange={openByDefault => update({ openByDefault: openByDefault || undefined })} />
    <p className="setting-note">Content blocks remain available inside the disclosure.</p>
  </>);
  if (navigation) return <InspectorToolsSection title="Layout" options={[{ id: "wrapping", label: "Wrapping" }, { id: "spacing", label: "Block spacing" }]} visible={new Set(["justification", "orientation", ...requestedVisible])} alwaysShow canReset={block.horizontalAlign !== undefined || block.layout !== "row" || block.allowWrap === false || block.gap !== undefined} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => { setVisible(new Set()); update({ layout: "row", horizontalAlign: "left", allowWrap: true, gap: undefined }); }}>
    <div className="group-flex-layout-controls">
      <AlignmentChoices label="Justification" choices={groupFlexAlignment({ ...block, layout: "row" }).horizontal.choices} value={block.horizontalAlign ?? "left"} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} />
      <AlignmentChoices label="Orientation" choices={[{ value: "row", label: "Horizontal", icon: "navigation.forward" }, { value: "stack", label: "Vertical", icon: "navigation.forward" }]} value={block.layout} onChange={value => update({ layout: value as "row" | "stack" })} />
    </div>
    {(block.layout === "row" || block.layout === "stack") && requestedVisible.has("wrapping") ? <ToggleSetting label="Allow to wrap to multiple lines" checked={block.allowWrap !== false} onChange={allowWrap => update({ allowWrap })} /> : null}
    {requestedVisible.has("spacing") ? <label>Block Spacing (px)<NumberInput  min={0} max={120} value={block.gap ?? 16} onChange={event => { const gap = Number(event.target.value); if (Number.isFinite(gap) && gap >= 0 && gap <= 120) update({ gap }); }} /></label> : null}
  </InspectorToolsSection>;
  if (block.layout === "columns") return wrap(<p className="setting-note">This saved Group uses the legacy Columns arrangement. Select Group, Row, Stack or Grid above to change its layout.</p>);
  if (block.layout === "flow") return wrap(<>
    <ToggleSetting label="Inner blocks use content width" checked={groupUsesContentWidth(block)} onChange={checked => update({ contentWidth: checked ? "constrained" : "full", inheritLayout: block.inheritLayout ?? true })} />
    <p className="setting-note">Nested blocks use content width with options for wide and full widths.</p>
    {groupUsesContentWidth(block) ? <>
      {visible.has("justification") ? <AlignmentChoices label="Justification" choices={groupHorizontalChoices} value={block.horizontalAlign ?? "centre"} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} /> : null}
      <div className="group-content-width-controls">{visible.has("content-width") ? <ContentWidthControl label="Content width" value={block.contentSize} onChange={contentSize => update({ contentSize, inheritLayout: false })} /> : null}{visible.has("wide-width") ? <ContentWidthControl label="Wide width" value={block.wideSize} onChange={wideSize => update({ wideSize, inheritLayout: false })} /> : null}</div>
      <p className="setting-note">Leave widths empty to inherit the enclosing layout.</p>
    </> : null}
  </>);
  if (block.layout === "grid") {
    const unit = block.minColumnWidthUnit ?? "px";
    const minimum = unit === "px" ? 80 : 1;
    const updateGrid = (changes: Partial<GroupBlock>) => onChange(updateGroupGridOptions(block, changes));
    return wrap(<>
      <label><span>Max. columns</span><NumberInput aria-label="Max. columns" min={1} max={6} value={block.columns ?? ""} onChange={event => { const value = Number(event.target.value); if (!event.target.value) updateGrid({ columns: undefined }); else if (Number.isInteger(value) && value >= 1 && value <= 6) updateGrid({ columns: value }); }} /></label>
      <div className="group-grid-minimum"><span>Min. column width</span><NumberUnitField inputProps={{ "aria-label": "Min. column width", min: minimum, max: 600, step: unit === "px" ? 1 : 0.1, value: block.minColumnWidth ?? (unit === "px" ? 192 : 12), onChange: event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= minimum && value <= 600) updateGrid({ minColumnWidth: value }); } }} unitProps={{ "aria-label": "Min. column width unit", value: unit, onChange: event => updateGrid({ minColumnWidthUnit: event.target.value as GroupBlock["minColumnWidthUnit"], minColumnWidth: event.target.value === "px" ? 192 : 12 }) }} units={["px", "rem", "em"]} /></div>
      {visible.has("fill-available-space") ? <ToggleSetting label="Fill available space" checked={block.fillAvailableSpace === true} onChange={fillAvailableSpace => updateGrid({ fillAvailableSpace })} /> : null}
      <p className="setting-note">Columns wrap to fit the available space while respecting the maximum count and minimum width.</p>
    </>);
  }
  const alignment = groupFlexAlignment(block);
  const justification = block.layout === "row" ? alignment.horizontal : alignment.vertical;
  const crossAxis = block.layout === "row" ? alignment.vertical : alignment.horizontal;
  return wrap(<>
    <div className="group-flex-layout-controls">
    <AlignmentChoices label="Justification" choices={justification.choices.map(choice => choice.value === "stretch" ? { ...choice, label: "Stretch items" } : choice)} value={justification.value} onChange={value => update(block.layout === "row" ? { horizontalAlign: value as GroupBlock["horizontalAlign"] } : { verticalAlign: value as GroupBlock["verticalAlign"] })} />
    <AlignmentChoices label="Orientation" choices={[
      { value: "row", label: "Horizontal", icon: "navigation.forward" },
      { value: "stack", label: "Vertical", icon: "navigation.forward" },
    ]} value={block.layout} onChange={value => {
      const layout = value as "row" | "stack";
      if (layout === block.layout) return;
      const next = changeGroupLayout(block, layout);
      // Flex orientations support different distribution values on each axis.
      if (layout === "row") {
        if (next.horizontalAlign === "stretch") next.horizontalAlign = "left";
        if (next.verticalAlign === "space-between") next.verticalAlign = "centre";
      } else {
        if (next.horizontalAlign === "space-between") next.horizontalAlign = "left";
        if (next.verticalAlign === "stretch") next.verticalAlign = "top";
      }
      onChange(next);
    }} />
    </div>
    {visible.has("alignment") ? <AlignmentChoices label="Alignment" choices={crossAxis.choices.filter(choice => choice.value !== "space-between").map(choice => choice.value === "stretch" ? { ...choice, label: "Stretch to fill" } : choice)} value={crossAxis.value} onChange={value => update(block.layout === "row" ? { verticalAlign: value as GroupBlock["verticalAlign"] } : { horizontalAlign: value as GroupBlock["horizontalAlign"] })} /> : null}
    {visible.has("wrapping") ? <ToggleSetting label="Allow to wrap to multiple lines" checked={block.allowWrap !== false} onChange={allowWrap => update({ allowWrap })} /> : null}
  </>);
}
