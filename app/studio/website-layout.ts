import type { StyleViewport, UniversalStylePreset } from "@acm/styles";

export const WEBSITE_LAYOUT_VERSION = "0.1.0" as const;

/** All dimensions are CSS pixels; these values describe limits, not fixed widths. */
export type WebsiteSiteWidth = { mode: "full" } | { mode: "max"; maxWidth: number };
export type WebsiteLayoutValues = {
  siteWidth: WebsiteSiteWidth;
  contentWidth: number;
  wideWidth: number;
  gutters: { desktop: number; tablet?: number; mobile?: number };
};
/** Missing properties inherit. An equal, explicitly stored value is still custom. */
export type WebsiteLayoutOverrides = Partial<Omit<WebsiteLayoutValues, "gutters">> & {
  gutters?: Partial<WebsiteLayoutValues["gutters"]>;
};
export type WebsiteLayoutProfile = {
  format: "acm-website-layout-profile";
  version: typeof WEBSITE_LAYOUT_VERSION;
  id: string;
  name: string;
  overrides: WebsiteLayoutOverrides;
};
export type WebsiteLayoutOrigin = {
  scope: "defaults" | "profile" | "template";
  profileId?: string;
};
export type ResolvedWebsiteLayout = {
  values: Omit<WebsiteLayoutValues, "gutters"> & { gutters: Record<StyleViewport, number> };
  origins: Record<"siteWidth" | "contentWidth" | "wideWidth", WebsiteLayoutOrigin> & {
    gutters: Record<StyleViewport, WebsiteLayoutOrigin & { viewport: StyleViewport }>;
  };
};
/** Recovery data, deliberately not a new-layout profile or inferred inheritance. */
export type LegacyWebsiteLayout = {
  format: "acm-legacy-website-layout";
  version: typeof WEBSITE_LAYOUT_VERSION;
  layout: UniversalStylePreset["layout"];
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function fields(value: unknown, allowed: string[], required: string[], label: string): asserts value is Record<string, unknown> {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))
    || required.some(key => !Object.hasOwn(value, key))) throw new Error(`Invalid ${label}.`);
}

