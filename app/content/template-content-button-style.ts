const buttonStyleFields = new Set(["buttonTextColor", "buttonBackgroundColor", "buttonBackgroundGradient"]);
const maximumNodes = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function hasTemplateContentButtonStyle(style: unknown): boolean {
  const pending: unknown[] = [style];
  const seen = new WeakSet<object>();
  let inspected = 0;
  while (pending.length && inspected < maximumNodes) {
    const current = pending.pop();
    inspected += 1;
    if (!Array.isArray(current) && (!isRecord(current) || seen.has(current))) continue;
    if (!Array.isArray(current)) seen.add(current);
    const children = Array.isArray(current) ? current : Object.values(current);
    if (Array.isArray(current) ? false : Object.keys(current).some(key => buttonStyleFields.has(key))) return true;
    for (const child of children) {
      if (pending.length + inspected >= maximumNodes) return true;
      pending.push(child);
    }
  }
  return pending.length > 0;
}

/** Detect the template Content element's Button colour fields in persisted envelopes. */
export function containsTemplateContentButtonStyle(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new WeakSet<object>();
  let inspected = 0;
  while (pending.length && inspected < maximumNodes) {
    const current = pending.pop();
    inspected += 1;
    if (!Array.isArray(current) && (!isRecord(current) || seen.has(current))) continue;
    if (!Array.isArray(current)) {
      seen.add(current);
      const contentElement = current.type === "element" && current.element === "content"
        || current.type === "group" && isRecord(current.data) && current.data.templateElement === "content";
      if (contentElement && hasTemplateContentButtonStyle(current.visualStyle)) return true;
    }
    const children = Array.isArray(current) ? current : Object.values(current);
    for (const child of children) {
      if (pending.length + inspected >= maximumNodes) return true;
      pending.push(child);
    }
  }
  return pending.length > 0;
}
