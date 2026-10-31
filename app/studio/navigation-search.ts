import type { StudioDocument } from "./editor-model";
import type { ParagraphStyle } from "../content/model";
import { LOCAL_PUBLICATIONS_KEY, localPublicationSearchEntries, parseLocallyPublishedDocuments, searchableContentText } from "../content/local-publishing";

const searchTypographyFields = ["fontFamily", "fontSize", "fontSizeCustom", "appearance", "lineHeight", "letterSpacing", "textTransform", "textDecoration"] as const;
const searchBorderFields = ["borderStyle", "borderWidth", "borderColor", "borderRadius", "shadow"] as const;

function pickStyleFields(style: ParagraphStyle | undefined, fields: readonly (keyof ParagraphStyle)[]): ParagraphStyle {
  const result: ParagraphStyle = {};
  for (const field of fields) if (style?.[field] !== undefined) Object.assign(result, { [field]: style[field] });
  return result;
}

/** Map Gutenberg Search block supports to their declared DOM selector surfaces. */
export function navigationSearchStyleTargets(style: ParagraphStyle | undefined, buttonPosition: "outside" | "inside" | "no-button" | "button-only" = "outside") {
  const rootStyle = pickStyleFields(style, ["anchor", "className", "additionalCss", "margin", "padding"]);
  const typography = pickStyleFields(style, searchTypographyFields);
  const fieldStyle = pickStyleFields(style, [
    ...searchTypographyFields,
    ...(buttonPosition === "no-button" ? ["textColor", "backgroundColor", "backgroundGradient"] as const : []),
    ...(buttonPosition === "inside" ? [] : searchBorderFields),
  ]);
  const buttonStyle = pickStyleFields(style, [
    ...searchTypographyFields,
    "textColor", "backgroundColor", "backgroundGradient",
    ...(buttonPosition === "inside" ? [] : searchBorderFields),
  ]);
  const wrapperStyle = pickStyleFields(style, [
    "minWidth", "minHeight",
    ...(buttonPosition === "inside" ? searchBorderFields : []),
  ]);
  return { rootStyle, labelStyle: typography, fieldStyle, buttonStyle, wrapperStyle };
}

/** Read only validated browser-local publications when a local publication route asks for Search. */
export function browserLocalPublicationSearchEntries() {
  try {
    return localPublicationSearchEntries(parseLocallyPublishedDocuments(window.localStorage.getItem(LOCAL_PUBLICATIONS_KEY)));
  } catch {
    return [];
  }
}

/** Build isolated Search entries for a selected Test/Test2 site preview. */
export function fixtureNavigationSearchEntries(
  documents: readonly StudioDocument[],
  href: (document: StudioDocument) => string,
  options: { includeDrafts?: boolean; now?: number } = {},
) {
  const now = options.now ?? Date.now();
  return documents.filter(document => {
    if (document.passwordProtection) return false;
    if (options.includeDrafts) return true;
    return document.status === "published"
      || document.status === "scheduled" && Date.parse(document.publishAt ?? document.publishedAt ?? "") <= now;
  }).map(document => ({
    title: document.title || "Untitled",
    href: href(document),
    text: `${document.excerpt} ${searchableContentText(document.blocks)}`,
  }));
}