function number(value: unknown, min: number, max: number, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${label}. Use a number from ${min} to ${max} CSS pixels.`);
  }
}

function siteWidth(value: unknown): WebsiteSiteWidth {
  if (record(value) && value.mode === "full") {
    fields(value, ["mode"], ["mode"], "full site width");
    return { mode: "full" };
  }
  fields(value, ["mode", "maxWidth"], ["mode", "maxWidth"], "maximum site width");
  if (value.mode !== "max") throw new Error("Invalid site width mode.");
  number(value.maxWidth, 1, 8192, "maximum site width");
  return { mode: "max", maxWidth: value.maxWidth };
}

function layout(value: unknown, complete: boolean): WebsiteLayoutOverrides {
  const keys = ["siteWidth", "contentWidth", "wideWidth", "gutters"];
  fields(value, keys, complete ? keys : [], "website layout");
  const result: WebsiteLayoutOverrides = {};
  if (Object.hasOwn(value, "siteWidth")) result.siteWidth = siteWidth(value.siteWidth);
  for (const key of ["contentWidth", "wideWidth"] as const) {
    if (Object.hasOwn(value, key)) {
      number(value[key], 1, 8192, key);
      result[key] = value[key];
    }
  }
  if (Object.hasOwn(value, "gutters")) {
    fields(value.gutters, ["desktop", "tablet", "mobile"], complete ? ["desktop"] : [], "page gutters");
    result.gutters = {};
    for (const viewport of ["desktop", "tablet", "mobile"] as const) {
      if (Object.hasOwn(value.gutters, viewport)) {
        number(value.gutters[viewport], 0, 512, `${viewport} gutter`);
        result.gutters[viewport] = value.gutters[viewport];
      }
    }
  }
  return result;
}

export function validateWebsiteLayoutValues(value: unknown): WebsiteLayoutValues {
  return layout(value, true) as WebsiteLayoutValues;
}

export function validateWebsiteLayoutOverrides(value: unknown): WebsiteLayoutOverrides {
  return layout(value, false);
}

export function validateWebsiteLayoutProfile(value: unknown): WebsiteLayoutProfile {
  fields(value, ["format", "version", "id", "name", "overrides"], ["format", "version", "id", "name", "overrides"], "website layout profile");
  if (value.format !== "acm-website-layout-profile" || value.version !== WEBSITE_LAYOUT_VERSION
    || typeof value.id !== "string" || !/^[a-z][a-z0-9-]{0,79}$/.test(value.id)
    || typeof value.name !== "string" || !value.name.trim() || value.name.length > 120) {
    throw new Error("Invalid website layout profile identity or version.");
  }
  return { format: value.format, version: value.version, id: value.id, name: value.name,
    overrides: validateWebsiteLayoutOverrides(value.overrides) };
}

/** Pure resolution only. Callers must supply defaults explicitly; nothing is saved or rendered. */
export function resolveWebsiteLayout(
  defaults: WebsiteLayoutValues,
  profile: WebsiteLayoutProfile,
  template: WebsiteLayoutOverrides = {},
): ResolvedWebsiteLayout {
  const base = validateWebsiteLayoutValues(defaults);
  const shared = validateWebsiteLayoutProfile(profile);
  const custom = validateWebsiteLayoutOverrides(template);
  const layers = [
    { values: base, origin: { scope: "defaults" } },
    { values: shared.overrides, origin: { scope: "profile", profileId: shared.id } },
    { values: custom, origin: { scope: "template" } },
  ] satisfies { values: WebsiteLayoutOverrides; origin: WebsiteLayoutOrigin }[];
  function resolveField<K extends "siteWidth" | "contentWidth" | "wideWidth">(key: K) {
    const layer = layers.findLast(candidate => Object.hasOwn(candidate.values, key))!;
    return { value: layer.values[key] as WebsiteLayoutValues[K], origin: { ...layer.origin } };
  }
  function resolveGutter(viewport: StyleViewport): { value: number; origin: WebsiteLayoutOrigin & { viewport: StyleViewport } } {
    const layer = layers.findLast(candidate => candidate.values.gutters && Object.hasOwn(candidate.values.gutters, viewport));
    if (!layer) return resolveGutter("desktop");
    return { value: layer.values.gutters![viewport]!, origin: { ...layer.origin, viewport } };
  }
  const site = resolveField("siteWidth");
  const content = resolveField("contentWidth");
  const wide = resolveField("wideWidth");
  const desktop = resolveGutter("desktop");
  const tablet = resolveGutter("tablet");
  const mobile = resolveGutter("mobile");
  return {
    values: { siteWidth: site.value, contentWidth: content.value, wideWidth: wide.value,
      gutters: { desktop: desktop.value, tablet: tablet.value, mobile: mobile.value } },
    origins: { siteWidth: site.origin, contentWidth: content.origin, wideWidth: wide.origin,
      gutters: { desktop: desktop.origin, tablet: tablet.origin, mobile: mobile.origin } },
  };
}

/** Preserve the old layout verbatim; its surface width and uniform padding have different semantics. */
export function captureLegacyWebsiteLayout(value: UniversalStylePreset["layout"]): LegacyWebsiteLayout {
  const keys = ["spacing", "contentWidth", "radius", "borderWidth"];
  fields(value, keys, keys, "legacy layout");
  number(value.spacing, 0, 120, "legacy spacing");
  number(value.contentWidth, 320, 1800, "legacy content width");
  number(value.radius, 0, 80, "legacy corner radius");
  number(value.borderWidth, 0, 12, "legacy border width");
  return { format: "acm-legacy-website-layout", version: WEBSITE_LAYOUT_VERSION,
    layout: { spacing: value.spacing, contentWidth: value.contentWidth, radius: value.radius, borderWidth: value.borderWidth } };
}
