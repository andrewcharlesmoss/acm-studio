import { listItemText, type ContentBlock, type LayoutOptions, type RichTextRun, type SiteSectionRole, type SocialIconBlock, type TextMark } from "../content/model";
import { blockAlignmentClass, contentBlockAlignment } from "../content/block-alignment";
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
  const blockElements = new Set(["aside", "blockquote", "div", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "label", "li", "main", "nav", "ol", "p", "pre", "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul"]);
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
  const advancedStyle = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style : block.visualStyle;
  if (["paragraph", "heading", "quote", "list", "table", "code", "image", "embed", "button", "divider", "spacer", "group", "section", "columns", "column", "footnotes", "social-icons", "social-linkedin", "social-tiktok", "document-title", "cover-image", "post-date", "post-author"].includes(block.type)) {
    attributes += ` data-html-anchor="${escapeAttribute(advancedStyle?.anchor ?? "")}" data-additional-classes="${escapeAttribute(advancedStyle?.className ?? "")}"`;
  }
  switch (block.type) {
    case "paragraph":
      return `<p${attributes} data-align-explicit="true" data-block-align-explicit="true"${classAttribute([block.style?.className, block.align ? `align-${block.align}` : "", block.blockAlign ? `align${block.blockAlign}` : ""].filter(Boolean).join(" "))}>${runsToHtml(block.runs, block.text)}</p>`;
    case "heading":
      return `<h${block.level}${attributes} data-block-align-explicit="true"${classAttribute([block.align ? `align-${block.align}` : "", blockAlignmentClass(block)].filter(Boolean).join(" "))}>${runsToHtml(block.runs, block.text)}</h${block.level}>`;
    case "quote":
      return `<blockquote${attributes} data-block-align-explicit="true"${classAttribute([block.align ? `align-${block.align}` : "", blockAlignmentClass(block), block.quoteStyle === "plain" ? "is-style-plain" : ""].filter(Boolean).join(" "))}>${runsToHtml(block.runs, block.text)}${block.attribution ? `<cite>${escapeText(block.attribution)}</cite>` : ""}</blockquote>`;
    case "list": {
      const tag = block.style === "ordered" ? "ol" : "ul";
      return `<${tag}${attributes} data-block-align-explicit="true"${block.style === "ordered" && block.marker && block.marker !== "1" ? ` type="${block.marker}"` : ""}${block.style === "ordered" && block.start !== undefined ? ` start="${block.start}"` : ""}${block.style === "ordered" && block.reversed ? " reversed" : ""}${classAttribute(blockAlignmentClass(block))}>${block.items.map((item) => `<li>${typeof item === "string" ? escapeText(item) : runsToHtml(item.runs, listItemText(item))}</li>`).join("")}</${tag}>`;
    }
    case "table": {
      const rows = block.rows.length ? block.rows : [[""]];
      const headerRows = block.hasHeader ? 1 : 0;
      const footerRows = block.hasFooter ? 1 : 0;
      const bodyEnd = Math.max(headerRows, rows.length - footerRows);
      const renderRow = (row: string[], cellTag: "th" | "td") => `<tr>${row.map((cell, index) => { const alignment = block.columnAlignments?.[index]; const htmlAlignment = alignment === "centre" ? "center" : alignment; return `<${cellTag}${htmlAlignment && htmlAlignment !== "left" ? ` class="has-text-align-${htmlAlignment}" data-align="${htmlAlignment}"` : ""}>${escapeText(cell)}</${cellTag}>`; }).join("")}</tr>`;
      const head = headerRows ? `<thead>${renderRow(rows[0], "th")}</thead>` : "";
      const body = rows.slice(headerRows, bodyEnd).map((row) => renderRow(row, "td")).join("");
      const foot = footerRows ? `<tfoot>${renderRow(rows[rows.length - 1], "td")}</tfoot>` : "";
      return `<table${attributes} data-block-align-explicit="true"${block.fixedWidth === false ? ' data-fixed-width="false"' : ""}${block.columnWidths ? ` data-column-widths="${block.columnWidths.join(",")}"` : ""}${block.rowHeights ? ` data-row-heights="${block.rowHeights.join(",")}"` : ""}${block.columnAlignments ? ` data-column-alignments="${block.columnAlignments.join(",")}"` : ""}${classAttribute([`studio-table${block.tableStyle === "stripes" ? " is-striped" : ""}`, blockAlignmentClass(block)].filter(Boolean).join(" "))}>${block.caption ? `<caption>${escapeText(block.caption)}</caption>` : ""}${head}<tbody>${body}</tbody>${foot}</table>`;
    }
    case "code":
      return `<pre${attributes} data-block-align-explicit="true"${classAttribute(blockAlignmentClass(block))}><code${classAttribute(block.language ? `language-${block.language}` : undefined)}>${escapeText(block.code)}</code></pre>`;
    case "image": {
      const safeSource = safeImageSource(block.src) ?? "";
      const image = `<img src="${escapeAttribute(safeSource)}" alt="${escapeAttribute(block.decorative ? "" : block.alt)}"${block.decorative ? ' data-decorative="true"' : ""}${block.title ? ` title="${escapeAttribute(block.title)}"` : ""}${block.aspectRatio && block.aspectRatio !== "original" ? ` data-aspect-ratio="${block.aspectRatio}"` : ""}${block.scale ? ` data-scale="${block.scale}"` : ""}${block.displayWidth ? ` data-display-width="${block.displayWidth}"` : ""}${block.displayHeight ? ` data-display-height="${block.displayHeight}"` : ""}${block.focalX !== undefined ? ` data-focal-x="${block.focalX}"` : ""}${block.focalY !== undefined ? ` data-focal-y="${block.focalY}"` : ""} />`;
      const destination = block.linkDestination ?? (block.linkUrl ? "custom" : "none");
      const link = destination === "media" ? safeSource : destination === "custom" && block.linkUrl ? safeTextLink(block.linkUrl) : null;
      return `<figure${attributes} data-block-align-explicit="true"${classAttribute(blockAlignmentClass(block))}${destination !== "none" ? ` data-link-destination="${destination}"` : ""}${block.imageStyle === "rounded" ? ' data-image-style="rounded"' : ""}>${link ? `<a href="${escapeAttribute(link)}"${block.opensInNewTab ? ' target="_blank" rel="noopener noreferrer"' : ""}>${image}</a>` : image}${block.caption ? `<figcaption>${escapeText(block.caption)}</figcaption>` : ""}</figure>`;
    }
    case "embed":
      return `<aside${attributes} data-block-align-explicit="true" data-embed-url="${escapeAttribute(block.url)}"${classAttribute(blockAlignmentClass(block))}><a href="${escapeAttribute(block.url)}">${escapeText(block.title)}</a>${block.caption ? `<p class="embed-caption">${escapeText(block.caption)}</p>` : ""}</aside>`;
    case "divider":
      return block.tagName === "div"
        ? `<div${attributes} data-block-align-explicit="true"${classAttribute([block.style && block.style !== "default" ? `is-${block.style}` : "", blockAlignmentClass(block)].filter(Boolean).join(" "))}></div>`
        : `<hr${attributes} data-block-align-explicit="true"${classAttribute([block.style && block.style !== "default" ? `is-${block.style}` : "", blockAlignmentClass(block)].filter(Boolean).join(" "))} />`;
    case "footnotes":
      return `<section${attributes} class="article-footnotes"><ol>${block.notes.map(note => `<li id="footnote-${escapeAttribute(note.id)}"><span>${escapeText(note.text)}</span><a data-footnote-back="true" href="#footnote-ref-${escapeAttribute(note.id)}" aria-label="Return to footnote reference">↩</a></li>`).join("")}</ol></section>`;
    case "spacer":
      return `<div${attributes}${classAttribute("studio-spacer")} data-spacer-height="${block.height}"${block.heightUnit ? ` data-spacer-height-unit="${block.heightUnit}"` : ""}${block.width === undefined ? "" : ` data-spacer-width="${block.width}"`}${block.widthUnit ? ` data-spacer-width-unit="${block.widthUnit}"` : ""} aria-hidden="true"></div>`;
    case "document-title":
      return `<h${block.level ?? 2}${attributes} data-block-align-explicit="true" data-metadata-link="${Boolean(block.isLink)}" data-link-target="${escapeAttribute(block.linkTarget ?? "_self")}"${block.rel ? ` data-link-rel="${escapeAttribute(block.rel)}"` : ""}${classAttribute([`metadata-block align-${block.align ?? "left"}`, blockAlignmentClass(block)].filter(Boolean).join(" "))}></h${block.level ?? 2}>`;
    case "document-subtitle":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)}></p>`;
    case "cover-image":
      return `<figure${attributes} data-block-align-explicit="true" data-metadata-link="${Boolean(block.isLink)}" data-link-target="${escapeAttribute(block.linkTarget ?? "_self")}"${block.rel ? ` data-link-rel="${escapeAttribute(block.rel)}"` : ""}${block.aspectRatio && block.aspectRatio !== "original" ? ` data-aspect-ratio="${block.aspectRatio}"` : ""}${block.scale ? ` data-scale="${block.scale}"` : ""}${block.displayWidth ? ` data-display-width="${block.displayWidth}"` : ""}${block.displayHeight ? ` data-display-height="${block.displayHeight}"` : ""}${block.focalX !== undefined ? ` data-focal-x="${block.focalX}"` : ""}${block.focalY !== undefined ? ` data-focal-y="${block.focalY}"` : ""}${classAttribute([`metadata-block align-${block.align ?? "left"}`, blockAlignmentClass(block)].filter(Boolean).join(" "))}></figure>`;
    case "reading-time":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-prefix="${escapeAttribute(block.prefix ?? "Reading Time:")}" data-metadata-presentation="${escapeAttribute(block.presentation ?? "badge")}"></p>`;
    case "post-author":
      return `<div${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-prefix="${escapeAttribute(block.prefix ?? "By")}" data-metadata-avatar="${block.avatar !== false}"></div>`;
    case "post-date":
      return `<p${attributes}${classAttribute(`metadata-block align-${block.align ?? "left"}`)} data-metadata-format="${escapeAttribute(block.format ?? "long")}" data-metadata-icon="${block.showIcon !== false}" data-metadata-link="${Boolean(block.isLink)}"></p>`;
    case "social-icons":
      return `<nav${attributes} data-block-align-explicit="true" aria-label="Social links" data-social-justification="${block.justification ?? "left"}" data-social-orientation="${block.orientation ?? "horizontal"}" data-social-wrap="${block.allowWrap !== false}" data-social-size="${block.iconSize ?? "normal"}" data-social-style="${block.socialStyle ?? "default"}"${block.horizontalGap === undefined ? "" : ` data-social-horizontal-gap="${block.horizontalGap}"`}${block.verticalGap === undefined ? "" : ` data-social-vertical-gap="${block.verticalGap}"`} data-social-labels="${Boolean(block.showLabels)}" data-social-new-tab="${Boolean(block.openInNewTab)}"${classAttribute(blockAlignmentClass(block))}>${serialiseChildren(block.children)}</nav>`;
    case "social-linkedin":
    case "social-tiktok": {
      const url = safeTextLink(block.url);
      return `<a${attributes}${url ? ` href="${escapeAttribute(url)}"` : ""}${block.rel ? ` rel="${escapeAttribute(block.rel)}"` : ""} data-social-url="${escapeAttribute(block.url)}">${escapeText(block.label ?? "")}</a>`;
    }
    case "button":
      return `<p${attributes} data-button-width="${block.width ?? ""}"${classAttribute([`button-block align-${block.align ?? "centre"}`, block.width ? `has-width-${block.width}` : ""].filter(Boolean).join(" "))}><a class="content-button is-${escapeAttribute(block.style)}" href="${escapeAttribute(block.url)}"${block.title ? ` title="${escapeAttribute(block.title)}"` : ""}${block.opensInNewTab ? ' target="_blank"' : ""}${block.rel || block.opensInNewTab ? ` rel="${escapeAttribute([block.rel, block.opensInNewTab ? "noopener noreferrer" : ""].filter(Boolean).join(" "))}"` : ""}>${escapeText(block.label)}</a></p>`;
    case "field":
      return `<label${attributes}><span>${escapeText(block.label)}</span>${block.control === "select" ? `<select>${(block.options?.length ? block.options : [block.value]).map((option) => `<option${option === block.value ? " selected" : ""}>${escapeText(option)}</option>`).join("")}</select>` : `<input value="${escapeAttribute(block.value)}" />`}</label>`;
    case "section":
      return `<section${attributes} data-section-role="${escapeAttribute(block.role ?? "")}"${layoutHtmlAttributes(block)}${classAttribute(`studio-section layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`)}>${serialiseChildren(block.children)}</section>`;
    case "group": {
      const tag = block.tagName ?? "div";
      return `<${tag}${attributes} data-block-align-explicit="true"${block.ariaLabel ? ` aria-label="${escapeAttribute(block.ariaLabel)}"` : ""}${layoutHtmlAttributes(block)}${classAttribute([`studio-group layout-${block.layout}${hasLayoutOptions(block) ? " has-layout-options" : ""}`, blockAlignmentClass(block)].filter(Boolean).join(" "))}>${serialiseChildren(block.children)}</${tag}>`;
    }
    case "columns":
      return `<div${attributes} data-block-align-explicit="true"${layoutHtmlAttributes(block)} data-column-layout="true"${classAttribute([`studio-columns${block.style?.className ? ` ${escapeAttribute(block.style.className)}` : ""}`, blockAlignmentClass(block)].filter(Boolean).join(" "))}>${block.children.map(column => `<div data-block-type="column" data-block-id="${escapeAttribute(column.id)}" data-column-width="${column.width ?? 100 / block.children.length}"${column.verticalAlign ? ` data-column-vertical-align="${column.verticalAlign}"` : ""}${classAttribute(`studio-column${column.style?.className ? ` ${escapeAttribute(column.style.className)}` : ""}`)}>${serialiseChildren(column.children)}</div>`).join("")}</div>`;
    case "column":
      return `<div${attributes} data-column-width="${block.width ?? 100}"${block.verticalAlign ? ` data-column-vertical-align="${block.verticalAlign}"` : ""}${classAttribute(`studio-column${block.style?.className ? ` ${escapeAttribute(block.style.className)}` : ""}`)}>${serialiseChildren(block.children)}</div>`;
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
      else if (mark.type === "highlight") {
        const style = [mark.textColor && `color:${escapeAttribute(mark.textColor)}`, mark.backgroundColor && `background-color:${escapeAttribute(mark.backgroundColor)}`].filter(Boolean).join(";");
        html = `<mark${style ? ` style="${style}"` : ""}>${html}</mark>`;
      }
      else if (mark.type === "language") html = `<span lang="${escapeAttribute(mark.language)}" dir="${mark.direction}">${html}</span>`;
      else if (mark.type === "math") html = `<span data-inline-math="true"${mark.latex ? ` data-math-latex="${escapeAttribute(mark.latex)}"` : ""}${mark.mathml ? ` data-mathml="${escapeAttribute(mark.mathml)}"` : ""} data-math-alt="${escapeAttribute(mark.alternativeText)}">${html}</span>`;
      else if (mark.type === "inline-image") {
        const src = safeImageSource(mark.src ?? "", { allowBlob: true }) ?? "";
        html = `<img data-inline-image="true"${mark.mediaId ? ` data-media-id="${escapeAttribute(mark.mediaId)}"` : ""}${src ? ` src="${escapeAttribute(src)}"` : ""} data-inline-text="${escapeAttribute(run.text)}" alt="${escapeAttribute(mark.alt)}"${mark.width ? ` width="${mark.width}"` : ""} />`;
      } else if (mark.type === "footnote") html = `<span data-footnote-ref="${escapeAttribute(mark.id)}">${html}<sup><a data-footnote-marker="true" href="#footnote-${escapeAttribute(mark.id)}">†</a></sup></span>`;
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

