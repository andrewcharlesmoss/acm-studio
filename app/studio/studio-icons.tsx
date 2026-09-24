/** Compatibility wrapper for ACM Studio's shared, original icon collection. */

import type { SVGProps } from "react";
import { AcmStudioIcon, type AcmStudioIconName } from "./acm-studio-icons";

export type StudioIconName = Extract<AcmStudioIconName,
  | "add" | "align-centre" | "align-left" | "align-right" | "archive"
  | "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "audio"
  | "block" | "button" | "check" | "chevron-down" | "chevron-right"
  | "close" | "code" | "copy" | "download" | "drag-handle" | "external"
  | "file" | "fit" | "folder" | "format-bold" | "format-italic" | "globe"
  | "heading" | "image" | "info" | "link" | "link-off" | "list" | "lock"
  | "lock-open" | "more-vertical" | "paragraph" | "pencil" | "quote" | "redo"
  | "rotate" | "seen" | "seen-off" | "separator" | "trash" | "undo" | "video"
  | "visibility" | "visibility-off" | "zoom-in" | "zoom-out">;

type StudioIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: StudioIconName; size?: number };

export function StudioIcon({ name, size = 24, ...props }: StudioIconProps) {
  return <AcmStudioIcon name={name} size={size} {...props} />;
}
