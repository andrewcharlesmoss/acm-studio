import { createTemplateSet, validateTemplateSet, type TemplateNode } from "../../template-model.ts";
import type { WebsiteLayoutValues } from "../../website-layout.ts";

/** Only this isolated editor host consumes these dimensions; no site is adopted. */
export function websitePreviewGeometry(layout: WebsiteLayoutValues, viewportWidth: number, gutter: number) {
  const site = layout.siteWidth.mode === "full" ? viewportWidth : Math.min(viewportWidth, layout.siteWidth.maxWidth);
  const inset = Math.min(gutter, site / 2);
  const available = Math.max(0, site - inset * 2);
  return { site, gutter: inset, content: Math.min(available, layout.contentWidth), wide: Math.min(available, layout.wideWidth), available };
}
export function createWebsiteEditorExample() {
  const set = createTemplateSet("Website example");
  set.identity.name = "Example Website";
  set.identity.copyright = "A temporary website example";
  const nodes: TemplateNode[] = [
    { id: "example-header", type: "element", element: "site-identity" },
    { id: "example-title", type: "heading", level: 1, text: "Room for your ideas" },
    { id: "example-intro", type: "paragraph", text: "A comfortable content column makes longer passages easy to read. Adjust Content Width to see this text wrap, or select a block and try editing it." },
    { id: "example-wide", type: "group", layout: "stack", blockAlign: "wide", visualStyle: { backgroundColor: "#F2F2F7" }, children: [
      { id: "example-wide-title", type: "heading", level: 2, text: "A wider perspective" },
      { id: "example-wide-copy", type: "paragraph", text: "This wide block follows Wide Width. Page gutters keep its edges away from the outside of the site." },
    ] },
    { id: "example-body", type: "paragraph", text: "Ordinary content returns to the content width. Try Desktop, Tablet and Mobile to compare the same example at different viewport widths." },
    { id: "example-full", type: "group", layout: "stack", blockAlign: "full", visualStyle: { backgroundColor: "#EAF3FF" }, children: [
      { id: "example-full-title", type: "heading", level: 2, text: "The full available width" },
      { id: "example-full-copy", type: "paragraph", text: "This full-width section uses the available site area inside the page gutters." },
    ] },
  ];
  const template = set.templates.find(item => item.kind === "page")!;
  template.nodes = nodes;
  return { set: validateTemplateSet(set), targetId: template.id };
}
