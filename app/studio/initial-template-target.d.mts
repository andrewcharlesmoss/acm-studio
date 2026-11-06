type QueryValue = string | string[] | undefined;
export function initialTemplateTarget(mode: QueryValue, set: QueryValue, target: QueryValue, scope: QueryValue): { setId: string | null; targetId: string | null; scope: 'global' | 'site' } | undefined;
