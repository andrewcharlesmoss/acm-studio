import { copyTemplateData, visitTemplateNodes, templateId, type TemplateNode, type TemplatePart } from "./template-model";
import { createReferenceTemplateParts } from "./reference-template-parts";

export const headerDesigns = [
  { id: "centred", label: "Centred site header" },
  { id: "columns", label: "Header with columns" },
  { id: "large", label: "Header with large title" },
  { id: "compact", label: "Header" },
] as const;
export type HeaderDesign = typeof headerDesigns[number]["id"];

function headerDesignRow(node: TemplateNode | undefined): TemplateNode | undefined {
  if (node?.type === "group" && node.visualStyle?.className === "tt5-header-shell") return node.children[0];
  return node;
}

/** Only rearrange a simple identity/navigation group; custom layouts stay intact. */
export function applyHeaderDesign(nodes: TemplateNode[], design: HeaderDesign, insideShell = false): TemplateNode[] | null {
  if (nodes.length === 1 && nodes[0].type === "group" && nodes[0].visualStyle?.className === "tt5-header-shell") {
    const shell = nodes[0];
    const children = applyHeaderDesign(shell.children, design, true);
    if (!children) return null;
    const variation = headerDesignPart(design).nodes[0];
    if (variation.type !== "group") return null;
    // The divider belongs to the full shell, and must follow the chosen design.
    const { borderWidthSides: _sides, borderColor: _colour, ...retainedStyle } = shell.visualStyle ?? {};
    return [{ ...shell, visualStyle: { ...retainedStyle, ...(variation.visualStyle?.borderWidthSides ? { borderWidthSides: variation.visualStyle.borderWidthSides, borderColor: variation.visualStyle.borderColor } : {}) }, children }];
  }
  const titleGroup = nodes.find(node => node.type === "group" && node.children.length >= 2 && node.children.length <= 3 && ["site-title", "navigation"].every(element => node.children.filter(child => child.type === "element" && child.element === element).length === 1) && node.children.filter(child => child.type === "element" && child.element === "site-logo").length <= 1 && node.children.every(child => child.type === "element" && ["site-title", "navigation", "site-logo"].includes(child.element)) && node.children.some(child => child.type === "element" && child.element === "site-title") && node.children.some(child => child.type === "element" && child.element === "navigation"));
  if (titleGroup?.type === "group") {
    const variation = headerDesignRow(headerDesignPart(design).nodes[0]);
    if (variation?.type !== "group") return null;
    const children = variation.children.map(node => {
      if (node.type !== "element") return node;
      const existing = titleGroup.children.find(child => child.type === "element" && child.element === node.element);
      if (existing?.type === "element") return { ...existing, ...node, id: existing.id } as TemplateNode;
      return { ...node, id: templateId() };
    });
    const row = { ...titleGroup, ...variation, id: titleGroup.id, children };
    const sourceShell = headerDesignPart(design).nodes[0];
    // Explicitly applying a reference design also adopts its full-width shell.
    // Retain the row and element IDs, including the site's Navigation assignment.
    const replacement = !insideShell && sourceShell.type === "group" && sourceShell.visualStyle?.className === "tt5-header-shell"
      ? { ...sourceShell, id: templateId(), children: [row] }
      : row;
    return nodes.map(node => node.id === titleGroup.id ? replacement : node);
  }
  const index = nodes.findIndex(node => node.type === "group" && node.children.length === 2
    && node.children.some(child => child.type === "element" && child.element === "site-identity")
    && node.children.some(child => child.type === "element" && child.element === "navigation"));
  if (index < 0 || design === "large") return null;
  const group = nodes[index];
  if (group.type !== "group") return null;
  const identity = group.children.find(child => child.type === "element" && child.element === "site-identity")!;
  const navigation = group.children.find(child => child.type === "element" && child.element === "navigation")!;
  if (navigation.type !== "element" || navigation.element !== "navigation") return null;
  const children = [identity, { ...navigation, layout: design === "columns" ? "stack" as const : "row" as const, horizontalAlign: design === "centred" ? "centre" as const : design === "columns" ? "left" as const : "right" as const }];
  const updated = { ...group, ...(design === "columns" ? { columns: 3 } : {}), layout: design === "centred" ? "stack" as const : design === "columns" ? "columns" as const : "row" as const, horizontalAlign: design === "centred" ? "centre" as const : design === "columns" ? "stretch" as const : "space-between" as const, children };
  return nodes.map((node, i) => i === index ? updated : node);
}

