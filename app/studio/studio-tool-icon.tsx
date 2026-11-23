import { AcmIcon } from "@andrewcharlesmoss/icons/react";
import type { IconName } from "@andrewcharlesmoss/icons";

/** Tool identity stays the same on the dashboard and in editor navigation. */
export const studioToolIcons = {
  siteEditor: "layout.columns",
  templates: "component.block",
  designs: "library.designs",
  motionAssets: "insert.video",
  uiLibrary: "layout.columns",
  content: "action.edit",
  files: "library.files",
  backup: "output.backup",
  bin: "action.delete",
} as const satisfies Record<string, IconName>;

export function StudioToolIcon({ tool, size = 24 }: { tool: keyof typeof studioToolIcons; size?: number }) {
  return <AcmIcon name={studioToolIcons[tool]} scale="Regular-M" size={size} />;
}
