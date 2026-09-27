export const templateCopyrightPlaceholders = [
  { token: "{copyright}", description: "Copyright symbol (©)" },
  { token: "{year}", description: "Current year" },
  { token: "{site-title}", description: "Site name" },
] as const;

export type TemplateCopyrightPlaceholder = typeof templateCopyrightPlaceholders[number]["token"];

/** Resolve the supported plain-text values in a template copyright string. */
export function resolveTemplateCopyright(value: string, siteTitle: string, date = new Date()): string {
  const values: Record<TemplateCopyrightPlaceholder, string> = {
    "{copyright}": "©",
    "{year}": String(date.getFullYear()),
    "{site-title}": siteTitle,
  };
  return value.replace(/\{copyright\}|\{year\}|\{site-title\}/g, token => values[token as TemplateCopyrightPlaceholder]);
}
