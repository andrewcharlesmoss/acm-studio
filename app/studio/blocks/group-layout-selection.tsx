import { AcmIcon } from "@acm/icons/react";
import { groupVariations } from "./group-variations";
import type { LayoutMode } from "../../content/model";

const layoutOptions = groupVariations.map(variation => ({ value: variation.layout, label: variation.label, icon: variation.icon }));

export function GroupLayoutSelection({ value, onChange }: { value: LayoutMode; onChange: (value: LayoutMode) => void }) {
  return <div className="group-layout-selection" role="group" aria-label="Group layout">
    {layoutOptions.map(option => <button type="button" key={option.value} aria-label={option.label} aria-pressed={value === option.value} title={option.label} className={value === option.value ? "is-active" : undefined} onClick={() => onChange(option.value)}>
      <AcmIcon name={option.icon} size={24} />
    </button>)}
    {value === "columns" ? <button type="button" aria-label="Columns" aria-pressed="true" title="Columns" className="is-active" onClick={() => onChange("flow")}><AcmIcon name="layout.columns" size={24} /></button> : null}
  </div>;
}
