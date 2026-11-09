import { NumberInput, TextInput } from "../controls/native-fields";
import { RadioGroup } from "../controls/radio-group";
import { RangeControl } from "../controls/range-control";
import { useState } from "react";
import { InspectorToolsSection } from "../inspector-tools-section";
import { AcmIcon } from "@acm/icons/react";
import { groupFlexAlignment, groupHorizontalChoices, groupUsesContentWidth, type GroupAlignmentChoice as Choice } from "./group-layout-alignment";
import type { ContentBlock } from "../../content/model";
import { ToggleSetting } from "../controls/toggle-setting";
import { NumberUnitField } from "../controls/number-unit-field";

import { changeGroupOrientation, resetGroupLayout, updateGroupGridOptions } from "./group-variations";
import { GROUP_DIMENSION_UNITS, GROUP_LAYOUT_CONTROL_CONTRACT, groupLayoutControlsFor, groupLayoutMenuActionsFor, groupLayoutRequiredMenuFor } from "./group-layout-contract";

import { GROUP_GRID_VALUE_LIMITS } from "../../content/layout";

type GroupBlock = Extract<ContentBlock, { type: "group" }>;
function AlignmentChoices({ label, choices, value, onChange }: { label: string; choices: Choice[]; value: string; onChange: (value: string) => void }) {
  return <div className="group-alignment-control"><RadioGroup label={label} presentation="outline" value={value} options={choices.map(choice => ({ value: choice.value, label: <AcmIcon name={choice.icon} size={24} className={label === "Orientation" && choice.value === "stack" ? "group-orientation-vertical" : undefined} />, accessibleName: choice.label, title: choice.label }))} onChange={onChange} /></div>;
}
function ContentWidthControl({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  const match = value?.match(/^(\d+(?:\.\d+)?)(px|rem|em|%|ch|vw|vh)$/);
  const [emptyUnit, setUnit] = useState("px");
  const unit = match?.[2] ?? emptyUnit;
  const number = match ? match[1] : "";
  return <div className="group-grid-minimum"><span>{label}</span><NumberUnitField inputProps={{ "aria-label": label, value: number, min: 0, max: 4000, placeholder: "Inherit", step: "any", onChange: event => { const next = event.target.value; if (!next) onChange(undefined); else if (Number(next) >= 0 && Number(next) <= 4000) onChange(`${next}${unit}`); } }} unitProps={{ "aria-label": `${label} unit`, value: unit, onChange: event => { setUnit(event.target.value); if (number) onChange(`${number}${event.target.value}`); } }} units={GROUP_DIMENSION_UNITS} /></div>;
}
export function GroupLayoutControls({ block, onChange, navigation = false }: { block: GroupBlock; onChange: (block: ContentBlock) => void; navigation?: boolean }) {
  const update = (changes: Partial<GroupBlock>) => onChange({ ...block, ...changes });
  const hasVisibleAlignment = block.verticalAlign !== undefined && (block.layout === "row" ? block.verticalAlign !== "centre" : block.layout === "stack" ? block.verticalAlign !== "top" : true);
  const authoredVisible = [
    ...(block.contentSize ? ["content-width"] : []), ...(block.wideSize ? ["wide-width"] : []),
    ...(block.layout === "flow" && block.horizontalAlign ? ["justification"] : []),
    ...(block.fillAvailableSpace === true ? ["fill-available-space"] : []),
    ...((block.layout === "row" ? block.allowWrap === true : block.allowWrap === false) ? ["wrapping"] : []),
    ...(hasVisibleAlignment ? ["alignment"] : []),
  ];
  const [requestedVisible, setVisible] = useState(() => new Set<string>());
  const visible = new Set([
    ...(block.layout === "row" || block.layout === "stack" ? ["justification", "orientation"] : []),
    ...requestedVisible,
    ...authoredVisible,
  ]);
  const layoutContract = block.layout === "flow" || block.layout === "row" || block.layout === "stack" || block.layout === "grid" ? GROUP_LAYOUT_CONTROL_CONTRACT[block.layout] : null;
  const options = groupLayoutControlsFor(block.layout, block);
  const menuOptions = [...groupLayoutMenuActionsFor(block), ...(layoutContract ? groupLayoutRequiredMenuFor(block) : [])];
  function resetOption(id: string) {
    if (id === "alignment") update({ verticalAlign: undefined });
    else if (id === "wrapping") update({ allowWrap: block.layout === "row" ? false : true });
    else if (id === "content-width") update({ contentSize: undefined });
    else if (id === "wide-width") update({ wideSize: undefined });
    else if (id === "fill-available-space") updateGridDefaults({ fillAvailableSpace: false });
    else if (id === "justification") update({ horizontalAlign: block.layout === "stack" ? "left" : undefined });
  }
  function updateGridDefaults(changes: Partial<GroupBlock>) { onChange(updateGroupGridOptions(block, changes)); }
  const resettableOptions = new Set([
    ...(block.verticalAlign !== undefined ? ["alignment"] : []),
    ...((block.layout === "row" ? block.allowWrap === true : block.allowWrap === false) ? ["wrapping"] : []),
    ...(block.contentSize !== undefined ? ["content-width"] : []),
    ...(block.wideSize !== undefined ? ["wide-width"] : []),
    ...(block.fillAvailableSpace === true ? ["fill-available-space"] : []),
    ...(block.horizontalAlign !== undefined && !(block.layout === "stack" && block.horizontalAlign === "left") ? ["justification"] : []),
  ]);
  function wrap(children: React.ReactNode) {
    return <InspectorToolsSection showCloseControl={false} title="Layout" options={options} visible={visible} alwaysShow
      canReset={resettableOptions.size > 0 || block.columns !== undefined || block.minColumnWidth !== undefined && (block.minColumnWidth !== 12 || block.minColumnWidthUnit !== "rem") || block.contentWidth === "full" || block.inheritLayout === false}
      resettableOptions={resettableOptions} onResetOption={resetOption} menuOptions={menuOptions}
      onMenuOptionSelect={id => {
        if (id === "reset-content-width") update({ contentWidth: undefined, inheritLayout: true, contentSize: undefined, wideSize: undefined });
        else if (id === "reset-justification") resetOption("justification");
        else if (id === "reset-grid-columns") updateGridDefaults({ columns: undefined });
        else if (id === "reset-grid-minimum") updateGridDefaults({ minColumnWidth: 12, minColumnWidthUnit: "rem" });
      }}
      onToggle={id => {
        if (visible.has(id)) resetOption(id);
        setVisible(current => { const next = new Set(current); if (visible.has(id)) next.delete(id); else next.add(id); return next; });
      }}
      onReset={() => { setVisible(new Set()); onChange(resetGroupLayout(block)); }}>{children}</InspectorToolsSection>;
  }
  if (block.tagName === "details") return wrap(<>
    <label><span>Summary</span><TextInput aria-label="Details summary" value={block.detailsSummary ?? "Details"} onChange={event => update({ detailsSummary: event.target.value })} /></label>
    <ToggleSetting label="Open by default" checked={block.openByDefault === true} onChange={openByDefault => update({ openByDefault: openByDefault || undefined })} />
    <p className="setting-note">Content blocks remain available inside the disclosure.</p>
  </>);
  if (navigation) return <InspectorToolsSection title="Layout" options={[{ id: "wrapping", label: "Wrapping" }, { id: "spacing", label: "Block spacing" }]} visible={new Set(["justification", "orientation", ...visible])} alwaysShow canReset={block.horizontalAlign !== undefined || block.layout !== "row" || block.allowWrap === false || block.gap !== undefined} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={() => { setVisible(new Set()); update({ layout: "row", horizontalAlign: "left", allowWrap: true, gap: undefined }); }}>
    <div className="group-flex-layout-controls">
      <AlignmentChoices label="Justification" choices={groupFlexAlignment({ ...block, layout: "row" }).horizontal.choices} value={block.horizontalAlign ?? "left"} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} />
      <AlignmentChoices label="Orientation" choices={[{ value: "row", label: "Horizontal", icon: "navigation.forward" }, { value: "stack", label: "Vertical", icon: "navigation.forward" }]} value={block.layout} onChange={value => update({ layout: value as "row" | "stack" })} />
    </div>
    {(block.layout === "row" || block.layout === "stack") && visible.has("wrapping") ? <ToggleSetting label="Allow to wrap to multiple lines" checked={block.allowWrap !== false} onChange={allowWrap => update({ allowWrap })} /> : null}
    {requestedVisible.has("spacing") ? <label>Block Spacing (px)<NumberInput  min={0} max={120} value={block.gap ?? 16} onChange={event => { const gap = Number(event.target.value); if (Number.isFinite(gap) && gap >= 0 && gap <= 120) update({ gap }); }} /></label> : null}
  </InspectorToolsSection>;
  if (block.layout === "columns") return wrap(<p className="setting-note">This saved Group uses the legacy Columns arrangement. Select Group, Row, Stack or Grid above to change its layout.</p>);
  if (block.layout === "flow") return wrap(<>
    <ToggleSetting label="Inner blocks use content width" checked={groupUsesContentWidth(block)} onChange={checked => update({ contentWidth: checked ? "constrained" : "full", inheritLayout: block.inheritLayout ?? true })} />
    <p className="setting-note">Nested blocks use content width with options for full and wide widths.</p>
    {groupUsesContentWidth(block) ? <>
      {visible.has("justification") ? <AlignmentChoices label="Justification" choices={groupHorizontalChoices} value={block.horizontalAlign ?? "centre"} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} /> : null}
      <div className="group-content-width-controls">{visible.has("content-width") ? <ContentWidthControl label="Content width" value={block.contentSize} onChange={contentSize => update({ contentSize, inheritLayout: false })} /> : null}{visible.has("wide-width") ? <ContentWidthControl label="Wide width" value={block.wideSize} onChange={wideSize => update({ wideSize, inheritLayout: false })} /> : null}</div>
      {visible.has("content-width") || visible.has("wide-width") ? <p className="setting-note">Leave widths empty to inherit the enclosing layout.</p> : null}
    </> : null}
  </>);
  if (block.layout === "grid") {
    const unit = block.minColumnWidthUnit ?? "px";
    const minimum = 0;
    const updateGrid = (changes: Partial<GroupBlock>) => onChange(updateGroupGridOptions(block, changes));
    return wrap(<>
      <div className="group-grid-range-control"><label><span>Max. columns</span><NumberInput aria-label="Max. columns" min={1} max={GROUP_GRID_VALUE_LIMITS.columns[1]} value={block.columns ?? ""} onChange={event => { const value = Number(event.target.value); if (!event.target.value) updateGrid({ columns: undefined }); else if (Number.isInteger(value) && value >= 1 && value <= GROUP_GRID_VALUE_LIMITS.columns[1]) updateGrid({ columns: value }); }} /></label><RangeControl aria-label="Max. columns" min={1} max={GROUP_GRID_VALUE_LIMITS.columns[1]} value={block.columns ?? 1} onChange={event => updateGrid({ columns: Number(event.target.value) })} /></div>
      <div className="group-grid-range-control"><div className="group-grid-minimum"><span>Min. column width</span><NumberUnitField inputProps={{ "aria-label": "Min. column width", min: minimum, max: 600, step: "any", value: block.minColumnWidth ?? (unit === "px" ? 192 : 12), onChange: event => { const value = Number(event.target.value); if (!event.target.value) updateGrid({ minColumnWidth: undefined }); else if (Number.isFinite(value) && value >= minimum && value <= 600) updateGrid({ minColumnWidth: value }); } }} unitProps={{ "aria-label": "Min. column width unit", value: unit, onChange: event => updateGrid({ minColumnWidthUnit: event.target.value as GroupBlock["minColumnWidthUnit"], minColumnWidth: block.minColumnWidth ?? 0 }) }} units={["px", "rem", "em"]} /></div><RangeControl aria-label="Min. column width" min={0} max={unit === "px" ? 600 : 38} value={block.minColumnWidth ?? (unit === "px" ? 192 : 12)} onChange={event => updateGrid({ minColumnWidth: Number(event.target.value) })} /></div>
      {visible.has("fill-available-space") ? <ToggleSetting label="Fill available space" checked={block.fillAvailableSpace === true} onChange={fillAvailableSpace => updateGrid({ fillAvailableSpace })} /> : null}
      <p className="setting-note">Columns will wrap to fewer per row when they can no longer maintain the minimum width.</p>
    </>);
  }
  const alignment = groupFlexAlignment(block);
  const justification = alignment.horizontal;
  const crossAxis = alignment.vertical;
  return wrap(<>
    <div className="group-flex-layout-controls">
    <AlignmentChoices label="Justification" choices={justification.choices.map(choice => choice.value === "stretch" ? { ...choice, label: "Stretch items" } : choice)} value={justification.value} onChange={value => update({ horizontalAlign: value as GroupBlock["horizontalAlign"] })} />
    <AlignmentChoices label="Orientation" choices={[
      { value: "row", label: "Horizontal", icon: "navigation.forward" },
      { value: "stack", label: "Vertical", icon: "navigation.forward" },
    ]} value={block.layout} onChange={value => {
      const layout = value as "row" | "stack";
      if (layout === block.layout) return;
      onChange(changeGroupOrientation(block, layout));
    }} />
    </div>
    {visible.has("alignment") ? <AlignmentChoices label="Alignment" choices={crossAxis.choices.map(choice => choice.value === "space-between" ? { ...choice, label: "Space between" } : choice)} value={crossAxis.value} onChange={value => update({ verticalAlign: value as GroupBlock["verticalAlign"] })} /> : null}
    {visible.has("wrapping") ? <ToggleSetting label="Allow to wrap to multiple lines" checked={block.allowWrap !== false} onChange={allowWrap => update({ allowWrap })} /> : null}
  </>);
}
