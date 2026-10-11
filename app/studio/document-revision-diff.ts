import type { StudioDocument } from "./editor-model";
import { revisionContent, type DocumentRevision } from "./document-revisions";
import { blocksToHtml, formatHtml } from "./studio-html-editor";

type Change = { kind: "same" | "removed" | "added"; text: string };
export type RevisionDiffRow = { before?: string; after?: string; changed: boolean };

/** Distinct editorial versions, oldest first; confirmed copies win over recovery candidates. */
export function revisionTimeline(items: DocumentRevision[]): DocumentRevision[] {
  const seen = new Set<string>();
  return [...items].sort((a, b) => Number(b.confirmed !== false) - Number(a.confirmed !== false) || Date.parse(b.savedAt) - Date.parse(a.savedAt))
    .filter(item => {
      const key = JSON.stringify(revisionContent(item.document));
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a, b) => Date.parse(a.savedAt) - Date.parse(b.savedAt));
}

/** Bounded LCS: large changed regions remain complete, without quadratic work. */
function changes(before: string[], after: string[], budget: number): Change[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  const left = before.slice(start, before.length - end);
  const right = after.slice(start, after.length - end);
  const result: Change[] = before.slice(0, start).map(text => ({ kind: "same", text }));
  if (left.length * right.length > budget) {
    for (const text of left) result.push({ kind: "removed", text });
    for (const text of right) result.push({ kind: "added", text });
  } else {
    const width = right.length + 1;
    const lengths = new Uint32Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--) {
      for (let j = right.length - 1; j >= 0; j--) {
        lengths[i * width + j] = left[i] === right[j] ? 1 + lengths[(i + 1) * width + j + 1] : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
      }
    }
    let i = 0, j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) { result.push({ kind: "same", text: left[i++] }); j++; }
      else if (i < left.length && (j === right.length || lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])) result.push({ kind: "removed", text: left[i++] });
      else result.push({ kind: "added", text: right[j++] });
    }
  }
  for (const text of before.slice(before.length - end)) result.push({ kind: "same", text });
  return result;
}

export function revisionDiffRows(before: string, after: string): RevisionDiffRow[] {
  const result: RevisionDiffRow[] = [];
  let removed: string[] = [], added: string[] = [];
  function flush() {
    for (let i = 0; i < Math.max(removed.length, added.length); i++) result.push({ before: removed[i], after: added[i], changed: true });
    removed = []; added = [];
  }
  for (const change of changes(before ? before.split("\n") : [], after ? after.split("\n") : [], 500000)) {
    if (change.kind === "same") { flush(); result.push({ before: change.text, after: change.text, changed: false }); }
    else if (change.kind === "removed") removed.push(change.text);
    else added.push(change.text);
  }
  flush(); return result;
}

export function revisionWordChanges(before: string, after: string) {
  if (before.length + after.length > 10000) return [{ kind: "removed" as const, text: before }, { kind: "added" as const, text: after }];
  return changes(before.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [], after.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [], 20000);
}

const serialise = (value: unknown) => typeof value === "string" ? value : value === undefined ? "" : JSON.stringify(value, null, 2);
export function revisionDiffSections(before: StudioDocument | undefined, after: StudioDocument) {
  const html = (document: StudioDocument | undefined) => document ? formatHtml(blocksToHtml(document.blocks)) : "";
  const contentBefore = html(before), contentAfter = html(after);
  const sections = [
    { label: "Title", before: before?.title ?? "", after: after.title },
    { label: "Content", before: contentBefore, after: contentAfter },
  ];
  const extra = [
    ["subtitle", "Subtitle"], ["excerpt", "Excerpt"], ["slug", "Slug"], ["author", "Author"], ["tags", "Tags"],
    ["seoTitle", "SEO title"], ["seoDescription", "SEO description"], ["coverImage", "Featured image"],
    ["displayOverrides", "Display settings"], ["metadataBlocksVersion", "Metadata version"], ["documentShellVersion", "Document shell version"],
  ] as const;
  for (const [field, label] of extra) {
    const left = serialise(before?.[field]), right = serialise(after[field]);
    if (left !== right) sections.push({ label, before: left, after: right });
  }
  // The editor's HTML inspection format does not expose every typed block setting.
  // Retain the complete canonical block comparison so invisible settings cannot be hidden.
  if (JSON.stringify(before?.blocks ?? []) !== JSON.stringify(after.blocks)) sections.push({ label: "Block data", before: serialise(before?.blocks ?? []), after: serialise(after.blocks) });
  return sections;
}
