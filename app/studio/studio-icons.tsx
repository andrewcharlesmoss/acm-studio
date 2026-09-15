/**
 * Studio's interaction icons are copied from WordPress Gutenberg's icon library.
 * The folder silhouette and compact rotate glyph are original Studio assets
 * requested for file browsing and canvas controls.
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Source revision: 1addb122219043a1ac1c38f817c71255ae16d6e3
 * See docs/third-party/gutenberg.md for provenance and distribution guidance.
 */

import type { SVGProps } from "react";

export type StudioIconName = "add" | "align-centre" | "align-left" | "align-right" | "archive" | "arrow-down" | "arrow-left" | "arrow-right" | "arrow-up" | "audio" | "block" | "button" | "check" | "chevron-down" | "chevron-right" | "close" | "code" | "copy" | "download" | "drag-handle" | "external" | "file" | "folder" | "format-bold" | "format-italic" | "globe" | "heading" | "image" | "info" | "link" | "link-off" | "list" | "lock" | "more-vertical" | "paragraph" | "pencil" | "quote" | "redo" | "rotate" | "seen" | "seen-off" | "separator" | "trash" | "undo" | "video" | "visibility" | "visibility-off";

type StudioIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: StudioIconName; size?: number };

function PageVisibilityIcon({ shared, hidden }: { shared: Record<string, unknown>; hidden?: boolean }) {
  return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"><path d="M3 12s3.3-5 9-5 9 5 9 5-3.3 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.5" />{hidden ? <path d="M4 4 20 20" /> : null}</svg>;
}

