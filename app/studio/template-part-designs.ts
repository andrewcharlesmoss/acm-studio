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
  if (!node || (node.type !== "group" && node.type !== "section" && node.type !== "column")) return undefined;
  if (node.type === "group" && node.visualStyle?.className?.split(/\s+/).includes("tt5-header-row")) return node;
  for (const child of node.children) {
    const row = headerDesignRow(child);
    if (row) return row;
  }
  if (node.type === "group"
    && node.children.filter(child => child.type === "element" && (child.element === "site-title" || child.element === "site-identity")).length === 1
    && node.children.filter(child => child.type === "element" && child.element === "navigation").length === 1
    && node.children.every(child => child.type === "element" && ["site-title", "site-identity", "navigation", "site-logo"].includes(child.element))) return node;
  return undefined;
}

function replaceHeaderDesignRow(nodes: TemplateNode[], design: HeaderDesign): TemplateNode[] | null {
  const part = headerDesignPart(design);
  const variationRow = headerDesignRow(part.nodes[0]);
  if (!variationRow || variationRow.type !== "group") return null;
  const nextRow = (row: TemplateNode): TemplateNode | null => {
    if (row.type !== "group") return null;
    const isReferenceRow = row.visualStyle?.className?.split(/\s+/).includes("tt5-header-row") === true;
    const isLegacyRow = row.children.filter(child => child.type === "element" && (child.element === "site-title" || child.element === "site-identity")).length === 1
      && row.children.filter(child => child.type === "element" && child.element === "navigation").length === 1
      && row.children.every(child => child.type === "element" && ["site-title", "site-identity", "navigation", "site-logo"].includes(child.element));
    if (!isReferenceRow && (!isLegacyRow || design === "large")) return null;
    const find = (items: TemplateNode[], predicate: (node: TemplateNode) => boolean): TemplateNode | undefined => {
      for (const item of items) {
        if (predicate(item)) return item;
        if ("children" in item && Array.isArray(item.children)) { const nested = find(item.children as TemplateNode[], predicate); if (nested) return nested; }
      }
      return undefined;
    };
    const existingTitle = find(row.children, node => node.type === "element" && (node.element === "site-title" || node.element === "site-identity"));
    const existingNavigation = find(row.children, node => node.type === "element" && node.element === "navigation");
    if (!existingTitle || existingTitle.type !== "element" || !existingNavigation || existingNavigation.type !== "element") return null;
    const variantTitle = find(variationRow.children, node => node.type === "element" && node.element === "site-title");
    const variantNavigation = find(variationRow.children, node => node.type === "element" && node.element === "navigation");
    if (!variantTitle || variantTitle.type !== "element" || !variantNavigation || variantNavigation.type !== "element") return null;
    const title = { ...existingTitle, ...variantTitle, id: existingTitle.id, element: existingTitle.element } as TemplateNode;
    const navigation = { ...variantNavigation, ...existingNavigation, id: existingNavigation.id } as TemplateNode;
    const children: TemplateNode[] = [title];
    if (design === "large") {
      const variantFrame = variationRow.children.find(node => node.type === "group" && (node.children ?? []).some(child => child.type === "element" && child.element === "navigation"));
      if (!variantFrame || variantFrame.type !== "group") return null;
      const existingFrame = find(row.children, node => node.type === "group" && (node.children ?? []).some(child => child.type === "element" && child.element === "navigation"));
      children.push({ ...variantFrame, id: existingFrame?.id ?? templateId(), children: [navigation] });
    } else children.push(navigation);
    if (design === "columns") {
      const existingLogo = find(row.children, node => node.type === "element" && node.element === "site-logo");
      children.push(existingLogo ?? { id: templateId(), type: "element", element: "site-logo" });
    }
    const className = [...new Set([row.visualStyle?.className, variationRow.visualStyle?.className].filter(Boolean).flatMap(value => value!.split(/\s+/)))].join(" ");
    return { ...row, ...variationRow, id: row.id, visualStyle: { ...row.visualStyle, ...variationRow.visualStyle, ...(className ? { className } : {}) }, children };
  };
  const visit = (items: TemplateNode[]): { nodes: TemplateNode[]; changed: boolean } => {
    let changed = false;
    const next = items.map(node => {
      const row = nextRow(node);
      if (row) { changed = true; return row; }
      if ((node.type === "group" || node.type === "section" || node.type === "column") && node.children.length) {
        const nested = visit(node.children);
        if (nested.changed) { changed = true; return { ...node, children: nested.nodes }; }
      }
      return node;
    });
    return { nodes: next, changed };
  };
  const result = visit(nodes);
  return result.changed ? result.nodes : null;
}

/** Keep the existing Header, Navigation and wrapper identities while adopting a reference design. */
export function applyHeaderDesign(nodes: TemplateNode[], design: HeaderDesign): TemplateNode[] | null {
  if (nodes.length === 1 && nodes[0].type === "group" && nodes[0].visualStyle?.className?.split(/\s+/).includes("tt5-header-shell")) {
    const shell = nodes[0];
    const children = replaceHeaderDesignRow(shell.children, design);
    if (!children) return null;
    const variation = headerDesignPart(design).nodes[0];
    if (variation.type !== "group") return null;
    const { borderWidthSides: _sides, borderColor: _colour, ...retainedStyle } = shell.visualStyle ?? {};
    return [{ ...shell, visualStyle: { ...retainedStyle, ...(variation.visualStyle?.borderWidthSides ? { borderWidthSides: variation.visualStyle.borderWidthSides, borderColor: variation.visualStyle.borderColor } : {}) }, children }];
  }
  return replaceHeaderDesignRow(nodes, design);
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
