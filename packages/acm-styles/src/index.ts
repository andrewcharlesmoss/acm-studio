import type {
  ButtonStyle,
  FontFamily,
  FontSizeValue,
  HoverTreatment,
  InterfaceButtonStyle,
  InterfaceStylePreset,
  LayoutBorderWidthValue,
  LayoutContentWidthValue,
  LayoutRadiusValue,
  LayoutSpacingValue,
  LetterSpacingValue,
  LineHeightValue,
  ResponsiveValue,
  StyleViewport,
  TypographyStyle,
  UniversalStylePreset,
} from "./types";

export type {
  ButtonStyle,
  FontFamily,
  FontSizeUnit,
  FontSizeValue,
  HoverTreatment,
  InterfaceButtonStyle,
  InterfaceStylePreset,
  LayoutBorderWidthValue,
  LayoutContentWidthValue,
  LayoutRadiusValue,
  LayoutSpacingValue,
  LetterSpacingUnit,
  LetterSpacingValue,
  LineHeightUnit,
  LineHeightValue,
  ResponsiveValue,
  StyleViewport,
  TextTransform,
  TypographyStyle,
  UniversalStylePreset,
} from "./types";

const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  inter: 'Inter, "Helvetica Neue", "Helvetica", "Arial", sans-serif',
  "helvetica-neue": '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, sans-serif',
  "sans-serif": 'sans-serif',
  "system-sans": 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
};

const PALETTE_KEYS = [
  "surface", "surfaceRaised", "surfaceSubtle", "workspaceBackground", "textPrimary", "textSecondary",
  "border", "accent", "onAccent", "success", "information", "alert", "warning", "rating",
] as const;
const TYPOGRAPHY_KEYS = [
  "body", "h1", "h2", "h3", "h4", "h5", "h6", "button", "navigation", "metadata",
] as const;
const BUTTON_KEYS = ["base", "secondary", "outline"] as const;
const BUTTON_COLOUR_KEYS = ["background", "foreground", "border", "hoverBackground", "hoverForeground"] as const;
const INTERACTION_KEYS = ["neutralHoverBackground", "selectionColour", "controlAccentColour", "blockSelectionColour"] as const;
const LEGACY_INTERACTION_KEYS = ["neutralControlHoverBackground", "disclosureHoverBackground", "menuItemHoverBackground", "listItemHoverBackground"] as const;
const STYLE_KEYS = ["family", "weight", "style", "size", "lineHeight", "letterSpacing", "transform"] as const;

const INTERFACE_COLOUR_KEYS = ["surface", "raisedSurface", "subtleSurface", "workspaceBackground", "primaryText", "secondaryText", "label", "border", "actionAccent", "controlAccent", "selection", "blockSelection", "neutralHover"] as const;
const INTERFACE_HOVER_KEYS = ["textActions", "iconActions", "inspectorOptions", "colourRows", "neutralRows", "fields", "buttons"] as const;
const HOVER_TREATMENTS = ["none", "text-icon", "background"] as const;

