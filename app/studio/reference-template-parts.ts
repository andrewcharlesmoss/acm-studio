import { createTemplateSet, copyTemplateData, TEMPLATE_VERSION, visitTemplateNodes, type TemplateNode, type TemplatePart, type TemplateSet } from "./template-model";
import type { ParagraphStyle } from "../content/model";

export const referencePartSetId = "studio-twenty-twenty-five-parts";
export const referencePartNames = ["Vertical site header", "Sidebar", "Header", "Header with large title", "Footer", "Footer Newsletter", "Footer Columns"] as const;
export const referencePartIds = ["vertical-header", "sidebar", "header", "header-large-title", "footer", "footer-newsletter", "footer-columns"] as const;
export function isReferenceTemplatePart(setId: string, partId: string): boolean {
  return setId === referencePartSetId && referencePartIds.some(slug => partId === `tt5-${slug}`);
}
export const referenceComparisonTitle = "My WordPress Website";
export const referenceComparisonNavigation = [
  { id: "reference-hello-page", label: "Hello from WordPress Playground!", url: "/#hello-from-wordpress-playground" },
  { id: "reference-sample-page", label: "Sample Page", url: "/#sample-page" },
];
const referenceMenu = (prefix: string, labels: string[]) => labels.map((label, index) => ({ id: `${prefix}-${index + 1}`, label, url: `/#${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` }));
export function referenceComparisonMenuLinks(nodeId: string) {
  if (nodeId === "tt5-footer-stories-navigation" || nodeId === "tt5-footer-columns-stories-navigation") return referenceMenu(`${nodeId}-link`, ["Blog", "About", "FAQs", "Authors"]);
  if (nodeId === "tt5-footer-featured-navigation" || nodeId === "tt5-footer-columns-featured-navigation") return referenceMenu(`${nodeId}-link`, ["Events", "Shop", "Patterns", "Themes"]);
  return null;
}

