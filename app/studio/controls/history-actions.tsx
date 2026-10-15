import type { ComponentPropsWithRef } from "react";
import { RibbonButton, type RibbonSize } from "@acm/ribbon";
import { StudioIcon } from "../studio-icons";
import "./history-actions.css";

type HistoryAction = "undo" | "redo";
type Presentation = "compact" | "labelled" | "ribbon";
type ActionProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  action: HistoryAction;
  presentation?: Presentation;
  ribbonSize?: RibbonSize;
};

/** Presentation only: the caller owns availability, commands and history. */
export function HistoryActionButton({ action, presentation = "compact", ribbonSize = "large", className, title, "aria-label": label, ...props }: ActionProps) {
  const name = action === "undo" ? "Undo" : "Redo";
  const hint = action === "undo" ? "⌘Z / Ctrl+Z" : "⌘⇧Z / Ctrl+Y";
  const ribbon = presentation === "ribbon";
  const iconSize = ribbon ? ribbonSize === "large" ? 24 : ribbonSize === "compact" ? 16 : 22 : 20;
  const content = <><StudioIcon name={action} size={iconSize} />{presentation !== "compact" ? <span>{name}</span> : null}</>;
  const common = { ...props, type: "button" as const, title: title ?? `${name} (${hint})`, "aria-label": label ?? name, className: `studio-history-action studio-history-action--${presentation}${className ? ` ${className}` : ""}` };
  return ribbon ? <RibbonButton {...common} size={ribbonSize}>{content}</RibbonButton> : <button {...common}>{content}</button>;
}

export function HistoryActions({ onUndo, onRedo, canUndo, canRedo, disabled = false, presentation = "compact", undoLabel, redoLabel }: {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
  presentation?: Presentation;
  undoLabel?: string;
  redoLabel?: string;
}) {
  return <><HistoryActionButton action="undo" presentation={presentation} aria-label={undoLabel} disabled={disabled || !canUndo} onClick={onUndo} /><HistoryActionButton action="redo" presentation={presentation} aria-label={redoLabel} disabled={disabled || !canRedo} onClick={onRedo} /></>;
}
