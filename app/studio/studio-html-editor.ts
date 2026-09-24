import type { ContentBlock, LayoutOptions, RichTextRun, SiteSectionRole, TextMark } from "../content/model";
import { hasLayoutOptions } from "../content/layout";
import { plainTextFromRuns, safeImageSource, safeTextLink } from "../content/rich-text";
import { validContentBlocks } from "./workspace-validation";

/**
 * Serialises a typed block to the small, semantic HTML surface exposed by
 * Studio's "Edit as HTML" action. This is an inspection/editing format, not
 * executable draft content: component blocks remain identified by metadata.
 */
export function blockToHtml(block: ContentBlock): string {
  const attributes = ` data-block-type="${escapeAttribute(block.type)}" data-block-id="${escapeAttribute(block.id)}"`;
  return serialiseBlock(block, attributes);
}

/** Serialise the complete document body for the document-level code editor. */
export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map((block) => blockToHtml(block)).join("\n\n");
}

/** Format supported HTML without changing its content or executable surface. */
export function formatHtml(html: string): string {
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
  const lines: string[] = [];
  let depth = 0;
  let currentLine = "";
  const blockElements = new Set(["aside", "blockquote", "div", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "label", "li", "main", "ol", "p", "pre", "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul"]);
  const textContainers = new Set(["a", "blockquote", "code", "em", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "pre", "q", "span", "strong", "td", "th"]);
  const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const tagStack: string[] = [];
  const flush = () => {
    if (currentLine.trim()) lines.push(currentLine.trimEnd());
    currentLine = "";
  };

  for (const token of tokens) {
    const value = token.trim();
    if (!value) {
      const parent = tagStack[tagStack.length - 1];
      if (parent && textContainers.has(parent)) currentLine += token;
      continue;
    }
    if (/^<!--/.test(value)) {
      flush();
      lines.push(`${"  ".repeat(depth)}${value}`);
      continue;
    }
    const closing = /^<\//.test(value);
    const opening = /^<([a-z][\w:-]*)\b/i.exec(value);
    const closingTag = /^<\/([a-z][\w:-]*)/i.exec(value);
    const tagName = (opening?.[1] ?? closingTag?.[1])?.toLowerCase();
    const selfClosing = /\/\s*>$/.test(value);
    if (closing && tagName && blockElements.has(tagName)) {
      depth = Math.max(0, depth - 1);
      const stackIndex = tagStack.lastIndexOf(tagName);
      if (stackIndex >= 0) tagStack.splice(stackIndex, 1);
      const openingOnly = /^\s*<[a-z][^>]*>$/i.test(currentLine);
      if (openingOnly) flush();
      if (!currentLine) currentLine = "  ".repeat(depth);
      currentLine += value;
      flush();
      continue;
    }
    if (opening && tagName && blockElements.has(tagName)) {
      flush();
      currentLine = `${"  ".repeat(depth)}${value}`;
      if (selfClosing || voidElements.has(tagName)) flush();
      else {
        tagStack.push(tagName);
        depth += 1;
      }
      continue;
    }
    if (token.startsWith("<")) {
      if (!currentLine) currentLine = "  ".repeat(depth);
      currentLine += value;
      if (opening && tagName && !selfClosing && !voidElements.has(tagName)) tagStack.push(tagName);
      if (closing && tagName) {
        const stackIndex = tagStack.lastIndexOf(tagName);
        if (stackIndex >= 0) tagStack.splice(stackIndex, 1);
      }
      continue;
    }
    if (!currentLine) currentLine = "  ".repeat(depth);
    currentLine += token;
  }
  flush();
  return lines.join("\n");
}

