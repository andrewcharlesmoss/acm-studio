"use client";

import { tableRowSections } from "../../content/table-row-sections";
import type { ContentBlock } from "../../content/model";
import { resetTableSettings, setTableSection, type TableSetting } from "../../content/table-sections";
import { InspectorToolsSection, type InspectorMenuOption } from "../inspector-tools-section";
import { ToggleSetting } from "../controls/toggle-setting";

function defaultOption(id: string, label: string, hasValue: boolean): InspectorMenuOption {
  return { id, label: hasValue ? `Reset ${label}` : label, checked: !hasValue, disabled: !hasValue };
}

export function TableSettingsInspector({ block, onChange }: { block: Extract<ContentBlock, { type: "table" }>; onChange: (block: ContentBlock) => void }) {
  const { headerRowCount, footerRowCount } = tableRowSections(block);
  const options = [defaultOption("fixedWidth", "Fixed width table cells", block.fixedWidth === false), ...(block.rows.length ? [defaultOption("hasHeader", "Header section", headerRowCount > 0), defaultOption("hasFooter", "Footer section", footerRowCount > 0)] : [])];
  return <InspectorToolsSection title="Settings" options={[]} visible={new Set(options.map(option => option.id))} canReset={options.some(option => !option.disabled)} menuOptions={options} onMenuOptionSelect={id => onChange(resetTableSettings(block, [id as TableSetting]))} onToggle={() => {}} onReset={() => onChange(resetTableSettings(block))}>
    <ToggleSetting label="Fixed width table cells" checked={block.fixedWidth !== false} onChange={fixedWidth => onChange({ ...block, fixedWidth })} />
    {block.rows.length ? <><ToggleSetting label="Header section" checked={headerRowCount > 0} onChange={hasHeader => onChange(setTableSection(block, "header", hasHeader))} /><ToggleSetting label="Footer section" checked={footerRowCount > 0} onChange={hasFooter => onChange(setTableSection(block, "footer", hasFooter))} /></> : null}
  </InspectorToolsSection>;
}
