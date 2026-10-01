import type { ParagraphStyle } from "../../content/model";

export function LineHeightSetting({ value, onChange, disabled = false, label = "Line height" }: {
  value: ParagraphStyle["lineHeight"];
  onChange: (value: ParagraphStyle["lineHeight"]) => void;
  disabled?: boolean;
  label?: string;
}) {
  return <label>
    <span>{label}</span>
    <input type="text" inputMode="decimal" value={value ?? ""} onChange={event => onChange(event.target.value || undefined)} placeholder="Default" disabled={disabled} />
  </label>;
}
