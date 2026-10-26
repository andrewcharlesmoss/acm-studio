import { universalStylePresetToCssVariables } from "@acm/styles";
import { validateWebsiteStyles } from "./website-style-validation";
import { parseSiteImageName, SITE_IMAGE_MAX_BYTES, siteImageName, siteImageSignature } from "../../content/site-featured-image.mjs";
import { stylePalettes, styleTypography } from "./style-reference-data";
import { compileSavedWebsiteCss } from "./additional-css";
import { createStylesPreview, resolvePreviewStyle, type StyleSelection } from "./styles-preview-state";
import { originalIdentityText, type IdentityImage, type SiteIdentity } from "./identity-preview-state";
import { applyStudioTransaction, createStudioTransaction, type StudioSyncMergeConflict } from "../studio-sync";

export type PortableDesignImage = { id: string; name: string; altText: string; src: string };
type Portable<T> = T extends IdentityImage ? PortableDesignImage : T extends readonly (infer V)[] ? Portable<V>[] : T extends object ? { [K in keyof T]: Portable<T[K]> } : T;
export type WebsiteDesign = { identity: Portable<SiteIdentity>; styles: Portable<Partial<StyleSelection>> };
export const emptyWebsiteDesign = (): WebsiteDesign => ({ identity: {}, styles: {} });
export const defaultWebsiteDesign = (): WebsiteDesign => ({ identity: { ...originalIdentityText }, styles: { paletteId: 'default', typographyId: 'default' } });
export class WebsiteDesignConflictError extends Error {
  constructor(public base: WebsiteDesign, public draft: WebsiteDesign, public saved: WebsiteDesign, public conflicts: StudioSyncMergeConflict[]) {
    super('This site’s settings changed while you were editing. Your draft was preserved.');
  }
}
/** Rebase authored fields while preserving independent saved settings. */
export function mergeWebsiteDesign(base: WebsiteDesign, draft: WebsiteDesign, saved: WebsiteDesign, choice?: 'mine' | 'theirs'): WebsiteDesign {
  // Optional settings objects are containers, not authored values. Align their
  // shape so a saved Reset can remove an ancestor without making every child
  // invalid, and an explicit draft choice can restore only the chosen fields.
  function align(values: unknown[]): unknown[] {
    if (!values.some(record) || values.some(value => value !== undefined && !record(value))) return values;
    const entries = values.map(value => record(value) ? value : {});
    const result: Record<string, unknown>[] = entries.map(() => ({}));
    for (const key of new Set(entries.flatMap(value => Object.keys(value)))) {
      align(entries.map(value => value[key])).forEach((value, index) => {
        if (value !== undefined) result[index][key] = value;
      });
    }
    return result;
  }
  const [alignedBase, alignedDraft, alignedSaved] = align([base, draft, saved]);
  const transaction = createStudioTransaction(alignedBase, alignedDraft, { transactionId: 'website-settings', clientId: 'website-settings', brokerEpoch: 'website-settings', baseRevision: 0 });
  const merged = applyStudioTransaction(alignedSaved, transaction, choice === 'mine');
  if (merged.conflicts.length && !choice) throw new WebsiteDesignConflictError(base, draft, saved, merged.conflicts);
  function compact(value: unknown): unknown {
    if (!record(value)) return value;
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      const next = compact(child);
      return record(next) && !Object.keys(next).length ? [] : [[key, next]];
    }));
  }
  const result = compact(merged.snapshot) as Partial<WebsiteDesign>;
  return validateWebsiteDesign({ identity: result.identity ?? {}, styles: result.styles ?? {} });
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const safeKey = (key: string) => !['__proto__', 'prototype', 'constructor'].includes(key) && /^[\w-]{1,160}$/.test(key);
const identityFields = ['title','tagline','logo','icon','hidden'];
const styleFields = ['paletteId','typographyId','typography','additionalCss','colours','background','shadows','layout','blockStyles'];
export function validDesignImage(value: unknown): value is PortableDesignImage {
  return record(value) && Object.keys(value).sort().join() === 'altText,id,name,src' && typeof value.id === 'string' && value.id.length <= 160 && typeof value.name === 'string' && value.name.length <= 500 && typeof value.altText === 'string' && value.altText.length <= 2000 && typeof value.src === 'string' && value.src.startsWith('/media/') && Boolean(parseSiteImageName(value.src.slice(7)));
}
/** Server and browser share the same bounded portable contract; no URLs or Blob bytes enter snapshots. */
export function validateWebsiteDesign(value: unknown): WebsiteDesign {
  if (!record(value) || Object.keys(value).sort().join() !== 'identity,styles' || !record(value.identity) || !record(value.styles) || Object.keys(value.identity).some(key => !identityFields.includes(key)) || Object.keys(value.styles).some(key => !styleFields.includes(key))) throw new Error('Invalid website design settings. Your draft was preserved.');
  const identity = value.identity;
  for (const [field, limit] of [['title',200],['tagline',500]] as const) if (identity[field] !== undefined && identity[field] !== null && (typeof identity[field] !== 'string' || identity[field].length > limit)) throw new Error(`Invalid site ${field}.`);
  for (const field of ['logo','icon']) if (identity[field] !== undefined && identity[field] !== null && !validDesignImage(identity[field])) throw new Error('Invalid site identity image.');
  if (identity.hidden !== undefined && (!record(identity.hidden) || Object.entries(identity.hidden).some(([key, hidden]) => !['title','tagline','logo','icon'].includes(key) || typeof hidden !== "boolean"))) throw new Error('Invalid site visibility setting.');
  const styles = value.styles;
  if (styles.paletteId !== undefined && !stylePalettes.some(item => item.id === styles.paletteId) || styles.typographyId !== undefined && !styleTypography.some(item => item.id === styles.typographyId)) throw new Error('Unknown website style variation.');
  if (styles.additionalCss !== undefined && (typeof styles.additionalCss !== 'string' || compileSavedWebsiteCss(styles.additionalCss).error)) throw new Error('Unsupported website CSS.');
  let count = 0;
  const walk = (item: unknown, depth = 0, key = ''): void => {
    if (++count > 12000 || depth > 16) throw new Error('Website design settings exceed their supported limit.');
    if (item === null || item === undefined || typeof item === 'boolean') return;
    if (typeof item === 'number') { if (!Number.isFinite(item) || Math.abs(item) > 100000) throw new Error('Invalid website style number.'); return; }
    if (typeof item === 'string') {
      if (item.length > (key === 'additionalCss' ? 30000 : 6000) || key !== 'additionalCss' && /[<>\\]|(?:url|image-set|expression|src|paint|element)\s*\(|(?:javascript|https?|data|blob):/i.test(item)) throw new Error('Unsupported website style value.');
      return;
    }
    if (Array.isArray(item)) { if (item.length > 200) throw new Error('Too many website style values.'); item.forEach(child => walk(child, depth + 1, key)); return; }
    if (!record(item)) throw new Error('Website settings must be portable values.');
    if ('src' in item) { if (!validDesignImage(item)) throw new Error('Invalid website design image.'); return; }
    for (const [field, child] of Object.entries(item)) { if (!safeKey(field)) throw new Error('Invalid website style property.'); walk(child, depth + 1, field); }
  };
  walk(styles);
  validateWebsiteStyles(styles, validDesignImage);
  if (JSON.stringify(value).length > 150000) throw new Error('Website design settings are too large.');
  return JSON.parse(JSON.stringify(value)) as WebsiteDesign;
}
export function effectiveWebsiteDesign(global: WebsiteDesign | undefined, own: WebsiteDesign | undefined) {
  const defaults = global ?? defaultWebsiteDesign();
  const local = own ?? emptyWebsiteDesign();
  const state = createStylesPreview().present;
  state.global = { paletteId: 'default', typographyId: 'default', ...defaults.styles } as StyleSelection;
  state.test = local.styles as Partial<StyleSelection>;
  return { legacy: local.styles.typographyId === undefined && defaults.styles.typographyId === undefined, paletteAuthored: local.styles.paletteId !== undefined || defaults.styles.paletteId !== undefined, paletteSelected: local.styles.paletteId !== undefined || defaults.styles.paletteId !== undefined, typographySelected: local.styles.typographyId !== undefined || defaults.styles.typographyId !== undefined, identity: { ...defaults.identity, ...local.identity, hidden: { ...defaults.identity.hidden, ...local.identity.hidden } }, styles: resolvePreviewStyle(state, 'test') };
}
export async function serialiseWebsiteDesign(identity: SiteIdentity, styles: Partial<StyleSelection>): Promise<WebsiteDesign> {
  async function walk(value: unknown): Promise<unknown> {
    if (value && typeof value === 'object' && 'blob' in value) {
      const image = value as IdentityImage;
      if (!(image.blob instanceof Blob) || image.blob.size > SITE_IMAGE_MAX_BYTES) throw new Error('Choose a PNG, JPEG, WebP, or GIF smaller than 2 MiB for saved website settings.');
      const bytes = new Uint8Array(await image.blob.arrayBuffer());
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2,'0')).join('');
      const name = siteImageName(image.id, digest, image.blob.type);
      if (!siteImageSignature(bytes, parseSiteImageName(name)!.extension)) throw new Error('The selected design image is invalid.');
      return { id: image.id, name: image.name, altText: image.altText, src: `/media/${name}` };
    }
    if (Array.isArray(value)) return Promise.all(value.map(walk));
    if (record(value)) return Object.fromEntries(await Promise.all(Object.entries(value).filter(([, child]) => child !== undefined).map(async ([key, child]) => [key, await walk(child)])));
    return value;
  }
  return validateWebsiteDesign(await walk({ identity, styles }));
}
export async function hydrateWebsiteDesign(design: WebsiteDesign, imageUrl: (src: string) => string): Promise<{ identity: SiteIdentity; styles: Partial<StyleSelection> }> {
  async function walk(value: unknown): Promise<unknown> {
    if (validDesignImage(value)) {
      const response = await fetch(imageUrl(value.src), { cache: 'no-store' });
      if (!response.ok) throw new Error('A saved design image is unavailable. Your settings were preserved.');
      const blob = await response.blob();
      const parsed = parseSiteImageName(value.src.slice(7))!;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)), byte=>byte.toString(16).padStart(2,"0")).join("");
      if (!siteImageSignature(bytes, parsed.extension) || digest !== parsed.digest) throw new Error('A saved design image is invalid.');
      return { id: value.id, name: value.name, altText: value.altText, blob: new Blob([bytes], { type: parsed.type }) };
    }
    if (Array.isArray(value)) return Promise.all(value.map(walk));
    if (record(value)) return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key,child]) => [key,await walk(child)])));
    return value;
  }
  return await walk(validateWebsiteDesign(design)) as { identity: SiteIdentity; styles: Partial<StyleSelection> };
}

/** Preserve the executable baseline when connecting the former reference controls. */
export function legacyWebsiteDefaults(preset: import('@acm/styles').UniversalStylePreset): WebsiteDesign {
  universalStylePresetToCssVariables(preset);
  // Existing site CSS remains the baseline until the user authors a setting.
  return validateWebsiteDesign({ identity: { ...originalIdentityText }, styles: {} });
}

export function fixtureWebsiteDesign(source: { version: number; websiteDesign?: WebsiteDesign; siteNavigation: {setId:string}; templates: import('../template-model').TemplateStore }, defaults: WebsiteDesign | undefined) {
  if (!defaults && !source.websiteDesign) return undefined;
  const identity = source.templates.sets.find(set=>set.id === source.siteNavigation.setId)?.identity;
  const own = source.websiteDesign ?? { identity: { title: identity?.name ?? '', tagline: '' }, styles: {} };
  return effectiveWebsiteDesign(defaults,own);
}