export function validateInterfaceStylePreset(value: unknown): InterfaceStylePreset {
  assertKeys(value, ["version", "colours", "typography", "fields", "buttons", "interactions"], [], "interface preset");
  if (value.version !== "0.1.0" && value.version !== "0.2.0") throw new Error("Unsupported interface style preset version.");
  const colourKeys = value.version === "0.2.0" ? [...INTERFACE_COLOUR_KEYS, "sharedBlockSelection"] : [...INTERFACE_COLOUR_KEYS];
  assertKeys(value.colours, colourKeys, [], "interface colours");
  for (const key of colourKeys) assertColour(value.colours[key], "colours." + key);
  assertKeys(value.typography, ["control", "header"], [], "interface typography");
  for (const role of ["control", "header"] as const) {
    assertKeys(value.typography[role], ["family", "size", "weight"], [], "typography." + role);
    if (value.typography[role].family !== "system-sans" && value.typography[role].family !== "inter") throw new Error("Unsupported interface font family.");
    assertNumber(value.typography[role].size, 13, role === "header" ? 32 : 24, "typography." + role + ".size");
    assertNumber(value.typography[role].weight, 100, 900, "typography." + role + ".weight");
  }
  assertKeys(value.fields, ["radius"], [], "fields");
  assertNumber(value.fields.radius, 0, 16, "fields.radius");
  assertKeys(value.buttons, BUTTON_KEYS, [], "interface buttons");
  for (const key of BUTTON_KEYS) {
    assertKeys(value.buttons[key], ["background", "foreground", "border", "borderWidth"], [], "buttons." + key);
    for (const property of ["background", "foreground", "border"] as const) assertColour(value.buttons[key][property], "buttons." + key + "." + property);
    assertNumber(value.buttons[key].borderWidth, 0, 12, "buttons." + key + ".borderWidth");
  }
  assertKeys(value.interactions, INTERFACE_HOVER_KEYS, [], "interface interactions");
  for (const key of INTERFACE_HOVER_KEYS) {
    const item = value.interactions[key];
    assertKeys(item, ["treatment", "foreground", "background"], [], "interactions." + key);
    if (typeof item.treatment !== "string" || !HOVER_TREATMENTS.includes(item.treatment as typeof HOVER_TREATMENTS[number])) throw new Error("Unsupported hover treatment.");
    assertColour(item.foreground, "interactions." + key + ".foreground");
    assertColour(item.background, "interactions." + key + ".background");
  }
  return value as unknown as InterfaceStylePreset;
}

export function interfaceStylePresetToCssVariables(input: unknown): Record<string, string> {
  const preset = validateInterfaceStylePreset(input);
  const kebab = (value: string) => value.replace(/[A-Z]/g, char => "-" + char.toLowerCase());
  const variables: Record<string, string> = {};
  for (const [key, value] of Object.entries(preset.colours)) variables[`--acm-ui-color-${kebab(key)}`] = value;
  variables["--acm-ui-color-shared-block-selection"] = preset.colours.sharedBlockSelection ?? preset.colours.blockSelection;
  variables["--acm-ui-font-control"] = preset.typography.control.family === "inter" ? 'Inter, "Helvetica Neue", "Helvetica", Arial, sans-serif' : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  variables["--acm-ui-font-header"] = preset.typography.header.family === "inter" ? 'Inter, "Helvetica Neue", "Helvetica", Arial, sans-serif' : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  variables["--acm-ui-size-control"] = `${preset.typography.control.size}px`;
  variables["--acm-ui-weight-control"] = String(preset.typography.control.weight);
  variables["--acm-ui-size-header"] = `${preset.typography.header.size}px`;
  variables["--acm-ui-weight-header"] = String(preset.typography.header.weight);
  variables["--acm-ui-field-radius"] = `${preset.fields.radius}px`;
  const darkenControlColour = (colour: string) => "#" + [1, 3, 5].map(offset => Math.round(parseInt(colour.slice(offset, offset + 2), 16) * 0.88).toString(16).padStart(2, "0")).join("").toUpperCase();
  variables["--acm-ui-color-control-hover"] = darkenControlColour(preset.colours.controlAccent);
  variables["--acm-ui-color-control-pressed"] = darkenControlColour(variables["--acm-ui-color-control-hover"]);
  for (const key of BUTTON_KEYS) {
    const style = preset.buttons[key];
    const prefix = `--acm-ui-button-${key}`;
    variables[`${prefix}-background`] = style.background;
    variables[`${prefix}-foreground`] = style.foreground;
    variables[`${prefix}-border`] = style.border;
    variables[`${prefix}-border-width`] = `${style.borderWidth}px`;
    const buttonInteraction = preset.interactions.buttons;
    variables[`${prefix}-hover-background`] = buttonInteraction.treatment === "background" ? buttonInteraction.background : style.background;
    variables[`${prefix}-hover-foreground`] = buttonInteraction.treatment === "none" ? style.foreground : buttonInteraction.foreground;
  }
  for (const key of INTERFACE_HOVER_KEYS) {
    const item = preset.interactions[key];
    const prefix = `--acm-ui-hover-${kebab(key)}`;
    variables[`${prefix}-treatment`] = item.treatment;
    variables[`${prefix}-foreground`] = item.treatment === "none" ? "inherit" : item.foreground;
    variables[`${prefix}-background`] = item.treatment === "background" ? item.background : "transparent";
  }
  // Derived interface-only aliases retained for the existing Studio CSS adapters.
  variables["--studio-ui-font"] = variables["--acm-ui-font-control"];
  variables["--studio-ui-size"] = variables["--acm-ui-size-control"];
  return variables;
}