export const footerDesigns = [
  { id: 'centred', label: 'Centred footer' },
  { id: 'columns', label: 'Footer with columns' },
  { id: 'newsletter', label: 'Footer Newsletter' },
  { id: 'social', label: 'Centred footer with social links' },
  { id: 'default', label: 'Footer' },
] as const;
export type FooterDesign = typeof footerDesigns[number]['id'];

/** Variation records remain template nodes, independent from each site's title and menu. */
export function footerDesignPart(design: FooterDesign): TemplatePart {
  const source = createReferenceTemplateParts();
  const slug = design === 'columns' ? 'footer-columns' : design === 'newsletter' ? 'footer-newsletter' : 'footer';
  const base = source.parts.find(part => part.id === `tt5-${slug}`)!;
  if (design !== 'centred' && design !== 'social') return { ...base, nodes: base.nodes.map(node => node.type === "group" ? { ...node, visualStyle: { ...node.visualStyle, className: [node.visualStyle?.className, "tt5-design-surface"].filter(Boolean).join(" ") } } : node), name: footerDesigns.find(item => item.id === design)!.label };
  const social = design === 'social';
  const title: TemplateNode = { id: 'variation-title', type: 'element', element: 'site-title', tagName: social ? 'h2' : 'p', align: 'centre', visualStyle: { fontSizeCustom: social ? '36px' : '22px', appearance: social ? 'regular' : 'bold', ...(social ? { textTransform: 'uppercase' as const } : {}) } };
  const credit: TemplateNode = { id: 'variation-credit', type: 'paragraph', text: 'Designed with WordPress', align: 'centre', style: { fontSizeCustom: '14px' }, runs: [{ text: 'Designed with ' }, { text: 'WordPress', marks: [{ type: 'link', url: 'https://wordpress.org' }] }] };
  const links: TemplateNode = { id: 'variation-social', type: 'group', layout: 'row', horizontalAlign: 'centre', gap: 10, allowWrap: true, children: ['Facebook', 'Instagram', 'X'].map((text, index) => ({ id: `variation-social-${index}`, type: 'paragraph', text, style: { fontSizeCustom: '36px', textTransform: 'uppercase', appearance: 'regular' }, runs: [{ text, marks: [{ type: 'link', url: '#' }] }] })) };
  return { id: `variation-footer-${design}`, name: footerDesigns.find(item => item.id === design)!.label, kind: 'footer', nodes: [{ id: 'variation-root', type: 'group', layout: 'stack', horizontalAlign: 'centre', gap: 0, visualStyle: { fontFamily: "site-manrope", className: social ? 'tt5-design-surface tt5-footer-social' : 'tt5-design-surface tt5-footer-centred', padding: social ? '70px 0' : '90px 0', ...(social ? { textColor: '#FFFFFF', backgroundColor: '#111111' } : {}) }, children: [title, ...(social ? [links] : []), { id: 'variation-spacer', type: 'spacer', height: social ? 20 : 10 }, credit] }] };
}

/** Preserve the part identity/references; its owning transaction retains Undo of the old layout. */
export function applyFooterDesign(design: FooterDesign): TemplateNode[] {
  const nodes = copyTemplateData(footerDesignPart(design).nodes);
  visitTemplateNodes(nodes, node => { node.id = templateId(); });
  return nodes;
}

export function headerDesignPart(design: HeaderDesign): TemplatePart {
  const source = createReferenceTemplateParts();
  const part = copyTemplateData(source.parts.find(part => part.id === (design === 'large' ? 'tt5-header-large-title' : 'tt5-header'))!);
  const root = headerDesignRow(part.nodes[0]);
  if (root?.type !== 'group') return part;
  if (design === 'centred') {
    root.layout = 'stack'; root.horizontalAlign = 'centre'; root.gap = 20;
    root.children = root.children.map(node => node.type === 'element' && node.element === 'navigation' ? { ...node, horizontalAlign: 'centre' } : node);
  } else if (design === 'columns') {
    root.layout = 'row'; root.verticalAlign = 'top';
    root.children = root.children.map(node => node.type === 'element' && node.element === 'navigation' ? { ...node, layout: 'stack', horizontalAlign: 'left' } : node);
    root.children.push({ id: 'variation-header-logo', type: 'element', element: 'site-logo' });
  }
  return { ...part, name: headerDesigns.find(item => item.id === design)!.label };
}

/** IDs do not define a design; authored presentation changes clear its selected state. */
export function footerDesignSelected(nodes: TemplateNode[], design: FooterDesign): boolean {
  const signature = (value: unknown): string => JSON.stringify(value, (key, item) => key === 'id' ? undefined : item);
  return signature(nodes) === signature(footerDesignPart(design).nodes);
}
