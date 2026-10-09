/** Fixed local fixture identities. Filesystem roots remain server-owned. */
export const localFixtureSites = [{ id: "test", name: "Test" }, { id: "test2", name: "Test2" }] as const;
export type LocalFixtureSiteId = typeof localFixtureSites[number]["id"];
export function isLocalFixtureSiteId(value: unknown): value is LocalFixtureSiteId { return value === "test" || value === "test2"; }
export function localFixtureName(id: LocalFixtureSiteId) { return id === "test2" ? "Test2" : "Test"; }
export function localFixtureHref(id: LocalFixtureSiteId) { return `/studio?site=${id}`; }
