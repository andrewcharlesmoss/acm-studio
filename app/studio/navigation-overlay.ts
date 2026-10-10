import { copyTemplateData, templateId, visitTemplateNodes, type TemplateSet } from "./template-model";

/** Create and assign an overlay in the same existing template transaction. */
export function createNavigationOverlay(source: TemplateSet, navigationId: string): { set: TemplateSet; partId: string } | null {
  if (source.parts.length >= 100) return null;
  const set = copyTemplateData(source);
  let owner: import("./template-model").NavigationTemplateNode | undefined;
  for (const entry of [...set.templates, ...set.parts]) {
    if (entry.kind === "overlay") continue;
    visitTemplateNodes(entry.nodes, node => { if (node.id === navigationId && node.type === "element" && node.element === "navigation") owner = node; });
  }
  if (!owner) return null;
  const partId = templateId();
  const names = new Set(set.parts.map(part => part.name));
  let name = "Navigation Overlay";
  for (let index = 2; names.has(name); index++) name = `Navigation Overlay ${index}`;
  set.parts.push({ id: partId, name, kind: "overlay", nodes: [{ id: templateId(), type: "group", layout: "stack", paddingX: 32, paddingY: 64, visualStyle: { backgroundColor: owner.submenuBackgroundColor ?? "#FFFFFF", textColor: owner.submenuTextColor ?? "#1E1E1E" }, children: [{ id: templateId(), type: "element", element: "navigation", overlayMenu: "never", layout: "stack", gap: 20 }] }] });
  owner.overlayPartId = partId;
  return { set, partId };
}