/** Original editable adaptations of Twenty Twenty-Five’s GPL pattern structures. */
export function createReferenceTemplateParts(revision: "original" | "accuracy1" | "accuracy2" | "accuracy3" | "current" | "stack-header" | "header-layout-v1" | "header-layout-v2" | "header-layout-v3" = "current"): TemplateSet {
  if (revision !== "current" && revision !== "stack-header" && revision !== "header-layout-v1" && revision !== "header-layout-v2" && revision !== "header-layout-v3") return createHistoricalReferenceTemplateParts(revision);
  const set = createTemplateSet("Twenty Twenty-Five");
  set.id = referencePartSetId; set.templates = []; set.parts = [];
  set.identity = { name: referenceComparisonTitle, homeUrl: "/", copyright: "" };
  set.navigation = [];
  let prefix = ""; let sequence = 0;
  const id = () => `${prefix}-${++sequence}`;
  const group = (children: TemplateNode[], layout: "row" | "stack" | "flow" = "stack", style: ParagraphStyle = {}, extra = {}): TemplateNode => ({ id: id(), type: "group", layout, gap: 0, visualStyle: { fontFamily: "site-manrope", textColor: "#111111", ...style }, children, ...extra });
  const paragraph = (text: string, style: ParagraphStyle = {}, url?: string): Extract<TemplateNode, { type: "paragraph" }> => ({ id: id(), type: "paragraph", text, ...(url ? { runs: [{ text, marks: [{ type: "link", url }] }] } : {}), style });
  const title = (size?: string, extra: ParagraphStyle = {}): TemplateNode => ({ id: id(), type: "element", element: "site-title", tagName: "h1", visualStyle: { ...(size ? { fontSizeCustom: size } : {}), appearance: "bold", ...extra } });
  const tagline = (): TemplateNode => ({ id: id(), type: "element", element: "site-tagline" });
  const nav = (nodeId: string, extra = {}): TemplateNode => ({ id: nodeId, type: "element", element: "navigation", layout: "row", horizontalAlign: "right", overlayMenu: "mobile", gap: 10, ...extra });
  const spacer = (height: number): TemplateNode => ({ id: id(), type: "spacer", height, visualStyle: { className: `tt5-spacer-${height}` } });
  const credits = (): TemplateNode => ({ id: id(), type: "element", element: "site-credit" });
  const menu = (nodeId: string, ariaLabel: string, gap = 10): TemplateNode => nav(nodeId, { layout: "stack", horizontalAlign: "left", overlayMenu: "never", ariaLabel, gap });
  const menuSection = (heading: string, nodeId: string): TemplateNode => group([
    { id: id(), type: "heading", level: 3, text: heading, visualStyle: { appearance: "bold", fontSizeCustom: "1.125rem" } },
    menu(nodeId, heading, 20),
  ], "stack", { className: "tt5-footer-menu-section" }, { gap: 20 });
  const logo = (): TemplateNode => ({ id: id(), type: "element", element: "site-logo" });
  const add = (slug: typeof referencePartIds[number], kind: TemplatePart["kind"], build: () => TemplateNode[]) => { prefix = `tt5-${slug}`; sequence = 0; set.parts.push({ id: `tt5-${slug}`, name: referencePartNames[referencePartIds.indexOf(slug)], kind, nodes: build() }); };
  add("vertical-header", "header", () => [group([group([group([nav("tt5-vertical-header-navigation", { overlayMenu: "always", horizontalAlign: "centre" }), title(undefined, { orientation: "vertical-rl", appearance: "regular", letterSpacing: "0" })], "stack", {}, { horizontalAlign: "centre", verticalAlign: "centre", gap: 20 })], "stack", { minHeight: "100vh" }, { horizontalAlign: "centre", verticalAlign: "centre" })], "stack", { padding: "24px 0", className: "tt5-vertical-header" }, { position: "sticky", horizontalAlign: "centre" })]);
  const sidebarQuery: TemplateNode = { id: "tt5-sidebar-query", type: "query-loop", count: 4, order: "desc", stickyFirst: true, children: [
    { id: "tt5-sidebar-post-template", type: "post-template", children: [
      { id: "tt5-sidebar-post-title", type: "title", level: 2, isLink: true },
      { id: "tt5-sidebar-post-date", type: "post-date", format: "long", isLink: true, showIcon: false },
    ] },
    { id: "tt5-sidebar-no-results", type: "no-results", children: [paragraph("Sorry, but nothing was found. Please try a search with different keywords.", { fontSizeCustom: "18px" })] },
  ] };
  add("sidebar", "general", () => [group([{ id: id(), type: "heading", level: 2, text: "Other Posts", visualStyle: { fontSizeCustom: "14px", appearance: "semi-bold", letterSpacing: "1.6px", lineHeight: "1.4", textTransform: "uppercase" } }, spacer(40), sidebarQuery, spacer(20)], "stack", { className: "tt5-sidebar" }, { gap: 0 })]);
  const widthFrame = (children: TemplateNode[], className: string, style: ParagraphStyle = {}, gap = 20): TemplateNode => group(
    [group(children, "stack", { className: "tt5-wide" }, { gap })], "stack", { className: `${className} tt5-reference-shell`, ...style }, { gap: 0 },
  );
  const headerTree = (large = false): TemplateNode[] => {
    if (!large && (revision === "current" || revision === "header-layout-v2" || revision === "header-layout-v3")) {
      // Theme typography is inherited from TemplateSurface, not authored on each Group.
      const headerGroup = (children: TemplateNode[], layout: "row" | "flow", style: ParagraphStyle = {}, extra = {}): Extract<TemplateNode, { type: "group" }> => ({ id: id(), type: "group", layout, ...(revision === "header-layout-v2" ? { gap: 0 } : {}), visualStyle: style, children, ...extra });
      const siteTitle: TemplateNode = { id: id(), type: "element", element: "site-title", tagName: "p", visualStyle: { className: "tt5-header-title", appearance: "bold" } };
      const navigation: TemplateNode = { id: "tt5-header-navigation", type: "element", element: "navigation", layout: "row", horizontalAlign: "right", overlayMenu: "mobile", allowWrap: true, ...(revision === "current" ? { pageListBlock: { id: "tt5-header-page-list", type: "navigation-page-list" as const, position: 0 } } : {}) };
      const navigationRow = headerGroup([navigation], "row", {}, { horizontalAlign: "right", allowWrap: false, gap: 10 });
      const row = headerGroup([siteTitle, navigationRow], "row", { className: "tt5-header-row", padding: "20px 0" }, { blockAlign: "wide", horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false });
      if (revision === "current") {
        const contentGroup = { ...row, layout: "flow" as const, inheritLayout: true };
        return [headerGroup([contentGroup], "row", { className: "tt5-reference-shell tt5-header-shell" }, { blockAlign: "full", contentWidth: "full" })];
      }
      const constrained = headerGroup([row], "flow", {}, { inheritLayout: true });
      return [headerGroup([constrained], "flow", { className: "tt5-reference-shell tt5-header-shell" }, { blockAlign: "full", contentWidth: "full" })];
    }
    const navigation = nav(large ? "tt5-header-large-title-navigation" : "tt5-header-navigation", { layout: large ? "stack" : "row", horizontalAlign: "right", overlayMenu: large ? "never" : "mobile", gap: large ? 0 : 10, allowWrap: false });
    const navFrame = large ? group([navigation], "stack", { className: "tt5-header-large-navigation" }, { horizontalAlign: "right", gap: 0 }) : navigation;
    const row = group([title(large ? "100px" : undefined, large ? { className: "tt5-large-title", lineHeight: "1.2", appearance: "regular" } : { className: "tt5-header-title" }), navFrame], "row", { className: "tt5-header-row", ...(!large ? { padding: "20px 0" } : {}) }, { horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false });
    return [group([group([row], "stack", { className: "tt5-wide" })], large || revision === "stack-header" ? "stack" : "flow", { className: `tt5-reference-shell tt5-header-shell${large ? " tt5-header-large-shell" : ""}`, ...(large ? { borderWidthSides: { bottom: "1px" }, borderColor: "#11111133" } : {}) })];
  };
  add("header", "header", () => headerTree());
  add("header-large-title", "header", () => headerTree(true));
  const footerBase = (children: TemplateNode[]): TemplateNode => widthFrame(children, "tt5-footer-default");
  add("footer", "footer", () => {
    const brand = group([title("2.15rem", { appearance: "regular" }), tagline()], "stack", { className: "tt5-footer-brand" }, { gap: 20 });
    const top = group([group([brand], "stack", { className: "tt5-footer-title-column" }), group([spacer(40)], "stack", { className: "tt5-footer-spacer-column" })], "row", { className: "tt5-footer-top" }, { horizontalAlign: "space-between", verticalAlign: "top", allowWrap: true, gap: 0 });
    const menus = group([menu("tt5-footer-stories-navigation", "Footer menu", 20), menu("tt5-footer-featured-navigation", "Footer menu", 20)], "row", { className: "tt5-footer-menus" }, { horizontalAlign: "space-between", allowWrap: true, gap: 80 });
    return [footerBase([logo(), top, menus, spacer(70), credits()])];
  });
  add("footer-newsletter", "footer", () => {
    const children: TemplateNode[] = [
      { id: id(), type: "heading", level: 2, text: "Stories", visualStyle: { className: "tt5-newsletter-title", appearance: "semi-bold", lineHeight: "1.125", letterSpacing: "-0.02em" } },
      paragraph("Receive our articles in your inbox.", { className: "tt5-newsletter-description" }),
      { id: id(), type: "buttons", justification: "left", children: [{ id: id(), type: "button", label: "Subscribe", url: "", style: "primary", visualStyle: { backgroundColor: "#111111", textColor: "#FFFFFF", borderRadius: "999px", padding: "16px 36px" } }] },
      spacer(50), credits(),
    ];
    return [widthFrame(children, "tt5-newsletter", { backgroundColor: "#FFEE58" })];
  });
  add("footer-columns", "footer", () => {
    const brand = group([title("2.15rem", { appearance: "regular" }), tagline()], "stack", { className: "tt5-footer-columns-brand" }, { gap: 20 });
    const menus = group([menuSection("Stories", "tt5-footer-columns-stories-navigation"), menuSection("Fleurs", "tt5-footer-columns-featured-navigation")], "row", { className: "tt5-footer-columns-menus" }, { horizontalAlign: "space-between", allowWrap: true, gap: 80 });
    return [widthFrame([group([brand, menus], "row", { className: "tt5-footer-columns-top" }, { horizontalAlign: "space-between", verticalAlign: "top", allowWrap: true, gap: 40 }), spacer(60), credits()], "tt5-footer-columns")];
  });
  return set;
}

