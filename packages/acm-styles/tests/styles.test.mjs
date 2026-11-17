import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  resolveUniversalStyleValue,
  universalStylePresetToCss,
  universalStylePresetToCssVariables,
  interfaceStylePresetToCss,
  interfaceStylePresetToCssVariables,
  validateInterfaceStylePreset,
  validateUniversalStylePreset,
} from "../src/index.ts";
import { createInterfaceStylePreset, createUniversalStylePreset, interfacePreset, universalPreset as UNIVERSAL_STYLE_PRESET } from "../../../tests/style-test-presets.mjs";
import { parseStyleGuidePresets } from "../../../app/studio/ui/styles/style-guide-tokens.mjs";
const INTERFACE_STYLE_PRESET = interfacePreset;

const clone = value => structuredClone(value);
const legacyPreset = version => {
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.version = version;
  preset.layout = Object.fromEntries(Object.entries(preset.layout).map(([key, metric]) => [key, metric.value]));
  return preset;
};
const relativeLuminance = colour => {
  const channels = colour.match(/[A-Fa-f0-9]{2}/g).map(channel => Number.parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
};
const contrastRatio = (first, second) => {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
};

test("exports the approved versioned baseline", () => {
  const preset = UNIVERSAL_STYLE_PRESET;
  assert.equal(preset.version, "0.12.0");
  assert.deepEqual(preset.typography.body.size.desktop, { value: 1.0625, unit: "rem" });
  assert.deepEqual(
    ["h1", "h2", "h3", "h4", "h5", "h6"].map(key => preset.typography[key].size.desktop.value),
    [2, 1.75, 1.5, 1.375, 1.25, 1.125],
  );
  assert.deepEqual(
    ["h1", "h2", "h3", "h4", "h5", "h6"].map(key => preset.typography[key].weight),
    [700, 700, 700, 700, 700, 700],
  );
  assert.equal(preset.typography.button.size.desktop.value, 1);
  assert.equal(preset.typography.navigation.size.desktop.value, 1);
  assert.equal(preset.typography.metadata.size.desktop.value, 0.875);
  assert.deepEqual(preset.layout, {
    spacing: { value: 24, unit: "px" }, contentWidth: { value: 1040, unit: "px" },
    radius: { value: 8, unit: "px" }, borderWidth: { value: 1, unit: "px" },
  });
});

test("Base button text keeps readable contrast in normal and hover states", () => {
  const { base } = UNIVERSAL_STYLE_PRESET.buttons;
  assert.ok(contrastRatio(base.background, base.foreground) >= 4.5);
  assert.ok(contrastRatio(base.hoverBackground, base.hoverForeground) >= 4.5);
  const stylesheet = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(stylesheet, /solid var\(--acm-button-base-border\)/);
  assert.match(stylesheet, /background: var\(--acm-button-base-background\)/);
  assert.match(stylesheet, /background: var\(--acm-button-base-hover-background\)/);
});

test("project default factory returns isolated nested values", () => {
  const first = createUniversalStylePreset();
  const second = createUniversalStylePreset();
  first.palette.accent = "#000000";
  first.typography.body.size.desktop.value = 2;
  assert.notEqual(first.palette.accent, second.palette.accent);
  assert.equal(second.typography.body.size.desktop.value, 1.0625);
});

test("validates bounded values and rejects unsafe or unknown values", () => {
  const badColour = clone(UNIVERSAL_STYLE_PRESET);
  badColour.palette.accent = "red; background:url(javascript:alert(1))";
  assert.throws(() => validateUniversalStylePreset(badColour));
  const badSize = clone(UNIVERSAL_STYLE_PRESET);
  badSize.typography.body.size.desktop = { value: 999, unit: "px" };
  assert.throws(() => validateUniversalStylePreset(badSize));
  const badUnit = clone(UNIVERSAL_STYLE_PRESET);
  badUnit.typography.h1.letterSpacing.desktop = { value: 2, unit: "ch" };
  assert.throws(() => validateUniversalStylePreset(badUnit));
  const badFamily = clone(UNIVERSAL_STYLE_PRESET);
  badFamily.typography.body.family = "url(evil)";
  assert.throws(() => validateUniversalStylePreset(badFamily));
  const extra = clone(UNIVERSAL_STYLE_PRESET);
  extra.palette.extra = "#000000";
  assert.throws(() => validateUniversalStylePreset(extra));
});

test("schema v0.11.0 accepts WordPress typography units and exports percentage letter spacing safely", () => {
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.typography.body.size.desktop = { value: 5, unit: "vw" };
  preset.typography.body.letterSpacing.desktop = { value: 0.2, unit: "%" };
  const css = universalStylePresetToCssVariables(preset);
  assert.equal(css["--acm-type-body-size"], "5vw");
  assert.equal(css["--acm-type-body-letter-spacing"], "0.002em");
  for (const unit of ["px", "em", "rem", "vw", "vh"]) {
    preset.typography.body.size.desktop = { value: unit === "px" ? 16 : 1, unit };
    assert.doesNotThrow(() => validateUniversalStylePreset(preset));
  }
  for (const unit of ["px", "%", "em", "rem", "vw", "vh"]) {
    preset.typography.body.letterSpacing.desktop = { value: 0.1, unit };
    assert.doesNotThrow(() => validateUniversalStylePreset(preset));
  }
  preset.typography.body.lineHeight.desktop = { value: 1.4, unit: "em" };
  assert.throws(() => validateUniversalStylePreset(preset));
});

test("legacy em line height migrates to unitless while preserving its number", () => {
  const legacy = legacyPreset("0.9.0");
  legacy.typography.body.lineHeight.desktop = { value: 1.4, unit: "em" };
  const migrated = validateUniversalStylePreset(legacy);
  assert.equal(migrated.version, "0.12.0");
  assert.deepEqual(migrated.typography.body.lineHeight.desktop, { value: 1.4, unit: "number" });
  assert.deepEqual(legacy.typography.body.lineHeight.desktop, { value: 1.4, unit: "em" });
});

test("schema v0.11.0 validates and exports unit-aware layout metrics", () => {
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.layout.spacing = { value: 2, unit: "rem" };
  preset.layout.contentWidth = { value: 80, unit: "vw" };
  preset.layout.radius = { value: 10, unit: "%" };
  const css = universalStylePresetToCssVariables(preset);
  assert.equal(css["--acm-layout-spacing"], "2rem");
  assert.equal(css["--acm-layout-content-width"], "80vw");
  assert.equal(css["--acm-layout-radius"], "10%");
  assert.equal(css["--acm-layout-border-width"], "1px");
  for (const invalid of [
    { ...preset.layout.spacing, unit: "ch" },
    { value: 101, unit: "%" },
    { value: 11, unit: "rem" },
  ]) {
    const bad = clone(preset); bad.layout.spacing = invalid;
    assert.throws(() => validateUniversalStylePreset(bad));
  }
  const legacy = clone(preset); legacy.version = "0.10.0";
  legacy.layout = { spacing: 24, contentWidth: 1040, radius: 8, borderWidth: 1 };
  assert.deepEqual(validateUniversalStylePreset(legacy).layout.spacing, { value: 24, unit: "px" });
});

test("responsive metrics inherit desktop until a narrower override exists", () => {
  const size = { desktop: { value: 1, unit: "rem" }, tablet: { value: 1.1, unit: "rem" } };
  assert.deepEqual(resolveUniversalStyleValue(size, "desktop"), { value: size.desktop, inherited: false, inheritedFrom: null });
  assert.deepEqual(resolveUniversalStyleValue(size, "tablet"), { value: size.tablet, inherited: false, inheritedFrom: null });
  assert.deepEqual(resolveUniversalStyleValue(size, "mobile"), { value: size.tablet, inherited: true, inheritedFrom: "tablet" });
  assert.equal(resolveUniversalStyleValue({ desktop: size.desktop }, "mobile").inheritedFrom, "desktop");
});

test("CSS exports validate and include all token groups", () => {
  const css = universalStylePresetToCss(UNIVERSAL_STYLE_PRESET);
  const { palette, buttons } = UNIVERSAL_STYLE_PRESET;
  assert.ok(css.includes(`--acm-color-accent:${palette.accent};`));
  for (const background of [palette.surface, palette.surfaceSubtle, palette.workspaceBackground]) {
    assert.ok(contrastRatio(buttons.outline.foreground, background) >= 4.5, `Link text on ${background}`);
  }
  assert.ok(contrastRatio(buttons.outline.foreground, buttons.outline.background) >= 4.5);
  const studio = INTERFACE_STYLE_PRESET;
  assert.ok(contrastRatio(studio.colours.actionAccent, studio.colours.subtleSurface) >= 4.5);
  assert.ok(contrastRatio(studio.buttons.outline.foreground, studio.buttons.outline.background) >= 4.5);
  for (const action of ["textActions", "inspectorOptions", "colourRows"]) {
    const { foreground, background } = studio.interactions[action];
    assert.ok(contrastRatio(foreground, background) >= 4.5, `Studio ${action} hover text`);
  }
  assert.match(css, /--acm-type-body-size:1.0625rem/);
  assert.match(css, /--acm-button-outline-hover-background:#EAF3FF/);
  assert.match(css, /--acm-button-base-border-width:1px/);
  assert.match(css, /--acm-layout-content-width:1040px/);
  assert.match(css, /max-width: 767px/);
  assert.throws(() => universalStylePresetToCss(UNIVERSAL_STYLE_PRESET, "body}body"));
  const tablet = clone(UNIVERSAL_STYLE_PRESET);
  tablet.typography.body.size.tablet = { value: 18, unit: "px" };
  assert.match(universalStylePresetToCss(tablet), /--acm-type-body-size:18px/);
});

test("bundled upright and italic variable font files have matching font-face declarations and licence", () => {
  const directory = path.join(import.meta.dirname, "../src");
  const css = fs.readFileSync(path.join(directory, "fonts.css"), "utf8");
  assert.match(css, /inter-variable\.woff2/);
  assert.match(css, /inter-variable-italic\.woff2/);
  assert.match(css, /font-weight: 100 900/);
  assert.ok(fs.statSync(path.join(directory, "fonts/inter-variable.woff2")).size > 100_000);
  assert.ok(fs.statSync(path.join(directory, "fonts/inter-variable-italic.woff2")).size > 100_000);
  assert.match(fs.readFileSync(path.join(directory, "fonts/OFL.txt"), "utf8"), /SIL OPEN FONT LICENSE/);
});

test("the Markdown parser builds executable presets from all current governance token tables", () => {
  const guide = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../workspace-governance/STYLE_GUIDE.md"), "utf8");
  const preset = UNIVERSAL_STYLE_PRESET;
  const parsed = parseStyleGuidePresets(guide);
  assert.deepEqual(parsed.universalPreset, preset);
  assert.deepEqual(parsed.interfacePreset, INTERFACE_STYLE_PRESET);
  const rows = guide.split("\n").filter(line => line.startsWith("| ")).map(line => line.split("|").slice(1, -1).map(cell => cell.trim()));
  const rowFor = presetPath => {
    const row = rows.find(cells => cells[0] === presetPath);
    assert.ok(row, "missing guide source row: " + presetPath);
    return row;
  };
  const cssColourNames = Object.fromEntries(Object.keys(preset.palette).map(key => [key, key.replace(/[A-Z]/g, char => "-" + char.toLowerCase())]));
  for (const [key, cssName] of Object.entries(cssColourNames)) {
    const row = rowFor("palette." + key);
    assert.equal(row[3], preset.palette[key], "guide colour value drift: " + key);
    assert.equal(row[1], "--acm-color-" + cssName, "guide colour property drift: " + key);
  }
  for (const [key, style] of Object.entries(preset.typography)) {
    const row = rowFor("typography." + key);
    assert.equal(row[1].toLowerCase(), "inter", "guide font family drift: " + key);
    assert.equal(row[2], style.size.desktop.value + style.size.desktop.unit, "guide font size drift: " + key);
    assert.equal(Number(row[3]), style.weight, "guide font weight drift: " + key);
    assert.equal(row[4], style.style, "guide font style drift: " + key);
    assert.equal(Number(row[5]), style.lineHeight.desktop.value, "guide line height drift: " + key);
    assert.equal(row[6], style.letterSpacing.desktop.value + style.letterSpacing.desktop.unit, "guide letter spacing drift: " + key);
    assert.equal(row[7], style.transform, "guide text transform drift: " + key);
  }
  for (const key of ["base", "secondary", "outline"]) {
    const button = preset.buttons[key];
    const matchingRows = rows.filter(cells => cells[0] === "buttons." + key);
    const row = matchingRows[0];
    const defaultsRow = matchingRows[1];
    assert.ok(row && defaultsRow, "missing saved/default button rows: " + key);
    assert.deepEqual(row.slice(1), [button.background, button.foreground, button.border, button.borderWidth + "px", button.hoverBackground, button.hoverForeground], "guide button token drift: " + key);
    const original = parsed.originalUniversalPreset.buttons[key];
    assert.deepEqual(defaultsRow.slice(1), [original.background, original.foreground, original.border, original.borderWidth + "px", original.hoverBackground, original.hoverForeground], "guide original button default drift: " + key);
  }
  const layoutCssNames = { spacing: "spacing", contentWidth: "content-width", radius: "radius", borderWidth: "border-width" };
  for (const [key, cssName] of Object.entries(layoutCssNames)) {
    const row = rowFor("layout." + key);
    assert.equal(row[1], "--acm-layout-" + cssName, "guide layout property drift: " + key);
    assert.equal(row[2], `${preset.layout[key].value}${preset.layout[key].unit}`, "guide layout value drift: " + key);
  }
  for (const specimen of ["link", "unordered-list", "ordered-list", "quote"]) {
    assert.ok(rows.some(row => row[0] === "`specimen." + specimen + "`"), "missing guide specimen mapping: " + specimen);
  }
});


test("interface selection migrates legacy presets and stays independent from Accent", () => {
  for (const version of ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"]) {
    const legacy = legacyPreset(version);
    delete legacy.interactions.blockSelectionColour;
    delete legacy.palette.workspaceBackground;
    if (["0.1.0", "0.2.0"].includes(version)) delete legacy.interactions;
    else if (version === "0.3.0") legacy.interactions = { disclosureHoverBackground: "#112233" };
    else if (version === "0.4.0") legacy.interactions = Object.fromEntries(["neutralControlHoverBackground", "disclosureHoverBackground", "menuItemHoverBackground", "listItemHoverBackground"].map(key => [key, "#112233"]));
    else legacy.interactions = { neutralHoverBackground: "#112233" };
    assert.equal(validateUniversalStylePreset(legacy).interactions.selectionColour, "#0088FF");
  }
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.interactions.selectionColour = "#112233";
  preset.palette.accent = "#445566";
  const css = universalStylePresetToCssVariables(preset);
  assert.equal(css["--acm-interaction-selection-colour"], "#112233");
  assert.equal(css["--acm-color-accent"], "#445566");
  preset.interactions.selectionColour = "red";
  assert.throws(() => validateUniversalStylePreset(preset));
  delete preset.interactions.selectionColour;
  assert.throws(() => validateUniversalStylePreset(preset));
});


test("control accent migration, derived states and independent interface colours", () => {
  const previous = legacyPreset("0.6.0");
  delete previous.interactions.blockSelectionColour;
  delete previous.palette.workspaceBackground;
  previous.interactions.selectionColour = "#112233";
  delete previous.interactions.controlAccentColour;
  const migrated = validateUniversalStylePreset(previous);
  assert.equal(migrated.interactions.controlAccentColour, "#3858E9");
  assert.equal(migrated.interactions.selectionColour, "#112233");
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.interactions.controlAccentColour = "#808080";
  const css = universalStylePresetToCssVariables(preset);
  assert.equal(css["--acm-interaction-control-accent-colour"], "#808080");
  assert.equal(css["--acm-interaction-control-hover-colour"], "#717171");
  assert.equal(css["--acm-interaction-control-pressed-colour"], "#636363");
  assert.equal(css["--acm-interaction-selection-colour"], "#0088FF");
  assert.equal(css["--acm-color-accent"], UNIVERSAL_STYLE_PRESET.palette.accent);
  for (const colour of ["#000000", "#FFFFFF"]) {
    preset.interactions.controlAccentColour = colour;
    assert.match(universalStylePresetToCssVariables(preset)["--acm-interaction-control-hover-colour"], /^#[0-9A-F]{6}$/);
  }
  preset.interactions.controlAccentColour = "red";
  assert.throws(() => validateUniversalStylePreset(preset));
  delete preset.interactions.controlAccentColour;
  assert.throws(() => validateUniversalStylePreset(preset));
});


test("workspace background migrates legacy presets and exports independently of surfaces", () => {
  for (const version of ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0", "0.6.0", "0.7.0"]) {
    const legacy = legacyPreset(version);
    delete legacy.interactions.blockSelectionColour;
    delete legacy.palette.workspaceBackground;
    if (["0.1.0", "0.2.0"].includes(version)) delete legacy.interactions;
    else if (version === "0.3.0") legacy.interactions = { disclosureHoverBackground: "#112233" };
    else if (version === "0.4.0") legacy.interactions = Object.fromEntries(["neutralControlHoverBackground", "disclosureHoverBackground", "menuItemHoverBackground", "listItemHoverBackground"].map(key => [key, "#112233"]));
    else if (version === "0.5.0") legacy.interactions = { neutralHoverBackground: "#112233" };
    else if (version === "0.6.0") delete legacy.interactions.controlAccentColour;
    legacy.palette.surface = "#ABCDEF";
    const migrated = validateUniversalStylePreset(legacy);
    assert.equal(migrated.version, "0.12.0");
    assert.equal(migrated.palette.workspaceBackground, "#F8FAFC");
    assert.equal(migrated.palette.surface, "#ABCDEF");
    assert.equal(legacy.palette.workspaceBackground, undefined);
  }
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.palette.workspaceBackground = "#DCEEFF";
  assert.equal(universalStylePresetToCssVariables(preset)["--acm-color-workspace-background"], "#DCEEFF");
  assert.equal(universalStylePresetToCssVariables(preset)["--acm-color-surface"], "#FFFFFF");
  for (const invalid of ["red", "#fff", "#FFFFFF; color:red", null]) {
    preset.palette.workspaceBackground = invalid;
    assert.throws(() => validateUniversalStylePreset(preset));
  }
  delete preset.palette.workspaceBackground;
  assert.throws(() => validateUniversalStylePreset(preset));
});


test("block selection migrates v0.8 and exports separately from alerts and interface selection", () => {
  const legacy = legacyPreset("0.8.0");
  delete legacy.interactions.blockSelectionColour;
  assert.equal(validateUniversalStylePreset(legacy).interactions.blockSelectionColour, "#FF383C");
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.interactions.blockSelectionColour = "#112233";
  const css = universalStylePresetToCssVariables(preset);
  assert.equal(css["--acm-interaction-block-selection-colour"], "#112233");
  assert.equal(css["--acm-color-alert"], "#FF383C");
  assert.equal(css["--acm-interaction-selection-colour"], "#0088FF");
  for (const invalid of ["red", "#fff", null, undefined]) {
    preset.interactions.blockSelectionColour = invalid;
    assert.throws(() => validateUniversalStylePreset(preset));
  }
});

test("interface preset is independently validated and exports namespaced controls", () => {
  const preset = createInterfaceStylePreset();
  assert.equal(preset.version, "0.2.0");
  assert.equal(INTERFACE_STYLE_PRESET.fields.radius, 2);
  assert.equal(preset.colours.label, "#1C1C1E");
  assert.equal(validateInterfaceStylePreset(preset).colours.actionAccent, INTERFACE_STYLE_PRESET.colours.actionAccent);
  const variables = interfaceStylePresetToCssVariables(preset);
  assert.equal(variables["--acm-ui-color-label"], "#1C1C1E");
  assert.equal(variables["--acm-ui-field-radius"], "2px");
  assert.equal(variables["--acm-ui-hover-text-actions-background"], "transparent");
  assert.equal(variables["--acm-ui-hover-neutral-rows-background"], "#F0F0F0");
  assert.equal(variables["--acm-ui-color-control-hover"], "#314DCD");
  assert.match(interfaceStylePresetToCss(preset), /--acm-ui-color-label:#1C1C1E/);
  assert.equal(Object.hasOwn(variables, "--acm-color-accent"), false);
  assert.equal(Object.hasOwn(universalStylePresetToCssVariables(UNIVERSAL_STYLE_PRESET), "--acm-ui-color-label"), false);
  const invalidRadius = structuredClone(preset);
  invalidRadius.fields.radius = 24;
  assert.throws(() => validateInterfaceStylePreset(invalidRadius));
  const invalidTreatment = structuredClone(preset);
  invalidTreatment.interactions.textActions.treatment = "fill-everything";
  assert.throws(() => validateInterfaceStylePreset(invalidTreatment));
  assert.equal(universalStylePresetToCssVariables(UNIVERSAL_STYLE_PRESET)["--acm-color-accent"], UNIVERSAL_STYLE_PRESET.palette.accent);
});

test("interface button hover treatment is shared across variants", () => {
  const preset = createInterfaceStylePreset();
  const variablesFor = treatment => {
    preset.interactions.buttons = { treatment, foreground: "#112233", background: "#445566" };
    return interfaceStylePresetToCssVariables(preset);
  };
  let variables = variablesFor("none");
  for (const role of ["base", "secondary", "outline"]) {
    assert.equal(variables[`--acm-ui-button-${role}-hover-background`], preset.buttons[role].background);
    assert.equal(variables[`--acm-ui-button-${role}-hover-foreground`], preset.buttons[role].foreground);
  }
  variables = variablesFor("text-icon");
  for (const role of ["base", "secondary", "outline"]) {
    assert.equal(variables[`--acm-ui-button-${role}-hover-background`], preset.buttons[role].background);
    assert.equal(variables[`--acm-ui-button-${role}-hover-foreground`], "#112233");
  }
  variables = variablesFor("background");
  for (const role of ["base", "secondary", "outline"]) {
    assert.equal(variables[`--acm-ui-button-${role}-hover-background`], "#445566");
    assert.equal(variables[`--acm-ui-button-${role}-hover-foreground`], "#112233");
  }
});


test("shared block selection supports legacy and current interface presets", () => {
  const current = createInterfaceStylePreset();
  assert.equal(interfaceStylePresetToCssVariables(current)["--acm-ui-color-shared-block-selection"], "#7F00FF");
  const legacy = clone(current); legacy.version = "0.1.0"; delete legacy.colours.sharedBlockSelection;
  assert.equal(validateInterfaceStylePreset(legacy).version, "0.1.0");
  assert.equal(interfaceStylePresetToCssVariables(legacy)["--acm-ui-color-shared-block-selection"], legacy.colours.blockSelection);
  const missing = clone(current); delete missing.colours.sharedBlockSelection;
  assert.throws(() => validateInterfaceStylePreset(missing));
  const invalid = clone(current); invalid.colours.sharedBlockSelection = "url(evil)";
  assert.throws(() => validateInterfaceStylePreset(invalid));
});


test("website button widths preserve valid CSS units and legacy numeric presets", () => {
  const preset = clone(UNIVERSAL_STYLE_PRESET);
  preset.buttons.base.borderWidth = 0.25;
  preset.buttons.base.borderWidthUnit = "rem";
  const checked = validateUniversalStylePreset(preset);
  assert.equal(universalStylePresetToCssVariables(checked)["--acm-button-base-border-width"], "0.25rem");
  preset.buttons.base.borderWidthUnit = "%";
  assert.throws(() => validateUniversalStylePreset(preset), /borderWidthUnit/);
  delete preset.buttons.base.borderWidthUnit;
  preset.version = "0.11.0";
  assert.equal(universalStylePresetToCssVariables(validateUniversalStylePreset(preset))["--acm-button-base-border-width"], "0.25px");
});
