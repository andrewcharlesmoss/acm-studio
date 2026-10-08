import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";

/** Tool identity stays the same on the dashboard and in editor navigation. */
export const studioToolIcons = {
  templates: "component.block",
  designs: "library.designs",
  uiLibrary: "layout.columns",
  content: "action.edit",
  files: "library.files",
  backup: "output.backup",
  bin: "action.delete",
} as const satisfies Record<string, IconName>;

export function StudioToolIcon({ tool, size = 24 }: { tool: keyof typeof studioToolIcons; size?: number }) {
  return <AcmIcon name={studioToolIcons[tool]} scale="Regular-M" size={size} />;
}
