import { controlLibraryAttributes } from "./control-library-links";
import type { ButtonHTMLAttributes } from "react";
import "./button.css";

/** Scope the shared preset to this action, without styling neighbouring controls. */
export function StudioButton({ variant = "base", className, style: buttonStyle, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "base" | "secondary" | "outline" | "text" }) {
  if (variant === "text") {
    return <button {...props} {...controlLibraryAttributes("text-action")} style={buttonStyle} className={`acm-button acm-button-text studio-text-action${className ? ` ${className}` : ""}`} />;
  }
  return <span className={`studio-button acm-interface-style-preset is-${variant}`}>
    <button {...props} {...controlLibraryAttributes("button")} style={buttonStyle} className={`acm-button${variant === "secondary" ? " acm-button-secondary" : variant === "outline" ? " acm-button-outline" : ""}${className ? ` ${className}` : ""}`} />
  </span>;
}
