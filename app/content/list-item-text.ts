import type { ListItem, RichTextRun } from "./model";

/** Canvas typing and toolbar formatting share the item's content/style owner. */
export function listItemWithTextRuns(item: ListItem, text: string, runs: RichTextRun[]): ListItem {
  const source: Partial<Exclude<ListItem, string>> = typeof item === "string" ? {} : item;
  const formattedRuns = runs.some(run => run.inline || run.marks?.length) ? runs : undefined;
  return formattedRuns?.length || source.children?.length || source.style
    ? { ...source, text, runs: formattedRuns }
    : text;
}
