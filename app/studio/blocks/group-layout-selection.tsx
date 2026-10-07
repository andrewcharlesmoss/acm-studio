import { AcmIcon } from "@acm/icons/react";
import { groupVariations } from "./group-variations";
import type { LayoutMode } from "../../content/model";

const layoutOptions = groupVariations.map(variation => ({ value: variation.layout, label: variation.label, icon: variation.icon }));

export function GroupLayoutSelection({ value, onChange }: { value: LayoutMode; onChange: (value: LayoutMode) => void }) {
  return <div className="group-layout-selection" role="group" aria-label="Group layout">
    {layoutOptions.map(option => <button type="button" key={option.value} aria-label={option.label} aria-pressed={value === option.value} title={option.label} className={value === option.value ? "is-active" : undefined} onClick={() => onChange(option.value)}>
      <AcmIcon name={option.icon} scale="Regular-L" size={24} />
    </button>)}
    {value === "columns" ? <button type="button" aria-label="Columns" aria-pressed="true" title="Columns" className="is-active" onClick={() => onChange("flow")}><AcmIcon name="layout.columns" size={24} /></button> : null}
  </div>;
}

export function GroupLayoutChooser({ onSelect, writable = true }: { onSelect: (value: LayoutMode) => void; writable?: boolean }) {
  return <section className="group-layout-chooser">
    <p>Group blocks together. Select a layout:</p>
    <div className="group-layout-chooser-options" role="group" aria-label="Choose a Group layout">
      {groupVariations.map(variation => {
        const itemCount = variation.layout === "flow" ? 1 : variation.layout === "grid" ? 4 : 2;
        return <button type="button" key={variation.layout} disabled={!writable} aria-label={`${variation.label} layout`} title={variation.label} onClick={() => { if (writable) onSelect(variation.layout); }}>
          <span className={`group-layout-preview is-${variation.layout}`} aria-hidden="true">{Array.from({ length: itemCount }, (_, index) => <i key={index} />)}</span>
        </button>;
      })}
    </div>
  </section>;
}
