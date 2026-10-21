"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { interfaceStylePresetToCssVariables, type InterfaceStylePreset } from "@acm/styles";
import { StudioButton } from "../../controls/button";
import { ColourPicker, type ColourPaletteEntry } from "../../controls/colour-picker";
import { SelectControl } from "../../controls/native-fields";
import { NumberUnitField } from "../../controls/number-unit-field";
import { RangeControl } from "../../controls/range-control";

export type InterfaceStyleSection = "colours" | "typography" | "fields" | "buttons" | "interactions";
export const interfaceStyleSections: { id: InterfaceStyleSection; label: string; description: string }[] = [
  { id: "colours", label: "Colours", description: "Interface surfaces, text, labels, and selection colours." },
  { id: "typography", label: "Typography", description: "Compact controls and the shared application header." },
  { id: "fields", label: "Fields", description: "The shared corner radius for text, number, select, and text-area fields." },
  { id: "buttons", label: "Buttons", description: "Shared base, secondary, and outline interface buttons." },
  { id: "interactions", label: "Interactions", description: "Hover treatments for shared control families." },
];
const colourFields: { key: keyof InterfaceStylePreset["colours"]; label: string }[] = [
  { key: "surface", label: "Surface" }, { key: "raisedSurface", label: "Raised Surface" },
  { key: "subtleSurface", label: "Subtle Surface" }, { key: "workspaceBackground", label: "Workspace Background" },
  { key: "primaryText", label: "Primary Text" }, { key: "secondaryText", label: "Secondary Text" },
  { key: "label", label: "Labels" }, { key: "border", label: "Borders" },
  { key: "actionAccent", label: "Action Accent" }, { key: "controlAccent", label: "Control Accent" },
  { key: "selection", label: "Interface Selection" }, { key: "blockSelection", label: "Block Selection" },
  { key: "neutralHover", label: "Neutral Row Hover" },
];
const buttonLabels = { base: "Base", secondary: "Secondary", outline: "Outline" } as const;
const buttonColourLabels = { background: "Background", foreground: "Text Colour", border: "Border Colour" } as const;
const interactionLabels = {
  textActions: "Text actions", iconActions: "Icon actions", inspectorOptions: "Inspector option rows",
  colourRows: "Colour setting rows", neutralRows: "Neutral menu and list rows", fields: "Fields", buttons: "Buttons",
} as const;
const hoverTreatments = [
  { value: "none", label: "No Change" }, { value: "text-icon", label: "Text/Icon Only" },
  { value: "background", label: "Background Fill" },
];
const fontWeights = [
  [100, "Thin"], [200, "Extra Light"], [300, "Light"], [400, "Regular"], [500, "Medium"],
  [600, "Semibold"], [700, "Bold"], [800, "Extra Bold"], [900, "Black"],
] as const;
type SettingsProps = {
  section: InterfaceStyleSection;
  preset: InterfaceStylePreset;
  baseline: InterfaceStylePreset;
  disabled: boolean;
  onChange: (path: string, value: string | number) => void;
  onReset: (path: string) => void;
  onEndEdit: () => void;
};
type SettingProps = Pick<SettingsProps, "disabled" | "onReset"> & {
  label: string;
  resetLabel?: string;
  path: string;
  value: unknown;
  baseline: unknown;
  children: ReactNode;
};

function Setting({ label, resetLabel = label, path, value, baseline, disabled, onReset, children }: SettingProps) {
  return <div className="interface-style-setting">
    <div className="interface-style-setting-control"><span>{label}</span>{children}</div>
    <StudioButton variant="text" type="button" disabled={disabled || value === baseline} aria-label={`Reset ${resetLabel}`} title={`Reset ${resetLabel}`} onClick={() => onReset(path)}>Reset</StudioButton>
  </div>;
}

