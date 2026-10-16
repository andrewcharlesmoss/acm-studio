/** Canonical browser-local addresses, separate from fixture hash navigation. */
export function localPublicationHref(document: { kind: "post" | "page"; slug?: string }) {
  return `/${document.kind === "page" ? "pages" : "writing"}/${encodeURIComponent(document.slug ?? "")}`;
}
