import type { NavigationTemplateNode, TemplateNode, TemplateSet, TemplateStore } from "./template-model";

/** Read effective Header artwork; the private menu owner is never a design source. */
export function navigationVisualPresentation(store: TemplateStore, header: { setId: string; partId: string } | undefined): { set: TemplateSet; node: NavigationTemplateNode } | undefined {
  const set = store.sets.find(item => item.id === header?.setId);
  const part = set?.parts.find(item => item.id === header?.partId);
  if (!set || !part) return;
  const visited = new Set<string>([part.id]);
  function find(nodes: TemplateNode[]): NavigationTemplateNode | undefined {
    for (const node of nodes) {
      if (node.type === "element" && node.element === "navigation") return node;
      if (node.type === "part" && !visited.has(node.partId)) {
        visited.add(node.partId);
        const referenced = set!.parts.find(item => item.id === node.partId);
        const found = referenced && find(referenced.nodes);
        if (found) return found;
      }
      if ("children" in node && Array.isArray(node.children)) {
        const found = find(node.children as TemplateNode[]);
        if (found) return found;
      }
    }
  }
  const node = find(part.nodes);
  return node ? { set, node } : undefined;
}