function ColourSetting({ label, name = label, palette, onChange, ...props }: Omit<SettingProps, "children" | "value" | "baseline"> & {
  name?: string;
  value: string;
  baseline: string;
  palette: readonly ColourPaletteEntry[];
  onChange: (path: string, value: string) => void;
}) {
  return <Setting {...props} label={label} resetLabel={name}>
    <ColourPicker label={name} presentation="value-field" palette={palette} paletteLabel="INTERFACE COLOURS" value={props.value}
      allowClear={false} enableAlpha={false} disabled={props.disabled}
      onChange={value => { if (value && /^#[0-9a-f]{6}$/i.test(value)) onChange(props.path, value.toUpperCase()); }} />
  </Setting>;
}

function MetricSetting({ label, name = label, path, value, baseline, min, max, disabled, onChange, onEndEdit, onReset }: {
  label: string; name?: string; path: string; value: number; baseline: number; min: number; max: number;
} & Pick<SettingsProps, "disabled" | "onChange" | "onEndEdit" | "onReset">) {
  const [draft, setDraft] = useState<string | null>(null);
  function update(raw: string) {
    const next = Number(raw);
    if (raw.trim() && Number.isFinite(next) && next >= min && next <= max) onChange(path, next);
  }
  return <Setting label={label} resetLabel={name} path={path} value={value} baseline={baseline} disabled={disabled} onReset={onReset}>
    <div className="interface-style-metric">
      <NumberUnitField inputProps={{ "aria-label": name, value: draft ?? value, min, max, step: "any", disabled,
        onChange: event => { setDraft(event.target.value); update(event.target.value); },
        onBlur: () => { setDraft(null); onEndEdit(); },
      }} unitProps={{ "aria-label": `${name} unit`, value: "px", disabled: true }} units={["px"]} />
      <RangeControl aria-label={`${name} slider`} min={min} max={max} step="any" value={value} disabled={disabled}
        tooltipText={`${value}px`} onPointerDown={onEndEdit} onPointerUp={onEndEdit} onPointerCancel={onEndEdit} onBlur={onEndEdit}
        onChange={event => { setDraft(null); update(String(Math.round(Number(event.target.value) * 10) / 10)); }} />
    </div>
  </Setting>;
}

/** Feature adapters own paths and bounds; production controls own input and appearance. */
export function InterfaceStyleSettings({ section, preset, baseline, disabled, onChange, onReset, onEndEdit }: SettingsProps) {
  const common = { disabled, onChange, onReset };
  const palette = colourFields.map(({ key, label }) => ({ key, label, colour: preset.colours[key] }));
  if (section === "colours") return <div className="interface-style-field-grid">
    {colourFields.map(({ key, label }) => <ColourSetting {...common} key={key} label={label} path={`colours.${key}`} value={preset.colours[key]} baseline={baseline.colours[key]} palette={palette} />)}
  </div>;
  if (section === "typography") {
    const variables = interfaceStylePresetToCssVariables(preset);
    return <div className="interface-style-typography-grid">{(["control", "header"] as const).map(role => {
      const name = role === "control" ? "Compact controls" : "Application header";
      const current = preset.typography[role];
      const saved = baseline.typography[role];
      return <fieldset className="interface-style-card" key={role}><legend>{name}</legend>
        <Setting {...common} label="Font Family" resetLabel={`${name} font family`} path={`typography.${role}.family`} value={current.family} baseline={saved.family}>
          <SelectControl aria-label={`${name} font family`} value={current.family} disabled={disabled} onChange={event => onChange(`typography.${role}.family`, event.target.value)}>
            <option value="system-sans">System Sans</option><option value="inter">Inter</option>
          </SelectControl>
        </Setting>
        <MetricSetting {...common} onEndEdit={onEndEdit} label="Font Size" name={`${name} font size`} path={`typography.${role}.size`} value={current.size} baseline={saved.size} min={13} max={role === "header" ? 32 : 24} />
        <Setting {...common} label="Font Weight" resetLabel={`${name} font weight`} path={`typography.${role}.weight`} value={current.weight} baseline={saved.weight}>
          <SelectControl aria-label={`${name} font weight`} value={current.weight} disabled={disabled} onChange={event => onChange(`typography.${role}.weight`, Number(event.target.value))}>
            {!fontWeights.some(([weight]) => weight === current.weight) ? <option value={current.weight}>Custom ({current.weight})</option> : null}
            {fontWeights.map(([weight, label]) => <option key={weight} value={weight}>{label} ({weight})</option>)}
          </SelectControl>
        </Setting>
        <p className="interface-style-type-specimen" style={{ fontFamily: variables[`--acm-ui-font-${role}`], fontSize: variables[`--acm-ui-size-${role}`], fontWeight: variables[`--acm-ui-weight-${role}`] } as CSSProperties}>
          {role === "control" ? "A control label and its value" : "ACM Studio · Interface Styles"}
        </p>
      </fieldset>;
    })}</div>;
  }
  if (section === "fields") return <div className="interface-style-card interface-style-radius-setting">
    <MetricSetting {...common} onEndEdit={onEndEdit} label="Field Corner Radius" path="fields.radius" value={preset.fields.radius} baseline={baseline.fields.radius} min={0} max={16} />
    <p>Applies to shared text, number, select, and text-area fields. Panels, menus, and authored website content keep their own radii.</p>
  </div>;
  if (section === "buttons") return <div className="interface-style-button-settings">{(Object.keys(buttonLabels) as (keyof typeof buttonLabels)[]).map(role => <fieldset className="interface-style-card" key={role}>
    <legend>{buttonLabels[role]} button</legend>
    {(["background", "foreground", "border"] as const).map(property => <ColourSetting {...common} key={property} label={buttonColourLabels[property]} name={`${buttonLabels[role]} button ${buttonColourLabels[property]}`} path={`buttons.${role}.${property}`} value={preset.buttons[role][property]} baseline={baseline.buttons[role][property]} palette={palette} />)}
    <MetricSetting {...common} onEndEdit={onEndEdit} label="Border Width" name={`${buttonLabels[role]} button border width`} path={`buttons.${role}.borderWidth`} value={preset.buttons[role].borderWidth} baseline={baseline.buttons[role].borderWidth} min={0} max={12} />
    <div className="interface-style-inline-preview" style={interfaceStylePresetToCssVariables(preset) as CSSProperties}><StudioButton type="button" variant={role}>{buttonLabels[role]} button</StudioButton></div>
  </fieldset>)}</div>;
  return <div className="interface-style-interaction-settings">{(Object.keys(interactionLabels) as (keyof typeof interactionLabels)[]).map(key => {
    const current = preset.interactions[key];
    const saved = baseline.interactions[key];
    const name = interactionLabels[key];
    return <fieldset className="interface-style-interaction-row" key={key}><legend>{name}</legend>
      <Setting {...common} label="Hover Treatment" resetLabel={`${name} hover treatment`} path={`interactions.${key}.treatment`} value={current.treatment} baseline={saved.treatment}>
        <SelectControl aria-label={`${name} hover treatment`} value={current.treatment} disabled={disabled} onChange={event => onChange(`interactions.${key}.treatment`, event.target.value)}>
          {hoverTreatments.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectControl>
      </Setting>
      {current.treatment !== "none" ? <ColourSetting {...common} label="Hover Text/Icon" name={`${name} hover text or icon`} path={`interactions.${key}.foreground`} value={current.foreground} baseline={saved.foreground} palette={palette} /> : null}
      {current.treatment === "background" ? <ColourSetting {...common} label="Hover Background" name={`${name} hover background`} path={`interactions.${key}.background`} value={current.background} baseline={saved.background} palette={palette} /> : null}
    </fieldset>;
  })}</div>;
}
