"use client";

import type { ContentBlock, ListBlock } from "../../content/model";
import { InspectorToolsSection, type InspectorMenuOption } from "../inspector-tools-section";
import { ToggleSetting } from "../controls/toggle-setting";
import { resetListSettings, type ListSetting } from "./text-block-settings";

function defaultOption(id: string, label: string, hasValue: boolean): InspectorMenuOption {
  return { id, label: hasValue ? `Reset ${label}` : label, checked: !hasValue, disabled: !hasValue };
}

export function ListSettingsInspector({ block, onChange }: { block: ListBlock; onChange: (block: ContentBlock) => void }) {
  const options = [defaultOption("marker", "List style", Boolean(block.marker && block.marker !== "1")), defaultOption("start", "Start value", block.start !== undefined), defaultOption("reversed", "Reverse order", Boolean(block.reversed))];
  return <InspectorToolsSection title="Settings" options={[]} visible={new Set(["marker", "start", "reversed"])} canReset={options.some(option => !option.disabled)} menuOptions={options} onMenuOptionSelect={id => onChange(resetListSettings(block, [id as ListSetting]))} onToggle={() => {}} onReset={() => onChange(resetListSettings(block))}>
    <label><span>List style</span><select value={block.marker ?? "1"} onChange={event => onChange({ ...block, marker: event.target.value === "1" ? undefined : event.target.value as "A" | "a" | "I" | "i" })}><option value="1">Numbers</option><option value="A">Uppercase letters</option><option value="a">Lowercase letters</option><option value="I">Uppercase Roman numerals</option><option value="i">Lowercase Roman numerals</option></select></label>
    <label><span>Start value</span><input type="number" min="-100000" max="100000" step="1" value={block.start ?? ""} placeholder={String(block.reversed ? Math.max(1, block.items.length) : 1)} onChange={event => onChange({ ...block, start: event.target.value === "" ? undefined : Math.max(-100000, Math.min(100000, Math.trunc(Number(event.target.value)))) })} /></label>
    <ToggleSetting label="Reverse order" checked={Boolean(block.reversed)} onChange={reversed => onChange({ ...block, reversed: reversed || undefined })} />
  </InspectorToolsSection>;
}

export { TableSettingsInspector } from "./table-settings-inspector";