export function StudioIcon({ name, size = 24, ...props }: StudioIconProps) {
  const shared = { "aria-hidden": true, focusable: false, height: size, viewBox: "0 0 24 24", width: size, ...props };

  switch (name) {
    case "visibility": return <PageVisibilityIcon shared={shared} />;
    case "visibility-off": return <PageVisibilityIcon hidden shared={shared} />;
    case "folder": return <svg {...shared} fill="currentColor"><path opacity=".65" d="M2 6a2 2 0 0 1 2-2h5.1a2 2 0 0 1 1.4.6L12 6h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" /><path d="M2 9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z" /></svg>;
    case "seen": return <svg {...shared} fill="currentColor"><path d="M3.99961 13C4.67043 13.3354 4.6703 13.3357 4.67017 13.3359L4.67298 13.3305C4.67621 13.3242 4.68184 13.3135 4.68988 13.2985C4.70595 13.2686 4.7316 13.2218 4.76695 13.1608C4.8377 13.0385 4.94692 12.8592 5.09541 12.6419C5.39312 12.2062 5.84436 11.624 6.45435 11.0431C7.67308 9.88241 9.49719 8.75 11.9996 8.75C14.502 8.75 16.3261 9.88241 17.5449 11.0431C18.1549 11.624 18.6061 12.2062 18.9038 12.6419C19.0523 12.8592 19.1615 13.0385 19.2323 13.1608C19.2676 13.2218 19.2933 13.2686 19.3093 13.2985C19.3174 13.3135 19.323 13.3242 19.3262 13.3305L19.3291 13.3359C19.3289 13.3357 19.3288 13.3354 19.9996 13C20.6704 12.6646 20.6703 12.6643 20.6701 12.664L20.6697 12.6632L20.6688 12.6614L20.6662 12.6563L20.6583 12.6408C20.6517 12.6282 20.6427 12.6108 20.631 12.5892C20.6078 12.5459 20.5744 12.4852 20.5306 12.4096C20.4432 12.2584 20.3141 12.0471 20.1423 11.7956C19.7994 11.2938 19.2819 10.626 18.5794 9.9569C17.1731 8.61759 14.9972 7.25 11.9996 7.25C9.00203 7.25 6.82614 8.61759 5.41987 9.9569C4.71736 10.626 4.19984 11.2938 3.85694 11.7956C3.68511 12.0471 3.55605 12.2584 3.4686 12.4096C3.42484 12.4852 3.39142 12.5459 3.36818 12.5892C3.35656 12.6108 3.34748 12.6282 3.34092 12.6408L3.33297 12.6563L3.33041 12.6614L3.32948 12.6632L3.32911 12.664C3.32894 12.6643 3.32879 12.6646 3.99961 13ZM11.9996 16C13.9326 16 15.4996 14.433 15.4996 12.5C15.4996 10.567 13.9326 9 11.9996 9C10.0666 9 8.49961 10.567 8.49961 12.5C8.49961 14.433 10.0666 16 11.9996 16Z" /></svg>;
    case "link": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 12L14.5 12M10 7.75H8.25C5.90279 7.75 4 9.65279 4 12C4 14.3472 5.90279 16.25 8.25 16.25H10M14 16.25H15.75C18.0972 16.25 20 14.3472 20 12C20 9.65279 18.0972 7.75 15.75 7.75L14 7.75" vectorEffect="non-scaling-stroke" /></svg>;
    case "link-off": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 12H12.5M10 7.75H8.25C5.90279 7.75 4 9.65279 4 12C4 14.3472 5.90279 16.25 8.25 16.25H10.2333M14 16.25H15.75C18.0972 16.25 20 14.3472 20 12C20 9.65279 18.0972 7.75 15.75 7.75H14.7667M8.5 19.5L16.5 4.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
    case "paragraph": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.75 20V4.75L14.75 4.75M14.75 20V4.75M14.75 4.75H18.5" vectorEffect="non-scaling-stroke" /><path d="M5.75 9C5.75 11.3472 7.65279 13.25 10 13.25H10.75V4.75H10C7.65279 4.75 5.75 6.65279 5.75 9Z" fill="currentColor" vectorEffect="non-scaling-stroke" /></svg>;
    case "image": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 16.2031L8.6 12.7L12 15L16 11L20.25 15.2517M5 20.25H19C19.6904 20.25 20.25 19.6904 20.25 19V5C20.25 4.30964 19.6904 3.75 19 3.75H5C4.30964 3.75 3.75 4.30964 3.75 5V19C3.75 19.6904 4.30964 20.25 5 20.25Z" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
    case "code": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7.99997 7L3.70708 11.2929C3.31655 11.6834 3.31655 12.3166 3.70708 12.7071L7.99997 17M16 17L20.2929 12.7071C20.6834 12.3166 20.6834 11.6834 20.2929 11.2929L16 7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
    case "drag-handle": return <svg {...shared} fill="currentColor"><path d="M8 7h2V5H8v2zm0 6h2v-2H8v2zm0 6h2v-2H8v2zm6-14v2h2V5h-2zm0 8h2v-2h-2v2zm0 6h2v-2h-2v2z" /></svg>;
    case "format-bold": return <svg {...shared} fill="currentColor"><path d="M14.7 11.3c1-.6 1.5-1.6 1.5-3 0-2.3-1.3-3.4-4-3.4H7v14h5.8c1.4 0 2.5-.3 3.3-1 .8-.7 1.2-1.7 1.2-2.9.1-1.9-.8-3.1-2.6-3.7zm-5.1-4h2.3c.6 0 1.1.1 1.4.4.3.3.5.7.5 1.2s-.2 1-.5 1.2c-.3.3-.8.4-1.4.4H9.6V7.3zm4.6 9c-.4.3-1 .4-1.7.4H9.6v-3.9h2.9c.7 0 1.3.2 1.7.5.4.3.6.8.6 1.5s-.2 1.2-.6 1.5z" /></svg>;
    case "format-italic": return <svg {...shared} fill="currentColor"><path d="M12.5 5L10 19h1.9l2.5-14z" /></svg>;
    case "align-left": return <svg {...shared} fill="currentColor"><path d="M13 5.5H4V4h9v1.5Zm7 7H4V11h16v1.5Zm-7 7H4V18h9v1.5Z" /></svg>;
    case "align-centre": return <svg {...shared} fill="currentColor"><path d="M7.5 5.5h9V4h-9v1.5Zm-3.5 7h16V11H4v1.5Zm3.5 7h9V18h-9v1.5Z" /></svg>;
    case "align-right": return <svg {...shared} fill="currentColor"><path d="M11.111 5.5H20V4h-8.889v1.5ZM4 12.5h16V11H4v1.5Zm7.111 7H20V18h-8.889v1.5Z" /></svg>;
    case "quote": return <svg {...shared} fill="currentColor"><path d="M13 6v6h5.2v4c0 .8-.2 1.4-.5 1.7-.6.6-1.6.6-2.5.5h-.3v1.5h.5c1 0 2.3-.1 3.3-1 .6-.6 1-1.6 1-2.8V6H13zm-9 6h5.2v4c0 .8-.2 1.4-.5 1.7-.6.6-1.6.6-2.5.5h-.3v1.5h.5c1 0 2.3-.1 3.3-1 .6-.6 1-1.6 1-2.8V6H4v6z" /></svg>;
    case "list": return <svg {...shared} fill="currentColor"><path d="M4 4v1.5h16V4H4zm8 8.5h8V11h-8v1.5zM4 20h16v-1.5H4V20zm4-8c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z" /></svg>;
    case "heading": return <svg {...shared} fill="currentColor"><path d="M6 5V18.5911L12 13.8473L18 18.5911V5H6Z" /></svg>;
    case "button": return <svg {...shared} fill="currentColor"><path d="M8 12.5h8V11H8v1.5Z M19 6.5H5a2 2 0 0 0-2 2V15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2ZM5 8h14a.5.5 0 0 1 .5.5V15a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V8.5A.5.5 0 0 1 5 8Z" /></svg>;
    case "separator": return <svg {...shared} fill="currentColor"><path d="M4.5 12.5v4H3V7h1.5v3.987h15V7H21v9.5h-1.5v-4h-15Z" /></svg>;
    case "add": return <svg {...shared} fill="currentColor"><path d="M11 12.5V17.5H12.5V12.5H17.5V11H12.5V6H11V11H6V12.5H11Z" /></svg>;
    case "close": return <svg {...shared} fill="currentColor"><path d="M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.938 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z" /></svg>;
    case "undo": return <svg {...shared} fill="currentColor"><path d="M18.3 11.7c-.6-.6-1.4-.9-2.3-.9H6.7l2.9-3.3-1.1-1-4.5 5L8.5 16l1-1-2.7-2.7H16c.5 0 .9.2 1.3.5 1 1 1 3.4 1 4.5v.3h1.5v-.2c0-1.5 0-4.3-1.5-5.7z" /></svg>;
    case "redo": return <svg {...shared} fill="currentColor"><path d="M15.6 6.5l-1.1 1 2.9 3.3H8c-.9 0-1.7.3-2.3.9-1.4 1.5-1.4 4.2-1.4 5.6v.2h1.5v-.3c0-1.1 0-3.5 1-4.5.3-.3.7-.5 1.3-.5h9.2L14.5 15l1.1 1.1 4.6-4.6-4.6-5z" /></svg>;
    case "rotate": return <svg {...shared} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"><path d="M9.5 20C3.5 17.5 3.5 7 9.5 4M5.5 4h4v5M14.5 4C20.5 6.5 20.5 17 14.5 20M18.5 20h-4v-5" /></svg>;
    case "copy": return <svg {...shared} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M5 4.5h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5ZM3 5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm17 3v10.75c0 .69-.56 1.25-1.25 1.25H6v1.5h12.75a2.75 2.75 0 0 0 2.75-2.75V8H20Z" /></svg>;
    case "external": return <svg {...shared} fill="currentColor"><path d="M19.5 4.5h-7V6h4.44l-5.97 5.97 1.06 1.06L18 7.06v4.44h1.5v-7Zm-13 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3H17v3a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h3V5.5h-3Z" /></svg>;
    case "pencil": return <svg {...shared} fill="currentColor"><path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z" /></svg>;
    case "globe": return <svg {...shared} fill="currentColor"><path d="M12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8Zm6.5 8c0 .6 0 1.2-.2 1.8h-2.7c0-.6.2-1.1.2-1.8s0-1.2-.2-1.8h2.7c.2.6.2 1.1.2 1.8Zm-.9-3.2h-2.4c-.3-.9-.7-1.8-1.1-2.4-.1-.2-.2-.4-.3-.5 1.6.5 3 1.6 3.8 3ZM12.8 17c-.3.5-.6 1-.8 1.3-.2-.3-.5-.8-.8-1.3-.3-.5-.6-1.1-.8-1.7h3.3c-.2.6-.5 1.2-.8 1.7Zm-2.9-3.2c-.1-.6-.2-1.1-.2-1.8s0-1.2.2-1.8H14c.1.6.2 1.1.2 1.8s0 1.2-.2 1.8H9.9ZM11.2 7c.3-.5.6-1 .8-1.3.2.3.5.8.8 1.3.3.5.6 1.1.8 1.7h-3.3c.2-.6.5-1.2.8-1.7Zm-1-1.2c-.1.2-.2.3-.3.5-.4.7-.8 1.5-1.1 2.4H6.4c.8-1.4 2.2-2.5 3.8-3Zm-1.8 8H5.7c-.2-.6-.2-1.1-.2-1.8s0-1.2.2-1.8h2.7c0 .6-.2 1.1-.2 1.8s0 1.2.2 1.8Zm-2 1.4h2.4c.3.9.7 1.8 1.1 2.4.1.2.2.4.3.5-1.6-.5-3-1.6-3.8-3Zm7.4 3c.1-.2.2-.3.3-.5.4-.7.8-1.5 1.1-2.4h2.4c-.8 1.4-2.2 2.5-3.8 3Z" /></svg>;
    case "archive": return <svg {...shared} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M11.934 7.406a1 1 0 0 0 .914.594H19a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h5.764a.5.5 0 0 1 .447.276l.723 1.63Zm1.064-1.216a.5.5 0 0 0 .462.31H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 1.789 1.106l.445 1.084ZM8.5 10.5h7V12h-7v-1.5Zm7 3.5h-7v1.5h7V14Z" /></svg>;
    case "check": return <svg {...shared} fill="currentColor"><path d="M16.5 7.5 10 13.9l-2.5-2.4-1 1 3.5 3.6 7.5-7.6z" /></svg>;
    case "chevron-down": return <svg {...shared} fill="currentColor"><path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" /></svg>;
    case "chevron-right": return <svg {...shared} fill="currentColor"><path d="M10.6 6L9.4 7l4.6 5-4.6 5 1.2 1 5.4-6z" /></svg>;
    case "arrow-up": return <svg {...shared} fill="currentColor"><path d="M12 3.9 6.5 9.5l1 1 3.8-3.7V20h1.5V6.8l3.7 3.7 1-1z" /></svg>;
    case "arrow-down": return <svg {...shared} fill="currentColor"><path d="m16.5 13.5-3.7 3.7V4h-1.5v13.2l-3.8-3.7-1 1 5.5 5.6 5.5-5.6z" /></svg>;
    case "arrow-left": return <svg {...shared} fill="currentColor"><path d="M20 11.2H6.8l3.7-3.7-1-1L3.9 12l5.6 5.5 1-1-3.7-3.7H20z" /></svg>;
    case "arrow-right": return <svg {...shared} fill="currentColor"><path d="m14.5 6.5-1 1 3.7 3.7H4v1.6h13.2l-3.7 3.7 1 1 5.6-5.5z" /></svg>;
    case "audio": return <svg {...shared} fill="currentColor"><path d="M17.7 4.3c-1.2 0-2.8 0-3.8 1-.6.6-.9 1.5-.9 2.6V14c-.6-.6-1.5-1-2.5-1C8.6 13 7 14.6 7 16.5S8.6 20 10.5 20c1.5 0 2.8-1 3.3-2.3.5-.8.7-1.8.7-2.5V7.9c0-.7.2-1.2.5-1.6.6-.6 1.8-.6 2.8-.6h.3V4.3h-.4z" /></svg>;
    case "video": return <svg {...shared} fill="currentColor"><path d="M18.7 3H5.3C4 3 3 4 3 5.3v13.4C3 20 4 21 5.3 21h13.4c1.3 0 2.3-1 2.3-2.3V5.3C21 4 20 3 18.7 3zm.8 15.7c0 .4-.4.8-.8.8H5.3c-.4 0-.8-.4-.8-.8V5.3c0-.4.4-.8.8-.8h13.4c.4 0 .8.4.8.8v13.4zM10 15l5-3-5-3v6z" /></svg>;
    case "download": return <svg {...shared} fill="currentColor"><path d="M18 11.3l-1-1.1-4 4V3h-1.5v11.3L7 10.2l-1 1.1 6.2 5.8 5.8-5.8zm.5 3.7v3.5h-13V15H4v5h16v-5h-1.5z" /></svg>;
    case "file": return <svg {...shared} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12.848 8a1 1 0 0 1-.914-.594l-.723-1.63a.5.5 0 0 0-.447-.276H5a.5.5 0 0 0-.5.5v11.5a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5v-9A.5.5 0 0 0 19 8h-6.152Zm.612-1.5a.5.5 0 0 1-.462-.31l-.445-1.084A2 2 0 0 0 10.763 4H5a2 2 0 0 0-2 2v11.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-5.54Z" /></svg>;
    case "info": return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 16V11M12 9.5V8M19.25 12C19.25 16.0041 16.0041 19.25 12 19.25C7.99594 19.25 4.75 16.0041 4.75 12C4.75 7.99594 7.99594 4.75 12 4.75C16.0041 4.75 19.25 7.99594 19.25 12Z" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
    case "trash": return <svg {...shared} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 5.5A2.25 2.25 0 0 0 9.878 7h4.244A2.251 2.251 0 0 0 12 5.5ZM12 4a3.751 3.751 0 0 0-3.675 3H5v1.5h1.27l.818 8.997a2.75 2.75 0 0 0 2.739 2.501h4.347a2.75 2.75 0 0 0 2.738-2.5L17.73 8.5H19V7h-3.325A3.751 3.751 0 0 0 12 4Zm4.224 4.5H7.776l.806 8.861a1.25 1.25 0 0 0 1.245 1.137h4.347a1.25 1.25 0 0 0 1.245-1.137l.805-8.861Z" /></svg>;
    case "lock": return <svg {...shared} fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M8 8V6a4 4 0 0 1 8 0v2h1a2 2 0 0 1 2 2v9H5v-9a2 2 0 0 1 2-2h1Zm1.5 0h5V6a2.5 2.5 0 0 0-5 0v2ZM6.5 9.5v8h11v-8h-11Z" /></svg>;
    case "more-vertical": return <svg {...shared} fill="currentColor"><path d="M13 19h-2v-2h2v2zm0-6h-2v-2h2v2zm0-6h-2V5h2v2z" /></svg>;
    default: return <svg {...shared} fill="currentColor"><path d="M19 8h-1V6h-5v2h-2V6H6v2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm.5 10c0 .3-.2.5-.5.5H5c-.3 0-.5-.2-.5-.5v-8c0-.3.2-.5.5-.5h14c.3 0 .5.2.5.5v8z" /></svg>;
  }
}