/** Immutable pre-v0.73 fingerprints used only for safe, exact upgrades. */
function createHistoricalReferenceTemplateParts(revision: "original" | "accuracy1" | "accuracy2" | "accuracy3"): TemplateSet {
  const set = createTemplateSet("Twenty Twenty-Five");
  set.id = referencePartSetId; set.templates = []; set.parts = [];
  set.identity = { name: referenceComparisonTitle, homeUrl: "/", copyright: "" };
  set.navigation = [];
  let prefix = ""; let sequence = 0;
  const id = () => `${prefix}-${++sequence}`;
  const group = (children: TemplateNode[], layout: "row" | "stack" = "stack", style: ParagraphStyle = {}, extra = {}): TemplateNode => ({ id: id(), type: "group", layout, gap: 0, visualStyle: { fontFamily: "site-manrope", textColor: "#111111", ...style }, children, ...extra });
  const paragraph = (text: string, style: ParagraphStyle = {}, url?: string): Extract<TemplateNode, { type: "paragraph" }> => ({ id: id(), type: "paragraph", text, ...(url ? { runs: [{ text, marks: [{ type: "link", url }] }] } : {}), style });
  const title = (size = "22px", extra: ParagraphStyle = {}): TemplateNode => ({ id: id(), type: "element", element: "site-title", tagName: "p", visualStyle: { fontSizeCustom: size, appearance: "bold", lineHeight: "1.2", letterSpacing: "-0.5px", ...extra } });
  const nav = (extra = {}): TemplateNode => ({ id: id(), type: "element", element: "navigation", layout: "row", horizontalAlign: "right", overlayMenu: "mobile", gap: 24, visualStyle: { fontSizeCustom: "18px", appearance: "light" }, ...extra });
  const spacer = (height: number): TemplateNode => ({ id: id(), type: "spacer", height });
  const credits = (): TemplateNode => group([paragraph("Twenty Twenty-Five", { fontSizeCustom: "14px" }), revision === "original" ? paragraph("Designed with WordPress", { fontSizeCustom: "14px" }, "https://wordpress.org") : { ...paragraph("Designed with WordPress", { fontSizeCustom: "14px" }), runs: [{ text: "Designed with " }, { text: "WordPress", marks: [{ type: "link", url: "https://wordpress.org" }] }] }], "row", {}, { horizontalAlign: "space-between", stackAt: "mobile" });
  const menu = (labels: string[], gap = 10): TemplateNode => group(labels.map(label => paragraph(label, { fontSizeCustom: "18px" }, `#${label.toLowerCase()}`)), "stack", {}, { gap });
  const logo = (): TemplateNode => ({ id: id(), type: "element", element: "site-logo" });
  const add = (slug: typeof referencePartIds[number], kind: TemplatePart["kind"], build: () => TemplateNode[]) => { prefix = `tt5-${slug}`; sequence = 0; set.parts.push({ id: `tt5-${slug}`, name: referencePartNames[referencePartIds.indexOf(slug)], kind, nodes: build() }); };
  add("vertical-header", "header", () => [group([nav({ overlayMenu: "always" }), title("22px", { orientation: "vertical-rl" })], "stack", { minHeight: "100vh", padding: "30px 0" }, { horizontalAlign: "centre", verticalAlign: revision === "original" ? "centre" : "top", gap: 20 })]);
  add("sidebar", "general", () => [group([revision === "original" ? paragraph("OTHER POSTS", { fontSizeCustom: "14px", appearance: "semi-bold", letterSpacing: "1.6px" }) : { id: id(), type: "heading", level: 2, text: "OTHER POSTS", visualStyle: { fontSizeCustom: "14px", appearance: "semi-bold", letterSpacing: "1.6px", lineHeight: "1.4" } }, spacer(30), paragraph("Sorry, but nothing was found. Please try a search with different keywords.", { fontSizeCustom: "18px" })], "stack", revision !== "original" ? { className: "tt5-sidebar" } : {})]);
  const headerShell = (row: TemplateNode): TemplateNode => revision === "accuracy3" ? group([row], "stack", { padding: "0 50px", className: "tt5-header-shell" }) : row;
  add("header", "header", () => [headerShell(group([title(), nav()], "row", { padding: "20px 0" }, { horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false }))]);
  add("header-large-title", "header", () => [headerShell(group([title("100px", revision === "accuracy3" || revision === "accuracy2" ? { className: "tt5-large-title" } : {}), nav({ layout: "stack", gap: 0 })], "row", { padding: "20px 0", borderWidthSides: { bottom: "1px" }, borderColor: "#11111133" }, { horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false }))]);
  const footerTop = (columns: boolean): TemplateNode => group([group([...(columns ? [] : [logo()]), title(columns ? "48px" : "32px")], "stack", {}, { gap: 20 }), group([...(columns ? [group([revision === "original" ? paragraph("Stories", { appearance: "semi-bold" }) : { id: id(), type: "heading", level: 3, text: "Stories", visualStyle: { fontSizeCustom: "18px", appearance: "bold", lineHeight: "1.125" } }, menu(["Blog", "About", "FAQs", "Authors"])], "stack", {}, { gap: 20 }), group([revision === "original" ? paragraph("Fleurs", { appearance: "semi-bold" }) : { id: id(), type: "heading", level: 3, text: "Fleurs", visualStyle: { fontSizeCustom: "18px", appearance: "bold", lineHeight: "1.125" } }, menu(["Events", "Shop", "Patterns", "Themes"])], "stack", {}, { gap: 20 })] : [menu(["Blog", "About", "FAQs", "Authors"], revision === "original" ? 10 : 19.2), menu(["Events", "Shop", "Patterns", "Themes"], revision === "original" ? 10 : 19.2)])], "row", revision !== "original" ? { className: "tt5-footer-menus" } : {}, { gap: 80 })], "row", {}, { horizontalAlign: "space-between", verticalAlign: "top", stackAt: "mobile" });
  const footerShell = (children: TemplateNode[], kind: "default" | "columns"): TemplateNode => group(children, "stack", { padding: kind === "default" ? "70px 0 50px" : "50px 0" });
  add("footer", "footer", () => [footerShell([footerTop(false), spacer(90), credits()], "default")]);
  add("footer-newsletter", "footer", () => { const children: TemplateNode[] = [revision === "original" ? paragraph("Stories", { fontSizeCustom: "24vw", appearance: "semi-bold", lineHeight: "1", letterSpacing: "-0.02em" }) : { id: id(), type: "heading", level: 2, text: "Stories", visualStyle: { className: "tt5-newsletter-title", appearance: "semi-bold", lineHeight: "1.125", letterSpacing: "-0.02em" } }, paragraph("Receive our articles in your inbox.", { fontSizeCustom: "32px" }), { id: id(), type: "button", ...(revision === "accuracy3" || revision === "accuracy2" ? { align: "left" as const } : {}), label: "Subscribe", url: "#subscribe", style: "primary", visualStyle: { backgroundColor: "#111111", textColor: "#FFFFFF", borderRadius: "999px", padding: "16px 36px" } }, spacer(50), credits()];
    return [group(children, "stack", { backgroundColor: "#FFEE58", padding: "50px", ...(revision !== "original" ? { className: "tt5-newsletter" } : {}) }, { gap: 20 })];
  });
  add("footer-columns", "footer", () => [footerShell([footerTop(true), spacer(70), credits()], "columns")]);
  return set;
}

