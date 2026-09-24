/**
 * Reusable ACM Studio icon artwork. These SVGs are drawn for ACM Studio and
 * do not include third-party icon paths.
 */

import type { SVGProps } from "react";

export type AcmStudioIconName =
  | "add" | "align-centre" | "align-left" | "align-right" | "archive"
  | "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "audio"
  | "block" | "button" | "check" | "chevron-down" | "chevron-right"
  | "close" | "code" | "copy" | "download" | "drag-handle" | "external"
  | "file" | "fit" | "folder" | "format-bold" | "format-italic" | "globe"
  | "heading" | "image" | "info" | "link" | "link-off" | "list" | "lock"
  | "lock-open" | "more-vertical" | "paragraph" | "pencil" | "quote" | "redo"
  | "rotate" | "seen" | "seen-off" | "separator" | "trash" | "undo" | "video"
  | "visibility" | "visibility-off" | "zoom-in" | "zoom-out"
  | "footnote" | "highlight" | "inline-code" | "inline-image" | "keyboard"
  | "language" | "math" | "strikethrough" | "subscript" | "superscript"
  | "table" | "table-row-before" | "table-row-after" | "table-row-delete"
  | "table-column-before" | "table-column-after" | "table-column-delete";

type AcmStudioIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: AcmStudioIconName; size?: number };

