import { visitTemplateNodes, type TemplateNode } from "./template-model";

export function templateMediaTargetKind(nodes: TemplateNode[], target: { blockId: string | null; logo?: boolean; background?: boolean }): "background" | "cover" | "block" {
  if (target.background) return "background";
  if (target.logo) return "block";
  let featuredImage = false;
  visitTemplateNodes(nodes, node => {
    if (node.id === target.blockId && node.type === "element" && node.element === "cover-image") featuredImage = true;
  });
  return featuredImage ? "cover" : "block";
}
