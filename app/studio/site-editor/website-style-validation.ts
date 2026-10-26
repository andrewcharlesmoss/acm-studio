import { validBackgroundGradient } from "../../content/background-gradient";
import { validBoxLengths } from "../../content/box-lengths";
import { validPreviewLength } from "./layout-preview-model";
import { validFontSizePreset, typographyRoles } from "./typography-preview-model";
import { validShadowLength } from "./shadows-preview-model";
import { previewBlockTargets, previewButtonWidth } from "./blocks-preview-model";
import { validParagraphStyle } from "../workspace-validation";

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const fail = () => { throw new Error('Unsupported website style setting. Your draft was preserved.'); };
const exact = (value: unknown, keys: string[]): Record<string, unknown> => { if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) return fail(); return value; };
const text = (value: unknown, limit = 500) => typeof value === 'string' && value.length <= limit && !/[<>\\{};]/.test(value);
const css = (value: unknown) => text(value,6000) && !/\b(?:url|image-set|expression|src|paint|element)\s*\(|(?:javascript|https?|data|blob):/i.test(value as string);
const colour = (value: unknown) => css(value) && /^(?:#[a-f\d]{3,8}|(?:rgba?|hsla?|color-mix|var)\([\s\S]+\)|transparent|currentColor|inherit|[a-z]+)$/i.test(value as string);
const optional = (value: unknown, valid: (value: unknown) => boolean) => value === undefined || valid(value);
const map = (value: unknown, valid: (value: unknown,key: string) => void) => { if (!object(value) || Object.keys(value).length > 200) return fail(); for (const [key,child] of Object.entries(value)) { if (!/^[\w-]{1,160}$/.test(key) || ['constructor','prototype','__proto__'].includes(key)) return fail(); valid(child,key); } };
const enums = (value: unknown, values: readonly unknown[]) => values.includes(value);
function fields(value: unknown) {
 const item = exact(value,['colour','family','size','preset','weight','fontStyle','lineHeight','letterSpacing','transform','align','decoration']);
 if (!optional(item.colour,colour) || !optional(item.family,css) || !optional(item.size,css) || !optional(item.preset,text) || !optional(item.weight,value => typeof value === 'number' && value >= 100 && value <= 1000) || !optional(item.fontStyle,value => enums(value,['normal','italic'])) || !optional(item.lineHeight,css) || !optional(item.letterSpacing,css) || !optional(item.transform,value => enums(value,['none','uppercase','lowercase','capitalize'])) || !optional(item.align,value => enums(value,['left','center','right','justify'])) || !optional(item.decoration,value => enums(value,['none','underline','line-through']))) fail();
}
function layers(value: unknown) {
 if (!Array.isArray(value) || value.length > 20) return fail();
 for (const layer of value) {
  const item = exact(layer,['id','colour','inset','x','y','blur','spread']);
  if (!text(item.id) || !colour(item.colour) || typeof item.inset !== 'boolean' || !['x','y','blur','spread'].every(key => typeof item[key] === 'string' && validShadowLength(item[key] as string,key !== 'blur'))) fail();
 }
}
const canonicalFields = ['fontFamily','fontSize','fontSizeCustom','appearance','textTransform','textDecoration','borderStyle','shadow','textShadow','backgroundGradient','backgroundImageMediaId','backgroundSize','backgroundRepeat','backgroundFixedSize','backgroundPositionX','backgroundPositionY','lineHeight','letterSpacing','textIndent','minHeight','minWidth','textColumns','dropCap','fitText','orientation','textColor','backgroundColor','linkColor','linkHoverColor','padding','margin','borderWidth','borderRadius','borderColor','anchor','className','additionalCss','responsive'];
const extras = ['previewVariant','websiteFont','websitePreset','websiteWeight','websiteItalic','cellPadding','textAlign','indentAll','blockGap','rowGap','columnGap','buttonWidth','shadowPreset','customShadows','headingColor','headingColors','headingBackground','headingBackgrounds','buttonTextColor','buttonBackgroundColor','buttonBackgroundGradient','buttonGradientId','duotone','enlargeOnClick','backgroundImage','imageSize','imageRepeat','imageFocalX','imageFocalY','interactionStates','previewResponsive','variations'];
export function validateWebsiteStyles(value: Record<string,unknown>, image: (value: unknown) => boolean) {
 if (value.typography !== undefined) {
  const item = exact(value.typography,['elements','presets','enabledFonts','disabledFonts']);
  if (item.elements !== undefined) map(item.elements,(child,key) => { if (!enums(key,typographyRoles)) fail(); fields(child); });
  if (item.presets !== undefined) map(item.presets,child => { if (child === null) return; const preset = exact(child,['id','name','size','fluid','customFluid','min','max']); if (!text(preset.id) || !text(preset.name) || typeof preset.fluid !== 'boolean' || !optional(preset.customFluid,v => typeof v === 'boolean') || !['size','min','max'].every(key => typeof preset[key] === 'string') || !validFontSizePreset(preset as never)) fail(); });
  for (const key of ['enabledFonts','disabledFonts']) if (item[key] !== undefined && (!Array.isArray(item[key]) || item[key].length > 30 || !item[key].every(css))) fail();
 }
 if (value.layout !== undefined) { const item = exact(value.layout,['contentWidth','wideWidth','padding','blockSpacing']); for (const [key,child] of Object.entries(item)) if (typeof child !== 'string' || !(key === 'padding' ? validBoxLengths(child) : validPreviewLength(child,key !== 'blockSpacing'))) fail(); }
 if (value.background !== undefined) {
  const item = exact(value.background,['colour','gradient','image','focalX','focalY','size','width','widthUnit','repeat','fixed']);
  if (!optional(item.colour,v=>v === null || colour(v)) || !optional(item.gradient,v=>v === null || validBackgroundGradient(v)) || !optional(item.image,v=>v === null || image(v)) || !optional(item.size,v=>enums(v,['cover','contain','tile'])) || !optional(item.widthUnit,v=>enums(v,['px','%','em','rem','vw','vh'])) || !optional(item.width,v=>typeof v === 'number' && v >= 0 && v <= 10000) || !['focalX','focalY'].every(key => optional(item[key],v=>typeof v === 'number' && v >= 0 && v <= 100)) || !['repeat','fixed'].every(key=>optional(item[key],v=>typeof v === 'boolean'))) fail();
 }
 if (value.shadows !== undefined) map(value.shadows,child=>{ if (child === null) return; const item = exact(child,['name','layers']); if (!optional(item.name,text)) fail(); if (item.layers !== undefined) layers(item.layers); });
 if (value.colours !== undefined) {
  const item = exact(value.colours,['retired','retiredGradients','theme','custom','gradients','elements']);
  for (const key of ['retired','theme']) if (item[key] !== undefined) map(item[key],child=>{ if (!colour(child)) fail(); });
  if (item.retiredGradients !== undefined) map(item.retiredGradients,child=>{ if (!validBackgroundGradient(child)) fail(); });
  if (item.custom !== undefined) map(item.custom,child=>{ if (child === null) return; const entry = exact(child,['id','name','colour']); if (!text(entry.id) || !text(entry.name) || !colour(entry.colour)) fail(); });
  if (item.gradients !== undefined) map(item.gradients,child=>{ if (child === null) return; const entry = exact(child,['id','name','gradient']); if (!text(entry.id) || !text(entry.name) || !validBackgroundGradient(entry.gradient)) fail(); });
  if (item.elements !== undefined) map(item.elements,(child,key)=>{ if (!enums(key,typographyRoles)) fail(); const entry = exact(child,['background','gradient','gradientId','hover']); if (!optional(entry.background,colour) || !optional(entry.hover,colour) || !optional(entry.gradient,validBackgroundGradient) || !optional(entry.gradientId,text)) fail(); });
 }
 function block(value: unknown, depth = 0) {
  if (depth > 8) return fail();
  const item = exact(value,[...canonicalFields,...extras]);
  const canonical = Object.fromEntries(Object.entries(item).filter(([key])=>canonicalFields.includes(key)));
  for (const key of ['textColor','backgroundColor','borderColor','linkColor','linkHoverColor']) if (canonical[key] !== undefined) { if (!colour(canonical[key])) fail(); delete canonical[key]; }
  if (!validParagraphStyle(canonical)) fail();
  if (!optional(item.buttonWidth, v => typeof v === 'string' && previewButtonWidth(v) !== undefined)) fail();
  if (!optional(item.cellPadding,v=>typeof v === 'string' && validBoxLengths(v))) fail();
  for (const key of ['websiteFont','websitePreset','blockGap','rowGap','columnGap','shadowPreset','previewVariant','headingColor']) if (!optional(item[key],css)) fail();
  if (!optional(item.websiteWeight,v=>typeof v === 'number' && v >= 100 && v <= 1000) || !optional(item.textAlign,v=>enums(v,['left','center','right','justify'])) || !optional(item.imageSize,v=>enums(v,['cover','contain','tile'])) || !optional(item.backgroundImage,v=>v === null || image(v))) fail();
  for (const key of ['websiteItalic','indentAll','enlargeOnClick','imageRepeat']) if (!optional(item[key],v=>typeof v === 'boolean')) fail();
  for (const key of ['imageFocalX','imageFocalY']) if (!optional(item[key],v=>typeof v === 'number' && v >= 0 && v <= 100)) fail();
  for (const key of ['buttonTextColor','buttonBackgroundColor']) if (!optional(item[key],colour)) fail();
  if (!optional(item.buttonBackgroundGradient,validBackgroundGradient) || !optional(item.buttonGradientId,text)) fail();
  if (item.headingColors !== undefined) map(item.headingColors,(child,key)=>{ if (!enums(key,['1','2','3','4','5','6']) || !colour(child)) fail(); });
  const headingBackground = (value: unknown) => { const background = exact(value,['background','gradient','gradientId']); if (!optional(background.background,colour) || !optional(background.gradient,validBackgroundGradient) || !optional(background.gradientId,text)) fail(); };
  if (item.headingBackground !== undefined) headingBackground(item.headingBackground);
  if (item.headingBackgrounds !== undefined) map(item.headingBackgrounds,(child,key)=>{ if (!enums(key,['1','2','3','4','5','6'])) fail(); headingBackground(child); });
  if (item.customShadows !== undefined) layers(item.customShadows);
  if (item.duotone !== undefined && item.duotone !== null) { const filter=exact(item.duotone,['dark','light']); if (!colour(filter.dark) || !colour(filter.light)) fail(); }
  for (const field of ['variations','interactionStates','previewResponsive','responsive']) if (item[field] !== undefined) map(item[field],(child,key)=>{ if (field === 'interactionStates' && !enums(key,['hover','focus','focus-visible','active']) || ['previewResponsive','responsive'].includes(field) && !enums(key,['tablet','mobile'])) fail(); block(child,depth+1); });
 }
 if (value.blockStyles !== undefined) map(value.blockStyles,(child,key)=>{ if (!previewBlockTargets.some(target=>target.id === key)) fail(); block(child); });
}
