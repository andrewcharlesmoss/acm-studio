/**
 * Original ACM Studio rich-text icons, drawn for this editor and reusable
 * through the Studio-owned icon API. These paths do not copy upstream artwork.
 */
import type { SVGProps } from "react";

export type AcmStudioIconName = "footnote" | "highlight" | "inline-code" | "inline-image" | "keyboard" | "language" | "math" | "strikethrough" | "subscript" | "superscript";

type AcmStudioIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: AcmStudioIconName; size?: number };

export function AcmStudioIcon({ name, size = 20, ...props }: AcmStudioIconProps) {
  const shared = { "aria-hidden": true, focusable: false, height: size, viewBox: "0 0 24 24", width: size, ...props };

  switch (name) {
    case "footnote": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"><path d="M5 4.5h5v5M4.5 10h5.8M11.5 7.5h8M11.5 12h8M4.5 15.5h5.8M4.5 19.5h15" /><path d="M6.5 13.5v4M5 14.3l1.5-.8" /></svg>;
    case "highlight": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="m14.8 4.5 4.7 4.7-8.8 8.8-4.7-4.7 8.8-8.8Z" /><path d="m12.6 6.7 4.7 4.7M5 19.5h13.5M7 17.5l3 2" /></svg>;
    case "inline-code": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"><path d="m8.5 6.5-5 5.5 5 5.5M15.5 6.5l5 5.5-5 5.5M13.5 4.5l-3 15" /></svg>;
    case "inline-image": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><circle cx="9" cy="9" r="1.4" /><path d="m5 17 4.5-4.5 3 2.5 2.3-2 4.2 4" /></svg>;
    case "keyboard": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><rect x="2.8" y="5.5" width="18.4" height="13" rx="1.7" /><path d="M6 9h.1M9 9h.1M12 9h.1M15 9h.1M18 9h.1M6 12h.1M9 12h.1M12 12h.1M15 12h.1M18 12h.1M7.5 15.2h9" /></svg>;
    case "language": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z" /></svg>;
    case "math": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.65"><path d="M2.8 14.2h3l2 3 3.1-10.4c.2-.6.5-.8 1.1-.8h8.2" /><path d="m14 12 5 5M19 12l-5 5" /></svg>;
    case "strikethrough": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M7 7.2c1.1-1.5 2.4-2.2 4.7-2.2 2.4 0 4.5 1.1 5.1 3M5 12h14M17 16.8c-1 1.6-2.5 2.2-5.1 2.2-2.3 0-4.3-.8-5.2-2.4" /></svg>;
    case "subscript": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="m3.5 5.5 8 8M11.5 5.5l-8 8M14 16h6v4h-6l6-4" /></svg>;
    case "superscript": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="m3.5 10.5 8 8M11.5 10.5l-8 8M14 4h6v4h-6l6-4" /></svg>;
  }
}
