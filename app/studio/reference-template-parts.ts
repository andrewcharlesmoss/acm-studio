import { createTemplateSet, copyTemplateData, TEMPLATE_VERSION, type TemplateNode, type TemplatePart, type TemplateSet } from "./template-model";
import type { ParagraphStyle } from "../content/model";

export const referencePartSetId = "studio-twenty-twenty-five-parts";
export const referencePartNames = ["Vertical site header", "Sidebar", "Header", "Header with large title", "Footer", "Footer Newsletter", "Footer Columns"] as const;
export const referencePartIds = ["vertical-header", "sidebar", "header", "header-large-title", "footer", "footer-newsletter", "footer-columns"] as const;
export const referenceComparisonTitle = "My WordPress Website";
export const referenceComparisonNavigation = [
  { id: "reference-hello-page", label: "Hello from WordPress Playground!", url: "#hello-from-wordpress-playground" },
  { id: "reference-sample-page", label: "Sample Page", url: "#sample-page" },
];

/** Original editable adaptations of Twenty Twenty-Five’s GPL pattern structures. */
export function createReferenceTemplateParts(revision: "original" | "accuracy1" | "accuracy2" | "accuracy3" | "current" = "current"): TemplateSet {
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
  const spacer = (height: number): TemplateNode => ({ id: id(), type: "spacer", height, ...(revision === "current" ? { visualStyle: { className: `tt5-spacer-${height}` } } : {}) });
  const credits = (): TemplateNode => group([paragraph("Twenty Twenty-Five", { fontSizeCustom: "14px" }), revision === "original" ? paragraph("Designed with WordPress", { fontSizeCustom: "14px" }, "https://wordpress.org") : { ...paragraph("Designed with WordPress", { fontSizeCustom: "14px" }), runs: [{ text: "Designed with " }, { text: "WordPress", marks: [{ type: "link", url: "https://wordpress.org" }] }] }], "row", {}, { horizontalAlign: "space-between", stackAt: "mobile" });
  const menu = (labels: string[], gap = 10): TemplateNode => group(labels.map(label => paragraph(label, { fontSizeCustom: "18px" }, `#${label.toLowerCase()}`)), "stack", {}, { gap });
  const logo = (): TemplateNode => ({ id: id(), type: "element", element: "site-logo" });
  const add = (slug: typeof referencePartIds[number], kind: TemplatePart["kind"], build: () => TemplateNode[]) => { prefix = `tt5-${slug}`; sequence = 0; set.parts.push({ id: `tt5-${slug}`, name: referencePartNames[referencePartIds.indexOf(slug)], kind, nodes: build() }); };
  add("vertical-header", "header", () => [group([nav({ overlayMenu: "always" }), title("22px", { orientation: "vertical-rl" })], "stack", { minHeight: "100vh", padding: "30px 0" }, { horizontalAlign: "centre", verticalAlign: revision === "original" ? "centre" : "top", gap: 20 })]);
  add("sidebar", "general", () => [group([revision === "original" ? paragraph("OTHER POSTS", { fontSizeCustom: "14px", appearance: "semi-bold", letterSpacing: "1.6px" }) : { id: id(), type: "heading", level: 2, text: "OTHER POSTS", visualStyle: { fontSizeCustom: "14px", appearance: "semi-bold", letterSpacing: "1.6px", lineHeight: "1.4" } }, spacer(30), paragraph("Sorry, but nothing was found. Please try a search with different keywords.", { fontSizeCustom: "18px" })], "stack", revision !== "original" ? { className: "tt5-sidebar" } : {})]);
  const headerShell = (row: TemplateNode, large = false): TemplateNode => revision === "current" || revision === "accuracy3" ? group([row], "stack", { ...(revision === "accuracy3" ? { padding: "0 50px" } : {}), className: "tt5-header-shell", ...(revision === "current" && large ? { borderWidthSides: { bottom: "1px" }, borderColor: "#11111133" } : {}) }) : row;
  add("header", "header", () => [headerShell(group([title(), nav()], "row", { padding: "20px 0" }, { horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false }))]);
  add("header-large-title", "header", () => [headerShell(group([title("100px", revision === "current" || revision === "accuracy3" || revision === "accuracy2" ? { className: "tt5-large-title" } : {}), nav({ layout: "stack", gap: 0 })], "row", { padding: "20px 0", ...(revision !== "current" ? { borderWidthSides: { bottom: "1px" }, borderColor: "#11111133" } : {}) }, { horizontalAlign: "space-between", verticalAlign: "centre", allowWrap: false }), true)]);
  const footerTop = (columns: boolean): TemplateNode => group([group([...(columns || revision === "current" ? [] : [logo()]), title(columns ? "48px" : "32px")], "stack", {}, { gap: 20 }), group([...(columns ? [group([revision === "original" ? paragraph("Stories", { appearance: "semi-bold" }) : { id: id(), type: "heading", level: 3, text: "Stories", visualStyle: { fontSizeCustom: "18px", appearance: "bold", lineHeight: "1.125" } }, menu(["Blog", "About", "FAQs", "Authors"])], "stack", {}, { gap: 20 }), group([revision === "original" ? paragraph("Fleurs", { appearance: "semi-bold" }) : { id: id(), type: "heading", level: 3, text: "Fleurs", visualStyle: { fontSizeCustom: "18px", appearance: "bold", lineHeight: "1.125" } }, menu(["Events", "Shop", "Patterns", "Themes"])], "stack", {}, { gap: 20 })] : [menu(["Blog", "About", "FAQs", "Authors"], revision === "original" ? 10 : 19.2), menu(["Events", "Shop", "Patterns", "Themes"], revision === "original" ? 10 : 19.2)])], "row", revision !== "original" ? { className: "tt5-footer-menus" } : {}, { gap: 80 })], "row", {}, { horizontalAlign: "space-between", verticalAlign: "top", stackAt: "mobile" });
  const footerShell = (children: TemplateNode[], kind: "default" | "columns"): TemplateNode => revision === "current" ? group([group(children, "stack", { className: "tt5-wide" }, { gap: 19.2 })], "stack", { className: `tt5-reference-shell tt5-footer-${kind}` }) : group(children, "stack", { padding: kind === "default" ? "70px 0 50px" : "50px 0" });
  add("footer", "footer", () => [footerShell([...(revision === "current" ? [logo()] : []), footerTop(false), spacer(90), credits()], "default")]);
  add("footer-newsletter", "footer", () => { const children: TemplateNode[] = [revision === "original" ? paragraph("Stories", { fontSizeCustom: "24vw", appearance: "semi-bold", lineHeight: "1", letterSpacing: "-0.02em" }) : { id: id(), type: "heading", level: 2, text: "Stories", visualStyle: { className: "tt5-newsletter-title", appearance: "semi-bold", lineHeight: "1.125", letterSpacing: "-0.02em" } }, paragraph("Receive our articles in your inbox.", { fontSizeCustom: "32px" }), { id: id(), type: "button", ...(revision === "current" || revision === "accuracy3" || revision === "accuracy2" ? { align: "left" as const } : {}), label: "Subscribe", url: "#subscribe", style: "primary", visualStyle: { backgroundColor: "#111111", textColor: "#FFFFFF", borderRadius: "999px", padding: "16px 36px" } }, spacer(50), credits()];
    return [revision === "current" ? group([group(children, "stack", { className: "tt5-wide" }, { gap: 19.2 })], "stack", { backgroundColor: "#FFEE58", className: "tt5-reference-shell tt5-newsletter" }) : group(children, "stack", { backgroundColor: "#FFEE58", padding: "50px", ...(revision !== "original" ? { className: "tt5-newsletter" } : {}) }, { gap: 20 })];
  });
  add("footer-columns", "footer", () => [footerShell([footerTop(true), spacer(70), credits()], "columns")]);
  return set;
}

