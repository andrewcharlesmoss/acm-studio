/** Apply view ordering without changing the canonical library or reference order. */
export function patternPage(entries, direction, page, pageSize, field = "title") {
  const sorted = direction === "reference" ? entries : [...entries].sort((a, b) => (field === "author" ? (a.author ?? "Twenty Twenty-Five") : a.entry.name).localeCompare(field === "author" ? (b.author ?? "Twenty Twenty-Five") : b.entry.name, "en", { sensitivity: "base" }) * (direction === "asc" ? 1 : -1));
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  return { items: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize), currentPage, totalPages };
}
