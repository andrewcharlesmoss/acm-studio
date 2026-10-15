import { createTemplateSet, validateTemplateSet, type TemplatePart } from "../../template-model.ts";

/** Isolated fixtures; no product templates or browser stores are read or written. */
export function createBlockAppenderExample() {
  const set = createTemplateSet("Block appender example");
  const header = set.parts.find(part => part.kind === "header")!;
  const navigation: TemplatePart = { id: "appender-navigation-part", name: "Navigation", kind: "header", nodes: [{ id: "appender-navigation", type: "element", element: "navigation", align: "right", overlayMenu: "never" }] };
  const empty: TemplatePart = { id: "appender-empty-part", name: "Empty", kind: "header", nodes: [] };
  set.parts.push(navigation, empty);
  set.navigation = ["Home", "About", "Blog", "Contact"].map((label, index) => ({ id: `appender-link-${index}`, label, url: `#appender-link-${index}` }));
  return { set: validateTemplateSet(set), targets: { header: header.id, navigation: navigation.id, empty: empty.id } };
}
