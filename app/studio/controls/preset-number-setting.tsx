"use client";

export function PresetNumberSetting({ label, value, presets, min, max, onChange, disabled = false }: { label: string; value: number | undefined; presets: readonly number[]; min: number; max: number; onChange: (value: number | undefined) => void; disabled?: boolean }) {
  const isPreset = value !== undefined && presets.includes(value);
  const customValue = () => {
    for (let candidate = min; candidate <= max; candidate += 1) if (!presets.includes(candidate)) return candidate;
    return min;
  };
  return <label><span>{label}</span><select disabled={disabled} value={value === undefined ? "" : isPreset ? String(value) : "custom"} onChange={(event) => { if (event.target.value === "") onChange(undefined); else if (event.target.value === "custom") onChange(value !== undefined && !isPreset ? value : customValue()); else onChange(Number(event.target.value)); }}><option value="">Default</option>{presets.map((preset) => <option value={preset} key={preset}>{preset}px</option>)}<option value="custom">Custom</option></select>{value !== undefined && !isPreset ? <input disabled={disabled} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} aria-label={`${label} custom value in pixels`} /> : null}</label>;
}
