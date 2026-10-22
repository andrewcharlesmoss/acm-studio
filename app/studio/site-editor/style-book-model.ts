import { previewBlockTargets, type PreviewBlockId } from "./blocks-preview-model";
import { previewColourVariables, previewRoleBackground } from "./colours-preview-model";
import type { CSSProperties } from "react";
import type { ContentBlock, HeadingLevel } from "../../content/model";
import { previewStyleDetails, type StyleSelection } from "./styles-preview-state";
import { availableTypographyFamily, referenceFonts, resolvedTypographyFields, typographyFieldsCss, typographyRoles, type TypographyRole } from "./typography-preview-model";

export type StyleBookContext = { block: PreviewBlockId | null; variation?: string } | "colours" | "overview" | "typography" | TypographyRole;
export type StyleBookExample = {
  id: string;
  label: string;
  role?: TypographyRole;
  presentation?: "details" | "preformatted" | "poetry";
  blocks?: ContentBlock[];
};

const paragraph = "In a village of La Mancha, the name of which I have no desire to call to mind, there lived not long since one of those gentlemen that keep a lance in the lance-rack, an old buckler, a lean hack, and a greyhound for coursing.";
const examples: StyleBookExample[] = [
  { id: "colours", label: "Colours" },
  { id: "typography", label: "Typography", blocks: [
    { id: "style-book-typography-paragraph-one", type: "paragraph", text: "A paragraph in a website refers to a distinct block of text that is used to present and organise information. It is a fundamental unit of content in web design and is typically composed of a group of related sentences or thoughts focused on a particular topic or idea. Paragraphs play a crucial role in improving the readability and user experience of a website. They break down the text into smaller, manageable chunks, allowing readers to scan the content more easily." },
    { id: "style-book-typography-paragraph-two", type: "paragraph", text: "Additionally, paragraphs help structure the flow of information and provide logical breaks between different concepts or pieces of information. In terms of formatting, paragraphs in websites are commonly denoted by a vertical gap or indentation between each block of text. This visual separation helps visually distinguish one paragraph from another, creating a clear and organised layout that guides the reader through the content smoothly." },
  ] },
  { id: "headings", label: "Headings", role: "headings", blocks: ([1, 2, 3, 4, 5, 6] as HeadingLevel[]).map(level => ({ id: `style-book-h${level}`, type: "heading", level, text: `Heading ${level}` })) },
  { id: "paragraph", label: "Paragraph", role: "text", blocks: [{ id: "style-book-paragraph", type: "paragraph", text: paragraph }] },
  { id: "links", label: "Links", role: "links", blocks: [{ id: "style-book-link", type: "paragraph", text: "Discover something new, or explore another perspective.", runs: [{ text: "Discover something new", marks: [{ type: "link", url: "#style-book-example" }] }, { text: ", or explore another perspective." }] }] },
  { id: "list", label: "List", role: "text", blocks: [{ id: "style-book-list", type: "list", style: "unordered", items: ["Alice.", "The White Rabbit.", "The Cheshire Cat.", "The Mad Hatter.", "The Queen of Hearts."] }] },
  { id: "quote", label: "Quote", role: "text", blocks: [{ id: "style-book-quote", type: "quote", text: "In quoting others, we cite ourselves.", attribution: "Julio Cortázar" }] },
  { id: "code", label: "Code", role: "text", blocks: [{ id: "style-book-code", type: "code", language: "text", code: "// A “block” is the abstract term used\n// to describe units of markup that\n// when composed together, form the\n// content or layout of a page.\nregisterBlockType( name, settings );" }] },
  { id: "details", label: "Details", presentation: "details", blocks: [{ id: "style-book-details", type: "paragraph", text: paragraph }] },
  { id: "math", label: "Math", blocks: [{ id: "style-book-math", type: "paragraph", text: "\uFFFC", runs: [{ text: "\uFFFC", inline: { type: "math", latex: "\\displaystyle x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", alternativeText: "The quadratic formula" } }] }] },
  { id: "preformatted", label: "Preformatted", presentation: "preformatted", blocks: [{ id: "style-book-preformatted", type: "code", code: "EXT. XANADU - FAINT DAWN - 1940 (MINIATURE)\nWindow, very small in the distance, illuminated.\nAll around this is an almost totally black screen. Now, as the camera moves slowly towards the window, which is almost a postage stamp in the frame, other forms appear;" }] },
  { id: "table", label: "Table", role: "text", blocks: [{ id: "style-book-table", type: "table", hasHeader: true, rows: [["Version", "Jazz Musician", "Release Date"], ["5.2", "Jaco Pastorius", "7 May 2019"], ["5.1", "Betty Carter", "21 February 2019"], ["5.0", "Bebo Valdés", "6 December 2018"]] }] },
  { id: "poetry", label: "Poetry", presentation: "poetry", blocks: [{ id: "style-book-poetry", type: "code", code: "WHAT was he doing, the great god Pan,\n\tDown in the reeds by the river?\nSpreading ruin and scattering ban,\nSplashing and paddling with hooves of a goat,\nAnd breaking the golden lilies afloat\n    With the dragonfly on the river." }] },
  { id: "custom-link", label: "Custom Link", blocks: [{ id: "style-book-custom-link", type: "paragraph", text: "Example Link", runs: [{ text: "Example Link", marks: [{ type: "link", url: "#style-book-example" }] }] }] },
  { id: "content", label: "Content", blocks: ["This is the Content block, it will display all the blocks in any single post or page.", "That might be a simple arrangement like consecutive paragraphs in a blog post, or a more elaborate composition that includes image galleries, videos, tables, columns, and any other block types.", "If there are any Custom Post Types registered at your site, the Content block can display the contents of those entries as well."].map((text, index) => ({ id: `style-book-content-${index}`, type: "paragraph", text })) },
  { id: "home-link", label: "Home Link", blocks: [{ id: "style-book-home-link", type: "paragraph", text: "Home Link", runs: [{ text: "Home Link", marks: [{ type: "link", url: "#style-book-example" }] }] }] },
  { id: "image", label: "Image", role: "captions", blocks: [{ id: "style-book-image", type: "image", src: "/specimens/mont-blanc.jpg", alt: "Snow-covered Mont Blanc rising above the clouds", caption: "Mont Blanc appears — still, snowy, and serene.", aspectRatio: "landscape", scale: "cover" }] },
  { id: "separator", label: "Separator", blocks: [{ id: "style-book-separator", type: "divider", style: "wide" }] },
  { id: "buttons", label: "Buttons", role: "buttons", blocks: [{ id: "style-book-buttons", type: "buttons", justification: "centre", allowWrap: true, horizontalGap: 16, verticalGap: 16, children: [{ id: "style-book-button-fill", type: "button", label: "Find out more", url: "#style-book-example", style: "primary" }, { id: "style-book-button-contact", type: "button", label: "Contact us", url: "#style-book-example", style: "primary" }] }] },
  { id: "pullquote", label: "Pullquote", role: "text", blocks: [{ id: "style-book-pullquote", type: "quote", quoteStyle: "plain", align: "centre", text: "One of the hardest things to do in technology is disrupt yourself.", attribution: "Matt Mullenweg" }] },
  { id: "search", label: "Search", blocks: [{ id: "style-book-search-button", type: "button", label: "Search", url: "#style-book-example", style: "primary" }] },
];

