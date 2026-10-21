// Shared by the live source preview and the local file gateway. Only token
// table cells change; policy prose and line positions remain intact.
export function projectStyleGuideTokens(document, preset, interfacePreset) {
  const found = new Set();
  const families = { inter: "Inter", "helvetica-neue": "Helvetica Neue", helvetica: "Helvetica", arial: "Arial", "sans-serif": "sans-serif", "system-sans": "System Sans", georgia: "Georgia" };
  const metric = item => `${item.value}${item.unit === "number" ? "" : item.unit}`;
  const responsive = value => [metric(value.desktop), ...["tablet", "mobile"].filter(key => value[key]).map(key => `${key}: ${metric(value[key])}`)].join("; ");
  const expected = ["palette", "typography", "buttons", "interactions", "layout"].flatMap(group => Object.keys(preset[group]).map(key => `${group}.${key}`));
  if (interfacePreset) {
    expected.push(...["colours", "typography", "fields", "buttons", "interactions"].flatMap(group => Object.keys(interfacePreset[group]).map(key => `interface.${group}.${key}`)));
  }
  const result = document.split("\n").map(line => {
    if (!line.startsWith("| ")) return line;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    const key = cells[0];
    if (key.startsWith("interface.")) {
      if (!interfacePreset || !expected.includes(key)) return line;
      if (found.has(key)) throw new Error(`Duplicate Style Guide token row: ${key}`);
      found.add(key);
      const [, group, role] = key.split(".");
      const value = interfacePreset[group][role];
      if (group === "colours") cells[2] = value.toUpperCase();
      else if (group === "typography") cells[2] = `${value.family}; ${value.size}px; ${value.weight}`;
      else if (group === "fields") cells[2] = `${value}px`;
      else if (group === "buttons") cells[2] = `${value.background.toUpperCase()} / ${value.foreground.toUpperCase()} / ${value.border.toUpperCase()}`;
      else if (group === "interactions") cells[2] = `${value.treatment}; ${value.foreground.toUpperCase()}; ${value.background.toUpperCase()}`;
      return `| ${cells.join(" | ")} |`;
    }
    if (!expected.includes(key)) return line;
    if (found.has(key)) throw new Error(`Duplicate Style Guide token row: ${key}`);
    found.add(key);
    const [group, role] = key.split(".");
    const value = preset[group][role];
    const lengths = { palette: 4, typography: 8, buttons: 7, interactions: 4, layout: 3 };
    if (cells.length !== lengths[group]) throw new Error(`Unsupported Style Guide table: ${key}`);
    if (group === "palette") cells[2] = value.toUpperCase();
    if (group === "layout") cells[2] = `${value}px`;
    if (group === "typography") cells.splice(1, 7, families[value.family], responsive(value.size), String(value.weight), value.style, responsive(value.lineHeight), responsive(value.letterSpacing), value.transform);
    if (group === "buttons") cells.splice(1, 6, value.background.toUpperCase(), value.foreground.toUpperCase(), value.border.toUpperCase(), `${value.borderWidth}px`, value.hoverBackground.toUpperCase(), value.hoverForeground.toUpperCase());
    if (group === "interactions") cells.splice(1, 3, `--acm-interaction-${role.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)}`, value.toUpperCase(), cells[3]);
    return `| ${cells.join(" | ")} |`;
  }).join("\n");
  if (expected.some(key => !found.has(key))) throw new Error("The Style Guide is missing a token row. Its files have been preserved.");
  return result;
}

export function indexStyleGuide(document, preset, interfacePreset) {
  const headings = [];
  const rows = new Map();
  let heading = "Style Guide";
  document.split("\n").forEach((text, index) => {
    const match = /^(#{1,6})\s+(.+)$/.exec(text);
    if (match) { heading = match[2].trim(); headings.push({ level: match[1].length, text: heading, line: index + 1 }); }
    if (text.startsWith("| ")) rows.set(text.split("|")[1].trim().replace(/^`|`$/g, ""), { line: index + 1, excerpt: text, heading });
  });
  function paths(value, prefix) {
    return Object.entries(value).flatMap(([key, nested]) => {
      const current = `${prefix}.${key}`;
      return nested && typeof nested === "object" ? [current, ...paths(nested, current)] : [current];
    });
  }
  const all = ["palette", "typography", "buttons", "interactions", "layout"].flatMap(key => paths(preset[key], key));
  if (interfacePreset) all.push(...["colours", "typography", "fields", "buttons", "interactions"].flatMap(key => paths(interfacePreset[key], `interface.${key}`)));
  all.push("specimen.link", "specimen.unordered-list", "specimen.ordered-list", "specimen.quote");
  const mappings = {};
  for (const stylePath of all) {
    const rowPath = stylePath.startsWith("typography.") || stylePath.startsWith("buttons.") || stylePath.startsWith("interface.typography.") || stylePath.startsWith("interface.buttons.") || stylePath.startsWith("interface.interactions.") ? stylePath.split(".").slice(0, stylePath.startsWith("interface.") ? 3 : 2).join(".") : stylePath;
    if (!rows.has(rowPath)) throw new Error(`No Style Guide row found for ${stylePath}`);
    mappings[stylePath] = { ...rows.get(rowPath), rowPath };
  }
  return { headings, mappings };
}