function serialiseBlock(block: ContentBlock, attributes = ""): string {
  if (block.siteRole) attributes += ` data-site-role="${escapeAttribute(block.siteRole)}"`;
  switch (block.type) {
    case "paragraph":
      return `<p${attributes} data-align-explicit="true"${classAttribute([block.style?.className, block.align ? `align-${block.align}` : ""].filter(Boolean).join(" "))}>${runsToHtml(block.runs, block.text)}</p>`;
    case "heading":
      return `<h${block.level}${attributes}${classAttribute(block.align ? `align-${block.align}` : undefined)}>${runsToHtml(block.runs, block.text)}</h${block.level}>`;
    case "quote":
      return `<blockquote${attributes}${classAttribute(block.align ? `align-${block.align}` : undefined)}>${runsToHtml(block.runs, block.text)}${block.attribution ? `<cite>${escapeText(block.attribution)}</cite>` : ""}</blockquote>`;
    case "list": {
      const tag = block.style === "ordered" ? "ol" : "ul";
      return `<${tag}${attributes}>${block.items.map((item) => `<li>${escapeText(item)}</li>`).join("")}</${tag}>`;
    }
    case "table": {
      const rows = block.rows.length ? block.rows : [[""]];
      const headerRows = block.hasHeader ? 1 : 0;
      const footerRows = block.hasFooter ? 1 : 0;
      const bodyEnd = Math.max(headerRows, rows.length - footerRows);
      const renderRow = (row: string[], cellTag: "th" | "td") => `<tr>${row.map((cell) => `<${cellTag}>${escapeText(cell)}</${cellTag}>`).join("")}</tr>`;
      const head = headerRows ? `<thead>${renderRow(rows[0], "th")}</thead>` : "";
      const body = rows.slice(headerRows, bodyEnd).map((row) => renderRow(row, "td")).join("");
      const foot = footerRows ? `<tfoot>${renderRow(rows[rows.length - 1], "td")}</tfoot>` : "";
      return `<table${attributes}${block.columnWidths ? ` data-column-widths="${block.columnWidths.join(",")}"` : ""}${block.rowHeights ? ` data-row-heights="${block.rowHeights.join(",")}"` : ""}${classAttribute("studio-table")}>${head}<tbody>${body}</tbody>${foot}</table>`;
    }
    case "code":
      return `<pre${attributes}><code${classAttribute(block.language ? `language-${block.language}` : undefined)}>${escapeText(block.code)}</code></pre>`;
    case "image": {
      const safeSource = safeImageSource(block.src) ?? "";
      return `<figure${attributes}${classAttribute(block.wide ? "is-wide" : undefined)}><img src="${escapeAttribute(safeSource)}" alt="${escapeAttribute(block.alt)}" />${block.caption ? `<figcaption>${escapeText(block.caption)}</figcaption>` : ""}</figure>`;
    }
    case "embed":
      return `<aside${attributes} data-embed-url="${escapeAttribute(block.url)}"><a href="${escapeAttribute(block.url)}">${escapeText(block.title)}</a></aside>`;
    case "divider":
      return `<hr${attributes} />`;
    case "spacer":
      return `<div${attributes}${classAttribute("studio-spacer")} data-spacer-height="${block.height}" aria-hidden="true"></div>`;
    case "document-title":
      return `<h1${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)}></h1>`;
    case "document-subtitle":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)}></p>`;
    case "cover-image":
      return `<figure${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)}></figure>`;
    case "reading-time":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-prefix="${escapeAttribute(block.prefix ?? "Reading Time:")}" data-metadata-presentation="${escapeAttribute(block.presentation ?? "badge")}"></p>`;
    case "post-author":
      return `<div${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-prefix="${escapeAttribute(block.prefix ?? "By")}" data-metadata-avatar="${block.avatar !== false}"></div>`;
    case "post-date":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-format="${escapeAttribute(block.format ?? "long")}" data-metadata-icon="${block.showIcon !== false}"></p>`;
    case "button":
      return `<p${attributes}><a class="content-button is-${escapeAttribute(block.style)}" href="${escapeAttribute(block.url)}">${escapeText(block.label)}</a></p>`;
    case "field":
      return `<label${attributes}><span>${escapeText(block.label)}</span>${block.control === "select" ? `<select>${(block.options?.length ? block.options : [block.value]).map((option) => `<option${option === block.value ? " selected" : ""}>${escapeText(option)}</option>`).join("")}</select>` : `<input value="${escapeAttribute(block.value)}" />`}</label>`;
    case "section":
      return `<section${attributes} data-section-role="${escapeAttribute(block.role ?? "")}"${layoutHtmlAttributes(block)}${classAttribute(`studio-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`)}>${serialiseChildren(block.children)}</section>`;
    case "group":
      return `<div${attributes}${layoutHtmlAttributes(block)}${classAttribute(`studio-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`)}>${serialiseChildren(block.children)}</div>`;
    case "component":
      return `<div${attributes}${classAttribute("studio-component")} data-component="${escapeAttribute(block.component)}"${block.source ? ` data-source-module="${escapeAttribute(block.source.module)}" data-source-export="${escapeAttribute(block.source.exportName)}" data-source-revision="${escapeAttribute(block.source.revision)}"` : ""}>${block.children ? serialiseChildren(block.children) : ""}</div>`;
  }
}

function serialiseChildren(children: ContentBlock[]) {
  return children.map((child) => serialiseBlock(child, ` data-block-type="${escapeAttribute(child.type)}" data-block-id="${escapeAttribute(child.id)}"`)).join("");
}

function runsToHtml(runs: RichTextRun[] | undefined, text: string) {
  if (!runs?.length) return escapeText(text);
  return runs.map((run) => {
    let html = escapeText(run.text).replace(/\n/g, "<br />");
    for (const mark of run.marks ?? []) {
      if (mark === "bold") html = `<strong>${html}</strong>`;
      else if (mark === "italic") html = `<em>${html}</em>`;
      else if (mark === "strikethrough") html = `<s>${html}</s>`;
      else if (mark === "inline-code") html = `<code>${html}</code>`;
      else if (mark === "subscript") html = `<sub>${html}</sub>`;
      else if (mark === "superscript") html = `<sup>${html}</sup>`;
      else if (mark === "keyboard") html = `<kbd>${html}</kbd>`;
      else {
        const href = safeTextLink(mark.url);
        if (href) html = `<a href="${escapeAttribute(href)}"${mark.opensInNewTab ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""}>${html}</a>`;
      }
    }
    return html;
  }).join("");
}

function classAttribute(value?: string) {
  return value ? ` class="${escapeAttribute(value)}"` : "";
}

function layoutHtmlAttributes(block: Extract<ContentBlock, { type: "group" | "section" }>) {
  const options: LayoutOptions = block;
  return [
    options.horizontalAlign && ` data-layout-horizontal-align="${escapeAttribute(options.horizontalAlign)}"`,
    options.verticalAlign && ` data-layout-vertical-align="${escapeAttribute(options.verticalAlign)}"`,
    options.gap !== undefined && ` data-layout-gap="${options.gap}"`,
    options.paddingX !== undefined && ` data-layout-padding-x="${options.paddingX}"`,
    options.paddingY !== undefined && ` data-layout-padding-y="${options.paddingY}"`,
    options.contentWidth && ` data-layout-width="${escapeAttribute(options.contentWidth)}"`,
    options.columns !== undefined && ` data-layout-columns="${options.columns}"`,
    options.stackAt && ` data-layout-stack-at="${escapeAttribute(options.stackAt)}"`,
  ].filter(Boolean).join("");
}

function escapeText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string) {
  return escapeText(value).replace(/"/g, "&quot;");
}

export type HtmlParseResult = { block: ContentBlock } | { error: string };

export type HtmlBlocksParseResult = { blocks: ContentBlock[] } | { error: string };

export function collectBlockIds(block: ContentBlock): string[] {
  if (block.type === "section" || block.type === "group") return [block.id, ...block.children.flatMap(collectBlockIds)];
  if (block.type === "component") return [block.id, ...(block.children?.flatMap(collectBlockIds) ?? [])];
  return [block.id];
}

/** Parse only the semantic elements emitted by blockToHtml. */
export function parseHtmlToBlock(html: string, original: ContentBlock): HtmlParseResult {
  if (typeof DOMParser === "undefined") return { error: "HTML editing is only available in a browser." };
  const document = new DOMParser().parseFromString(html, "text/html");
  if (document.querySelector("parsererror")) return { error: "The HTML could not be parsed." };
  if (document.querySelector("script, style, iframe, object, embed, form, [onclick], [onerror], [onload], [oninput], [onchange], [onsubmit]")) return { error: "Scripts, event handlers and unsafe elements are not supported." };
  const nodes = [...document.body.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
  if (nodes.length !== 1 || nodes[0].nodeType !== Node.ELEMENT_NODE) return { error: "Use one supported block element at the root." };
  const ids = [...document.querySelectorAll<HTMLElement>("[data-block-id]")].map((element) => element.dataset.blockId).filter((id): id is string => Boolean(id));
  if (new Set(ids).size !== ids.length) return { error: "Each block must have a unique data-block-id." };
  const parsed = parseElement(nodes[0] as HTMLElement, original);
  if ("error" in parsed) return parsed;
  const parsedIds = collectBlockIds(parsed.block);
  if (new Set(parsedIds).size !== parsedIds.length) return { error: "Each block must have a unique block ID." };
  if (!validContentBlocks([parsed.block])) return { error: "This HTML would create an invalid block." };
  return parsed;
}

/** Parse the complete document body emitted by blocksToHtml. */
export function parseHtmlToBlocks(html: string, originals: ContentBlock[]): HtmlBlocksParseResult {
  if (typeof DOMParser === "undefined") return { error: "HTML editing is only available in a browser." };
  const document = new DOMParser().parseFromString(html, "text/html");
  if (document.querySelector("parsererror")) return { error: "The HTML could not be parsed." };
  if (document.querySelector("script, style, iframe, object, embed, form, [onclick], [onerror], [onload], [oninput], [onchange], [onsubmit]")) return { error: "Scripts, event handlers and unsafe elements are not supported." };
  const nodes = [...document.body.childNodes].filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
  if (nodes.some((node) => node.nodeType !== Node.ELEMENT_NODE)) return { error: "Use supported block elements only." };
  const originalById = new Map<string, ContentBlock>();
  const index = (blocks: ContentBlock[]) => blocks.forEach((block) => { originalById.set(block.id, block); if (block.type === "section" || block.type === "group" || block.type === "component") index(block.children ?? []); });
  index(originals);
  const blocks: ContentBlock[] = [];
  for (const node of nodes) {
    const element = node as HTMLElement;
    const id = element.dataset.blockId;
    const original = (id ? originalById.get(id) : undefined) ?? { id: id || crypto.randomUUID(), type: "paragraph", text: "" } as ContentBlock;
    const parsed = parseElement(element, original, originalById);
    if ("error" in parsed) return parsed;
    blocks.push(parsed.block);
  }
  const ids = collectBlockIds({ id: "document-root", type: "group", layout: "stack", children: blocks });
  if (new Set(ids).size !== ids.length) return { error: "Each block must have a unique block ID." };
  if (!validContentBlocks(blocks)) return { error: "This HTML would create an invalid document." };
  return { blocks };
}

function parseElement(element: HTMLElement, original: ContentBlock, originals = new Map<string, ContentBlock>()): HtmlParseResult {
  if (!originals.size) {
    const index = (block: ContentBlock) => { originals.set(block.id, block); if (block.type === "section" || block.type === "group" || block.type === "component") (block.children ?? []).forEach(index); };
    index(original);
  }
  const parsed = parseElementContent(element, original, originals);
  if ("error" in parsed) return parsed;
  const role = element.dataset.siteRole;
  if (role !== undefined) {
    if (!["logo", "title", "eyebrow", "status", "progress", "table-size", "auto-resize", "new-game", "holes", "players", "reset-scores", "export-excel", "export-image", "export-html", "metric-average", "metric-deviation", "metric-holes", "player-name", "score-value", "score-label", "metric-label", "metric-value", "footer-name", "copyright", "social-icon", "social-action"].includes(role)) return { error: "This source role is not supported." };
    parsed.block.siteRole = role as NonNullable<ContentBlock["siteRole"]>;
  }
  return parsed;
}

function parseElementContent(element: HTMLElement, original: ContentBlock, originals: Map<string, ContentBlock>): HtmlParseResult {
  const id = element.dataset.blockId || original.id;
  const textContent = element.textContent ?? "";
  const declaredType = element.dataset.blockType;
  if (declaredType === "reading-time") return { block: { id, type: "reading-time", prefix: element.dataset.metadataPrefix ?? (original.type === "reading-time" ? original.prefix : "Reading Time:"), presentation: element.dataset.metadataPresentation === "plain" ? "plain" : "badge", align: alignmentFromClass(element) ?? (original.type === "reading-time" ? original.align : undefined) } };
  if (declaredType === "post-author") return { block: { id, type: "post-author", prefix: element.dataset.metadataPrefix ?? (original.type === "post-author" ? original.prefix : "By"), avatar: element.dataset.metadataAvatar !== "false", align: alignmentFromClass(element) ?? (original.type === "post-author" ? original.align : undefined) } };
  if (declaredType === "post-date") return { block: { id, type: "post-date", format: ["long", "short", "iso"].includes(element.dataset.metadataFormat ?? "") ? element.dataset.metadataFormat as "long" | "short" | "iso" : (original.type === "post-date" ? original.format : "long"), showIcon: element.dataset.metadataIcon !== "false", align: alignmentFromClass(element) ?? (original.type === "post-date" ? original.align : undefined) } };
  if (declaredType === "document-title") return { block: { id, type: "document-title", align: alignmentFromClass(element) ?? (original.type === "document-title" ? original.align : undefined) } };
  if (declaredType === "document-subtitle") return { block: { id, type: "document-subtitle", align: alignmentFromClass(element) ?? (original.type === "document-subtitle" ? original.align : undefined) } };
  if (declaredType === "cover-image") return { block: { id, type: "cover-image", align: alignmentFromClass(element) ?? (original.type === "cover-image" ? original.align : undefined) } };
  switch (element.tagName.toLowerCase()) {
    case "p": {
      const link = element.querySelector("a");
      if (link?.classList.contains("content-button")) return { block: { id, type: "button", label: link.textContent ?? "", url: safeTextLink(link.getAttribute("href") ?? "") || "#", style: link.classList.contains("is-secondary") ? "secondary" : "primary" } };
      const runs = parseRuns(element);
      return { block: { ...preserveParagraphStyle(original, id), type: "paragraph", text: runs ? plainTextFromRuns(runs) : textContent, runs, align: alignmentFromClass(element) ?? (element.dataset.alignExplicit === "true" ? undefined : original.type === "paragraph" ? original.align : undefined) } };
    }
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      { const runs = parseRuns(element); return { block: { id, type: "heading", level: Number(element.tagName.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6, text: runs ? plainTextFromRuns(runs) : textContent, runs, align: alignmentFromClass(element) } }; }
    case "blockquote":
      { const runs = parseRuns(element); return { block: { id, type: "quote", text: runs ? plainTextFromRuns(runs) : textContent.replace(element.querySelector("cite")?.textContent ?? "", "").trim(), runs, attribution: element.querySelector("cite")?.textContent || undefined, align: alignmentFromClass(element) } }; }
    case "ul": case "ol":
      return { block: { id, type: "list", style: element.tagName.toLowerCase() === "ol" ? "ordered" : "unordered", items: [...element.children].filter((child) => child.tagName.toLowerCase() === "li").map((child) => child.textContent ?? "") } };
    case "table":
      return parseTable(element, id, original);
    case "pre":
      return { block: { id, type: "code", language: element.querySelector("code")?.className.match(/language-([^\s]+)/)?.[1], code: element.querySelector("code")?.textContent ?? element.textContent ?? "" } };
    case "figure": {
      const image = element.querySelector("img");
      if (!image) return { error: "Image blocks must contain an img element." };
      const rawSrc = image.getAttribute("src") ?? "";
      const src = safeImageSource(rawSrc);
      if (!src && !(original.type === "image" && original.mediaId && rawSrc === "")) return { error: "Image blocks must use a safe image URL." };
      const next: Extract<ContentBlock, { type: "image" }> = { ...(original.type === "image" ? original : {}), id, type: "image", src: src ?? "", alt: image.getAttribute("alt") ?? "", caption: element.querySelector("figcaption")?.textContent || undefined, wide: element.classList.contains("is-wide") };
      const originalSrc = original.type === "image" ? safeImageSource(original.src) ?? "" : "";
      if (original.type === "image" && (src ?? "") !== originalSrc) delete next.mediaId;
      return { block: next };
    }
    case "aside":
      return { block: { id, type: "embed", url: safeTextLink(element.getAttribute("data-embed-url") ?? element.querySelector("a")?.getAttribute("href") ?? "") || "", title: element.textContent ?? "" } };
    case "hr": return { block: { id, type: "divider" } };
    case "label": {
      const control = element.querySelector("select") ? "select" : "text";
      const input = element.querySelector("input") as HTMLInputElement | null;
      const select = element.querySelector("select");
      return { block: { id, type: "field", control, label: element.querySelector("span")?.textContent ?? "", value: select?.value ?? input?.value ?? "", options: select ? [...select.options].map((option) => option.textContent ?? "") : undefined } };
    }
    case "section": case "div": {
      if (element.dataset.spacerHeight !== undefined || element.classList.contains("studio-spacer")) {
        const height = Number(element.dataset.spacerHeight);
        return { block: { ...(original.type === "spacer" ? original : {}), id, type: "spacer", height } };
      }
      const type = element.tagName.toLowerCase() === "section" ? "section" : "group";
      if (type === "group" && element.dataset.component) {
        if (original.type !== "component" || original.component !== element.dataset.component) return { error: "Component blocks are code-backed; edit their supported properties in the inspector." };
        if (!original.children?.length) return { block: original };
        const children: ContentBlock[] = [];
        for (const child of [...element.children]) {
          const childElement = child as HTMLElement;
          const childId = childElement.dataset.blockId;
          const originalChild = original.children.find((candidate) => candidate.id === childId);
          if (!originalChild) return { error: "Component children must retain their original block IDs." };
          const parsed = parseElement(childElement, originalChild, originals);
          if ("error" in parsed) return parsed;
          children.push(parsed.block);
        }
        return { block: { ...original, children } };
      }
      const children: ContentBlock[] = [];
      for (const child of [...element.children]) {
        const childElement = child as HTMLElement;
        const childId = childElement.dataset.blockId || childElement.id || crypto.randomUUID();
        const originalChild = originals.get(childId);
        const parsed = parseElement(childElement, originalChild ?? { id: childId, type: "paragraph", text: "" }, originals);
        if ("error" in parsed) return parsed;
        children.push(parsed.block);
      }
      const layout = (element.className.match(/layout-(stack|row|columns)/)?.[1] ?? "stack") as "stack" | "row" | "columns";
      const options = parseLayoutOptions(element);
      if (type === "section") return { block: { ...(original.type === "section" ? original : {}), id, type: "section", role: sectionRoleFromData(element.dataset.sectionRole), layout, ...options, children } };
      return { block: { ...(original.type === "group" ? original : {}), id, type: "group", layout, ...options, children } };
    }
    default:
      return { error: `This element (${element.tagName.toLowerCase()}) is not supported for this block.` };
  }
}

function parseLayoutOptions(element: HTMLElement): LayoutOptions {
  const number = (value: string | undefined) => value === undefined ? undefined : Number(value);
  return {
    horizontalAlign: element.dataset.layoutHorizontalAlign as LayoutOptions["horizontalAlign"],
    verticalAlign: element.dataset.layoutVerticalAlign as LayoutOptions["verticalAlign"],
    gap: number(element.dataset.layoutGap),
    paddingX: number(element.dataset.layoutPaddingX),
    paddingY: number(element.dataset.layoutPaddingY),
    contentWidth: element.dataset.layoutWidth as LayoutOptions["contentWidth"],
    columns: number(element.dataset.layoutColumns),
    stackAt: element.dataset.layoutStackAt as LayoutOptions["stackAt"],
  };
}

function sectionRoleFromData(value?: string): SiteSectionRole | undefined {
  return value && ["account", "setup", "scorecard", "leaderboard", "share", "hero", "hero-copy", "account-copy", "scorecard-heading", "scorecard-actions", "leaderboard-card", "leaderboard-score", "leaderboard-metrics", "metric", "footer", "footer-brand", "footer-links", "social-link"].includes(value) ? value as SiteSectionRole : undefined;
}

function preserveParagraphStyle(original: ContentBlock, id: string) {
  return original.type === "paragraph" ? { id, style: original.style } : { id };
}

function alignmentFromClass(element: HTMLElement) {
  const value = element.className.match(/align-(left|centre|right)/)?.[1];
  return value as "left" | "centre" | "right" | undefined;
}

function parseRuns(element: HTMLElement): RichTextRun[] | undefined {
  const runs: RichTextRun[] = [];
  function visit(node: Node, marks: TextMark[]) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) runs.push({ text: node.textContent, marks: marks.length ? marks : undefined }); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as HTMLElement;
    if (child.tagName === "CITE") return;
    if (child.tagName === "BR") { runs.push({ text: "\n", marks: marks.length ? marks : undefined }); return; }
    const next = [...marks];
    if (["STRONG", "B"].includes(child.tagName)) next.push("bold");
    if (["EM", "I"].includes(child.tagName)) next.push("italic");
    if (["S", "STRIKE", "DEL"].includes(child.tagName)) next.push("strikethrough");
    if (child.tagName === "CODE") next.push("inline-code");
    if (child.tagName === "SUB") next.push("subscript");
    if (child.tagName === "SUP") next.push("superscript");
    if (child.tagName === "KBD") next.push("keyboard");
    if (child.tagName === "A") { const href = safeTextLink(child.getAttribute("href") ?? ""); if (href) next.push({ type: "link", url: href, opensInNewTab: child.getAttribute("target") === "_blank" || undefined }); }
    child.childNodes.forEach((nested) => visit(nested, next));
  }
  element.childNodes.forEach((node) => visit(node, []));
  return runs.length ? runs : undefined;
}

function parseTable(element: HTMLElement, id: string, original: ContentBlock): HtmlParseResult {
  const rows: string[][] = [];
  const head = element.querySelector("thead");
  const body = element.querySelector("tbody");
  const foot = element.querySelector("tfoot");
  const read = (root: Element | null) => root?.querySelectorAll("tr").forEach((row) => rows.push([...row.children].map((cell) => cell.textContent ?? "")));
  read(head); read(body); read(foot);
  if (!rows.length) return { error: "Table blocks must contain at least one row." };
  if (rows.some((row) => row.length !== rows[0].length)) return { error: "Table rows must all contain the same number of cells." };
  const sizes = (attribute: string, count: number, previous: number[] | undefined) => {
    const encoded = element.getAttribute(attribute);
    if (encoded === null) return previous?.length === count ? previous : undefined;
    const values = encoded.split(",").map(Number);
    return values.length === count && values.every((value) => Number.isFinite(value) && value > 0) ? values : null;
  };
  const columnWidths = sizes("data-column-widths", rows[0].length, original.type === "table" ? original.columnWidths : undefined);
  const rowHeights = sizes("data-row-heights", rows.length, original.type === "table" ? original.rowHeights : undefined);
  if (columnWidths === null || rowHeights === null) return { error: "Table dimensions must be positive numbers matching the column and row counts." };
  return { block: { id, type: "table", rows, hasHeader: Boolean(head), hasFooter: Boolean(foot), columnWidths, rowHeights } };
}
