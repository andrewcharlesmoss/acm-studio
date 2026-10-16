import { DOCUMENT_FIELD_CATALOGUE } from "./document-fields";
import { templatePartReference, visitTemplateNodes, type PageTemplate, type TemplatePart, type TemplateSet, type TemplateNode } from "./template-model";

/** Site identity and menu links need a site context, but not a sample document. */
export function templateNeedsPreviewContent(target: PageTemplate | TemplatePart, set: TemplateSet): boolean {
  if (target.kind !== "header" && target.kind !== "footer") return true;
  const seen = new Set<string>([target.id]);
  let needed = false;
  const inspect = (nodes: TemplateNode[]) => visitTemplateNodes(nodes, node => {
    // Retained hidden fields and fixed featured images still inherit document
    // visibility (and may link to its address), so keep their document context.
    if (DOCUMENT_FIELD_CATALOGUE.some(field => node.type === "element"
      ? field.templateElements?.includes(node.element)
      : node.type !== "part" && field.displayBlocks?.includes(node.type)) || node.type === "element" && node.element === "content") needed = true;
    const id = templatePartReference(node);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const part = set.parts.find(part => part.id === id);
    if (part) inspect(part.nodes);
  });
  inspect(target.nodes);
  return needed;
}