/** Pure comparison projection; site identity, menus and saved originals remain owned by their sites. */
export function referenceComparisonSet(set: TemplateSet): TemplateSet {
  return { ...set, identity: { ...set.identity, name: referenceComparisonTitle, homeUrl: "/" }, navigation: copyTemplateData(referenceComparisonNavigation) };
}
export { TEMPLATE_VERSION };

/** Upgrade generated reference parts and the recognised legacy Header scaffold. */
export function upgradeReferenceTemplateParts(set: TemplateSet): TemplateSet {
  if (set.id !== referencePartSetId) return set;
  const original = createHistoricalReferenceTemplateParts("original");
  const previousAccuracy = createHistoricalReferenceTemplateParts("accuracy1");
  const previousCurrent = createHistoricalReferenceTemplateParts("accuracy2");
  const previousShells = createHistoricalReferenceTemplateParts("accuracy3");
  const current = createReferenceTemplateParts();
  const previousStackHeader = createReferenceTemplateParts("stack-header");
  const previousHeaderLayout = createReferenceTemplateParts("header-layout-v1");
  const previousHeaderSpacing = createReferenceTemplateParts("header-layout-v2");
  const previousHeaderCurrent = createReferenceTemplateParts("header-layout-v3");
  return { ...set, parts: set.parts.map(part => {
    const prior = original.parts.find(candidate => candidate.id === part.id);
    const priorAccuracy = previousAccuracy.parts.find(candidate => candidate.id === part.id);
    const priorCurrent = previousCurrent.parts.find(candidate => candidate.id === part.id);
    const priorShells = previousShells.parts.find(candidate => candidate.id === part.id);
    const priorStackHeader = previousStackHeader.parts.find(candidate => candidate.id === part.id);
    const priorHeaderLayout = previousHeaderLayout.parts.find(candidate => candidate.id === part.id);
    const priorHeaderSpacing = previousHeaderSpacing.parts.find(candidate => candidate.id === part.id);
    const priorHeaderCurrent = previousHeaderCurrent.parts.find(candidate => candidate.id === part.id);
    const pristineLegacyHeader = part.id === "tt5-header" && JSON.stringify(part.nodes) === JSON.stringify(pristineLegacyHeaderNodes());
    const pristineGeneratedNavigationCollision = part.id === "tt5-header" && priorHeaderLayout && JSON.stringify(part) === JSON.stringify(withNavigationId(priorHeaderLayout, "tt5-header-2"));
    const knownPristine = prior && (JSON.stringify(prior) === JSON.stringify(part) || JSON.stringify(priorAccuracy) === JSON.stringify(part) || JSON.stringify(priorCurrent) === JSON.stringify(part) || JSON.stringify(priorShells) === JSON.stringify(part) || JSON.stringify(priorStackHeader) === JSON.stringify(part) || JSON.stringify(priorHeaderLayout) === JSON.stringify(part) || JSON.stringify(priorHeaderSpacing) === JSON.stringify(part) || JSON.stringify(priorHeaderCurrent) === JSON.stringify(part));
    if (knownPristine || pristineLegacyHeader || pristineGeneratedNavigationCollision) {
      const reference = current.parts.find(candidate => candidate.id === part.id)!;
      return { ...reference, ...part, nodes: preserveNavigationNodeIds(reference.nodes, part.nodes) };
    }
    if (part.id !== "tt5-header") return part;
    const nodes = copyTemplateData(part.nodes);
    return upgradeLegacyHeaderScaffold(nodes) ? { ...part, nodes } : part;
  }) };
}

