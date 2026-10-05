import { copyTemplateData, templateId, visitTemplateNodes, type TemplateNode, type TemplateSet, type PageTemplate, type TemplatePart } from "./template-model";

/** Clone one layout, copying its referenced parts only across template sets. */
export function cloneTemplateIntoSet(source: TemplateSet, sourceTemplate: PageTemplate, destination: TemplateSet, templateName: string): { template: PageTemplate; parts: TemplatePart[] } {
    const createFreshNodeCloner = (partIds: Map<string, string>) => (node: TemplateNode): TemplateNode => {
      const copy = copyTemplateData(node); copy.id = templateId();
      if (copy.type === "group" || copy.type === "section" || copy.type === "columns" || copy.type === "column") copy.children = copy.children.map(createFreshNodeCloner(partIds));
      if (copy.type === "quote" || copy.type === "buttons" || copy.type === "social-icons") copy.children = copy.children?.map(child => createFreshNodeCloner(partIds)(child as TemplateNode)) as typeof copy.children;
      if (copy.type === "part") copy.partId = partIds.get(copy.partId) ?? copy.partId;
      return copy;
    };
    return (() => {
      const partIds = new Map<string, string>();
      const referenced = new Set<string>();
      visitTemplateNodes(sourceTemplate.nodes, node => { if (node.type === "part") referenced.add(node.partId); });
      const parts: TemplatePart[] = [];
      const clonePart = (partId: string) => {
        if (partIds.has(partId)) return;
        const part = source.parts.find(item => item.id === partId);
        if (!part) return;
        partIds.set(part.id, templateId());
        const nested = new Set<string>();
        visitTemplateNodes(part.nodes, node => { if (node.type === "part") nested.add(node.partId); });
        nested.forEach(clonePart);
        parts.push({ ...copyTemplateData(part), id: partIds.get(part.id)!, nodes: part.nodes.map(createFreshNodeCloner(partIds)) });
      };
      if (source.id !== destination.id) referenced.forEach(clonePart);
      const cloner = createFreshNodeCloner(partIds);
      return { template: { ...copyTemplateData(sourceTemplate), id: templateId(), name: templateName, nodes: sourceTemplate.nodes.map(cloner) }, parts };
    })();
}
