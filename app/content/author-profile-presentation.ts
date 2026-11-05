import { safeTextLink } from "./rich-text";
import { parseSiteImageName } from "./site-featured-image.mjs";

export function validAuthorProfileUrl(value: unknown): boolean {
  return value === undefined || typeof value === "string" && value.length <= 2048 && (value === "" || !value.trim().startsWith("//") && safeTextLink(value) !== null);
}

export function validAuthorProfileImageSource(value: unknown, mediaId: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === "") return typeof mediaId === "string" && mediaId.length > 0;
  return mediaId === undefined && value.startsWith("/media/") && parseSiteImageName(value.slice(7)) !== null;
}

export function containsAuthorBlockPresentation(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsAuthorBlockPresentation);
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if ((record.type === "author-name" || record.type === "post-author") && (record.avatarSize !== undefined || record.profileImage !== undefined || record.biography !== undefined || record.profileUrl !== undefined || record.openInNewTab !== undefined)) return true;
  return Object.values(record).some(containsAuthorBlockPresentation);
}
