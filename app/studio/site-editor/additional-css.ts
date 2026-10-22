/** Deliberately bounded CSS for the temporary sample, never the Studio document. */
export function validateAdditionalCss(source: string): string | undefined {
  if (source.length > 30000) return "CSS must be 30,000 characters or fewer.";
  // Reject escapes before parsing so escaped resource functions cannot evade validation.
  if (source.includes("\\") || /<\/?style\b/i.test(source)) return "CSS escapes and HTML aren't supported.";
  const plain = source.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@(?!media\b|supports\b|container\b)/i.test(plain)) return "Only @media, @supports, and @container rules are supported.";
  if (/\b(?:url|image-set|src|paint|element)\s*\(/i.test(plain)) return "External resources aren't supported in preview CSS.";
  return undefined;
}

const functions = new Set(["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color", "color-mix", "light-dark", "calc", "min", "max", "clamp", "var", "env", "linear-gradient", "radial-gradient", "conic-gradient", "repeating-linear-gradient", "repeating-radial-gradient", "repeating-conic-gradient", "translate", "translatex", "translatey", "translatez", "translate3d", "scale", "scalex", "scaley", "scale3d", "rotate", "rotatex", "rotatey", "rotatez", "rotate3d", "skew", "skewx", "skewy", "matrix", "matrix3d", "perspective", "blur", "brightness", "contrast", "grayscale", "hue-rotate", "invert", "opacity", "saturate", "sepia", "drop-shadow", "repeat", "minmax", "fit-content", "cubic-bezier", "steps", "counter", "counters", "attr"]);

export function compileAdditionalCss(source: string, createSheet: () => CSSStyleSheet = () => new CSSStyleSheet()): { css: string; error?: string } {
  const error = validateAdditionalCss(source);
  if (error) return { css: "", error };
  if (!source.trim()) return { css: "" };
  try {
    const sheet = createSheet();
    sheet.replaceSync(source);
    const serialise = (rules: CSSRuleList): string => Array.from(rules).map(rule => {
      if (rule.type === 1) {
        const style = rule as CSSStyleRule;
        for (const property of Array.from(style.style)) {
          const value = style.style.getPropertyValue(property);
          for (const match of value.matchAll(/([\w-]+)\s*\(/g)) if (!functions.has(match[1].toLowerCase())) throw new Error("Unsupported CSS function.");
        }
        // Nested rules are serialised through the same checks, rather than trusted as text.
        const nested = style.cssRules?.length ? serialise(style.cssRules) : "";
        return `${style.selectorText} { ${style.style.cssText} ${nested} }`;
      }
      if (rule.type === 4 || rule.type === 12 || rule.constructor.name === "CSSContainerRule") {
        const group = rule as CSSGroupingRule & { conditionText: string; containerName?: string };
        const name = rule.type === 4 ? "media" : rule.type === 12 ? "supports" : "container";
        return `@${name} ${name === "container" && group.containerName ? `${group.containerName} ` : ""}${group.conditionText} { ${serialise(group.cssRules)} }`;
      }
      throw new Error("Unsupported CSS rule.");
    }).join("\n");
    return { css: `@scope ([data-site-custom-css-root]) { ${serialise(sheet.cssRules)} }` };
  } catch {
    return { css: "", error: "This CSS contains an unsupported rule or value." };
  }
}

/** Portable compilation for saved local sites; scope and resource policy match browser previews. */
export function compileSavedWebsiteCss(source: string): { css: string; error?: string } {
  const error = validateAdditionalCss(source);
  if (error) return { css: '', error };
  const plain = source.replace(/\/\*[\s\S]*?\*\//g, '');
  let braces = 0, parentheses = 0, quote = '';
  for (const character of plain) {
    if (quote) { if (character === quote) quote = ''; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '{') braces++;
    if (character === '}' && --braces < 0) return { css: '', error: 'This CSS contains an unmatched closing brace.' };
    if (character === '(') parentheses++;
    if (character === ')' && --parentheses < 0) return { css: '', error: 'This CSS contains an unmatched parenthesis.' };
  }
  if (quote || braces || parentheses) return { css: '', error: 'Complete the CSS rule before saving.' };
  // Pseudo selectors are allowed; functions in declarations use the same allow-list.
  const declarations = plain.replace(/[^{}]*\{/g, '{');
  for (const match of declarations.matchAll(/([\w-]+)\s*\(/g)) if (!functions.has(match[1].toLowerCase())) return { css: '', error: 'This CSS contains an unsupported function.' };
  return { css: source.trim() ? `@scope ([data-site-custom-css-root]) { ${source} }` : '' };
}
