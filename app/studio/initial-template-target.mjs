/** Match URLSearchParams' first-value semantics for the server's query object. */
export function initialTemplateTarget(mode, set, target, scope) {
  const first = value => Array.isArray(value) ? value[0] : value;
  if (first(mode) !== 'templates') return undefined;
  const setId = first(set) ?? null;
  const targetId = first(target) ?? null;
  return { setId, targetId, scope: first(scope) === 'global' || !targetId ? 'global' : 'site' };
}