export function AcmStudioIcon({ name, size = 24, ...props }: AcmStudioIconProps) {
  const shared = { "aria-hidden": true, focusable: false, height: size, viewBox: "0 0 24 24", width: size, ...props };
  const line = { ...shared, fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.65 };

  switch (name) {
    // The common meanings remain familiar; the line work is ACM's own.
    case "add": return <svg {...line}><path d="M12 5v14M5 12h14" /></svg>;
    case "align-left": return <svg {...line}><path d="M4 6h12M4 12h16M4 18h9" /></svg>;
    case "align-centre": return <svg {...line}><path d="M6 6h12M4 12h16M7 18h10" /></svg>;
    case "align-right": return <svg {...line}><path d="M8 6h12M4 12h16M11 18h9" /></svg>;
    case "archive": return <svg {...line}><path d="M4 8.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM3 5h18v3.5H3zM9 12h6" /></svg>;
    case "arrow-down": return <svg {...line}><path d="M12 4v15m-6-6 6 6 6-6" /></svg>;
    case "arrow-left": return <svg {...line}><path d="M20 12H5m6-6-6 6 6 6" /></svg>;
    case "arrow-right": return <svg {...line}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
    case "arrow-up": return <svg {...line}><path d="M12 20V5m-6 6 6-6 6 6" /></svg>;
    case "audio": return <svg {...line}><path d="M14 18V5l6-1v13M14 8l6-1M14 18c0 1.3-1.4 2.5-3 2.5S8 19.7 8 18.5 9.4 16 11 16s3 .8 3 2Zm6-1c0 1.2-1.4 2.5-3 2.5" /></svg>;
    case "block": return <svg {...line}><rect x="3.5" y="4" width="12" height="12" rx="2" /><path d="M8.5 19.5h9a3 3 0 0 0 3-3v-9" /><path d="M7 8h5M7 11h3" /></svg>;
    case "button": return <svg {...line}><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M8 12h8" /></svg>;
    case "check": return <svg {...line}><path d="m4.5 12.5 4.6 4.2L19.5 6.8" /></svg>;
    case "chevron-down": return <svg {...line}><path d="m6 9 6 6 6-6" /></svg>;
    case "chevron-right": return <svg {...line}><path d="m9 5 7 7-7 7" /></svg>;
    case "close": return <svg {...line}><path d="m6 6 12 12M18 6 6 18" /></svg>;
    case "code": return <svg {...line}><path d="m8 6-5 6 5 6m8-12 5 6-5 6m-2-14-4 16" /></svg>;
    case "copy": return <svg {...line}><rect x="7" y="4" width="13" height="14" rx="2" /><path d="M5 8H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" /></svg>;
    case "download": return <svg {...line}><path d="M12 3v12m-5-5 5 5 5-5M4 18v2h16v-2" /></svg>;
    case "drag-handle": return <svg {...line}><circle cx="8" cy="6" r="1" /><circle cx="16" cy="6" r="1" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /><circle cx="8" cy="18" r="1" /><circle cx="16" cy="18" r="1" /></svg>;
    case "external": return <svg {...line}><path d="M13 5h6v6m0-6-9 9" /><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
    case "file": return <svg {...line}><path d="M6 3.5h8l4 4V20H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5Z" /><path d="M14 4v4h4M8 12h7M8 16h7" /></svg>;
    case "fit": return <svg {...line} strokeWidth="1.6"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5" /></svg>;
    case "folder": return <svg {...shared} fill="currentColor"><path opacity=".65" d="M2 6a2 2 0 0 1 2-2h5.1a2 2 0 0 1 1.4.6L12 6h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" /><path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z" /></svg>;
    case "format-bold": return <svg {...line}><path d="M7 4.5h6a4 4 0 0 1 1.4 7.7A4.2 4.2 0 0 1 13 20H7zM7 12h6" /></svg>;
    case "format-italic": return <svg {...line}><path d="M14.5 4h-5m5 16h-5m5-16-5 16" /></svg>;
    case "globe": return <svg {...line}><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></svg>;
    case "heading": return <svg {...line}><path d="M5 5v14M19 5v14M5 12h14" /><path d="M3.5 5h3M17.5 19h3" /></svg>;
    case "image": return <svg {...line}><rect x="3.5" y="4" width="17" height="16" rx="2" /><circle cx="9" cy="9" r="1.4" /><path d="m5 17 4.5-4 3.2 2.7 2.5-2.1 3.8 3.4" /></svg>;
    case "info": return <svg {...line}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>;
    case "link": return <svg {...line}><path d="M9.5 8H7a4 4 0 0 0 0 8h3m4-8h3a4 4 0 0 1 0 8h-3M8.5 12h7" /><path d="M8 10.5v3m8-3v3" /></svg>;
    case "link-off": return <svg {...line}><path d="M9.5 8H7a4 4 0 0 0 0 8h3m4-8h3a4 4 0 0 1 0 8h-3M8.5 12h7M6 5l12 14" /></svg>;
    case "list": return <svg {...line}><circle cx="4.5" cy="6" r=".8" /><circle cx="4.5" cy="12" r=".8" /><circle cx="4.5" cy="18" r=".8" /><path d="M8 6h12M8 12h9M8 18h12" /></svg>;
    case "lock": return <svg {...line}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>;
    case "lock-open": return <svg {...line}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7-2.7m-3 9.7v3" /></svg>;
    case "more-vertical": return <svg {...line}><circle cx="12" cy="5" r="1.1" /><circle cx="12" cy="12" r="1.1" /><circle cx="12" cy="19" r="1.1" /></svg>;
    case "paragraph": return <svg {...line}><path d="M14 20V4h-3a5 5 0 0 0 0 10h3M18 4v16M14 4h5" /></svg>;
    case "pencil": return <svg {...line}><path d="m5 16-.8 4 4-.8L19 8.4 15.6 5zM14.5 6.1l3.4 3.4M5 20h14" /></svg>;
    case "quote": return <svg {...line}><path d="M10 6H6a2 2 0 0 0-2 2v4h6v6H4m16-12h-4a2 2 0 0 0-2 2v4h6v6h-6" /></svg>;
    case "redo": return <svg {...line}><path d="M19 10h-9a5 5 0 0 0 0 10h2m7-10-4-4m4 4-4 4" /></svg>;
    case "rotate": return <svg {...line} strokeWidth="1.5"><path d="M9.5 20C3.5 17.5 3.5 7 9.5 4M5.5 4h4v5M14.5 4C20.5 6.5 20.5 17 14.5 20M18.5 20h-4v-5" /></svg>;
    case "seen": return <svg {...line}><path d="M2.8 12s3.1-5.1 9.2-5.1 9.2 5.1 9.2 5.1-3.1 5.1-9.2 5.1S2.8 12 2.8 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "visibility": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M3 12s3.3-5 9-5 9 5 9 5-3.3 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "seen-off":
    case "visibility-off": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M3 12s3.3-5 9-5 9 5 9 5-3.3 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.5" /><path d="M4 4 20 20" /></svg>;
    case "separator": return <svg {...line}><path d="M4 12h16M4 9v6m16-6v6" /></svg>;
    case "trash": return <svg {...line}><path d="M4 7h16M9 7V4.5h6V7m3 0-.8 13H6.8L6 7m3.5 4v5m5-5v5" /></svg>;
    case "undo": return <svg {...line}><path d="M5 10h9a5 5 0 0 1 0 10h-2m-7-10 4-4m-4 4 4 4" /></svg>;
    case "video": return <svg {...line}><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3zM8 9l4 3-4 3z" /></svg>;
    case "zoom-in": return <svg {...line} strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4.5 4.5M10.5 7.5v6M7.5 10.5h6" /></svg>;
    case "zoom-out": return <svg {...line} strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4.5 4.5M7.5 10.5h6" /></svg>;
    case "footnote": return <svg {...line}><path d="M5 4.5h5v5M4.5 10h5.8M11.5 7.5h8M11.5 12h8M4.5 15.5h5.8M4.5 19.5h15" /><path d="M6.5 13.5v4M5 14.3l1.5-.8" /></svg>;
    case "highlight": return <svg {...line}><path d="m14.8 4.5 4.7 4.7-8.8 8.8-4.7-4.7 8.8-8.8Z" /><path d="m12.6 6.7 4.7 4.7M5 19.5h13.5M7 17.5l3 2" /></svg>;
    case "inline-code": return <svg {...line}><path d="m8.5 6.5-5 5.5 5 5.5M15.5 6.5l5 5.5-5 5.5M13.5 4.5l-3 15" /></svg>;
    case "inline-image": return <svg {...line}><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="9" r="1.4" /><path d="m5 17 4.5-4.5 3 2.5 2.3-2 4.2 4" /></svg>;
    case "keyboard": return <svg {...line}><rect x="2.8" y="5.5" width="18.4" height="13" rx="1.7" /><path d="M6 9h.1M9 9h.1M12 9h.1M15 9h.1M18 9h.1M6 12h.1M9 12h.1M12 12h.1M15 12h.1M18 12h.1M7.5 15.2h9" /></svg>;
    case "language": return <svg {...line}><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></svg>;
    case "math": return <svg {...line}><path d="M3 14h3l2.2 3.1L11.4 6c.2-.7.6-1 1.3-1H20M14 12l5 5m0-5-5 5" /></svg>;
    case "strikethrough": return <svg {...line}><path d="M7 7c1-1.4 2.6-2 5-2 3 0 5 1.2 5 3m-12 4h14m-12 5c1.1 1.3 2.7 2 5 2 3 0 5-1.2 5-3" /></svg>;
    case "subscript": return <svg {...line}><path d="m4 5 8 8m0-8-8 8m10 1h6v5h-6l6-5" /></svg>;
    case "superscript": return <svg {...line}><path d="m4 10 8 8m0-8-8 8m10-8h6v5h-6l6-5" /></svg>;
    case "table": return <svg {...line}><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 10h17M3.5 15h17M10 4v16M15.5 4v16" /></svg>;
    case "table-row-before": return <svg {...line}><rect x="4" y="7" width="16" height="13" rx="1.5" /><path d="M4 12h16m-10-5v13m5-13v13M12 2v3m-2-2 2-2 2 2" /></svg>;
    case "table-row-after": return <svg {...line}><rect x="4" y="4" width="16" height="13" rx="1.5" /><path d="M4 9h16m-10-5v13m5-13v13M12 18v4m-2-2 2 2 2-2" /></svg>;
    case "table-row-delete": return <svg {...line}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h16m-10-5v16m5-16v16m-2 1 4-4m0 4-4-4" /></svg>;
    case "table-column-before": return <svg {...line}><rect x="7" y="4" width="13" height="16" rx="1.5" /><path d="M12 4v16m5-16v16M2 12h3m-2-2-2 2 2 2" /></svg>;
    case "table-column-after": return <svg {...line}><rect x="4" y="4" width="13" height="16" rx="1.5" /><path d="M9 4v16m5-16v16m5-8h3m-2-2 2 2-2 2" /></svg>;
    case "table-column-delete": return <svg {...line}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M9 4v16m5-16v16m-3 1 4-4m0 4-4-4" /></svg>;
  }
}