/** Preserve authored settings while correcting only the old generated Group/Row scaffold. */
function upgradeLegacyHeaderScaffold(nodes: TemplateNode[]): boolean {
  const [shell] = nodes;
  if (nodes.length !== 1 || shell?.type !== "group" || !shell.visualStyle?.className?.split(/\s+/).includes("tt5-header-shell")) return false;
  const [outer] = shell.children;
  const [inner] = outer?.type === "group" ? outer.children : [];
  if (shell.children.length !== 1 || outer?.type !== "group" || outer.children.length !== 1 || outer.layout !== "flow" || inner?.type !== "group" || inner.layout !== "row" || inner.children.length !== 2) return false;
  const [siteTitle, navigationRow] = inner.children;
  if (siteTitle?.type !== "element" || siteTitle.element !== "site-title" || !inner.visualStyle?.className?.split(/\s+/).includes("tt5-header-row") || navigationRow?.type !== "group" || navigationRow.children.length !== 1) return false;
  const [navigation] = navigationRow.children;
  if (navigation?.type !== "element" || navigation.element !== "navigation") return false;

  inner.layout = "flow";
  inner.inheritLayout = true;
  if (navigation.pageListBlock?.type !== "navigation-page-list" && navigation.automaticPageList !== true) {
    const usedIds = new Set<string>();
    visitTemplateNodes(nodes, node => usedIds.add(node.id));
    let pageListId = "tt5-header-page-list";
    for (let suffix = 2; usedIds.has(pageListId); suffix++) pageListId = `tt5-header-page-list-${suffix}`;
    navigation.pageListBlock = { id: pageListId, type: "navigation-page-list", position: 0 };
    delete navigation.automaticPageList;
    delete navigation.automaticPageListPosition;
  }
  const shellClasses = shell.visualStyle?.className?.split(/\s+/).filter(Boolean) ?? [];
  const outerClasses = outer.visualStyle?.className?.split(/\s+/).filter(Boolean) ?? [];
  const className = [...new Set([...shellClasses, ...outerClasses])].join(" ");
  const promoted: Extract<TemplateNode, { type: "group" }> = {
    ...shell,
    ...outer,
    id: shell.id,
    layout: "row",
    inheritLayout: true,
    blockAlign: outer.blockAlign ?? shell.blockAlign,
    contentWidth: outer.contentWidth ?? shell.contentWidth,
    visualStyle: {
      ...shell.visualStyle,
      ...outer.visualStyle,
      ...(className ? { className } : {}),
    },
    children: [inner],
  };
  nodes[0] = promoted;
  return true;
}

