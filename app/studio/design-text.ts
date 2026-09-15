export type DesignTextLine = {
  text: string;
  y: number;
};

export type DesignTextLayoutOptions = {
  text: string;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: number;
  measure?: (text: string) => number;
};

const DEFAULT_LINE_HEIGHT = 1.2;

function splitWords(value: string) {
  return value.match(/\S+\s*/g) ?? [];
}

function splitLongWord(word: string, width: number, measure: (text: string) => number) {
  const fragments: string[] = [];
  let fragment = "";
  for (const character of word.trimEnd()) {
    if (fragment && measure(fragment + character) > width) {
      fragments.push(fragment);
      fragment = character;
    } else fragment += character;
  }
  if (fragment) fragments.push(fragment);
  return fragments;
}

function wrapParagraph(paragraph: string, width: number, measure: (text: string) => number) {
  if (!paragraph) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of splitWords(paragraph)) {
    const candidate = line + word;
    if (measure(candidate.trimEnd()) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line.trimEnd());
    if (measure(word.trimEnd()) <= width) {
      line = word;
      continue;
    }
    const fragments = splitLongWord(word, width, measure);
    if (fragments.length) {
      lines.push(...fragments.slice(0, -1));
      line = fragments.at(-1)!;
    }
  }
  lines.push(line.trimEnd());
  return lines;
}

export function layoutDesignText({ text, width, height, fontSize, lineHeight = DEFAULT_LINE_HEIGHT, measure }: DesignTextLayoutOptions): DesignTextLine[] {
  const safeWidth = Math.max(1, width);
  const lineHeightPx = Math.max(1, fontSize * lineHeight);
  const maxLines = Math.max(1, Math.floor(Math.max(1, height) / lineHeightPx));
  const measureText = measure ?? ((value: string) => value.length * fontSize * .6);
  const lines = text.split("\n").flatMap((paragraph) => wrapParagraph(paragraph, safeWidth, measureText));
  return lines.slice(0, maxLines).map((line, index) => ({ text: line, y: fontSize + index * lineHeightPx }));
}

export function createDesignTextMeasurer(fontFamily: string, fontSize: number, fontWeight: number) {
  if (typeof document === "undefined") return (value: string) => value.length * fontSize * .6;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return (value: string) => value.length * fontSize * .6;
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return (value: string) => context.measureText(value).width;
}
