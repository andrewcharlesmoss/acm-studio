/** Compatibility wrapper for ACM Studio's shared, original icon collection. */

import type { SVGProps } from "react";
import { AcmIcon } from "@acm/icons/react";
import type { IconName } from "@acm/icons";
import { AcmStudioIcon, type AcmStudioIconName } from "./acm-studio-icons";

export type StudioIconName = Extract<AcmStudioIconName,
  | "add" | "align-centre" | "align-left" | "align-right" | "archive"
  | "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "audio"
  | "block" | "button" | "check" | "chevron-down" | "chevron-right"
  | "close" | "code" | "copy" | "download" | "drag-handle" | "external"
  | "file" | "fit" | "folder" | "format-bold" | "format-italic" | "globe"
  | "heading" | "image" | "info" | "link" | "link-off" | "list" | "lock"
  | "lock-open" | "more-vertical" | "paragraph" | "pencil" | "quote" | "redo"
  | "rotate" | "seen" | "seen-off" | "separator" | "sliders" | "spacer" | "clock" | "calendar" | "heading-marker" | "trash" | "undo" | "video"
  | "visibility" | "visibility-off" | "zoom-in" | "zoom-out">;

type StudioIconProps = Omit<SVGProps<SVGSVGElement>, "children" | "scale"> & { name: StudioIconName; size?: number };

const sharedSymbols: Partial<Record<StudioIconName, IconName>> = {
  add: "action.add",
  archive: "action.archive",
  "arrow-down": "arrange.move-down",
  "arrow-left": "navigation.back",
  "arrow-right": "navigation.forward",
  "arrow-up": "arrange.move-up",
  audio: "insert.audio",
  block: "component.block",
  button: "insert.button",
  calendar: "time.calendar",
  check: "state.selected",
  clock: "time.clock",
  close: "action.close",
  code: "text.code",
  copy: "action.copy",
  download: "action.download",
  external: "navigation.external",
  file: "output.backup",
  fit: "view.fit",
  folder: "library.files",
  pencil: "action.edit",
  "format-bold": "text.bold",
  "format-italic": "text.italic",
  heading: "text.heading",
  "heading-marker": "text.heading",
  image: "insert.image",
  link: "action.link",
  "link-off": "action.unlink",
  info: "state.info",
  lock: "security.lock",
  "lock-open": "security.unlock",
  list: "text.list-bulleted",
  "more-vertical": "action.more",
  paragraph: "text.paragraph",
  quote: "text.quote",
  separator: "layout.separator",
  spacer: "layout.spacer",
  trash: "action.delete",
  "chevron-right": "navigation.chevron-right",
  undo: "action.undo",
  redo: "action.redo",
  rotate: "arrange.rotate",
  sliders: "action.adjust",
  "drag-handle": "arrange.reorder",
  seen: "view.show",
  "seen-off": "view.hide",
  visibility: "view.show",
  "visibility-off": "view.hide",
  globe: "text.language",
  "zoom-in": "view.zoom-in",
  "zoom-out": "view.zoom-out",
  "align-left": "text.align-left",
  "align-centre": "text.align-centre",
  "align-right": "text.align-right",
  video: "insert.video",
};

export function StudioIcon({ name, size = 24, ...props }: StudioIconProps) {
  const sharedSymbol = sharedSymbols[name];
  if (sharedSymbol) {
    return <AcmIcon name={sharedSymbol} scale="Regular-M" size={size} {...props} />;
  }
  return <AcmStudioIcon name={name} size={size} {...props} />;
}
