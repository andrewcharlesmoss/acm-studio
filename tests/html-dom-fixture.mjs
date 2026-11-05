// Minimal DOM for supported HTML round-trip fixtures. Native browser evidence
// remains required for browser parsing, focus and editor interaction.
export function withHtmlDom(callback) {
  const previousParser = globalThis.DOMParser;
  const previousNode = globalThis.Node;
  const previousHTMLElement = globalThis.HTMLElement;
  const decode = value => value.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const elements = [];
  class MinimalHTMLElement {}
  function makeElement(tagName, attributes = {}, parent) {
    const element = Object.assign(new MinimalHTMLElement(), {
      nodeType: 1, tagName: tagName.toUpperCase(), className: attributes.class ?? "", lang: attributes.lang ?? "", dir: attributes.dir ?? "", style: Object.fromEntries((attributes.style ?? "").split(";").map(declaration => declaration.trim()).filter(Boolean).map(declaration => { const [property, ...parts] = declaration.split(":"); const key = property.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase()); return [key, parts.join(":").trim()]; })), dataset: {}, children: [], childNodes: [], parentElement: parent,
      classList: { contains: name => (attributes.class ?? "").split(/\s+/).includes(name) },
      getAttribute: name => attributes[name] ?? null,
      hasAttribute: name => Object.hasOwn(attributes, name),
      closest(selector) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- Walk changing DOM ancestors rather than capture a callback context.
        let current = this;
        while (current) {
          if (selector.startsWith(".") && current.classList.contains(selector.slice(1))) return current;
          if (selector.startsWith("[") && selector.endsWith("]") && current.hasAttribute(selector.slice(1, -1))) return current;
          if (current.tagName?.toLowerCase() === selector.toLowerCase()) return current;
          current = current.parentElement;
        }
        return null;
      },
      remove() { if (!this.parentElement) return; this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement.childNodes = this.parentElement.childNodes.filter(child => child !== this); this.parentElement = undefined; },
      cloneNode(deep) {
        const copy = makeElement(tagName, attributes);
        if (deep) for (const child of this.childNodes) {
          if (child.nodeType === 3) copy.childNodes.push({ ...child });
          else { const nested = child.cloneNode(true); nested.parentElement = copy; copy.children.push(nested); copy.childNodes.push(nested); }
        }
        return copy;
      },
      querySelector: selector => element.querySelectorAll(selector)[0] ?? null,
      querySelectorAll: selector => {
        const descendants = [];
        const visit = parentNode => parentNode.children.forEach(child => { descendants.push(child); visit(child); });
        visit(element);
        return selector === "[data-block-id]" ? descendants.filter(child => child.dataset.blockId)
          : selector.startsWith(".") ? descendants.filter(child => child.classList.contains(selector.slice(1)))
          : descendants.filter(child => child.tagName.toLowerCase() === selector);
      },
    });
    for (const [name, value] of Object.entries(attributes)) if (name.startsWith("data-")) element.dataset[name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    Object.defineProperty(element, "textContent", { get: () => element.childNodes.map(child => child.textContent).join("") });
    elements.push(element);
    return element;
  }
  class MinimalDOMParser {
    parseFromString(markup) {
      elements.length = 0;
      const body = { children: [], childNodes: [] };
      const stack = [body];
      for (const token of markup.match(/<[^>]+>|[^<]+/g) ?? []) {
        if (token.startsWith("</")) { stack.pop(); continue; }
        if (token.startsWith("<")) {
          const [, tagName, rawAttributes = ""] = token.match(/^<([a-z][\w-]*)\b([^>]*)>$/i) ?? [];
          if (!tagName) continue;
          const attributes = Object.fromEntries([...rawAttributes.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
          const parent = stack.at(-1);
          const child = makeElement(tagName, attributes, parent);
          parent.children.push(child); parent.childNodes.push(child);
          if (!/^(?:br|hr|img|input|meta)$/i.test(tagName) && !/\/\s*>$/.test(token)) stack.push(child);
        } else stack.at(-1).childNodes.push({ nodeType: 3, textContent: decode(token) });
      }
      const matchesAttribute = selector => {
        const match = selector.match(/^\[([\w:-]+)\]$/);
        return match ? elements.find(element => element.hasAttribute(match[1])) ?? null : null;
      };
      return { body: { childNodes: body.childNodes }, querySelector: matchesAttribute, querySelectorAll: selector => selector === "[data-block-id]" ? elements.filter(element => element.dataset.blockId) : [] };
    }
  }
  try {
    globalThis.DOMParser = MinimalDOMParser; globalThis.Node = { TEXT_NODE: 3, ELEMENT_NODE: 1 }; globalThis.HTMLElement = MinimalHTMLElement;
    return callback();
  } finally {
    globalThis.DOMParser = previousParser; globalThis.Node = previousNode; globalThis.HTMLElement = previousHTMLElement;
  }
}
