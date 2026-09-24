const MATHML_ELEMENTS = new Set(["math", "mrow", "mi", "mn", "mo", "msup", "msub", "msubsup", "mfrac", "msqrt", "mroot", "mtext", "mstyle", "mover", "munder", "munderover", "mfenced", "mtable", "mtr", "mtd", "mspace", "semantics", "annotation"]);
const MATHML_ATTRIBUTES = new Set(["display", "mathvariant", "stretchy", "fence", "separator", "linethickness", "notation", "accent", "accentunder", "width", "height", "depth", "lspace", "rspace", "rowalign", "columnalign", "encoding"]);

const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttribute = (value: string) => escapeText(value).replace(/"/g, "&quot;");

/** Validate and serialise a deliberately small MathML subset without allowing HTML or event attributes. */
export function safeMathMLMarkup(source: string): string | null {
  if (source.length > 12_000 || /<!|<\?|&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/i.test(source)) return null;
  const tokens = source.match(/<[^>]*>|[^<]+/g);
  if (!tokens?.length) return null;
  const stack: string[] = [];
  let rootSeen = false;
  let output = "";
  for (const token of tokens) {
    if (!token.startsWith("<")) { output += escapeText(token.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => decodeEntity(entity))); continue; }
    const tag = token.match(/^<\s*(\/?)\s*([A-Za-z]+)([\s\S]*?)>$/);
    if (!tag) return null;
    const [, closing, rawName, rawAttributes] = tag;
    const name = rawName.toLowerCase();
    if (!MATHML_ELEMENTS.has(name)) return null;
    if (closing) {
      if (rawAttributes.trim() || stack.pop() !== name) return null;
      output += `</${name}>`;
      continue;
    }
    if (!stack.length) {
      if (rootSeen || name !== "math") return null;
      rootSeen = true;
    }
    let attributes = "";
    const selfClosing = /\/\s*$/.test(rawAttributes);
    let rest = rawAttributes.trim().replace(/\/$/, "").trim();
    while (rest) {
      const match = rest.match(/^([A-Za-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)')\s*/);
      if (!match) return null;
      const [, rawAttribute, doubleQuoted, singleQuoted] = match;
      const attribute = rawAttribute.toLowerCase();
      const value = doubleQuoted ?? singleQuoted ?? "";
      if (!MATHML_ATTRIBUTES.has(attribute) || !/^[\w .,+\-#%]*$/.test(value)) return null;
      attributes += ` ${attribute}="${escapeAttribute(value)}"`;
      rest = rest.slice(match[0].length);
    }
    output += `<${name}${attributes}${selfClosing ? "/" : ""}>`;
    if (!selfClosing) stack.push(name);
  }
  return rootSeen && stack.length === 0 ? output : null;
}

function decodeEntity(entity: string) {
  if (entity === "&amp;") return "&";
  if (entity === "&lt;") return "<";
  if (entity === "&gt;") return ">";
  if (entity === "&quot;") return "\"";
  if (entity === "&apos;") return "'";
  const code = entity.startsWith("&#x") ? Number.parseInt(entity.slice(3, -1), 16) : Number.parseInt(entity.slice(2, -1), 10);
  return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "�";
}
