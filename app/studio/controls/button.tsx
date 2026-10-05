import type { ButtonHTMLAttributes, CSSProperties } from "react";
import { UNIVERSAL_STYLE_PRESET, universalStylePresetToCssVariables } from "@acm/styles";

const buttonPreset: CSSProperties = {
  ...universalStylePresetToCssVariables(UNIVERSAL_STYLE_PRESET),
  // Keep Studio's UI typography when a host resets native buttons to inherit.
  fontFamily: "var(--studio-ui-font)",
  fontSize: "var(--studio-ui-size)",
  fontStyle: "var(--acm-type-button-style)",
  fontWeight: "var(--acm-type-button-weight)",
  lineHeight: "var(--acm-type-button-line-height)",
} as CSSProperties;

/** Scope the shared preset to this action, without styling neighbouring controls. */
export function StudioButton({ variant = "base", className, style: buttonStyle, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "base" | "secondary" | "text" }) {
  if (variant === "text") return <button {...props} style={buttonStyle} className={`acm-button acm-button-text studio-text-action${className ? ` ${className}` : ""}`} />;
  const style = {
    ...buttonPreset,
    "--studio-button-background": `var(--acm-button-${variant}-background)`,
    "--studio-button-foreground": `var(--acm-button-${variant}-foreground)`,
  } as CSSProperties;
  return <span className="studio-button acm-universal-style-preset" style={style}>
    <button {...props} style={{ font: "inherit", ...buttonStyle }} className={`acm-button${variant === "secondary" ? " acm-button-secondary" : ""}${className ? ` ${className}` : ""}`} />
  </span>;
}
