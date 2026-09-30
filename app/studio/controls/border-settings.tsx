"use client";

import type { ParagraphBorderStyle, ParagraphStyle } from "../../content/model";
import { BoxLengthSetting } from "../box-length-setting";
import { BorderColourControl } from "../border-colour-control";

export function BorderSettings({ style, onChange, idPrefix = "border", includeShadow = true, includeRadius = true, disabled = false }: {
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
      <div className="box-border-appearance">
        <BorderColourControl value={style.borderColor} onChange={updateBorderColour} disabled={disabled} />
        <label><span>Border style</span><select disabled={disabled} value={style.borderStyle ?? "none"} onChange={(event) => onChange({ borderStyle: event.target.value as ParagraphBorderStyle })}><option value="none">None</option><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
      </div>
      <BoxLengthSetting key={`${idPrefix}-border-width`} label="Width" value={style.borderWidth ?? (style.borderStyle && style.borderStyle !== "none" ? "1px" : undefined)} canReset={Boolean(style.borderWidth)} layout="all" allowPercent={false} min={0} max={20} disabled={disabled} onChange={updateBorderWidth} />
      {includeRadius ? <BoxLengthSetting key={`${idPrefix}-border-radius`} label="Radius" value={style.borderRadius} layout="all" corners min={0} max={100} disabled={disabled} onChange={value => onChange({ borderRadius: value })} /> : null}
    </div>
    {includeShadow ? <label><span>Shadow</span><select disabled={disabled} value={style.shadow ?? ""} onChange={(event) => onChange({ shadow: (event.target.value || undefined) as ParagraphStyle["shadow"] })}><option value="">Default</option><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label> : null}
  </div>;
}
