"use client";

import type { ParagraphBorderStyle, ParagraphStyle } from "../../content/model";
import { BoxLengthSetting } from "../box-length-setting";
import { BorderWidthSetting } from "./border-width-setting";

export function BorderSettings({ style, onChange, idPrefix = "border", includeShadow = true, includeRadius = true, compact = false, disabled = false }: {
  compact?: boolean;
  style: ParagraphStyle;
  onChange: (changes: Partial<ParagraphStyle>) => void;
  idPrefix?: string;
  includeShadow?: boolean;
  includeRadius?: boolean;
  disabled?: boolean;
}) {
  function updateBorderColour(value: string | undefined) {
    onChange({ borderColor: value, ...(value ? { borderStyle: style.borderStyle && style.borderStyle !== "none" ? style.borderStyle : "solid" } : {}) });
  }
  function updateBorderWidth(value: string | undefined) {
    onChange({ borderWidth: value || undefined, ...(value ? { borderStyle: style.borderStyle && style.borderStyle !== "none" ? style.borderStyle : "solid" } : {}) });
  }
  return <div className="border-settings-control">
    <div className="box-border-setting">
      {!compact ? <span className="studio-border-label">Border</span> : null}
      <BorderWidthSetting key={`${idPrefix}-border-width`} value={style.borderWidth ?? (style.borderStyle && style.borderStyle !== "none" ? "1px" : undefined)} colour={style.borderColor} borderStyle={style.borderStyle} disabled={disabled} onChange={updateBorderWidth} onColourChange={updateBorderColour} onStyleChange={(value: ParagraphBorderStyle) => onChange({ borderStyle: value })} />
      {includeRadius ? <BoxLengthSetting key={`${idPrefix}-border-radius`} label="Radius" value={style.borderRadius} layout="all" corners min={0} max={100} disabled={disabled} onChange={value => onChange({ borderRadius: value })} /> : null}
    </div>
    {includeShadow ? <label><span>Shadow</span><select disabled={disabled} value={style.shadow ?? ""} onChange={(event) => onChange({ shadow: (event.target.value || undefined) as ParagraphStyle["shadow"] })}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
  </div>;
}