export function interfaceStylePresetToCss(input: unknown, selector = ".acm-interface-style-preset"): string {
  const simpleSelectors = /^(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*))*(?:\s*,\s*(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*))*)*$/;
  if (!simpleSelectors.test(selector)) throw new Error("CSS selector contains unsupported characters.");
  const variables = interfaceStylePresetToCssVariables(input);
  return selector + "{" + Object.keys(variables).sort().map(key => key + ":" + variables[key] + ";").join("") + "}";
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.prototype.toString.call(value) === "[object Object]" && Object.getPrototypeOf(prototype) === null;
}

function assertKeys(value: unknown, required: readonly string[], optional: readonly string[] = [], name = "value"): asserts value is RecordValue {
  if (!isRecord(value)) throw new Error(name + " must be an object.");
  const allowed = new Set([...required, ...optional]);
  if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !allowed.has(key))) {
    throw new Error(name + " contains missing or unsupported properties.");
  }
}

function assertColour(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(name + " must be a six-digit hexadecimal colour.");
  }
}

function assertNumber(value: unknown, min: number, max: number, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(name + " is outside its allowed range.");
  }
}

function assertMetric(value: unknown, allowedUnits: readonly string[], bounds: (unit: string) => [number, number], name: string): void {
  assertKeys(value, ["value", "unit"], [], name);
  if (typeof value.unit !== "string" || !allowedUnits.includes(value.unit)) throw new Error(name + " uses an unsupported unit.");
  const [min, max] = bounds(value.unit);
  assertNumber(value.value, min, max, name);
}

function assertResponsive<T>(
  value: unknown,
  validate: (item: unknown, name: string) => asserts item is T,
  name: string,
): asserts value is ResponsiveValue<T> {
  assertKeys(value, ["desktop"], ["tablet", "mobile"], name);
  for (const viewport of ["desktop", "tablet", "mobile"] as const) {
    if (Object.hasOwn(value, viewport)) validate(value[viewport], name + "." + viewport);
  }
}

function assertTypography(value: unknown, name: string, allowStackFallbacks: boolean, expandedMetricUnits: boolean): asserts value is TypographyStyle {
  assertKeys(value, [...STYLE_KEYS], [], name);
  const allowedFamilies = allowStackFallbacks ? Object.keys(FONT_FAMILY_CSS) : ["inter", "system-sans", "georgia"];
  if (typeof value.family !== "string" || !allowedFamilies.includes(value.family)) throw new Error(name + " has an unsupported font family.");
  assertNumber(value.weight, 100, 900, name + ".weight");
  if (value.style !== "normal" && value.style !== "italic") throw new Error(name + ".style is invalid.");
  if (!["none", "uppercase", "lowercase", "capitalize"].includes(String(value.transform))) throw new Error(name + ".transform is invalid.");
  const fontSizeUnits = expandedMetricUnits ? ["px", "em", "rem", "vw", "vh"] : ["rem", "em", "px"];
  const lineHeightUnits = expandedMetricUnits ? ["number"] : ["number", "em"];
  const letterSpacingUnits = expandedMetricUnits ? ["px", "%", "em", "rem", "vw", "vh"] : ["em", "px"];
  assertResponsive<FontSizeValue>(value.size, (item, key) => assertMetric(item, fontSizeUnits, unit => unit === "px" ? [8, 96] : [0.5, 6], key), name + ".size");
  assertResponsive<LineHeightValue>(value.lineHeight, (item, key) => assertMetric(item, lineHeightUnits, () => [0.8, 3], key), name + ".lineHeight");
  assertResponsive<LetterSpacingValue>(value.letterSpacing, (item, key) => assertMetric(item, letterSpacingUnits, unit => unit === "px" ? [-5, 20] : [-0.5, 1], key), name + ".letterSpacing");
}

