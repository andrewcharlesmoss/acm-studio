export function websiteHeaderTitle(title: string): string | null {
  return title.trim() ? title : null;
}

export function sampleBrowserTabTitle(title: string): string | null {
  return websiteHeaderTitle(title);
}
