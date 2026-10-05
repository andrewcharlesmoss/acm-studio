import type { ParagraphFontSize, ParagraphStyle } from "../../content/model";
import { resetInspectorStyleFields, type InspectorControlProfile } from "./capability-profiles";

export function supportedInspectorControls(controls: readonly InspectorControlProfile[]) {
  return controls.filter(control => control.enabled !== false && control.availability !== "model-only");
}

export function inspectorStyleHasValues(style: ParagraphStyle, ids: Iterable<string>, controls: readonly InspectorControlProfile[]) {
  const selected = new Set(ids);
  return supportedInspectorControls(controls).some(control => selected.has(control.id)
    && control.resetFields.some(field => style[field as keyof ParagraphStyle] !== undefined && style[field as keyof ParagraphStyle] !== ""));
}

export function resetSupportedInspectorStyleFields(style: ParagraphStyle, ids: Iterable<string>, controls: readonly InspectorControlProfile[]) {
  return resetInspectorStyleFields(style, ids, supportedInspectorControls(controls));
}

export function setInspectorFitText(style: ParagraphStyle, enabled: boolean): ParagraphStyle {
  const next = { ...style };
  if (enabled) {
    delete next.fontSize;
    delete next.fontSizeCustom;
    next.fitText = true;
  } else delete next.fitText;
  return next;
}

export function setInspectorFontSize(style: ParagraphStyle, value: ParagraphFontSize | string | undefined, mode: "presets" | "custom"): ParagraphStyle {
  const next = { ...style };
  delete next.fontSize;
  delete next.fontSizeCustom;
  delete next.fitText;
  if (value) {
    if (mode === "custom") next.fontSizeCustom = value;
    else next.fontSize = value as ParagraphFontSize;
  }
  return next;
}