export function validateUniversalStylePreset(value: unknown): UniversalStylePreset {
  if (!isRecord(value)) throw new Error("preset must be an object.");
  if (value.version !== "0.1.0" && value.version !== "0.2.0" && value.version !== "0.3.0" && value.version !== "0.4.0" && value.version !== "0.5.0" && value.version !== "0.6.0" && value.version !== "0.7.0" && value.version !== "0.8.0" && value.version !== "0.9.0" && value.version !== "0.10.0" && value.version !== "0.11.0" && value.version !== "0.12.0") throw new Error("Unsupported universal style preset version.");
  const hasBlockSelection = value.version === "0.9.0" || value.version === "0.10.0" || value.version === "0.11.0" || value.version === "0.12.0";
  const expandedMetricUnits = value.version === "0.10.0" || value.version === "0.11.0" || value.version === "0.12.0";
  const metricLayout = value.version === "0.11.0" || value.version === "0.12.0";
  const hasInteractions = hasBlockSelection || value.version === "0.8.0" || value.version === "0.7.0" || value.version === "0.3.0" || value.version === "0.4.0" || value.version === "0.5.0" || value.version === "0.6.0";
  const hasWorkspaceBackground = hasBlockSelection || value.version === "0.8.0";
  const hasControlAccent = hasWorkspaceBackground || value.version === "0.7.0";
  const hasSelectionColour = hasControlAccent || value.version === "0.6.0";
  assertKeys(value, ["version", "palette", "typography", "buttons", "layout", ...(hasInteractions ? ["interactions"] : [])], [], "preset");
  const allowStackFallbacks = value.version !== "0.1.0";
  const paletteKeys = hasWorkspaceBackground ? PALETTE_KEYS : PALETTE_KEYS.filter(key => key !== "workspaceBackground");
  assertKeys(value.palette, paletteKeys, [], "palette");
  for (const key of paletteKeys) assertColour(value.palette[key], "palette." + key);
  assertKeys(value.typography, TYPOGRAPHY_KEYS, [], "typography");
  for (const key of TYPOGRAPHY_KEYS) assertTypography(value.typography[key], "typography." + key, allowStackFallbacks, expandedMetricUnits);
  assertKeys(value.buttons, BUTTON_KEYS, [], "buttons");
  for (const key of BUTTON_KEYS) {
    const button = value.buttons[key];
    assertKeys(button, [...BUTTON_COLOUR_KEYS, "borderWidth"], value.version === "0.12.0" ? ["borderWidthUnit"] : [], "buttons." + key);
    if (button.borderWidthUnit !== undefined && !["px", "em", "rem", "vw", "vh"].includes(String(button.borderWidthUnit))) throw new Error("buttons." + key + ".borderWidthUnit is invalid.");
    for (const property of BUTTON_COLOUR_KEYS) assertColour(button[property], "buttons." + key + "." + property);
    assertNumber(button.borderWidth, 0, 12, "buttons." + key + ".borderWidth");
  }
  assertKeys(value.layout, ["spacing", "contentWidth", "radius", "borderWidth"], [], "layout");
  const rawLayout = value.layout;
  assertKeys(rawLayout, ["spacing", "contentWidth", "radius", "borderWidth"]);
  const layoutSpecs: readonly [string, readonly string[], (unit: string) => [number, number]][] = [
    ["spacing", ["px", "%", "em", "rem", "vw", "vh"], (unit: string) => unit === "px" ? [0, 120] : unit === "em" || unit === "rem" ? [0, 10] : [0, 100]],
    ["contentWidth", ["px", "%", "em", "rem", "vw", "vh"], (unit: string) => unit === "px" ? [320, 1800] : unit === "em" || unit === "rem" ? [20, 120] : [20, 100]],
    ["radius", ["px", "%", "em", "rem"], (unit: string) => unit === "px" ? [0, 80] : unit === "em" || unit === "rem" ? [0, 20] : [0, 50]],
    ["borderWidth", ["px"], () => [0, 12]],
  ] as const;
  const layout = Object.fromEntries(layoutSpecs.map(([key, units, bounds]) => {
    if (!metricLayout) {
      assertNumber(rawLayout[key], ...bounds("px"), "layout." + key);
      return [key, { value: rawLayout[key] as number, unit: "px" }];
    }
    assertMetric(rawLayout[key], units, bounds, "layout." + key);
    return [key, rawLayout[key]];
  })) as { spacing: LayoutSpacingValue; contentWidth: LayoutContentWidthValue; radius: LayoutRadiusValue; borderWidth: LayoutBorderWidthValue };
  if (hasInteractions) {
    const keys = hasBlockSelection ? INTERACTION_KEYS : hasControlAccent ? ["neutralHoverBackground", "selectionColour", "controlAccentColour"] : hasSelectionColour ? ["neutralHoverBackground", "selectionColour"] : value.version === "0.5.0" ? ["neutralHoverBackground"] : value.version === "0.4.0" ? LEGACY_INTERACTION_KEYS : ["disclosureHoverBackground"] as const;
    assertKeys(value.interactions, [...keys], [], "interactions");
    for (const key of keys) assertColour(value.interactions[key], "interactions." + key);
  }
  let neutralHoverBackground = "#F0F0F0";
  if (hasInteractions) {
    const interactions = value.interactions as Record<string, string>;
    if (hasSelectionColour || value.version === "0.5.0") neutralHoverBackground = interactions.neutralHoverBackground;
    else if (value.version === "0.3.0") neutralHoverBackground = interactions.disclosureHoverBackground;
    else {
      // Retain the first customised legacy colour, with a deterministic group order.
      neutralHoverBackground = LEGACY_INTERACTION_KEYS.map(key => interactions[key]).find(colour => colour.toUpperCase() !== "#F0F0F0") ?? interactions.neutralControlHoverBackground;
    }
  }
  const typography = Object.fromEntries(TYPOGRAPHY_KEYS.map(key => {
    const style = (value.typography as Record<string, unknown>)[key] as TypographyStyle;
    const lineHeight = Object.fromEntries(Object.entries(style.lineHeight).map(([viewport, metric]) => [viewport, { ...metric, unit: "number" }]));
    return [key, { ...style, lineHeight }];
  }));
  return { ...value, version: "0.12.0", layout, palette: { ...value.palette, workspaceBackground: hasWorkspaceBackground ? value.palette.workspaceBackground : "#F8FAFC" }, typography, interactions: { neutralHoverBackground, blockSelectionColour: hasBlockSelection ? (value.interactions as Record<string, string>).blockSelectionColour : "#FF383C", selectionColour: hasSelectionColour ? (value.interactions as Record<string, string>).selectionColour : "#0088FF", controlAccentColour: hasControlAccent ? (value.interactions as Record<string, string>).controlAccentColour : "#3858E9" } } as unknown as UniversalStylePreset;
}