function layoutHtmlAttributes(options: LayoutOptions) {
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
  if (block.type === "section" || block.type === "group" || block.type === "column" || block.type === "social-icons") return [block.id, ...block.children.flatMap(collectBlockIds)];
  if (block.type === "columns") return [block.id, ...block.children.flatMap(collectBlockIds)];
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
  const index = (blocks: ContentBlock[]) => blocks.forEach((block) => { originalById.set(block.id, block); if (block.type === "section" || block.type === "group" || block.type === "column" || block.type === "component" || block.type === "social-icons") index(block.children ?? []); else if (block.type === "columns") block.children.forEach(column => index([column])); });
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
  const parsed = parseElementBase(element, original, originals);
  if ("error" in parsed) return parsed;
  const block = parsed.block;
  const styleKey = block.type === "paragraph" || block.type === "columns" || block.type === "column" ? "style" : "visualStyle";
  const existingStyle = styleKey === "style" ? block.type === "paragraph" || block.type === "columns" || block.type === "column" ? block.style : undefined : block.visualStyle;
  const anchor = element.dataset.htmlAnchor;
  const className = element.dataset.additionalClasses;
  const nextStyle = { ...(existingStyle ?? {}) };
  if (anchor === undefined || !anchor) delete nextStyle.anchor;
  else nextStyle.anchor = anchor;
  if (className === undefined || !className) delete nextStyle.className;
  else nextStyle.className = className;
  if (Object.keys(nextStyle).length === 0) {
    if (styleKey === "style") {
      if (block.type === "paragraph" || block.type === "columns" || block.type === "column") delete block.style;
    } else delete block.visualStyle;
  } else if (styleKey === "style") {
    if (block.type === "paragraph" || block.type === "columns" || block.type === "column") block.style = nextStyle;
  } else block.visualStyle = nextStyle;
  return parsed;
}

