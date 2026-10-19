import type { ContentBlock, HeadingLevel, RichTextRun } from "../../content/model";

/** One fixture supplies both the local preview and the manually pasted WordPress sample. */
export const comparisonHomeBlocks: ContentBlock[] = [
  { id: "comparison-h1", type: "heading", level: 1, text: "A place for good ideas" },
  { id: "comparison-intro", type: "paragraph", text: "Every story starts with a little curiosity. This page brings words, images, and useful details together in one place." },
  { id: "comparison-formatting", type: "paragraph", text: "Make a bold statement, pause for an italic thought, or follow a link to explore further.", runs: [{ text: "Make a " }, { text: "bold statement", marks: ["bold"] }, { text: ", pause for an " }, { text: "italic thought", marks: ["italic"] }, { text: ", or " }, { text: "follow a link", marks: [{ type: "link", url: "#comparison-details" }] }, { text: " to explore further." }] },
  ...([2, 3, 4, 5, 6] as HeadingLevel[]).map((level, index): ContentBlock => ({ id: `comparison-h${level}`, type: "heading", level, text: ["Stories worth sharing", "A fresh perspective", "The details matter", "Something to remember", "Keep exploring"][index] })),
  { id: "comparison-detail", type: "paragraph", text: "A clear beginning helps readers find their way. Short passages and thoughtful spacing give each idea enough room to be understood." },
  { id: "comparison-unordered", type: "list", style: "unordered", items: ["Notice the small details.", "Consider another point of view.", "Make room for something unexpected."] },
  { id: "comparison-ordered", type: "list", style: "ordered", items: ["Choose an idea.", "Give it a clear shape.", "Share what you have made."] },
  { id: "comparison-quote", type: "quote", text: "The best ideas leave room for a new perspective.", attribution: "A sample quotation" },
  { id: "comparison-image", type: "image", src: "/specimens/landscape.png", alt: "Illustrated green hills beneath a blue sky and yellow sun", caption: "An open landscape, with room to explore.", aspectRatio: "original" },
  { id: "comparison-buttons", type: "buttons", horizontalGap: 16, verticalGap: 12, children: [{ id: "comparison-button-primary", type: "button", label: "Explore the story", url: "#comparison-details", style: "primary" }, { id: "comparison-button-outline", type: "button", label: "Find out more", url: "#comparison-details", style: "secondary" }] },
  { id: "comparison-separator", type: "divider", style: "wide" },
  { id: "comparison-table", type: "table", hasHeader: true, rows: [["Part", "Purpose", "Example"], ["Beginning", "Introduce the idea", "A little curiosity"], ["Middle", "Explore the details", "A fresh perspective"], ["End", "Leave a clear thought", "Something to remember"]], caption: "Three parts of a simple story." },
  { id: "comparison-code", type: "code", language: "text", code: "const idea = 'A fresh perspective';\nconsole.log(idea);" },
  { id: "comparison-ending", type: "paragraph", text: "There is always another story to discover." },
];

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function richText(text: string, runs?: RichTextRun[]) {
  return runs ? runs.map(run => (run.marks ?? []).reduce((html, mark) => mark === "bold" ? `<strong>${html}</strong>` : mark === "italic" ? `<em>${html}</em>` : typeof mark === "object" && mark.type === "link" ? `<a href="${escapeHtml(mark.url)}">${html}</a>` : html, escapeHtml(run.text))).join("") : escapeHtml(text);
}
function wpBlock(name: string, html: string, attributes?: Record<string, unknown>) {
  return `<!-- wp:${name}${attributes ? ` ${JSON.stringify(attributes)}` : ""} -->\n${html}\n<!-- /wp:${name} -->`;
}

/** Export only: no WordPress connection, credentials, or persistence. */
export function comparisonHomeWordPressMarkup(imageUrl: string): string {
  return comparisonHomeBlocks.map(block => {
    switch (block.type) {
      case "heading": return wpBlock("heading", `<h${block.level} class="wp-block-heading"${block.level === 1 ? ' id="comparison-details"' : ""}>${richText(block.text, block.runs)}</h${block.level}>`, { level: block.level, ...(block.level === 1 ? { anchor: "comparison-details" } : {}) });
      case "paragraph": return wpBlock("paragraph", `<p>${richText(block.text, block.runs)}</p>`);
      case "list": { const tag = block.style === "ordered" ? "ol" : "ul"; return wpBlock("list", `<${tag} class="wp-block-list">${block.items.map(item => wpBlock("list-item", `<li>${escapeHtml(typeof item === "string" ? item : item.text)}</li>`)).join("")}</${tag}>`, block.style === "ordered" ? { ordered: true } : undefined); }
      case "quote": return wpBlock("quote", `<blockquote class="wp-block-quote">${wpBlock("paragraph", `<p>${escapeHtml(block.text)}</p>`)}<cite>${escapeHtml(block.attribution ?? "")}</cite></blockquote>`);
      case "image": return wpBlock("image", `<figure class="wp-block-image size-full"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(block.alt)}"/><figcaption class="wp-element-caption">${escapeHtml(block.caption ?? "")}</figcaption></figure>`, { sizeSlug: "full", linkDestination: "none" });
      case "buttons": return wpBlock("buttons", `<div class="wp-block-buttons">${block.children.map(button => wpBlock("button", `<div class="wp-block-button${button.style === "secondary" ? " is-style-outline" : ""}"><a class="wp-block-button__link wp-element-button" href="${escapeHtml(button.url)}">${escapeHtml(button.label)}</a></div>`, button.style === "secondary" ? { className: "is-style-outline" } : undefined)).join("")}</div>`);
      case "divider": return wpBlock("separator", '<hr class="wp-block-separator has-alpha-channel-opacity is-style-wide"/>', { className: "is-style-wide" });
      case "table": return wpBlock("table", `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr>${block.rows[0].map(cell => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows.slice(1).map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table><figcaption class="wp-element-caption">${escapeHtml(block.caption ?? "")}</figcaption></figure>`);
      case "code": return wpBlock("code", `<pre class="wp-block-code"><code>${escapeHtml(block.code)}</code></pre>`);
      default: throw new Error(`Unsupported comparison block: ${block.type}`);
    }
  }).join("\n\n");
}
