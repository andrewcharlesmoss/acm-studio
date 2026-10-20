"use client";
import { useEffect, useId, useRef, type Dispatch } from "react";
import { AcmIcon } from "@acm/icons/react";
import { LAYOUT_SPACING_PRESETS } from "../../content/layout";
import { StudioButton } from "../controls/button";
import { NumberUnitField } from "../controls/number-unit-field";
import { BoxLengthSetting } from "../box-length-setting";
import { InspectorToolsSection } from "../inspector-tools-section";
import { previewLengthUnits, type PreviewLayout } from "./layout-preview-model";
import type { StyleAction, StyleSelection } from "./styles-preview-state";
import type { PreviewScope } from "./identity-preview-state";
import "./layout-preview.css";
const options = [{ id: "contentWidth", label: "Content width", disabled: true }, { id: "wideWidth", label: "Wide width", disabled: true }, { id: "padding", label: "Padding", disabled: true }, { id: "blockSpacing", label: "Block spacing", disabled: true }];
const visible = new Set(options.map(option => option.id));
export function LayoutPreview({ selection, authored, scope, dispatch, onBack }: { selection: StyleSelection; authored: Partial<StyleSelection>; scope: PreviewScope; dispatch: Dispatch<StyleAction>; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const layout = selection.layout ?? {};
  const resettable = new Set(options.filter(option => authored.layout?.[option.id as keyof PreviewLayout] !== undefined).map(option => option.id));
  useEffect(() => { heading.current?.focus(); }, []);
  const change = (patch: PreviewLayout) => dispatch({ type: "layout", scope, patch });
  return <div className="site-browse-styles site-layout-preview"><div className="site-browse-styles-heading"><StudioButton variant="text" aria-label="Back to Styles" onClick={onBack}><AcmIcon name="navigation.chevron-left" size={20} /></StudioButton><h3 ref={heading} tabIndex={-1}>Layout</h3></div>

    <InspectorToolsSection title="Dimensions" options={options} visible={visible} alwaysShow showCloseControl={false} canReset={resettable.size > 0} resettableOptions={resettable} onResetOption={field => dispatch({ type: "reset-layout", scope, field: field as keyof PreviewLayout })} onToggle={() => {}} onReset={() => dispatch({ type: "reset-layout", scope })}>
      <p>Set the width of the main content area.</p>
      <PreviewLengthField icon="layout.width-default" label="Content width" value={layout.contentWidth ?? "645px"} positive onChange={contentWidth => change({ contentWidth })} />
      <PreviewLengthField icon="layout.width-wide" label="Wide width" value={layout.wideWidth ?? "1340px"} positive onChange={wideWidth => change({ wideWidth })} />
      <BoxLengthSetting label="Padding" value={layout.padding ?? "24px"} layout="all" presets={LAYOUT_SPACING_PRESETS} min={0} max={160} canReset={false} onChange={padding => change({ padding })} />
      <BoxLengthSetting label="Block spacing" value={layout.blockSpacing ?? "1.2rem"} layout="single" presets={LAYOUT_SPACING_PRESETS} min={0} max={160} canReset={false} onChange={blockSpacing => change({ blockSpacing })} />
    </InspectorToolsSection>
  </div>;
}
function PreviewLengthField({ icon, label, value, positive = false, onChange }: { icon: "layout.width-default" | "layout.width-wide"; label: string; value: string; positive?: boolean; onChange: (value?: string) => void }) {
  const id = useId(); const parts = value.match(/^(\d+(?:\.\d+)?)(.*)$/); const amount = parts?.[1] ?? "0"; const unit = parts?.[2] || "px";
  return <div className="site-layout-length"><label htmlFor={id}>{label}</label><NumberUnitField leadingControl={<AcmIcon name={icon} size={24} aria-hidden="true" />} inputProps={{ id, value: amount, min: positive ? 0.01 : 0, max: 10000, step: "any", onChange: event => { const next = event.currentTarget.value; if (!next) onChange(undefined); else if (Number.isFinite(Number(next)) && Number(next) >= (positive ? .01 : 0)) onChange(`${Math.min(10000, Number(next))}${unit}`); } }} unitProps={{ "aria-label": `${label} unit`, value: unit, onChange: event => onChange(`${amount}${event.currentTarget.value}`) }} units={previewLengthUnits} /></div>;
}
