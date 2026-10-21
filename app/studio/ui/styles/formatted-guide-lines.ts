type LineReference = { line: number };

type FormattedGuideBlock =
  | { type: "blank" | "heading" | "rule"; line: number }
  | { type: "paragraph" | "quote"; line: number; lines: LineReference[] }
  | { type: "list"; line: number; items: (LineReference & { continuations: LineReference[] })[] }
  | { type: "table"; line: number; separatorLine: number | null; rows: LineReference[] };

export function unrepresentedFormattedGuideLines(blocks: FormattedGuideBlock[], lineCount: number): number[] {
  const represented = new Set<number>();
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "quote") {
      for (const line of block.lines) represented.add(line.line);
    } else if (block.type === "list") {
      for (const item of block.items) {
        represented.add(item.line);
        for (const line of item.continuations) represented.add(line.line);
      }
    } else if (block.type === "table") {
      represented.add(block.line);
      if (block.separatorLine !== null) represented.add(block.separatorLine);
      for (const row of block.rows) represented.add(row.line);
    } else represented.add(block.line);
  }
  return Array.from({ length: lineCount }, (_, index) => index + 1).filter(line => !represented.has(line));
}