/** Pure comparison projection; site identity, menus and saved originals remain owned by their sites. */
export function referenceComparisonSet(set: TemplateSet): TemplateSet {
  return { ...set, identity: { ...set.identity, name: referenceComparisonTitle, homeUrl: "/" }, navigation: copyTemplateData(referenceComparisonNavigation) };
}
export { TEMPLATE_VERSION };

/** Upgrade only exact, pristine reference parts; authored variations remain untouched. */
export function upgradeReferenceTemplateParts(set: TemplateSet): TemplateSet {
  if (set.id !== referencePartSetId) return set;
  const original = createReferenceTemplateParts("original");
  const previousAccuracy = createReferenceTemplateParts("accuracy1");
  const previousCurrent = createReferenceTemplateParts("accuracy2");
  const previousShells = createReferenceTemplateParts("accuracy3");
  const current = createReferenceTemplateParts();
  return { ...set, parts: set.parts.map(part => {
    const prior = original.parts.find(candidate => candidate.id === part.id);
    const priorAccuracy = previousAccuracy.parts.find(candidate => candidate.id === part.id);
    const priorCurrent = previousCurrent.parts.find(candidate => candidate.id === part.id);
    const priorShells = previousShells.parts.find(candidate => candidate.id === part.id);
    return prior && (JSON.stringify(prior) === JSON.stringify(part) || JSON.stringify(priorAccuracy) === JSON.stringify(part) || JSON.stringify(priorCurrent) === JSON.stringify(part) || JSON.stringify(priorShells) === JSON.stringify(part)) ? current.parts.find(candidate => candidate.id === part.id)! : part;
  }) };
}
