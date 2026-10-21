import { validateInterfaceStylePreset, validateUniversalStylePreset } from "@acm/styles";

// Shared by the live source preview and the local file gateway. Only token
// table cells change; policy prose and line positions remain intact.
export function updateStyleGuideTokensFromDraft(document, preset, interfacePreset) {
  const found = new Set();
  const families = { inter: "Inter", "helvetica-neue": "Helvetica Neue", helvetica: "Helvetica", arial: "Arial", "sans-serif": "sans-serif", "system-sans": "System Sans", georgia: "Georgia" };
  const metric = item => `${item.value}${item.unit === "number" ? "" : item.unit}`;
  const responsive = value => [metric(value.desktop), ...["tablet", "mobile"].filter(key => value[key]).map(key => `${key}: ${metric(value[key])}`)].join("; ");
  const expected = ["palette", "typography", "buttons", "interactions", "layout"].flatMap(group => Object.keys(preset[group]).map(key => `${group}.${key}`));
  if (interfacePreset) {
    expected.push(...["colours", "typography", "fields", "buttons", "interactions"].flatMap(group => Object.entries(interfacePreset[group]).flatMap(([key, value]) => typeof value === "object" ? Object.keys(value).map(property => `interface.${group}.${key}.${property}`) : [`interface.${group}.${key}`])));
  }
  const result = document.split("\n").map(line => {
    if (!line.startsWith("| ")) return line;
    const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
    const key = cells[0];
    if (key.startsWith("interface.")) {
      if (!interfacePreset || !expected.includes(key)) return line;
      if (found.has(key)) throw new Error(`Duplicate Style Guide token row: ${key}`);
      found.add(key);
      const [, group, role, property] = key.split(".");
      const value = property ? interfacePreset[group][role][property] : interfacePreset[group][role];
      cells[2] = typeof value === "number" ? `${value}${property === "weight" ? "" : "px"}` : value.startsWith("#") ? value.toUpperCase() : value;
      return `| ${cells.join(" | ")} |`;
    }
    if (!expected.includes(key)) return line;
    if (found.has(key)) throw new Error(`Duplicate Style Guide token row: ${key}`);
    found.add(key);
    const [group, role] = key.split(".");
    const value = preset[group][role];
    const lengths = { palette: 5, typography: 9, buttons: 8, interactions: 5, layout: 4 };
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

const familyNames = { Inter: "inter", "Helvetica Neue": "helvetica-neue", Helvetica: "helvetica", Arial: "arial", "sans-serif": "sans-serif", "System Sans": "system-sans", Georgia: "georgia" };
const interfaceFamilies = { inter: "inter", "system-sans": "system-sans" };
const tokenCellCounts = { palette: 4, typography: 8, buttons: 7, interactions: 4, layout: 3, interface: 4 };
const tableRows = (document, originals) => {
  const rows = new Map();
  document.split("\n").forEach((text, index) => {
    if (!text.startsWith("| ")) return;
    const cells = text.split("|").slice(1, -1).map(cell => cell.trim());
    const key = cells[0];
    if (!/^(palette|typography|buttons|interactions|layout|interface)\./.test(key)) return;
    if (rows.has(key)) throw new Error(`Duplicate Style Guide token row: ${key} (lines ${rows.get(key).line} and ${index + 1}).`);
    const count = tokenCellCounts[key.split(".")[0]];
    if (cells.length !== count + 1) throw new Error(`Style Guide line ${index + 1}: malformed token row “${key}”; expected ${count + 1} cells including Original Default but found ${cells.length}.`);
    const original = cells.pop();
    if (!original) throw new Error(`Style Guide line ${index + 1}: ${key} is missing its Original Default.`);
    if (originals) {
      const group = key.split(".")[0];
      if (group === "typography" || group === "buttons") {
        const values = original.split(" / ");
        if (values.length !== count - 1) throw new Error(`Style Guide line ${index + 1}: malformed Original Default for ${key}.`);
        cells.splice(1, count - 1, ...values);
      } else cells[2] = original;
    }
    rows.set(key, { cells, line: index + 1, excerpt: text });
  });
  return rows;
};
const parseNumber = (value, path, line) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Style Guide line ${line}: ${path} must contain a valid number.`);
  return number;
};
const parseMetric = (text, kind, path, line) => {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(rem|em|px)?$/.exec(text.trim());
  if (!match) throw new Error(`Style Guide line ${line}: ${path} has an invalid ${kind} value “${text}”.`);
  const unit = kind === "lineHeight" && !match[2] ? "number" : match[2];
  const allowed = { size: ["rem", "em", "px"], lineHeight: ["number", "em"], letterSpacing: ["em", "px"] }[kind];
  if (!allowed.includes(unit)) throw new Error(`Style Guide line ${line}: ${path} uses an unsupported ${kind} unit.`);
  return { value: parseNumber(match[1], path, line), unit };
};
const parseResponsive = (text, kind, path, line) => {
  const result = {};
  for (const segment of text.split(";")) {
    const match = /^(?:(desktop|tablet|mobile):\s*)?(.+)$/.exec(segment.trim());
    if (!match) throw new Error(`Style Guide line ${line}: ${path} has an invalid responsive value.`);
    const viewport = match[1] ?? "desktop";
    if (Object.hasOwn(result, viewport)) throw new Error(`Style Guide line ${line}: ${path} repeats ${viewport}.`);
    result[viewport] = parseMetric(match[2], kind, path, line);
  }
  if (!result.desktop) throw new Error(`Style Guide line ${line}: ${path} must define a desktop value.`);
  return result;
};
const requiredCells = (rows, path, count) => {
  const row = rows.get(path);
  if (!row) throw new Error(`Style Guide is missing required token row “${path}”.`);
  if (row.cells.length !== count) throw new Error(`Style Guide line ${row.line}: malformed token row “${path}”; expected ${count} cells but found ${row.cells.length}.`);
  return row;
};
const parseColour = (value, path, line) => {
  if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`Style Guide line ${line}: ${path} must be a six-digit hex colour, found “${value}”.`);
  return value.toUpperCase();
};
const parsePixels = (value, path, line) => {
  const match = /^(-?(?:\d+\.?\d*|\.\d+))px$/.exec(value);
  if (!match) throw new Error(`Style Guide line ${line}: ${path} must use pixel units, found “${value}”.`);
  return parseNumber(match[1], path, line);
};

/** Parse and validate the executable website and interface presets directly from STYLE_GUIDE.md. */
export function parseStyleGuidePresets(document) {
  const saved = parseTokenValues(document, false);
  let originals;
  try { originals = parseTokenValues(document, true); }
  catch (error) { throw new Error(`Invalid Original Default: ${error.message}`); }
  return { ...saved, originalUniversalPreset: originals.universalPreset, originalInterfacePreset: originals.interfacePreset };
}

function parseTokenValues(document, originals) {
  const rows = tableRows(document, originals);
  const universal = { version: "0.9.0", palette: {}, typography: {}, buttons: {}, interactions: {}, layout: {} };
  const interfacePreset = { version: "0.1.0", colours: {}, typography: {}, fields: {}, buttons: {}, interactions: {} };

  const paletteKeys = ["surface", "surfaceRaised", "surfaceSubtle", "workspaceBackground", "textPrimary", "textSecondary", "border", "accent", "onAccent", "success", "information", "alert", "warning", "rating"];
  for (const key of paletteKeys) {
    const row = requiredCells(rows, `palette.${key}`, 4);
    universal.palette[key] = parseColour(row.cells[2], `palette.${key}`, row.line);
  }
  for (const key of ["surface", "raisedSurface", "subtleSurface", "workspaceBackground", "primaryText", "secondaryText", "label", "border", "actionAccent", "controlAccent", "selection", "blockSelection", "neutralHover"]) {
    const path = `interface.colours.${key}`;
    const row = requiredCells(rows, path, 4);
    interfacePreset.colours[key] = parseColour(row.cells[2], path, row.line);
  }
  for (const role of ["body", "h1", "h2", "h3", "h4", "h5", "h6", "button", "navigation", "metadata"]) {
    const path = `typography.${role}`;
    const row = requiredCells(rows, path, 8);
    const family = familyNames[row.cells[1]];
    if (!family) throw new Error(`Style Guide line ${row.line}: ${path} uses unsupported font family “${row.cells[1]}”.`);
    universal.typography[role] = {
      family,
      size: parseResponsive(row.cells[2], "size", `${path}.size`, row.line),
      weight: parseNumber(row.cells[3], `${path}.weight`, row.line),
      style: row.cells[4],
      lineHeight: parseResponsive(row.cells[5], "lineHeight", `${path}.lineHeight`, row.line),
      letterSpacing: parseResponsive(row.cells[6], "letterSpacing", `${path}.letterSpacing`, row.line),
      transform: row.cells[7],
    };
  }
  const interfaceValue = path => requiredCells(rows, path, 4);
  for (const role of ["control", "header"]) {
    const prefix = `interface.typography.${role}`;
    const family = interfaceValue(`${prefix}.family`);
    if (!interfaceFamilies[family.cells[2]]) throw new Error(`Style Guide line ${family.line}: ${prefix}.family uses an unsupported font family.`);
    const size = interfaceValue(`${prefix}.size`);
    const weight = interfaceValue(`${prefix}.weight`);
    interfacePreset.typography[role] = { family: interfaceFamilies[family.cells[2]], size: parsePixels(size.cells[2], `${prefix}.size`, size.line), weight: parseNumber(weight.cells[2], `${prefix}.weight`, weight.line) };
  }
  for (const role of ["base", "secondary", "outline"]) {
    const path = `buttons.${role}`;
    const row = requiredCells(rows, path, 7);
    universal.buttons[role] = {
      background: parseColour(row.cells[1], `${path}.background`, row.line),
      foreground: parseColour(row.cells[2], `${path}.foreground`, row.line),
      border: parseColour(row.cells[3], `${path}.border`, row.line),
      borderWidth: parsePixels(row.cells[4], `${path}.borderWidth`, row.line),
      hoverBackground: parseColour(row.cells[5], `${path}.hoverBackground`, row.line),
      hoverForeground: parseColour(row.cells[6], `${path}.hoverForeground`, row.line),
    };
    interfacePreset.buttons[role] = {};
    for (const property of ["background", "foreground", "border", "borderWidth"]) {
      const path = `interface.buttons.${role}.${property}`;
      const row = interfaceValue(path);
      interfacePreset.buttons[role][property] = property === "borderWidth" ? parsePixels(row.cells[2], path, row.line) : parseColour(row.cells[2], path, row.line);
    }
  }
  const interfaceHoverKeys = ["textActions", "iconActions", "inspectorOptions", "colourRows", "neutralRows", "fields", "buttons"];
  for (const key of interfaceHoverKeys) {
    interfacePreset.interactions[key] = {};
    for (const property of ["treatment", "foreground", "background"]) {
      const path = `interface.interactions.${key}.${property}`;
      const row = interfaceValue(path);
      if (property === "treatment" && !["none", "text-icon", "background"].includes(row.cells[2])) throw new Error(`Style Guide line ${row.line}: ${path} uses an unsupported hover treatment.`);
      interfacePreset.interactions[key][property] = property === "treatment" ? row.cells[2] : parseColour(row.cells[2], path, row.line);
    }
  }
  for (const key of ["neutralHoverBackground", "selectionColour", "blockSelectionColour", "controlAccentColour"]) {
    const path = `interactions.${key}`;
    const row = requiredCells(rows, path, 4);
    universal.interactions[key] = parseColour(row.cells[2], path, row.line);
  }
  const radius = requiredCells(rows, "interface.fields.radius", 4);
  interfacePreset.fields.radius = parsePixels(radius.cells[2], "interface.fields.radius", radius.line);
  for (const key of ["spacing", "contentWidth", "radius", "borderWidth"]) {
    const path = `layout.${key}`;
    const row = requiredCells(rows, path, 3);
    universal.layout[key] = parsePixels(row.cells[2], path, row.line);
  }

  // Validation remains owned by @acm/styles; malformed Markdown never falls back to defaults.
  return {
    universalPreset: validateUniversalStylePreset(universal),
    interfacePreset: validateInterfaceStylePreset(interfacePreset),
  };
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
    let rowPath = stylePath.startsWith("typography.") || stylePath.startsWith("buttons.") || stylePath.startsWith("interface.typography.") || stylePath.startsWith("interface.buttons.") || stylePath.startsWith("interface.interactions.") ? stylePath.split(".").slice(0, stylePath.startsWith("interface.") ? 3 : 2).join(".") : stylePath;
    if (stylePath.startsWith("interface.")) rowPath = rows.has(stylePath) ? stylePath : [...rows.keys()].find(key => key.startsWith(`${stylePath}.`)) ?? rowPath;
    if (!rows.has(rowPath)) throw new Error(`No Style Guide row found for ${stylePath}`);
    mappings[stylePath] = { ...rows.get(rowPath), rowPath };
  }
  return { headings, mappings };
}
