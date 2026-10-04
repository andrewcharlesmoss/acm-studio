import { safeImageSource } from "../content/rich-text";

/** DOM points and typed offsets share the editor parser's logical projection. */
export type RichTextDomPoint = { node: Node; offset: number };

function elementOf(node: Node): HTMLElement | null {
  return node.nodeType === 1 ? node as HTMLElement : null;
}

function protectedLength(node: Node): number | null {
  const element = elementOf(node);
  if (!element) return null;
  if (element.dataset.footnoteMarker === "true") return 0;
  // Legacy inline images retain their source text as the logical projection.
  if (element.dataset.inlineImage === "true") return element.dataset.mediaId || safeImageSource(element.dataset.imageSrc ?? "") ? (element.dataset.inlineText ?? "").length : 0;
  return null;
}

export function richTextNodeLength(node: Node): number {
  if (node.nodeType === 3) return node.nodeValue?.length ?? 0;
  const protectedSize = protectedLength(node);
  if (protectedSize !== null) return protectedSize;
  const element = elementOf(node);
  if (!element) return 0;
  if (element.tagName === "BR") return 1;
  const children = Array.from(node.childNodes).reduce((length, child) => length + richTextNodeLength(child), 0);
  return children + (element.tagName === "DIV" || element.tagName === "P" ? 1 : 0);
}

function lastCharacter(node: Node): string {
  if (node.nodeType === 3) return (node.nodeValue ?? "").slice(-1);
  const element = elementOf(node);
  if (!element) return "";
  const protectedSize = protectedLength(node);
  if (protectedSize !== null) return protectedSize ? (element.dataset.inlineText ?? "").slice(-1) : "";
  if (["BR", "P", "DIV"].includes(element.tagName)) return "\n";
  for (const child of Array.from(node.childNodes).reverse()) {
    const last = lastCharacter(child);
    if (last) return last;
  }
  return "";
}

/** The root contributes no separator; editorToRuns removes one final newline. */
export function richTextDomLength(root: HTMLElement): number {
  const children = Array.from(root.childNodes);
  const length = children.reduce((total, child) => total + richTextNodeLength(child), 0);
  const last = children.map(lastCharacter).reverse().find(Boolean);
  return length - Number(last === "\n");
}

export function richTextOffset(root: HTMLElement, container: Node, offset: number): number | null {
  if (!Number.isInteger(offset) || offset < 0 || !root.contains(container)) return null;
  function countBefore(node: Node): number | null {
    if (node !== root && protectedLength(node) !== null) {
      // Browsers can report a point inside a non-editable decoration. Keep it
      // at the object's boundary rather than counting its rendered descendants.
      if (node === container || node.contains(container)) return offset === 0 ? 0 : protectedLength(node);
      return null;
    }
    if (node === container) {
      if (node.nodeType === 3) return Math.min(offset, node.nodeValue?.length ?? 0);
      return Array.from(node.childNodes).slice(0, Math.min(offset, node.childNodes.length)).reduce((length, child) => length + richTextNodeLength(child), 0);
    }
    let before = 0;
    for (const child of Array.from(node.childNodes)) {
      if (child === container || child.contains(container)) {
        const nested = countBefore(child);
        return nested === null ? null : before + nested;
      }
      before += richTextNodeLength(child);
    }
    return null;
  }
  const result = countBefore(root);
  return result === null ? null : Math.min(result, richTextDomLength(root));
}

function boundaryPoint(node: Node, after = false): RichTextDomPoint | null {
  const parent = node.parentNode;
  if (!parent) return null;
  const index = Array.prototype.indexOf.call(parent.childNodes, node) as number;
  return { node: parent, offset: index + Number(after) };
}

/**
 * Range starts and carets favour the editable point after a decoration; range
 * ends favour the point before it. Both represent the same logical offset.
 */
export function richTextPointAtOffset(root: HTMLElement, requestedOffset: number, affinity: "forward" | "backward" = "forward"): RichTextDomPoint {
  const target = Number.isFinite(requestedOffset) ? Math.min(richTextDomLength(root), Math.max(0, Math.trunc(requestedOffset))) : 0;
  let cursor = 0;
  let fallback: RichTextDomPoint | null = null;
  function findPoint(node: Node): RichTextDomPoint | null {
    if (node.nodeType === 3) {
      const length = node.nodeValue?.length ?? 0;
      if (target < cursor + length || target === cursor + length && affinity === "backward") return { node, offset: target - cursor };
      cursor += length;
      if (target === cursor) fallback = { node, offset: length };
      return null;
    }
    const element = elementOf(node);
    if (!element) return null;
    const protectedSize = protectedLength(node);
    if (protectedSize !== null || element.tagName === "BR") {
      const length = protectedSize ?? 1;
      if (length === 0 && target === cursor && affinity === "forward") {
        fallback = boundaryPoint(node, true);
        return null;
      }
      if (target <= cursor) return boundaryPoint(node);
      cursor += length;
      if (target < cursor || target === cursor && affinity === "backward") return boundaryPoint(node, true);
      if (target === cursor) fallback = boundaryPoint(node, true);
      return null;
    }
    if (!node.childNodes.length && target === cursor) {
      if (affinity === "backward" || ["P", "DIV"].includes(element.tagName)) return { node, offset: 0 };
      fallback = { node, offset: 0 };
    }
    for (const child of Array.from(node.childNodes)) {
      const point = findPoint(child);
      if (point) return point;
    }
    if (node !== root && (element.tagName === "DIV" || element.tagName === "P")) {
      if (target === cursor) return { node, offset: node.childNodes.length };
      cursor += 1;
      if (target === cursor && affinity === "backward") return boundaryPoint(node, true);
      if (target === cursor) fallback = boundaryPoint(node, true);
    }
    return null;
  }
  return findPoint(root) ?? fallback ?? { node: root, offset: root.childNodes.length };
}