function resolveResponsive<T>(value: ResponsiveValue<T>, viewport: StyleViewport): T {
  return value[viewport] ?? value.tablet ?? value.desktop;
}

function cssMetric(metric: FontSizeValue | LineHeightValue | LetterSpacingValue, letterSpacing = false): string {
  if (letterSpacing && metric.unit === "%") return String(metric.value / 100) + "em";
  return String(metric.value) + (metric.unit === "number" ? "" : metric.unit);
}

function cssLayoutMetric(metric: { value: number; unit: string }): string {
  return String(metric.value) + metric.unit;
}

function darkenControlColour(colour: string): string {
  return "#" + [1, 3, 5].map(offset => Math.round(parseInt(colour.slice(offset, offset + 2), 16) * 0.88).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function cssKey(value: string): string {
  return value.replace(/[A-Z]/g, char => "-" + char.toLowerCase());
}

/** Return validated CSS custom properties for the effective viewport. */
export function universalStylePresetToCssVariables(
  input: unknown,
  viewport: StyleViewport = "desktop",
): Record<string, string> {
  const preset = validateUniversalStylePreset(input);
  if (!["desktop", "tablet", "mobile"].includes(viewport)) throw new Error("Unsupported preview viewport.");
  const variables: Record<string, string> = {};
  for (const key of PALETTE_KEYS) variables["--acm-color-" + cssKey(key)] = preset.palette[key];
  for (const key of TYPOGRAPHY_KEYS) {
    const style = preset.typography[key];
    const prefix = "--acm-type-" + key;
    variables[prefix + "-family"] = FONT_FAMILY_CSS[style.family];
    variables[prefix + "-weight"] = String(style.weight);
    variables[prefix + "-style"] = style.style;
    variables[prefix + "-size"] = cssMetric(resolveResponsive(style.size, viewport));
    variables[prefix + "-line-height"] = cssMetric(resolveResponsive(style.lineHeight, viewport));
    variables[prefix + "-letter-spacing"] = cssMetric(resolveResponsive(style.letterSpacing, viewport), true);
    variables[prefix + "-transform"] = style.transform;
  }
  for (const key of BUTTON_KEYS) {
    const style: ButtonStyle = preset.buttons[key];
    const prefix = "--acm-button-" + key;
    variables[prefix + "-background"] = style.background;
    variables[prefix + "-foreground"] = style.foreground;
    variables[prefix + "-border"] = style.border;
    variables[prefix + "-border-width"] = style.borderWidth + (style.borderWidthUnit ?? "px");
    variables[prefix + "-hover-background"] = style.hoverBackground;
    variables[prefix + "-hover-foreground"] = style.hoverForeground;
  }
  variables["--acm-interaction-control-accent-colour"] = preset.interactions.controlAccentColour;
  variables["--acm-interaction-control-hover-colour"] = darkenControlColour(preset.interactions.controlAccentColour);
  variables["--acm-interaction-control-pressed-colour"] = darkenControlColour(variables["--acm-interaction-control-hover-colour"]);
  variables["--acm-interaction-selection-colour"] = preset.interactions.selectionColour;
  variables["--acm-interaction-block-selection-colour"] = preset.interactions.blockSelectionColour;
  variables["--acm-interaction-neutral-hover-background"] = preset.interactions.neutralHoverBackground;
  // Compatibility aliases keep existing consumers on the same canonical value.
  for (const key of LEGACY_INTERACTION_KEYS) variables["--acm-interaction-" + cssKey(key)] = preset.interactions.neutralHoverBackground;
  variables["--acm-layout-spacing"] = cssLayoutMetric(preset.layout.spacing);
  variables["--acm-layout-content-width"] = cssLayoutMetric(preset.layout.contentWidth);
  variables["--acm-layout-radius"] = cssLayoutMetric(preset.layout.radius);
  variables["--acm-layout-border-width"] = cssLayoutMetric(preset.layout.borderWidth);
  return variables;
}

export function universalStylePresetToCss(
  input: unknown,
  selector = ".acm-universal-style-preset",
): string {
  const preset = validateUniversalStylePreset(input);
  const simpleSelectors = /^(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*))*(?:\s*,\s*(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*)(?:\s+(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*))*)*$/;
  if (!simpleSelectors.test(selector)) throw new Error("CSS selector contains unsupported characters.");
  const cssBlock = (viewport: StyleViewport): string => {
    const variables = universalStylePresetToCssVariables(preset, viewport);
    const body = Object.keys(variables).sort().map(key => key + ":" + variables[key] + ";").join("");
    return selector + "{" + body + "}";
  };
  return [
    cssBlock("desktop"),
    "@media (max-width: 1024px){" + cssBlock("tablet") + "}",
    "@media (max-width: 767px){" + cssBlock("mobile") + "}",
  ].join("\n");
}

export function resolveUniversalStyleValue<T>(value: ResponsiveValue<T>, viewport: StyleViewport): { value: T; inherited: boolean; inheritedFrom: StyleViewport | null } {
  if (Object.hasOwn(value, viewport)) return { value: value[viewport] as T, inherited: false, inheritedFrom: null };
  if (viewport === "mobile" && Object.hasOwn(value, "tablet")) return { value: value.tablet as T, inherited: true, inheritedFrom: "tablet" };
  return { value: value.desktop, inherited: true, inheritedFrom: "desktop" };
}