/** Navigation filters examples, never authored styles or history. */
export function styleBookExamples(context: StyleBookContext): StyleBookExample[] {
  if (typeof context === "object") {
    const ids = new Set(previewBlockTargets.filter(item => !context.block || item.id === context.block).map(item => item.example));
    return examples.filter(example => ids.has(example.id as typeof previewBlockTargets[number]["example"]));
  }
  const ids = context === "colours" ? ["colours"] : context === "overview" ? ["colours", "typography", "image", "separator", "buttons", "pullquote", "search"]
    : context === "typography" ? ["headings", "paragraph", "list", "quote", "code", "details", "math", "preformatted", "pullquote", "table", "poetry", "custom-link", "content", "home-link"]
    : context === "text" ? ["paragraph", "list", "quote", "code", "table"]
    : context === "links" ? ["links"] : context === "buttons" ? ["buttons"] : context === "captions" ? ["image"] : ["headings"];
  return ids.map(id => examples.find(example => example.id === id)!).map(example => /^h[1-6]$/.test(context) && example.id === "headings"
    ? { ...example, role: context as TypographyRole, blocks: example.blocks?.filter(block => block.type === "heading" && `h${block.level}` === context) }
    : example);
}

/** Text alternatives stay readable while specimen links and buttons remain inert. */
export function styleBookExampleText(example: StyleBookExample): string {
  if (example.id === "search") return "Search field with placeholder Optional placeholder… and a Search button.";
  if (example.id === "math") return "Quadratic formula: x equals negative b plus or minus the square root of b squared minus four a c, divided by two a.";
  return (example.blocks ?? []).flatMap(block => {
    if ("text" in block) return [block.text, ...(block.type === "quote" && block.attribution ? [block.attribution] : [])];
    if (block.type === "image") return [block.alt, block.caption ?? ""];
    if (block.type === "list") return block.items.map(item => typeof item === "string" ? item : item.text);
    if (block.type === "table") return [...block.rows.flat(), block.caption ?? ""];
    if (block.type === "code") return [block.code];
    if (block.type === "buttons") return block.children.map(button => button.label);
    if (block.type === "button") return [block.label];
    return [];
  }).filter(Boolean).join(" ");
}

/** Scoped variables adapt the canonical renderer to the same effective role styles as the page preview. */
export function styleBookPresentation(selection: StyleSelection): CSSProperties {
  const { palette, typography } = previewStyleDetails(selection);
  const settings = selection.typography ?? {};
  const result: Record<string, string | number> = { ...previewColourVariables(palette, selection.colours) as Record<string, string>, "--book-surface": palette.colours[0], "--book-text": palette.text, "--book-button-background": palette.buttonBackground, "--book-outline-text": resolvedTypographyFields(typography, settings, "buttons").colour ?? palette.text };
  result["--book-preformatted-font-family"] = availableTypographyFamily(referenceFonts.find(font => font.name === "Fira Code")!.family, settings)!;
  for (const role of typographyRoles) {
    const fields = resolvedTypographyFields(typography, settings, role);
    const css = typographyFieldsCss(fields, settings);
    css.color ??= role === "buttons" ? palette.buttonText : role === "headings" || /^h[1-6]$/.test(role) ? palette.heading : palette.text;
    for (const [property, value] of Object.entries(css)) {
      if (value !== undefined) result[`--book-${role}-${property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`] = value;
    }
  }
  for (const role of typographyRoles) {
    const background = previewRoleBackground(selection.colours ?? {}, role);
    if (background) result[`--book-${role}-background`] = background;
  }
  const hover = selection.colours?.elements?.links?.hover;
  if (hover) result["--book-links-hover"] = hover;
  return result as CSSProperties;
}
