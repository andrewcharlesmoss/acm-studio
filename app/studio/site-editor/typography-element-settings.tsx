"use client";
import { useState } from "react";
import { FontFamilySelect } from "../controls/font-family-setting";
import { FontSizeAppearanceSetting } from "../controls/font-size-appearance-setting";
import { LineHeightSetting } from "../controls/line-height-setting";
import { SelectControl, TextInput } from "../controls/native-fields";
import { InspectorToolsSection } from "../inspector-tools-section";
import type { ParagraphFontSize } from "../../content/model";
import { referenceFonts, visibleTypographyFonts, customTypographyStartingSize, typographySizeMode, reconcileTypographySizeMode, resolveFontSizePresets, resolvedTypographyFields, typographyFieldsCss, type TypographyFields, type TypographyRole, type TypographySettings } from "./typography-preview-model";
import type { styleTypography } from "./style-reference-data";

const options = [{ id: "lineHeight", label: "Line Height" }, { id: "letterSpacing", label: "Letter Spacing" }, { id: "transform", label: "Letter Case" }, { id: "align", label: "Alignment" }, { id: "decoration", label: "Decoration" }];
const weightNames = ["thin", "extra-light", "light", "regular", "medium", "semi-bold", "bold", "extra-bold", "black"];
export function TypographyElementSettings({ role, typography, settings, onChange, onReset }: { role: TypographyRole; typography: typeof styleTypography[number]; settings: TypographySettings; onChange: (patch: TypographyFields) => void; onReset: () => void }) {
  const authored = settings.elements?.[role] ?? {};
  const fields = resolvedTypographyFields(typography, settings, role);
  const incomingMode = typographySizeMode(fields);
  const [mode, setMode] = useState(incomingMode);
  const [previousIncomingMode, setPreviousIncomingMode] = useState(incomingMode);
  if (previousIncomingMode !== incomingMode) { setPreviousIncomingMode(incomingMode); setMode(reconcileTypographySizeMode(previousIncomingMode, incomingMode, mode)); }
  const [visible, setVisible] = useState(new Set(role === "links" ? ["lineHeight", "decoration", "align"] : ["lineHeight", "letterSpacing", "transform", "align"]));
  const families = visibleTypographyFonts(typography, settings);
  const presets = resolveFontSizePresets(settings);
  return <div className="site-typography-element">
    <div className="site-typography-specimen" aria-label="Typography sample" style={typographyFieldsCss(fields, settings)}>The quick brown fox jumps over the lazy dog.</div>
    <InspectorToolsSection alwaysShow title="Typography" options={options} visible={visible} canReset={Boolean(settings.elements?.[role] && Object.keys(settings.elements[role]!).length)} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={onReset}>
    <FontFamilySelect value={authored.family ?? ""} options={[{ value: "", label: "Default" }, ...families.map(font => ({ value: font.family, label: font.name }))]} onChange={family => onChange({ family: family || undefined })} />
    <FontSizeAppearanceSetting showSize={role !== "headings"} showAppearance={false} size={fields.preset as ParagraphFontSize} customSize={fields.size} mode={mode} onModeChange={next => { setMode(next); if (next === "custom") onChange({ preset: "", size: customTypographyStartingSize(fields, settings) }); }} onSizeChange={preset => onChange({ preset, size: undefined })} onCustomSizeChange={size => onChange({ size, preset: "" })} onAppearanceChange={() => {}} />
    {role !== "headings" && mode === "presets" && presets.some(item => item.id.startsWith("custom-")) ? <SelectControl aria-label="Font size preset" value={fields.preset ?? ""} onChange={event => onChange({ preset: event.target.value || undefined, size: undefined })}><option value="">Default</option>{presets.map(preset => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</SelectControl> : null}
    <label><span>Appearance</span><SelectControl value={authored.weight !== undefined ? fields.weight : ""} onChange={event => onChange({ weight: event.target.value ? Number(event.target.value) : undefined })}><option value="">Default</option>{(referenceFonts.find(font => font.family === fields.family)?.weights ?? [400]).map(weight => <option value={weight} key={weight}>{weightNames[weight / 100 - 1].replaceAll("-", " ").replace(/^./, value => value.toUpperCase())}</option>)}</SelectControl></label>
      {visible.has("lineHeight") ? <LineHeightSetting value={fields.lineHeight} onChange={lineHeight => onChange({ lineHeight })} /> : null}
      {visible.has("letterSpacing") ? <label><span>Letter Spacing</span><TextInput value={fields.letterSpacing ?? ""} onChange={event => onChange({ letterSpacing: event.target.value || undefined })} placeholder="0px" /></label> : null}
      {visible.has("transform") ? <label><span>Letter Case</span><SelectControl value={fields.transform ?? "none"} onChange={event => onChange({ transform: event.target.value as TypographyFields["transform"] })}>{["none", "uppercase", "lowercase", "capitalize"].map(value => <option value={value} key={value}>{value === "none" ? "Default" : value === "capitalize" ? "Capitalise" : value[0].toUpperCase() + value.slice(1)}</option>)}</SelectControl></label> : null}
      {visible.has("align") ? <label><span>Alignment</span><SelectControl value={fields.align ?? "left"} onChange={event => onChange({ align: event.target.value as TypographyFields["align"] })}>{["left", "center", "right", "justify"].map(value => <option value={value} key={value}>{value === "center" ? "Centre" : value[0].toUpperCase() + value.slice(1)}</option>)}</SelectControl></label> : null}
      {visible.has("decoration") ? <label><span>Decoration</span><SelectControl value={fields.decoration ?? "none"} onChange={event => onChange({ decoration: event.target.value as TypographyFields["decoration"] })}><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option></SelectControl></label> : null}
    </InspectorToolsSection>
    <button type="button" className="paragraph-reset-button" onClick={onReset}>Reset to Inherited Typography</button>
  </div>;
}