function parseElementBase(element: HTMLElement, original: ContentBlock, originals = new Map<string, ContentBlock>()): HtmlParseResult {
  if (!originals.size) {
    const index = (block: ContentBlock) => { originals.set(block.id, block); if (block.type === "section" || block.type === "group" || block.type === "column" || block.type === "component" || block.type === "social-icons") (block.children ?? []).forEach(index); else if (block.type === "columns") block.children.forEach(index); };
    index(original);
  }
  const parsed = parseElementContent(element, original, originals);
  if ("error" in parsed) return parsed;
  if (parsed.block.type === original.type && original.visualStyle) parsed.block.visualStyle = original.visualStyle;
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
  if (declaredType === "footnotes" || element.classList.contains("article-footnotes")) {
    const notes = [...element.querySelectorAll<HTMLElement>("ol > li")].map(item => {
      const back = item.querySelector("[data-footnote-back]");
      back?.remove();
      const rawId = item.id.replace(/^footnote-/, "");
      return { id: rawId || crypto.randomUUID(), text: item.querySelector("span")?.textContent ?? item.textContent ?? "" };
    });
    if (!notes.length) return { error: "A footnotes block must contain at least one note." };
    return { block: { id, type: "footnotes", notes } };
  }
  if (declaredType === "reading-time") return { block: { id, type: "reading-time", prefix: element.dataset.metadataPrefix ?? (original.type === "reading-time" ? original.prefix : "Reading Time:"), presentation: element.dataset.metadataPresentation === "plain" ? "plain" : "badge", align: alignmentFromClass(element) ?? (original.type === "reading-time" ? original.align : undefined) } };
  if (declaredType === "post-author") return { block: { id, type: "post-author", prefix: element.dataset.metadataPrefix ?? (original.type === "post-author" ? original.prefix : "By"), avatar: element.dataset.metadataAvatar !== "false", align: alignmentFromClass(element) ?? (original.type === "post-author" ? original.align : undefined) } };
  if (declaredType === "post-date") return { block: { id, type: "post-date", format: ["long", "short", "iso"].includes(element.dataset.metadataFormat ?? "") ? element.dataset.metadataFormat as "long" | "short" | "iso" : (original.type === "post-date" ? original.format : "long"), showIcon: element.dataset.metadataIcon !== "false", align: alignmentFromClass(element) ?? (original.type === "post-date" ? original.align : undefined), isLink: element.dataset.metadataLink === "true" } };
  if (declaredType === "divider") {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== "hr" && tagName !== "div") return { error: "A Divider must use an hr or div element." };
    return { block: { id, type: "divider", tagName: tagName === "div" ? "div" : undefined, style: element.classList.contains("is-dots") ? "dots" : element.classList.contains("is-wide") ? "wide" : "default", blockAlign: parsedBlockAlignment(element, original) } };
  }
  if (declaredType === "social-icons") {
    if (element.tagName.toLowerCase() !== "nav") return { error: "Social Icons must use a nav element." };
    const children: SocialIconBlock[] = [];
    for (const child of [...element.children]) {
      const icon = child as HTMLElement;
      if (icon.tagName.toLowerCase() !== "a" || icon.children.length) return { error: "Social Icons can contain only LinkedIn or TikTok links." };
      const childId = icon.dataset.blockId || crypto.randomUUID();
      const parsed = parseElement(icon, originals.get(childId) ?? { id: childId, type: "social-linkedin", url: "" }, originals);
      if ("error" in parsed) return parsed;
      if (parsed.block.type !== "social-linkedin" && parsed.block.type !== "social-tiktok") return { error: "Social Icons can contain only LinkedIn or TikTok links." };
      children.push(parsed.block);
    }
    const horizontalGap = element.dataset.socialHorizontalGap === undefined ? undefined : Number(element.dataset.socialHorizontalGap);
    const verticalGap = element.dataset.socialVerticalGap === undefined ? undefined : Number(element.dataset.socialVerticalGap);
    return { block: { ...(original.type === "social-icons" ? { visualStyle: original.visualStyle } : {}), id, type: "social-icons", children, justification: ["left", "centre", "right", "space-between"].includes(element.dataset.socialJustification ?? "") ? element.dataset.socialJustification as Extract<ContentBlock, { type: "social-icons" }>["justification"] : "left", orientation: element.dataset.socialOrientation === "vertical" ? "vertical" : "horizontal", allowWrap: element.dataset.socialWrap !== "false", iconSize: ["small", "normal", "large"].includes(element.dataset.socialSize ?? "") ? element.dataset.socialSize as Extract<ContentBlock, { type: "social-icons" }>["iconSize"] : "normal", socialStyle: ["default", "logos-only", "pill-shape"].includes(element.dataset.socialStyle ?? "") ? element.dataset.socialStyle as Extract<ContentBlock, { type: "social-icons" }>["socialStyle"] : undefined, horizontalGap, verticalGap, blockAlign: parsedSocialIconsAlignment(element, original), showLabels: element.dataset.socialLabels === "true", openInNewTab: element.dataset.socialNewTab === "true" } };
  }
  if (declaredType === "social-linkedin" || declaredType === "social-tiktok") {
    if (element.tagName.toLowerCase() !== "a") return { error: "Social icons must use link elements." };
    return { block: { ...(original.type === declaredType ? { visualStyle: original.visualStyle } : {}), id, type: declaredType, url: element.getAttribute("href") ?? element.dataset.socialUrl ?? "", label: element.textContent || undefined, rel: element.getAttribute("rel") || undefined } };
  }
  if (declaredType === "document-title") {
    const level = Number(element.tagName.slice(1));
    return { block: { id, type: "document-title", align: alignmentFromClass(element) ?? (original.type === "document-title" ? original.align : undefined), blockAlign: parsedBlockAlignment(element, original), level: [1, 2, 3, 4, 5, 6].includes(level) ? level as 1 | 2 | 3 | 4 | 5 | 6 : original.type === "document-title" ? original.level : 2, isLink: element.dataset.metadataLink === "true", linkTarget: element.dataset.linkTarget === "_blank" ? "_blank" : "_self", rel: element.dataset.linkRel || undefined } };
  }
  if (declaredType === "document-subtitle") return { block: { id, type: "document-subtitle", align: alignmentFromClass(element) ?? (original.type === "document-subtitle" ? original.align : undefined) } };
  if (declaredType === "cover-image") {
    const number = (name: string) => { const value = element.getAttribute(name); return value === null || value === "" ? undefined : Number(value); };
    const aspectRatio = element.dataset.aspectRatio;
    return { block: { id, type: "cover-image", align: alignmentFromClass(element) ?? (original.type === "cover-image" ? original.align : undefined), blockAlign: parsedBlockAlignment(element, original), isLink: element.dataset.metadataLink === "true", linkTarget: element.dataset.linkTarget === "_blank" ? "_blank" : "_self", rel: element.dataset.linkRel || undefined, aspectRatio: aspectRatio && ["original", "square", "portrait", "landscape", "wide"].includes(aspectRatio) ? aspectRatio as Extract<ContentBlock, { type: "cover-image" }>["aspectRatio"] : undefined, scale: element.dataset.scale === "contain" ? "contain" : element.dataset.scale === "cover" ? "cover" : undefined, displayWidth: number("data-display-width"), displayHeight: number("data-display-height"), focalX: number("data-focal-x"), focalY: number("data-focal-y") } };
  }
  switch (element.tagName.toLowerCase()) {
    case "p": {
      const link = element.querySelector("a");
      if (link?.classList.contains("content-button")) {
        const width = Number(element.dataset.buttonWidth);
        return { block: { id, type: "button", label: link.textContent ?? "", url: safeTextLink(link.getAttribute("href") ?? "") || "#", style: link.classList.contains("is-secondary") ? "secondary" : "primary", opensInNewTab: link.getAttribute("target") === "_blank" || undefined, align: alignmentFromClass(element), width: [25, 50, 75, 100].includes(width) ? width as 25 | 50 | 75 | 100 : undefined, title: link.getAttribute("title") || undefined, rel: link.getAttribute("rel")?.replace(/(?:^|\s)(?:noopener|noreferrer)(?=\s|$)/g, " ").trim() || undefined } };
      }
      const runs = parseRuns(element);
      return { block: { ...preserveParagraphStyle(original, id), type: "paragraph", text: runs ? plainTextFromRuns(runs) : textContent, runs, align: alignmentFromClass(element) ?? (element.dataset.alignExplicit === "true" ? undefined : original.type === "paragraph" ? original.align : undefined), blockAlign: parsedBlockAlignment(element, original) } };
    }
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      { const runs = parseRuns(element); return { block: { id, type: "heading", level: Number(element.tagName.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6, text: runs ? plainTextFromRuns(runs) : textContent, runs, align: alignmentFromClass(element), blockAlign: parsedBlockAlignment(element, original) } }; }
    case "blockquote":
      { const runs = parseRuns(element); return { block: { id, type: "quote", text: runs ? plainTextFromRuns(runs) : textContent.replace(element.querySelector("cite")?.textContent ?? "", "").trim(), runs, attribution: element.querySelector("cite")?.textContent || undefined, align: alignmentFromClass(element), blockAlign: parsedBlockAlignment(element, original), quoteStyle: element.classList.contains("is-style-plain") ? "plain" : undefined } }; }
    case "ul": case "ol": {
      if ([...element.querySelectorAll("ul, ol")].length) return { error: "Nested lists are not yet supported by this editor." };
      const items = [...element.children].filter((child) => child.tagName.toLowerCase() === "li").map((child) => {
        const runs = parseRuns(child as HTMLElement);
        const text = runs ? plainTextFromRuns(runs) : child.textContent ?? "";
        return runs?.some((run) => run.marks?.length) ? { text, runs } : text;
      });
      const ordered = element.tagName.toLowerCase() === "ol";
      const marker = element.getAttribute("type");
      if (ordered && marker && !["1", "A", "a", "I", "i"].includes(marker)) return { error: "This ordered-list style is not supported." };
      return { block: { id, type: "list", style: ordered ? "ordered" : "unordered", items, marker: ordered && marker && ["1", "A", "a", "I", "i"].includes(marker) ? marker as "1" | "A" | "a" | "I" | "i" : undefined, start: ordered && element.hasAttribute("start") ? (Number(element.getAttribute("start")) || undefined) : undefined, reversed: ordered && element.hasAttribute("reversed") || undefined, blockAlign: parsedBlockAlignment(element, original) } };
    }
    case "table":
      return parseTable(element, id, original);
    case "pre":
      return { block: { id, type: "code", language: element.querySelector("code")?.className.match(/language-([^\s]+)/)?.[1], code: element.querySelector("code")?.textContent ?? element.textContent ?? "", blockAlign: parsedBlockAlignment(element, original) } };
    case "figure": {
      const image = element.querySelector("img");
      if (!image) return { error: "Image blocks must contain an img element." };
      const rawSrc = image.getAttribute("src") ?? "";
      const src = safeImageSource(rawSrc);
      if (!src && !(original.type === "image" && original.mediaId && rawSrc === "")) return { error: "Image blocks must use a safe image URL." };
      const aspectRatio = image.dataset.aspectRatio;
      const scale = image.dataset.scale;
      const destination = element.dataset.linkDestination;
      const numberAttribute = (name: string) => { const value = image.getAttribute(name); return value === null || value === "" ? undefined : Number(value); };
      const link = image.closest("a");
      const linkDestination = destination && ["none", "custom", "media", "lightbox"].includes(destination) ? destination as Extract<ContentBlock, { type: "image" }>["linkDestination"] : link ? "custom" : undefined;
      const parsedAlignment = parsedBlockAlignment(element, original) ?? (element.classList.contains("is-wide") ? "wide" : undefined);
      const next: Extract<ContentBlock, { type: "image" }> = { ...(original.type === "image" ? original : {}), id, type: "image", src: src ?? "", alt: image.dataset.decorative === "true" && original.type === "image" ? original.alt : image.getAttribute("alt") ?? "", decorative: image.dataset.decorative === "true", title: image.getAttribute("title") || undefined, aspectRatio: aspectRatio && ["original", "square", "portrait", "landscape", "wide"].includes(aspectRatio) ? aspectRatio as Extract<ContentBlock, { type: "image" }>["aspectRatio"] : undefined, scale: scale === "cover" || scale === "contain" ? scale : undefined, displayWidth: numberAttribute("data-display-width"), displayHeight: numberAttribute("data-display-height"), focalX: numberAttribute("data-focal-x"), focalY: numberAttribute("data-focal-y"), linkDestination, linkUrl: linkDestination === "custom" && link ? safeTextLink(link.getAttribute("href") ?? "") || undefined : undefined, opensInNewTab: link?.getAttribute("target") === "_blank" || undefined, imageStyle: element.dataset.imageStyle === "rounded" ? "rounded" : undefined, caption: element.querySelector("figcaption")?.textContent || undefined, blockAlign: parsedAlignment, wide: false };
      const originalSrc = original.type === "image" ? safeImageSource(original.src) ?? "" : "";
      if (original.type === "image" && (src ?? "") !== originalSrc) delete next.mediaId;
      return { block: next };
    }
    case "hr": return { block: { id, type: "divider", style: element.classList.contains("is-dots") ? "dots" : element.classList.contains("is-wide") ? "wide" : "default", blockAlign: parsedBlockAlignment(element, original) } };
    case "label": {
      const control = element.querySelector("select") ? "select" : "text";
      const input = element.querySelector("input") as HTMLInputElement | null;
      const select = element.querySelector("select");
      return { block: { id, type: "field", control, label: element.querySelector("span")?.textContent ?? "", value: select?.value ?? input?.value ?? "", options: select ? [...select.options].map((option) => option.textContent ?? "") : undefined } };
    }
    case "section": case "div": case "main": case "article": case "aside": case "header": case "footer": case "nav": {
      if (element.tagName.toLowerCase() === "aside" && declaredType !== "group" && !element.classList.contains("studio-group")) {
        return { block: { id, type: "embed", url: safeTextLink(element.getAttribute("data-embed-url") ?? element.querySelector("a")?.getAttribute("href") ?? "") || "", title: element.querySelector("a")?.textContent ?? element.firstChild?.textContent ?? "", caption: element.querySelector(".embed-caption")?.textContent || undefined, blockAlign: parsedBlockAlignment(element, original) } };
      }
      if (element.dataset.spacerHeight !== undefined || element.classList.contains("studio-spacer")) {
        const height = Number(element.dataset.spacerHeight);
        const width = element.dataset.spacerWidth === undefined ? undefined : Number(element.dataset.spacerWidth);
        return { block: { ...(original.type === "spacer" ? original : {}), id, type: "spacer", height, heightUnit: element.dataset.spacerHeightUnit as Extract<ContentBlock, { type: "spacer" }>["heightUnit"] | undefined, width, widthUnit: element.dataset.spacerWidthUnit as Extract<ContentBlock, { type: "spacer" }>["widthUnit"] | undefined } };
      }
      const type = declaredType === "section" || (!declaredType && element.tagName.toLowerCase() === "section") ? "section" : "group";
      if (element.dataset.columnLayout === "true" || element.classList.contains("studio-columns")) {
        const originalColumns = original.type === "columns" ? original : undefined;
        const columns: ContentBlock[] = [];
        for (const child of [...element.children]) {
          const childElement = child as HTMLElement;
          if (!childElement.classList.contains("studio-column")) return { error: "Columns must contain Column blocks." };
          const childId = childElement.dataset.blockId || crypto.randomUUID();
          const originalChild = originalColumns?.children.find(candidate => candidate.id === childId) ?? originals.get(childId);
          const parsed = parseElement(childElement, originalChild ?? { id: childId, type: "column", children: [] }, originals);
          if ("error" in parsed) return parsed;
          columns.push(parsed.block);
        }
        if (columns.some(column => column.type !== "column")) return { error: "Columns can contain only Column blocks." };
        return { block: { ...(originalColumns ?? {}), id, type: "columns", ...parseLayoutOptions(element), children: columns as Extract<ContentBlock, { type: "column" }>[], style: originalColumns?.style, blockAlign: parsedBlockAlignment(element, original) } };
      }
      if (element.classList.contains("studio-column")) {
        const children: ContentBlock[] = [];
        for (const child of [...element.children]) {
          const childElement = child as HTMLElement;
          const childId = childElement.dataset.blockId || crypto.randomUUID();
          const parsed = parseElement(childElement, originals.get(childId) ?? { id: childId, type: "paragraph", text: "" }, originals);
          if ("error" in parsed) return parsed;
          children.push(parsed.block);
        }
        const width = Number(element.dataset.columnWidth);
        return { block: { ...(original.type === "column" ? original : { id, type: "column" as const, children: [] }), id, type: "column", width: Number.isFinite(width) ? width : undefined, verticalAlign: element.dataset.columnVerticalAlign as Extract<ContentBlock, { type: "column" }> ["verticalAlign"], children } };
      }
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
      const semanticTag = element.tagName.toLowerCase();
      return { block: { ...(original.type === "group" ? original : {}), id, type: "group", layout, ...options, children, blockAlign: parsedBlockAlignment(element, original), tagName: ["div", "main", "section", "article", "aside", "header", "footer", "nav"].includes(semanticTag) ? semanticTag as Extract<ContentBlock, { type: "group" }>["tagName"] : undefined, ariaLabel: element.getAttribute("aria-label") || undefined } };
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

function blockAlignmentFromClass(element: HTMLElement) {
  const className = typeof element.className === "string" ? element.className : element.getAttribute?.("class") ?? "";
  const value = className.match(/(?:^|\s)align(left|center|right|wide|full)(?:\s|$)/)?.[1];
  return value as "left" | "center" | "right" | "wide" | "full" | undefined;
}

function parsedBlockAlignment(element: HTMLElement, original: ContentBlock) {
  return blockAlignmentFromClass(element) ?? (element.dataset.blockAlignExplicit === "true" ? undefined : contentBlockAlignment(original));
}

function parsedSocialIconsAlignment(element: HTMLElement, original: ContentBlock) {
  const alignment = parsedBlockAlignment(element, original);
  return alignment === "left" || alignment === "center" || alignment === "right" ? alignment : undefined;
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
    if (child.tagName === "IMG" && child.dataset.inlineImage === "true") {
      const src = safeImageSource(child.getAttribute("src") ?? "");
      const mediaId = child.dataset.mediaId;
      if (src || mediaId) runs.push({ text: child.dataset.inlineText ?? child.getAttribute("alt") ?? "", marks: [...marks, { type: "inline-image", src: src ?? undefined, mediaId: mediaId || undefined, alt: child.getAttribute("alt") ?? "", width: (child as HTMLImageElement).width || undefined }] });
      return;
    }
    if (child.tagName === "IMG") {
      const src = safeImageSource(child.getAttribute("src") ?? "");
      if (src) runs.push({ text: child.getAttribute("alt") ?? "", marks: [...marks, { type: "inline-image", src, alt: child.getAttribute("alt") ?? "", width: (child as HTMLImageElement).width || undefined }] });
      return;
    }
    if (child.tagName === "MATH") {
      runs.push({ text: child.textContent ?? "", marks: [...marks, { type: "math", mathml: child.outerHTML, alternativeText: child.getAttribute("aria-label") ?? child.textContent ?? "Mathematical expression" }] });
      return;
    }
    if (child.dataset.inlineMath === "true") next.push({ type: "math", latex: child.dataset.mathLatex, mathml: child.dataset.mathml, alternativeText: child.dataset.mathAlt ?? child.textContent ?? "" });
    if (child.dataset.footnoteRef) next.push({ type: "footnote", id: child.dataset.footnoteRef });
    else if (child.tagName === "SUP") {
      const href = child.querySelector<HTMLAnchorElement>("a[href^='#footnote-']")?.getAttribute("href");
      if (href) next.push({ type: "footnote", id: href.slice("#footnote-".length) });
    }
    if (child.tagName === "MARK") next.push({ type: "highlight", textColor: child.style.color || undefined, backgroundColor: child.style.backgroundColor || undefined });
    if (child.lang) next.push({ type: "language", language: child.lang, direction: child.dir === "rtl" ? "rtl" : "ltr" });
    if (["STRONG", "B"].includes(child.tagName)) next.push("bold");
    if (["EM", "I"].includes(child.tagName)) next.push("italic");
    if (["S", "STRIKE", "DEL"].includes(child.tagName)) next.push("strikethrough");
    if (child.tagName === "CODE") next.push("inline-code");
    if (child.tagName === "SUB") next.push("subscript");
    if (child.tagName === "SUP") next.push("superscript");
    if (child.tagName === "KBD") next.push("keyboard");
    if (child.tagName === "A") { const href = safeTextLink(child.getAttribute("href") ?? ""); if (href) next.push({ type: "link", url: href, opensInNewTab: child.getAttribute("target") === "_blank" || undefined }); }
    child.childNodes.forEach((nested) => {
      if (nested instanceof HTMLElement && nested.dataset.footnoteMarker === "true") return;
      visit(nested, next);
    });
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
  const encodedAlignments = element.dataset.columnAlignments;
  const firstRow = (head ?? body ?? foot)?.querySelectorAll("tr")[0];
  const cellAlignments = [...firstRow?.children ?? []].map((cell) => { const value = typeof cell.getAttribute === "function" ? cell.getAttribute("data-align") : null; return value === "center" ? "centre" : value || "left"; });
  const parsedAlignments = encodedAlignments?.split(",") ?? cellAlignments;
  const columnAlignments = parsedAlignments.length === rows[0].length && parsedAlignments.every((alignment) => ["left", "centre", "right"].includes(alignment)) ? parsedAlignments as ("left" | "centre" | "right")[] : original.type === "table" && original.columnAlignments?.length === rows[0].length ? original.columnAlignments : undefined;
  return { block: { id, type: "table", rows, hasHeader: Boolean(head), hasFooter: Boolean(foot), fixedWidth: element.dataset.fixedWidth !== "false", tableStyle: element.classList.contains("is-striped") ? "stripes" : "default", caption: element.querySelector("caption")?.textContent || undefined, columnWidths, rowHeights, columnAlignments, blockAlign: parsedBlockAlignment(element, original) } };
}