/** One older migration accidentally reused the Header row ID for Navigation. */
function withNavigationId(part: TemplatePart, id: string): TemplatePart {
  const nodes = copyTemplateData(part.nodes);
  const visit = (items: TemplateNode[]): boolean => {
    for (const node of items) {
      if (node.type === "element" && node.element === "navigation") { node.id = id; return true; }
      if ((node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") && visit(node.children)) return true;
    }
    return false;
  };
  visit(nodes);
  return { ...part, nodes };
}

/** Exact pre-shell Header data shipped by the original accuracy pass. */
function pristineLegacyHeaderNodes(): TemplateNode[] {
  return [{
    id: "tt5-header-3", type: "group", layout: "row", gap: 0,
    visualStyle: { fontFamily: "site-manrope", textColor: "#111111", padding: "20px 0" },
    children: [
      { id: "tt5-header-1", type: "element", element: "site-title", tagName: "p", visualStyle: { fontSizeCustom: "22px", appearance: "bold", lineHeight: "1.2", letterSpacing: "-0.5px" }, align: "left", linkToHome: true, opensInNewTab: false },
      { id: "tt5-header-2", type: "element", element: "navigation", layout: "row", horizontalAlign: "right", overlayMenu: "mobile", gap: 24, visualStyle: { fontSizeCustom: "18px", appearance: "light" }, align: "left", allowWrap: true, submenuOpenOnClick: false, showSubmenuIcon: true, ariaLabel: "Site navigation" },
    ],
    horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false,
  }];
}

/** Keep site-local menu assignments attached when a pristine design is upgraded. */
function preserveNavigationNodeIds(reference: TemplateNode[], previous: TemplateNode[]): TemplateNode[] {
  const collect = (nodes: TemplateNode[]): string[] => nodes.flatMap<string>(node => [
    ...(node.type === "element" && node.element === "navigation" ? [node.id] : []),
    ...(node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column" ? collect(node.children) : []),
  ]);
  const previousIds = collect(previous);
  const reserved = new Set(previousIds);
  let navigationIndex = 0;
  const remap = (nodes: TemplateNode[]): TemplateNode[] => nodes.map((node): TemplateNode => {
    if (node.type === "element" && node.element === "navigation") return { ...node, id: previousIds[navigationIndex++] ?? node.id } as TemplateNode;
    const id = reserved.has(node.id) ? `${node.id}-reference` : node.id;
    if (node.type === "group" || node.type === "section" || node.type === "columns" || node.type === "column") return { ...node, id, children: remap(node.children) } as TemplateNode;
    return id === node.id ? node : { ...node, id } as TemplateNode;
  });
  return remap(copyTemplateData<TemplateNode[]>(reference));
}

/** Reset one generated reference to the pinned WordPress structure without
 * replacing its library identity, name, navigation data, or sibling parts. */
export function resetReferenceTemplatePart(set: TemplateSet, partId: string): TemplateSet {
  if (!isReferenceTemplatePart(set.id, partId)) return set;
  const reference = createReferenceTemplateParts().parts.find(part => part.id === partId);
  if (!reference) return set;
  let changed = false;
  const parts = set.parts.map(part => {
    if (part.id !== partId) return part;
    changed = true;
    return { ...part, nodes: preserveNavigationNodeIds(reference.nodes, part.nodes) };
  });
  return changed ? { ...set, parts } : set;
}
