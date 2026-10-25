export const pageStatusViews = ["all", "published", "scheduled", "draft", "pending", "private", "bin"];
export const pageLayouts = ["list", "table", "grid"];
export const pageDensities = ["comfortable", "balanced", "compact"];
export const pageSizes = [10, 20, 50, 100];
export const pageProperties = ["title", "featuredImage", "author", "status", "date", "slug", "parent", "template"];
const sortProperties = ["title", "author", "status", "date", "slug", "parent", "order"];

export const defaultPagesView = Object.freeze({
  layout: "list", sortBy: "title", direction: "asc", density: "balanced", pageSize: 20,
  properties: [...pageProperties],
});

export function validPagesView(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && pageLayouts.includes(value.layout) && sortProperties.includes(value.sortBy)
    && ["asc", "desc"].includes(value.direction) && pageDensities.includes(value.density)
    && pageSizes.includes(value.pageSize) && Array.isArray(value.properties)
    && value.properties.length > 0 && value.properties.length <= pageProperties.length
    && value.properties.includes("title") && new Set(value.properties).size === value.properties.length
    && value.properties.every(property => pageProperties.includes(property)));
}

export function normalizePagesView(value) {
  return validPagesView(value) ? { ...value, properties: [...value.properties] } : { ...defaultPagesView, properties: [...defaultPagesView.properties] };
}

function readableBlockText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(readableBlockText).join(" ");
  if (!value || typeof value !== "object") return "";
  const parts = [];
  for (const key of ["text", "value", "code", "caption", "attribution", "label", "title", "alt"]) {
    if (typeof value[key] === "string") parts.push(value[key]);
  }
  if (typeof value.html === "string") parts.push(value.html.replace(/<[^>]*>/g, " "));
  for (const key of ["runs", "items", "notes", "children", "rows", "cellRuns", "captionRuns", "attributionRuns", "labelRuns", "options"]) {
    if (Array.isArray(value[key])) parts.push(readableBlockText(value[key]));
  }
  return parts.join(" ");
}

export function pageSearchText(document) {
  return [document?.title, document?.slug, document?.excerpt, ...(document?.blocks ?? []).map(readableBlockText)]
    .filter(value => typeof value === "string").join(" ").toLocaleLowerCase("en-GB");
}

function dateValue(document) {
  return document.status === "published" ? document.publishedAt ?? document.updatedAt : document.publishAt ?? document.updatedAt;
}

function compareText(left, right) {
  return String(left ?? "").localeCompare(String(right ?? ""), "en-GB", { sensitivity: "base", numeric: true });
}

export function pageMatchesFilters(document, { query = "", author = "", date = "", status = "all", statusFilter = "", now = Date.now() } = {}) {
  const term = query.trim().toLocaleLowerCase("en-GB");
  if (term && !pageSearchText(document).includes(term)) return false;
  if (author && document.author !== author) return false;
  if (statusFilter && document.status !== statusFilter) return false;
  if (date) {
    const timestamp = Date.parse(dateValue(document));
    const age = now - timestamp;
    if (!Number.isFinite(timestamp) || date === "month" && (age < 0 || age > 30 * 86400000)
      || date === "year" && (age < 0 || age > 365 * 86400000) || date === "future" && timestamp <= now) return false;
  }
  return status === "all" || status === "bin" || document.status === status;
}

export function sortPages(documents, view) {
  const direction = view.direction === "desc" ? -1 : 1;
  const by = view.sortBy;
  return [...documents].sort((left, right) => {
    let result = 0;
    if (by === "date") result = Date.parse(dateValue(left)) - Date.parse(dateValue(right));
    else if (by === "order") result = (left.pageOrder ?? 0) - (right.pageOrder ?? 0);
    else result = compareText(by === "title" ? left.title : by === "author" ? left.author : by === "status" ? left.status : by === "slug" ? left.slug : by === "parent" ? left.parentPageId : left.title,
      by === "title" ? right.title : by === "author" ? right.author : by === "status" ? right.status : by === "slug" ? right.slug : by === "parent" ? right.parentPageId : right.title);
    if (!Number.isFinite(result)) result = 0;
    if (result !== 0) return result * direction;
    const titleResult = compareText(left.title, right.title);
    return titleResult || compareText(left.id, right.id);
  });
}

export function queryPages({ documents, binned = [], homeDocumentId, status = "all", query = "", author = "", date = "", statusFilter = "", view = defaultPagesView, page = 1, now = Date.now() }) {
  const inBin = status === "bin";
  const source = inBin ? binned.map(item => ({ ...item.document, binId: item.id, deletedAt: item.deletedAt })) : documents;
  const candidates = source.filter(document => document.kind === "page")
    .filter(document => pageMatchesFilters(document, { query, author, date, status: inBin ? "all" : status, statusFilter, now }));
  const sorted = inBin ? [...candidates].sort((a, b) => compareText(a.title, b.title) || compareText(a.id, b.id)) : sortPages(candidates, view);
  const pageCount = Math.max(1, Math.ceil(sorted.length / view.pageSize));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  return { items: sorted.slice((safePage - 1) * view.pageSize, safePage * view.pageSize), total: sorted.length, page: safePage, pageCount,
    authors: [...new Set([...documents, ...binned.map(item => item.document)].filter(document => document.kind === "page").map(document => document.author).filter(Boolean))].sort(compareText), homeDocumentId };
}
