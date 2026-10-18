"use client";
import { AcmIcon } from "@acm/icons/react";
import { PaletteColourSetting } from "../controls/palette-colour-setting";
import { NumberUnitField } from "../controls/number-unit-field";
import { RadioGroup } from "../controls/radio-group";
import { useId, useState } from "react";
import { FontFamilySelect } from "../controls/font-family-setting";
import { FontSizeAppearanceSetting } from "../controls/font-size-appearance-setting";
import { LineHeightSetting } from "../controls/line-height-setting";
import { SelectControl } from "../controls/native-fields";
import { InspectorToolsSection } from "../inspector-tools-section";
import type { ParagraphFontSize } from "../../content/model";
import { referenceFonts, visibleTypographyFonts, customTypographyStartingSize, typographySizeMode, reconcileTypographySizeMode, resolveFontSizePresets, resolvedTypographyFields, type TypographyFields, type TypographyRole, type TypographySettings } from "./typography-preview-model";
import type { styleTypography, stylePalettes } from "./style-reference-data";

const options = [{ id: "lineHeight", label: "Line Height" }, { id: "letterSpacing", label: "Letter Spacing" }, { id: "transform", label: "Letter Case" }, { id: "align", label: "Alignment" }, { id: "decoration", label: "Decoration" }];
const letterSpacingUnits = ["px", "%", "em", "rem", "vw", "vh"] as const;
const weightNames = ["thin", "extra-light", "light", "regular", "medium", "semi-bold", "bold", "extra-bold", "black"];
export function TypographyElementSettings({ role, typography, palette, settings, onChange, onReset }: { role: TypographyRole; typography: typeof styleTypography[number]; palette: typeof stylePalettes[number]; settings: TypographySettings; onChange: (patch: TypographyFields) => void; onReset: () => void }) {
  const spacingId = useId();
  const authored = settings.elements?.[role] ?? {};
  const fields = resolvedTypographyFields(typography, settings, role);
  const incomingMode = typographySizeMode(fields);
  const [mode, setMode] = useState(incomingMode);
  const [previousIncomingMode, setPreviousIncomingMode] = useState(incomingMode);
  if (previousIncomingMode !== incomingMode) { setPreviousIncomingMode(incomingMode); setMode(reconcileTypographySizeMode(previousIncomingMode, incomingMode, mode)); }
  const [visible, setVisible] = useState(new Set(role === "links" ? ["lineHeight", "decoration", "align"] : ["lineHeight", "letterSpacing", "transform", "align"]));
  const families = visibleTypographyFonts(typography, settings);
  const presets = resolveFontSizePresets(settings);
  const effectiveColour = fields.colour ?? (role === "headings" || /^h[1-6]$/.test(role) ? palette.heading : role === "buttons" ? palette.buttonText : palette.text);
  const letterSpacing = fields.letterSpacing?.match(/^(-?\d+(?:\.\d+)?)(px|%|em|rem|vw|vh)$/);
  const spacingUnit = letterSpacing?.[2] ?? "px";
  const sourceSpacing = letterSpacing?.[1] ?? (fields.letterSpacing === "0" ? "0" : "");
  const [spacingDraft, setSpacingDraft] = useState(sourceSpacing);
  const [previousSpacing, setPreviousSpacing] = useState(fields.letterSpacing);
  if (previousSpacing !== fields.letterSpacing) { setPreviousSpacing(fields.letterSpacing); setSpacingDraft(sourceSpacing); }
  function commitSpacing() {
    if (spacingDraft.trim() === "") { setSpacingDraft(sourceSpacing); onChange({ letterSpacing: undefined }); }
    else if (Number.isFinite(Number(spacingDraft))) { const bounded = Math.max(-100, Math.min(100, Number(spacingDraft))); setSpacingDraft(String(bounded)); onChange({ letterSpacing: `${bounded}${spacingUnit}` }); }
    else setSpacingDraft(sourceSpacing);
  }
  const descriptions = { text: "Manage the fonts used on the site.", links: "Manage the fonts and typography used on links.", headings: "Manage the fonts and typography used on headings.", captions: "Manage the fonts and typography used on captions.", buttons: "Manage the fonts and typography used on buttons." };
  const description = role === "headings" || /^h[1-6]$/.test(role) ? descriptions.headings : descriptions[role as keyof typeof descriptions];
  return <div className="site-typography-element">
    <p className="site-typography-description">{description}</p>
    <div className="site-typography-specimen" aria-hidden="true" style={{ fontFamily: fields.family, fontWeight: fields.weight, fontSize: customTypographyStartingSize(fields, settings), letterSpacing: fields.letterSpacing, background: role === "buttons" ? palette.buttonBackground : palette.colours[0], color: effectiveColour, textTransform: fields.transform, textDecoration: fields.decoration }}>Aa</div>
    <InspectorToolsSection alwaysShow title="Typography" options={options} visible={visible} canReset={Boolean(settings.elements?.[role] && Object.keys(settings.elements[role]!).length)} onToggle={id => setVisible(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onReset={onReset}>
    <PaletteColourSetting label="Colour" row value={effectiveColour} onChange={colour => onChange({ colour })} />
    <FontFamilySelect value={fields.family ?? ""} options={[{ value: "", label: "Default" }, ...families.map(font => ({ value: font.family, label: font.name }))]} onChange={family => onChange({ family: family || undefined })} />
    <FontSizeAppearanceSetting showSize={role !== "headings"} showAppearance={false} size={fields.preset as ParagraphFontSize} customSize={fields.size} mode={mode} onModeChange={next => { setMode(next); if (next === "custom") onChange({ preset: "", size: customTypographyStartingSize(fields, settings) }); }} onSizeChange={preset => onChange({ preset, size: undefined })} onCustomSizeChange={size => onChange({ size, preset: "" })} onAppearanceChange={() => {}} />
    {role !== "headings" && mode === "presets" && presets.some(item => item.id.startsWith("custom-")) ? <SelectControl aria-label="Font size preset" value={fields.preset ?? ""} onChange={event => onChange({ preset: event.target.value || undefined, size: undefined })}><option value="">Default</option>{presets.map(preset => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</SelectControl> : null}
    <label><span>Appearance</span><SelectControl value={authored.weight !== undefined ? fields.weight : ""} onChange={event => onChange({ weight: event.target.value ? Number(event.target.value) : undefined })}><option value="">Default</option>{(referenceFonts.find(font => font.family === fields.family)?.weights ?? [400]).map(weight => <option value={weight} key={weight}>{weightNames[weight / 100 - 1].replaceAll("-", " ").replace(/^./, value => value.toUpperCase())}</option>)}</SelectControl></label>
      <div className="site-typography-measurements">
        {visible.has("lineHeight") ? <LineHeightSetting stepper label="Line Height" value={fields.lineHeight} onChange={lineHeight => onChange({ lineHeight })} /> : null}
        {visible.has("letterSpacing") ? <label htmlFor={spacingId}><span>Letter Spacing</span><NumberUnitField units={letterSpacingUnits} inputProps={{ id: spacingId, "aria-label": "Letter Spacing", value: spacingDraft, min: -100, max: 100, step: 0.1, placeholder: "0", onChange: event => setSpacingDraft(event.target.value), onBlur: commitSpacing, onKeyDown: event => { if (event.key === "Enter") event.currentTarget.blur(); } }} unitProps={{ "aria-label": "Letter Spacing Unit", value: spacingUnit, onChange: event => onChange({ letterSpacing: `${spacingDraft.trim() && Number.isFinite(Number(spacingDraft)) ? Math.max(-100, Math.min(100, Number(spacingDraft))) : letterSpacing?.[1] ?? 0}${event.target.value}` }) }} /></label> : null}
      </div>
      {visible.has("transform") ? <RadioGroup label="Letter Case" presentation="buttons" value={authored.transform} onChange={transform => onChange({ transform: transform as TypographyFields["transform"] })} options={[{ value: "none", label: <AcmIcon name="action.remove" size={20} scale="Regular-M" />, accessibleName: "None", title: "None" }, { value: "uppercase", label: "AB", accessibleName: "Uppercase", title: "Uppercase" }, { value: "lowercase", label: "ab", accessibleName: "Lowercase", title: "Lowercase" }, { value: "capitalize", label: "Ab", accessibleName: "Capitalise", title: "Capitalise" }]} /> : null}
      {visible.has("align") ? <RadioGroup label="Text Alignment" presentation="buttons" value={authored.align} onChange={align => onChange({ align: align as TypographyFields["align"] })} options={([ ["left", "text.align-left", "Left"], ["center", "text.align-centre", "Centre"], ["right", "text.align-right", "Right"], ["justify", "text.justify", "Justify"] ] as const).map(([value, icon, label]) => ({ value, label: <AcmIcon name={icon} size={20} scale="Regular-M" />, accessibleName: label, title: label }))} /> : null}
      {visible.has("decoration") ? <label><span>Decoration</span><SelectControl value={fields.decoration ?? "none"} onChange={event => onChange({ decoration: event.target.value as TypographyFields["decoration"] })}><option value="none">None</option><option value="underline">Underline</option><option value="line-through">Strikethrough</option></SelectControl></label> : null}
    </InspectorToolsSection>
    <button type="button" className="paragraph-reset-button" onClick={onReset}>Reset to Inherited Typography</button>
  </div>;
}
